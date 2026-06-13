import { describe, it, expect } from "vitest"
import { translatePlaywrightScript, buildBeaconScript } from "../src/translate-playwright"

const wrap = (body: string) => `import { test, expect } from '@playwright/test'
test('test', async ({ page }) => {
${body}
})`

describe("translatePlaywrightScript", () => {
  it("extracts the first goto URL as the target and does not emit it as an op", () => {
    const r = translatePlaywrightScript(wrap(`  await page.goto('https://example.com/')`))
    expect(r.target).toBe("https://example.com/")
    expect(r.body).toEqual([])
  })

  it("emits subsequent goto calls as s.navigate", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://example.com/')
  await page.goto('https://example.com/about')`),
    )
    expect(r.target).toBe("https://example.com/")
    expect(r.body).toEqual([`await s.navigate("https://example.com/about")`])
  })

  it("translates getByRole(...).click() to s.click with a role selector", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByRole('link', { name: 'Halal' }).click()`),
    )
    expect(r.body).toEqual([`await s.click('role=link[name="Halal"]')`])
  })

  it("preserves the exact flag on getByRole", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByRole('link', { name: 'Halal', exact: true }).click()`),
    )
    expect(r.body).toEqual([`await s.click('role=link[name="Halal" exact]')`])
  })

  it("translates .first() into >> nth=0", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByRole('link', { name: 'Halal' }).first().click()`),
    )
    expect(r.body).toEqual([`await s.click('role=link[name="Halal"] >> nth=0')`])
  })

  it("translates getByText().click() to a text selector", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByText('Submit').click()`),
    )
    expect(r.body).toEqual([`await s.click('text=Submit')`])
  })

  it("translates locator(css).click() to s.click with the css selector", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#submit').click()`),
    )
    expect(r.body).toEqual([`await s.click("#submit")`])
  })

  it("translates .fill() into focus-then-type (click + type)", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByRole('textbox', { name: 'Ticker' }).fill('AAPL')`),
    )
    expect(r.body).toEqual([
      `await s.click('role=textbox[name="Ticker"]')`,
      `await s.type("AAPL")`,
    ])
  })

  it("translates .hover() to s.hover", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#menu').hover()`),
    )
    expect(r.body).toEqual([`await s.hover("#menu")`])
  })

  it("collects warnings for unrecognised lines and emits them as comments", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.keyboard.press('Escape')`),
    )
    expect(r.warnings.length).toBe(1)
    expect(r.body[0]).toMatch(/^\/\/ TODO: unrecognised:/)
  })

  it("ignores test boilerplate and blank lines", () => {
    const r = translatePlaywrightScript(`import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  await page.goto('https://x.com/')

  await page.locator('#a').click()
})`)
    expect(r.body).toEqual([`await s.click("#a")`])
  })
})

describe("buildBeaconScript", () => {
  it("wraps body lines in a showcase() factory call", () => {
    const out = buildBeaconScript({
      title: "My demo",
      target: "https://example.com/",
      body: [`await s.click("#a")`, `await s.type("AAPL")`],
      warnings: [],
    })
    expect(out).toContain(`import { showcase } from "@beacon/core"`)
    expect(out).toMatch(/showcase\(\s*"My demo"/)
    expect(out).toContain(`target: "https://example.com/"`)
    expect(out).toContain(`await s.click("#a")`)
    expect(out).toContain(`await s.type("AAPL")`)
  })

  it("includes a warnings comment block when warnings are present", () => {
    const out = buildBeaconScript({
      title: "Demo",
      target: "https://x/",
      body: [],
      warnings: [`await page.keyboard.press('Escape')`],
    })
    expect(out).toMatch(/\/\/ Recorder warnings:[\s\S]*Escape/)
  })
})
