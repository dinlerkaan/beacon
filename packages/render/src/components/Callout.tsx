import type { CSSProperties } from "react"
import type { BBox } from "./ZoomLayer.js"

const OFFSET = 16

export function Callout({
  text,
  bbox,
  side = "bottom",
  viewportW,
  viewportH,
}: {
  text: string
  bbox?: BBox
  side?: "top" | "right" | "bottom" | "left"
  viewportW: number
  viewportH: number
}) {
  let pillStyle: CSSProperties = { left: viewportW / 2, top: viewportH / 2, transform: "translate(-50%, -50%)" }
  if (bbox) {
    if (side === "bottom") pillStyle = { left: bbox.x + bbox.w / 2, top: bbox.y + bbox.h + OFFSET, transform: "translateX(-50%)" }
    if (side === "top") pillStyle = { left: bbox.x + bbox.w / 2, top: bbox.y - OFFSET, transform: "translate(-50%, -100%)" }
    if (side === "right") pillStyle = { left: bbox.x + bbox.w + OFFSET, top: bbox.y + bbox.h / 2, transform: "translateY(-50%)" }
    if (side === "left") pillStyle = { left: bbox.x - OFFSET, top: bbox.y + bbox.h / 2, transform: "translate(-100%, -50%)" }
  }
  return (
    <>
      <div
        data-beacon="callout-dim"
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", pointerEvents: "none" }}
      />
      <div
        data-beacon="callout-pill"
        style={{
          position: "absolute",
          ...pillStyle,
          padding: "10px 16px",
          borderRadius: 999,
          background: "#111827",
          color: "#fff",
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "system-ui, sans-serif",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </>
  )
}
