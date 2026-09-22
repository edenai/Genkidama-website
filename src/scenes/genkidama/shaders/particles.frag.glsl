varying vec3 vColor;
varying float vAlpha;
varying float vSpark;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  // Crisp bright center with a short soft skirt. Not a blurry blob.
  float center = smoothstep(0.18, 0.02, d);
  float skirt = smoothstep(0.5, 0.12, d) * 0.28;
  float a = (center + skirt) * vAlpha;
  a += center * vSpark * 0.8;
  if (a < 0.003) discard;
  vec3 col = vColor + vSpark * 0.35;
  gl_FragColor = vec4(col * a, a);
}
