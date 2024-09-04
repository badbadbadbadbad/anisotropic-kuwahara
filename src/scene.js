/* eslint no-restricted-syntax: 0 */ // Just let me use for .. of

import * as THREE from "three"; // eslint-disable-line import/no-unresolved
import Stats from "three/examples/jsm/libs/stats.module";
import { GUI } from "dat.gui";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer";
import { RenderPass } from "three/addons/postprocessing/RenderPass";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass";
import structureTensorShader from "./shaders/structureTensor";
import gaussianBlurXShader from "./shaders/gaussianBlurX";
import gaussianBlurYShader from "./shaders/gaussianBlurY";
import anisotropicKuwaharaShader from "./shaders/anisotropicKuwahara";
import gammaShader from "./shaders/gammaShader";

import uploadIcon from "./icon/upload.svg";

// Image source
// https://www.elitetreecare.com/2018/12/the-risk-of-snow-on-trees/
import snowImage from "./img/snow.png";

// Border colour for renderer canvas. Same as other borders in website.
const hexColor = "#b1acc7";

// Switch to true if Stats.js FPS counter should be used.
const useFPSCounter = false;

// Desired maximum FPS of image rendering.
// Change as needed, but it's a static image so we really don't need much and can save computing power.
const maxFPS = 4;

