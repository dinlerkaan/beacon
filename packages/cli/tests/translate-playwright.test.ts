import { describe, it, expect } from "vitest"
import {
  translatePlaywrightScript,
  opsToBodyLines,
  insertAutoWaits,
  insertCallouts,
  buildBeaconScript,
  type RecordedOp,
} from "../src/translate-playwright"

const wrap = (body: string) => `import { test, expect } from '@playwright/test'
test('test', async ({ page }) => {
${body}
})`

const lines = (ops: RecordedOp[]) => opsToBodyLines(ops)

describe("translatePlaywrightScript", () => {
  it("extracts the first goto URL as the target and does not emit it as an op", () => {
    const r = translatePlaywrightScript(wrap(`  await page.goto('https://example.com/')`))
    expect(r.target).toBe("https://example.com/")
    expect(r.ops).toEqual([])
    expect(r.actionIndexes).toEqual([-1])
  })

  it("emits subsequent goto calls as navigate ops", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://example.com/')
  await page.goto('https://example.com/about')`),
    )
    expect(lines(r.ops)).toEqual([`await s.navigate("https://example.com/about")`])
  })

  it("translates getByRole(...).click() to a role selector", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByRole('link', { name: 'Halal' }).click()`),
    )
    expect(lines(r.ops)).toEqual([`await s.click('role=link[name="Halal"]')`])
  })

  it("preserves the exact flag on getByRole", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByRole('link', { name: 'Halal', exact: true }).click()`),
    )
    expect(lines(r.ops)).toEqual([`await s.click('role=link[name="Halal" exact]')`])
  })

  it("translates .first() into >> nth=0", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByRole('link', { name: 'Halal' }).first().click()`),
    )
    expect(lines(r.ops)).toEqual([`await s.click('role=link[name="Halal"] >> nth=0')`])
  })

  it("translates getByText().click() to a text selector", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByText('Submit').click()`),
    )
    expect(lines(r.ops)).toEqual([`await s.click('text=Submit')`])
  })

  it("translates locator(css).click() to a CSS selector with double quotes", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#submit').click()`),
    )
    expect(lines(r.ops)).toEqual([`await s.click("#submit")`])
  })

  it("translates .fill() into a click+type pair", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.getByRole('textbox', { name: 'Ticker' }).fill('AAPL')`),
    )
    expect(lines(r.ops)).toEqual([
      `await s.click('role=textbox[name="Ticker"]')`,
      `await s.type("AAPL")`,
    ])
  })

  it("translates .hover() to s.hover", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#menu').hover()`),
    )
    expect(lines(r.ops)).toEqual([`await s.hover("#menu")`])
  })

  it("collects warnings for unrecognised lines and turns them into todo ops", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.keyboard.press('Escape')`),
    )
    expect(r.warnings.length).toBe(1)
    expect(r.ops[0]?.kind).toBe("todo")
  })

  it("returns parallel actionIndexes pointing at op array positions", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#a').click()
  await page.locator('#b').click()`),
    )
    // 3 captured actions: initial goto (sentinel -1), then two clicks at ops[0], ops[1]
    expect(r.actionIndexes).toEqual([-1, 0, 1])
  })
})

describe("insertAutoWaits", () => {
  it("inserts a wait before an action whose gap exceeds the threshold", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#a').click()
  await page.locator('#b').click()`),
    )
    // gaps: action0(goto)=0ms, action1(click#a)=200ms (short), action2(click#b)=2500ms (long)
    const withWaits = insertAutoWaits(r.ops, r.actionIndexes, [0, 200, 2500])
    expect(lines(withWaits)).toEqual([
      `await s.click("#a")`,
      `await s.wait(${2500 - 200 - 300})`, // gap - smoothMs
      `await s.click("#b")`,
    ])
  })

  it("does not insert waits below the threshold", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#a').click()
  await page.locator('#b').click()`),
    )
    const withWaits = insertAutoWaits(r.ops, r.actionIndexes, [0, 100, 400])
    expect(lines(withWaits)).toEqual([`await s.click("#a")`, `await s.click("#b")`])
  })

  it("caps the inserted wait at the cap argument", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#a').click()
  await page.locator('#b').click()`),
    )
    const withWaits = insertAutoWaits(r.ops, r.actionIndexes, [0, 0, 50_000])
    const out = lines(withWaits)
    expect(out).toContain(`await s.wait(3000)`)
  })

  it("returns ops unchanged when all timestamps are undefined", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#a').click()`),
    )
    const same = insertAutoWaits(r.ops, r.actionIndexes, [undefined, undefined])
    expect(same).toEqual(r.ops)
  })
})

describe("insertCallouts", () => {
  it("inserts a callout op before the corresponding action", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#a').click()
  await page.locator('#b').click()`),
    )
    const withCallouts = insertCallouts(r.ops, r.actionIndexes, [null, "Click here", null])
    expect(lines(withCallouts)).toEqual([
      `await s.callout("Click here")`,
      `await s.click("#a")`,
      `await s.click("#b")`,
    ])
  })

  it("treats prompts for the implicit initial navigate as a leading callout", () => {
    const r = translatePlaywrightScript(
      wrap(`  await page.goto('https://x.com/')
  await page.locator('#a').click()`),
    )
    const withCallouts = insertCallouts(r.ops, r.actionIndexes, ["Welcome", null])
    expect(lines(withCallouts)).toEqual([
      `await s.callout("Welcome")`,
      `await s.click("#a")`,
    ])
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
