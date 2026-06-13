import type { ReactNode } from "react"

export function Background({
  width,
  height,
  children,
}: {
  width: number
  height: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(135deg, #1f2937, #4b5563)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      <div
        data-beacon="chrome"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          background: "#fff",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  )
}
