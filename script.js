/* ═══════════════════════════════════════════════════════════
   BLUncorked — Immersive 3D Adventure World
   Three.js r128 engine · point-and-click + WASD movement
   ═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

    // ════════════════════════════════════════════════════════
    //  THREE.JS SCENE SETUP
    // ════════════════════════════════════════════════════════
    const threeCanvas = document.getElementById('three-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene3d = new THREE.Scene();
    renderer.setClearColor(0x0d0503);

    const camera = new THREE.PerspectiveCamera(55, 16/9, 0.1, 300);

    // ── Background images fill canvas via scene.background ──────
    const texLoader = new THREE.TextureLoader();
    const upperBgTex = texLoader.load('Gemini_Generated_Image_s48kdss48kdss48k.png');
    const lowerBgTex = texLoader.load('Gemini_Generated_Image_njysn4njysn4njys.png');
    // Enable UV offset for background panning
    upperBgTex.wrapS = upperBgTex.wrapT = THREE.ClampToEdgeWrapping;
    lowerBgTex.wrapS = lowerBgTex.wrapT = THREE.ClampToEdgeWrapping;
    scene3d.background = upperBgTex;

    // ── Floor groups (all geometry invisible — bg image is the visual) ──
    const upperGroup = new THREE.Group();
    const lowerGroup = new THREE.Group();
    scene3d.add(upperGroup);
    scene3d.add(lowerGroup);
    lowerGroup.visible = false;

    // Invisible walk planes for click-to-walk raycasting only
    const walkPlaneUpper = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 100),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    walkPlaneUpper.rotation.x = -Math.PI / 2;
    upperGroup.add(walkPlaneUpper);

    const walkPlaneLower = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 100),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    walkPlaneLower.rotation.x = -Math.PI / 2;
    lowerGroup.add(walkPlaneLower);

    // ── Player group (invisible geometry — just a position anchor) ──
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 12);
    scene3d.add(playerGroup);

    // ════════════════════════════════════════════════════════
    //  INTERACTIVE SPOTS — 3D positions replace 2D hotspot divs
    // ════════════════════════════════════════════════════════
    const SPOTS = {
        upper: [
            { id:'welcome',      label:'Welcome to BL',       icon:'🍷',  floor:'upper', zone:'welcome',     pos:[ 0,  0,-15], radius:7  },
            { id:'skills',       label:'Skills Table',         icon:'🛠',  floor:'upper', zone:'skills',      pos:[-18, 0, -5], radius:7  },
            { id:'casestudies',  label:'Case Studies Corner',  icon:'📋', floor:'upper', zone:'casestudies', pos:[12,  0,-16], radius:7  },
            { id:'vintage',      label:'The Vintage Wall',     icon:'📅', floor:'upper', zone:'vintage',     pos:[22,  0, -6], radius:7  },
            { id:'sommelier',    label:'The Sommelier',        icon:'🧔', floor:'upper', npc:'Sommelier',    pos:[20,  0,  8], radius:5  },
            { id:'bottle',       label:'Glowing Bottle',       icon:'🍾', floor:'upper', item:'Glowing Bottle', pos:[24, 0, 10], radius:4 },
            { id:'corkscrew',    label:'Giant Corkscrew',      icon:'🔩', floor:'upper', prop:'Giant Corkscrew', pos:[-22,0,-8], radius:5 },
            { id:'doors',        label:'Double Doors',         icon:'🚪', floor:'upper', prop:'Double Doors', pos:[0,  0, 22], radius:6  },
            { id:'pit',          label:'Lower Cellar',         icon:'⬇',  floor:'upper', goto:'lower',       pos:[ 0,  0,  4], radius:9  },
        ],
        lower: [
            { id:'awards',       label:'Awards Alcove',        icon:'🏆', floor:'lower', zone:'awards',      pos:[-18, 0,  0], radius:8  },
            { id:'guide',        label:'Guide',                icon:'👤', floor:'lower', npc:'Guide',        pos:[ 0,  0,  8], radius:5  },
            { id:'vintage-lower',label:'The Vintage Wall',     icon:'📅', floor:'lower', zone:'vintage',     pos:[18,  0,  0], radius:8  },
            { id:'cellar-up',    label:'Upper Bar',            icon:'⬆',  floor:'lower', goto:'upper',       pos:[ 0,  0, -8], radius:6  },
        ]
    };

    // Flatten for easy iteration
    function currentSpots() {
        return SPOTS[currentScene] || [];
    }

    // ════════════════════════════════════════════════════════
    //  CAMERA — spherical orbit with smooth follow
    // ════════════════════════════════════════════════════════
    const sph = { theta: 0, phi: 1.05, r: 20 };
    // Fixed camera — orbits a static scene centre so the avatar moves around the background
    const SCENE_CENTER = new THREE.Vector3(0, 0, -2);

    function updateCamera(dt) {
        // Camera is anchored to scene centre — NOT following the player.
        // This is what makes the avatar visually walk around the background image.
        const cx = SCENE_CENTER.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
        const cy = SCENE_CENTER.y + sph.r * Math.cos(sph.phi);
        const cz = SCENE_CENTER.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
        camera.position.set(cx, cy, cz);
        camera.lookAt(SCENE_CENTER.x, SCENE_CENTER.y + 1.2, SCENE_CENTER.z);
    }

    // ── Background parallax pan ─────────────────────────────
    function panBackground() {
        // Shift UV so background scrolls as player walks — gives 2.5D depth feel
        // Range: player moves ±28 X → tex offset ±0.08 (subtle pan)
        const bounds = { w: 28, d: 30 };
        const tx = (playerGroup.position.x / bounds.w) * 0.07;
        const tz = (playerGroup.position.z / bounds.d) * 0.04;
        const tex = currentScene === 'upper' ? upperBgTex : lowerBgTex;
        tex.offset.set(-tx, tz);
    }

    // ════════════════════════════════════════════════════════
    //  WASD MOVEMENT
    // ════════════════════════════════════════════════════════
    // Prop collision radii (player can't walk through solid objects)
    const PROP_COLLIDERS = [
        { pos:[ 24, 0, 10], r: 2.5 }, // Glowing Bottle
        { pos:[-22, 0, -8], r: 2.5 }, // Giant Corkscrew
    ];
    function collidesWithProp(pos) {
        for (const c of PROP_COLLIDERS) {
            if (Math.hypot(pos.x - c.pos[0], pos.z - c.pos[2]) < c.r) return true;
        }
        return false;
    }

    const keys = {};
    const MOVE_SPEED = 8;
    const moveDir = new THREE.Vector3();

    document.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'KeyE') triggerNearestSpot();
    });
    document.addEventListener('keyup', e => { keys[e.code] = false; });

    function processMovement(dt) {
        // Camera-relative forward/right vectors
        const camFwd = new THREE.Vector3();
        camera.getWorldDirection(camFwd);
        camFwd.y = 0;
        camFwd.normalize();
        const camRight = new THREE.Vector3();
        camRight.crossVectors(camFwd, new THREE.Vector3(0,1,0)).normalize();

        moveDir.set(0, 0, 0);
        if (keys['KeyW'] || keys['ArrowUp'])    moveDir.addScaledVector(camFwd,   1);
        if (keys['KeyS'] || keys['ArrowDown'])  moveDir.addScaledVector(camFwd,  -1);
        if (keys['KeyA'] || keys['ArrowLeft'])  moveDir.addScaledVector(camRight,-1);
        if (keys['KeyD'] || keys['ArrowRight']) moveDir.addScaledVector(camRight,  1);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            const newPos = playerGroup.position.clone().addScaledVector(moveDir, MOVE_SPEED * dt);

            // Clamp to walkable bounds
            const bounds = currentScene === 'upper'
                ? { minX:-28, maxX:28, minZ:-30, maxZ:18 }
                : { minX:-25, maxX:25, minZ:-18, maxZ:16 };

            // Pit exclusion on upper floor — push player back if entering pit
            if (currentScene === 'upper') {
                newPos.x = Math.max(bounds.minX, Math.min(bounds.maxX, newPos.x));
                newPos.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, newPos.z));
                const inPit = Math.hypot(newPos.x / 9, (newPos.z - 4) / 9) < 1;
                if (!inPit && !collidesWithProp(newPos)) {
                    playerGroup.position.copy(newPos);
                } else if (inPit) {
                    // Push back toward player's current position (don't freeze them)
                    const fromPitX = playerGroup.position.x - 0;
                    const fromPitZ = playerGroup.position.z - 4;
                    const dist = Math.hypot(fromPitX, fromPitZ) || 1;
                    playerGroup.position.x += (fromPitX / dist) * 0.2;
                    playerGroup.position.z += (fromPitZ / dist) * 0.2;
                }
            } else {
                newPos.x = Math.max(bounds.minX, Math.min(bounds.maxX, newPos.x));
                newPos.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, newPos.z));
                if (!collidesWithProp(newPos)) playerGroup.position.copy(newPos);
            }

            // Facing direction
            if (moveDir.x < -0.3) avatarFacing = 'left';
            else if (moveDir.x > 0.3) avatarFacing = 'right';
            else if (moveDir.z < -0.3) avatarFacing = 'up';
            else if (moveDir.z > 0.3) avatarFacing = 'down';
            avatar.setAttribute('data-facing', avatarFacing);
            setAvatarState('walking');
        } else {
            setAvatarState('idle');
        }
    }

    // ════════════════════════════════════════════════════════
    //  CLICK-TO-WALK (3D raycasting)
    // ════════════════════════════════════════════════════════
    const raycaster = new THREE.Raycaster();
    const walkPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);

    threeCanvas.addEventListener('click', e => {
        // Ignore clicks on UI panels
        if (e.target !== threeCanvas) return;

        const rect = threeCanvas.getBoundingClientRect();
        const ndx = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        const ndy = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        raycaster.setFromCamera({ x: ndx, y: ndy }, camera);

        const hit = new THREE.Vector3();
        raycaster.ray.intersectPlane(walkPlane, hit);
        if (!hit) return;

        // Clamp to bounds
        const bounds = currentScene === 'upper'
            ? { minX:-28, maxX:28, minZ:-30, maxZ:18 }
            : { minX:-25, maxX:25, minZ:-18, maxZ:16 };
        hit.x = Math.max(bounds.minX, Math.min(bounds.maxX, hit.x));
        hit.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, hit.z));

        // Check if clicking near a spot
        let clickedSpot = null;
        for (const sp of currentSpots()) {
            if (Math.hypot(hit.x - sp.pos[0], hit.z - sp.pos[2]) < sp.radius * 1.3) {
                clickedSpot = sp;
                break;
            }
        }

        if (clickedSpot) {
            walkToSpot(clickedSpot);
        } else {
            walkToPoint(hit.x, hit.z, null);
        }
    });

    // ── Click on spot label chips ─────────────────────────
    // (handled via zone banner E-key or proximity trigger)

    // ════════════════════════════════════════════════════════
    //  WALK-TO-POINT (click destination)
    // ════════════════════════════════════════════════════════
    let walkTarget = null;
    let walkCallback = null;
    const WALK_ARRIVE_DIST = 1.8;

    function walkToPoint(x, z, callback) {
        walkTarget = new THREE.Vector3(x, 0, z);
        walkCallback = callback || null;
    }

    function walkToSpot(spot) {
        const [sx,,sz] = spot.pos;
        const angle = Math.atan2(
            playerGroup.position.x - sx,
            playerGroup.position.z - sz
        );
        // Approach from the player-side edge of the spot radius
        const approachDist = Math.max(spot.radius * 0.7, 2.5);
        const tx = sx + Math.sin(angle) * approachDist;
        const tz = sz + Math.cos(angle) * approachDist;
        walkToPoint(tx, tz, () => interactWithSpot(spot));
    }

    function processWalkTarget(dt) {
        if (!walkTarget) return;
        const dx = walkTarget.x - playerGroup.position.x;
        const dz = walkTarget.z - playerGroup.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < WALK_ARRIVE_DIST) {
            walkTarget = null;
            setAvatarState('idle');
            if (walkCallback) {
                const cb = walkCallback;
                walkCallback = null;
                setTimeout(cb, 120);
            }
            return;
        }
        const speed = MOVE_SPEED * dt;
        const nx = playerGroup.position.x + (dx/dist) * speed;
        const nz = playerGroup.position.z + (dz/dist) * speed;
        if (!collidesWithProp({ x: nx, z: nz })) playerGroup.position.set(nx, 0, nz);

        if (dx < -0.3) avatarFacing = 'left';
        else if (dx > 0.3) avatarFacing = 'right';
        else if (dz < -0.3) avatarFacing = 'up';
        else if (dz > 0.3) avatarFacing = 'down';
        avatar.setAttribute('data-facing', avatarFacing);
        setAvatarState('walking');

        // Rotate camera to track walk direction
        moveDir.set(dx/dist, 0, dz/dist);
    }

    // ════════════════════════════════════════════════════════
    //  PROXIMITY DETECTION
    // ════════════════════════════════════════════════════════
    let proximitySpot = null;
    let lastBannerSpot = null;

    function checkProximity() {
        const px = playerGroup.position.x;
        const pz = playerGroup.position.z;
        let nearest = null;
        let nearestDist = Infinity;

        for (const sp of currentSpots()) {
            const d = Math.hypot(px - sp.pos[0], pz - sp.pos[2]);
            if (d < sp.radius && d < nearestDist) {
                nearest = sp;
                nearestDist = d;
            }
        }

        proximitySpot = nearest;

        if (nearest !== lastBannerSpot) {
            lastBannerSpot = nearest;
            if (nearest) showZoneBanner(nearest);
            else hideZoneBanner();
        }
    }

    function showZoneBanner(spot) {
        zoneBanner.classList.remove('hidden');
        document.getElementById('zone-banner-icon').textContent = spot.icon || '';
        document.getElementById('zone-banner-name').textContent = spot.label || '';
    }

    function hideZoneBanner() {
        zoneBanner.classList.add('hidden');
    }

    function triggerNearestSpot() {
        if (proximitySpot) interactWithSpot(proximitySpot);
    }

    function interactWithSpot(spot) {
        if (spot.goto) {
            goToScene(spot.goto);
            return;
        }
        if (spot.zone) {
            openZonePanel(spot.zone);
            return;
        }
        if (spot.npc) {
            openDialogue(spot.npc);
            return;
        }
        if (spot.item || spot.prop) {
            const target = spot.item || spot.prop;
            handleAction(currentVerb, target, spot.item ? 'item' : 'prop', spot);
            return;
        }
    }

    // ════════════════════════════════════════════════════════
    //  AVATAR DOM PROJECTION (3D → 2D viewport position)
    // ════════════════════════════════════════════════════════
    const avatar    = document.getElementById('player-avatar');
    const wrapper   = document.getElementById('game-wrapper');
    let avatarFacing = 'right';

    // ── NPC DOM Sprites ─────────────────────────────────────
    // Each NPC gets a positioned DOM element projected from its 3D spot position
    const NPC_CONFIGS = [
        { id:'sommelier', floor:'upper', pos:[20, 0, 8],  emoji:'🧔', label:'Sommelier', color:'#e8c880' },
        { id:'corkscrew', floor:'upper', pos:[-22,0,-8],  emoji:'🔩', label:'Corkscrew',  color:'#aaa'    },
        { id:'bottle',    floor:'upper', pos:[24, 0, 10], emoji:'🍾', label:'',           color:'#c8f080' },
        { id:'guide',     floor:'lower', pos:[0,  0,  8], emoji:'👤', label:'Guide',      color:'#a8d8f0' },
    ];
    const npcEls = {};
    NPC_CONFIGS.forEach(cfg => {
        const el = document.createElement('div');
        el.className = 'npc-sprite';
        el.id = 'npc-' + cfg.id;
        el.dataset.floor = cfg.floor;
        el.innerHTML = `<span class="npc-emoji">${cfg.emoji}</span>${cfg.label ? `<span class="npc-label" style="color:${cfg.color}">${cfg.label}</span>` : ''}`;
        el.style.cssText = 'position:absolute;display:flex;flex-direction:column;align-items:center;pointer-events:none;z-index:7;transform:translate(-50%,-90%);';
        wrapper.appendChild(el);
        npcEls[cfg.id] = el;
    });

    function projectNPCs() {
        const W = threeCanvas.clientWidth;
        const H = threeCanvas.clientHeight;
        const wRect = wrapper.getBoundingClientRect();
        const cRect = threeCanvas.getBoundingClientRect();
        NPC_CONFIGS.forEach(cfg => {
            const el = npcEls[cfg.id];
            if (!el) return;
            const onCurrentFloor = cfg.floor === currentScene;
            if (!onCurrentFloor) { el.style.opacity = '0'; return; }
            const wp = new THREE.Vector3(cfg.pos[0], 0, cfg.pos[2]);
            const ndc = wp.clone().project(camera);
            // Hide if behind camera
            if (ndc.z > 1) { el.style.opacity = '0'; return; }
            const sx = (ndc.x + 1) / 2 * W;
            const sy = (-ndc.y + 1) / 2 * H;
            const dist = camera.position.distanceTo(wp);
            const scale = Math.max(0.4, Math.min(2.0, 22 / dist));
            el.style.left = (cRect.left - wRect.left + sx) + 'px';
            el.style.top  = (cRect.top  - wRect.top  + sy) + 'px';
            el.style.transform = `translate(-50%, -90%) scale(${scale.toFixed(3)})`;
            el.style.opacity = '1';
            el.style.fontSize = `${Math.round(scale * 2.4)}rem`;
        });
    }

    function projectAvatar() {
        const worldPos = playerGroup.position.clone();
        worldPos.y = 0;

        // Project to NDC
        const ndc = worldPos.clone().project(camera);

        // Convert NDC to canvas pixel coords
        const W = threeCanvas.clientWidth;
        const H = threeCanvas.clientHeight;
        const sx = (ndc.x  + 1) / 2 * W;
        const sy = (-ndc.y + 1) / 2 * H;

        // Distance-based perspective scale
        const dist = camera.position.distanceTo(worldPos);
        const perspScale = Math.max(0.3, Math.min(1.8, 22 / dist));

        // Position relative to game-wrapper
        const wRect = wrapper.getBoundingClientRect();
        const cRect = threeCanvas.getBoundingClientRect();
        const ax = cRect.left - wRect.left + sx;
        const ay = cRect.top  - wRect.top  + sy;

        avatar.style.left      = ax + 'px';
        avatar.style.top       = ay + 'px';
        avatar.style.transform = `translate(-50%, -90%) scale(${perspScale.toFixed(3)})`;
    }

    // ════════════════════════════════════════════════════════
    //  MINIMAP
    // ════════════════════════════════════════════════════════
    const minimapCanvas = document.getElementById('minimap');
    const mmCtx = minimapCanvas.getContext('2d');
    const MM_SIZE = 120;
    minimapCanvas.width  = MM_SIZE;
    minimapCanvas.height = MM_SIZE;

    // World space → minimap coords
    function wToMM(wx, wz) {
        const scale = MM_SIZE / 60;
        return {
            x: MM_SIZE/2 + wx * scale,
            y: MM_SIZE/2 + wz * scale
        };
    }

    function drawMinimap() {
        if (!mmCtx) return;
        mmCtx.clearRect(0, 0, MM_SIZE, MM_SIZE);

        // Circular clip
        mmCtx.save();
        mmCtx.beginPath();
        mmCtx.arc(MM_SIZE/2, MM_SIZE/2, MM_SIZE/2 - 2, 0, Math.PI*2);
        mmCtx.clip();

        // Background
        mmCtx.fillStyle = 'rgba(20,10,4,0.85)';
        mmCtx.fillRect(0, 0, MM_SIZE, MM_SIZE);

        // Zone dots
        for (const sp of currentSpots()) {
            const { x, y } = wToMM(sp.pos[0], sp.pos[2]);
            mmCtx.beginPath();
            mmCtx.arc(x, y, 5, 0, Math.PI*2);
            mmCtx.fillStyle = sp.goto ? '#6cf' :
                              sp.npc  ? '#fa8' :
                              sp.zone ? '#fc6' : '#aaa';
            mmCtx.fill();
        }

        // Player dot
        const pp = wToMM(playerGroup.position.x, playerGroup.position.z);
        mmCtx.beginPath();
        mmCtx.arc(pp.x, pp.y, 5, 0, Math.PI*2);
        mmCtx.fillStyle = '#fff';
        mmCtx.fill();

        mmCtx.restore();

        // Border ring
        mmCtx.beginPath();
        mmCtx.arc(MM_SIZE/2, MM_SIZE/2, MM_SIZE/2 - 2, 0, Math.PI*2);
        mmCtx.strokeStyle = '#8a5a28';
        mmCtx.lineWidth = 3;
        mmCtx.stroke();

        // Floor label
        mmCtx.fillStyle = '#e8c880';
        mmCtx.font = '9px Georgia, serif';
        mmCtx.textAlign = 'center';
        mmCtx.fillText(currentScene === 'upper' ? 'UPPER BAR' : 'SUSSEX CELLAR', MM_SIZE/2, MM_SIZE - 6);
    }

    // ════════════════════════════════════════════════════════
    //  RENDERER RESIZE
    // ════════════════════════════════════════════════════════
    function onResize() {
        const uiH = document.getElementById('ui-bar').offsetHeight || 0;
        const W = wrapper.clientWidth  || window.innerWidth;
        const H = (wrapper.clientHeight || window.innerHeight) - uiH;
        if (W < 1 || H < 1) return;
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        threeCanvas.style.width  = W + 'px';
        threeCanvas.style.height = H + 'px';
    }
    window.addEventListener('resize', onResize);
    // Defer initial resize until layout is painted
    requestAnimationFrame(() => { onResize(); });

    // ════════════════════════════════════════════════════════
    //  MAIN RENDER LOOP
    // ════════════════════════════════════════════════════════
    let lastTime = performance.now();

    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        // Only process WASD if no click-walk target active
        if (walkTarget) {
            processWalkTarget(dt);
        } else {
            processMovement(dt);
        }

        checkProximity();
        updateCamera(dt);
        panBackground();
        projectAvatar();
        projectNPCs();
        drawCharacter();
        drawMinimap();
        renderer.render(scene3d, camera);
    }

    // ════════════════════════════════════════════════════════
    //  SPRITE-BASED CHARACTER AVATAR
    // ════════════════════════════════════════════════════════
    const avatarCanvas = document.getElementById('avatar-canvas');
    const ctx = avatarCanvas ? avatarCanvas.getContext('2d') : null;

    let avatarAnimState = 'idle';
    function setAvatarState(state) {
        if (avatarAnimState === state) return;
        avatarAnimState = state;
        avatar.setAttribute('data-state', state);
    }

    // Load sprite assets
    const sprAssets = {};
    let sprLoadedCount = 0;
    const SPR_TOTAL = 4;
    function loadSpr(key, src) {
        const img = new Image();
        img.onload = () => { sprAssets[key] = img; sprLoadedCount++; };
        img.src = src;
    }
    loadSpr('walkFront', 'avatar_walk_front.png');   // 1308x267 — 6 frames, walk right
    loadSpr('walkBack',  'avatar_walk_back.png');    // 1308x267 — 6 frames, walk back
    loadSpr('idleFront', 'avatar_idle_front.png');   // 909x1536 — idle facing player
    loadSpr('idleBack',  'avatar_idle_back.png');    // 909x1536 — idle facing away

    // Walk strip: 6 frames × 218px wide
    const WALK_FRAMES = 6;
    const WALK_FW = 218;
    const WALK_FH = 267;

    function drawCharacter() {
        if (!ctx || sprLoadedCount < SPR_TOTAL) return;
        const CW = avatarCanvas.width;   // 270
        const CH = avatarCanvas.height;  // 480
        ctx.clearRect(0, 0, CW, CH);

        const t    = performance.now() / 1000;
        const walk = avatarAnimState === 'walking';
        const bob  = walk ? Math.abs(Math.sin(t * 7.6)) * 5 : Math.sin(t * 1.1) * 1.5;
        const f    = avatarFacing || 'down';
        const frame = walk ? Math.floor(t * 9) % WALK_FRAMES : 0;

        let img, sx, sy, sw, sh, flipH = false;

        if (f === 'up') {
            // Back-facing
            if (walk) {
                img = sprAssets.walkBack;
                sx = frame * WALK_FW; sy = 0; sw = WALK_FW; sh = WALK_FH;
            } else {
                img = sprAssets.idleBack;
                sx = 0; sy = 0; sw = img.naturalWidth; sh = img.naturalHeight;
            }
        } else if (f === 'left') {
            // Walk right strip, mirrored
            img = sprAssets.walkFront;
            sx = frame * WALK_FW; sy = 0; sw = WALK_FW; sh = WALK_FH;
            flipH = true;
        } else if (f === 'right') {
            img = sprAssets.walkFront;
            sx = frame * WALK_FW; sy = 0; sw = WALK_FW; sh = WALK_FH;
        } else {
            // down — toward camera
            if (walk) {
                img = sprAssets.walkFront;
                sx = frame * WALK_FW; sy = 0; sw = WALK_FW; sh = WALK_FH;
            } else {
                img = sprAssets.idleFront;
                sx = 0; sy = 0; sw = img.naturalWidth; sh = img.naturalHeight;
            }
        }

        // Compute draw rect: fit to canvas height, maintain aspect ratio, center
        const aspect = sw / sh;
        const dh = CH;
        const dw = dh * aspect;
        const dx = (CW - dw) / 2;
        const dy = Math.round(bob);

        ctx.save();
        if (flipH) {
            ctx.translate(CW, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, sx, sy, sw, sh, CW - dx - dw, dy, dw, dh);
        } else {
            ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        }
        ctx.restore();
    }

    // ════════════════════════════════════════════════════════
    //  SCENE MANAGEMENT
    // ════════════════════════════════════════════════════════
    let currentScene = 'upper';
    let currentVerb  = 'look';
    let inventory    = [];

    const overlay      = document.getElementById('transition-overlay');
    const floorLabel   = document.getElementById('floor-label');
    const btnUp        = document.getElementById('btn-up');
    const btnDown      = document.getElementById('btn-down');
    const zoneBanner   = document.getElementById('zone-banner');

    function goToScene(target) {
        if (target === currentScene) return;
        overlay.classList.add('active');
        walkTarget = null;
        walkCallback = null;

        setTimeout(() => {
            currentScene = target;
            upperGroup.visible = target === 'upper';
            lowerGroup.visible = target === 'lower';
            scene3d.background = target === 'lower' ? lowerBgTex : upperBgTex;

            floorLabel.textContent = target === 'lower' ? 'Sussex Cellar' : 'Upper Bar';
            btnUp.disabled   = target === 'upper';
            btnDown.disabled = target === 'lower';

            // Teleport player to arrival position
            if (target === 'lower') {
                playerGroup.position.set(0, 0, -2);
            } else {
                playerGroup.position.set(0, 0, 8);
            }

            closeAllPanels();
            hideZoneBanner();
            proximitySpot = null;
            lastBannerSpot = null;

            overlay.classList.remove('active');
        }, 350);
    }

    btnUp.addEventListener('click',   () => goToScene('upper'));
    btnDown.addEventListener('click', () => goToScene('lower'));

    // Wine scanner
    const scannerPanel = document.getElementById('scanner-panel');
    document.getElementById('btn-scan-wine').addEventListener('click', () => {
        if (scannerPanel.classList.contains('hidden')) {
            closeAllPanels();
            scannerPanel.classList.remove('hidden');
        } else {
            scannerPanel.classList.add('hidden');
        }
    });

    // ════════════════════════════════════════════════════════
    //  VERB BUTTONS
    // ════════════════════════════════════════════════════════
    const actionButtons = document.querySelectorAll('.action-buttons button');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            actionButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentVerb = btn.id.replace('btn-', '');
            hideDialogueBox();

            // Apply verb to nearest proximity spot
            if (proximitySpot) {
                const sp = proximitySpot;
                if (currentVerb === 'talk' && sp.npc) {
                    openDialogue(sp.npc);
                } else if (currentVerb === 'use' && sp.goto) {
                    goToScene(sp.goto);
                } else {
                    const target = sp.item || sp.prop || sp.label;
                    const type   = sp.item ? 'item' : sp.npc ? 'npc' : sp.prop ? 'prop' : 'zone';
                    handleAction(currentVerb, target, type, sp);
                }
            }
        });
    });

    // ════════════════════════════════════════════════════════
    //  INTERACTION LOGIC
    // ════════════════════════════════════════════════════════
    function handleAction(verb, target, type, sp) {
        if (verb === 'talk' && type === 'npc') { openDialogue(sp.npc || target); return; }

        let text = '';
        switch (verb) {
            case 'look':
                text = lookText(target);
                break;
            case 'take':
                if (type === 'item') {
                    addToInventory(target, sp);
                    text = `You carefully take the ${target}.`;
                } else if (target === 'Giant Corkscrew') {
                    text = "It's bolted to the floor. Decorative, or a warning.";
                } else {
                    text = `You can't pick up the ${target}.`;
                }
                break;
            case 'talk':
                text = "There's no one here to talk to about that.";
                break;
            case 'use':
                if (sp && sp.goto) { goToScene(sp.goto); return; }
                if (target === 'Giant Corkscrew') text = "You'd need a very large bottle.";
                else if (target === 'Glowing Bottle') text = "The bottle hums. Press the Scan Wine button to analyse it.";
                else text = "You're not sure how to use that.";
                break;
        }
        showMessage(text);
    }

    function lookText(target) {
        const lines = {
            'Lower Cellar':    "Through the glass floor you can see the Sussex Cellar below. Walk to the pit and press E to go down.",
            'Giant Corkscrew': "An oversized antique brass corkscrew. Imposing. Probably Art Deco. Definitely not functional.",
            'Glowing Bottle':  "It pulses with an eerie amber light. The label reads: Founder's Reserve, 2012. It hasn't been scanned.",
            'Double Doors':    "Heavy oak doors bound in iron. The way out — or the way further in.",
            'Sommelier':       "A distinguished figure with an extraordinary moustache. He carries a wine key like a weapon.",
            'Ceiling Opening': "The glass disc you dropped through. Above it, the warm light of the upper bar.",
            'Guide':           "A friendly Brainlabber stationed at the bottom. They know where everything is.",
        };
        return lines[target] || `You examine the ${target}. Interesting.`;
    }

    // ════════════════════════════════════════════════════════
    //  ZONE CONTENT
    // ════════════════════════════════════════════════════════
    const ZONES = {
        welcome: {
            icon: '🍷', title: 'Welcome to BL',
            html: `
                <h3>Welcome to BLUncorked</h3>
                <p>You've arrived at the Brainlabs wine cellar — an interactive world built for BLUncorked. Explore both floors, meet the team, and scan your wine.</p>
                <p>Use <strong>WASD</strong> or click the floor to walk. Press <strong>E</strong> near anything to interact. Use the verb buttons — Look, Take, Talk, Use — for additional actions.</p>
                <p>Head through the glass pit to explore the Sussex Cellar below.</p>
                <div style="margin-top:14px">
                    <span class="zone-tag">🗓 BLUncorked 2025</span>
                    <span class="zone-tag">1000+ Brainlabbers</span>
                    <span class="zone-tag">Global Media Agency</span>
                </div>`
        },
        skills: {
            icon: '🛠', title: 'Skills Table',
            html: `
                <h3>Skills Table</h3>
                <p>Brainlabs' full capability stack — each practice a distinct discipline, working together across every client brief.</p>
                <ul>
                    <li><strong>Paid Search</strong> — precision at scale</li>
                    <li><strong>Paid Social</strong> — audience-first creative</li>
                    <li><strong>Programmatic</strong> — data-driven buying</li>
                    <li><strong>SEO & CRO</strong> — organic growth + conversion</li>
                    <li><strong>Retail Media</strong> — shelf to screen</li>
                    <li><strong>Analytics</strong> — the engine behind all of it</li>
                    <li><strong>Influencer</strong> — authentic at scale</li>
                </ul>
                <p style="font-size:0.82rem;color:#b8a070">Practice content pending from team leads.</p>`
        },
        casestudies: {
            icon: '📋', title: 'Case Studies Corner',
            html: `
                <h3>Case Studies Corner</h3>
                <p>Proprietary tech, built in-house, deployed at scale. These are the tools that separate Brainlabs from everyone else.</p>
                <ul>
                    <li><strong>Cortex</strong> — AI-powered budget allocation</li>
                    <li><strong>Halo</strong> — cross-channel attribution</li>
                    <li><strong>Insight Engine</strong> — automated performance reporting</li>
                </ul>
                <p style="font-size:0.82rem;color:#b8a070">Full case study assets pending from practice leads.</p>`
        },
        vintage: {
            icon: '📅', title: 'The Vintage Wall',
            html: `
                <h3>The Vintage Wall</h3>
                <p>Brainlabs milestones displayed as wine vintages. The older the label, the more it's worth.</p>
                <ul>
                    <li><strong>2012</strong> — Founded. A spreadsheet and a hypothesis.</li>
                    <li><strong>2015</strong> — First US expansion. The hypothesis held.</li>
                    <li><strong>2018</strong> — 400 Brainlabbers across 4 hubs.</li>
                    <li><strong>2020</strong> — Remote-first before it was mandatory.</li>
                    <li><strong>2022</strong> — 1,000+ people. 9 global hubs.</li>
                    <li><strong>2025</strong> — BLUncorked. You are here.</li>
                </ul>
                <div style="margin-top:14px">
                    <span class="zone-tag">Est. 2012</span>
                    <span class="zone-tag">CEO: Dan Gilbert</span>
                </div>`
        },
        awards: {
            icon: '🏆', title: 'Awards Alcove',
            html: `
                <h3>Awards Alcove</h3>
                <p>Industry recognition displayed like bottles on a trophy shelf. The magnums are at the back.</p>
                <ul>
                    <li>🥇 Performance Agency of the Year</li>
                    <li>🥇 Best Use of Data & Technology</li>
                    <li>🥈 Most Innovative Agency</li>
                    <li>🥇 Best Places to Work — Global</li>
                </ul>
                <p style="font-size:0.82rem;color:#b8a070">Full awards list pending from Marketing.</p>`
        }
    };

    // ════════════════════════════════════════════════════════
    //  SOMMELIER DIALOGUE TREE
    // ════════════════════════════════════════════════════════
    const DIALOGUE = {
        start: {
            text: `"Ah — welcome. You've found your way to one of the finest cellars in the building." He adjusts his monocle. "I am the Sommelier. How may I assist?"`,
            choices: [
                { label: "Tell me about this place.",   next: 'about'  },
                { label: "What's that glowing bottle?", next: 'bottle' },
                { label: "How do I get downstairs?",    next: 'stairs' },
                { label: "Nothing, thank you.",         next: null     },
            ]
        },
        about: {
            text: `"This is BLUncorked — the Brainlabs world. The upper floor holds the bar, the skills table, case studies. Downstairs is the Sussex Cellar — quieter, more curated. Both floors are yours to explore."`,
            choices: [
                { label: "What's that glowing bottle?", next: 'bottle' },
                { label: "How do I get downstairs?",    next: 'stairs' },
                { label: "One more question…",          next: 'start'  },
                { label: "That's all. Thank you.",      next: null     },
            ]
        },
        bottle: {
            text: `He glances at it with evident unease. "The 2012 Founder's Reserve. The vintage that started all of this." A pause. "It glows because it hasn't been scanned yet. Use the Wine Scanner — it calms down."`,
            choices: [
                { label: "How do I scan wine?",       next: 'scan'  },
                { label: "Tell me about this place.", next: 'about' },
                { label: "Farewell.",                 next: null    },
            ]
        },
        scan: {
            text: `"Tap the Scan Wine button in your bar. Point your camera at any label. The system reads it and produces a full tasting profile — score, notes, pairings, all of it. Manual entry if the label is obscured. It's not cheating. It's curation."`,
            choices: [
                { label: "And downstairs?",        next: 'stairs' },
                { label: "That's all. Thank you.", next: null     },
            ]
        },
        stairs: {
            text: `"The circular glass opening in the floor." He gestures. "Walk to the pit, press E to descend. The Sussex Cellar holds the awards wall, the vintage collection, and a guide. Mind the step."`,
            choices: [
                { label: "One more question…",     next: 'start' },
                { label: "Thank you. Goodbye.",    next: null    },
            ]
        }
    };

    const dialoguePanel   = document.getElementById('dialogue-panel');
    const dialogueText    = document.getElementById('dialogue-text');
    const dialogueChoices = document.getElementById('dialogue-choices');

    function openDialogue(npcName) {
        closeAllPanels();
        setAvatarState('talking');
        if (npcName === 'Sommelier') {
            showDialogueNode('start');
        } else {
            dialogueText.textContent = `"Hello." The ${npcName} smiles warmly.`;
            dialogueChoices.innerHTML = `<button class="choice-btn" onclick="document.getElementById('dialogue-panel').classList.add('hidden')">Goodbye.</button>`;
        }
        dialoguePanel.classList.remove('hidden');
    }

    function showDialogueNode(nodeId) {
        if (!nodeId || !DIALOGUE[nodeId]) {
            dialoguePanel.classList.add('hidden');
            setAvatarState('idle');
            return;
        }
        const node = DIALOGUE[nodeId];
        dialogueText.textContent = node.text;
        dialogueChoices.innerHTML = '';
        node.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.label;
            btn.addEventListener('click', () => showDialogueNode(choice.next));
            dialogueChoices.appendChild(btn);
        });
    }

    // ════════════════════════════════════════════════════════
    //  ZONE PANELS
    // ════════════════════════════════════════════════════════
    const zonePanel      = document.getElementById('zone-panel');
    const zonePanelTitle = document.getElementById('zone-panel-title');
    const zonePanelIcon  = document.getElementById('zone-panel-icon');
    const zonePanelBody  = document.getElementById('zone-panel-body');

    function openZonePanel(zoneId) {
        const z = ZONES[zoneId];
        if (!z) return;
        closeAllPanels();
        zonePanelIcon.textContent  = z.icon;
        zonePanelTitle.textContent = z.title;
        zonePanelBody.innerHTML    = z.html;
        zonePanel.classList.remove('hidden');
    }

    // ════════════════════════════════════════════════════════
    //  INVENTORY
    // ════════════════════════════════════════════════════════
    function addToInventory(itemName, sp) {
        if (inventory.includes(itemName)) return;
        inventory.push(itemName);
        const slots = document.querySelectorAll('.slot');
        const idx = inventory.length - 1;
        if (idx < slots.length) {
            slots[idx].textContent = { 'Glowing Bottle': '🍾' }[itemName] || '📦';
        }
    }

    // ════════════════════════════════════════════════════════
    //  PANEL CLOSE
    // ════════════════════════════════════════════════════════
    document.querySelectorAll('.panel-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(btn.dataset.panel).classList.add('hidden');
            if (avatarAnimState === 'talking') setAvatarState('idle');
        });
    });

    function closeAllPanels() {
        document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
        if (avatarAnimState === 'talking') setAvatarState('idle');
    }

    // ════════════════════════════════════════════════════════
    //  AMBIENT DIALOGUE BOX
    // ════════════════════════════════════════════════════════
    const dialogueBox = document.getElementById('dialogue-box');
    let msgTimer;

    function showMessage(text) {
        if (!text) return;
        dialogueBox.textContent = text;
        dialogueBox.classList.remove('hidden');
        clearTimeout(msgTimer);
        msgTimer = setTimeout(hideDialogueBox, 4000);
    }
    function hideDialogueBox() {
        dialogueBox.classList.add('hidden');
    }

    // ════════════════════════════════════════════════════════
    //  CONTROLS HINT — fade on first movement
    // ════════════════════════════════════════════════════════
    const controlsHint = document.getElementById('controls-hint');
    let hintFaded = false;
    function maybeFadeHint() {
        if (hintFaded) return;
        hintFaded = true;
        controlsHint.classList.add('fade');
        setTimeout(() => { controlsHint.style.display = 'none'; }, 1200);
    }
    ['keydown', 'click'].forEach(ev => document.addEventListener(ev, maybeFadeHint, { once: true }));

    // ════════════════════════════════════════════════════════
    //  KEYBOARD CAMERA ORBIT (mouse drag optional extension)
    // ════════════════════════════════════════════════════════
    document.addEventListener('keydown', e => {
        if (e.code === 'KeyQ') sph.theta -= 0.04;
        if (e.code === 'KeyR') sph.theta += 0.04;
    });

    // ════════════════════════════════════════════════════════
    //  TOUCH / MOBILE — virtual joystick fallback
    // ════════════════════════════════════════════════════════
    let touchOrigin = null;
    threeCanvas.addEventListener('touchstart', e => {
        const t = e.touches[0];
        touchOrigin = { x: t.clientX, y: t.clientY };
    }, { passive: true });

    threeCanvas.addEventListener('touchmove', e => {
        if (!touchOrigin) return;
        const t = e.touches[0];
        const dx = t.clientX - touchOrigin.x;
        const dy = t.clientY - touchOrigin.y;
        keys['KeyW'] = dy < -20;
        keys['KeyS'] = dy >  20;
        keys['KeyA'] = dx < -20;
        keys['KeyD'] = dx >  20;
    }, { passive: true });

    threeCanvas.addEventListener('touchend', () => {
        touchOrigin = null;
        keys['KeyW'] = keys['KeyS'] = keys['KeyA'] = keys['KeyD'] = false;
    }, { passive: true });

    // Start render loop only after all declarations are complete
    animate();

});
