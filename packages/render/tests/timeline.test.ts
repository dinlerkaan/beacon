import { describe, it, expect } from "vitest"
import { buildTimeline } from "../src/timeline"
import type { CaptureBufferSnapshot } from "@beacon/capture"

const snap: CaptureBufferSnapshot = {
  schemaVersion: 1,
  meta: { width: 1440, height: 900, fps: 30 },
  events: [
    { at: 0, op: { kind: "navigate", url: "https://x" } },
    { at: 500, op: { kind: "click", selector: "#a" }, cursor: { x: 100, y: 200 }, targetBBox: { x: 90, y: 190, w: 40, h: 20 } },
    { at: 1500, op: { kind: "callout", text: "Hi", duration: 1000 }, targetBBox: { x: 0, y: 0, w: 20, h: 20 } },
    { at: 2700, op: { kind: "caption", text: "Bye", duration: 800 } },
  ],
  frames: [],
}

describe("buildTimeline", () => {
  it("computes total duration in frames", () => {
    const tl = buildTimeline(snap)
    // last event ends at 2700 + 800 = 3500ms; at 30fps that's 105 frames; +buffer
    expect(tl.durationFrames).toBeGreaterThanOrEqual(105)
  })

  it("collects cursor keyframes from click/hover events", () => {
    const tl = buildTimeline(snap)
    expect(tl.cursorKeyframes.length).toBeGreaterThanOrEqual(1)
    expect(tl.cursorKeyframes[0]).toMatchObject({ x: 100, y: 200 })
  })

  it("emits ripple windows for each click", () => {
    const tl = buildTimeline(snap)
    expect(tl.ripples.length).toBe(1)
    expect(tl.ripples[0]).toMatchObject({ x: 100, y: 200 })
  })

  it("produces an active callout window covering its duration", () => {
    const tl = buildTimeline(snap)
    expect(tl.callouts.length).toBe(1)
    expect(tl.callouts[0]!.text).toBe("Hi")
    expect(tl.callouts[0]!.endMs - tl.callouts[0]!.startMs).toBeCloseTo(1000)
  })

  it("produces an active caption window covering its duration", () => {
    const tl = buildTimeline(snap)
    expect(tl.captions.length).toBe(1)
    expect(tl.captions[0]!.text).toBe("Bye")
  })
})
