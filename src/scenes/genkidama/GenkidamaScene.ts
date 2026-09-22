import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { palette, geometry, bloom as bloomCfg, type QualityProfile } from '@config/visual';
import { PHASES, toolCallCycle, type Phase } from '@config/animation';
import { capabilities, CAPABILITY_COUNT } from '@data/capabilities';

import { SceneState } from './state';
import { Core } from './Core';
import { AmbientField } from './AmbientField';
import { ParticleField } from './ParticleField';
import { CapabilityNodes, computeNodePositions } from './CapabilityNodes';
import { MCPField } from './MCPField';
import { EnergyStreams } from './EnergyStreams';
import { ToolCallPaths } from './ToolCallPaths';
import { InteractionController } from './InteractionController';
import type { GenkidamaHandle, LiveState, TickListener } from './types';

export interface GenkidamaSceneOptions {
  quality: QualityProfile;
  reducedMotion: boolean;
  /** Where DOM node labels are mounted (positioned absolutely over the canvas) */
  labelsRoot?: HTMLElement | null;
}

/**
 * GenkidamaScene
 *  ├── Core
 *  ├── AmbientField (corona)
 *  ├── ParticleField
 *  ├── CapabilityNodes (+ DOM labels)
 *  ├── MCPField (routing rings)
 *  ├── EnergyStreams (ribbons)
 *  ├── ToolCallPaths (pulses)
 *  └── InteractionController
 *
 * Owns the renderer, the loop and the LiveState; exposes GenkidamaHandle.
 */
export class GenkidamaScene implements GenkidamaHandle {
  readonly kind = 'webgl' as const;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly system = new THREE.Group();
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  private readonly state = new SceneState();
  private readonly live: LiveState;

  private readonly core: Core;
  private readonly ambient: AmbientField;
  private readonly particles: ParticleField;
  private readonly nodes: CapabilityNodes;
  private readonly mcp: MCPField;
  private readonly streams: EnergyStreams;
  private readonly pulses: ToolCallPaths;
  private readonly interaction: InteractionController;

  private raf = 0;
  private running = false;
  private visible = true;
  private disposed = false;
  private lastFrame = 0;
  private dim = 0;
  private width = 1;
  private height = 1;
  private dpr: number;

  // Scripted tool-call scheduler
  private schedulerClock = 0;
  private schedulerNext = 0;
  private schedulerNode = 0;

  // Adaptive quality
  private frameAccum = 0;
  private frameCount = 0;
  private fps = 60;
  private bloomEnabled: boolean;

  private readonly listeners = new Set<TickListener>();
  private readonly resizeObserver: ResizeObserver;
  private readonly intersection: IntersectionObserver;

  constructor(private readonly container: HTMLElement, private readonly options: GenkidamaSceneOptions) {
    const q = options.quality;
    this.dpr = Math.min(window.devicePixelRatio || 1, q.maxDpr);
    this.bloomEnabled = q.bloom;

    this.renderer = new THREE.WebGLRenderer({
      antialias: q.antialias,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setClearColor(new THREE.Color(palette.bg0), 1);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.domElement.className = 'gk-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(geometry.cameraFov, 1, 0.1, 60);
    this.camera.position.set(0, 0.2, 7.6);
    this.scene.add(this.system);

    const nodePositions = computeNodePositions();
    const nodeColors = capabilities.map((c) => new THREE.Color(c.accent));

    this.live = {
      params: this.state.current,
      time: 0,
      mouse: new THREE.Vector3(0, 0, 0),
      mouseStrength: 0,
      nodePositions,
      nodeColors,
      nodeEnergy: this.state.nodeEnergy,
      stream: this.state.stream,
      energyPulse: 0,
      coreRadius: geometry.coreRadius * this.state.current.coreScale,
      ringRadius: geometry.ringRadius,
      aspect: 1,
      dpr: this.dpr,
      quality: q,
      reducedMotion: options.reducedMotion,
    };

    this.core = new Core(q.coreSegments);
    this.ambient = new AmbientField();
    this.particles = new ParticleField(q.particleCount, nodePositions, nodeColors, this.dpr);
    this.nodes = new CapabilityNodes(options.labelsRoot ?? null, nodePositions, nodeColors, this.dpr);
    this.mcp = new MCPField(q.tier === 'low' ? 128 : 256);
    this.streams = new EnergyStreams(q.streamSegments, nodeColors);
    this.pulses = new ToolCallPaths(q.pulseCount, this.dpr);
    this.pulses.onResult = () => this.state.pulse(0.35);
    this.interaction = new InteractionController(container, options.reducedMotion);

    this.system.add(this.ambient.mesh, this.core.mesh, this.particles.points, this.mcp.group, this.streams.group, this.nodes.points, this.pulses.points);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.setupPostProcessing();

    this.intersection = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        this.syncRunning();
      },
      { threshold: 0 },
    );
    this.intersection.observe(container);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.start();
  }

