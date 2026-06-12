export function ClickRipple({
  frame,
  fps,
  startFrame,
  durationFrames,
  x,
  y,
}: {
  frame: number
  fps: number
  startFrame: number
  durationFrames: number
  x: number
  y: number
}) {
  const rel = frame - startFrame
  if (rel < 0 || rel > durationFrames) return null
  const t = rel / durationFrames
  const size = 10 + 80 * t
  const opacity = 1 - t
  return (
    <div
      data-beacon="ripple"
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        border: "3px solid rgba(255,255,255,0.9)",
        opacity,
        pointerEvents: "none",
      }}
    />
  )
}
