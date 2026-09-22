import * as THREE from 'three';
import vert from './shaders/nodes.vert.glsl?raw';
import frag from './shaders/nodes.frag.glsl?raw';
import { capabilities, CAPABILITY_COUNT } from '@data/capabilities';
import { geometry } from '@config/visual';
import type { LiveState, Subsystem } from './types';

/** Lay nodes out on the outer shell from their azimuth / elevation hints. */
export function computeNodePositions(): THREE.Vector3[] {
  return capabilities.map((c) => {
    const r = geometry.nodeRadius;
    return new THREE.Vector3(
      Math.cos(c.elevation) * Math.cos(c.azimuth) * r,
      Math.sin(c.elevation) * r,
      Math.cos(c.elevation) * Math.sin(c.azimuth) * r,
    );
  });
}

/**
 * Capability nodes: instrument-like glyphs rendered as GPU points plus DOM
 * labels projected onto the canvas each frame. Labels are DOM so they stay
 * crisp at any DPR and can be styled with the design tokens; they are
 * aria-hidden because the same information lives in the page content.
 */
export class CapabilityNodes implements Subsystem {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly labels: HTMLElement[] = [];
  private readonly tmp = new THREE.Vector3();

  constructor(
    labelsRoot: HTMLElement | null,
    nodePositions: THREE.Vector3[],
    nodeColors: THREE.Color[],
    dpr: number,
  ) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAPABILITY_COUNT * 3), 3));
    geo.setAttribute(
      'aIndex',
      new THREE.BufferAttribute(new Float32Array(capabilities.map((_, i) => i)), 1),
    );
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

    this.uniforms = {
      uTime: { value: 0 },
      uDpr: { value: dpr },
      uNodeSpread: { value: 1 },
      uNodeAlpha: { value: 0 },
      uNodePos: { value: nodePositions },
      uNodeColor: { value: nodeColors },
      uNodeEnergy: { value: new Float32Array(CAPABILITY_COUNT) },
      uStream: { value: new Float32Array(CAPABILITY_COUNT) },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;

    if (labelsRoot) {
      for (const c of capabilities) {
        const el = document.createElement('div');
        el.className = 'gk-node-label';
        el.style.setProperty('--accent', c.accent);
        el.innerHTML =
          `<span class="gk-node-label__index">${c.index}</span>` +
          `<span class="gk-node-label__name">${c.name.toUpperCase()}</span>` +
          `<span class="gk-node-label__tool">${c.tool}</span>`;
        labelsRoot.appendChild(el);
        this.labels.push(el);
      }
    }
  }

  update(_dt: number, live: LiveState) {
    const u = this.uniforms;
    u.uTime!.value = live.time;
    u.uDpr!.value = live.dpr;
    u.uNodeSpread!.value = live.params.nodeSpread;
    u.uNodeAlpha!.value = live.params.nodeAlpha;
    (u.uNodeEnergy!.value as Float32Array).set(live.nodeEnergy);
    (u.uStream!.value as Float32Array).set(live.stream);
  }

  /** Project labels; called by the scene after matrices are updated. */
  projectLabels(camera: THREE.Camera, system: THREE.Object3D, width: number, height: number, live: LiveState) {
    if (!this.labels.length) return;
    const alpha = live.params.nodeAlpha;
    // Labels yield to the story text: anything landing inside the active
    // phase block (plus a margin) fades so the copy stays readable.
    const occluder = document.querySelector<HTMLElement>('.phase.is-active .phase__inner')?.getBoundingClientRect() ?? null;
    const pad = 28;
    for (let i = 0; i < CAPABILITY_COUNT; i++) {
      const el = this.labels[i]!;
      if (alpha < 0.02) {
        el.style.opacity = '0';
        continue;
      }
      this.tmp.copy(live.nodePositions[i]!).multiplyScalar(live.params.nodeSpread);
      system.localToWorld(this.tmp);
      const depth = this.tmp.z; // world z: positive = toward camera
      this.tmp.project(camera);
      const x = (this.tmp.x * 0.5 + 0.5) * width;
      const y = (-this.tmp.y * 0.5 + 0.5) * height;
      // Labels behind the core plane recede.
      const depthFade = THREE.MathUtils.clamp(0.45 + depth * 0.14, 0.25, 1);
      let occlusion = 1;
      if (occluder) {
        const inside =
          x > occluder.left - pad && x < occluder.right + pad + 120 && y > occluder.top - pad && y < occluder.bottom + pad;
        if (inside) occlusion = 0.12;
      }
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = (alpha * depthFade * occlusion).toFixed(3);
      el.classList.toggle('is-active', live.stream[i]! > 0.35);
    }
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    for (const el of this.labels) el.remove();
    this.labels.length = 0;
  }
}
