#!/usr/bin/env node
import { register } from "tsx/esm/api"
import { fileURLToPath } from "node:url"

register()
await import(fileURLToPath(new URL("../src/index.ts", import.meta.url)))
