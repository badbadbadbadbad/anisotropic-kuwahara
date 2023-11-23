import setupScene from "./scene";
import "./style.css";
// import setupScene from "./scene";

function createWebsite() {
  const controlPanel = setupControlPanel();
  const threeScene = setupThreeScene();

  document.body.appendChild(controlPanel);
  document.body.appendChild(threeScene);

  document.addEventListener("DOMContentLoaded", () => {
    setupScene();
  });
}

function setupControlPanel() {
  const container = document.createElement("div");
  container.classList.add("half");

  const controlPanel = document.createElement("div");
  controlPanel.id = "control-panel";
  container.appendChild(controlPanel);

  return container;
}

function setupThreeScene() {
  const container = document.createElement("div");
  container.classList.add("half");
  container.id = "canvas-container";

  /*
  const canvas = document.createElement("div");
  canvas.id = "canvas";
  container.appendChild(canvas);
  */

  return container;
}

export default createWebsite;
