import setupScene from "./scene";
import "./style.css";

function createWebsite() {
  const header = document.createElement("header");
  header.id = "header";
  header.innerText = "anisotropic kuwahara";

  const scenes = document.createElement("div");
  scenes.id = "scenes";

  const leftScene = setupImageScene();
  const threeScene = setupKuwaharaScene();

  scenes.appendChild(leftScene);
  scenes.appendChild(threeScene);

  document.body.appendChild(header);
  document.body.appendChild(scenes);

  document.addEventListener("DOMContentLoaded", () => {
    setupScene();
  });
}

function setupImageScene() {
  const leftContainer = document.createElement("div");
  leftContainer.classList.add("half");
  leftContainer.id = "left-half";

  const canvas = document.createElement("div");
  canvas.id = "left-canvas";
  leftContainer.appendChild(canvas);

  return leftContainer;
}

function setupKuwaharaScene() {
  const rightContainer = document.createElement("div");
  rightContainer.classList.add("half");
  rightContainer.id = "right-half";

  const canvas = document.createElement("div");
  canvas.id = "right-canvas";
  rightContainer.appendChild(canvas);

  return rightContainer;
}

export default createWebsite;
