import { register } from "./index.js"

register("type", async (op, { page, buf, now }) => {
  buf.appendEvent({ at: now(), op })
  await page.keyboard.type(op.text, { delay: op.perCharMs ?? 60 })
})
