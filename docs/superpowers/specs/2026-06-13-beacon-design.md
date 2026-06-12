# Beacon — Design Spec

**Date:** 2026-06-13
**Status:** Approved design, pre-implementation
**Owner:** Kaan Dinler (personal-first, possible Boomarche commercial spin-off later)

## Purpose

Beacon produces polished feature-showcase animations — the kind SaaS landing pages
use to demo product flows — from a small TypeScript script rather than a screen
recording. UI changes regenerate the showcase by re-running the script; no
re-recording is required.

The primary motivating use cases:

- Showcase Boomarche products (Lodestar, Cairn, Ballast, Galley, DevNotes, Coffer)
  on their landing pages and social posts.
- Showcase Oxbo's EngineeringHub for internal demos. (Recordings stay Oxbo IP;
  the tool itself is personal IP.)
- Potential v2+ spin-off as a commercial Boomarche product, differentiated from
  Screen Studio / Cap / Tella by reproducibility on UI change.

## Must-have criteria (v1)

1. **Reproducible on UI change** — re-run the script, get an updated video.
2. **Works for any (web/Tauri) app** — first-class for both surfaces.
3. **Low manual editing** — opinionated rendering, no timeline UI.
4. *Nice-to-have:* local-only (achievable for v1; not a hard blocker).

Mobile, arbitrary native apps, hosted SaaS, GUI editor — all deferred.

## Architecture

Three cleanly-isolated layers communicating through narrow interfaces.

```
┌─────────────────────┐
│  Showcase script    │  TS file declaring the demo
└──────────┬──────────┘
           │ semantic operations
           ▼
┌─────────────────────┐
│   Driver layer      │  Selects backend by target type
│  ┌────────────────┐ │
│  │   Playwright   │ │ → web apps
│  ├────────────────┤ │
│  │  tauri-driver  │ │ → Tauri apps (WebDriver — shares ~95% with Playwright path)
│  └────────────────┘ │
└──────────┬──────────┘
           │ frame stream + timestamped semantic events
           ▼
┌─────────────────────┐
│   Capture buffer    │  Narrow handoff format (frames + event timeline)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Renderer (Remotion)│  React compositions → MP4
└─────────────────────┘
```

Driver knows nothing about Remotion; renderer knows nothing about Playwright.
The capture buffer is the only contract between them — versioned, JSON-serialisable,
and inspectable.

### Why this shape

- **WebDriver is the shared abstraction.** Playwright (web) and tauri-driver
  (Tauri) both implement the WebDriver protocol, so the two backends mostly
  differ in launch/teardown. Most code is shared.
- **Remotion is a React-based renderer.** Cursor easing, callout pills, zoom
  transforms, and padded backgrounds all become React components — far more
  productive than hand-rolling FFmpeg filter graphs.
- **Decoupling capture from render** lets v2 add a marker-assisted recorder
  (alternate capture source, same renderer) without touching either end.

## Components

Each is a separate package in a pnpm workspace; each has one job; each is
independently testable.

| Package                  | Responsibility                                              | Depends on                |
| ------------------------ | ----------------------------------------------------------- | ------------------------- |
| `@beacon/core`           | Script API surface + shared types                           | —                         |
| `@beacon/driver-playwright` | Web backend: launch browser, run script, capture stream  | `core`, `playwright`      |
| `@beacon/driver-tauri`   | Tauri backend (v1.1)                                        | `core`, `tauri-driver`    |
| `@beacon/capture`        | Frame + event buffer format and (de)serialisation           | `core`                    |
| `@beacon/render`         | Remotion compositions (cursor, callout, background, zoom)   | `core`, `remotion`        |
| `@beacon/cli`            | `init` / `preview` / `render` commands                      | all of the above          |

## Showcase script API

About 8 verbs total. Each emits exactly one semantic event with strong defaults.

```ts
import { showcase } from "@beacon/core"

export default showcase("Create your first project", {
  target: "https://app.boomarche.com",
  viewport: { w: 1440, h: 900 },
}, async (s) => {
  await s.callout("Start by clicking 'New'", { side: "bottom" })
  await s.click('[data-testid="new-project"]')
  await s.type("Q3 Roadmap")
  await s.click("button:has-text('Create')")
  await s.callout("Your project is ready", { duration: 2500 })
})
```

