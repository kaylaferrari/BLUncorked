import * as THREE from 'three';

const ROOM_W = 14;
const ROOM_L = 22;
const WALL_H = 3.5;

const brickMat = () => new THREE.MeshStandardMaterial({
  color: new THREE.Color('#7A3C25'),
  roughness: 0.95,
  metalness: 0.0,
});

export function createWalls(scene) {
  const group = new THREE.Group();

  // back wall (bar end)
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, WALL_H),
    brickMat(),
  );
  backWall.position.set(0, WALL_H / 2, -ROOM_L / 2);
  backWall.receiveShadow = true;
  group.add(backWall);

  // front wall
  const frontWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, WALL_H),
    brickMat(),
  );
  frontWall.position.set(0, WALL_H / 2, ROOM_L / 2);
  frontWall.rotation.y = Math.PI;
  frontWall.receiveShadow = true;
  group.add(frontWall);

  // side walls with arched niches cut out
  buildSideWall(group, -ROOM_W / 2, 1);   // left wall (niches)
  buildSideWall(group,  ROOM_W / 2, -1);  // right wall

  scene.add(group);
  return group;
}

function buildSideWall(parent, xPos, normalDir) {
  const NICHE_COUNT = 3;
  const NICHE_W = 1.4;
  const NICHE_H = 2.2;
  const NICHE_D = 0.6;
  const spacing = ROOM_L / (NICHE_COUNT + 1);
  const mat = brickMat();
  const nicheMat = new THREE.MeshStandardMaterial({
    color: '#5A2E18',
    roughness: 0.98,
    metalness: 0.0,
    side: THREE.BackSide,
  });

  for (let i = 0; i < NICHE_COUNT; i++) {
    const zPos = -ROOM_L / 2 + spacing * (i + 1);

    // wall panel beside niche
    const panelW = spacing - NICHE_W;
    if (panelW > 0.2) {
      [-1, 1].forEach(side => {
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(panelW * 0.9, WALL_H),
          mat,
        );
        panel.position.set(
          xPos,
          WALL_H / 2,
          zPos + side * (NICHE_W / 2 + panelW * 0.45),
        );
        panel.rotation.y = normalDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        panel.receiveShadow = true;
        parent.add(panel);
      });
    }

    // niche back
    const nicheBack = new THREE.Mesh(
      new THREE.PlaneGeometry(NICHE_W, NICHE_H),
      nicheMat,
    );
    nicheBack.position.set(
      xPos - normalDir * NICHE_D,
      NICHE_H / 2 + 0.1,
      zPos,
    );
    nicheBack.rotation.y = normalDir > 0 ? Math.PI / 2 : -Math.PI / 2;
    parent.add(nicheBack);

    // niche sides
    [-1, 1].forEach(side => {
      const nicheSide = new THREE.Mesh(
        new THREE.PlaneGeometry(NICHE_D, NICHE_H),
        nicheMat,
      );
      nicheSide.position.set(
        xPos - normalDir * NICHE_D / 2,
        NICHE_H / 2 + 0.1,
        zPos + side * NICHE_W / 2,
      );
      nicheSide.rotation.y = side * normalDir > 0 ? 0 : Math.PI;
      parent.add(nicheSide);
    });

    // niche arch top (half-cylinder)
    const archGeo = new THREE.CylinderGeometry(
      NICHE_W / 2, NICHE_W / 2, NICHE_D, 16, 1, true, 0, Math.PI,
    );
    archGeo.rotateZ(Math.PI / 2);
    archGeo.rotateY(normalDir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const archMesh = new THREE.Mesh(archGeo, nicheMat);
    archMesh.position.set(
      xPos - normalDir * NICHE_D / 2,
      NICHE_H + 0.1,
      zPos,
    );
    parent.add(archMesh);

    // candle glow inside each niche
    addNicheCandle(parent, xPos - normalDir * (NICHE_D - 0.05), NICHE_H * 0.25, zPos);
  }

  // wall above niches and top strip
  const topStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_L, WALL_H - NICHE_H - 0.3),
    mat,
  );
  topStrip.position.set(xPos, WALL_H - (WALL_H - NICHE_H - 0.3) / 2, 0);
  topStrip.rotation.y = normalDir > 0 ? Math.PI / 2 : -Math.PI / 2;
  topStrip.receiveShadow = true;
  parent.add(topStrip);
}

function addNicheCandle(parent, x, y, z) {
  // candle body
  const candleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
  const candleMat = new THREE.MeshStandardMaterial({ color: '#E8D5B0' });
  const candle = new THREE.Mesh(candleGeo, candleMat);
  candle.position.set(x, y, z);
  parent.add(candle);

  // flame glow
  const flame = new THREE.PointLight('#FF8020', 0.6, 2.5);
  flame.position.set(x, y + 0.18, z);
  parent.add(flame);

  // animated flicker stored on userData
  flame.userData.baseIntensity = 0.6;
  flame.userData.flickerSpeed = 3 + Math.random() * 2;
  flame.userData.flickerPhase = Math.random() * Math.PI * 2;
}

export function animateCandles(scene, t) {
  scene.traverse(obj => {
    if (obj.isPointLight && obj.userData.flickerSpeed) {
      const flicker = Math.sin(t * obj.userData.flickerSpeed + obj.userData.flickerPhase) * 0.12;
      obj.intensity = obj.userData.baseIntensity + flicker;
    }
  });
}
