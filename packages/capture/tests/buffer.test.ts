import { describe, it, expect } from "vitest"
import { CaptureBuffer, CAPTURE_SCHEMA_VERSION } from "../src/index"

describe("CaptureBuffer", () => {
  it("starts empty with correct schema version", () => {
    const buf = new CaptureBuffer({ width: 1440, height: 900, fps: 30 })
    const snap = buf.serialize()
    expect(snap.schemaVersion).toBe(CAPTURE_SCHEMA_VERSION)
    expect(snap.events).toEqual([])
    expect(snap.frames).toEqual([])
    expect(snap.meta).toEqual({ width: 1440, height: 900, fps: 30 })
  })

  it("appends events with monotonic timestamps", () => {
    const buf = new CaptureBuffer({ width: 1440, height: 900, fps: 30 })
    buf.appendEvent({ at: 0, op: { kind: "navigate", url: "https://x" } })
    buf.appendEvent({
      at: 500,
      op: { kind: "click", selector: "#a" },
      cursor: { x: 100, y: 200 },
      targetBBox: { x: 90, y: 190, w: 40, h: 20 },
    })
    const snap = buf.serialize()
    expect(snap.events.length).toBe(2)
    expect(snap.events[1]?.cursor).toEqual({ x: 100, y: 200 })
  })

  it("throws on non-monotonic timestamps", () => {
    const buf = new CaptureBuffer({ width: 1440, height: 900, fps: 30 })
    buf.appendEvent({ at: 100, op: { kind: "wait", ms: 100 } })
    expect(() =>
      buf.appendEvent({ at: 50, op: { kind: "wait", ms: 100 } }),
    ).toThrow(/monotonic/)
  })

  it("records frame paths in order", () => {
    const buf = new CaptureBuffer({ width: 1440, height: 900, fps: 30 })
    buf.appendFrame({ at: 0, path: "frames/0000.png" })
    buf.appendFrame({ at: 33, path: "frames/0001.png" })
    const snap = buf.serialize()
    expect(snap.frames.map((f) => f.path)).toEqual(["frames/0000.png", "frames/0001.png"])
  })
})
