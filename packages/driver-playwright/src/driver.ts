import { chromium, type Browser, type Page } from "playwright"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { CaptureBuffer, type CaptureBufferSnapshot } from "@beacon/capture"
import type { ShowcaseDef, ShowcaseRunner } from "@beacon/core"
import { dispatch, type HandlerCtx } from "./handlers/index.js"
import "./handlers/navigate.js"  // ensure handlers register on import

export interface RunOptions {
  outDir: string                    // dir for frames + capture.json
  viewport?: { w: number; h: number }
  fps?: number
}

export async function runShowcase(
  def: ShowcaseDef,
  opts: RunOptions,
): Promise<CaptureBufferSnapshot> {
  const viewport = opts.viewport ?? def.options.viewport ?? { w: 1440, h: 900 }
  const fps = opts.fps ?? 30
  const framesDir = join(opts.outDir, "frames")
  mkdirSync(framesDir, { recursive: true })

  const buf = new CaptureBuffer({ width: viewport.w, height: viewport.h, fps })
  const start = performance.now()
  const now = () => performance.now() - start

  const browser: Browser = await chromium.launch()
  try {
    const context = await browser.newContext({ viewport: { width: viewport.w, height: viewport.h } })
    const page: Page = await context.newPage()

    const ctx: HandlerCtx = { page, buf, now }
    const runner = makeRunner(ctx)

    // Auto-navigate to the target if it's a URL, before user body runs
    const target = def.options.target
    if (typeof target === "string") await page.goto(target)
    else if (target.kind === "web") await page.goto(target.url)

    // Shared frame capture helper — used by handlers and the interval ticker
    let frameIdx = 0
    const captureFrame = async () => {
      try {
        const png = await page.screenshot({ type: "png" })
        const path = join("frames", `${String(frameIdx).padStart(5, "0")}.png`)
        writeFileSync(join(opts.outDir, path), png)
        buf.appendFrame({ at: now(), path })
        frameIdx += 1
      } catch { /* page may be navigating */ }
    }

    // Capture an initial frame after the auto-navigate
    await captureFrame()

    // Frame-capture loop for long-running operations
    const frameInterval = 1000 / fps
    const ticker = setInterval(() => { void captureFrame() }, frameInterval)

    try {
      await def.body(runner)
    } finally {
      clearInterval(ticker)
    }

    return buf.serialize()
  } finally {
    await browser.close()
  }
}

function makeRunner(ctx: HandlerCtx): ShowcaseRunner {
  return {
    async navigate(url) { await dispatch({ kind: "navigate", url }, ctx) },
    async click(selector) { await dispatch({ kind: "click", selector }, ctx) },
    async type(text, o) { await dispatch({ kind: "type", text, ...o }, ctx) },
    async hover(selector) { await dispatch({ kind: "hover", selector }, ctx) },
    async wait(ms) { await dispatch({ kind: "wait", ms }, ctx) },
    async callout(text, o) { await dispatch({ kind: "callout", text, ...o }, ctx) },
    async zoom(o) { await dispatch({ kind: "zoom", ...o }, ctx) },
    async caption(text, o) { await dispatch({ kind: "caption", text, ...o }, ctx) },
  }
}
