// Library entry point for `import { showcase } from "@dinlerkaan/beacon"`.
// The bin (dist/cli/index.js) and the library (dist/lib/index.js) are bundled
// separately so importing from `@dinlerkaan/beacon` in a showcase script
// doesn't pull in commander, tsx, Remotion etc.
export { showcase, recordOperations } from "@beacon/core"
export type {
  Operation,
  Target,
  ViewportSpec,
  ShowcaseOptions,
  ShowcaseDef,
  ShowcaseRunner,
  CalloutSide,
} from "@beacon/core"
