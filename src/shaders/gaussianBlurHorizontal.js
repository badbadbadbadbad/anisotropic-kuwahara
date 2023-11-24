/**
 * Normal 2D Gaussian blur.
 * This is the first half of the blur.
 *
 * Notes:
 *  - The Gaussian function could be replaced by precomputed values to improve runtime.
 */

import * as THREE from "three"; // eslint-disable-line import/no-unresolved

const gaussianBlurHorizontalShader = {
  name: "Gaussian Blur Horizontal Shader",

  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
  },

  vertexShader: /* glsl version 300 es */ `
  // Uniforms
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;

  // Outs
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }`,

  fragmentShader: /* glsl version 300 es */ `
  #define PI 3.14159265358979323846

  // Uniforms
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;

  // Ins
  in vec2 vUv;

  // Outs

  float gaussian(float sigma, float xOffset) {
    return (1. / sigma * sqrt(2. * PI)) * exp(-(xOffset * xOffset) / (2. * sigma * sigma));
  }

  void main() {
    vec2 texelSize = vec2(1. / resolution.x, 1. / resolution.y);

    int kernelRadius = 7;
    float kernelSum = 0.;

    for (int xOffset = -kernelRadius; xOffset <= kernelRadius; xOffset++) {
      vec4 color = texture2D(tDiffuse, vUv + vec2(float(xOffset) * texelSize.x, 0));
      float gauss = gaussian(2., float(xOffset));

      gl_FragColor += color;
      kernelSum += gauss;
    }

    gl_FragColor = vec4(gl_FragColor.rgb / kernelSum, 1.);
  }`,

  glslVersion: THREE.GLSL3,
};

export default gaussianBlurHorizontalShader;
