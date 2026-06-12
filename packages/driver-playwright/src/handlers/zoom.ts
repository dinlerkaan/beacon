import { register } from "./index.js"

register("zoom", async (op, { page, buf, now }) => {
  let targetBBox
  if (op.selector) {
    const box = await page.locator(op.selector).boundingBox()
    if (box) targetBBox = { x: box.x, y: box.y, w: box.width, h: box.height }
  }
  buf.appendEvent({ at: now(), op, targetBBox })
})
