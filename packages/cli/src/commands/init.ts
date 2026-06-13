import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const SAMPLE = `import { showcase } from "@beacon/core"

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

const PKG = (name: string) => `{
  "name": ${JSON.stringify(name)},
  "private": true,
  "type": "module",
  "scripts": {
    "render": "beacon render showcase.ts -o showcase.mp4"
  }
}
`

export interface InitArgs {
  dir: string
  name?: string
}

export async function initCommand(args: InitArgs): Promise<void> {
  const dir = resolve(args.dir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "package.json"), PKG(args.name ?? "my-showcase"))
  writeFileSync(join(dir, "showcase.ts"), SAMPLE)
}
