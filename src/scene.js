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

// NEW IMAGE SOURCE
// https://www.elitetreecare.com/2018/12/the-risk-of-snow-on-trees/

// Border colour for renderer canvas. Same as other borders in website.
const hexColor = "#b1acc7";

// Switch to true if Stats.js FPS counter should be used.
const useFPSCounter = false;

// Desired maximum FPS of image rendering.
const maxFPS = 4;

function setupScene() {
  // Get HTML container element for scene
  const leftContainerHTML = document.getElementById("left-canvas");
  const rightContainerHTML = document.getElementById("right-canvas");

  // Image stuff
  const imageData = {
    dataURL: sampleImage,
    texture: new THREE.Texture(),
    aspectRatio: 0,
  };

  // Scenes
  const leftScene = new THREE.Scene();
  leftScene.background = new THREE.Color(0x1c1c1f);

  const rightScene = new THREE.Scene();
  rightScene.background = new THREE.Color(0x1c1c1f);

  // Setup canvas planes
  const leftGeometry = new THREE.PlaneGeometry(1, 1);
  const leftMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1c1f });
  leftScene.add(new THREE.Mesh(leftGeometry, leftMaterial));

  const rightGeometry = new THREE.PlaneGeometry(1, 1);
  const rightMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1c1f });
  rightScene.add(new THREE.Mesh(rightGeometry, rightMaterial));

  // Cameras
  const leftCamera = new THREE.OrthographicCamera(
    leftContainerHTML.clientWidth / -2,
    leftContainerHTML.clientWidth / 2,
    leftContainerHTML.clientHeight / 2,
    leftContainerHTML.clientHeight / -2,
    1,
    1000
  );
  leftCamera.position.z = 5;

  const rightCamera = new THREE.OrthographicCamera(
    rightContainerHTML.clientWidth / -2,
    rightContainerHTML.clientWidth / 2,
    rightContainerHTML.clientHeight / 2,
    rightContainerHTML.clientHeight / -2,
    1,
    1000
  );
  rightCamera.position.z = 5;

  // Set camera positions to look directly at the plane from above
  leftCamera.position.set(0, 0, 1);
  leftCamera.lookAt(leftScene.position);

  rightCamera.position.set(0, 0, 1);
  rightCamera.lookAt(rightScene.position);

  // Renderers
  const leftRenderer = new THREE.WebGLRenderer();
  leftRenderer.preserveDrawingBuffer = true;
  leftRenderer.setSize(leftContainerHTML.clientWidth, leftContainerHTML.clientHeight);
  leftContainerHTML.appendChild(leftRenderer.domElement);
  leftRenderer.domElement.style.border = `2px solid ${hexColor}`;
  leftRenderer.domElement.style.borderRadius = "5px";

  const rightRenderer = new THREE.WebGLRenderer();
  rightRenderer.preserveDrawingBuffer = true;
  rightRenderer.setSize(rightContainerHTML.clientWidth, rightContainerHTML.clientHeight);
  rightContainerHTML.appendChild(rightRenderer.domElement);
  rightRenderer.domElement.style.border = `2px solid ${hexColor}`;
  rightRenderer.domElement.style.borderRadius = "5px";

  // Optional FPS counter from Stats.js (Three.js plugin version)
  const stats = new Stats();
  if (useFPSCounter) {
    stats.showPanel(0);
    stats.domElement.style.position = "absolute";
    rightContainerHTML.appendChild(stats.domElement);
  }

  // ! Postprocessing pipeline initialization
  const rightComposer = new EffectComposer(rightRenderer);

  const renderPass = new RenderPass(rightScene, rightCamera);
  rightComposer.addPass(renderPass);

  const effectStructureTensor = new ShaderPass(structureTensorShader);
  rightRenderer.getSize(effectStructureTensor.uniforms.resolution.value);
  rightComposer.addPass(effectStructureTensor);

  const effectGaussianBlurX = new ShaderPass(gaussianBlurXShader);
  rightRenderer.getSize(effectGaussianBlurX.uniforms.resolution.value);
  rightComposer.addPass(effectGaussianBlurX);

  const effectGaussianBlurY = new ShaderPass(gaussianBlurYShader);
  rightRenderer.getSize(effectGaussianBlurY.uniforms.resolution.value);
  rightComposer.addPass(effectGaussianBlurY);

  const effectKuwahara = new ShaderPass(anisotropicKuwaharaShader);
  rightRenderer.getSize(effectKuwahara.uniforms.resolution.value);
  rightComposer.addPass(effectKuwahara);

  const effectGamma = new ShaderPass(gammaShader);
  rightComposer.addPass(effectGamma);

  // ! Collect shader passes into object to make it more readable
  const shaderPasses = {
    structureTensor: effectStructureTensor,
    gaussX: effectGaussianBlurX,
    gaussY: effectGaussianBlurY,
    kuwahara: effectKuwahara,
    gamma: effectGamma,
  };

  // ! Collect canvases into objects too
  const leftCanvas = {
    container: leftContainerHTML,
    renderer: leftRenderer,
    camera: leftCamera,
    scene: leftScene,
  };

  const rightCanvas = {
    container: rightContainerHTML,
    renderer: rightRenderer,
    composer: rightComposer,
    camera: rightCamera,
    scene: rightScene,
    shaders: shaderPasses,
  };

  // ! First image scene load
  reloadImageScene(leftCanvas, rightCanvas, imageData, true);

  // ! Handle container resize
  window.addEventListener("resize", () => {
    reloadImageScene(leftCanvas, rightCanvas, imageData);
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
        reloadImageScene(leftCanvas, rightCanvas, imageData, true);
      } catch (error) {
        console.error("Error reading dropped image:", error);
      }
    }
  });

  // ! GUI
  setupGUI(shaderPasses, rightRenderer, rightComposer);

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
      leftRenderer.render(leftScene, leftCamera);
      rightComposer.render();

      delta %= interval;

      if (useFPSCounter) {
        stats.end();
      }
    }
  };

  animate();
}

function reloadImageScene(left, right, imageData, updateTex = false) {
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

      left.scene.children[0].scale.x = width;
      left.scene.children[0].scale.y = height;

      right.scene.children[0].scale.x = width;
      right.scene.children[0].scale.y = height;

      // Set renderer and camera to plane size
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

  gui.close();
}

export default setupScene;
