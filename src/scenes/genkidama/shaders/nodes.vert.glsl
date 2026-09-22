#define NODE_COUNT 8

attribute float aIndex;

uniform float uDpr;
uniform float uNodeSpread;
uniform float uNodeAlpha;
uniform vec3 uNodePos[NODE_COUNT];
uniform vec3 uNodeColor[NODE_COUNT];
uniform float uNodeEnergy[NODE_COUNT];
uniform float uStream[NODE_COUNT];

varying vec3 vColor;
varying float vAlpha;
varying float vEnergy;
varying float vActive;

void main() {
  int idx = int(aIndex + 0.5);
  vec3 p = uNodePos[idx] * uNodeSpread;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 46.0 * uDpr * (7.5 / -mv.z);
  vColor = uNodeColor[idx];
  vAlpha = uNodeAlpha;
  vEnergy = uNodeEnergy[idx];
  vActive = uStream[idx];
}