| Verb        | Behaviour                                                                  |
| ----------- | -------------------------------------------------------------------------- |
| `navigate`  | Cross-fade to a new URL/route                                              |
| `click`     | Cursor eases to target → zoom-in ~1.5× → click ripple → zoom-out           |
| `type`      | Hold camera on field; character-by-character with jittered ~60ms rhythm    |
| `hover`     | Cursor eases to target; subtle hover-state highlight                       |
| `wait`      | Hold current frame for N ms                                                |
| `callout`   | Dim BG ~30%; pill tooltip slides in with arrow to target; holds; fades     |
| `zoom`      | Manual zoom to a bounding region                                           |
| `caption`   | Lower-third captions over the current frame                                |

Defaults must be ship-quality. All knobs are optional.

## Renderer behaviour (the polish)

- Padded gradient background, rounded window chrome, soft shadow.
- Cursor: smooth cubic-bezier easing (~300ms) toward each interaction; not a
  raw recording of pointer position.
- Click: ripple + auto-zoom to bounding region of the clicked element, then
  release back to full viewport.
- Callouts: animated dim layer + pill-shaped tooltip with directional arrow.
- Transitions: cross-fades between major sections; no abrupt cuts.

Goal: a user running `beacon render demo.ts` once produces a video they would
ship to a landing page without further editing.

## CLI surface

```
beacon init <dir>                 # scaffold a new showcase project
beacon preview <script.ts>        # hot-reloading Remotion Studio for iteration
beacon render <script.ts> [opts]  # one-shot MP4 render
  --out <file.mp4>
  --res 1080p | 4k
  --fps 30 | 60
  --bg <preset>
```

## Data flow

1. CLI loads the script (TS, transpiled on demand).
2. CLI hands the script to the matching driver backend (based on `target`).
3. Driver launches the browser/Tauri app, executes the script, and streams
   `{ frame, events[] }` records into the capture buffer.
4. Buffer is finalised as a single JSON sidecar + frame sequence.
5. Renderer reads the buffer, composes Remotion timelines per event, renders MP4.
6. CLI writes the MP4 (and optionally a `.beacon.json` sidecar) to the output path.

The buffer format is the contract between capture and render. It is versioned
(`schemaVersion`) so v2 can extend without breaking v1 renders.

## Error handling

Only at boundaries — internal layers trust each other.

- **Script load** errors: surface TypeScript / import errors verbatim.
- **Selector misses** in the driver: fail fast with the selector, the
  surrounding event, and a screenshot of the page at failure.
- **Render** errors: bubble Remotion's error overlay through the CLI; do not
  swallow.

No silent fallbacks. A failed showcase is louder than a wrong showcase.

## Testing

- **Unit:** `core` types and API shape; capture buffer (de)serialisation.
- **Integration:** Playwright backend driving a fixture web app (a tiny HTML
  page in the repo); assert event stream matches expected sequence.
- **Visual regression:** Render fixture scripts and snapshot a few frames per
  composition; CI fails on pixel diff above threshold.
- **Smoke:** `beacon render examples/hello.ts` runs end-to-end in CI on Mac
  and Windows runners.

## Project structure

```
~/beacon/
├── packages/
│   ├── core/
│   ├── driver-playwright/
│   ├── driver-tauri/             # v1.1
│   ├── capture/
│   ├── render/
│   └── cli/
├── examples/
├── docs/
│   └── superpowers/specs/
└── package.json                  # pnpm workspaces
```

## Roadmap

- **v1** — Playwright backend, Remotion renderer, 8-verb API, CLI, MP4 output,
  web targets only. Local-only. Win + Mac development supported.
- **v1.1** — `driver-tauri` backend. Reuses most of the Playwright backend
  (both speak WebDriver); mostly launch/teardown differences.
- **v2** — **DevNotes integration.** DevNotes' in-app event capture format
  aligns with Beacon's capture buffer; the two can share an SDK. Bug reports
  become animated diagnostics; feature showcases can be authored against the
  same instrumentation. Possibly add a marker-assisted recorder as a second
  capture source for arbitrary apps.
- **v3+ / commercial spin-off** — only if v1 proves itself in personal use.
  Fork from a clean commit predating any Oxbo-derived content or templates.

## Open / deferred items

- Aspect-ratio presets beyond 16:9 (9:16 social, 1:1 square) — implementation
  detail, defer to v1.x.
- Domain registration (`beacon.boomarche.com`) — only relevant at v3 spin-off.
- AI-assisted authoring (prompt → script) — appealing but deliberately out of
  v1/v2 scope.

## Non-goals (v1)

- No GUI editor / timeline / drag-and-drop.
- No mobile targets.
- No arbitrary native-app targets.
- No hosted rendering, no auth, no billing.
- No automatic voiceover, music, or speech synthesis.
