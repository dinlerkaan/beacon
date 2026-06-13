import type { ComponentType } from "react"
import { Composition } from "remotion"
import type { CaptureBufferSnapshot } from "@beacon/capture"
import { BeaconShowcase } from "./composition.js"
import { buildTimeline } from "./timeline.js"

const FALLBACK_SNAPSHOT: CaptureBufferSnapshot = {
  schemaVersion: 1,
  meta: { width: 1440, height: 900, fps: 30 },
  events: [],
  frames: [],
}

export const RemotionRoot = () => {
  return (
    <Composition
      id="BeaconShowcase"
      component={BeaconShowcase as unknown as ComponentType<Record<string, unknown>>}
      calculateMetadata={async ({ props }) => {
        const p = props as unknown as { snapshot: CaptureBufferSnapshot }
        const tl = buildTimeline(p.snapshot)
        return {
          durationInFrames: Math.max(tl.durationFrames, 1),
          fps: tl.fps,
          width: tl.width + 160,
          height: tl.height + 160,
        }
      }}
      durationInFrames={1}
      fps={30}
      width={1600}
      height={1060}
      defaultProps={{ snapshot: FALLBACK_SNAPSHOT, framesBaseUrl: "" }}
    />
  )
}
