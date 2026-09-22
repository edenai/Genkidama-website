import * as THREE from 'three';
import vert from './shaders/ring.vert.glsl?raw';
import frag from './shaders/ring.frag.glsl?raw';
import { palette, geometry } from '@config/visual';
import type { LiveState, Subsystem } from './types';

const RING_TILTS: [number, number, number][] = [
  [1.15, 0.0, 0.25],
  [-0.85, 0.6, 0.9],
  [0.3, 1.2, -1.05],
];

/**
 * The MCP routing layer: three great-circle "buses" at mid-radius between the
 * core and the capability nodes. They draw themselves in when the layer is
 * introduced and carry packets whose density follows total stream activity.
 */
export class MCPField implements Subsystem {
  readonly group = new THREE.Group();
  private readonly rings: THREE.Line<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];

  constructor(segments = 256) {
    RING_TILTS.forEach((tilt, i) => {
      const pos = new Float32Array((segments + 1) * 3);
      const t = new Float32Array(segments + 1);
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        pos[s * 3 + 0] = Math.cos(a) * geometry.ringRadius;
        pos[s * 3 + 1] = 0;
        pos[s * 3 + 2] = Math.sin(a) * geometry.ringRadius;
        t[s] = s / segments;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));
      const mat = new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTime: { value: 0 },
          uVisible: { value: 0 },
          uActivity: { value: 0 },
          uOffset: { value: i * 0.37 },
          uColor: { value: new THREE.Color(i === 0 ? palette.energy300 : palette.energy500) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.set(tilt[0], tilt[1], tilt[2]);
      line.frustumCulled = false;
      this.rings.push(line);
      this.group.add(line);
    });
  }

  update(dt: number, live: LiveState) {
    const activity = Math.min(1, live.stream.reduce((a, b) => a + b, 0) / 3);
    const spin = live.reducedMotion ? 0.15 : 1;
    this.rings.forEach((ring, i) => {
      const u = ring.material.uniforms;
      u.uTime!.value = live.time;
      u.uVisible!.value = live.params.mcp;
      u.uActivity!.value = activity;
      // Each bus precesses at its own slow rate.
      ring.rotation.y += dt * (0.05 + i * 0.03) * spin * (0.6 + live.params.spin * 0.4);
    });
    const s = live.ringRadius / geometry.ringRadius;
    this.group.scale.setScalar(s);
  }

  dispose() {
    for (const r of this.rings) {
      r.geometry.dispose();
      r.material.dispose();
    }
  }
}
