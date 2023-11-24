import * as THREE from "three"; // eslint-disable-line import/no-unresolved
import { EffectComposer } from "three/addons/postprocessing/EffectComposer";
import { RenderPass } from "three/addons/postprocessing/RenderPass";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass";
import structureTensorShader from "./shaders/structureTensor";
import gaussianBlurHorizontalShader from "./shaders/gaussianBlurHorizontal";
import gaussianBlurVerticalShader from "./shaders/gaussianBlurVertical";

// Image source
// https://unsplash.com/photos/russian-blue-cat-wearing-yellow-sunglasses-yMSecCHsIBc
import sampleImage from "../img/cat.png";

// Border colour for renderer canvas. Same as other borders in website.
const hexColor = "#b1acc7";

function setupScene() {
  // Get HTML container element for scene
  const containerHTML = document.getElementById("canvas-container");

  const HTMLelems = {
    container: containerHTML,
  };

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
    HTMLelems.container.clientWidth / -2,
    HTMLelems.container.clientWidth / 2,
    HTMLelems.container.clientHeight / 2,
    HTMLelems.container.clientHeight / -2,
    1,
    1000
  );
  camera.position.z = 5;

  // Set camera position to look directly at the plane from above
  camera.position.set(0, 0, 1);
  camera.lookAt(scene.position);

  // Renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(HTMLelems.container.clientWidth, HTMLelems.container.clientHeight);
  HTMLelems.container.appendChild(renderer.domElement);

  renderer.domElement.style.border = `2px solid ${hexColor}`;
  renderer.domElement.style.borderRadius = "5px";

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

  // ! Uniforms for the shader
  /*
  const uniforms = {
    texMap: { value: new THREE.Texture() },
    resolution: { value: new THREE.Vector2() },
  };
  */

  // ! Collect shader passes into object to make it more readable
  const shaderPasses = {
    structureTensor: effectStructureTensor,
    gaussHorizontal: effectGaussianBlurHorizontal,
    gaussVertical: effectGaussianBlurVertical,
  };

  // ! First image scene load
  reloadImageScene(HTMLelems.container, renderer, composer, camera, scene, imageData, shaderPasses, true);

  // ! Handle container resize
  window.addEventListener("resize", () => {
    reloadImageScene(HTMLelems.container, renderer, composer, camera, scene, imageData, shaderPasses, true);
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
        reloadImageScene(HTMLelems.container, renderer, composer, camera, scene, imageData, shaderPasses, true);
      } catch (error) {
        console.error("Error reading dropped image:", error);
      }
    }
  });

  // Start the animation
  const animate = () => {
    requestAnimationFrame(animate);

    // Non-postprocessing version
    // renderer.render(scene, camera);

    // Postprocessing version
    composer.render();
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
      }

      // Uniforms
      shaderPasses.structureTensor.uniforms.resolution.value.x = width;
      shaderPasses.structureTensor.uniforms.resolution.value.y = height;
      shaderPasses.gaussHorizontal.uniforms.resolution.value.x = width;
      shaderPasses.gaussHorizontal.uniforms.resolution.value.y = height;
      shaderPasses.gaussVertical.uniforms.resolution.value.x = width;
      shaderPasses.gaussVertical.uniforms.resolution.value.y = height;
      /*
      effectStructureTensor.uniforms.resolution.value.x = width;
      effectStructureTensor.uniforms.resolution.value.y = height;
      effectGaussianBlurHorizontal.uniforms.resolution.value.x = width;
      effectGaussianBlurHorizontal.uniforms.resolution.value.y = height;
      */

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

export default setupScene;
