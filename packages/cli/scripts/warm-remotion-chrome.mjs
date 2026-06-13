#!/usr/bin/env node
// Pre-download Remotion's Chrome Headless Shell so CI tests don't race the
// CDN. Uses Remotion's public ensure-browser API and exits 0 on success.
// Designed to be retried at the shell level; subsequent runs are no-ops.
import { ensureBrowser } from "@remotion/renderer"

await ensureBrowser()
console.log("Remotion Chrome ready.")
