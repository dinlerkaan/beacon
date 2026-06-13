import { describe, it, expect, beforeAll } from "vitest"
import { mkdtempSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { loadScript } from "../src/load-script"
import { renderCommand } from "../src/commands/render"
import { startFixtureServer } from "../../driver-playwright/tests/fixture-server"

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

describe("renderCommand (end-to-end)", () => {
  it("produces a non-empty MP4 from a script targeting the fixture page", async () => {
    const server = await startFixtureServer()
    try {
      // Script must reside inside packages/cli/ so that Node/tsx can resolve
      // @beacon/core from packages/cli/node_modules (same pattern as T15 loadScript tests).
      const cliRoot = join(fileURLToPath(import.meta.url), "..", "..")
      const e2eDir = join(cliRoot, ".beacon-cache", "e2e-tests")
      const { mkdirSync } = await import("node:fs")
      mkdirSync(e2eDir, { recursive: true })
      const dir = mkdtempSync(join(e2eDir, "beacon-e2e-"))
      const scriptPath = join(dir, "demo.ts")
      writeFileSync(
        scriptPath,
        `import { showcase } from "@beacon/core"
         export default showcase("E2E", { target: "${server.url}" }, async (s) => {
           await s.click("#name")
           await s.type("Test")
           await s.click("#submit")
           await s.callout("Done!", { target: "#result", duration: 500 })
         })`,
      )
      const outFile = join(dir, "out.mp4")
      await renderCommand({ script: scriptPath, out: outFile })
      expect(existsSync(outFile)).toBe(true)
      expect(statSync(outFile).size).toBeGreaterThan(10_000)
    } finally {
      await server.close()
    }
  }, 180_000)
})
