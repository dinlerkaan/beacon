import { showcase } from "@beacon/core"

export default showcase(
  "Hello Beacon",
  { target: "https://example.com", viewport: { w: 1440, h: 900 } },
  async (s) => {
    await s.callout("Welcome to Beacon", { duration: 1500 })
    await s.caption("A scripted feature showcase")
    await s.wait(500)
    await s.zoom({ factor: 1.2 })
    await s.wait(500)
  },
)
