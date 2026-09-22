import * as THREE from 'three';

/**
 * Pointer → field influence. The cursor is a disturbance, not a controller:
 * its strength follows pointer velocity, so a resting cursor leaves the field
 * alone and a sweeping gesture bends it. Disabled for coarse pointers and
 * reduced motion.
 */
export class InteractionController {
  /** Normalised device coords, -1..1 */
  readonly ndc = new THREE.Vector2(0, 0);
  /** Smoothed NDC used for camera parallax */
  readonly parallax = new THREE.Vector2(0, 0);
  /** World-space point on the z = 0 plane */
  readonly world = new THREE.Vector3(0, 0, 0);
  strength = 0;

  private targetStrength = 0;
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private readonly ray = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly enabled: boolean;

  constructor(private readonly el: HTMLElement, disabled: boolean) {
    this.enabled = !disabled && !window.matchMedia('(pointer: coarse)').matches;
    if (this.enabled) {
      window.addEventListener('pointermove', this.onMove, { passive: true });
      window.addEventListener('pointerleave', this.onLeave, { passive: true });
    }
  }

  private onMove = (e: PointerEvent) => {
    const now = performance.now();
    const dt = Math.max(1, now - this.lastT);
    const vx = (e.clientX - this.lastX) / dt;
    const vy = (e.clientY - this.lastY) / dt;
    const speed = Math.hypot(vx, vy); // px per ms
    this.targetStrength = Math.min(1, speed * 1.6);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastT = now;
    const r = this.el.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };

  private onLeave = () => {
    this.targetStrength = 0;
  };

  update(dt: number, camera: THREE.Camera, system: THREE.Object3D) {
    // Velocity-driven strength: fast attack, slow release.
    const k = this.targetStrength > this.strength ? 12 : 2.2;
    this.strength += (this.targetStrength - this.strength) * (1 - Math.exp(-k * dt));
    this.targetStrength *= Math.exp(-4 * dt);
    this.parallax.lerp(this.ndc, 1 - Math.exp(-3 * dt));

    if (!this.enabled) return;
    this.ray.setFromCamera(this.ndc, camera);
    if (this.ray.ray.intersectPlane(this.plane, this.world)) {
      system.worldToLocal(this.world);
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerleave', this.onLeave);
  }
}
