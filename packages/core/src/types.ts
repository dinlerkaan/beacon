export type Target =
  | { kind: "web"; url: string }

export interface ViewportSpec {
  w: number
  h: number
}

export interface ShowcaseOptions {
  target: Target | string  // string is shorthand for { kind: "web", url }
  viewport?: ViewportSpec
}

export type CalloutSide = "top" | "right" | "bottom" | "left"

export type Operation =
  | { kind: "navigate"; url: string }
  | { kind: "click"; selector: string }
  | { kind: "type"; text: string; perCharMs?: number }
  | { kind: "hover"; selector: string }
  | { kind: "wait"; ms: number }
  | { kind: "callout"; text: string; side?: CalloutSide; target?: string; duration?: number }
  | { kind: "zoom"; selector?: string; factor?: number }
  | { kind: "caption"; text: string; duration?: number }

export interface ShowcaseDef {
  title: string
  options: ShowcaseOptions
  body: (s: ShowcaseRunner) => Promise<void>
}

export interface ShowcaseRunner {
  navigate(url: string): Promise<void>
  click(selector: string): Promise<void>
  type(text: string, opts?: { perCharMs?: number }): Promise<void>
  hover(selector: string): Promise<void>
  wait(ms: number): Promise<void>
  callout(
    text: string,
    opts?: { side?: CalloutSide; target?: string; duration?: number },
  ): Promise<void>
  zoom(opts?: { selector?: string; factor?: number }): Promise<void>
  caption(text: string, opts?: { duration?: number }): Promise<void>
}
