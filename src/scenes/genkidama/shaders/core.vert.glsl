uniform float uTime;
uniform float uTurbulence;
uniform float uEnergy;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying float vDisp;

void main() {
  vec3 p = position;
  // Slow breathing displacement; higher energy = more agitated surface.
  float n = fbm(normal * 1.6 + vec3(0.0, uTime * 0.18, uTime * 0.07));
  float n2 = snoise(normal * 5.0 - uTime * 0.6);
  float disp = n * (0.06 + uTurbulence * 0.09) + n2 * uTurbulence * 0.02;
  p += normal * disp;
  vDisp = disp;

  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
