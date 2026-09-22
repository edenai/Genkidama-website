uniform float uTime;
uniform float uEnergy;
uniform float uTurbulence;
uniform vec3 uColorDeep;   // energy-700
uniform vec3 uColorMid;    // energy-500
uniform vec3 uColorHot;    // energy-100
uniform vec3 uColorWhite;  // energy-white

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying float vDisp;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - ndv, 2.4);

  // Flowing plasma inside the shell.
  vec3 q = N * 2.2 + vec3(uTime * 0.12, -uTime * 0.09, uTime * 0.05);
  float flow = fbm(q);
  float flow2 = fbm(q * 1.9 + vec3(4.2, 1.3, 9.1) + uTime * 0.2);

  // Filaments: ridged noise -> thin bright lines that crawl over the surface.
  float ridge = 1.0 - abs(snoise(N * (3.0 + uTurbulence * 2.0) + vec3(0.0, uTime * 0.35, 0.0)));
  float filaments = pow(ridge, 10.0 + (1.0 - uEnergy) * 14.0);

  // Base body: deep -> mid by flow; brighten with energy.
  vec3 body = mix(uColorDeep, uColorMid, smoothstep(-0.4, 0.6, flow));
  body = mix(body, uColorHot, smoothstep(0.2, 0.9, flow2) * (0.25 + uEnergy * 0.55));

  // Center is hottest when energy is high: a white-hot heart facing the viewer.
  float heart = pow(ndv, 3.0) * (0.08 + uEnergy * 1.1);
  vec3 col = body * (0.4 + uEnergy * 0.9);
  col += uColorWhite * heart;
  col += uColorHot * filaments * (0.35 + uEnergy * 1.6);

  // Rim: electric edge.
  col += mix(uColorMid, uColorHot, uEnergy) * fresnel * (0.6 + uEnergy * 1.4);

  // Slight darkening in displaced valleys gives the surface volume.
  col *= 1.0 + vDisp * 3.0;

  gl_FragColor = vec4(col, 1.0);
}
