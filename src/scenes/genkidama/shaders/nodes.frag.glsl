uniform float uTime;

varying vec3 vColor;
varying float vAlpha;
varying float vEnergy;
varying float vActive;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  // Instrument glyph: a thin outer ring, a gap, and a dot whose radius is the
  // node's energy level. Active nodes get a rotating tick on the ring.
  float ring = smoothstep(0.02, 0.0, abs(d - 0.40)) * 0.9;
  float dotR = 0.06 + vEnergy * 0.12;
  float dot_ = smoothstep(dotR, dotR - 0.03, d);
  float ang = atan(uv.y, uv.x + 1e-5); // atan(0, 0) is undefined
  float tick = smoothstep(0.03, 0.0, abs(d - 0.40)) * step(0.985, cos(ang - uTime * 1.8)) * vActive;
  // Charged halo when streaming.
  float halo = exp(-d * d * 30.0) * vActive * 0.6;

  float a = (ring * 0.55 + dot_ + tick * 2.0 + halo) * vAlpha;
  a *= smoothstep(0.5, 0.45, d);
  if (a < 0.003) discard;
  vec3 col = mix(vColor, vec3(1.0), dot_ * vActive * 0.4);
  gl_FragColor = vec4(col * a, a);
}
