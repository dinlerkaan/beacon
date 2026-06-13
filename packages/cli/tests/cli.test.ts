import { describe, it, expect, beforeAll } from "vitest"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { loadScript } from "../src/load-script"

const __dirname = join(fileURLToPath(import.meta.url), "..", "..", "..", "..")
const WORKSPACE_CACHE = join(__dirname, ".beacon-cache", "cli-tests")

let testDir: string

describe("loadScript", () => {
  beforeAll(() => {
    // Create a temp directory within the workspace to ensure node_modules are resolvable
    testDir = mkdtempSync(join(WORKSPACE_CACHE, "load-"))
  })

  it("loads a TS showcase file and returns its ShowcaseDef", async () => {
    const path = join(testDir, "demo.ts")
    writeFileSync(
      path,
      `export default {
        title: "Demo",
        target: "https://x",
        body: async (s: any) => {
          await s.wait(10)
        }
      }`,
    )
    const def = await loadScript(path)
    expect(def.title).toBe("Demo")
    expect(typeof def.body).toBe("function")
  })

  it("throws a clear error if the file has no default export", async () => {
    const path = join(testDir, "bad.ts")
    writeFileSync(path, `export const x = 1`)
    await expect(loadScript(path)).rejects.toThrow(/default export/i)
  })
})
