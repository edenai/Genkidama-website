uniform float uTime;
uniform float uActive;    // 0..1 stream activity
uniform float uReach;     // 0..1 how far from the core the ribbon extends; 1 = connected
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

  // Reach: the ribbon exists only from the core (t = 1) back to `cut`. While
  // it is not connected, energy flows outward (core -> node) and piles up at
  // the tip; once connected it flows toward the core as before.
  float cut = 1.0 - uReach;
  float connected = smoothstep(0.96, 1.0, uReach);
  float dirT = mix(-vT, vT, connected);
  float flow = pow(0.5 + 0.5 * sin((dirT * 5.0 - uTime * 1.4 + uPhaseOff) * 6.28318), 6.0);
  // An unconnected ribbon is a solid probe, not a faint carrier.
  float base = mix(0.34, 0.12, connected);
  float a = (base + flow * 0.9) * (core + sheath) * uActive;
  // Fade where it enters the node and the core.
  a *= smoothstep(0.0, 0.08, vT) * smoothstep(1.0, 0.92, vT);
  // Stop short of the node; a brighter knot marks where the reach ends.
  a *= smoothstep(cut - 0.03, cut + 0.03, vT);
  float tip = exp(-abs(vT - cut) * 30.0) * (1.0 - connected) * (core + sheath) * uActive * 0.9;
  a += tip;
  vec3 col = mix(uColor, uColorHot, clamp(vT * flow + tip, 0.0, 1.0));
  gl_FragColor = vec4(col * a, a);
}
