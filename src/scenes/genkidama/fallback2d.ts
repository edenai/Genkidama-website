import { palette } from '@config/visual';
import { keyframes, PHASES, PHASE_COUNT, type Phase } from '@config/animation';
import type { GenkidamaHandle, TickListener } from './types';

/**
 * 2D fallback when WebGL is unavailable. Preserves the concept — a core with
 * a sparse field that tightens as progress rises — with a static render per
 * progress change. No animation loop.
 */
export class FallbackScene implements GenkidamaHandle {
  readonly kind = 'fallback' as const;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly dots: { a: number; r: number; s: number }[] = [];
  private progress = 0;
  private dim = 0;
  private readonly listeners = new Set<TickListener>();
  private readonly ro: ResizeObserver;

  constructor(private readonly container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gk-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    for (let i = 0; i < 260; i++) {
      this.dots.push({ a: Math.random() * Math.PI * 2, r: Math.pow(Math.random(), 1.3), s: 0.6 + Math.random() * 1.2 });
    }
    this.ro = new ResizeObserver(() => this.render());
    this.ro.observe(container);
    this.render();
  }

  setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, p));
    this.render();
    this.emit();
  }
  setPhase(phase: Phase | number) {
    const i = typeof phase === 'number' ? phase : PHASES.indexOf(phase);
    this.setProgress(i / PHASE_COUNT);
  }
  activateCapability() {}
  deactivateCapability() {}
  setEnergy() {}
  setNodeEnergy() {}
  setDim(v: number) {
    this.dim = v;
    this.render();
  }
  onTick(l: TickListener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    const i = Math.min(PHASE_COUNT - 1, Math.floor(this.progress * PHASE_COUNT));
    for (const l of this.listeners) {
      l({ progress: this.progress, phase: PHASES[i]!, phaseIndex: i, energy: keyframes[i]!.coreEnergy, activeStreams: 0, fps: 0 });
    }
  }

  private render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const r = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const i = Math.min(PHASE_COUNT - 1, Math.floor(this.progress * PHASE_COUNT));
    const k = keyframes[i]!;
    const cx = w / 2, cy = h / 2;
    const base = Math.min(w, h) * 0.07;
    const coreR = base * k.coreScale * (1 - this.dim * 0.2);

    ctx.fillStyle = palette.bg0;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(cx, cy, coreR * 0.5, cx, cy, coreR * (4 + k.coreEnergy * 4));
    glow.addColorStop(0, `rgba(34, 211, 240, ${0.35 * k.coreEnergy + 0.1})`);
    glow.addColorStop(1, 'rgba(34, 211, 240, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = palette.energy300;
    const spread = Math.min(w, h) * (0.48 - k.gather * 0.28);
    for (const d of this.dots) {
      const rr = coreR * 1.5 + d.r * spread;
      const x = cx + Math.cos(d.a) * rr;
      const y = cy + Math.sin(d.a) * rr * 0.8;
      ctx.globalAlpha = (0.25 + 0.5 * (1 - d.r)) * (0.6 + k.gather * 0.4) * (1 - this.dim * 0.6);
      ctx.fillRect(x, y, d.s, d.s);
    }
    ctx.globalAlpha = 1;

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    core.addColorStop(0, palette.energyWhite);
    core.addColorStop(0.55, palette.energy300);
    core.addColorStop(1, palette.energy700);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();
  }

  dispose() {
    this.ro.disconnect();
    this.canvas.remove();
    this.listeners.clear();
  }
}
