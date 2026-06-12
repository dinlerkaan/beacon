import { register } from "./index.js"

register("navigate", async (op, { page, buf, now }) => {
  await page.goto(op.url, { waitUntil: "domcontentloaded" })
  buf.appendEvent({ at: now(), op })
})
