#!/usr/bin/env node
// Build the publishable npm package layout under dist-publish/.
// Layout:
//   dist-publish/
//     package.json
//     README.md
//     LICENSE
//     dist/cli/index.js       (bundled CLI; produced by tsup)
//     src/render/             (TSX source for Remotion's runtime bundler)

import { execFileSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")
const out = join(repoRoot, "dist-publish")

console.log("→ Running tsup")
execFileSync("pnpm", ["exec", "tsup"], { cwd: repoRoot, stdio: "inherit" })

console.log("→ Copying render source")
const renderSrcOut = join(out, "src/render")
rmSync(renderSrcOut, { recursive: true, force: true })
mkdirSync(renderSrcOut, { recursive: true })
cpSync(join(repoRoot, "packages/render/src"), renderSrcOut, {
  recursive: true,
  // Skip stray emitted .js files; Remotion bundles .tsx source directly.
  filter: (src) => !src.endsWith(".js") || src.endsWith(".test.js"),
})

console.log("→ Writing publish package.json")
const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))
const cliPkg = JSON.parse(
  readFileSync(join(repoRoot, "packages/cli/package.json"), "utf8"),
)
const renderPkg = JSON.parse(
  readFileSync(join(repoRoot, "packages/render/package.json"), "utf8"),
)
const driverPkg = JSON.parse(
  readFileSync(join(repoRoot, "packages/driver-playwright/package.json"), "utf8"),
)

const publishPkg = {
  name: "@boomarche/beacon",
  version: process.env.PUBLISH_VERSION ?? rootPkg.version ?? "0.1.0",
  description:
    "Scripted feature-showcase animations: drive a web app with Playwright, render polished MP4s with Remotion.",
  keywords: [
    "showcase",
    "animation",
    "screen-recording",
    "playwright",
    "remotion",
    "mp4",
    "demo",
    "feature-demo",
  ],
  author: "Kaan Dinler",
  license: "MIT",
  homepage: "https://github.com/boomarche/beacon#readme",
  repository: {
    type: "git",
    url: "git+https://github.com/boomarche/beacon.git",
  },
  bugs: { url: "https://github.com/boomarche/beacon/issues" },
  type: "module",
  // npm 11 strips leading "./" from bin entries — write the canonical form.
  bin: { beacon: "dist/cli/index.js" },
  exports: {
    ".": {
      types: "./dist/lib/index.d.ts",
      default: "./dist/lib/index.js",
    },
  },
  main: "./dist/lib/index.js",
  types: "./dist/lib/index.d.ts",
  files: ["dist/", "src/", "README.md", "LICENSE"],
  engines: { node: ">=22" },
  dependencies: pickDeps(cliPkg.dependencies, [
    "@clack/prompts",
    "@remotion/bundler",
    "@remotion/cli",
    "@remotion/renderer",
    "commander",
    "playwright",
    "tsx",
  ]),
  peerDependencies: pickDeps(renderPkg.dependencies, ["react", "react-dom", "remotion"]),
}

mkdirSync(out, { recursive: true })
writeFileSync(
  join(out, "package.json"),
  JSON.stringify(publishPkg, null, 2) + "\n",
)

console.log("→ Copying README and LICENSE")
for (const f of ["README.md", "LICENSE"]) {
  const src = join(repoRoot, f)
  if (existsSync(src)) cpSync(src, join(out, f))
  else console.warn(`  (missing ${f} at repo root — please add before publish)`)
}

console.log(`✔ Build complete at ${out}`)

function pickDeps(source, names) {
  const out = {}
  for (const n of names) {
    const v = source?.[n]
    if (v) out[n] = v
  }
  if (!out["react"] && renderPkg.dependencies?.["react"])
    out["react"] = renderPkg.dependencies["react"]
  if (!out["react-dom"] && renderPkg.dependencies?.["react-dom"])
    out["react-dom"] = renderPkg.dependencies["react-dom"]
  if (driverPkg.dependencies?.["playwright"])
    out["playwright"] = driverPkg.dependencies["playwright"]
  return out
}
