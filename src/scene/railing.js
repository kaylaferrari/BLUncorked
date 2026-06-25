import * as THREE from 'three';

const ATRIUM_R = 2.2;
const RAILING_H = 0.95;
const POST_COUNT = 32;

export function createRailing(scene) {
  const group = new THREE.Group();
  group.position.set(-1.5, 0, 1.5); // match atrium position

  const brassMat = new THREE.MeshStandardMaterial({
    color: '#C8A060',
    roughness: 0.25,
    metalness: 0.9,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#B8D4E8',
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.82,
    thickness: 0.08,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  });

  // ── top and bottom handrail tubes (curved rings) ───────────────────
  [0, RAILING_H].forEach(yOff => {
    const railCurve = new THREE.EllipseCurve(
      0, 0, ATRIUM_R, ATRIUM_R, 0, Math.PI * 2, false, 0,
    );
    const points = railCurve.getPoints(64).map(p => new THREE.Vector3(p.x, yOff, p.y));
    const railPath = new THREE.CatmullRomCurve3(points, true);
    const railGeo = new THREE.TubeGeometry(railPath, 80, 0.025, 8, true);
    const rail = new THREE.Mesh(railGeo, brassMat);
    rail.castShadow = true;
    group.add(rail);
  });

  // ── vertical glass panels between posts ───────────────────────────
  const panelCount = 24;
  for (let i = 0; i < panelCount; i++) {
    const a0 = (i / panelCount) * Math.PI * 2;
    const a1 = ((i + 1) / panelCount) * Math.PI * 2;
    const aMid = (a0 + a1) / 2;

    const x = Math.cos(aMid) * ATRIUM_R;
    const z = Math.sin(aMid) * ATRIUM_R;
    const arcLen = ATRIUM_R * (a1 - a0);

    const panelGeo = new THREE.PlaneGeometry(arcLen * 0.92, RAILING_H);
    const panel = new THREE.Mesh(panelGeo, glassMat);
    panel.position.set(x * 0.99, RAILING_H / 2, z * 0.99);
    panel.rotation.y = -aMid;
    group.add(panel);
  }

  // ── brass posts ────────────────────────────────────────────────────
  for (let i = 0; i < POST_COUNT; i++) {
    const angle = (i / POST_COUNT) * Math.PI * 2;
    const x = Math.cos(angle) * ATRIUM_R;
    const z = Math.sin(angle) * ATRIUM_R;

    const postGeo = new THREE.CylinderGeometry(0.018, 0.018, RAILING_H, 8);
    const post = new THREE.Mesh(postGeo, brassMat);
    post.position.set(x, RAILING_H / 2, z);
    post.castShadow = true;
    group.add(post);

    // post cap ball
    const capGeo = new THREE.SphereGeometry(0.028, 8, 8);
    const cap = new THREE.Mesh(capGeo, brassMat);
    cap.position.set(x, RAILING_H + 0.028, z);
    group.add(cap);
  }

  scene.add(group);
  return group;
}
