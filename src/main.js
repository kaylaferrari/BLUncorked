import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { createVault } from './scene/vault.js';
import { createFloor } from './scene/floor.js';
import { createWalls, animateCandles } from './scene/walls.js';
import { createAtrium } from './scene/atrium.js';
import { createRailing } from './scene/railing.js';
import { createBar } from './scene/bar.js';
import { setupLighting } from './lighting.js';
import { addModeToggle } from './firstPerson.js';

// ── renderer ──────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── scene ─────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0D0602');
scene.fog = new THREE.FogExp2('#1C0A04', 0.035);

// ── camera ────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(5, 2.2, 9);
camera.lookAt(0, 1.5, 0);

// ── orbit controls ────────────────────────────────────────────────────
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1.5, 0);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
orbit.minDistance = 1.5;
orbit.maxDistance = 18;
orbit.maxPolarAngle = Math.PI * 0.72;
orbit.minPolarAngle = Math.PI * 0.08;

// ── post-processing ───────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 0.72,
);
composer.addPass(bloom);

// ── build scene ───────────────────────────────────────────────────────
const loaderEl = document.getElementById('loader');
const fillEl   = document.getElementById('fill');

function setProgress(p) { fillEl.style.width = `${p}%`; }

function buildScene() {
  setProgress(10);  setupLighting(scene);
  setProgress(25);  createFloor(scene);
  setProgress(40);  createWalls(scene);
  setProgress(55);  createVault(scene);
  setProgress(70);  createAtrium(scene);
  setProgress(82);  createRailing(scene);
  setProgress(92);  createBar(scene);
  setProgress(100);

  setTimeout(() => {
    loaderEl.style.opacity = '0';
    setTimeout(() => loaderEl.remove(), 800);
  }, 300);
}

buildScene();

// ── first-person mode toggle ──────────────────────────────────────────
const fp = addModeToggle(camera, renderer, orbit);

// ── resize ────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ── render loop ───────────────────────────────────────────────────────
const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  elapsed += delta;

  if (!fp.isActive()) orbit.update();
  fp.update(delta);
  animateCandles(scene, elapsed);
  composer.render();
}

animate();
