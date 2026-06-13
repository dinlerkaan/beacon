import type { CaptureBufferSnapshot } from "@beacon/capture"
import type { BBox } from "./components/ZoomLayer.js"
import type { CursorKeyframe } from "./components/Cursor.js"

export interface RippleWindow { startMs: number; durationMs: number; x: number; y: number }
export interface CalloutWindow { startMs: number; endMs: number; text: string; bbox?: BBox; side?: "top" | "right" | "bottom" | "left" }
export interface CaptionWindow { startMs: number; endMs: number; text: string }
export interface ZoomWindow { startMs: number; endMs: number; bbox: BBox; factor: number }

export interface Timeline {
  fps: number
  width: number
  height: number
  durationFrames: number
  cursorKeyframes: CursorKeyframe[]
  ripples: RippleWindow[]
  callouts: CalloutWindow[]
  captions: CaptionWindow[]
  zooms: ZoomWindow[]
}

const TAIL_BUFFER_MS = 500

export function buildTimeline(snap: CaptureBufferSnapshot): Timeline {
  const { fps, width, height } = snap.meta
  const cursorKeyframes: CursorKeyframe[] = []
  const ripples: RippleWindow[] = []
  const callouts: CalloutWindow[] = []
  const captions: CaptionWindow[] = []
  const zooms: ZoomWindow[] = []
  let maxEndMs = 0

  for (const ev of snap.events) {
    if (ev.cursor) cursorKeyframes.push({ at: ev.at, x: ev.cursor.x, y: ev.cursor.y })

    switch (ev.op.kind) {
      case "click": {
        ripples.push({ startMs: ev.at, durationMs: 500, x: ev.cursor?.x ?? 0, y: ev.cursor?.y ?? 0 })
        if (ev.targetBBox) zooms.push({ startMs: ev.at, endMs: ev.at + 1200, bbox: ev.targetBBox, factor: 1.5 })
        maxEndMs = Math.max(maxEndMs, ev.at + 1200)
        break
      }
      case "callout": {
        const dur = ev.op.duration ?? 2000
        callouts.push({ startMs: ev.at, endMs: ev.at + dur, text: ev.op.text, bbox: ev.targetBBox, side: ev.op.side })
        maxEndMs = Math.max(maxEndMs, ev.at + dur)
        break
      }
      case "caption": {
        const dur = ev.op.duration ?? 2000
        captions.push({ startMs: ev.at, endMs: ev.at + dur, text: ev.op.text })
        maxEndMs = Math.max(maxEndMs, ev.at + dur)
        break
      }
      case "zoom": {
        if (ev.targetBBox) {
          zooms.push({ startMs: ev.at, endMs: ev.at + 2000, bbox: ev.targetBBox, factor: ev.op.factor ?? 1.5 })
          maxEndMs = Math.max(maxEndMs, ev.at + 2000)
        }
        break
      }
      case "wait": {
        maxEndMs = Math.max(maxEndMs, ev.at + ev.op.ms)
        break
      }
      default: {
        maxEndMs = Math.max(maxEndMs, ev.at)
      }
    }
  }

  const totalMs = maxEndMs + TAIL_BUFFER_MS
  return {
    fps,
    width,
    height,
    durationFrames: Math.ceil((totalMs / 1000) * fps),
    cursorKeyframes,
    ripples,
    callouts,
    captions,
    zooms,
  }
}
