import { defineConfig } from "tsup"

// Bundles the CLI + all internal `@beacon/*` packages into a single ESM file.
// External deps stay external (installed at user-install time via package.json).
//
// The render package's source TSX files are NOT bundled — they're copied
// verbatim into the publish dir so Remotion's webpack bundler can read them
// at runtime when `beacon render` is invoked.
export default defineConfig({
  entry: {
    "cli/index": "packages/cli/src/index.ts",
    "lib/index": "packages/cli/src/lib.ts",
  },
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist-publish/dist",
  outExtension: () => ({ js: ".js" }),
  clean: true,
  splitting: false,
  shims: false,
  sourcemap: false,
  dts: { entry: { "lib/index": "packages/cli/src/lib.ts" } },
  // Inline workspace packages so we ship one bundle.
  noExternal: [
    "@beacon/core",
    "@beacon/capture",
    "@beacon/driver-playwright",
    "@beacon/render",
  ],
  // Keep these external — they are real npm packages users install.
  external: [
    "playwright",
    "remotion",
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "react",
    "react-dom",
    "@clack/prompts",
    "commander",
    "tsx",
  ],
})