  // --- Public API -----------------------------------------------------------

  setProgress(progress: number) {
    this.state.setProgress(progress);
  }

  setPhase(phase: Phase | number) {
    this.state.setPhase(phase);
  }

  activateCapability(id: string, options?: { persistent?: boolean }) {
    const idx = capabilities.findIndex((c) => c.id === id);
    if (idx < 0) return;
    this.state.activate(idx, options?.persistent);
    this.pulses.fire(idx, 'request');
  }

  deactivateCapability(id: string) {
    const idx = capabilities.findIndex((c) => c.id === id);
    this.state.deactivate(idx);
  }

  setEnergy(value: number | null) {
    this.state.setEnergy(value);
  }

  setNodeEnergy(id: string, value: number) {
    const idx = capabilities.findIndex((c) => c.id === id);
    this.state.setNodeEnergy(idx, value);
  }

  /** 0 = story is live, 1 = content has taken over and the stage recedes */
  setDim(value: number) {
    this.dim = THREE.MathUtils.clamp(value, 0, 1);
    this.state.setAfterglow(this.dim);
  }

  onTick(listener: TickListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Lifecycle ------------------------------------------------------------

  private start() {
    this.running = true;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private syncRunning() {
    const shouldRun = this.visible && document.visibilityState === 'visible' && !this.disposed;
    if (shouldRun && !this.running) this.start();
    if (!shouldRun && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  private onVisibility = () => this.syncRunning();

  private resize() {
    const r = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.round(r.width));
    this.height = Math.max(1, Math.round(r.height));
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.live.aspect = this.camera.aspect;
    this.live.dpr = this.dpr;
    this.composer?.setSize(this.width, this.height);
    this.composer?.setPixelRatio(this.dpr);
  }

  private setupPostProcessing() {
    if (!this.bloomEnabled) return;
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(this.width, this.height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      bloomCfg.strengthMin,
      bloomCfg.radius,
      bloomCfg.threshold,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  private teardownPostProcessing() {
    this.bloomPass?.dispose();
    this.composer?.dispose();
    this.bloomPass = null;
    this.composer = null;
  }

  /** Step down quality if the frame budget is consistently blown. */
  private adapt(dt: number) {
    this.frameAccum += dt;
    this.frameCount++;
    if (this.frameAccum < 2) return;
    this.fps = this.frameCount / this.frameAccum;
    this.frameAccum = 0;
    this.frameCount = 0;
    if (this.fps < 38) {
      if (this.dpr > 1) {
        this.dpr = Math.max(0.85, this.dpr - 0.25);
        this.resize();
      } else if (this.bloomEnabled) {
        this.bloomEnabled = false;
        this.teardownPostProcessing();
      }
    }
  }

  private frameIndex = 0;

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);

    // Once content has taken over, the stage is a faint backdrop: halve the
    // frame rate to give the CPU/GPU back to the page.
    if (this.dim > 0.9 && this.frameIndex++ % 2 === 1) return;

    const rawDt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const timeScale = this.options.reducedMotion ? 0.15 : 1;
    const dt = rawDt;
    this.live.time += dt * timeScale;

    this.state.update(dt);
    const p = this.state.current;
    this.live.energyPulse = this.state.energyPulse;
    this.live.coreRadius = geometry.coreRadius * p.coreScale;
    this.live.ringRadius = geometry.ringRadius * (0.85 + p.coreScale * 0.25);

    // Camera: dolly with the story, slight parallax from the pointer.
    this.interaction.update(dt, this.camera, this.system);
    const px = this.interaction.parallax.x * 0.35;
    const py = this.interaction.parallax.y * 0.25;
    this.camera.position.x += (px - this.camera.position.x) * (1 - Math.exp(-2 * dt));
    this.camera.position.y += (p.cameraY + py - this.camera.position.y) * (1 - Math.exp(-2 * dt));
    // Portrait viewports see less width: pull back so the system fits.
    const portrait = this.live.aspect < 0.8 ? 1.35 : this.live.aspect < 1.1 ? 1.15 : 1;
    this.camera.position.z += (p.cameraZ * portrait - this.camera.position.z) * (1 - Math.exp(-2.5 * dt));
    this.camera.lookAt(0, 0, 0);

    // The whole system turns slowly; faster as it charges.
    const spin = this.options.reducedMotion ? 0.1 : 1;
    this.system.rotation.y += dt * 0.045 * p.spin * spin;
    this.system.rotation.x = Math.sin(this.live.time * 0.07) * 0.06;
    this.system.updateMatrixWorld();

    this.live.mouse.copy(this.interaction.world);
    this.live.mouseStrength = this.interaction.strength * (0.6 + p.coreEnergy * 0.5);

    this.runScheduler(dt);

    this.core.update(dt, this.live);
    this.ambient.update(dt, this.live);
    this.particles.update(dt, this.live);
    this.nodes.update(dt, this.live);
    this.mcp.update(dt, this.live);
    this.streams.update(dt, this.live);
    this.pulses.update(dt, this.live);
    this.nodes.projectLabels(this.camera, this.system, this.width, this.height, this.live);

    if (this.bloomPass) {
      const e = Math.min(1.3, p.coreEnergy + this.state.energyPulse * 0.5);
      this.bloomPass.strength = bloomCfg.strengthMin + (bloomCfg.strengthMax - bloomCfg.strengthMin) * e;
      this.bloomPass.strength *= 1 - this.dim * 0.5;
    }

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);

    this.adapt(rawDt);

    if (this.listeners.size) {
      const info = {
        progress: this.state.progress,
        phase: this.state.phase,
        phaseIndex: this.state.phaseIndex,
        energy: p.coreEnergy,
        activeStreams: this.state.activeStreams,
        fps: this.fps,
      };
      for (const l of this.listeners) l(info);
    }
  };

  /**
   * Scripted traffic per phase:
   *   composition  — one call at a time, cycling through capabilities
   *   accumulation — several calls in flight
   *   genkidama    — constant traffic
   */
  private runScheduler(dt: number) {
    const phase = PHASES[this.state.phaseIndex];
    const storyOver = this.dim > 0.5;
    this.schedulerClock += dt;
    if (this.schedulerClock < this.schedulerNext) return;

    const period = toolCallCycle.request + toolCallCycle.work + toolCallCycle.result + toolCallCycle.rest;
    if (storyOver) {
      this.schedulerNext = this.schedulerClock + 1.6;
      this.fireNext(1);
      return;
    }
    switch (phase) {
      case 'composition':
        this.schedulerNext = this.schedulerClock + period;
        this.fireNext(1);
        break;
      case 'accumulation':
        this.schedulerNext = this.schedulerClock + 0.55;
        this.fireNext(2);
        break;
      case 'genkidama':
        this.schedulerNext = this.schedulerClock + 0.3;
        this.fireNext(3);
        break;
      default:
        this.schedulerNext = this.schedulerClock + 0.5;
    }
  }

  private fireNext(count: number) {
    for (let i = 0; i < count; i++) {
      this.pulses.fire(this.schedulerNode, 'request');
      this.state.activate(this.schedulerNode, false);
      this.schedulerNode = (this.schedulerNode + 3) % CAPABILITY_COUNT; // stride keeps calls spread out
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    this.interaction.dispose();
    this.core.dispose();
    this.ambient.dispose();
    this.particles.dispose();
    this.nodes.dispose();
    this.mcp.dispose();
    this.streams.dispose();
    this.pulses.dispose();
    this.teardownPostProcessing();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.listeners.clear();
  }
}
