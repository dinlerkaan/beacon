export interface TranslateResult {
  target: string
  body: string[]
  warnings: string[]
}

interface ParsedAction {
  selector: string | null
  selectorIsCss: boolean
  method: string
  methodArg: string | null
}

const STR = String.raw`(?:'([^']*)'|"([^"]*)")`

const RE_GOTO = new RegExp(String.raw`^await\s+page\.goto\(\s*${STR}\s*\)\s*;?\s*$`)
const RE_KEYBOARD = /^await\s+page\.keyboard\./

const RE_GET_BY_ROLE = new RegExp(
  String.raw`^page\.getByRole\(\s*${STR}\s*,\s*\{([^}]+)\}\s*\)(.*)$`,
)
const RE_GET_BY_ROLE_BARE = new RegExp(
  String.raw`^page\.getByRole\(\s*${STR}\s*\)(.*)$`,
)
const RE_GET_BY_TEXT = new RegExp(String.raw`^page\.getByText\(\s*${STR}.*?\)(.*)$`)
const RE_GET_BY_LABEL = new RegExp(String.raw`^page\.getByLabel\(\s*${STR}.*?\)(.*)$`)
const RE_GET_BY_PLACEHOLDER = new RegExp(
  String.raw`^page\.getByPlaceholder\(\s*${STR}.*?\)(.*)$`,
)
const RE_LOCATOR = new RegExp(String.raw`^page\.locator\(\s*${STR}\s*\)(.*)$`)

const RE_METHOD_CALL = new RegExp(String.raw`^\.(\w+)\(\s*(?:${STR})?\s*\)\s*;?\s*$`)

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
  // rhs is everything after `await ` — e.g. `page.getByRole(...).first().click()`
  let selector: string | null = null
  let selectorIsCss = false
  let remainder = rhs

  // Identify the locator head + extract selector
  let head: RegExpMatchArray | null
  if ((head = remainder.match(RE_GET_BY_ROLE))) {
    const role = readString(head, 1)
    const opts = head[3] ?? ""
    const parsed = parseRoleNameOpts(opts)
    if (!parsed) return null
    selector = `role=${role}[name="${parsed.name}"${parsed.exact ? " exact" : ""}]`
    remainder = head[4] ?? ""
  } else if ((head = remainder.match(RE_GET_BY_ROLE_BARE))) {
    const role = readString(head, 1)
    selector = `role=${role}`
    remainder = head[3] ?? ""
  } else if ((head = remainder.match(RE_GET_BY_TEXT))) {
    const text = readString(head, 1)
    selector = `text=${text}`
    remainder = head[3] ?? ""
  } else if ((head = remainder.match(RE_GET_BY_LABEL))) {
    const label = readString(head, 1)
    selector = `label=${label}`
    remainder = head[3] ?? ""
  } else if ((head = remainder.match(RE_GET_BY_PLACEHOLDER))) {
    const placeholder = readString(head, 1)
    selector = `placeholder=${placeholder}`
    remainder = head[3] ?? ""
  } else if ((head = remainder.match(RE_LOCATOR))) {
    selector = readString(head, 1)
    selectorIsCss = true
    remainder = head[3] ?? ""
  } else {
    return null
  }

  // Chain of intermediate filters; we recognise .first() and .nth(n)
  while (remainder.length > 0 && !remainder.match(/^\.\w+\([^)]*\)\s*;?\s*$/)) {
    const filter = remainder.match(/^\.first\(\)(.*)$/)
    if (filter) {
      selector = `${selector} >> nth=0`
      remainder = filter[1] ?? ""
      continue
    }
    const nth = remainder.match(/^\.nth\(\s*(\d+)\s*\)(.*)$/)
    if (nth) {
      selector = `${selector} >> nth=${nth[1]}`
      remainder = nth[2] ?? ""
      continue
    }
    return null
  }

  // Final method call
  const m = remainder.match(RE_METHOD_CALL)
  if (!m) return null
  const method = m[1] ?? ""
  const methodArg = m[2] ?? m[3] ?? null

  return { selector, selectorIsCss, method, methodArg }
}

function quoteSelector(sel: string, isCss: boolean): string {
  // CSS selectors use double quotes; everything else uses single quotes.
  if (isCss) return JSON.stringify(sel)
  // Selectors with embedded double quotes (role=link[name="X"]) wrap in single quotes.
  return `'${sel.replace(/'/g, "\\'")}'`
}

function translateAction(action: ParsedAction): string[] | null {
  const sel = action.selector
    ? quoteSelector(action.selector, action.selectorIsCss)
    : null

  switch (action.method) {
    case "click":
      return sel ? [`await s.click(${sel})`] : null
    case "hover":
      return sel ? [`await s.hover(${sel})`] : null
    case "fill": {
      if (!sel || action.methodArg == null) return null
      return [`await s.click(${sel})`, `await s.type(${JSON.stringify(action.methodArg)})`]
    }
    default:
      return null
  }
}

function stripLineBoilerplate(raw: string): string {
  return raw.replace(/^\s+/, "").replace(/\s+$/, "")
}

export function translatePlaywrightScript(input: string): TranslateResult {
  const lines = input.split(/\r?\n/)
  const body: string[] = []
  const warnings: string[] = []
  let target = ""

  for (const rawLine of lines) {
    const line = stripLineBoilerplate(rawLine)
    if (line === "" || line.startsWith("//")) continue
    if (line.startsWith("import ") || line.startsWith("test(") || line.startsWith("})") || line === "{") continue

    const gotoMatch = line.match(RE_GOTO)
    if (gotoMatch) {
      const url = readString(gotoMatch, 1)
      if (!target) target = url
      else body.push(`await s.navigate(${JSON.stringify(url)})`)
      continue
    }

    if (RE_KEYBOARD.test(line) || !line.startsWith("await ")) {
      // Keyboard.press, assertions, etc. — out of scope for v1.
      // Only warn for await-shaped lines, not generic JS.
      if (line.startsWith("await ")) {
        warnings.push(line)
        body.push(`// TODO: unrecognised: ${line}`)
      }
      continue
    }

    const rhs = line.slice("await ".length).replace(/;?\s*$/, "")
    const action = parseAction(rhs)
    if (!action) {
      warnings.push(line)
      body.push(`// TODO: unrecognised: ${line}`)
      continue
    }

    const translated = translateAction(action)
    if (!translated) {
      warnings.push(line)
      body.push(`// TODO: unrecognised: ${line}`)
      continue
    }
    body.push(...translated)
  }

  return { target, body, warnings }
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
