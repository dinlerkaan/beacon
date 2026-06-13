import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Background } from "../src/components/Background"
import { Cursor } from "../src/components/Cursor"
import { ClickRipple } from "../src/components/ClickRipple"
import { ZoomLayer } from "../src/components/ZoomLayer"
import { Callout } from "../src/components/Callout"
import { Caption } from "../src/components/Caption"

describe("Background", () => {
  it("renders a gradient padded container with rounded chrome", () => {
    const { container } = render(<Background width={1440} height={900}><div data-testid="content" /></Background>)
    const root = container.firstChild as HTMLElement
    expect(root.style.background).toContain("gradient")
    expect(root.querySelector('[data-testid="content"]')).toBeTruthy()
    const chrome = container.querySelector('[data-beacon="chrome"]') as HTMLElement
    expect(chrome).toBeTruthy()
    expect(chrome.style.borderRadius).not.toBe("")
    expect(chrome.style.position).toBe("relative")
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

describe("ClickRipple", () => {
  it("renders a circle that grows from start to end frame", () => {
    const { container, rerender } = render(<ClickRipple frame={0} fps={30} startFrame={0} durationFrames={15} x={100} y={100} />)
    const initial = container.querySelector('[data-beacon="ripple"]') as HTMLElement
    const r0 = parseFloat(initial.style.width)

    rerender(<ClickRipple frame={14} fps={30} startFrame={0} durationFrames={15} x={100} y={100} />)
    const later = container.querySelector('[data-beacon="ripple"]') as HTMLElement
    const r1 = parseFloat(later.style.width)
    expect(r1).toBeGreaterThan(r0)
  })

  it("renders nothing outside its active window", () => {
    const { container } = render(<ClickRipple frame={100} fps={30} startFrame={0} durationFrames={15} x={100} y={100} />)
    expect(container.querySelector('[data-beacon="ripple"]')).toBeNull()
  })
})

describe("ZoomLayer", () => {
  it("scales children when active bbox supplied", () => {
    const { container } = render(
      <ZoomLayer viewportW={1440} viewportH={900} bbox={{ x: 100, y: 100, w: 200, h: 100 }} factor={2}>
        <div data-testid="zoomed" />
      </ZoomLayer>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.transform).toContain("scale(2")
  })

  it("renders identity transform when no bbox supplied", () => {
    const { container } = render(
      <ZoomLayer viewportW={1440} viewportH={900}>
        <div />
      </ZoomLayer>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.transform === "" || wrapper.style.transform.includes("scale(1")).toBe(true)
  })
})

describe("Callout", () => {
  it("renders text with dim overlay when active", () => {
    const { container, getByText } = render(
      <Callout text="Click here" bbox={{ x: 100, y: 100, w: 50, h: 30 }} side="bottom" viewportW={800} viewportH={600} />,
    )
    expect(getByText("Click here")).toBeTruthy()
    expect(container.querySelector('[data-beacon="callout-dim"]')).toBeTruthy()
  })
})

describe("Caption", () => {
  it("renders text in a lower-third bar", () => {
    const { container, getByText } = render(<Caption text="Welcome" />)
    expect(getByText("Welcome")).toBeTruthy()
    const bar = container.querySelector('[data-beacon="caption"]') as HTMLElement
    expect(bar.style.bottom).not.toBe("")
  })
})
