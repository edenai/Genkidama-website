import * as THREE from 'three';
import vert from './shaders/pulses.vert.glsl?raw';
import frag from './shaders/particles.frag.glsl?raw';
import { palette } from '@config/visual';
import { toolCallCycle } from '@config/animation';
import { streamPath } from './EnergyStreams';
import type { LiveState, Subsystem } from './types';

const TRAIL = 7;

type PulseKind = 'request' | 'result';

interface Pulse {
  alive: boolean;
  node: number;
  kind: PulseKind;
  /** 0..1 along the path; direction depends on kind */
  t: number;
  speed: number;
}

/**
 * Tool-call pulses: bright packets travelling the stream paths.
 *   request — core → MCP ring → specialist tool  (cyan)
 *   result  — tool → MCP ring → core             (ember)
 * A completed request schedules its result after a short "work" delay; a
 * result landing in the core fires `onResult`, which the scene turns into an
 * energy pulse. This is the physical form of MODEL → MCP → TOOL → RESULT → MODEL.
 */
export class ToolCallPaths implements Subsystem {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly pulses: Pulse[] = [];
  private readonly pending: { node: number; at: number }[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly alphas: Float32Array;
  private readonly sizes: Float32Array;
  private readonly colorRequest = new THREE.Color(palette.energy100);
  private readonly colorResult = new THREE.Color(palette.ember);
  private readonly scratch = { start: new THREE.Vector3(), ctrl: new THREE.Vector3(), end: new THREE.Vector3() };
  private readonly p = new THREE.Vector3();
  private clock = 0;

  onResult: ((node: number) => void) | null = null;

  constructor(private readonly capacity: number, dpr: number) {
    const n = capacity * TRAIL;
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.alphas = new Float32Array(n);
    this.sizes = new Float32Array(n);
    for (let i = 0; i < capacity; i++) this.pulses.push({ alive: false, node: 0, kind: 'request', t: 0, speed: 1 });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { uDpr: { value: dpr } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  /** Launch a request toward a capability node. The result follows automatically. */
  fire(node: number, kind: PulseKind = 'request') {
    const slot = this.pulses.find((p) => !p.alive);
    if (!slot) return;
    slot.alive = true;
    slot.node = node;
    slot.kind = kind;
    slot.t = 0;
    slot.speed = 1 / (kind === 'request' ? toolCallCycle.request : toolCallCycle.result);
  }

  get activeCount(): number {
    return this.pulses.reduce((n, p) => n + (p.alive ? 1 : 0), 0);
  }

  update(dt: number, live: LiveState) {
    this.clock += dt;
    this.points.material.uniforms.uDpr!.value = live.dpr;

    // Release scheduled results.
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i]!.at <= this.clock) {
        this.fire(this.pending[i]!.node, 'result');
        this.pending.splice(i, 1);
      }
    }

    const pos = this.positions, col = this.colors, al = this.alphas, sz = this.sizes;
    for (let i = 0; i < this.capacity; i++) {
      const pulse = this.pulses[i]!;
      const base = i * TRAIL;
      if (!pulse.alive) {
        for (let k = 0; k < TRAIL; k++) al[base + k] = 0;
        continue;
      }
      pulse.t += dt * pulse.speed;
      if (pulse.t >= 1) {
        pulse.alive = false;
        if (pulse.kind === 'request') {
          this.pending.push({ node: pulse.node, at: this.clock + toolCallCycle.work });
        } else {
          this.onResult?.(pulse.node);
        }
        for (let k = 0; k < TRAIL; k++) al[base + k] = 0;
        continue;
      }

      streamPath(live.nodePositions[pulse.node]!, live.params.nodeSpread, live.ringRadius, live.coreRadius, this.scratch);
      const color = pulse.kind === 'request' ? this.colorRequest : this.colorResult;
      // Request travels core -> node (path t from 1 to 0), result node -> core.
      for (let k = 0; k < TRAIL; k++) {
        const lag = k * 0.022;
        const tt = THREE.MathUtils.clamp(pulse.t - lag, 0, 1);
        const pathT = pulse.kind === 'request' ? 1 - tt : tt;
        bezier(this.scratch.start, this.scratch.ctrl, this.scratch.end, pathT, this.p);
        const j = base + k;
        pos[j * 3] = this.p.x; pos[j * 3 + 1] = this.p.y; pos[j * 3 + 2] = this.p.z;
        col[j * 3] = color.r; col[j * 3 + 1] = color.g; col[j * 3 + 2] = color.b;
        const head = k === 0 ? 1 : 0.55 * (1 - k / TRAIL);
        al[j] = head * live.params.nodeAlpha;
        sz[j] = k === 0 ? 18 : 10 * (1 - k / TRAIL) + 3;
      }
    }

    const g = this.points.geometry;
    (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

function bezier(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number, out: THREE.Vector3) {
  const u = 1 - t;
  out.set(
    u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    u * u * a.z + 2 * u * t * b.z + t * t * c.z,
  );
  return out;
}
