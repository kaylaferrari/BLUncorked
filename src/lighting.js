import * as THREE from 'three';

export function setupLighting(scene) {
  // warm ambient — deep shadow fill
  const ambient = new THREE.AmbientLight('#3D1C08', 0.35);
  scene.add(ambient);

  // hemisphere — warm ceiling / cool floor bounce
  const hemi = new THREE.HemisphereLight('#FF9A3C', '#1C0F08', 0.18);
  scene.add(hemi);

  // main fill — soft warm from vault apex
  const fill = new THREE.DirectionalLight('#FFBE6A', 0.25);
  fill.position.set(0, 8, 0);
  fill.castShadow = false;
  scene.add(fill);

  // key zone lights scattered along the room length
  const keyPositions = [
    [-4, 5, -8],
    [3, 5, -3],
    [-2, 5, 3],
    [4, 5, 8],
  ];
  keyPositions.forEach(([x, y, z], i) => {
    const pl = new THREE.PointLight('#FF9A3C', 0.5 + i * 0.05, 12);
    pl.position.set(x, y, z);
    scene.add(pl);
  });

  // bar spot — warm white highlight on bottles
  const barSpot = new THREE.SpotLight('#FFF5C8', 1.5, 10, Math.PI / 5, 0.4, 1.5);
  barSpot.position.set(2, 6, -8);
  barSpot.target.position.set(2, 2, -10.5);
  scene.add(barSpot);
  scene.add(barSpot.target);

  // atrium rim light — warm amber from below
  const atriumGlow = new THREE.PointLight('#FF6010', 0.7, 5);
  atriumGlow.position.set(-1.5, -0.5, 1.5);
  scene.add(atriumGlow);

  return { ambient, hemi, fill };
}
