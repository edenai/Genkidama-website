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
}

/**
 * Keyframes at t = 0, 1/6, 2/6 ... 1. Index 0 is the hero / start of
 * ISOLATION; index 6 is the fully formed GENKIDAMA.
 */
export const keyframes: SceneParams[] = [
  // 0 — hero: a tiny core, almost nothing around it
  { coreScale: 0.34, coreEnergy: 0.18, gather: 0.02, turbulence: 0.25, nodeAlpha: 0, nodeSpread: 1.25, mcp: 0, streams: 0, ambient: 0.55, cameraZ: 7.6, cameraY: 0.2, spin: 0.6 },
  // 1 — isolation: a few signals only
  { coreScale: 0.38, coreEnergy: 0.22, gather: 0.08, turbulence: 0.3, nodeAlpha: 0.3, nodeSpread: 1.25, mcp: 0, streams: 0, ambient: 0.6, cameraZ: 7.0, cameraY: 0.1, spin: 0.7 },
  // 2 — the gap: capabilities exist, far away, unreachable
  { coreScale: 0.38, coreEnergy: 0.2, gather: 0.04, turbulence: 0.45, nodeAlpha: 1, nodeSpread: 1.2, mcp: 0.1, streams: 0, ambient: 0.7, cameraZ: 10.5, cameraY: 0.0, spin: 0.5 },
  // 3 — MCP: the routing layer appears between core and capabilities
  { coreScale: 0.42, coreEnergy: 0.3, gather: 0.12, turbulence: 0.4, nodeAlpha: 1, nodeSpread: 1.0, mcp: 1, streams: 0.08, ambient: 0.75, cameraZ: 10.0, cameraY: 0.0, spin: 0.6 },
  // 4 — composition: one tool call travels out and back (pulses are scripted)
  { coreScale: 0.5, coreEnergy: 0.42, gather: 0.22, turbulence: 0.5, nodeAlpha: 1, nodeSpread: 0.95, mcp: 1, streams: 0.18, ambient: 0.8, cameraZ: 9.4, cameraY: 0.0, spin: 0.7 },
  // 5 — accumulation: every capability feeds the core
  { coreScale: 0.8, coreEnergy: 0.72, gather: 0.62, turbulence: 0.7, nodeAlpha: 1, nodeSpread: 0.86, mcp: 0.9, streams: 1, ambient: 1, cameraZ: 8.8, cameraY: 0.0, spin: 1.1 },
  // 6 — genkidama: one composite system
  { coreScale: 1.25, coreEnergy: 1, gather: 1, turbulence: 1, nodeAlpha: 0.9, nodeSpread: 0.72, mcp: 0.7, streams: 1, ambient: 1, cameraZ: 8.2, cameraY: 0.0, spin: 1.6 },
];

/** State the scene relaxes to once the story is over and content takes over. */
export const afterglow: SceneParams = {
  coreScale: 0.8, coreEnergy: 0.4, gather: 0.9, turbulence: 0.4, nodeAlpha: 0.3, nodeSpread: 0.72, mcp: 0.3, streams: 0.3, ambient: 0.5, cameraZ: 9.0, cameraY: 0.0, spin: 0.5,
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
