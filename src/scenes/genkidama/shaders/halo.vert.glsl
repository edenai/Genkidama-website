varying vec2 vUv;

void main() {
  vUv = uv * 2.0 - 1.0;
  // Billboard: strip rotation from the model-view matrix.
  vec4 mvCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float sx = length(vec3(modelMatrix[0]));
  float sy = length(vec3(modelMatrix[1]));
  vec4 mv = mvCenter + vec4(position.x * sx, position.y * sy, 0.0, 0.0);
  gl_Position = projectionMatrix * mv;
}
