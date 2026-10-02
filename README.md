# Genkidama — website

Official website for **Genkidama**, an Eden AI research concept on capability
composition: a model does not need to natively support every modality; through
Eden AI's MCP server it can reach specialist tools for what it lacks.

This repository is in its **visual system phase**. Copy, MCP documentation,
code examples and benchmark data are placeholders; the visual machine they will
live inside is the deliverable.

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
  pages/index.astro              narrative page: Stage · Hero · Story (6 phases, the last is the Gathering) · 01–05
  pages/details.astro            experiments: setup · OCR (MMMU-Pro) · speech (Spoken-SQuAD) · across both · complete runs · observations · method
  layouts/BaseLayout.astro       fonts, tokens, nav, rail, footer, animation boot
  components/
    layout/                      Nav, Rail (section index), Footer
    visual/                      Stage (WebGL island), HeroWordmark, EnergyReadout, ScrollCue, Marker
    sections/                    Hero, Story (6 phases), Idea, Gap, Bridge (incl. one-call trace), NextProblem, Experiments (entry to /details)
    technical/                   CodeBlock, TerminalBlock, ToolCallTrace, ArchitectureDiagram, MetricCard, ComparisonPanel
    experiments/                 Details charts: ReturnLink, ArmLegend, SetupDiagram, ScoreCompare, LatencyChart, TokenChart, CostChart, ToolUsage, CrossMatrix, FullRunChart
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
  data/                          capabilities, navigation, mcpCatalog (39 tools in 8 families)
  data/experiments/              showcase.json (generated, see below) + typed accessors and formatters
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

The Details page reads `src/data/experiments/showcase.json`, which is
generated, never edited by hand:

```sh
node scripts/curate-showcase.mjs [path/to/combined_showcase_v1]
```

The script reads the sibling repository `Genkidama-project-comparisons`
(`results/raw/combined_showcase_v1`: manifests, `selection.jsonl`,
`full_run_context.json` and both `evaluation.jsonl` files), recomputes every
aggregate with the definitions of that repository's
`benchmark/combined_showcase/analysis.py`, and asserts them against the values
the executed `notebooks/combined_showcase_analysis.ipynb` printed. A mismatch
fails the script. Missing values stay `null`; the two cost fields (gateway
charge, specialist-tool charge) stay separate; recorded model time and
recorded MCP/tool time are never presented as summing to the wall-clock total.
The showcase is a curated subset (50 of 100 tasks per benchmark, selected by
rule where DeepSeek + MCP did at least as well as Gemini); the page says so and
shows the complete runs alongside.

The landing page's Experiments section reads its counts from the same file,
so the two pages cannot drift apart. The earlier placeholder schema
(`data/benchmark.ts`) and skeleton components (`components/benchmark/`) were
removed once the real data landed.
