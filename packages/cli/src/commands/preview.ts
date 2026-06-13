import { spawn } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync, createReadStream, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer, type Server } from "node:http"
import { runShowcase } from "@beacon/driver-playwright"
import { loadScript } from "../load-script.js"
import { resolveRemotionEntry } from "../resolve-render-entry.js"

export interface PreviewArgs {
  script: string
}

/** Serve a directory as a static HTTP server; returns base URL + close fn */
function serveDir(dir: string): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".json": "application/json",
  }
  const server: Server = createServer((req, res) => {
    const safePath = (req.url ?? "/").replace(/\.\./g, "").replace(/^\//, "")
    const filePath = join(dir, safePath)
    try {
      const stat = statSync(filePath)
      if (!stat.isFile()) { res.writeHead(404); res.end(); return }
      res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream" })
      createReadStream(filePath).pipe(res)
    } catch { res.writeHead(404); res.end() }
  })
  return new Promise((resolve2) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address()
      if (!addr || typeof addr === "string") throw new Error("server has no address")
      resolve2({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise<void>((r) => server.close(() => r())),
      })
    })
  })
}

export async function previewCommand(args: PreviewArgs): Promise<void> {
  const scriptPath = resolve(args.script)
  const def = await loadScript(scriptPath)
  const captureDir = mkdtempSync(join(tmpdir(), "beacon-preview-"))

  try {
    const snapshot = await runShowcase(def, { outDir: captureDir })
    const snapshotPath = join(captureDir, "capture.json")
    writeFileSync(snapshotPath, JSON.stringify(snapshot))

    const framesServer = await serveDir(captureDir)

    try {
      const rootPath = resolveRemotionEntry()
      const child = spawn("pnpm", ["exec", "remotion", "studio", rootPath], {
        stdio: "inherit",
        env: {
          ...process.env,
          REMOTION_INPUT_PROPS: JSON.stringify({ snapshot, framesBaseUrl: framesServer.baseUrl }),
        },
      })
      await new Promise<void>((resolve, reject) => {
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`remotion exited ${code}`))))
      })
    } finally {
      await framesServer.close()
    }
  } finally {
    rmSync(captureDir, { recursive: true, force: true })
  }
}
