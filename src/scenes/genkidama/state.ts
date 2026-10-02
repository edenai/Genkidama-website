import {
  keyframes,
  afterglow,
  gathering,
  smoothing,
  PHASES,
  PHASE_COUNT,
  type Phase,
  type SceneParams,
} from '@config/animation';
import { capabilities, CAPABILITY_COUNT } from '@data/capabilities';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

const PARAM_KEYS = Object.keys(keyframes[0]!) as (keyof SceneParams)[];

/**
 * SceneState turns high-level intent (progress, phase, activations, energy
 * overrides) into smoothly interpolated scene parameters. It knows nothing
 * about Three.js, which keeps it testable and reusable for a future
 * data-driven mode.
 */
export class SceneState {
  progress = 0;
  phaseIndex = 0;
  /** 0 = telling the story, 1 = story over, content has taken over */
  afterglowMix = 0;

  readonly target: SceneParams = { ...keyframes[0]! };
  readonly current: SceneParams = { ...keyframes[0]! };

  readonly streamTarget = new Float32Array(CAPABILITY_COUNT);
  readonly stream = new Float32Array(CAPABILITY_COUNT);
  readonly nodeEnergy = new Float32Array(capabilities.map((c) => c.energy));

  /** Per-node manual activation 0..1 and whether it decays */
  private activation = new Float32Array(CAPABILITY_COUNT);
  private persistent = new Uint8Array(CAPABILITY_COUNT);

  private energyOverride: number | null = null;
  energyPulse = 0;

  get phase(): Phase {
    return PHASES[this.phaseIndex]!;
  }

  /**
   * Progress within the last phase, 0..1, or -1 outside it. The scene reads
   * this to fire the surge once per pass through the convergence.
   */
  gatheringT = -1;

  setProgress(p: number) {
    this.progress = clamp01(p);
    const scaled = this.progress * PHASE_COUNT;
    const i = Math.min(PHASE_COUNT - 1, Math.floor(scaled));
    const t = scaled - i;
    this.phaseIndex = i;
    if (i === PHASE_COUNT - 1) {
      this.gatheringT = t;
      this.setGathering(t);
      return;
    }
    this.gatheringT = -1;
    this.blend(keyframes[i]!, keyframes[i + 1]!, t);
  }

  /** Ease within each segment so boundaries feel like arrivals, not linear ramps. */
  private blend(a: SceneParams, b: SceneParams, t: number) {
    const e = t * t * (3 - 2 * t);
    for (const k of PARAM_KEYS) this.target[k] = lerp(a[k], b[k], e);
  }

  /**
   * The last phase is piecewise: accumulation → silence (hold) → surge →
   * genkidama (hold). The segments are short on purpose; the parameter
   * damping in `update` turns each jump into a fast attack and a long settle.
   */
  private setGathering(t: number) {
    const { silenceEnd, surgeAt, convergeEnd, charge, surge } = gathering;
    const from = keyframes[PHASE_COUNT - 1]!;
    const to = keyframes[PHASE_COUNT]!;
    if (t < silenceEnd) this.blend(from, charge, t / silenceEnd);
    else if (t < surgeAt) this.blend(charge, surge, (t - silenceEnd) / (surgeAt - silenceEnd));
    else if (t < convergeEnd) this.blend(surge, to, (t - surgeAt) / (convergeEnd - surgeAt));
    else this.blend(to, to, 1);
  }

  setPhase(phase: Phase | number) {
    const idx = typeof phase === 'number' ? phase : PHASES.indexOf(phase);
    this.setProgress(Math.max(0, idx) / PHASE_COUNT);
  }

  setAfterglow(mix: number) {
    this.afterglowMix = clamp01(mix);
  }

  setEnergy(v: number | null) {
    this.energyOverride = v === null ? null : clamp01(v);
  }

  activate(index: number, persistent = false) {
    if (index < 0 || index >= CAPABILITY_COUNT) return;
    this.activation[index] = 1;
    this.persistent[index] = persistent ? 1 : 0;
  }

  deactivate(index: number) {
    if (index < 0 || index >= CAPABILITY_COUNT) return;
    this.persistent[index] = 0;
    this.activation[index] = 0;
  }

  setNodeEnergy(index: number, v: number) {
    if (index < 0 || index >= CAPABILITY_COUNT) return;
    this.nodeEnergy[index] = clamp01(v);
  }

  pulse(strength = 1) {
    this.energyPulse = Math.min(1.5, this.energyPulse + strength);
  }

  update(dt: number) {
    const k = smoothing.params;
    for (const key of PARAM_KEYS) {
      const tgt = lerp(this.target[key], afterglow[key], this.afterglowMix);
      this.current[key] = damp(this.current[key], tgt, k, dt);
    }
    if (this.energyOverride !== null) {
      this.current.coreEnergy = damp(this.current.coreEnergy, this.energyOverride, k, dt);
    }

    for (let i = 0; i < CAPABILITY_COUNT; i++) {
      if (!this.persistent[i]) this.activation[i] = Math.max(0, this.activation[i]! - dt * 0.35);
      this.streamTarget[i] = Math.max(this.current.streams * (0.6 + this.nodeEnergy[i]! * 0.4), this.activation[i]!);
      this.stream[i] = damp(this.stream[i]!, this.streamTarget[i]!, 2.8, dt);
    }

    this.energyPulse = damp(this.energyPulse, 0, smoothing.energyPulse, dt);
  }

  /** Total stream activity, 0..CAPABILITY_COUNT */
  get activeStreams(): number {
    let s = 0;
    for (let i = 0; i < CAPABILITY_COUNT; i++) s += this.stream[i]!;
    return s;
  }
}
