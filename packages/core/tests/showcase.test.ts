import { describe, it, expect } from "vitest"
import { showcase, recordOperations } from "../src/showcase"
import type { Operation } from "../src/types"

describe("showcase()", () => {
  it("returns a ShowcaseDef with title, options, and body", () => {
    const def = showcase("Demo", { target: "https://example.com" }, async () => {})
    expect(def.title).toBe("Demo")
    expect(def.options.target).toBe("https://example.com")
    expect(typeof def.body).toBe("function")
  })

  it("recordOperations replays the body and collects operations", async () => {
    const def = showcase("Demo", { target: "https://example.com" }, async (s) => {
      await s.navigate("https://example.com/login")
      await s.click("#submit")
      await s.type("hello")
      await s.callout("Note", { duration: 1000 })
    })

    const ops: Operation[] = await recordOperations(def)

    expect(ops).toEqual([
      { kind: "navigate", url: "https://example.com/login" },
      { kind: "click", selector: "#submit" },
      { kind: "type", text: "hello" },
      { kind: "callout", text: "Note", duration: 1000 },
    ])
  })
})
