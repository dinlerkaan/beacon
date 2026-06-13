import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * Resolve the absolute path to `remotion-entry.tsx`, which Remotion's webpack
 * bundler reads at runtime to discover compositions.
 *
 * The same code needs to work in two layouts:
 *   - Workspace dev: `packages/cli/src/commands/render.ts` →
 *       `packages/render/src/remotion-entry.tsx`
 *   - Published bundle: `dist-publish/dist/cli/index.js` →
 *       `dist-publish/src/render/remotion-entry.tsx`
 *
 * We try both relative paths and return the first that exists.
 */
export function resolveRemotionEntry(): string {
  const candidates = [
    // Published bundle layout: dist-publish/dist/cli/index.js → dist-publish/src/render/remotion-entry.tsx
    new URL("../../src/render/remotion-entry.tsx", import.meta.url),
    // Workspace dev layout: packages/cli/src/resolve-render-entry.ts → packages/render/src/remotion-entry.tsx
    new URL("../../render/src/remotion-entry.tsx", import.meta.url),
  ]
  for (const url of candidates) {
    const p = fileURLToPath(url)
    if (existsSync(p)) return p
  }
  throw new Error(
    `Could not locate remotion-entry.tsx. Looked in: ${candidates
      .map((u) => fileURLToPath(u))
      .join(", ")}`,
  )
}
