/**
 * Full-screen textured quad shader
 */

const CopyShader = {
  name: "CopyShader",

  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
  },

  vertexShader: /* glsl version 300 es */ `
  // Uniforms
  uniform float opacity;
  uniform sampler2D tDiffuse;


  // Outs
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }`,

  fragmentShader: /* glsl version 300 es */ `
  // Uniforms
  uniform float opacity;
  uniform sampler2D tDiffuse;

  // Ins
  in vec2 vUv;

  // Outs
  // out vec4 fragColor;

  void main() {
    vec4 texel = texture2D( tDiffuse, vUv );
    gl_FragColor = opacity * texel;
  }`,

  glslVersion: "empty",
};

export default CopyShader;
