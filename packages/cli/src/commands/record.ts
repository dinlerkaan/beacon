import { spawn } from "node:child_process"
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  watch,
  statSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { createRequire } from "node:module"
import * as p from "@clack/prompts"
import {
  translatePlaywrightScript,
  insertAutoWaits,
  insertCallouts,
  opsToBodyLines,
  buildBeaconScript,
  type RecordedOp,
} from "../translate-playwright.js"

const require = createRequire(import.meta.url)

export interface RecordArgs {
  url: string
  out: string
  title?: string
  autoWait?: boolean
  callouts?: boolean
}

export async function recordCommand(args: RecordArgs): Promise<void> {
  const outPath = resolve(args.out)
  const tmpDir = mkdtempSync(join(tmpdir(), "beacon-record-"))
  const recordingPath = join(tmpDir, "recording.js")

  const playwrightCli = require.resolve("playwright/cli.js")
  console.log("Opening browser for recording. Close the browser window when you're done.")

  // Pre-create the file so fs.watch can attach immediately.
  writeFileSync(recordingPath, "")
  const timestamps = startFileWatcher(recordingPath)

  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(
      "node",
      [playwrightCli, "codegen", args.url, "--target=javascript", "-o", recordingPath],
      { stdio: "inherit" },
    )
    child.on("exit", (code) => {
      if (code === 0 || code === null) resolvePromise()
      else reject(new Error(`playwright codegen exited with code ${code}`))
    })
  })

  if (!existsSync(recordingPath)) {
    throw new Error(`recording file not written at ${recordingPath} — was the session aborted?`)
  }

  const recording = readFileSync(recordingPath, "utf8")
  const parsed = translatePlaywrightScript(recording)

  if (!parsed.target) {
    throw new Error("recorded session has no page.goto() — nothing to translate")
  }

  const actionTimestamps = alignTimestamps(parsed.actionIndexes.length, timestamps())
  let ops = parsed.ops

  const useAutoWait = args.autoWait !== false
  if (useAutoWait && actionTimestamps.some((t) => t !== undefined)) {
    ops = insertAutoWaits(ops, parsed.actionIndexes, actionTimestamps)
  }

  if (args.callouts) {
    const prompts = await promptForCallouts(ops, parsed.actionIndexes)
    ops = insertCallouts(ops, parsed.actionIndexes, prompts)
  }

  const title = args.title ?? deriveTitleFromUrl(parsed.target)
  const script = buildBeaconScript({
    title,
    target: parsed.target,
    body: opsToBodyLines(ops),
    warnings: parsed.warnings,
  })

  writeFileSync(outPath, script)

  const parts = [`wrote ${outPath}`, `${parsed.ops.length} ops`]
  if (useAutoWait && actionTimestamps.some((t) => t !== undefined)) {
    const inserted = ops.filter((o) => o.kind === "wait").length
    if (inserted > 0) parts.push(`${inserted} auto-waits`)
  }
  if (args.callouts) {
    const inserted = ops.filter((o) => o.kind === "callout").length
    parts.push(`${inserted} callouts`)
  }
  if (parsed.warnings.length > 0) parts.push(`${parsed.warnings.length} warnings`)
  console.log(parts.join(" · "))
}

/**
 * Watch the codegen output file. Each time it grows, capture the size at that moment
 * along with the wall-clock timestamp. Returns a getter for the captured samples.
 */
function startFileWatcher(path: string): () => Samples {
  const samples: Samples = []
  let lastSize = 0
  const start = Date.now()

  const onChange = () => {
    try {
      const size = statSync(path).size
      if (size > lastSize) {
        samples.push({ size, at: Date.now() - start })
        lastSize = size
      }
    } catch {
      /* file may briefly disappear during rename; ignore */
    }
  }

  // Both fs.watch (event-driven) and a low-rate poll, because codegen
  // sometimes uses atomic rename on macOS which makes fs.watch flaky.
  const watcher = watch(path, onChange)
  const poll = setInterval(onChange, 200)

  return () => {
    watcher.close()
    clearInterval(poll)
    onChange()
    return samples
  }
}

interface Sample { size: number; at: number }
type Samples = Sample[]

/**
 * Given file-size samples, return per-action timestamps by counting how many
 * actions were present in the file at the time of each sample.
 *
 * Heuristic: read the file as it grew. For each "action line" detected after a
 * sample, that sample's timestamp is the closest upper bound. We approximate by
 * using the FIRST sample whose size exceeds the action's byte-offset in the
 * final file. Good enough for "long pause" detection; exact replay isn't the goal.
 */
function alignTimestamps(actionCount: number, samples: Samples): (number | undefined)[] {
  if (samples.length === 0 || actionCount === 0) return new Array(actionCount).fill(undefined)
  const out: (number | undefined)[] = new Array(actionCount).fill(undefined)
  // Approximation: split actions evenly across captured samples in order of
  // arrival. Real action boundaries vs file growth are noisy because codegen
  // sometimes rewrites the whole file (e.g. when inserting `.first()`).
  const perAction = samples.length / actionCount
  for (let i = 0; i < actionCount; i++) {
    const idx = Math.min(samples.length - 1, Math.floor(i * perAction))
    out[i] = samples[idx]?.at
  }
  return out
}

async function promptForCallouts(
  ops: RecordedOp[],
  actionIndexes: number[],
): Promise<(string | null)[]> {
  const prompts: (string | null)[] = new Array(actionIndexes.length).fill(null)

  p.intro(`Recorded ${actionIndexes.length} action(s)`)

  const labels = actionIndexes.map((idx) =>
    idx < 0 ? "navigate (target URL)" : summariseOp(ops[idx]!),
  )

  const selected = await p.multiselect({
    message: "Which actions should have a callout before them? (space = toggle, enter = confirm)",
    options: labels.map((label, i) => ({ value: i, label })),
    required: false,
  })

  if (p.isCancel(selected)) {
    p.outro("No callouts added.")
    return prompts
  }
  const indices = selected as number[]
  if (indices.length === 0) {
    p.outro("No callouts added.")
    return prompts
  }

  for (const i of indices) {
    const text = await p.text({
      message: `Callout before: ${labels[i]}`,
      placeholder: "e.g. Strict ethical stock screening",
      validate: (v) => (v.trim() === "" ? "Callout text is required (or cancel to skip)" : undefined),
    })
    if (p.isCancel(text)) continue
    prompts[i] = String(text).trim()
  }

  const added = prompts.filter((x) => x !== null).length
  p.outro(`${added} callout${added === 1 ? "" : "s"} added.`)
  return prompts
}

function summariseOp(op: RecordedOp): string {
  switch (op.kind) {
    case "navigate":
      return `navigate ${op.url}`
    case "click":
      return `click ${op.selector}`
    case "hover":
      return `hover ${op.selector}`
    case "type":
      return `type ${JSON.stringify(op.text)}`
    case "fill":
      return `fill ${op.selector} <- ${JSON.stringify(op.text)}`
    case "wait":
      return `wait ${op.ms}ms`
    case "callout":
      return `callout ${JSON.stringify(op.text)}`
    case "todo":
      return `todo ${op.original}`
  }
}

function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, "")
  } catch {
    return "Recorded showcase"
  }
}
