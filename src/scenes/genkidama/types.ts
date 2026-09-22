import type { Color, Vector3 } from 'three';
import type { SceneParams, Phase } from '@config/animation';
import type { QualityProfile } from '@config/visual';

/** Everything a subsystem may read during `update`. Owned by GenkidamaScene. */
export interface LiveState {
  params: SceneParams;
  /** Scene time in seconds (already scaled for reduced motion) */
  time: number;
  /** Cursor position in system-local space (z ≈ 0 plane) */
  mouse: Vector3;
  /** 0..1 how strongly the cursor is currently disturbing the field */
  mouseStrength: number;
  /** Unit-spread base positions of the capability nodes */
  nodePositions: Vector3[];
  nodeColors: Color[];
  /** Per node, 0..1 — later driven by benchmark data */
  nodeEnergy: Float32Array;
  /** Per node, 0..1 current stream activity */
  stream: Float32Array;
  /** Transient brightness bump when a result lands in the core */
  energyPulse: number;
  /** Radius of the core in world units right now */
  coreRadius: number;
  ringRadius: number;
  aspect: number;
  dpr: number;
  quality: QualityProfile;
  reducedMotion: boolean;
}

export interface Subsystem {
  update(dt: number, live: LiveState): void;
  dispose(): void;
}

export type TickListener = (info: {
  progress: number;
  phase: Phase;
  phaseIndex: number;
  energy: number;
  activeStreams: number;
  fps: number;
}) => void;

/** Public API exposed to the page (scroll choreography, readouts, later: benchmarks). */
export interface GenkidamaHandle {
  /** 0..1 story progress; drives every keyframed parameter */
  setProgress(progress: number): void;
  /** Jump to a named phase (snaps progress to the phase start) */
  setPhase(phase: Phase | number): void;
  /** Send one tool call through a capability and add it to the active streams */
  activateCapability(id: string, options?: { persistent?: boolean }): void;
  deactivateCapability(id: string): void;
  /** Override the core energy 0..1 (used when the story is over / by data) */
  setEnergy(value: number | null): void;
  /** Per-node energy 0..1 for a data-driven state */
  setNodeEnergy(id: string, value: number): void;
  /** 0..1 how much the stage recedes behind content */
  setDim(value: number): void;
  onTick(listener: TickListener): () => void;
  dispose(): void;
  readonly kind: 'webgl' | 'fallback';
}
