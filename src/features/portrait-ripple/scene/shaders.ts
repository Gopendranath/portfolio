export const rippleVertexShader = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const rippleFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform sampler2D uDisplacement;
  uniform vec2 uResolution;
  uniform float uIntensity;

  const float TAU = 6.283185307179586;

  void main() {
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    float displacement = texture2D(uDisplacement, screenUv).r;
    float angle = displacement * TAU;
    vec2 direction = vec2(sin(angle), cos(angle));
    vec2 uv = screenUv + direction * displacement * uIntensity;

    // Warp the alpha edge with the same vector so the image boundary ripples
    // instead of staying a rigid rectangle.
    float maskX =
      smoothstep(0.0, 0.004, uv.x) *
      (1.0 - smoothstep(0.996, 1.0, uv.x));
    float maskY =
      smoothstep(0.0, 0.004, uv.y) *
      (1.0 - smoothstep(0.996, 1.0, uv.y));
    vec4 texel = texture2D(uTexture, clamp(uv, 0.001, 0.999));

    gl_FragColor = vec4(texel.rgb, maskX * maskY);
  }
`
