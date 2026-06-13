import type { ComponentType } from "react"
import { Composition } from "remotion"
import { BeaconShowcase } from "./composition.js"
import { buildTimeline } from "./timeline.js"

// The CLI passes snapshot + framesBaseUrl via REMOTION_INPUT_PROPS;
// see @beacon/cli render command.

export const RemotionRoot = () => {
  const inputProps = (globalThis as unknown as { __REMOTION_INPUT_PROPS?: { snapshot: any; framesBaseUrl: string } }).__REMOTION_INPUT_PROPS
  const fallback = { snapshot: { schemaVersion: 1 as const, meta: { width: 1440, height: 900, fps: 30 }, events: [], frames: [] }, framesBaseUrl: "" }
  const props = inputProps ?? fallback
  const tl = buildTimeline(props.snapshot)
  return (
    <Composition
      id="BeaconShowcase"
      component={BeaconShowcase as unknown as ComponentType<Record<string, unknown>>}
      durationInFrames={Math.max(tl.durationFrames, 1)}
      fps={tl.fps}
      width={tl.width + 160}
      height={tl.height + 160}
      defaultProps={props}
    />
  )
}
