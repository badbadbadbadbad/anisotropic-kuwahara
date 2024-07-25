import setupScene from "./scene";
import "./style.css";

import githubIcon from "./icon/github-mark-white.svg";

function createWebsite() {
  // Header
  const header = document.createElement("header");
  header.id = "header";

  // Logo
  const logoLink = document.createElement("a");
  logoLink.id = "logo-link";
  header.appendChild(logoLink);
  logoLink.href = "https://github.com/badbadbadbadbad/anisotropic-kuwahara";
  logoLink.target = "_blank"; // Open in a new tab

  const logoImg = document.createElement("img");
  logoImg.id = "logo-img";
  logoLink.appendChild(logoImg);
  logoImg.src = githubIcon;
  logoImg.alt = "GitHub";

  // Header text
  const headerText = document.createElement("div");
  headerText.innerHTML = "anisotropic kuwahara";
  header.appendChild(headerText);

  // Scenes
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
