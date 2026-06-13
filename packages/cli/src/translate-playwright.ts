export type RecordedOp =
  | { kind: "navigate"; url: string }
  | { kind: "click"; selector: string; cssQuoting: boolean }
  | { kind: "type"; text: string }
  | { kind: "hover"; selector: string; cssQuoting: boolean }
  | { kind: "fill"; selector: string; cssQuoting: boolean; text: string }
  | { kind: "wait"; ms: number }
  | { kind: "callout"; text: string }
  | { kind: "todo"; original: string }

export interface TranslateResult {
  target: string
  ops: RecordedOp[]
  /** index in ops[] of each "captured action" (used by auto-wait alignment with codegen timestamps) */
  actionIndexes: number[]
  warnings: string[]
}

const STR = String.raw`(?:'([^']*)'|"([^"]*)")`

const RE_GOTO = new RegExp(String.raw`^await\s+page\.goto\(\s*${STR}\s*\)\s*;?\s*$`)
const RE_KEYBOARD = /^await\s+page\.keyboard\./

const RE_GET_BY_ROLE = new RegExp(
  String.raw`^page\.getByRole\(\s*${STR}\s*,\s*\{([^}]+)\}\s*\)(.*)$`,
)
const RE_GET_BY_ROLE_BARE = new RegExp(String.raw`^page\.getByRole\(\s*${STR}\s*\)(.*)$`)
const RE_GET_BY_TEXT = new RegExp(String.raw`^page\.getByText\(\s*${STR}.*?\)(.*)$`)
const RE_GET_BY_LABEL = new RegExp(String.raw`^page\.getByLabel\(\s*${STR}.*?\)(.*)$`)
const RE_GET_BY_PLACEHOLDER = new RegExp(
  String.raw`^page\.getByPlaceholder\(\s*${STR}.*?\)(.*)$`,
)
const RE_LOCATOR = new RegExp(String.raw`^page\.locator\(\s*${STR}\s*\)(.*)$`)
const RE_METHOD_CALL = new RegExp(String.raw`^\.(\w+)\(\s*(?:${STR})?\s*\)\s*;?\s*$`)

interface ParsedAction {
  selector: string | null
  selectorIsCss: boolean
  method: string
  methodArg: string | null
}

function readString(m: RegExpMatchArray, startIdx: number): string {
  return m[startIdx] ?? m[startIdx + 1] ?? ""
}

function parseRoleNameOpts(opts: string): { name: string; exact: boolean } | null {
  const nameMatch = opts.match(new RegExp(String.raw`name\s*:\s*${STR}`))
  if (!nameMatch) return null
  const name = nameMatch[1] ?? nameMatch[2] ?? ""
  const exact = /exact\s*:\s*true/.test(opts)
  return { name, exact }
}

function parseAction(rhs: string): ParsedAction | null {
  let selector: string | null = null
  let selectorIsCss = false
  let remainder = rhs

  let head: RegExpMatchArray | null
  if ((head = remainder.match(RE_GET_BY_ROLE))) {
    const role = readString(head, 1)
    const parsed = parseRoleNameOpts(head[3] ?? "")
    if (!parsed) return null
    selector = `role=${role}[name="${parsed.name}"${parsed.exact ? " exact" : ""}]`
    remainder = head[4] ?? ""
  } else if ((head = remainder.match(RE_GET_BY_ROLE_BARE))) {
    selector = `role=${readString(head, 1)}`
    remainder = head[3] ?? ""
  } else if ((head = remainder.match(RE_GET_BY_TEXT))) {
    selector = `text=${readString(head, 1)}`
    remainder = head[3] ?? ""
  } else if ((head = remainder.match(RE_GET_BY_LABEL))) {
    selector = `label=${readString(head, 1)}`
    remainder = head[3] ?? ""
  } else if ((head = remainder.match(RE_GET_BY_PLACEHOLDER))) {
    selector = `placeholder=${readString(head, 1)}`
    remainder = head[3] ?? ""
  } else if ((head = remainder.match(RE_LOCATOR))) {
    selector = readString(head, 1)
    selectorIsCss = true
    remainder = head[3] ?? ""
  } else {
    return null
  }

  while (remainder.length > 0 && !remainder.match(/^\.\w+\([^)]*\)\s*;?\s*$/)) {
    const f = remainder.match(/^\.first\(\)(.*)$/)
    if (f) {
      selector = `${selector} >> nth=0`
      remainder = f[1] ?? ""
      continue
    }
    const n = remainder.match(/^\.nth\(\s*(\d+)\s*\)(.*)$/)
    if (n) {
      selector = `${selector} >> nth=${n[1]}`
      remainder = n[2] ?? ""
      continue
    }
    return null
  }

  const m = remainder.match(RE_METHOD_CALL)
  if (!m) return null
  return {
    selector,
    selectorIsCss,
    method: m[1] ?? "",
    methodArg: m[2] ?? m[3] ?? null,
  }
}

function actionToOp(a: ParsedAction): RecordedOp | null {
  if (!a.selector) return null
  switch (a.method) {
    case "click":
      return { kind: "click", selector: a.selector, cssQuoting: a.selectorIsCss }
    case "hover":
      return { kind: "hover", selector: a.selector, cssQuoting: a.selectorIsCss }
    case "fill":
      if (a.methodArg == null) return null
      return {
        kind: "fill",
        selector: a.selector,
        cssQuoting: a.selectorIsCss,
        text: a.methodArg,
      }
    default:
      return null
  }
}

const stripSpace = (s: string) => s.replace(/^\s+/, "").replace(/\s+$/, "")

