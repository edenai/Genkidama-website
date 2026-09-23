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
  pages/index.astro              narrative page: Stage · Hero · Story · 01–05
  layouts/BaseLayout.astro       fonts, tokens, nav, rail, footer, animation boot
  components/
    layout/                      Nav, Rail (section index), Footer
    visual/                      Stage (WebGL island), HeroWordmark, EnergyReadout, ScrollCue, Marker
    sections/                    Hero, Story (6 phases), Idea, Gap, Bridge (incl. one-call trace), Experiment, NextProblem
    technical/                   CodeBlock, TerminalBlock, ToolCallTrace, ArchitectureDiagram, MetricCard, ComparisonPanel
    benchmark/                   BenchmarkComparison, LatencyChart, ToolPathComparison, ScenarioExplorer
  scenes/genkidama/
    GenkidamaScene.ts            renderer, loop, camera, bloom, public API (GenkidamaHandle)
    state.ts                     progress → keyframed params, activations, smoothing (no Three.js)
    Core.ts · AmbientField.ts · ParticleField.ts · CapabilityNodes.ts
    MCPField.ts · EnergyStreams.ts · ToolCallPaths.ts · InteractionController.ts
    quality.ts                   device tier + WebGL / reduced-motion detection
    fallback2d.ts                static canvas fallback when WebGL is unavailable
    registry.ts                  rendezvous between the island and the scroll choreography
    shaders/*.glsl               core, halo, particles, nodes, ring, stream, pulses, noise
  animations/scroll/             GSAP: story sync, hero wordmark, reveals, rail
  data/                          capabilities, navigation, benchmark schema + placeholder shell
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

### Benchmark data

`src/data/benchmark.ts` defines the dataset schema (`BenchmarkDataset`,
`Scenario`, `ScenarioMetrics`) and a placeholder shell whose metrics are all
`null`. Benchmark components render skeleton states for `null` and real
values otherwise. Replace `benchmarkPlaceholder` in `Experiment.astro` with a
loader once measurements exist. No statistics are hardcoded anywhere.
