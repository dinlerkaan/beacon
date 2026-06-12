import {
  CAPTURE_SCHEMA_VERSION,
  type CaptureBufferSnapshot,
  type CaptureEvent,
  type CaptureFrame,
  type CaptureMeta,
} from "./schema.js"

export class CaptureBuffer {
  private readonly events: CaptureEvent[] = []
  private readonly frames: CaptureFrame[] = []
  private lastEventAt = -1

  constructor(private readonly meta: CaptureMeta) {}

  appendEvent(ev: CaptureEvent): void {
    if (ev.at < this.lastEventAt) {
      throw new Error(
        `events must be monotonic: got at=${ev.at} after lastAt=${this.lastEventAt}`,
      )
    }
    this.lastEventAt = ev.at
    this.events.push(ev)
  }

  appendFrame(frame: CaptureFrame): void {
    this.frames.push(frame)
  }

  serialize(): CaptureBufferSnapshot {
    return {
      schemaVersion: CAPTURE_SCHEMA_VERSION,
      meta: this.meta,
      events: [...this.events],
      frames: [...this.frames],
    }
  }
}
