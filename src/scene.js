import * as THREE from "three"; // eslint-disable-line import/no-unresolved
import Stats from "three/examples/jsm/libs/stats.module";
import { GUI } from "dat.gui";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer";
import { RenderPass } from "three/addons/postprocessing/RenderPass";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass";
import structureTensorShader from "./shaders/structureTensor";
import gaussianBlurHorizontalShader from "./shaders/gaussianBlurHorizontal";
import gaussianBlurVerticalShader from "./shaders/gaussianBlurVertical";
import anisotropicKuwaharaShader from "./shaders/anisotropicKuwahara";
import gammaShader from "./shaders/gammaShader";

// Image source
// https://unsplash.com/photos/russian-blue-cat-wearing-yellow-sunglasses-yMSecCHsIBc
import sampleImage from "../img/cat.png";

// Border colour for renderer canvas. Same as other borders in website.
const hexColor = "#b1acc7";

// Switch to true if Stats.js FPS counter should be used.
const useFPSCounter = false;

function setupScene() {
  // Get HTML container element for scene
  const containerHTML = document.getElementById("canvas-container");

  /*
  const HTMLelems = {
    container: containerHTML,
  };
  */

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

  const effectGaussianBlurHorizontal = new ShaderPass(gaussianBlurHorizontalShader);
  renderer.getSize(effectGaussianBlurHorizontal.uniforms.resolution.value);
  composer.addPass(effectGaussianBlurHorizontal);

  const effectGaussianBlurVertical = new ShaderPass(gaussianBlurVerticalShader);
  renderer.getSize(effectGaussianBlurVertical.uniforms.resolution.value);
  composer.addPass(effectGaussianBlurVertical);

  const effectKuwahara = new ShaderPass(anisotropicKuwaharaShader);
  renderer.getSize(effectKuwahara.uniforms.resolution.value);
  composer.addPass(effectKuwahara);

  const effectGamma = new ShaderPass(gammaShader);
  composer.addPass(effectGamma);

  // ! Collect shader passes into object to make it more readable
  const shaderPasses = {
    structureTensor: effectStructureTensor,
    gaussHorizontal: effectGaussianBlurHorizontal,
    gaussVertical: effectGaussianBlurVertical,
    kuwahara: effectKuwahara,
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

  // GUI
  const gui = new GUI();
  const kuwaharaFolder = gui.addFolder("Kuwahara");
  addGUISetting(effectKuwahara, effectKuwahara.uniforms.kernelRadius, kuwaharaFolder, 2, 5, 1, "Blur radius");

  const gammaFolder = gui.addFolder("Gamma correction");
  addGUISetting(effectGamma, effectGamma.uniforms.gamma, gammaFolder, 0.1, 2.5, 0.1, "Gamma");

  // Clock to limit FPS
  const clock = new THREE.Clock();
  let delta = 0;
  const interval = 1 / 6; // Denominator is FPS. Change as wanted.

  // Start the animations
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
  let height;
  let width;
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    imageData.dataURL,
    (texture) => {
      // From linearSRGB to SRGB to fix image looking overexposed
      texture.colorSpace = THREE.SRGBColorSpace;

      // Save image aspect ratio for resize handler
      imageData.texture = texture;
      imageData.aspectRatio = texture.image.width / texture.image.height;

      // Container ratio to ...
      const canvasAspectRatio = container.clientWidth / container.clientHeight;

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
        const mat = new THREE.MeshBasicMaterial({ map: texture });
        scene.children[0].material = mat;
        shaderPasses.kuwahara.uniforms.inputTex.value = texture;
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
    },
    undefined,
    (error) => console.error("Error loading texture image", error)
  );
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

export default setupScene;
