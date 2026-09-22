import * as THREE from 'three';
import noise from './shaders/noise.glsl?raw';
import vert from './shaders/core.vert.glsl?raw';
import frag from './shaders/core.frag.glsl?raw';
import { palette, geometry } from '@config/visual';
import type { LiveState, Subsystem } from './types';

/**
 * The energy core: a noise-displaced sphere with flowing plasma, crawling
 * filaments and a fresnel rim. Scale and brightness follow `coreScale` and
 * `coreEnergy`; a result landing in the core adds a short `energyPulse`.
 */
export class Core implements Subsystem {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: {
    uTime: THREE.IUniform<number>;
    uEnergy: THREE.IUniform<number>;
    uTurbulence: THREE.IUniform<number>;
    uColorDeep: THREE.IUniform<THREE.Color>;
    uColorMid: THREE.IUniform<THREE.Color>;
    uColorHot: THREE.IUniform<THREE.Color>;
    uColorWhite: THREE.IUniform<THREE.Color>;
  };

  constructor(segments: number) {
    this.uniforms = {
      uTime: { value: 0 },
      uEnergy: { value: 0.2 },
      uTurbulence: { value: 0.3 },
      uColorDeep: { value: new THREE.Color(palette.energy700) },
      uColorMid: { value: new THREE.Color(palette.energy500) },
      uColorHot: { value: new THREE.Color(palette.energy100) },
      uColorWhite: { value: new THREE.Color(palette.energyWhite) },
    };
    const geo = new THREE.SphereGeometry(geometry.coreRadius, segments, Math.round(segments * 0.66));
    const mat = new THREE.ShaderMaterial({
      vertexShader: noise + vert,
      fragmentShader: noise + frag,
      uniforms: this.uniforms,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  update(dt: number, live: LiveState) {
    const { params } = live;
    const energy = Math.min(1.4, params.coreEnergy + live.energyPulse * 0.5);
    this.uniforms.uTime.value = live.time;
    this.uniforms.uEnergy.value = energy;
    this.uniforms.uTurbulence.value = params.turbulence;
    const s = live.coreRadius;
    this.mesh.scale.setScalar(s);
    this.mesh.rotation.y += dt * 0.08 * (live.reducedMotion ? 0.2 : 1);
    this.mesh.rotation.z += dt * 0.02;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
