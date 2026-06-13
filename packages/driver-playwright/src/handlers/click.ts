import { register } from "./index.js"

register("click", async (op, { page, buf, now }) => {
  const loc = page.locator(op.selector)
  await loc.waitFor({ state: "visible" })
  const box = await loc.boundingBox()
  if (!box) throw new Error(`click: could not get bounding box for ${op.selector}`)
  const cursor = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  buf.appendEvent({
    at: now(),
    op,
    cursor,
    targetBBox: { x: box.x, y: box.y, w: box.width, h: box.height },
  })
  await loc.click()
})
