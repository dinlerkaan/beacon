import { showcase } from "@beacon/core"

export default showcase(
  "Lodestar — strict ethical stock screening",
  {
    target: "https://lodestar.boomarche.com",
    viewport: { w: 1440, h: 900 },
  },
  async (s) => {
    await s.callout("Strict ethical stock screening", { duration: 2000 })
    await s.wait(400)

    await s.hover('a.text-brand-muted[href="/halal"]')
    await s.callout("Six value frameworks", {
      target: 'a.text-brand-muted[href="/halal"]',
      side: "bottom",
      duration: 1800,
    })

    await s.click('a.text-brand-muted[href="/halal"]')
    await s.wait(900)

    await s.callout("Every ticker that qualifies, one click away", {
      duration: 2200,
    })

    await s.caption("Lodestar — find investments that match your values")
    await s.wait(600)
  },
)
