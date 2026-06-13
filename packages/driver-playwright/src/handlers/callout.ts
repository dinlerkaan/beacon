import { register } from "./index.js"

register("callout", async (op, { page, buf, now }) => {
  let targetBBox
  if (op.target) {
    const loc = page.locator(op.target)
    await loc.waitFor({ state: "visible" })
    const box = await loc.boundingBox()
    if (box) targetBBox = { x: box.x, y: box.y, w: box.width, h: box.height }
  }
  buf.appendEvent({ at: now(), op, targetBBox })
  const dur = op.duration ?? 2000
  await new Promise((resolve) => setTimeout(resolve, dur))
})
