export interface CursorKeyframe {
  at: number
  x: number
  y: number
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function interpolate(frame: number, fps: number, keys: CursorKeyframe[]) {
  if (keys.length === 0) return { x: 0, y: 0 }
  const t = (frame / fps) * 1000
  if (t <= keys[0]!.at) return { x: keys[0]!.x, y: keys[0]!.y }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!
    const b = keys[i + 1]!
    if (t >= a.at && t <= b.at) {
      const u = (t - a.at) / (b.at - a.at)
      const e = easeInOutCubic(u)
      return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }
    }
  }
  const last = keys[keys.length - 1]!
  return { x: last.x, y: last.y }
}

export function Cursor({
  frame,
  fps,
  keyframes,
}: {
  frame: number
  fps: number
  keyframes: CursorKeyframe[]
}) {
  const { x, y } = interpolate(frame, fps, keyframes)
  return (
    <div
      data-beacon="cursor"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 24,
        height: 24,
        pointerEvents: "none",
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M2 2 L2 18 L7 14 L10 21 L13 20 L10 13 L17 13 Z" fill="#000" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
