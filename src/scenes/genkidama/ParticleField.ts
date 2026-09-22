import * as THREE from 'three';
import noise from './shaders/noise.glsl?raw';
import vert from './shaders/particles.vert.glsl?raw';
import frag from './shaders/particles.frag.glsl?raw';
import { palette, geometry } from '@config/visual';
import { CAPABILITY_COUNT } from '@data/capabilities';
import type { LiveState, Subsystem } from './types';

/**
 * GPU particle field. All motion lives in the vertex shader; the CPU only
 * updates a handful of uniforms per frame. Two populations share one draw:
 *   kind 0 — ambient energy orbiting the core, captured as `gather` rises
 *   kind 1 — capability particles orbiting their node, streaming to the core
 *            when that node's stream is active
 */
export class ParticleField implements Subsystem {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: Record<string, THREE.IUniform>;

  constructor(count: number, nodePositions: THREE.Vector3[], nodeColors: THREE.Color[], dpr: number) {
    const positions = new Float32Array(count * 3); // unused by the shader but required
    const seeds = new Float32Array(count * 4);
    const kinds = new Float32Array(count);
    const nodes = new Float32Array(count);

    const capabilityShare = 0.32;
    for (let i = 0; i < count; i++) {
      seeds[i * 4 + 0] = Math.random();
      seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
      const bound = i / count > 1 - capabilityShare;
      kinds[i] = bound ? 1 : 0;
      nodes[i] = bound ? i % CAPABILITY_COUNT : 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geo.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));
    geo.setAttribute('aNode', new THREE.BufferAttribute(nodes, 1));
    // Bounding sphere large enough to never be culled.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

    this.uniforms = {
      uTime: { value: 0 },
      uDpr: { value: dpr },
      uSize: { value: 2.7 },
      uGather: { value: 0 },
      uEnergy: { value: 0.2 },
      uTurbulence: { value: 0.3 },
      uAmbient: { value: 0.6 },
      uCoreRadius: { value: 0.35 },
      uRingRadius: { value: geometry.ringRadius },
      uNodeAlpha: { value: 0 },
      uNodeSpread: { value: 1 },
      uNodePos: { value: nodePositions },
      uNodeColor: { value: nodeColors },
      uStream: { value: new Float32Array(CAPABILITY_COUNT) },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
      uMouseStrength: { value: 0 },
      uColorA: { value: new THREE.Color(palette.energy700) },
      uColorB: { value: new THREE.Color(palette.energy300) },
      uColorC: { value: new THREE.Color(palette.energyWhite) },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: noise + vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  update(_dt: number, live: LiveState) {
    const u = this.uniforms;
    const p = live.params;
    u.uTime!.value = live.time;
    u.uDpr!.value = live.dpr;
    u.uGather!.value = p.gather;
    u.uEnergy!.value = Math.min(1.3, p.coreEnergy + live.energyPulse * 0.3);
    u.uTurbulence!.value = p.turbulence;
    u.uAmbient!.value = p.ambient;
    u.uCoreRadius!.value = live.coreRadius;
    u.uRingRadius!.value = live.ringRadius;
    u.uNodeAlpha!.value = p.nodeAlpha;
    u.uNodeSpread!.value = p.nodeSpread;
    (u.uStream!.value as Float32Array).set(live.stream);
    (u.uMouse!.value as THREE.Vector3).copy(live.mouse);
    u.uMouseStrength!.value = live.mouseStrength;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
