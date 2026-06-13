import { describe, it, expect } from "vitest"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

describe("CLI smoke (subprocess)", () => {
  it("beacon render produces a non-empty MP4 from the hello example", () => {
    const out = join(mkdtempSync(join(tmpdir(), "beacon-smoke-")), "hello.mp4")
    const exampleScript = resolve(__dirname, "../../../examples/hello/hello.beacon.ts")
    const cliEntry = resolve(__dirname, "../src/index.ts")
    const result = spawnSync("pnpm", ["exec", "tsx", cliEntry, "render", exampleScript, "-o", out], {
      stdio: "inherit",
      timeout: 240_000,
    })
    expect(result.status).toBe(0)
    expect(existsSync(out)).toBe(true)
    expect(statSync(out).size).toBeGreaterThan(10_000)
  }, 300_000)
})
