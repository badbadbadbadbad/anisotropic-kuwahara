# Anisotropic Kuwahara Filtering

A simple website running the anisotropic Kuwahara filter on user-provided images, implemented as a THREE.js shader effect written in GLSL. [Live version running on GitHub Pages](https://badbadbadbadbad.github.io/anisotropic-kuwahara)

# Usage

Upload an image by dropping it into the website. Alternatively, access an upload menu by clicking (or tapping) the left/top scene. Then, adjust the filter parameters to your liking using the GUI in the top right, and download the filtered image for your personal use.

# References

- [Kuwahara filter](https://en.wikipedia.org/wiki/Kuwahara_filter): Kuwahara's original filter, proposed for the denoising of medical imaging. Due to the use of a square kernel, the images tend to look very "blocky".

- [Generalized Kuwahara filter](https://www.researchgate.net/publication/221226072_Edge_and_corner_preserving_smoothing_for_artistic_imaging): An improvement on the original Kuwahara filter through usage of a Gaussian Kernel. Provides improved smoothing, but still leaves the image looking too "blocky".

- [Anisotropic Kuwahara filter](https://www.kyprianidis.com/p/pg2009/jkyprian-pg2009.pdf): This version uses the local anisotropy of each pixel to change the kernel shape, thereby smoothing the image while respecting directionality of image regions and producing an image that appears to be created through water painting. Further improvements in efficiency can be made by using [polynomial weighting functions](https://www.umsl.edu/~kangh/Papers/kang-tpcg2010.pdf) to approximate the filter.

- [Video on Kuwahara filtering](https://www.youtube.com/watch?v=LDhN-JK3U9g): A YouTube video by Acerola where I first heard of the filter and got the inspiration to develop an in-browser version.

- [Image source](https://www.elitetreecare.com/2018/12/the-risk-of-snow-on-trees/)

- [Upload icon source](https://feathericons.com/?query=upload)
