import * as THREE from 'three';

const ATRIUM_R = 2.2;
const ATRIUM_DEPTH = 3.5;

export function createAtrium(scene) {
  const group = new THREE.Group();

  // position: center-left of room, matching the photo
  group.position.set(-1.5, 0, 1.5);

  // ── ring floor cutout (annular plane) ────────────────────────────
  const outerR = ATRIUM_R + 0.05;
  const innerR = ATRIUM_R;
  const ringGeo = new THREE.RingGeometry(innerR, outerR + 4, 64, 1);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#C8A46A',
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.FrontSide,
  });
  // We use a full floor panel with a ring hole approximated by the railing
  // The visual "hole" is achieved by the lower level mesh below

  // ── lower cellar walls (cylinder) ────────────────────────────────
  const wallGeo = new THREE.CylinderGeometry(
    ATRIUM_R, ATRIUM_R, ATRIUM_DEPTH, 48, 1, true,
  );
  const wallMat = new THREE.MeshStandardMaterial({
    color: '#5A2E18',
    roughness: 0.98,
    metalness: 0.0,
    side: THREE.BackSide,
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = -(ATRIUM_DEPTH / 2) - 0.05;
  group.add(wall);

  // ── lower level floor ─────────────────────────────────────────────
  const lowerFloor = new THREE.Mesh(
    new THREE.CircleGeometry(ATRIUM_R, 48),
    new THREE.MeshStandardMaterial({ color: '#4A2810', roughness: 0.95 }),
  );
  lowerFloor.rotation.x = -Math.PI / 2;
  lowerFloor.position.y = -ATRIUM_DEPTH - 0.05;
  group.add(lowerFloor);

  // ── dining tables visible below ───────────────────────────────────
  addLowerDining(group, ATRIUM_DEPTH);

  // ── light pool at bottom ──────────────────────────────────────────
  const caveLight = new THREE.PointLight('#FF9A3C', 0.8, ATRIUM_DEPTH * 1.2);
  caveLight.position.y = -ATRIUM_DEPTH + 0.8;
  group.add(caveLight);

  // rim glow — subtle uplight
  const rimLight = new THREE.PointLight('#FFDA80', 0.35, 3);
  rimLight.position.y = -0.1;
  group.add(rimLight);

  scene.add(group);
  return group;
}

function addLowerDining(parent, depth) {
  const tableMat = new THREE.MeshStandardMaterial({ color: '#E8D5B0', roughness: 0.6 });
  const legMat = new THREE.MeshStandardMaterial({ color: '#3D2010' });

  const positions = [
    [-0.8, -0.5],
    [0.5, 0.4],
    [-0.3, 0.9],
  ];

  positions.forEach(([x, z]) => {
    const y = -depth + 0.03;

    // table top
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16),
      tableMat,
    );
    top.position.set(x, y + 0.72, z);
    parent.add(top);

    // table leg
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8),
      legMat,
    );
    leg.position.set(x, y + 0.35, z);
    parent.add(leg);

    // candle
    const flame = new THREE.PointLight('#FF7010', 0.3, 1.2);
    flame.position.set(x, y + 0.85, z);
    flame.userData.baseIntensity = 0.3;
    flame.userData.flickerSpeed = 4 + Math.random() * 2;
    flame.userData.flickerPhase = Math.random() * Math.PI * 2;
    parent.add(flame);
  });
}
