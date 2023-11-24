/**
 * Calculate structure shader on a per-pixel basis.
 * We use the Sobel operator as the function.
 *
 * Brox T., Boomgaard R., Lauze F., Weijer J., Weickert J., Mrázek P., Kornprobst P.:
 * Adaptive structure tensors and their applications.
 * Visualization and Processing of Tensor Fields (2006), 17–47.
 *
 * Notes:
 *  - The Sobel filter could be optimized slightly more by removing duplicate samplings, but is left as is for readability.
 *  - The source for this is the book "GPU Pro Advanced Rendering Techniques", which normalized the Sobel operator by 1/4.
 *    As such, this implementation uses the same normalizing factor.
 */

import * as THREE from "three"; // eslint-disable-line import/no-unresolved

const structureTensorShader = {
  name: "Structure Tensor Shader",

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
  // Uniforms
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;

  // Ins
  in vec2 vUv;

  // Outs

  void main() {
    vec2 texelSize = vec2(1. / resolution.x, 1. / resolution.y);

    vec3 Sx = (
      1. * texture2D(tDiffuse, vUv + vec2(-texelSize.x, -texelSize.y)).rgb + 
      2. * texture2D(tDiffuse, vUv + vec2(-texelSize.x, 0.)).rgb + 
      1. * texture2D(tDiffuse, vUv + vec2(-texelSize.x, texelSize.y)).rgb + 
      -1. * texture2D(tDiffuse, vUv + vec2(texelSize.x, -texelSize.y)).rgb + 
      -2. * texture2D(tDiffuse, vUv + vec2(texelSize.x, 0.)).rgb + 
      -1. * texture2D(tDiffuse, vUv + vec2(texelSize.x, texelSize.y)).rgb
    ) / 4.;

    vec3 Sy = (
      1. * texture2D(tDiffuse, vUv + vec2(-texelSize.x, -texelSize.y)).rgb +
      2. * texture2D(tDiffuse, vUv + vec2(0., -texelSize.y)).rgb +
      1. * texture2D(tDiffuse, vUv + vec2(texelSize.x, -texelSize.y)).rgb +
      -1. * texture2D(tDiffuse, vUv + vec2(-texelSize.x, texelSize.y)).rgb +
      -2. * texture2D(tDiffuse, vUv + vec2(0., texelSize.y)).rgb +
      -1. * texture2D(tDiffuse, vUv + vec2(texelSize.x, texelSize.y)).rgb
    ) / 4.;

    // Structure tensor matrix is (SxSx, SxSy, SxSy, SySy)
    // We only care about the values for further processing, not the order
    gl_FragColor = vec4(dot(Sx, Sx), dot(Sy, Sy), dot(Sx, Sy), 1.);

    // Sobel edge detection output instead of using Sobel operator to create structure tensor
    /*
    float valueGx = dot(Sx, Sx);
    float valueGy = dot(Sy, Sy);
    float G = sqrt((valueGx * valueGx) + (valueGy * valueGy));
    gl_FragColor = vec4(vec3(G), 1.);
    */
  }`,

  glslVersion: THREE.GLSL3,
};

export default structureTensorShader;
