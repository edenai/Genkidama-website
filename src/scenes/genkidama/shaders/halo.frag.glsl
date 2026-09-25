uniform float uTime;
uniform float uEnergy;
uniform vec3 uColor;
uniform vec3 uColorHot;

varying vec2 vUv;

void main() {
  float d = length(vUv);
  // Corona: steep inner falloff, long faint tail. Flickers slightly with noise.
  float flicker = 0.92 + 0.08 * snoise(vec3(vUv * 3.0, uTime * 0.8));
  float inner = exp(-d * d * 9.0);
  float outer = exp(-d * 3.2) * 0.45;
  // Anisotropic rays: a few soft spokes that rotate slowly.
  // atan(0, 0) is undefined (NaN on some GPUs); nudge x so the centre texel is finite.
  float ang = atan(vUv.y, vUv.x + 1e-5);
  float rays = pow(0.5 + 0.5 * sin(ang * 6.0 + uTime * 0.25), 6.0) * exp(-d * 2.2) * 0.35 * uEnergy;
  float a = (inner * (0.35 + uEnergy * 0.75) + outer * (0.3 + uEnergy * 0.7) + rays) * flicker;
  a *= smoothstep(1.0, 0.7, d);
  vec3 col = mix(uColor, uColorHot, inner * uEnergy);
  gl_FragColor = vec4(col * a, a);
}
