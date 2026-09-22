uniform float uTime;
uniform float uVisible;   // 0..1 draw progress + opacity
uniform float uActivity;  // how much traffic is on the bus
uniform float uOffset;    // per ring phase
uniform vec3 uColor;

varying float vT;

void main() {
  // The ring draws itself in from its seam and is fully present by 60% of
  // its phase, so the layer reads as "arrived" while the text is on screen.
  float vis = smoothstep(0.0, 0.6, uVisible);
  float drawn = step(vT, vis * 1.02);
  // Routing bus: packets travel along the loop; density scales with activity.
  float packets = pow(0.5 + 0.5 * sin((vT * 28.0 - uTime * 1.6 + uOffset) * 6.28318), 12.0);
  float base = 0.18 + 0.12 * vis;
  float a = (base + packets * (0.2 + uActivity * 0.9)) * drawn * vis;
  gl_FragColor = vec4(uColor * a, a);
}
