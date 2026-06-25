import * as THREE from 'three';

export function createBar(scene) {
  const group = new THREE.Group();
  const Z = -10.8;

  const counterMat = new THREE.MeshStandardMaterial({ color: '#3D2010', roughness: 0.4, metalness: 0.1 });
  const topMat     = new THREE.MeshStandardMaterial({ color: '#C8A46A', roughness: 0.25, metalness: 0.05 });

  const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.05, 0.65), counterMat);
  counter.position.set(2, 0.525, Z + 0.35);
  counter.castShadow = true;
  group.add(counter);

  const top = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.06, 0.75), topMat);
  top.position.set(2, 1.08, Z + 0.35);
  group.add(top);

  const shelfMat   = new THREE.MeshStandardMaterial({ color: '#2A1008', roughness: 0.7 });
  const SHELF_COUNT = 4;
  const SHELF_W     = 5.5;

  for (let i = 0; i < SHELF_COUNT; i++) {
    const y = 1.3 + i * 0.55;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(SHELF_W, 0.04, 0.3), shelfMat);
    shelf.position.set(2, y, Z + 0.04);
    group.add(shelf);
    addBottles(group, 2, y + 0.02, Z + 0.06, SHELF_W, i);
  }

  const backlitMat = new THREE.MeshStandardMaterial({
    color: '#FFF3C4', emissive: '#FFDA80', emissiveIntensity: 0.6,
  });
  const backlit = new THREE.Mesh(new THREE.PlaneGeometry(SHELF_W, 2.4), backlitMat);
  backlit.position.set(2, 2.2, Z - 0.01);
  group.add(backlit);

  const barLight = new THREE.PointLight('#FFF3C4', 1.2, 8);
  barLight.position.set(2, 2.8, Z + 1.5);
  group.add(barLight);

  addWindows(group, Z);

  scene.add(group);
  return group;
}

// ── bottle label canvas textures ──────────────────────────────────────

const WINE_NAMES = [
  ['BL', 'UNCORKED', 'Reserve', '2019'],
  ['CAVE', 'NOIR', 'Grand Cru', '2017'],
  ['VOLTA', 'ROUGE', 'Barrel Select', '2021'],
  ['ARCO', 'BIANCO', 'Aged 24 mo.', '2020'],
  ['BRAINLABS', 'CELLAR', 'Limited', '2018'],
];

const LABEL_PALETTES = [
  { bg: '#F5ECD7', text: '#2A1608', accent: '#8B1A1A', line: '#C8A46A' },
  { bg: '#1A2A1A', text: '#E8D5A0', accent: '#C8A46A', line: '#4A6A4A' },
  { bg: '#EDE0C8', text: '#1C0F08', accent: '#4A2A0A', line: '#8B6535' },
  { bg: '#F0EAE0', text: '#2A1A08', accent: '#2A3A5A', line: '#6A5A4A' },
  { bg: '#2A1A14', text: '#E8D5B0', accent: '#C87050', line: '#6A3A28' },
];

function makeLabelTexture(nameSet, palette) {
  const W = 128, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  // decorative border
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // top line accent
  ctx.fillStyle = palette.accent;
  ctx.fillRect(12, 10, W - 24, 2);

  // name line 1 (big)
  ctx.fillStyle = palette.text;
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(nameSet[0], W / 2, 26);

  // name line 2
  ctx.font = '8px Georgia, serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(nameSet[1], W / 2, 36);

  // subtitle
  ctx.fillStyle = palette.accent;
  ctx.font = 'italic 7px Georgia, serif';
  ctx.fillText(nameSet[2], W / 2, 46);

  // vintage year
  ctx.fillStyle = palette.text;
  ctx.font = '6px Georgia, serif';
  ctx.fillText(nameSet[3], W / 2, 56);

  // bottom accent
  ctx.fillStyle = palette.accent;
  ctx.fillRect(12, H - 12, W - 24, 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function addBottles(parent, cx, y, z, shelfW, shelfIdx) {
  const bottleCount = Math.floor(shelfW / 0.12);
  const glassCols   = ['#1A3A1A', '#4A2A0A', '#8B1A1A', '#2A3A4A', '#3A2A1A'];

  for (let i = 0; i < bottleCount; i++) {
    const x   = cx - shelfW / 2 + i * 0.12 + 0.06;
    const col = glassCols[(shelfIdx * 7 + i) % glassCols.length];

    const glassMat = new THREE.MeshStandardMaterial({
      color: col, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.88,
    });

    // body
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.038, 0.28, 10), glassMat);
    bottle.position.set(x, y + 0.15, z);
    parent.add(bottle);

    // neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.033, 0.1, 8), glassMat);
    neck.position.set(x, y + 0.33, z);
    parent.add(neck);

    // label — only on every other bottle to keep memory low
    if (i % 2 === 0) {
      const nameIdx    = (shelfIdx + Math.floor(i / 2)) % WINE_NAMES.length;
      const palIdx     = nameIdx % LABEL_PALETTES.length;
      const labelTex   = makeLabelTexture(WINE_NAMES[nameIdx], LABEL_PALETTES[palIdx]);

      // label plane wrapped around the bottle cylinder front face
      const labelMat = new THREE.MeshStandardMaterial({
        map: labelTex,
        roughness: 0.6,
        metalness: 0.0,
        transparent: false,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });

      // flat label plane facing outward (toward camera at z+)
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.038), labelMat);
      label.position.set(x, y + 0.14, z + 0.038);
      parent.add(label);
    }

    // foil cap
    const foilMat = new THREE.MeshStandardMaterial({
      color: ['#1A1A1A', '#8B1A1A', '#C8A060', '#1A3A1A'][(shelfIdx + i) % 4],
      roughness: 0.3, metalness: 0.5,
    });
    const foil = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 8), foilMat);
    foil.position.set(x, y + 0.39, z);
    parent.add(foil);
  }
}

function addWindows(parent, z) {
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1C1C1C', roughness: 0.6, metalness: 0.4 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#8AAABB', transparent: true, opacity: 0.25, roughness: 0.1, transmission: 0.6,
  });
  const WIN_W = 1.8, WIN_H = 1.4;
  const frames = [[-3.5, 2.0], [7.0, 2.0]];

  frames.forEach(([x, y]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(WIN_W + 0.1, WIN_H + 0.1, 0.08), frameMat);
    frame.position.set(x, y, z + 0.01);
    parent.add(frame);

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, WIN_H), glassMat);
    pane.position.set(x, y, z + 0.06);
    parent.add(pane);

    ['h', 'v'].forEach(dir => {
      const divider = new THREE.Mesh(
        dir === 'h' ? new THREE.BoxGeometry(WIN_W, 0.04, 0.05) : new THREE.BoxGeometry(0.04, WIN_H, 0.05),
        frameMat,
      );
      divider.position.set(x, y, z + 0.05);
      parent.add(divider);
    });
  });
}
