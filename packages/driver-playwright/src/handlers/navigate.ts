import { register, type HandlerCtx } from "./index.js"

type CtxWithCapture = HandlerCtx & { captureFrame?: () => Promise<void> }

register("navigate", async (op, ctx) => {
  const { page, buf, now } = ctx
  await page.goto(op.url, { waitUntil: "domcontentloaded" })
  buf.appendEvent({ at: now(), op })
  // Capture a frame immediately after navigation so there's always at least one
  await (ctx as CtxWithCapture).captureFrame?.()
})
