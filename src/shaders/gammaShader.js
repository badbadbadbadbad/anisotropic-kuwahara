/**
 * Simple gamma correction.
 */

import * as THREE from "three"; // eslint-disable-line import/no-unresolved

const gammaShader = {
  name: "Gamma Shader",

  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
    gamma: { value: 0.6 },
  },

  vertexShader: /* glsl version 300 es */ `
  // Uniforms
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform float gamma;

  // Outs
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }`,

  fragmentShader: /* glsl version 300 es */ `
  // Uniforms
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform float gamma;

  // Ins
  in vec2 vUv;

  // Outs

  void main() {


    // We only care about the values for further processing, not the order
    // gl_FragColor = vec4(dot(Sx, Sx), dot(Sy, Sy), dot(Sx, Sy), 1.);

    vec4 gammaVec = vec4(gamma);

    gl_FragColor = pow(texture2D(tDiffuse, vUv), gammaVec);

  }`,

  glslVersion: THREE.GLSL3,
};

export default gammaShader;
