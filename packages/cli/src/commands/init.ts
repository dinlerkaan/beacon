import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const SAMPLE = `import { showcase } from "@boomarche/beacon"

export default showcase(
  "My first showcase",
  { target: "https://example.com" },
  async (s) => {
    await s.callout("Welcome", { duration: 1500 })
    await s.wait(500)
    await s.caption("Built with Beacon")
  },
)
`

const PKG = (name: string, beaconVersion: string) => `{
  "name": ${JSON.stringify(name)},
  "private": true,
  "type": "module",
  "scripts": {
    "render": "beacon render showcase.ts -o showcase.mp4"
  },
  "dependencies": {
    "@boomarche/beacon": "^${beaconVersion}"
  }
}
`

export interface InitArgs {
  dir: string
  name?: string
}

// Bumped by build-publish.mjs at release time; kept in sync with the package's
// own version so scaffolded projects pin against a known-good runtime.
export const BEACON_VERSION = "0.1.1"

export async function initCommand(args: InitArgs): Promise<void> {
  const dir = resolve(args.dir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, "package.json"),
    PKG(args.name ?? "my-showcase", BEACON_VERSION),
  )
  writeFileSync(join(dir, "showcase.ts"), SAMPLE)
  // eslint-disable-next-line no-console
  console.log(`Next: cd ${args.dir} && npm install && beacon render showcase.ts -o showcase.mp4`)
}
