import { register } from "./index.js"

register("hover", async (op, { page, buf, now }) => {
  const loc = page.locator(op.selector)
  await loc.waitFor({ state: "visible" })
  const box = await loc.boundingBox()
  if (!box) throw new Error(`hover: no bbox for ${op.selector}`)
  buf.appendEvent({
    at: now(),
    op,
    cursor: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    targetBBox: { x: box.x, y: box.y, w: box.width, h: box.height },
  })
  await loc.hover()
})
