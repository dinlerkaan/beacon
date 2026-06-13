import type {
  Operation,
  ShowcaseDef,
  ShowcaseOptions,
  ShowcaseRunner,
} from "./types.js"

export function showcase(
  title: string,
  options: ShowcaseOptions,
  body: (s: ShowcaseRunner) => Promise<void>,
): ShowcaseDef {
  return { title, options, body }
}

class RecordingRunner implements ShowcaseRunner {
  readonly ops: Operation[] = []

  async navigate(url: string) {
    this.ops.push({ kind: "navigate", url })
  }
  async click(selector: string) {
    this.ops.push({ kind: "click", selector })
  }
  async type(text: string, opts?: { perCharMs?: number }) {
    this.ops.push({ kind: "type", text, ...(opts?.perCharMs && { perCharMs: opts.perCharMs }) })
  }
  async hover(selector: string) {
    this.ops.push({ kind: "hover", selector })
  }
  async wait(ms: number) {
    this.ops.push({ kind: "wait", ms })
  }
  async callout(
    text: string,
    opts?: { side?: "top" | "right" | "bottom" | "left"; target?: string; duration?: number },
  ) {
    this.ops.push({ kind: "callout", text, ...opts })
  }
  async zoom(opts?: { selector?: string; factor?: number }) {
    this.ops.push({ kind: "zoom", ...opts })
  }
  async caption(text: string, opts?: { duration?: number }) {
    this.ops.push({ kind: "caption", text, ...opts })
  }
}

export async function recordOperations(def: ShowcaseDef): Promise<Operation[]> {
  const runner = new RecordingRunner()
  await def.body(runner)
  return runner.ops
}
