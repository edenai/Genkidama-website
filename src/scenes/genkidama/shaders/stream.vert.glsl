// Screen-space ribbon along a quadratic Bezier: start (node) -> ctrl (ring) -> end (core).
attribute float aT;     // 0..1 along the curve
attribute float aSide;  // -1 / +1

uniform vec3 uStart;
uniform vec3 uCtrl;
uniform vec3 uEnd;
uniform float uWidth;   // in clip units
uniform float uAspect;

varying float vT;
varying float vSide;

vec3 bezier(vec3 a, vec3 b, vec3 c, float t) {
  float u = 1.0 - t;
  return u * u * a + 2.0 * u * t * b + t * t * c;
}

void main() {
  vT = aT;
  vSide = aSide;
  vec3 p = bezier(uStart, uCtrl, uEnd, aT);
  vec3 p2 = bezier(uStart, uCtrl, uEnd, min(aT + 0.01, 1.0));

  vec4 clip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vec4 clip2 = projectionMatrix * modelViewMatrix * vec4(p2, 1.0);
  vec2 s1 = clip.xy / clip.w;
  vec2 s2 = clip2.xy / clip2.w;
  vec2 dir = normalize((s2 - s1) * vec2(uAspect, 1.0) + vec2(0.0001));
  vec2 normal = vec2(-dir.y, dir.x) / vec2(uAspect, 1.0);

  // Taper at both ends; thickest near the ring.
  float taper = sin(aT * 3.14159) * 0.7 + 0.3;
  clip.xy += normal * aSide * uWidth * taper * clip.w;
  gl_Position = clip;
}
