# Beacon

Scripted feature-showcase animations. Drive a web app with Playwright, render polished MP4s with Remotion. Re-renders cleanly when your UI changes — your scripts are source code, not screen recordings.

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  showcase.ts     │───▶│  Playwright      │───▶│  Remotion        │
│  (your script)   │    │  drives the app  │    │  composites the  │
│                  │    │  + captures      │    │  polished MP4    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## Install

```sh
npm install -g @boomarche/beacon
beacon --help
```

First run also fetches Chromium (~150 MB, one time).

## Quick start

### Record a session, then render it

```sh
beacon record https://your-app.example.com --callouts -o demo.ts
beacon render demo.ts -o demo.mp4
```

`beacon record` opens a real Chromium window with Playwright's Inspector attached. Click through the demo you want, close the browser, and Beacon writes a `demo.ts` file with auto-disambiguated selectors and (optionally) callouts you chose interactively.

### Write a script by hand

```ts
// demo.ts
import { showcase } from "@boomarche/beacon"

export default showcase(
  "My feature demo",
  { target: "https://your-app.example.com", viewport: { w: 1440, h: 900 } },
  async (s) => {
    await s.callout("Start by clicking 'New'", { duration: 1500 })
    await s.click('[data-testid="new-project"]')
    await s.type("Q3 Roadmap")
    await s.click("button:has-text('Create')")
    await s.callout("Done!", { duration: 2500 })
    await s.caption("Built with Beacon")
  },
)
```

Then:

```sh
beacon render demo.ts -o demo.mp4
```

## DSL reference

The `showcase()` factory takes a title, options (`target` URL + `viewport`), and an `async (s) => { ... }` body. Inside the body:

| Verb | Effect |
| --- | --- |
| `await s.navigate(url)` | Cross-fade to a new URL |
| `await s.click(selector)` | Cursor eases to target, click ripple, auto-zoom |
| `await s.type(text, { perCharMs? })` | Realistic per-character typing |
| `await s.hover(selector)` | Cursor eases to target with hover-state |
| `await s.wait(ms)` | Hold for `ms` milliseconds |
| `await s.callout(text, { target?, side?, duration? })` | Pill tooltip with dim BG, optionally anchored to a selector |
| `await s.zoom({ selector?, factor? })` | Zoom into a region (or viewport-centre if no selector) |
| `await s.caption(text, { duration? })` | Lower-third caption bar |

Selectors accept any Playwright locator string: plain CSS (`#submit`), role selectors (`role=button[name="Save"]`), text matchers (`text=Click here`), and chained filters (`role=link[name="X"] >> nth=0`).

## CLI

```
beacon record <url>      Record a browser session → emit a showcase script
  -o, --out <file>          output .ts script path (default: showcase.ts)
  --title <title>           showcase title (defaults to hostname)
  --no-auto-wait            skip auto-detected pauses between actions
  --callouts                pick actions to annotate via TUI

beacon render <script>   Render a showcase script to MP4
  -o, --out <file>          output MP4 path (default: showcase.mp4)
  --fps <n>                 frames per second (default: 30)
  --width <n>               viewport width
  --height <n>              viewport height

beacon preview <script>  Open Remotion Studio for live preview

beacon init <dir>        Scaffold a new showcase project
  --name <name>             package name
```

## Architecture

Three independently testable layers communicating through a versioned `CaptureBufferSnapshot`:

1. **`@beacon/core`** — script API and types
2. **`@beacon/driver-playwright`** — Playwright backend, executes operations, captures frames + semantic events
3. **`@beacon/render`** — Remotion compositions (synthetic cursor, click ripple, callouts, zoom)

This boundary is what lets the renderer stay decoupled from the capture mechanism — a future Tauri-app driver (`@beacon/driver-tauri`) or a marker-assisted recorder will share the same renderer.

## Roadmap

- **v1 (current)**: web targets via Playwright, MP4 output, recorder, opinionated renderer.
- **v1.1**: Tauri-app driver (WebDriver-protocol-based, shares most code with the Playwright driver).
- **v2**: integration with capture SDKs so Beacon can render videos from in-app event streams emitted by your own apps.

## Status

v1. Used in production for Boomarche showcases; cross-platform CI on macOS / Windows / Linux. Issues and PRs welcome at [github.com/boomarche/beacon](https://github.com/boomarche/beacon).

## License

MIT © Kaan Dinler
