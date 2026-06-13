import { spawn } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL, fileURLToPath } from "node:url"
import { runShowcase } from "@beacon/driver-playwright"
import { loadScript } from "../load-script.js"

export interface PreviewArgs {
  script: string
}

export async function previewCommand(args: PreviewArgs): Promise<void> {
  const scriptPath = resolve(args.script)
  const def = await loadScript(scriptPath)
  const captureDir = mkdtempSync(join(tmpdir(), "beacon-preview-"))
  const snapshot = await runShowcase(def, { outDir: captureDir })
  const snapshotPath = join(captureDir, "capture.json")
  writeFileSync(snapshotPath, JSON.stringify(snapshot))

  const rootPath = fileURLToPath(new URL("../../../render/src/remotion-entry.tsx", import.meta.url))
  const child = spawn("pnpm", ["exec", "remotion", "studio", rootPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      REMOTION_INPUT_PROPS: JSON.stringify({ snapshot, framesBaseUrl: pathToFileURL(captureDir).href }),
    },
  })
  await new Promise<void>((resolve, reject) => {
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`remotion exited ${code}`))))
  })
}
