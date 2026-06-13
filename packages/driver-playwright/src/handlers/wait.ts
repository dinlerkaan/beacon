import { register } from "./index.js"

register("wait", async (op, { buf, now }) => {
  buf.appendEvent({ at: now(), op })
  await new Promise((resolve) => setTimeout(resolve, op.ms))
})
