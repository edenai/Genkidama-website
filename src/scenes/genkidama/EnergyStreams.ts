import * as THREE from 'three';
import vert from './shaders/stream.vert.glsl?raw';
import frag from './shaders/stream.frag.glsl?raw';
import { palette } from '@config/visual';
import { CAPABILITY_COUNT } from '@data/capabilities';
import type { LiveState, Subsystem } from './types';

const UP = new THREE.Vector3(0, 1, 0);

/** Shared path definition so particles, ribbons and pulses agree on the route. */
export function streamPath(
  nodePos: THREE.Vector3,
  spread: number,
  ringRadius: number,
  coreRadius: number,
  out: { start: THREE.Vector3; ctrl: THREE.Vector3; end: THREE.Vector3 },
) {
  out.start.copy(nodePos).multiplyScalar(spread);
  const dir = out.end.copy(nodePos).normalize();
  const tangent = new THREE.Vector3().crossVectors(dir, UP).normalize();
  out.ctrl.copy(dir).multiplyScalar(ringRadius).addScaledVector(tangent, 0.35);
  out.end.copy(dir).multiplyScalar(coreRadius * 1.02);
}

/**
 * Energy streams: one thin screen-space ribbon per capability, from node to
 * MCP ring to core. Ribbons are faint carriers; the bright pulses that travel
 * on them are ToolCallPaths.
 */
export class EnergyStreams implements Subsystem {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
  private readonly scratch = { start: new THREE.Vector3(), ctrl: new THREE.Vector3(), end: new THREE.Vector3() };

  constructor(segments: number, nodeColors: THREE.Color[]) {
    // Shared geometry: a strip parameterised by (t, side).
    const verts = (segments + 1) * 2;
    const t = new Float32Array(verts);
    const side = new Float32Array(verts);
    const pos = new Float32Array(verts * 3);
    const idx: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const tt = i / segments;
      t[i * 2] = tt; t[i * 2 + 1] = tt;
      side[i * 2] = -1; side[i * 2 + 1] = 1;
      if (i < segments) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

    for (let i = 0; i < CAPABILITY_COUNT; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTime: { value: 0 },
          uActive: { value: 0 },
          uPhaseOff: { value: i * 0.17 },
          uStart: { value: new THREE.Vector3() },
          uCtrl: { value: new THREE.Vector3() },
          uEnd: { value: new THREE.Vector3() },
          uWidth: { value: 0.0045 },
          uAspect: { value: 1 },
          uColor: { value: nodeColors[i]!.clone() },
          uColorHot: { value: new THREE.Color(palette.energyWhite) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  update(_dt: number, live: LiveState) {
    for (let i = 0; i < CAPABILITY_COUNT; i++) {
      const m = this.meshes[i]!;
      const u = m.material.uniforms;
      streamPath(live.nodePositions[i]!, live.params.nodeSpread, live.ringRadius, live.coreRadius, this.scratch);
      (u.uStart!.value as THREE.Vector3).copy(this.scratch.start);
      (u.uCtrl!.value as THREE.Vector3).copy(this.scratch.ctrl);
      (u.uEnd!.value as THREE.Vector3).copy(this.scratch.end);
      u.uTime!.value = live.time;
      u.uActive!.value = live.stream[i]! * live.params.nodeAlpha;
      u.uAspect!.value = live.aspect;
      u.uWidth!.value = 0.0035 + live.stream[i]! * 0.004;
      m.visible = live.stream[i]! > 0.01 && live.params.nodeAlpha > 0.01;
    }
  }

  dispose() {
    this.meshes[0]?.geometry.dispose();
    for (const m of this.meshes) m.material.dispose();
  }
}
