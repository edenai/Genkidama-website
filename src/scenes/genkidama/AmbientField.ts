import * as THREE from 'three';
import noise from './shaders/noise.glsl?raw';
import vert from './shaders/halo.vert.glsl?raw';
import frag from './shaders/halo.frag.glsl?raw';
import { palette } from '@config/visual';
import type { LiveState, Subsystem } from './types';

/**
 * The corona around the core: an additive billboard whose radius and
 * brightness follow the core's energy. It is the only "soft" element in the
 * system and exists so the core reads as a light source, not a ball.
 */
export class AmbientField implements Subsystem {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly uniforms = {
    uTime: { value: 0 },
    uEnergy: { value: 0.2 },
    uColor: { value: new THREE.Color(palette.energy500) },
    uColorHot: { value: new THREE.Color(palette.energy100) },
  };

  constructor() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: noise + frag,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  update(_dt: number, live: LiveState) {
    const energy = Math.min(1.4, live.params.coreEnergy + live.energyPulse * 0.6);
    this.uniforms.uTime.value = live.time;
    this.uniforms.uEnergy.value = energy;
    const size = live.coreRadius * (4.2 + energy * 3.2) * live.params.ambient;
    this.mesh.scale.set(size, size, 1);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
