import * as THREE from "three";
import testImage from "../img/test.png";

function setupScene() {
  // Get parent element
  const canvas = document.getElementById("canvas");

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.OrthographicCamera(
    canvas.clientWidth / -2,
    canvas.clientWidth / 2,
    canvas.clientHeight / 2,
    canvas.clientHeight / -2,
    1,
    1000
  );
  camera.position.z = 5;

  // Renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  canvas.appendChild(renderer.domElement);

  // Create a plane
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  // Set camera position to look directly at the plane from above
  camera.position.set(0, 0, 1);
  camera.lookAt(scene.position);

  // Load image
  let imageAspectRatio;
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    testImage,
    (texture) => {
      // Load texture
      const textureMaterial = new THREE.MeshBasicMaterial({ map: texture });
      plane.material = textureMaterial;

      // Adjust plane size to fit the viewport
      imageAspectRatio = texture.image.width / texture.image.height;
      const canvasAspectRatio = canvas.clientWidth / canvas.clientHeight;

      let height;
      let width;
      if (imageAspectRatio >= canvasAspectRatio) {
        // Image reaches left/right of screen
        width = canvas.clientWidth;
        height = width / imageAspectRatio;
      } else {
        // Image reaches top/bottom of screen
        height = canvas.clientHeight;
        width = height * imageAspectRatio;
      }

      plane.geometry = new THREE.PlaneGeometry(width, height);
    },
    undefined,
    (error) => console.error("Error loading texture image", error)
  );

  // Animation function
  const animate = () => {
    requestAnimationFrame(animate);

    // Render the scene
    renderer.render(scene, camera);
  };

  // Handle container resize
  const handleResize = () => {
    const newWidth = canvas.clientWidth;
    const newHeight = canvas.clientHeight;

    renderer.setSize(newWidth, newHeight);

    const canvasAspectRatio = newWidth / newHeight;

    let height;
    let width;
    if (imageAspectRatio >= canvasAspectRatio) {
      // Image reaches left/right of screen
      width = canvas.clientWidth;
      height = width / imageAspectRatio;
    } else {
      // Image reaches top/bottom of screen
      height = canvas.clientHeight;
      width = height * imageAspectRatio;
    }

    plane.geometry = new THREE.PlaneGeometry(width, height);

    camera.left = -newWidth / 2;
    camera.right = newWidth / 2;
    camera.top = newHeight / 2;
    camera.bottom = -newHeight / 2;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", handleResize);

  // Start the animation
  animate();
}

export default setupScene;
