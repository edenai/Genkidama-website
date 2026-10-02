/**
 * Animation configuration: the story phases and the scene parameters at each
 * phase boundary. `GenkidamaScene.setProgress(p)` interpolates these keyframes,
 * so the whole choreography can be retuned here without touching render code.
 */

export const PHASES = [
  'isolation',
  'gap',
  'mcp',
  'composition',
  'accumulation',
  'genkidama',
] as const;

export type Phase = (typeof PHASES)[number];
export const PHASE_COUNT = PHASES.length;

/** Parameters the scene understands. All 0..1 unless noted. */
export interface SceneParams {
  /** Core radius multiplier (world units) */
  coreScale: number;
  /** Core brightness / internal activity */
  coreEnergy: number;
  /** Attraction of the ambient field toward the core */
  gather: number;
  /** Surface + field turbulence */
  turbulence: number;
  /** Capability nodes visibility */
  nodeAlpha: number;
  /** Capability nodes distance multiplier (1 = full spread) */
  nodeSpread: number;
  /** MCP routing layer visibility */
  mcp: number;
  /** Global stream activity applied to all capability streams */
  streams: number;
  /** Ambient field visibility */
  ambient: number;
  /** Camera distance (world units) */
  cameraZ: number;
  /** Camera vertical offset (world units) */
  cameraY: number;
  /** System rotation speed multiplier */
  spin: number;
  /**
   * How far along its path, measured from the core, a stream ribbon may
   * extend. 1 = connected to the node; below 1 the ribbon stops short and
   * energy piles up at its tip (the gap made visible).
   */
  reach: number;
  /** Ribbon activity independent of tool-call traffic: the core probing outward. */
  probe: number;
  /** Multiplier on scripted tool-call traffic. 0 silences the scheduler. */
  traffic: number;
}

/**
 * Keyframes at t = 0, 1/6, 2/6 ... 1. Index 0 is the hero / start of
 * ISOLATION; index 6 is the fully formed GENKIDAMA. The last phase does not
 * interpolate 5 → 6 directly: see `gathering` below.
 */
export const keyframes: SceneParams[] = [
  // 0 — hero: a tiny core, almost nothing around it
  { coreScale: 0.34, coreEnergy: 0.18, gather: 0.02, turbulence: 0.25, nodeAlpha: 0, nodeSpread: 1.25, mcp: 0, streams: 0, ambient: 0.55, cameraZ: 7.6, cameraY: 0.2, spin: 0.6, reach: 0, probe: 0, traffic: 1 },
  // 1 — isolation: a few signals only; the core begins to feel outward
  { coreScale: 0.38, coreEnergy: 0.22, gather: 0.08, turbulence: 0.3, nodeAlpha: 0.3, nodeSpread: 1.25, mcp: 0, streams: 0, ambient: 0.6, cameraZ: 7.0, cameraY: 0.1, spin: 0.7, reach: 0.2, probe: 0.15, traffic: 1 },
  // 2 — the gap: capabilities exist, far away; the core reaches for them and stops short
  { coreScale: 0.38, coreEnergy: 0.2, gather: 0.04, turbulence: 0.45, nodeAlpha: 1, nodeSpread: 1.2, mcp: 0.1, streams: 0, ambient: 0.7, cameraZ: 11.5, cameraY: 0.0, spin: 0.5, reach: 0.6, probe: 1, traffic: 1 },
  // 3 — MCP: the routing layer appears and the reach connects through it
  { coreScale: 0.42, coreEnergy: 0.3, gather: 0.12, turbulence: 0.4, nodeAlpha: 1, nodeSpread: 1.0, mcp: 1, streams: 0.08, ambient: 0.75, cameraZ: 10.0, cameraY: 0.0, spin: 0.6, reach: 1, probe: 0.35, traffic: 1 },
  // 4 — composition: one tool call travels out and back (pulses are scripted)
  { coreScale: 0.5, coreEnergy: 0.42, gather: 0.22, turbulence: 0.5, nodeAlpha: 1, nodeSpread: 0.95, mcp: 1, streams: 0.18, ambient: 0.8, cameraZ: 9.4, cameraY: 0.0, spin: 0.7, reach: 1, probe: 0.1, traffic: 1 },
  // 5 — accumulation: every capability feeds the core
  { coreScale: 0.8, coreEnergy: 0.72, gather: 0.62, turbulence: 0.7, nodeAlpha: 1, nodeSpread: 0.86, mcp: 0.9, streams: 1, ambient: 1, cameraZ: 8.8, cameraY: 0.0, spin: 1.1, reach: 1, probe: 0, traffic: 1 },
  // 6 — genkidama: one composite system; nodes drawn in, rings resolved into the core
  { coreScale: 1.3, coreEnergy: 1, gather: 1, turbulence: 1, nodeAlpha: 0.6, nodeSpread: 0.55, mcp: 0.15, streams: 1, ambient: 1, cameraZ: 8.0, cameraY: 0.0, spin: 1.6, reach: 1, probe: 0, traffic: 1 },
];

