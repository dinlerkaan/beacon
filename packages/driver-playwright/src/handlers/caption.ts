import { register } from "./index.js"

register("caption", async (op, { buf, now }) => {
  buf.appendEvent({ at: now(), op })
  const dur = op.duration ?? 2000
  await new Promise((resolve) => setTimeout(resolve, dur))
})
