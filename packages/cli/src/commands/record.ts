import { spawn } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { createRequire } from "node:module"
import { translatePlaywrightScript, buildBeaconScript } from "../translate-playwright.js"

const require = createRequire(import.meta.url)

export interface RecordArgs {
  url: string
  out: string
  title?: string
}

export async function recordCommand(args: RecordArgs): Promise<void> {
  const outPath = resolve(args.out)
  const tmpDir = mkdtempSync(join(tmpdir(), "beacon-record-"))
  const recordingPath = join(tmpDir, "recording.js")

  // Resolve Playwright's CLI from this package's deps (added explicitly for the record command).
  const playwrightCli = require.resolve("playwright/cli.js")

  console.log("Opening browser for recording. Close the browser window when you're done.")

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

  const title = args.title ?? deriveTitleFromUrl(parsed.target)
  const script = buildBeaconScript({
    title,
    target: parsed.target,
    body: parsed.body,
    warnings: parsed.warnings,
  })

  writeFileSync(outPath, script)

  const summary =
    parsed.warnings.length > 0
      ? `wrote ${outPath} (${parsed.body.length} ops, ${parsed.warnings.length} warnings)`
      : `wrote ${outPath} (${parsed.body.length} ops)`
  console.log(summary)
}

function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, "")
  } catch {
    return "Recorded showcase"
  }
}
