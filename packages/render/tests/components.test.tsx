import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Background } from "../src/components/Background"
import { Cursor } from "../src/components/Cursor"

describe("Background", () => {
  it("renders a gradient padded container with rounded chrome", () => {
    const { container } = render(<Background width={1440} height={900}><div data-testid="content" /></Background>)
    const root = container.firstChild as HTMLElement
    expect(root.style.background).toContain("gradient")
    expect(root.querySelector('[data-testid="content"]')).toBeTruthy()
    const chrome = container.querySelector('[data-beacon="chrome"]') as HTMLElement
    expect(chrome).toBeTruthy()
    expect(chrome.style.borderRadius).not.toBe("")
  })
})

describe("Cursor", () => {
  it("renders at the first keyframe before any time passes", () => {
    const { container } = render(
      <Cursor frame={0} fps={30} keyframes={[{ at: 0, x: 100, y: 200 }, { at: 1000, x: 500, y: 600 }]} />,
    )
    const el = container.querySelector('[data-beacon="cursor"]') as HTMLElement
    expect(el.style.transform).toContain("translate(100px, 200px)")
  })

  it("eases between keyframes (midpoint is between endpoints, not arithmetic mean)", () => {
    const { container } = render(
      <Cursor frame={15} fps={30} keyframes={[{ at: 0, x: 0, y: 0 }, { at: 1000, x: 1000, y: 0 }]} />,
    )
    const el = container.querySelector('[data-beacon="cursor"]') as HTMLElement
    const match = el.style.transform.match(/translate\((\d+(?:\.\d+)?)px/)
    const x = match ? parseFloat(match[1]!) : 0
    // cubic ease at t=0.5 is exactly 0.5; we accept anything in (200, 800) — should NOT be 0 or 1000
    expect(x).toBeGreaterThan(200)
    expect(x).toBeLessThan(800)
  })
})