export function translatePlaywrightScript(input: string): TranslateResult {
  const lines = input.split(/\r?\n/)
  const ops: RecordedOp[] = []
  const actionIndexes: number[] = []
  const warnings: string[] = []
  let target = ""

  for (const rawLine of lines) {
    const line = stripSpace(rawLine)
    if (line === "" || line.startsWith("//")) continue
    if (
      line.startsWith("import ") ||
      line.startsWith("test(") ||
      line.startsWith("})") ||
      line === "{"
    )
      continue

    const gotoMatch = line.match(RE_GOTO)
    if (gotoMatch) {
      const url = readString(gotoMatch, 1)
      if (!target) {
        target = url
        // The initial navigate is implicit in showcase({target}); we still
        // record an action index so timing alignment isn't off-by-one.
        actionIndexes.push(-1)
      } else {
        actionIndexes.push(ops.length)
        ops.push({ kind: "navigate", url })
      }
      continue
    }

    if (!line.startsWith("await ") || RE_KEYBOARD.test(line)) {
      if (line.startsWith("await ")) {
        warnings.push(line)
        actionIndexes.push(ops.length)
        ops.push({ kind: "todo", original: line })
      }
      continue
    }

    const rhs = line.slice("await ".length).replace(/;?\s*$/, "")
    const action = parseAction(rhs)
    if (!action) {
      warnings.push(line)
      actionIndexes.push(ops.length)
      ops.push({ kind: "todo", original: line })
      continue
    }
    const op = actionToOp(action)
    if (!op) {
      warnings.push(line)
      actionIndexes.push(ops.length)
      ops.push({ kind: "todo", original: line })
      continue
    }
    actionIndexes.push(ops.length)
    ops.push(op)
  }

  return { target, ops, actionIndexes, warnings }
}

/**
 * Insert `wait` ops based on per-action timestamps from the codegen file watcher.
 * `actionTimestamps[i]` is the wall-clock ms at which action `i` was recorded.
 *
 * Gaps shorter than `threshold` are absorbed by rendering and not turned into waits.
 * Each emitted wait is `min(gap - smoothMs, cap)`.
 */
export function insertAutoWaits(
  ops: RecordedOp[],
  actionIndexes: number[],
  actionTimestamps: (number | undefined)[],
  threshold = 800,
  smoothMs = 300,
  cap = 3000,
): RecordedOp[] {
  if (actionTimestamps.every((t) => t === undefined)) return [...ops]

  const opsCopy = [...ops]
  // Walk actions back-to-front so opsCopy indexes remain valid after splice.
  for (let i = actionIndexes.length - 1; i > 0; i--) {
    const prev = actionTimestamps[i - 1]
    const cur = actionTimestamps[i]
    if (prev === undefined || cur === undefined) continue
    const gap = cur - prev
    if (gap < threshold) continue
    const ms = Math.min(gap - smoothMs, cap)
    if (ms <= 0) continue
    const insertAt = actionIndexes[i]!
    if (insertAt < 0) continue // sentinel for implicit initial navigate
    opsCopy.splice(insertAt, 0, { kind: "wait", ms })
  }
  return opsCopy
}

/**
 * Insert `callout` ops at user-chosen action boundaries.
 * `prompts[i]` is the callout text to insert BEFORE action `i` (empty/null = skip).
 */
export function insertCallouts(
  ops: RecordedOp[],
  actionIndexes: number[],
  prompts: (string | null)[],
): RecordedOp[] {
  const opsCopy = [...ops]
  for (let i = actionIndexes.length - 1; i >= 0; i--) {
    const text = prompts[i]
    if (!text) continue
    const insertAt = actionIndexes[i]!
    if (insertAt < 0) {
      // implicit initial navigate — insert at start
      opsCopy.unshift({ kind: "callout", text })
    } else {
      opsCopy.splice(insertAt, 0, { kind: "callout", text })
    }
  }
  return opsCopy
}

function quoteSelector(sel: string, isCss: boolean): string {
  if (isCss) return JSON.stringify(sel)
  return `'${sel.replace(/'/g, "\\'")}'`
}

export function opsToBodyLines(ops: RecordedOp[]): string[] {
  const out: string[] = []
  for (const op of ops) {
    switch (op.kind) {
      case "navigate":
        out.push(`await s.navigate(${JSON.stringify(op.url)})`)
        break
      case "click":
        out.push(`await s.click(${quoteSelector(op.selector, op.cssQuoting)})`)
        break
      case "hover":
        out.push(`await s.hover(${quoteSelector(op.selector, op.cssQuoting)})`)
        break
      case "type":
        out.push(`await s.type(${JSON.stringify(op.text)})`)
        break
      case "fill":
        out.push(`await s.click(${quoteSelector(op.selector, op.cssQuoting)})`)
        out.push(`await s.type(${JSON.stringify(op.text)})`)
        break
      case "wait":
        out.push(`await s.wait(${op.ms})`)
        break
      case "callout":
        out.push(`await s.callout(${JSON.stringify(op.text)})`)
        break
      case "todo":
        out.push(`// TODO: unrecognised: ${op.original}`)
        break
    }
  }
  return out
}

export function buildBeaconScript(opts: {
  title: string
  target: string
  body: string[]
  warnings: string[]
}): string {
  const indented = opts.body.map((l) => `    ${l}`).join("\n")
  const warningsBlock =
    opts.warnings.length > 0
      ? "\n// Recorder warnings: these Playwright actions weren't translated.\n" +
        opts.warnings.map((w) => `//   ${w}`).join("\n") +
        "\n"
      : ""

  return `import { showcase } from "@beacon/core"
${warningsBlock}
export default showcase(
  ${JSON.stringify(opts.title)},
  { target: ${JSON.stringify(opts.target)} },
  async (s) => {
${indented}
  },
)
`
}
