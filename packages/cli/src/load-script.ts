import { pathToFileURL } from "node:url"
import { register } from "tsx/esm/api"
import type { ShowcaseDef } from "@beacon/core"

let registered = false
function ensureTsxRegistered() {
  if (registered) return
  register()
  registered = true
}

export async function loadScript(absPath: string): Promise<ShowcaseDef> {
  ensureTsxRegistered()
  const mod = await import(pathToFileURL(absPath).href)
  // When a user's project lacks `"type": "module"`, tsx loads the .ts file
  // as CJS. `export default X` becomes `module.exports = { default: X }`,
  // which ESM then surfaces as `mod.default = { default: X }`. Unwrap one
  // level if it looks doubly-wrapped.
  let def: unknown = mod.default
  if (
    def != null &&
    typeof def === "object" &&
    typeof (def as { body?: unknown }).body !== "function" &&
    typeof (def as { default?: { body?: unknown } }).default === "object" &&
    typeof (def as { default?: { body?: unknown } }).default?.body === "function"
  ) {
    def = (def as { default: unknown }).default
  }
  if (
    def == null ||
    typeof def !== "object" ||
    typeof (def as { body?: unknown }).body !== "function"
  ) {
    throw new Error(`script ${absPath} has no default export of a ShowcaseDef`)
  }
  return def as ShowcaseDef
}
