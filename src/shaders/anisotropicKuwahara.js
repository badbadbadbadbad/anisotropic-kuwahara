/**
 * Anisotropic Kuwahara filter.
 *
 * The original Kuwahara filter left box-shaped and flicker artifacts and did not work well.
 * Kuwahara M., Hachimura K., Eiho S., Kinoshita M.:
 * Digital processing of biomedical images.
 * Plenum Press, 1976, 187–203.
 *
 * One improved version is the Generalized Kuwahara filter,
 * making use of a circular kernel and taking a weighted average.
 * Papari G., Petkov N., Campisi P.:
 * Artistic edge and corner enhancing smoothing.
 * IEEE Transactions on Image Processing 16, 10 (2007), 2449–2462.
 *
 * A futher improvement is the Anisotropic Kuwahara filter,
 * adapting the circular kernel into an ellipsis shape to take
 * local anisotropy of the image into account.
 * Kyprianidis J. E., Kang H., Döllner J.:
 * Image and video abstraction by anisotropic kuwahara filtering.
 * Computer Graphics Forum 28, 7 (2009), 1955–1963. Special issue on Pacific Graphics 2009.
 *
 * The version implemented here uses polynomial approximations as weighting functions
 * instead of the original Anisotropic version's Gaussian functions
 * to speed up the computation.
 * Kyprianidis, J. E., Semmo, A., Kang, H., & Döllner, J.:
 * Anisotropic Kuwahara Filtering with Polynomial Weighting Functions.
 * EG UK Theory and Practice of Computer Graphics (2010), 25-30.
 *
 * Notes:
 * A sample implementation of this concept exists in the book
 * "GPU Pro: Advanced Rendering Techniques", chapter V.1.
 *
 * A nice visualized introduction to this filter (and my inspiration):
 * https://www.youtube.com/watch?v=LDhN-JK3U9g
 */

import * as THREE from "three"; // eslint-disable-line import/no-unresolved

