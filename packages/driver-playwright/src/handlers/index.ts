import type { Page } from "playwright"
import type { Operation } from "@beacon/core"
import type { CaptureBuffer } from "@beacon/capture"

export interface HandlerCtx {
  page: Page
  buf: CaptureBuffer
  now(): number
}

export type Handler<K extends Operation["kind"]> = (
  op: Extract<Operation, { kind: K }>,
  ctx: HandlerCtx,
) => Promise<void>

const registry = new Map<Operation["kind"], Handler<Operation["kind"]>>()

export function register<K extends Operation["kind"]>(kind: K, h: Handler<K>): void {
  registry.set(kind, h as unknown as Handler<Operation["kind"]>)
}

export function dispatch(op: Operation, ctx: HandlerCtx): Promise<void> {
  const h = registry.get(op.kind)
  if (!h) throw new Error(`no handler for op kind: ${op.kind}`)
  return h(op, ctx)
}
