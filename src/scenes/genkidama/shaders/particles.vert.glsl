#define NODE_COUNT 8

attribute vec4 aSeed;   // 4 uniform randoms
attribute float aKind;  // 0 = ambient, 1 = capability-bound
attribute float aNode;  // node index for kind 1

uniform float uTime;
uniform float uDpr;
uniform float uSize;
uniform float uGather;
uniform float uEnergy;
uniform float uTurbulence;
uniform float uAmbient;
uniform float uCoreRadius;
uniform float uRingRadius;
uniform float uNodeAlpha;
uniform float uNodeSpread;
uniform vec3 uNodePos[NODE_COUNT];
uniform vec3 uNodeColor[NODE_COUNT];
uniform float uStream[NODE_COUNT];
uniform vec3 uMouse;
uniform float uMouseStrength;
uniform vec3 uColorA;  // energy-700
uniform vec3 uColorB;  // energy-300
uniform vec3 uColorC;  // energy-white

varying vec3 vColor;
varying float vAlpha;
varying float vSpark;

vec3 bezier(vec3 a, vec3 b, vec3 c, float t) {
  float u = 1.0 - t;
  return u * u * a + 2.0 * u * t * b + t * t * c;
}

void main() {
  vec3 p;
  vec3 col;
  float alpha;
  float spark = 0.0;
  float sizeMul = 1.0;

  if (aKind < 0.5) {
    // ---- Ambient field ------------------------------------------------
    // Uniform-ish shell distribution between inner and outer radii, then
    // pulled toward a tight shell around the core as `gather` rises.
    float shellT = pow(aSeed.x, 1.4);
    float rFar = mix(2.4, 8.5, shellT);
    float rNear = uCoreRadius * 1.35 + shellT * 1.4;
    // Each particle joins the gathering at a slightly different threshold:
    // the field collapses progressively rather than all at once.
    float g = smoothstep(aSeed.w * 0.6, aSeed.w * 0.6 + 0.4, uGather);
    float r = mix(rFar, rNear, g);

    float speed = (0.05 + aSeed.y * 0.12) * (1.0 + g * 3.0 + uEnergy * 0.8);
    float theta = aSeed.y * 6.28318 + uTime * speed;
    float phi = acos(2.0 * aSeed.z - 1.0);
    // Slightly flattened disc bias so the field reads as an orbital system.
    float flatten = mix(0.72, 1.0, g);
    p = vec3(r * sin(phi) * cos(theta), r * cos(phi) * flatten, r * sin(phi) * sin(theta));

    // Turbulence, stronger when free, calmer when captured.
    vec3 flow = curl(p * 0.28 + vec3(0.0, uTime * 0.045, 0.0));
    p += flow * (0.55 * (1.0 - g) + 0.12) * (0.4 + uTurbulence);

    float depth = 1.0 - smoothstep(rNear, 8.5, r);
    col = mix(uColorA, uColorB, depth * 0.8 + g * 0.5);
    col = mix(col, uColorC, g * g * 0.5);
    alpha = (0.2 + 0.55 * pow(aSeed.z, 2.5)) * uAmbient;
    alpha *= mix(0.55, 1.0, g);
    sizeMul = 0.8 + aSeed.w * 0.9 + g * 0.5;
    spark = step(0.965, aSeed.w) * (0.5 + 0.5 * sin(uTime * 3.0 + aSeed.x * 40.0));
  } else {
    // ---- Capability-bound particles -----------------------------------
    int idx = int(aNode + 0.5);
    vec3 anchor = uNodePos[idx] * uNodeSpread;
    vec3 dir = normalize(anchor);
    // Control point on the MCP ring, offset tangentially so streams arc.
    vec3 tangent = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(0.001));
    vec3 ctrl = dir * uRingRadius + tangent * (aSeed.z - 0.5) * 1.6;
    vec3 target = dir * uCoreRadius * 1.05;

    float streaming = uStream[idx];
    // Fraction of this node's particles that are currently in the stream.
    float inStream = step(aSeed.y, streaming);

    // Local orbit around the node.
    float orbR = 0.18 + aSeed.x * 0.42;
    float orbSpeed = 0.35 + aSeed.w * 0.8;
    float a1 = aSeed.z * 6.28318 + uTime * orbSpeed;
    vec3 orbit = anchor + vec3(cos(a1) * orbR, sin(a1 * 1.3 + aSeed.x) * orbR * 0.7, sin(a1) * orbR);

    // Travel along the path toward the core, looping.
    float t = fract(aSeed.w + uTime * (0.14 + aSeed.x * 0.18) * (0.6 + streaming));
    vec3 travel = bezier(anchor, ctrl, target, t);
    travel += curl(travel * 0.9 + uTime * 0.2) * 0.08;

    p = mix(orbit, travel, inStream);

    col = uNodeColor[idx];
    // Streaming particles heat up as they approach the core.
    col = mix(col, uColorC, inStream * t * t * 0.7);
    float travelFade = inStream * smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.9, t);
    alpha = mix(0.35 + aSeed.x * 0.3, 0.9 * travelFade, inStream) * uNodeAlpha;
    sizeMul = mix(0.9 + aSeed.x * 0.6, 1.3 + t * 0.6, inStream);
    spark = inStream * 0.35;
  }

  // ---- Cursor: a soft repulsion in the view plane --------------------
  vec3 dm = p - uMouse;
  float dist = length(dm.xy);
  float force = uMouseStrength * exp(-dist * dist * 0.9);
  p.xy += normalize(dm.xy + vec2(0.0001)) * force * 0.7;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = uSize * sizeMul * uDpr * (1.0 + uEnergy * 0.35);
  gl_PointSize = clamp(size * (6.0 / -mv.z), 1.0, 22.0 * uDpr);

  vColor = col;
  vAlpha = alpha;
  vSpark = spark;
}
