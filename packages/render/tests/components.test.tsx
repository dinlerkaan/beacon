import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Background } from "../src/components/Background"

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
