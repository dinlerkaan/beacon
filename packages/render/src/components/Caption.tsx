export function Caption({ text }: { text: string }) {
  return (
    <div
      data-beacon="caption"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 60,
        textAlign: "center",
        color: "#fff",
        fontSize: 28,
        fontWeight: 700,
        fontFamily: "system-ui, sans-serif",
        textShadow: "0 2px 8px rgba(0,0,0,0.7)",
        padding: "0 80px",
      }}
    >
      {text}
    </div>
  )
}
