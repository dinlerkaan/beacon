#!/usr/bin/env node
import { Command } from "commander"
import { renderCommand } from "./commands/render.js"
import { initCommand } from "./commands/init.js"
import { previewCommand } from "./commands/preview.js"
import { recordCommand } from "./commands/record.js"

const program = new Command()
program.name("beacon").description("Beacon — showcase-animation tool").version("0.1.1")

program
  .command("render")
  .description("Render a showcase script to MP4")
  .argument("<script>", "path to .ts showcase file")
  .option("-o, --out <file>", "output MP4 path", "showcase.mp4")
  .option("--fps <n>", "frames per second", "30")
  .option("--width <n>", "viewport width")
  .option("--height <n>", "viewport height")
  .action(async (script: string, opts: { out: string; fps: string; width?: string; height?: string }) => {
    await renderCommand({
      script,
      out: opts.out,
      fps: parseInt(opts.fps, 10),
      width: opts.width ? parseInt(opts.width, 10) : undefined,
      height: opts.height ? parseInt(opts.height, 10) : undefined,
    })
    console.log(`rendered ${opts.out}`)
  })

program
  .command("init")
  .description("Scaffold a new showcase project")
  .argument("<dir>")
  .option("--name <name>", "package name")
  .action(async (dir: string, opts: { name?: string }) => {
    await initCommand({ dir, name: opts.name })
    console.log(`✔ initialised ${dir}`)
  })

program
  .command("preview")
  .description("Open the Remotion Studio for live preview")
  .argument("<script>")
  .action(async (script: string) => {
    await previewCommand({ script })
  })

program
  .command("record")
  .description("Record a browser session and emit a Beacon showcase script")
  .argument("<url>", "URL to open in the recording browser")
  .option("-o, --out <file>", "output .ts script path", "showcase.ts")
  .option("--title <title>", "showcase title (defaults to hostname)")
  .option("--no-auto-wait", "skip inserting auto-detected pauses between actions")
  .option("--callouts", "after recording, pick actions to annotate with callouts (TUI)")
  .action(
    async (
      url: string,
      opts: { out: string; title?: string; autoWait: boolean; callouts?: boolean },
    ) => {
      await recordCommand({
        url,
        out: opts.out,
        title: opts.title,
        autoWait: opts.autoWait,
        callouts: opts.callouts,
      })
    },
  )

await program.parseAsync()
