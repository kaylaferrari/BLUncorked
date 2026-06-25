import * as THREE from 'three';

// WASD + pointer-lock first-person walk controller
// Call init() once, update(delta) each frame.
// Toggle between orbit and FP mode via the returned API.

const BOUNDS = { minX: -6, maxX: 6, minZ: -10, maxZ: 10 };
const EYE_HEIGHT = 1.68;
const SPEED = 4.0;
const LOOK_SENSITIVITY = 0.0018;

export function createFirstPerson(camera, renderer, orbitControls) {
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const keys = {};
  let active = false;
  let yaw = 0;
  let pitch = 0;

  // sync initial yaw/pitch from camera
  function syncFromCamera() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    yaw = Math.atan2(dir.x, dir.z) + Math.PI;
    pitch = Math.asin(-dir.y);
  }

  function onMouseMove(e) {
    if (!active) return;
    yaw -= e.movementX * LOOK_SENSITIVITY;
    pitch -= e.movementY * LOOK_SENSITIVITY;
    pitch = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, pitch));
    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);
  }

  function onKeyDown(e) { keys[e.code] = true; }
  function onKeyUp(e)   { keys[e.code] = false; }

  function onPointerLockChange() {
    if (document.pointerLockElement === renderer.domElement) {
      active = true;
      showHint('FP');
    } else {
      active = false;
    }
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  function enter() {
    syncFromCamera();
    camera.position.y = EYE_HEIGHT;
    orbitControls.enabled = false;
    renderer.domElement.requestPointerLock();
  }

  function exit() {
    document.exitPointerLock();
    orbitControls.enabled = true;
    active = false;
    showHint('orbit');
  }

  function update(delta) {
    if (!active) return;

    const forward = Number(keys['KeyW'] || keys['ArrowUp'])   - Number(keys['KeyS'] || keys['ArrowDown']);
    const strafe  = Number(keys['KeyD'] || keys['ArrowRight']) - Number(keys['KeyA'] || keys['ArrowLeft']);

    direction.set(strafe, 0, -forward).normalize();

    // rotate movement vector by yaw only
    const move = direction.clone().applyEuler(new THREE.Euler(0, yaw, 0));
    move.multiplyScalar(SPEED * delta);

    camera.position.add(move);

    // clamp to room bounds
    camera.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, camera.position.x));
    camera.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, camera.position.z));
    camera.position.y = EYE_HEIGHT;
  }

  return { enter, exit, update, isActive: () => active };
}

// ── mode toggle UI ─────────────────────────────────────────────────────
export function addModeToggle(camera, renderer, orbitControls) {
  const fp = createFirstPerson(camera, renderer, orbitControls);

  const btn = document.createElement('button');
  btn.id = 'modeBtn';
  btn.textContent = 'Walk Mode';
  Object.assign(btn.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'rgba(200,164,106,0.15)',
    color: '#C8A46A',
    border: '1px solid rgba(200,164,106,0.4)',
    fontFamily: 'Georgia, serif',
    fontSize: '12px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '8px 16px',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
    borderRadius: '2px',
    zIndex: '10',
    transition: 'background 0.2s',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(200,164,106,0.3)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'rgba(200,164,106,0.15)';
  });

  btn.addEventListener('click', () => {
    if (fp.isActive()) {
      fp.exit();
      btn.textContent = 'Walk Mode';
    } else {
      fp.enter();
      btn.textContent = 'Orbit Mode';
    }
  });

  // Escape also exits
  document.addEventListener('keydown', e => {
    if (e.code === 'Escape' && fp.isActive()) {
      fp.exit();
      btn.textContent = 'Walk Mode';
    }
  });

  document.body.appendChild(btn);
  return fp;
}

function showHint(mode) {
  const hint = document.getElementById('ui');
  if (!hint) return;
  hint.textContent = mode === 'FP'
    ? 'WASD to walk  ·  Mouse to look  ·  ESC to exit'
    : 'Drag to explore  ·  Scroll to zoom  ·  Walk Mode to explore freely';
}
