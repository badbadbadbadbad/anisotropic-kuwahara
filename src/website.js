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

  // document.body.appendChild(leftScene);
  // document.body.appendChild(threeScene);

  document.addEventListener("DOMContentLoaded", () => {
    setupScene();
  });
}

function setupImageScene() {
  const container = document.createElement("div");
  container.classList.add("half");

  const controlPanel = document.createElement("div");
  controlPanel.id = "control-panel";
  container.appendChild(controlPanel);

  return container;
}

function setupKuwaharaScene() {
  const outerContainer = document.createElement("div");
  outerContainer.classList.add("half");
  outerContainer.id = "right-half";

  const container = document.createElement("div");
  container.id = "canvas-container";
  outerContainer.appendChild(container);

  return outerContainer;
}

export default createWebsite;
