import * as THREE from 'three';

// Generates a gothic barrel vault with transverse arches
export function createVault(scene) {
  const group = new THREE.Group();

  const ROOM_W = 14;
  const ROOM_L = 22;
  const ARCH_H = 6.5;
  const ARCH_COUNT = 5;
  const SEGMENTS = 64;

  const brickMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8B4A2F'),
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.BackSide,
  });

  // ── barrel vault shell ────────────────────────────────────────────
  const vaultShape = new THREE.Shape();
  const r = ROOM_W / 2;
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI;
    const x = -r * Math.cos(t);
    const y = r * Math.sin(t) * (ARCH_H / r);
    if (i === 0) vaultShape.moveTo(x, y);
    else vaultShape.lineTo(x, y);
  }
  vaultShape.lineTo(r, 0);
  vaultShape.lineTo(-r, 0);

  const extrudeSettings = {
    depth: ROOM_L,
    bevelEnabled: false,
    steps: 1,
  };

  const vaultGeo = new THREE.ExtrudeGeometry(vaultShape, extrudeSettings);
  vaultGeo.rotateX(Math.PI / 2);
  vaultGeo.translate(0, 0, ROOM_L / 2);

  const vaultMesh = new THREE.Mesh(vaultGeo, brickMat);
  vaultMesh.receiveShadow = true;
  group.add(vaultMesh);

  // ── transverse arch ribs ──────────────────────────────────────────
  const archRibMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7A3F28'),
    roughness: 0.88,
    metalness: 0.0,
  });

  const archSpacing = ROOM_L / (ARCH_COUNT - 1);

  for (let i = 0; i < ARCH_COUNT; i++) {
    const zPos = -ROOM_L / 2 + i * archSpacing;
    const archGroup = buildArchRib(r, ARCH_H, archRibMat);
    archGroup.position.z = zPos;
    group.add(archGroup);

    // string lights along this arch
    addStringLights(scene, r, ARCH_H, zPos);
  }

  // ── procedural brick variation via vertex colors ───────────────────
  applyBrickVariation(vaultMesh);

  group.position.y = 0;
  scene.add(group);
  return group;
}

function buildArchRib(r, h, mat) {
  const group = new THREE.Group();
  const SEGS = 32;
  const ribWidth = 0.35;
  const ribDepth = 0.3;

  const points = [];
  for (let i = 0; i <= SEGS; i++) {
    const t = (i / SEGS) * Math.PI;
    points.push(new THREE.Vector3(-r * Math.cos(t), r * Math.sin(t) * (h / r), 0));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, SEGS, ribWidth / 2, 8, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

function addStringLights(scene, r, h, zPos) {
  const SEGS = 20;
  for (let i = 0; i <= SEGS; i++) {
    const t = (i / SEGS) * Math.PI;
    const x = -r * Math.cos(t);
    const y = r * Math.sin(t) * (h / r) - 0.15;

    if (i % 2 === 0) {
      const bulbGeo = new THREE.SphereGeometry(0.04, 6, 6);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: '#FFF5C8',
        emissive: '#FFDA80',
        emissiveIntensity: 3,
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x, y, zPos);
      scene.add(bulb);

      // subtle point light every few bulbs
      if (i % 4 === 0) {
        const pl = new THREE.PointLight('#FF9A3C', 0.4, 4);
        pl.position.set(x, y - 0.1, zPos);
        scene.add(pl);
      }
    }
  }
}

function applyBrickVariation(mesh) {
  const geo = mesh.geometry;
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const palette = [
    new THREE.Color('#8B4A2F'),
    new THREE.Color('#A05530'),
    new THREE.Color('#7A3C25'),
    new THREE.Color('#C07050'),
    new THREE.Color('#954030'),
  ];
  for (let i = 0; i < posAttr.count; i++) {
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.material.vertexColors = true;
}
