import * as THREE from 'three';

export function createBar(scene) {
  const group = new THREE.Group();
  const Z = -10.8; // back wall position

  // ── bar counter ────────────────────────────────────────────────────
  const counterMat = new THREE.MeshStandardMaterial({
    color: '#3D2010',
    roughness: 0.4,
    metalness: 0.1,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: '#C8A46A',
    roughness: 0.25,
    metalness: 0.05,
  });

  // counter body
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1.05, 0.65),
    counterMat,
  );
  counter.position.set(2, 0.525, Z + 0.35);
  counter.castShadow = true;
  group.add(counter);

  // marble top
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(6.1, 0.06, 0.75),
    topMat,
  );
  top.position.set(2, 1.08, Z + 0.35);
  group.add(top);

  // ── back shelving unit ─────────────────────────────────────────────
  const shelfMat = new THREE.MeshStandardMaterial({
    color: '#2A1008',
    roughness: 0.7,
  });
  const SHELF_COUNT = 4;
  const SHELF_W = 5.5;

  for (let i = 0; i < SHELF_COUNT; i++) {
    const y = 1.3 + i * 0.55;
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(SHELF_W, 0.04, 0.3),
      shelfMat,
    );
    shelf.position.set(2, y, Z + 0.04);
    group.add(shelf);

    // bottles on each shelf
    addBottles(group, 2, y + 0.02, Z + 0.06, SHELF_W);
  }

  // backlit emissive panel
  const backlitMat = new THREE.MeshStandardMaterial({
    color: '#FFF3C4',
    emissive: '#FFDA80',
    emissiveIntensity: 0.6,
  });
  const backlit = new THREE.Mesh(
    new THREE.PlaneGeometry(SHELF_W, 2.4),
    backlitMat,
  );
  backlit.position.set(2, 2.2, Z - 0.01);
  group.add(backlit);

  // bar area point light
  const barLight = new THREE.PointLight('#FFF3C4', 1.2, 8);
  barLight.position.set(2, 2.8, Z + 1.5);
  group.add(barLight);

  // ── industrial windows ─────────────────────────────────────────────
  addWindows(group, Z);

  scene.add(group);
  return group;
}

function addBottles(parent, cx, y, z, shelfW) {
  const bottleCount = Math.floor(shelfW / 0.12);
  const colors = ['#1A3A1A', '#4A2A0A', '#8B1A1A', '#2A3A4A', '#3A2A1A'];

  for (let i = 0; i < bottleCount; i++) {
    const x = cx - shelfW / 2 + i * 0.12 + 0.06;
    const col = colors[Math.floor(Math.random() * colors.length)];

    const bottleGeo = new THREE.CylinderGeometry(0.033, 0.038, 0.28, 8);
    const bottle = new THREE.Mesh(
      bottleGeo,
      new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      }),
    );
    bottle.position.set(x, y + 0.15, z);
    parent.add(bottle);

    // bottle neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.033, 0.1, 8),
      bottle.material,
    );
    neck.position.set(x, y + 0.33, z);
    parent.add(neck);
  }
}

function addWindows(parent, z) {
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#1C1C1C',
    roughness: 0.6,
    metalness: 0.4,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#8AAABB',
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
    transmission: 0.6,
  });

  const WIN_W = 1.8;
  const WIN_H = 1.4;
  const frames = [[-3.5, 2.0], [7.0, 2.0]];

  frames.forEach(([x, y]) => {
    // outer frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(WIN_W + 0.1, WIN_H + 0.1, 0.08),
      frameMat,
    );
    frame.position.set(x, y, z + 0.01);
    parent.add(frame);

    // glass pane
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(WIN_W, WIN_H),
      glassMat,
    );
    pane.position.set(x, y, z + 0.06);
    parent.add(pane);

    // cross dividers
    ['h', 'v'].forEach(dir => {
      const divider = new THREE.Mesh(
        dir === 'h'
          ? new THREE.BoxGeometry(WIN_W, 0.04, 0.05)
          : new THREE.BoxGeometry(0.04, WIN_H, 0.05),
        frameMat,
      );
      divider.position.set(x, y, z + 0.05);
      parent.add(divider);
    });
  });
}
