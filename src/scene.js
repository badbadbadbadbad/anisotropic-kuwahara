import * as THREE from "three";

function setupScene() {
  const canvas = document.getElementById("canvas");

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  canvas.appendChild(renderer.domElement);

  // Create a cube
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Animation function
  const animate = () => {
    requestAnimationFrame(animate);

    // Rotate the cube
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    // Render the scene
    renderer.render(scene, camera);
  };

  // Handle container resize
  const handleResize = () => {
    const newWidth = canvas.clientWidth;
    const newHeight = canvas.clientHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
  };

  animate();

  window.addEventListener("resize", handleResize);
}

export default setupScene;
