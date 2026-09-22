uniform float uTime;
uniform float uActive;    // 0..1 stream activity
uniform float uPhaseOff;  // per-stream offset
uniform vec3 uColor;
uniform vec3 uColorHot;

varying float vT;
varying float vSide;

void main() {
  // Cross-section: bright thin filament with a faint sheath.
  float x = abs(vSide);
  float core = smoothstep(0.35, 0.0, x);
  float sheath = smoothstep(1.0, 0.2, x) * 0.25;

  // Energy travelling toward the core (t -> 1).
  float flow = pow(0.5 + 0.5 * sin((vT * 5.0 - uTime * 1.4 + uPhaseOff) * 6.28318), 6.0);
  float base = 0.12;
  float a = (base + flow * 0.9) * (core + sheath) * uActive;
  // Fade where it enters the node and the core.
  a *= smoothstep(0.0, 0.08, vT) * smoothstep(1.0, 0.92, vT);
  vec3 col = mix(uColor, uColorHot, vT * flow);
  gl_FragColor = vec4(col * a, a);
}
