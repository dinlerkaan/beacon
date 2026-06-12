import type { ReactNode } from "react"

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export function ZoomLayer({
  viewportW,
  viewportH,
  bbox,
  factor = 1.5,
  children,
}: {
  viewportW: number
  viewportH: number
  bbox?: BBox
  factor?: number
  children: ReactNode
}) {
  if (!bbox) return <div style={{ width: viewportW, height: viewportH }}>{children}</div>
  const cx = bbox.x + bbox.w / 2
  const cy = bbox.y + bbox.h / 2
  const tx = viewportW / 2 - cx * factor
  const ty = viewportH / 2 - cy * factor
  return (
    <div
      style={{
        width: viewportW,
        height: viewportH,
        transform: `translate(${tx}px, ${ty}px) scale(${factor})`,
        transformOrigin: "0 0",
      }}
    >
      {children}
    </div>
  )
}