/**
 * The Gathering: the schedule of the last phase, as fractions of that
 * phase's own progress. Accumulation (keyframe 5) falls into silence
 * (`charge`), holds, then converges through `surge` into the Genkidama
 * (keyframe 6) and holds there until the content takes over. Scroll drives
 * all of it through the same progress mapping as the other phases; the only
 * one-shot event is the surge, eight results landing in the core at once.
 */
export const gathering = {
  /** Silence is complete here; the convergence begins. */
  silenceEnd: 0.42,
  /** The surge fires once, when progress crosses this going up. */
  surgeAt: 0.52,
  /** The system has become the Genkidama and holds. */
  convergeEnd: 0.66,
  /** Silence: traffic stops, streams settle, the camera reaches its widest view. */
  charge: {
    coreScale: 0.78, coreEnergy: 0.38, gather: 0.5, turbulence: 0.12, nodeAlpha: 1, nodeSpread: 1.0, mcp: 0.45, streams: 0.04, ambient: 0.65, cameraZ: 12.0, cameraY: 0.0, spin: 0.12, reach: 1, probe: 0.12, traffic: 0,
  } as SceneParams,
  /** Mid-convergence: rings at full intensity, every stream alive, camera pushing in. */
  surge: {
    coreScale: 1.0, coreEnergy: 0.9, gather: 0.85, turbulence: 0.8, nodeAlpha: 1, nodeSpread: 0.8, mcp: 1, streams: 1, ambient: 1, cameraZ: 9.2, cameraY: 0.0, spin: 1.0, reach: 1, probe: 0, traffic: 0,
  } as SceneParams,
} as const;

/** State the scene relaxes to once the story is over and content takes over. */
export const afterglow: SceneParams = {
  coreScale: 0.8, coreEnergy: 0.4, gather: 0.9, turbulence: 0.4, nodeAlpha: 0.3, nodeSpread: 0.72, mcp: 0.3, streams: 0.3, ambient: 0.5, cameraZ: 9.0, cameraY: 0.0, spin: 0.5, reach: 1, probe: 0, traffic: 1,
};

/** How quickly current params chase their targets (per second). */
export const smoothing = {
  params: 3.2,
  mouse: 5.5,
  energyPulse: 4,
} as const;

/** Scripted tool-call cycle used in COMPOSITION (seconds). */
export const toolCallCycle = {
  request: 0.9,   // core → ring → tool
  work: 0.45,     // tool "thinking"
  result: 0.9,    // tool → ring → core
  rest: 0.6,
} as const;

/** DOM choreography timings (seconds) */
export const dom = {
  wordmarkConverge: 1.6,
  wordmarkStagger: 0.055,
  phaseTitle: 0.9,
  phaseBody: 0.7,
} as const;
