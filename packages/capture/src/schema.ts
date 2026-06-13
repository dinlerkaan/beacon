import type { Operation } from "@beacon/core"

export const CAPTURE_SCHEMA_VERSION = 1 as const

export interface BBox { x: number; y: number; w: number; h: number }

export interface CaptureEvent {
  at: number             // ms from showcase start
  op: Operation
  cursor?: { x: number; y: number }
  targetBBox?: BBox
}

export interface CaptureFrame {
  at: number             // ms from showcase start
  path: string           // relative path to PNG on disk
}

export interface CaptureMeta {
  width: number
  height: number
  fps: number
}

export interface CaptureBufferSnapshot {
  schemaVersion: typeof CAPTURE_SCHEMA_VERSION
  meta: CaptureMeta
  events: CaptureEvent[]
  frames: CaptureFrame[]
}
