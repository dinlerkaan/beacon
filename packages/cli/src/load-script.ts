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
  const def = mod.default
  if (!def || typeof def !== "object" || typeof (def as any).body !== "function") {
    throw new Error(`script ${absPath} has no default export of a ShowcaseDef`)
  }
  return def as ShowcaseDef
}
