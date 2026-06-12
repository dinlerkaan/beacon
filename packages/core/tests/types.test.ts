import { describe, it, expectTypeOf } from "vitest"
import type { Operation } from "../src/types"

describe("Operation discriminated union", () => {
  it("includes all 8 v1 verbs", () => {
    type Kinds = Operation["kind"]
    expectTypeOf<Kinds>().toEqualTypeOf<
      | "navigate"
      | "click"
      | "type"
      | "hover"
      | "wait"
      | "callout"
      | "zoom"
      | "caption"
    >()
  })
})
