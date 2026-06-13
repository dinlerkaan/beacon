import { AbsoluteFill, useCurrentFrame, Img } from "remotion"
import type { CaptureBufferSnapshot } from "@beacon/capture"
import { Background } from "./components/Background.js"
import { Cursor } from "./components/Cursor.js"
import { ClickRipple } from "./components/ClickRipple.js"
import { ZoomLayer } from "./components/ZoomLayer.js"
import { Callout } from "./components/Callout.js"
import { Caption } from "./components/Caption.js"
import { buildTimeline } from "./timeline.js"
import type { CaptureFrame } from "@beacon/capture"

export interface BeaconShowcaseProps {
  snapshot: CaptureBufferSnapshot
  framesBaseUrl: string  // file:// URL or staticFile() result for the frames directory
}

function activeFrame(snap: CaptureBufferSnapshot, frameMs: number): CaptureFrame | undefined {
  let last: CaptureFrame | undefined = snap.frames[0]
  for (const f of snap.frames) {
    if (f.at <= frameMs) last = f
    else break
  }
  return last
}

export function BeaconShowcase({ snapshot, framesBaseUrl }: BeaconShowcaseProps) {
  const frame = useCurrentFrame()
  const tl = buildTimeline(snapshot)
  const frameMs = (frame / tl.fps) * 1000

  const liveFrame = activeFrame(snapshot, frameMs)
  const activeZoom = tl.zooms.find((z) => frameMs >= z.startMs && frameMs <= z.endMs)
  const activeCallout = tl.callouts.find((c) => frameMs >= c.startMs && frameMs <= c.endMs)
  const activeCaption = tl.captions.find((c) => frameMs >= c.startMs && frameMs <= c.endMs)

  return (
    <AbsoluteFill>
      <Background width={tl.width + 160} height={tl.height + 160}>
        <ZoomLayer
          viewportW={tl.width}
          viewportH={tl.height}
          bbox={activeZoom?.bbox}
          factor={activeZoom?.factor ?? 1}
        >
          {liveFrame && (
            <Img src={`${framesBaseUrl}/${liveFrame.path}`} style={{ width: tl.width, height: tl.height, display: "block" }} />
          )}
          <Cursor frame={frame} fps={tl.fps} keyframes={tl.cursorKeyframes} />
          {tl.ripples.map((r, i) => (
            <ClickRipple
              key={i}
              frame={frame}
              fps={tl.fps}
              startFrame={Math.round((r.startMs / 1000) * tl.fps)}
              durationFrames={Math.round((r.durationMs / 1000) * tl.fps)}
              x={r.x}
              y={r.y}
            />
          ))}
        </ZoomLayer>
        {activeCallout && (
          <Callout
            text={activeCallout.text}
            bbox={activeCallout.bbox}
            side={activeCallout.side}
            viewportW={tl.width}
            viewportH={tl.height}
          />
        )}
        {activeCaption && <Caption text={activeCaption.text} />}
      </Background>
    </AbsoluteFill>
  )
}