const anisotropicKuwaharaShader = {
  name: "Anisotropic Kuwahara Shader",

  uniforms: {
    tDiffuse: { value: null },
    inputTex: { value: null },
    resolution: { value: new THREE.Vector2() },
    kernelRadius: { value: 3 },
    zetaModifier: { value: 1.0 },
    zeroCrossing: { value: 0.78 },
    sharpness: { value: 8.0 },
  },

  vertexShader: /* glsl version 300 es */ `
  // Uniforms
  uniform sampler2D tDiffuse;
  uniform sampler2D inputTex;
  uniform vec2 resolution;
  uniform int kernelRadius;
  uniform float zetaModifier;
  uniform float zeroCrossing;
  uniform float sharpness;

  // Outs
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }`,

  fragmentShader: /* glsl version 300 es */ `
  // Uniforms
  uniform sampler2D tDiffuse;
  uniform sampler2D inputTex;
  uniform vec2 resolution;
  uniform int kernelRadius;
  uniform float zetaModifier;
  uniform float zeroCrossing;
  uniform float sharpness;

  // Ins
  in vec2 vUv;

  // Outs


  void main() {
    vec2 texelSize = vec2(1. / resolution.x, 1. / resolution.y);

    // st = structure
    vec4 st = texture2D(tDiffuse, vUv);
    float lambda1 = 0.5 * (st.y + st.x + sqrt((st.y * st.y) - (2. * st.x * st.y) + (st.x * st.x) + (4. * st.z * st.z)));
    float lambda2 = 0.5 * (st.y + st.x - sqrt((st.y * st.y) - (2. * st.x * st.y) + (st.x * st.x) + (4. * st.z * st.z)));

    vec2 v = vec2(lambda1 - st.x, -st.z);
    vec2 t = length(v) > 0.0 ? normalize(v) : vec2(0., 1.);
    float phi = atan(t.y, t.x);
    float A = (lambda1 + lambda2 > 0.) ? (lambda1 - lambda2) / (lambda1 + lambda2) : 0.;

    float alpha = 1.;
    float a = float(kernelRadius) * clamp((alpha + A) / alpha, float(kernelRadius) * 0.5, float(kernelRadius) * 2.);
    float b = float(kernelRadius) * clamp(alpha / (alpha + A), float(kernelRadius) * 0.5, float(kernelRadius));

    float cosPhi = cos(phi);
    float sinPhi = sin(phi);

    mat2 R = mat2(cosPhi, -sinPhi, sinPhi, cosPhi);
    mat2 S = mat2(1. / a, 0., 0., 1. / b);
    mat2 SR = S * R;

    // https://math.stackexchange.com/questions/91132/how-to-get-the-limits-of-rotated-ellipse
    int maxX = int(sqrt(a * a * cosPhi * cosPhi + b * b * sinPhi * sinPhi));
    int maxY = int(sqrt(a * a * sinPhi * sinPhi + b * b * cosPhi * cosPhi));

    float zeta = 2.0 / float(kernelRadius) * zetaModifier;
    float sinZeroCrossing = sin(zeroCrossing);
    float eta = (zeta + cos(zeroCrossing)) / (sinZeroCrossing * sinZeroCrossing);

    int k;
    vec4 m[8];
    vec3 s[8];

    for (k = 0; k < 8; k++) {
      m[k] = vec4(0.);
      s[k] = vec3(0.);
    }

    for (int y = -maxY; y <= maxY; y++) {
      for (int x = -maxX; x <= maxX; x++) {
        v = SR * vec2(x, y);
        if (dot(v, v) <= 1.) {
          vec3 tex = texture2D(inputTex, vUv + vec2(x, y) * texelSize).rgb;
          tex = clamp(tex, 0., 1.);

          float sum = 0.;
          float w[8];
          float z;
          float vxx;
          float vyy;


          // Polynomial weights 0/2/4/6
          vxx = zeta - eta * v.x * v.x;
          vyy = zeta - eta * v.y * v.y;

          z = max(0., v.y + vxx);
          w[0] = z * z;
          sum += w[0];
          z = max(0., -v.x + vyy); 
          w[2] = z * z;
          sum += w[2];
          z = max(0., -v.y + vxx); 
          w[4] = z * z;
          sum += w[4];
          z = max(0., v.x + vyy); 
          w[6] = z * z;
          sum += w[6];

          // Rotate by 1/4 PI
          v = sqrt(2.) / 2. * vec2(v.x - v.y, v.x + v.y);

          // Polynomial weights 1/3/5/7
          vxx = zeta - eta * v.x * v.x;
          vyy = zeta - eta * v.y * v.y;
          z = max(0., v.y + vxx); 
          w[1] = z * z;
          sum += w[1];
          z = max(0., -v.x + vyy); 
          w[3] = z * z;
          sum += w[3];
          z = max(0., -v.y + vxx); 
          w[5] = z * z;
          sum += w[5];
          z = max(0., v.x + vyy); 
          w[7] = z * z;
          sum += w[7];

          // Rough gauss approximation, but cheaper and good enough
          float g = exp(-3.125 * dot(v, v)) / sum;

          for (int k = 0; k < 8; k++) {
            float wk = w[k] * g;
            m[k] += vec4(tex * wk, wk);
            s[k] += tex * tex * wk;
          }
        }
      }
    }


    for (k = 0; k < 8; k++) {
      m[k].xyz /= m[k].w;
      s[k] = abs(s[k] / m[k].w - m[k].xyz * m[k].xyz);

      float sigma = s[k].x + s[k].y + s[k].z;
      float w = 1. / (1. + pow(1000. * sigma * 8.0, 0.5 * sharpness));

      gl_FragColor += vec4(m[k].rgb * w, w);
    }

    gl_FragColor = clamp(gl_FragColor / gl_FragColor.w, 0., 1.);
  }`,

  glslVersion: THREE.GLSL3,
};

export default anisotropicKuwaharaShader;
