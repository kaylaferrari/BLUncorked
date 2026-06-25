import * as THREE from 'three';

export function createFloor(scene) {
  const ROOM_W = 14;
  const ROOM_L = 22;

  // procedural wood shader — plank grain via sine waves
  const woodMat = new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color('#C8A46A') },
      uDarkColor: { value: new THREE.Color('#8B6535') },
      uPlankWidth: { value: 0.55 },
      uGrainFreq: { value: 28.0 },
      uGrainStrength: { value: 0.18 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uBaseColor;
      uniform vec3 uDarkColor;
      uniform float uPlankWidth;
      uniform float uGrainFreq;
      uniform float uGrainStrength;
      varying vec2 vUv;
      varying vec3 vPos;

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        // plank index
        float plankIdx = floor(vPos.x / uPlankWidth);
        float plankOffset = rand(vec2(plankIdx, 0.0));
        float plankDark = rand(vec2(plankIdx, 1.0)) * 0.15;

        // wood grain along plank length
        float grain = sin((vPos.z + plankOffset * 3.0) * uGrainFreq) * uGrainStrength;
        grain += sin((vPos.z + plankOffset * 1.5) * uGrainFreq * 0.4) * uGrainStrength * 0.5;
        grain = grain * 0.5 + 0.5;

        // seam between planks
        float seam = smoothstep(0.0, 0.03, fract(vPos.x / uPlankWidth));
        seam *= smoothstep(1.0, 0.97, fract(vPos.x / uPlankWidth));

        vec3 col = mix(uDarkColor, uBaseColor, grain);
        col -= plankDark;
        col *= seam * 0.85 + 0.15;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.FrontSide,
  });

  const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_L, 80, 80);
  floorGeo.rotateX(-Math.PI / 2);

  const floor = new THREE.Mesh(floorGeo, woodMat);
  floor.receiveShadow = true;
  floor.position.y = 0.01;
  scene.add(floor);

  // thin base plane for shadow catch
  const baseMat = new THREE.MeshStandardMaterial({ color: '#1C0F08' });
  const base = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W + 2, ROOM_L + 2), baseMat);
  base.rotateX(-Math.PI / 2);
  base.position.y = 0;
  base.receiveShadow = true;
  scene.add(base);

  return floor;
}
