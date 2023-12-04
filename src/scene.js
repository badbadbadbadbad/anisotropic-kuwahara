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

// Image source
// https://unsplash.com/photos/russian-blue-cat-wearing-yellow-sunglasses-yMSecCHsIBc
import sampleImage from "../img/cat.png";

// Border colour for renderer canvas. Same as other borders in website.
const hexColor = "#b1acc7";

// Switch to true if Stats.js FPS counter should be used.
const useFPSCounter = false;

// Desired maximum FPS of image rendering.
const maxFPS = 6;

function setupScene() {
  // Get HTML container element for scene
  const containerHTML = document.getElementById("canvas-container");

  // Image stuff
  const imageData = {
    dataURL: sampleImage,
    texture: new THREE.Texture(),
    aspectRatio: 0,
  };

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c1c1f);

  // Setup canvas plane
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x1c1c1f });
  scene.add(new THREE.Mesh(geometry, material));

  // Camera
  const camera = new THREE.OrthographicCamera(
    containerHTML.clientWidth / -2,
    containerHTML.clientWidth / 2,
    containerHTML.clientHeight / 2,
    containerHTML.clientHeight / -2,
    1,
    1000
  );
  camera.position.z = 5;

  // Set camera position to look directly at the plane from above
  camera.position.set(0, 0, 1);
  camera.lookAt(scene.position);

  // Renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.preserveDrawingBuffer = true;
  renderer.setSize(containerHTML.clientWidth, containerHTML.clientHeight);
  containerHTML.appendChild(renderer.domElement);

  renderer.domElement.style.border = `2px solid ${hexColor}`;
  renderer.domElement.style.borderRadius = "5px";

  // Optional FPS counter from Stats.js (Three.js plugin version)
  const stats = new Stats();
  if (useFPSCounter) {
    stats.showPanel(0);
    stats.domElement.style.position = "absolute";
    containerHTML.appendChild(stats.domElement);
  }

  // ! Postprocessing pipeline initialization
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const effectStructureTensor = new ShaderPass(structureTensorShader);
  renderer.getSize(effectStructureTensor.uniforms.resolution.value);
  composer.addPass(effectStructureTensor);

  const effectGaussianBlurX = new ShaderPass(gaussianBlurXShader);
  renderer.getSize(effectGaussianBlurX.uniforms.resolution.value);
  composer.addPass(effectGaussianBlurX);

  const effectGaussianBlurY = new ShaderPass(gaussianBlurYShader);
  renderer.getSize(effectGaussianBlurY.uniforms.resolution.value);
  composer.addPass(effectGaussianBlurY);

  const effectKuwahara = new ShaderPass(anisotropicKuwaharaShader);
  renderer.getSize(effectKuwahara.uniforms.resolution.value);
  composer.addPass(effectKuwahara);

  const effectGamma = new ShaderPass(gammaShader);
  composer.addPass(effectGamma);

  // ! Collect shader passes into object to make it more readable
  const shaderPasses = {
    structureTensor: effectStructureTensor,
    gaussX: effectGaussianBlurX,
    gaussY: effectGaussianBlurY,
    kuwahara: effectKuwahara,
    gamma: effectGamma,
  };

  // ! First image scene load
  reloadImageScene(containerHTML, renderer, composer, camera, scene, imageData, shaderPasses, true);

  // ! Handle container resize
  window.addEventListener("resize", () => {
    reloadImageScene(containerHTML, renderer, composer, camera, scene, imageData, shaderPasses, true);
  });

  // ! Drag and drop
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  document.body.addEventListener("drop", async (event) => {
    // Get first file only in case of multi-upload
    const file = event.dataTransfer.files[0];

    if (isImage(file)) {
      try {
        imageData.dataURL = await readImage(file);
        reloadImageScene(containerHTML, renderer, composer, camera, scene, imageData, shaderPasses, true);
      } catch (error) {
        console.error("Error reading dropped image:", error);
      }
    }
  });

  // ! GUI
  setupGUI(shaderPasses, renderer, composer);

  // ! Start animation
  const clock = new THREE.Clock();
  let delta = 0;
  const interval = 1 / maxFPS; // Denominator determines FPS. Change as wanted.

  const animate = () => {
    requestAnimationFrame(animate);
    delta += clock.getDelta();

    if (delta > interval) {
      if (useFPSCounter) {
        stats.begin();
      }
      // Non-postprocessing version
      // renderer.render(scene, camera);

      // Postprocessing version
      composer.render();

      delta %= interval;

      if (useFPSCounter) {
        stats.end();
      }
    }
  };

  animate();
}

// TODO: Combine parameters
function reloadImageScene(container, renderer, composer, camera, scene, imageData, shaderPasses, updateTex = false) {
  loadImageTexture(imageData, updateTex)
    .then(() => {
      const canvasAspectRatio = container.clientWidth / container.clientHeight;

      let height;
      let width;
      if (imageData.aspectRatio >= canvasAspectRatio) {
        // Image reaches left/right of screen
        width = container.clientWidth;
        height = width / imageData.aspectRatio;
      } else {
        // Image reaches top/bottom of screen
        height = container.clientHeight;
        width = height * imageData.aspectRatio;
      }

      if (updateTex) {
        const mat = new THREE.MeshBasicMaterial({ map: imageData.texture });
        scene.children[0].material = mat;
        shaderPasses.kuwahara.uniforms.inputTex.value = imageData.texture;
      }

      // Uniforms
      updateUniforms(shaderPasses, new THREE.Vector2(width, height));

      scene.children[0].scale.x = width;
      scene.children[0].scale.y = height;

      // Set renderer and camera to plane size
      renderer.setSize(width, height);
      composer.setSize(width, height);

      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;

      camera.updateProjectionMatrix();
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
  addGUISetting(shaders.kuwahara, shaders.kuwahara.uniforms.zetaModifier, kuwaharaFolder, 0.2, 5.0, 0.1, "Blur inner strength");
  addGUISetting(shaders.kuwahara, shaders.kuwahara.uniforms.zeroCrossing, kuwaharaFolder, 0.4, 1.0, 0.01, "Blur outer strength");
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
}

export default setupScene;
