attribute vec3 aColor;
attribute float aAlpha;
attribute float aSize;

uniform float uDpr;

varying vec3 vColor;
varying float vAlpha;
varying float vSpark;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uDpr * (7.0 / -mv.z);
  vColor = aColor;
  vAlpha = aAlpha;
  vSpark = aAlpha;
}
