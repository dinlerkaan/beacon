import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer, type Server } from "node:http"
import { createReadStream, statSync } from "node:fs"
import { extname } from "node:path"
import { bundle } from "@remotion/bundler"
import { renderMedia, selectComposition } from "@remotion/renderer"
import { runShowcase } from "@beacon/driver-playwright"
import { loadScript } from "../load-script.js"

export interface RenderArgs {
  script: string   // path to .ts showcase file
  out: string      // output MP4 path
  fps?: number
  width?: number
  height?: number
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

export async function renderCommand(args: RenderArgs): Promise<void> {
  const scriptPath = resolve(args.script)
  const outPath = resolve(args.out)

  const def = await loadScript(scriptPath)
  const captureDir = mkdtempSync(join(tmpdir(), "beacon-capture-"))

  try {
    // 1. Drive the app, capture frames + events
    const snapshot = await runShowcase(def, {
      outDir: captureDir,
      fps: args.fps ?? 30,
      viewport: args.width && args.height ? { w: args.width, h: args.height } : undefined,
    })

    const snapshotPath = join(captureDir, "capture.json")
    writeFileSync(snapshotPath, JSON.stringify(snapshot))

    // Serve frames via HTTP — Chrome Headless Shell blocks file:// resource loading
    const framesServer = await serveDir(captureDir)

    try {
      // 2. Bundle the Remotion Root (must use the entry file that calls registerRoot)
      const rootPath = fileURLToPath(new URL("../../../render/src/remotion-entry.tsx", import.meta.url))
      // Webpack (used by @remotion/bundler) can't resolve .js → .tsx without an explicit
      // resolve.extensionAlias. All render-package imports use ESM-style ".js" extensions
      // that actually map to ".tsx"/".ts" source files.
      const bundled = await bundle({
        entryPoint: rootPath,
        webpackOverride: (config) => {
          config.resolve = config.resolve ?? {}
          config.resolve.extensionAlias = {
            ...(config.resolve.extensionAlias ?? {}),
            ".js": [".tsx", ".ts", ".js"],
          }
          return config
        },
      })

      const inputProps = {
        snapshot,
        framesBaseUrl: framesServer.baseUrl,
      }

      // 3. Select composition + render
      const composition = await selectComposition({
        serveUrl: bundled,
        id: "BeaconShowcase",
        inputProps,
      })

      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: "h264",
        outputLocation: outPath,
        inputProps,
      })
    } finally {
      await framesServer.close()
    }
  } finally {
    rmSync(captureDir, { recursive: true, force: true })
  }
}
