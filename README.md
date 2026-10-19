# Genkidama — website

Official website for **Genkidama**, an Eden AI research concept on capability
composition: a model does not need to natively support every modality; through
Eden AI's MCP server it can reach specialist tools for what it lacks.

One page: the hero narrative, then **The Gap**, **The Bridge** and **The
Experiments**. The experiments compare a text-only model reaching images and
audio through Eden AI's MCP tools with a natively multimodal model, on
MMMU-Pro Vision (OCR / vision) and Spoken-SQuAD (speech). The public
comparison shows performance and cost only, side by side, with the tools each
route actually used underneath.

## Run

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # astro check + astro build → dist/
npm run preview
```

> **Locked-down Windows machines.** Astro 7's markdown engine (`satteri`) ships
> a native `.node` binary. If an Application Control policy blocks it, every
> `astro` command fails with "Cannot find native binding". Run
> `npm run fix:native` once after `npm install`; it adds the WebAssembly build
> of the same package (not saved to `package.json`, so clean installs on other
> machines are unaffected) and Astro falls back to it automatically.

## Stack

Astro 7 (static), TypeScript, Three.js (one lazily loaded island), GSAP +
ScrollTrigger, plain CSS with design tokens. No UI framework.

## Architecture

```
src/
  pages/index.astro              one page: Stage · Hero · Story (6 phases, the last is the Gathering) · 01 Gap · 02 Bridge · 03 Experiments
  layouts/BaseLayout.astro       fonts, tokens, nav, rail, footer, animation boot
  components/
    layout/                      Nav, Rail (section index), Footer (all driven by data/navigation.ts)
    visual/                      Stage (WebGL island), HeroWordmark, EnergyReadout, ScrollCue, Marker
    sections/                    Hero, Story (6 phases), Gap (capability families from the catalogue), Bridge (architecture + one call out and back), Experiments
    technical/                   CodeBlock, ToolCallTrace, ArchitectureDiagram
    experiments/                 ArmLegend, ExperimentPanel (performance + cost + ToolUsage, one per benchmark), ToolUsage, Takeaway, chart.ts
  scenes/genkidama/
    GenkidamaScene.ts            renderer, loop, camera, bloom, public API (GenkidamaHandle)
    state.ts                     progress → keyframed params, activations, smoothing (no Three.js)
    Core.ts · AmbientField.ts · ParticleField.ts · CapabilityNodes.ts
    MCPField.ts · EnergyStreams.ts · ToolCallPaths.ts · InteractionController.ts
    quality.ts                   device tier + WebGL / reduced-motion detection
    fallback2d.ts                static canvas fallback when WebGL is unavailable
    registry.ts                  rendezvous between the island and the scroll choreography
    shaders/*.glsl               core, halo, particles, nodes, ring, stream, pulses, noise
  animations/scroll/             GSAP: story sync, hero wordmark, the Gathering (phase 06 text), reveals, rail
  data/                          capabilities, navigation, gap (families + reach, derived from mcpCatalog), mcpCatalog (39 tools in 8 families)
  data/experiments/              showcase.json (generated, see below) + typed accessors and tool descriptions
scripts/curate-showcase.mjs      generates data/experiments/showcase.json from the comparison repository
  config/                        visual constants, quality profiles, animation keyframes
  styles/                        tokens · typography · motion · global
```

### Scene API

```ts
const scene = await sceneReady;          // from src/scenes/genkidama/registry
scene.setProgress(0..1);                 // story progress → keyframed params
scene.setPhase('composition');           // jump to a phase
scene.activateCapability('ocr');         // one tool call through OCR
scene.setNodeEnergy('ocr', 0.8);         // data-driven node energy
scene.setEnergy(0.6) / scene.setEnergy(null);
scene.setDim(0..1);                      // stage recedes behind content
scene.onTick(info => …);                 // progress, phase, energy, fps
```

Keyframes for every phase live in `src/config/animation.ts`; capability nodes
in `src/data/capabilities.ts`; quality tiers in `src/config/visual.ts`.

### Experiments data

The Experiments section reads `src/data/experiments/showcase.json`, which is
generated, never edited by hand:

```sh
node scripts/curate-showcase.mjs [path/to/combined_showcase_v2]
```

The script reads the sibling repository `Genkidama-project-comparisons`
(`results/raw/combined_showcase_v2`: manifests, `selection.jsonl`,
`full_run_context.json` and both `evaluation.jsonl` files), recomputes every
aggregate with the definitions of that repository's
`benchmark/combined_showcase/analysis.py`, and asserts them against the values
the executed `notebooks/combined_showcase_v2_analysis.ipynb` printed. A mismatch
fails the script. Missing values stay `null`.

The file is model-neutral: the *arms* (systems compared) come from the folder's
manifest, every per-arm value is keyed by arm id, each sample's runs are keyed
by arm, tool usage exists only for arms that were offered tools, and
comparisons are stated per arm against `referenceArm` (the native route).
Components iterate the arms of each benchmark and colour them by execution
path (`mcp` / `native`, tokens `--series-*` / `--ink-*`), so a further system
needs only: its rows in the folder, one entry in `ARM_PRESENTATION` in the
script, its expected values in the script's cross-check, and optionally a
`--series-<arm>` token. Nothing is shown for a system until its rows exist.

What the page shows: the benchmark's own score (accuracy with the official
MMMU-Pro parser; SQuAD v1.1 F1 and exact match) and the two recorded cost
fields, the gateway charge (reported by Eden AI's gateway per round) and the
specialist-tool charge (reported inside MCP tool results), never summed into
one headline. Wall-clock time and token counts remain in the JSON for the
notebook cross-check but are not presented as comparison metrics. The showcase
is a curated subset (50 of 100 tasks per benchmark, selected by rule where the
MCP route did at least as well as the native one); the page says so in a
caption and in the "How these figures were made" disclosure. The complete
100-task runs stay in the JSON (`fullRun`) and in the research repository but
are not presented on the page. Tool descriptions (`data/experiments/tools.ts`)
cover only tools that appear in the execution records.