function setupScene() {
  // Get HTML container element for scenes
  const leftContainerHTML = document.getElementById("left-canvas");
  const rightContainerHTML = document.getElementById("right-canvas");
  const fileInputHTML = document.getElementById("file-input");

  const leftCanvas = {
    container: leftContainerHTML,
    renderer: null,
    camera: null,
    scene: null,
  };

  const rightCanvas = {
    container: rightContainerHTML,
    renderer: null,
    camera: null,
    scene: null,
    composer: null,
    shaders: null,
  };

  // ! Setup for both canvases
  for (const canvas of [leftCanvas, rightCanvas]) {
    // Scene
    canvas.scene = new THREE.Scene();
    canvas.scene.background = new THREE.Color(0x1c1c1f);

    // Canvas planes to project image on
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x1c1c1f });
    canvas.scene.add(new THREE.Mesh(geometry, material));

    // Camera
    const width = canvas.container.clientWidth;
    const height = canvas.container.clientHeight;
    canvas.camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    canvas.camera.position.z = 5;

    // Set camera position to look directly at the plane from above
    canvas.camera.position.set(0, 0, 1);
    canvas.camera.lookAt(canvas.scene.position);

    // Renderer
    canvas.renderer = new THREE.WebGLRenderer();
    canvas.renderer.preserveDrawingBuffer = true;
    canvas.renderer.setSize(canvas.container.clientWidth, canvas.container.clientHeight);
    canvas.container.appendChild(canvas.renderer.domElement);
    canvas.renderer.domElement.style.border = `2px solid ${hexColor}`;
    canvas.renderer.domElement.style.borderRadius = "5px";
  }

  // ! Optional FPS counter from Stats.js (Three.js plugin version)
  const stats = new Stats();
  if (useFPSCounter) {
    stats.showPanel(0);
    stats.domElement.style.position = "absolute";
    rightContainerHTML.appendChild(stats.domElement);
  }

  // ! Postprocessing pipeline initialization
  rightCanvas.composer = new EffectComposer(rightCanvas.renderer);

  const renderPass = new RenderPass(rightCanvas.scene, rightCanvas.camera);
  rightCanvas.composer.addPass(renderPass);

  const effectStructureTensor = new ShaderPass(structureTensorShader);
  rightCanvas.renderer.getSize(effectStructureTensor.uniforms.resolution.value);
  rightCanvas.composer.addPass(effectStructureTensor);

  const effectGaussianBlurX = new ShaderPass(gaussianBlurXShader);
  rightCanvas.renderer.getSize(effectGaussianBlurX.uniforms.resolution.value);
  rightCanvas.composer.addPass(effectGaussianBlurX);

  const effectGaussianBlurY = new ShaderPass(gaussianBlurYShader);
  rightCanvas.renderer.getSize(effectGaussianBlurY.uniforms.resolution.value);
  rightCanvas.composer.addPass(effectGaussianBlurY);

  const effectKuwahara = new ShaderPass(anisotropicKuwaharaShader);
  rightCanvas.renderer.getSize(effectKuwahara.uniforms.resolution.value);
  rightCanvas.composer.addPass(effectKuwahara);

  const effectGamma = new ShaderPass(gammaShader);
  rightCanvas.composer.addPass(effectGamma);

  // ! Collect shader passes into object to make it more readable
  rightCanvas.shaders = {
    structureTensor: effectStructureTensor,
    gaussX: effectGaussianBlurX,
    gaussY: effectGaussianBlurY,
    kuwahara: effectKuwahara,
    gamma: effectGamma,
  };

  // ! Image container
  const imageData = {
    dataURL: snowImage,
    texture: new THREE.Texture(),
    aspectRatio: 0,
  };

  // ! Upload icon
  const uploadIconHTML = document.createElement("img");
  uploadIconHTML.src = uploadIcon;
  uploadIconHTML.id = "upload-icon";

  const iconContainerHTML = document.createElement("div");
  iconContainerHTML.id = "icon-container";
  iconContainerHTML.appendChild(uploadIconHTML);
  leftContainerHTML.appendChild(iconContainerHTML);

  const icon = {
    iconContainer: iconContainerHTML,
  };

  // ! First image scene load
  reloadImageScene(leftCanvas, rightCanvas, imageData, icon, true);

  // ! Handle container resize
  window.addEventListener("resize", () => {
    reloadImageScene(leftCanvas, rightCanvas, imageData, icon);
  });

  // ! Drag and drop image upload
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  document.body.addEventListener("drop", async (event) => {
    // Get first file only in case of multi-upload
    const file = event.dataTransfer.files[0];

    if (isImage(file)) {
      try {
        imageData.dataURL = await readImage(file);
        reloadImageScene(leftCanvas, rightCanvas, imageData, icon, true);
      } catch (error) {
        console.error("Error reading dropped image:", error);
      }
    }
  });

  // ! Click image upload
  leftCanvas.renderer.domElement.addEventListener("click", () => {
    fileInputHTML.click();
  });

  fileInputHTML.addEventListener("change", async (event) => {
    // Get first file only in case of multi-upload
    const file = event.target.files[0];

    if (isImage(file)) {
      try {
        imageData.dataURL = await readImage(file);
        reloadImageScene(leftCanvas, rightCanvas, imageData, icon, true);
      } catch (error) {
        console.error("Error reading uploaded image:", error);
      }
    }
  });

  // ! Icon opacity on left scene hover
  leftCanvas.renderer.domElement.addEventListener("mouseenter", () => {
    uploadIconHTML.style.opacity = 0.9;
  });

  leftCanvas.renderer.domElement.addEventListener("mouseleave", () => {
    uploadIconHTML.style.opacity = 0;
  });

  // ! GUI
  setupGUI(rightCanvas.shaders, rightCanvas.renderer, rightCanvas.composer);

  // ! Start animation
  const clock = new THREE.Clock();
  let delta = 0;
  const interval = 1 / maxFPS;

  const animate = () => {
    requestAnimationFrame(animate);
    delta += clock.getDelta();

    if (delta > interval) {
      if (useFPSCounter) {
        stats.begin();
      }

      // The actual render calls
      leftCanvas.renderer.render(leftCanvas.scene, leftCanvas.camera);
      rightCanvas.composer.render();

      delta %= interval;

      if (useFPSCounter) {
        stats.end();
      }
    }
  };

  animate();
}

