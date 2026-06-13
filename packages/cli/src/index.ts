#!/usr/bin/env node
import { Command } from "commander"
import { renderCommand } from "./commands/render.js"

const program = new Command()
program.name("beacon").description("Beacon — showcase-animation tool").version("0.0.0")

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

await program.parseAsync()
