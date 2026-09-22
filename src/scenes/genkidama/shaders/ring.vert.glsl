attribute float aT; // 0..1 around the loop

varying float vT;

void main() {
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
