/**
 * Visual constants shared by the WebGL scene. Colors mirror styles/tokens.css;
 * keep both in sync when the palette changes.
 */

export const palette = {
  bg0: '#050708',
  energyWhite: '#f2fdff',
  energy100: '#b6f6ff',
  energy300: '#5cecff',
  energy500: '#22d3f0',
  energy700: '#0a9bb8',
  energy900: '#063f4d',
  ember: '#ffb15e',
  emberDeep: '#d97a1f',
  fg2: '#6b7680',
} as const;

export type QualityTier = 'high' | 'medium' | 'low';

export interface QualityProfile {
  tier: QualityTier;
  /** Ambient + capability particles */
  particleCount: number;
  /** Device pixel ratio cap */
  maxDpr: number;
  bloom: boolean;
  antialias: boolean;
  /** Sphere tessellation for the core */
  coreSegments: number;
  /** Segments per energy stream ribbon */
  streamSegments: number;
  /** Max simultaneous tool-call pulses */
  pulseCount: number;
}

export const qualityProfiles: Record<QualityTier, QualityProfile> = {
  high: {
    tier: 'high',
    particleCount: 7000,
    maxDpr: 1.75,
    bloom: true,
    antialias: false, // bloom pass resolves aliasing well enough; saves fill rate
    coreSegments: 96,
    streamSegments: 64,
    pulseCount: 48,
  },
  medium: {
    tier: 'medium',
    particleCount: 3200,
    maxDpr: 1.25,
    bloom: true,
    antialias: false,
    coreSegments: 64,
    streamSegments: 40,
    pulseCount: 24,
  },
  low: {
    tier: 'low',
    particleCount: 1400,
    maxDpr: 1,
    bloom: false,
    antialias: true,
    coreSegments: 40,
    streamSegments: 24,
    pulseCount: 12,
  },
};

/** World-space geometry of the system. Everything else derives from these. */
export const geometry = {
  /** Distance of capability nodes from the core at full spread */
  nodeRadius: 4.6,
  /** Radius of the MCP routing layer */
  ringRadius: 2.35,
  /** Core radius at scale 1 */
  coreRadius: 1,
  /** Ambient field extents */
  ambientInner: 2.2,
  ambientOuter: 8.5,
  cameraFov: 38,
} as const;

/** Bloom tuning per tier. Intensity is modulated live by scene energy. */
export const bloom = {
  threshold: 0.55,
  strengthMin: 0.18,
  strengthMax: 0.85,
  radius: 0.25,
} as const;
