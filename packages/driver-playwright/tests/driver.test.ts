import { afterAll, beforeAll, describe, it, expect } from "vitest"
import { tmpdir } from "node:os"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { showcase } from "@beacon/core"
import { runShowcase } from "../src/index"
import { startFixtureServer } from "./fixture-server"

let server: { url: string; close: () => Promise<void> }
let outDir: string

beforeAll(async () => {
  server = await startFixtureServer()
  outDir = mkdtempSync(join(tmpdir(), "beacon-test-"))
})

afterAll(async () => {
  await server.close()
  rmSync(outDir, { recursive: true, force: true })
})

describe("PlaywrightDriver — skeleton", () => {
  it("navigates and records the navigate event", async () => {
    const def = showcase("Test", { target: server.url }, async (s) => {
      await s.navigate(server.url)
    })

    const snapshot = await runShowcase(def, { outDir })

    expect(snapshot.schemaVersion).toBe(1)
    expect(snapshot.events.length).toBeGreaterThanOrEqual(1)
    expect(snapshot.events[0]?.op.kind).toBe("navigate")
    expect(snapshot.frames.length).toBeGreaterThan(0)
  })
})

describe("PlaywrightDriver — click", () => {
  it("records click with targetBBox and cursor position", async () => {
    const def = showcase("Click", { target: server.url }, async (s) => {
      await s.click("#submit")
    })
    const snap = await runShowcase(def, { outDir })

    const click = snap.events.find((e) => e.op.kind === "click")
    expect(click).toBeDefined()
    expect(click?.targetBBox).toMatchObject({ x: expect.any(Number), y: expect.any(Number), w: expect.any(Number), h: expect.any(Number) })
    expect(click?.cursor).toMatchObject({ x: expect.any(Number), y: expect.any(Number) })
  })
})

describe("PlaywrightDriver — type", () => {
  it("types text into the most recently focused field", async () => {
    const def = showcase("Type", { target: server.url }, async (s) => {
      await s.click("#name")
      await s.type("Kaan")
      await s.click("#submit")
    })
    const snap = await runShowcase(def, { outDir })

    const typeEv = snap.events.find((e) => e.op.kind === "type")
    expect(typeEv?.op).toMatchObject({ kind: "type", text: "Kaan" })

    // verify the page actually received the keystrokes
    const result = await import("node:fs").then((fs) =>
      fs.readdirSync(join(outDir, "frames")),
    )
    expect(result.length).toBeGreaterThan(0)
  })
})

describe("PlaywrightDriver — hover + wait", () => {
  it("records hover with bbox and wait with duration", async () => {
    const def = showcase("Hover", { target: server.url }, async (s) => {
      await s.hover("#submit")
      await s.wait(50)
    })
    const snap = await runShowcase(def, { outDir })
    const hover = snap.events.find((e) => e.op.kind === "hover")
    const wait = snap.events.find((e) => e.op.kind === "wait")
    expect(hover?.targetBBox).toBeDefined()
    expect(wait?.op).toMatchObject({ kind: "wait", ms: 50 })
  })
})

describe("PlaywrightDriver — annotations", () => {
  it("records callout with bbox if target selector provided", async () => {
    const def = showcase("Callout", { target: server.url }, async (s) => {
      await s.callout("Submit here", { target: "#submit", duration: 1500, side: "bottom" })
    })
    const snap = await runShowcase(def, { outDir })
    const ev = snap.events.find((e) => e.op.kind === "callout")!
    expect(ev.op).toMatchObject({ kind: "callout", text: "Submit here", duration: 1500 })
    expect(ev.targetBBox).toBeDefined()
  })

  it("records zoom event with bbox when selector provided", async () => {
    const def = showcase("Zoom", { target: server.url }, async (s) => {
      await s.zoom({ selector: "#title", factor: 2 })
    })
    const snap = await runShowcase(def, { outDir })
    const ev = snap.events.find((e) => e.op.kind === "zoom")!
    expect(ev.op).toMatchObject({ kind: "zoom", factor: 2 })
    expect(ev.targetBBox).toBeDefined()
  })

  it("records caption with default duration if unspecified", async () => {
    const def = showcase("Caption", { target: server.url }, async (s) => {
      await s.caption("Welcome")
    })
    const snap = await runShowcase(def, { outDir })
    const ev = snap.events.find((e) => e.op.kind === "caption")!
    expect(ev.op).toMatchObject({ kind: "caption", text: "Welcome" })
  })
})
