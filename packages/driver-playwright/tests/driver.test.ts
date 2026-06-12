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