function reloadImageScene(left, right, imageData, icon, updateTex = false) {
  loadImageTexture(imageData, updateTex)
    .then(() => {
      const canvasAspectRatio = right.container.clientWidth / right.container.clientHeight;

      let height;
      let width;
      if (imageData.aspectRatio >= canvasAspectRatio) {
        // Image reaches left/right of screen
        width = right.container.clientWidth;
        height = width / imageData.aspectRatio;
      } else {
        // Image reaches top/bottom of screen
        height = right.container.clientHeight;
        width = height * imageData.aspectRatio;
      }

      if (updateTex) {
        const mat = new THREE.MeshBasicMaterial({ map: imageData.texture });
        left.scene.children[0].material = mat;
        right.scene.children[0].material = mat;
        right.shaders.kuwahara.uniforms.inputTex.value = imageData.texture;
      }

      // Uniforms
      updateUniforms(right.shaders, new THREE.Vector2(width, height));

      // Scaling
      left.scene.children[0].scale.x = width;
      left.scene.children[0].scale.y = height;

      right.scene.children[0].scale.x = width;
      right.scene.children[0].scale.y = height;

      // Set renderers and cameras to plane size
      left.renderer.setSize(width, height);
      left.camera.left = -width / 2;
      left.camera.right = width / 2;
      left.camera.top = height / 2;
      left.camera.bottom = -height / 2;
      left.camera.updateProjectionMatrix();

      right.renderer.setSize(width, height);
      right.composer.setSize(width, height);
      right.camera.left = -width / 2;
      right.camera.right = width / 2;
      right.camera.top = height / 2;
      right.camera.bottom = -height / 2;
      right.camera.updateProjectionMatrix();

      // Change icon container size
      const iconContainerHTML = icon.iconContainer;
      iconContainerHTML.style.width = `${width}px`;
      iconContainerHTML.style.height = `${height}px`;
    })
    .catch((error) => {
      console.error("Texture loading failed:", error);
    });
}

function loadImageTexture(imageData, updateTex) {
  // Blank return if no new texture to load
  if (!updateTex) {
    return Promise.resolve();
  }

  imageData.texture.dispose();

  const textureLoader = new THREE.TextureLoader();
  return new Promise((resolve, reject) => {
    textureLoader.load(
      imageData.dataURL,
      (texture) => {
        // From linearSRGB to SRGB
        texture.colorSpace = THREE.SRGBColorSpace;

        // Save image aspect ratio for resize handler
        imageData.texture = texture;
        imageData.aspectRatio = texture.image.width / texture.image.height;

        resolve();
      },
      undefined,
      (error) => {
        console.error("Error loading texture image", error);
        reject(error);
      }
    );
  });
}

function isImage(file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/avif", "image/bmp", "image/gif", "image/webp"];
  return allowedTypes.includes(file.type);
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("loadend", () => {
      resolve(reader.result);
    });

    reader.addEventListener("error", (error) => {
      reject(error);
    });

    reader.readAsDataURL(file);
  });
}

function preventDefaults(event) {
  event.preventDefault();
  event.stopPropagation();
}

function updateUniforms(shaderPasses, resolutionVector) {
  Object.keys(shaderPasses).forEach((pass) => {
    shaderPasses[pass].uniforms.resolution.value = resolutionVector;
  });
}

function addGUISetting(postEffect, uniform, guiFolder, min, max, step, name) {
  const setting = guiFolder.add(uniform, "value", min, max, step).name(name);
  setting.onChange(() => {
    postEffect.uniformsNeedUpdate = true;
  });
}

function setupGUI(shaders, renderer, composer) {
  const gui = new GUI();

  const kuwaharaFolder = gui.addFolder("Kuwahara");
  addGUISetting(shaders.kuwahara, shaders.kuwahara.uniforms.kernelRadius, kuwaharaFolder, 2, 5, 1, "Blur radius");
  addGUISetting(shaders.kuwahara, shaders.kuwahara.uniforms.zetaModifier, kuwaharaFolder, 0.2, 5.0, 0.1, "Inner blur");
  addGUISetting(shaders.kuwahara, shaders.kuwahara.uniforms.zeroCrossing, kuwaharaFolder, 0.4, 1.0, 0.01, "Outer blur");
  addGUISetting(shaders.kuwahara, shaders.kuwahara.uniforms.sharpness, kuwaharaFolder, 1.0, 20.0, 1.0, "Sharpness");
  kuwaharaFolder.open();

  const gammaFolder = gui.addFolder("Gamma correction");
  addGUISetting(shaders.gamma, shaders.gamma.uniforms.gamma, gammaFolder, 0.3, 2.5, 0.1, "Gamma");
  gammaFolder.open();

  const downloadImage = () => {
    composer.render();
    const screenshotDataURL = renderer.domElement.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = screenshotDataURL;
    link.download = "screenshot.png";
    link.click();
  };

  gui.add({ downloadImage }, "downloadImage").name("Download Image");

  gui.close();
}

export default setupScene;
