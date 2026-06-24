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
    //  CANVAS-DRAWN CHARACTER (replaces video + chroma key)
    // ════════════════════════════════════════════════════════
    const avatarCanvas = document.getElementById('avatar-canvas');
    const ctx = avatarCanvas ? avatarCanvas.getContext('2d') : null;

    let avatarAnimState = 'idle';
    function setAvatarState(state) {
        if (avatarAnimState === state) return;
        avatarAnimState = state;
        avatar.setAttribute('data-state', state);
    }

    // Colour palette — warm illustrated adventure-game style
    const CC = {
        ol:  '#1a0a02',  // outline
        sk:  '#e8b48e',  // skin
        skD: '#c48860',  // skin shadow
        skL: '#f0c8a0',  // skin highlight
        hr:  '#5a2e12',  // hair dark
        hrL: '#8a4e22',  // hair mid
        hrH: '#a06030',  // hair highlight
        sh:  '#ede8d8',  // shirt light
        shM: '#d4cdb8',  // shirt mid
        shD: '#b8af98',  // shirt shadow
        vs:  '#7a4618',  // vest
        vsL: '#9a6030',  // vest highlight
        vsD: '#4e2808',  // vest shadow
        jn:  '#4a72b4',  // jeans
        jnL: '#6a92d8',  // jeans highlight
        jnD: '#304e88',  // jeans shadow
        sc:  '#4a2e10',  // shoes
        scD: '#2e1808',  // shoe shadow
        scL: '#6a4828',  // shoe highlight
        bt:  '#201008',  // belt
        bk:  '#c8a030',  // belt buckle
        ol:  '#1a0a02',  // outline
        wh:  '#f8f4ec',  // shirt white
        ey:  '#3a2010',  // iris
        nb:  '#c07050',  // nose/cheek
    };

    // Helper: filled path with optional stroke
    function fp(pathFn, fill, stroke, lw) {
        ctx.beginPath();
        pathFn();
        if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
    }

    function drawCharacter() {
        if (!ctx) return;
        const W = avatarCanvas.width;   // 270
        const H = avatarCanvas.height;  // 480
        ctx.clearRect(0, 0, W, H);

        const t    = performance.now() / 1000;
        const walk = avatarAnimState === 'walking';
        const talk = avatarAnimState === 'talking';
        const ph   = walk ? t * 3.8 : 0;
        const leg  = walk ? Math.sin(ph) * 22 : 0;
        const arm  = walk ? -Math.sin(ph) * 16 : (talk ? Math.sin(t * 4) * 8 : 0);
        const bob  = walk ? Math.abs(Math.cos(ph)) * 3 : Math.sin(t * 1.1) * 1;
        const blink = (Math.sin(t * 0.8) > 0.96) ? 1 : 0;

        const CX = W * 0.5;
        const T  = H * 0.03 + bob;
        const f  = avatarFacing || 'down';

        if (f === 'left') {
            ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
            drawFront(CX, T, leg, arm, blink, true);
            ctx.restore();
        } else if (f === 'up') {
            drawBack(CX, T, leg, arm);
        } else {
            drawFront(CX, T, leg, arm, blink, f === 'right');
        }
    }

    function drawFront(cx, T, leg, arm, blink, lookRight) {
        const H_CY  = T + 60;   // head centre
        const H_RX  = 38;       // head x-radius
        const H_RY  = 50;       // head y-radius
        const NK_Y  = T + 108;  // neck top
        const SH_Y  = T + 148;  // shoulders
        const SH_W  = 56;       // half shoulder width
        const WS_Y  = T + 250;  // waist
        const WS_W  = 36;       // half waist width
        const HP_Y  = T + 272;  // hip
        const HP_W  = 44;       // half hip width
        const AN_Y  = T + 432;  // ankle
        const FT_Y  = T + 460;  // foot bottom

        // Hip pivots
        const lhx = cx - 24, rhx = cx + 24;
        const lfx = cx - 24 + leg, rfx = cx + 24 - leg;
        const lfdy = leg > 0 ? 4 : 0;
        const rfdy = leg < 0 ? 4 : 0;

        // ── Back leg ─────────────────────────────────────────
        if (leg >= 0) drawLeg(rhx, HP_Y, rfx, AN_Y+rfdy, FT_Y+rfdy, false);
        else          drawLeg(lhx, HP_Y, lfx, AN_Y+lfdy, FT_Y+lfdy, false);

        // ── Back arm ─────────────────────────────────────────
        const laEx = cx - SH_W - arm * 0.6;
        const raEx = cx + SH_W + arm * 0.6;
        const aEy  = WS_Y - 30;
        if (arm <= 0) drawArm(cx - SH_W, SH_Y, laEx, aEy, false);
        else          drawArm(cx + SH_W, SH_Y, raEx, aEy, false);

        // ── Torso ─────────────────────────────────────────────
        // Shirt
        fp(() => {
            ctx.moveTo(cx - SH_W, SH_Y);
            ctx.quadraticCurveTo(cx - SH_W - 4, SH_Y + 40, cx - WS_W, WS_Y);
            ctx.lineTo(cx - HP_W, HP_Y);
            ctx.lineTo(cx + HP_W, HP_Y);
            ctx.lineTo(cx + WS_W, WS_Y);
            ctx.quadraticCurveTo(cx + SH_W + 4, SH_Y + 40, cx + SH_W, SH_Y);
            ctx.closePath();
        }, CC.sh, CC.ol, 2.5);

        // Shirt shadow sides
        fp(() => {
            ctx.moveTo(cx - SH_W + 4, SH_Y + 4);
            ctx.quadraticCurveTo(cx - SH_W, SH_Y + 50, cx - WS_W + 6, WS_Y);
            ctx.lineTo(cx - WS_W + 14, WS_Y);
            ctx.quadraticCurveTo(cx - SH_W + 14, SH_Y + 50, cx - SH_W + 14, SH_Y + 4);
            ctx.closePath();
        }, CC.shD, null);
        fp(() => {
            ctx.moveTo(cx + SH_W - 4, SH_Y + 4);
            ctx.quadraticCurveTo(cx + SH_W, SH_Y + 50, cx + WS_W - 6, WS_Y);
            ctx.lineTo(cx + WS_W - 14, WS_Y);
            ctx.quadraticCurveTo(cx + SH_W - 14, SH_Y + 50, cx + SH_W - 14, SH_Y + 4);
            ctx.closePath();
        }, CC.shD, null);

        // Vest
        fp(() => {
            ctx.moveTo(cx - SH_W + 6, SH_Y + 2);
            ctx.bezierCurveTo(cx - SH_W + 2, SH_Y + 60, cx - 20, WS_Y - 40, cx - 14, WS_Y - 10);
            ctx.lineTo(cx + 14, WS_Y - 10);
            ctx.bezierCurveTo(cx + 20, WS_Y - 40, cx + SH_W - 2, SH_Y + 60, cx + SH_W - 6, SH_Y + 2);
            ctx.closePath();
        }, CC.vs, CC.ol, 2.5);

        // Vest shading
        fp(() => {
            ctx.moveTo(cx - SH_W + 10, SH_Y + 6);
            ctx.bezierCurveTo(cx - SH_W + 8, SH_Y + 55, cx - 22, WS_Y - 40, cx - 16, WS_Y - 12);
            ctx.lineTo(cx - 8, WS_Y - 12);
            ctx.bezierCurveTo(cx - 14, WS_Y - 42, cx - SH_W + 18, SH_Y + 55, cx - SH_W + 18, SH_Y + 6);
            ctx.closePath();
        }, CC.vsD, null);
        fp(() => {
            ctx.moveTo(cx + SH_W - 10, SH_Y + 6);
            ctx.bezierCurveTo(cx + SH_W - 8, SH_Y + 55, cx + 22, WS_Y - 40, cx + 16, WS_Y - 12);
            ctx.lineTo(cx + 8, WS_Y - 12);
            ctx.bezierCurveTo(cx + 14, WS_Y - 42, cx + SH_W - 18, SH_Y + 55, cx + SH_W - 18, SH_Y + 6);
            ctx.closePath();
        }, CC.vsD, null);

        // Vest buttons (3)
        for (let b = 0; b < 3; b++) {
            const by = SH_Y + 30 + b * 40;
            fp(() => { ctx.arc(cx, by, 4, 0, Math.PI*2); }, CC.vsD, CC.ol, 1.5);
        }

        // Collar / open shirt
        fp(() => {
            ctx.moveTo(cx - 16, NK_Y + 10);
            ctx.lineTo(cx - 4, NK_Y + 6);
            ctx.lineTo(cx, NK_Y + 36);
            ctx.lineTo(cx - 18, NK_Y + 42);
            ctx.closePath();
        }, CC.wh, CC.ol, 1.5);
        fp(() => {
            ctx.moveTo(cx + 16, NK_Y + 10);
            ctx.lineTo(cx + 4, NK_Y + 6);
            ctx.lineTo(cx, NK_Y + 36);
            ctx.lineTo(cx + 18, NK_Y + 42);
            ctx.closePath();
        }, CC.wh, CC.ol, 1.5);

        // Belt
        fp(() => { ctx.rect(cx - HP_W - 2, HP_Y - 11, (HP_W + 2)*2, 16); }, CC.bt, CC.ol, 2);
        fp(() => { ctx.rect(cx - 9, HP_Y - 9, 18, 12); }, CC.bk, CC.ol, 1.5);

        // ── Front arm ─────────────────────────────────────────
        if (arm <= 0) drawArm(cx + SH_W, SH_Y, raEx, aEy, true);
        else          drawArm(cx - SH_W, SH_Y, laEx, aEy, true);

        // ── Front leg ─────────────────────────────────────────
        if (leg >= 0) drawLeg(lhx, HP_Y, lfx, AN_Y+lfdy, FT_Y+lfdy, true);
        else          drawLeg(rhx, HP_Y, rfx, AN_Y+rfdy, FT_Y+rfdy, true);

        // ── Neck ──────────────────────────────────────────────
        fp(() => {
            ctx.moveTo(cx - 13, NK_Y + 4);
            ctx.bezierCurveTo(cx - 15, NK_Y + 28, cx - 14, NK_Y + 38, cx - 12, NK_Y + 44);
            ctx.lineTo(cx + 12, NK_Y + 44);
            ctx.bezierCurveTo(cx + 14, NK_Y + 38, cx + 15, NK_Y + 28, cx + 13, NK_Y + 4);
            ctx.closePath();
        }, CC.sk, CC.ol, 2);
        // Neck shadow
        fp(() => { ctx.rect(cx - 6, NK_Y + 4, 12, 40); }, CC.skD, null);

        // ── Head ──────────────────────────────────────────────
        // Jaw / chin
        fp(() => {
            ctx.ellipse(cx, H_CY + 14, H_RX - 6, H_RY - 14, 0, 0, Math.PI*2);
        }, CC.skD, null);

        // Head base
        fp(() => {
            ctx.ellipse(cx, H_CY, H_RX, H_RY, 0, 0, Math.PI*2);
        }, CC.sk, CC.ol, 3);

        // Cheek blush
        fp(() => { ctx.ellipse(cx - 22, H_CY + 14, 12, 8, -0.2, 0, Math.PI*2); }, 'rgba(220,120,80,0.2)', null);
        fp(() => { ctx.ellipse(cx + 22, H_CY + 14, 12, 8, 0.2, 0, Math.PI*2); }, 'rgba(220,120,80,0.2)', null);

        // Ear left
        fp(() => { ctx.ellipse(cx - H_RX + 5, H_CY + 8, 10, 14, -0.15, 0, Math.PI*2); }, CC.sk, CC.ol, 2);
        fp(() => { ctx.ellipse(cx - H_RX + 7, H_CY + 10, 5, 9, -0.15, 0, Math.PI*2); }, CC.skD, null);
        // Ear right
        fp(() => { ctx.ellipse(cx + H_RX - 5, H_CY + 8, 10, 14, 0.15, 0, Math.PI*2); }, CC.sk, CC.ol, 2);
        fp(() => { ctx.ellipse(cx + H_RX - 7, H_CY + 10, 5, 9, 0.15, 0, Math.PI*2); }, CC.skD, null);

        // ── Eyes ──────────────────────────────────────────────
        const eyeOff = lookRight ? 3 : -3;  // slight look direction
        const lEX = cx - 14 + eyeOff, rEX = cx + 14 + eyeOff;
        const eY  = H_CY;
        const blH = blink ? 1 : 7;

        // Eye whites
        fp(() => { ctx.ellipse(lEX, eY, 10, blH, 0, 0, Math.PI*2); }, '#fff', CC.ol, 1.5);
        fp(() => { ctx.ellipse(rEX, eY, 10, blH, 0, 0, Math.PI*2); }, '#fff', CC.ol, 1.5);

        if (!blink) {
            // Iris + pupil
            fp(() => { ctx.arc(lEX + eyeOff, eY, 6, 0, Math.PI*2); }, CC.ey, null);
            fp(() => { ctx.arc(rEX + eyeOff, eY, 6, 0, Math.PI*2); }, CC.ey, null);
            fp(() => { ctx.arc(lEX + eyeOff - 1, eY - 1, 3, 0, Math.PI*2); }, '#000', null);
            fp(() => { ctx.arc(rEX + eyeOff - 1, eY - 1, 3, 0, Math.PI*2); }, '#000', null);
            // Catchlights
            fp(() => { ctx.arc(lEX + eyeOff - 3, eY - 3, 1.8, 0, Math.PI*2); }, '#fff', null);
            fp(() => { ctx.arc(rEX + eyeOff - 3, eY - 3, 1.8, 0, Math.PI*2); }, '#fff', null);
        }

        // Upper eyelid lines
        ctx.beginPath(); ctx.moveTo(lEX - 10, eY - blH); ctx.quadraticCurveTo(lEX, eY - blH - 3, lEX + 10, eY - blH);
        ctx.strokeStyle = CC.ol; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rEX - 10, eY - blH); ctx.quadraticCurveTo(rEX, eY - blH - 3, rEX + 10, eY - blH);
        ctx.stroke();

        // Eyebrows
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lEX - 12, eY - 14); ctx.quadraticCurveTo(lEX, eY - 20, lEX + 10, eY - 14);
        ctx.strokeStyle = CC.hr; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rEX - 10, eY - 14); ctx.quadraticCurveTo(rEX, eY - 20, rEX + 12, eY - 14);
        ctx.stroke();

        // Nose
        const nY = H_CY + 16;
        ctx.beginPath();
        ctx.moveTo(cx - 5, nY);
        ctx.bezierCurveTo(cx - 10, nY + 12, cx - 12, nY + 20, cx - 6, nY + 24);
        ctx.bezierCurveTo(cx, nY + 28, cx + 6, nY + 24, ctx.moveTo ? null : undefined, nY + 24);
        ctx.strokeStyle = CC.skD; ctx.lineWidth = 2; ctx.stroke();
        // Simpler nose
        ctx.beginPath();
        ctx.moveTo(cx - 4, nY + 6);
        ctx.quadraticCurveTo(cx - 10, nY + 22, cx - 4, nY + 26);
        ctx.quadraticCurveTo(cx, nY + 30, cx + 4, nY + 26);
        ctx.quadraticCurveTo(cx + 10, nY + 22, cx + 4, nY + 6);
        ctx.strokeStyle = CC.nb; ctx.lineWidth = 2.5; ctx.stroke();

        // Mouth
        const mY = H_CY + 36;
        fp(() => {
            ctx.moveTo(cx - 14, mY);
            ctx.quadraticCurveTo(cx, mY + 12, cx + 14, mY);
        }, null, CC.skD, 2.5);
        fp(() => {
            ctx.moveTo(cx - 10, mY + 2);
            ctx.quadraticCurveTo(cx, mY + 10, cx + 10, mY + 2);
            ctx.lineTo(cx + 14, mY);
            ctx.quadraticCurveTo(cx, mY - 4, cx - 14, mY);
            ctx.closePath();
        }, '#c07858', null);
        // Teeth hint
        fp(() => {
            ctx.rect(cx - 8, mY + 1, 16, 7);
        }, '#f4f0e4', null);

        // ── Hair ──────────────────────────────────────────────
        const hairTop = T + 8;
        // Back hair mass
        fp(() => {
            ctx.moveTo(cx - H_RX + 2, H_CY - 12);
            ctx.bezierCurveTo(cx - H_RX - 4, H_CY - 40, cx - 22, hairTop + 4, cx - 8, hairTop);
            ctx.bezierCurveTo(cx, hairTop - 8, cx + 8, hairTop + 2, cx + 22, hairTop + 4);
            ctx.bezierCurveTo(cx + H_RX + 4, H_CY - 40, cx + H_RX - 2, H_CY - 12, cx + H_RX - 2, H_CY - 12);
            ctx.bezierCurveTo(cx + 12, H_CY - 30, cx - 12, H_CY - 30, cx - H_RX + 2, H_CY - 12);
            ctx.closePath();
        }, CC.hr, CC.ol, 2.5);

        // Hair mid tone strands
        fp(() => {
            ctx.moveTo(cx - 12, hairTop + 2);
            ctx.bezierCurveTo(cx - 6, hairTop - 2, cx + 6, hairTop - 4, cx + 16, hairTop + 6);
            ctx.bezierCurveTo(cx + 10, hairTop + 14, cx + 2, hairTop + 10, cx - 8, hairTop + 14);
            ctx.closePath();
        }, CC.hrL, null);
        fp(() => {
            ctx.moveTo(cx - 4, hairTop + 10);
            ctx.bezierCurveTo(cx + 4, hairTop + 4, cx + 18, hairTop + 10, cx + 22, hairTop + 20);
            ctx.bezierCurveTo(cx + 10, hairTop + 24, cx, hairTop + 18, cx - 4, hairTop + 10);
            ctx.closePath();
        }, CC.hrH, null);

        // Side hair over ears
        fp(() => {
            ctx.moveTo(cx - H_RX + 2, H_CY - 14);
            ctx.bezierCurveTo(cx - H_RX - 2, H_CY + 2, cx - H_RX, H_CY + 20, cx - H_RX + 8, H_CY + 30);
            ctx.bezierCurveTo(cx - H_RX + 2, H_CY + 28, cx - H_RX - 4, H_CY + 14, cx - H_RX - 2, H_CY + 2);
            ctx.bezierCurveTo(cx - H_RX - 2, H_CY - 8, cx - H_RX, H_CY - 16, cx - H_RX + 2, H_CY - 14);
            ctx.closePath();
        }, CC.hr, CC.ol, 1.5);
        fp(() => {
            ctx.moveTo(cx + H_RX - 2, H_CY - 14);
            ctx.bezierCurveTo(cx + H_RX + 2, H_CY + 2, cx + H_RX, H_CY + 20, cx + H_RX - 8, H_CY + 30);
            ctx.bezierCurveTo(cx + H_RX - 2, H_CY + 28, cx + H_RX + 4, H_CY + 14, cx + H_RX + 2, H_CY + 2);
            ctx.bezierCurveTo(cx + H_RX + 2, H_CY - 8, cx + H_RX, H_CY - 16, cx + H_RX - 2, H_CY - 14);
            ctx.closePath();
        }, CC.hr, CC.ol, 1.5);
    }

    function drawArm(sx, sy, ex, ey, front) {
        const col   = front ? CC.sh : CC.shD;
        const shCol = front ? CC.shD : '#a8a090';
        const mx    = sx + (ex - sx) * 0.48;
        const my    = sy + (ey - sy) * 0.46;
        const bulge = front ? 14 : 10;

        // Upper arm sleeve
        fp(() => {
            ctx.moveTo(sx - 13, sy);
            ctx.bezierCurveTo(sx - 14, my - 10, mx - bulge, my, mx - 10, my);
            ctx.bezierCurveTo(mx - 4, my, mx + 4, my, mx + 10, my);
            ctx.bezierCurveTo(mx + bulge, my, sx + 14, my - 10, sx + 13, sy);
            ctx.closePath();
        }, col, CC.ol, 2);

        // Forearm (skin)
        fp(() => {
            ctx.moveTo(mx - 9, my);
            ctx.bezierCurveTo(mx - 10, my + 18, ex - 10, ey - 16, ex - 9, ey);
            ctx.bezierCurveTo(ex - 4, ey + 14, ex + 4, ey + 14, ex + 9, ey);
            ctx.bezierCurveTo(ex + 10, ey - 16, mx + 10, my + 18, mx + 9, my);
            ctx.closePath();
        }, CC.sk, CC.ol, 2);

        // Hand
        fp(() => {
            ctx.ellipse(ex, ey + 8, 10, 13, 0.1, 0, Math.PI*2);
        }, CC.sk, CC.ol, 2);
        // Finger hints
        ctx.beginPath(); ctx.moveTo(ex - 8, ey + 4); ctx.lineTo(ex - 10, ey + 20);
        ctx.strokeStyle = CC.skD; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex, ey + 2); ctx.lineTo(ex, ey + 22);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex + 8, ey + 4); ctx.lineTo(ex + 10, ey + 20);
        ctx.stroke();
    }

    function drawLeg(hx, hy, fx, ay, fy, front) {
        const kx = hx + (fx - hx) * 0.52;
        const ky = hy + (ay - hy) * 0.50;
        const col  = front ? CC.jn : CC.jnD;
        const hiL  = front ? CC.jnL : CC.jn;

        // Thigh
        fp(() => {
            ctx.moveTo(hx - 20, hy);
            ctx.bezierCurveTo(hx - 20, ky - 16, kx - 16, ky, kx - 14, ky);
            ctx.lineTo(kx + 14, ky);
            ctx.bezierCurveTo(kx + 16, ky, hx + 20, ky - 16, hx + 20, hy);
            ctx.closePath();
        }, col, CC.ol, 2.5);

        // Shin
        fp(() => {
            ctx.moveTo(kx - 13, ky);
            ctx.bezierCurveTo(kx - 13, ky + 18, fx - 11, ay - 12, fx - 11, ay);
            ctx.lineTo(fx + 11, ay);
            ctx.bezierCurveTo(fx + 11, ay - 12, kx + 13, ky + 18, kx + 13, ky);
            ctx.closePath();
        }, col, CC.ol, 2.5);

        // Jeans highlight stripe
        if (front) {
            ctx.beginPath();
            ctx.moveTo(kx + 2, ky + 8);
            ctx.bezierCurveTo(kx + 2, ky + 36, fx + 3, ay - 22, fx + 3, ay - 6);
            ctx.strokeStyle = hiL; ctx.lineWidth = 4;
            ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1;
        }

        // Shoe / boot
        fp(() => {
            ctx.moveTo(fx - 16, ay - 2);
            ctx.bezierCurveTo(fx - 22, ay + 8, fx - 20, fy - 2, fx - 6, fy);
            ctx.bezierCurveTo(fx + 8, fy + 2, fx + 22, fy - 4, fx + 24, ay + 4);
            ctx.lineTo(fx + 22, ay - 2);
            ctx.bezierCurveTo(fx + 16, ay - 6, fx - 8, ay - 6, fx - 16, ay - 2);
            ctx.closePath();
        }, front ? CC.sc : CC.scD, CC.ol, 2.5);
        // Shoe highlight
        fp(() => {
            ctx.moveTo(fx - 10, ay + 2);
            ctx.bezierCurveTo(fx - 4, ay - 2, fx + 8, ay - 4, fx + 14, ay + 2);
            ctx.bezierCurveTo(fx + 8, ay + 8, fx - 4, ay + 8, fx - 10, ay + 2);
            ctx.closePath();
        }, front ? CC.scL : CC.sc, null);
    }

    function drawBack(cx, T, leg, arm) {
        const SH_Y = T + 148, SH_W = 56, WS_Y = T + 250, WS_W = 36;
        const HP_Y = T + 272, HP_W = 44, AN_Y = T + 432, FT_Y = T + 460;
        const lhx = cx - 24, rhx = cx + 24;
        const lfx = cx - 24 + leg, rfx = cx + 24 - leg;

        // Back legs
        if (leg >= 0) drawLeg(rhx, HP_Y, rfx, AN_Y, FT_Y, false);
        else          drawLeg(lhx, HP_Y, lfx, AN_Y, FT_Y, false);

        // Back torso (vest shows back)
        fp(() => {
            ctx.moveTo(cx - SH_W, SH_Y);
            ctx.quadraticCurveTo(cx - SH_W - 4, SH_Y + 50, cx - WS_W, WS_Y);
            ctx.lineTo(cx - HP_W, HP_Y); ctx.lineTo(cx + HP_W, HP_Y);
            ctx.lineTo(cx + WS_W, WS_Y);
            ctx.quadraticCurveTo(cx + SH_W + 4, SH_Y + 50, cx + SH_W, SH_Y);
            ctx.closePath();
        }, CC.vs, CC.ol, 2.5);

        // Shading
        fp(() => {
            ctx.moveTo(cx - SH_W + 8, SH_Y);
            ctx.quadraticCurveTo(cx - SH_W + 6, SH_Y + 50, cx - WS_W + 8, WS_Y);
            ctx.lineTo(cx - WS_W + 18, WS_Y);
            ctx.quadraticCurveTo(cx - SH_W + 18, SH_Y + 50, cx - SH_W + 18, SH_Y);
            ctx.closePath();
        }, CC.vsD, null);

        fp(() => { ctx.rect(cx - HP_W - 2, HP_Y - 11, (HP_W + 2)*2, 16); }, CC.bt, CC.ol, 2);
        fp(() => { ctx.rect(cx - 9, HP_Y - 9, 18, 12); }, CC.bk, CC.ol, 1.5);

        // Arms (back)
        drawArm(cx - SH_W, SH_Y, cx - SH_W + arm * 0.6, WS_Y - 30, false);
        drawArm(cx + SH_W, SH_Y, cx + SH_W - arm * 0.6, WS_Y - 30, true);

        // Front legs
        if (leg >= 0) drawLeg(lhx, HP_Y, lfx, AN_Y, FT_Y, true);
        else          drawLeg(rhx, HP_Y, rfx, AN_Y, FT_Y, true);

        // Neck back
        fp(() => {
            ctx.moveTo(cx - 11, T + 108);
            ctx.bezierCurveTo(cx - 12, T + 138, cx - 10, T + 148, cx - 8, T + 150);
            ctx.lineTo(cx + 8, T + 150); ctx.bezierCurveTo(cx + 10, T + 148, cx + 12, T + 138, cx + 11, T + 108);
            ctx.closePath();
        }, CC.sk, CC.ol, 2);

        // Head (back — all hair)
        fp(() => { ctx.ellipse(cx, T + 60, 38, 50, 0, 0, Math.PI*2); }, CC.hr, CC.ol, 3);
        fp(() => {
            ctx.moveTo(cx - 28, T + 38);
            ctx.bezierCurveTo(cx - 20, T + 12, cx - 8, T + 8, cx + 2, T + 8);
            ctx.bezierCurveTo(cx + 14, T + 8, cx + 26, T + 14, cx + 30, T + 36);
            ctx.bezierCurveTo(cx + 16, T + 42, cx, T + 44, cx - 28, T + 38);
            ctx.closePath();
        }, CC.hrL, null);
        fp(() => {
            ctx.moveTo(cx - 10, T + 14);
            ctx.bezierCurveTo(cx - 4, T + 8, cx + 4, T + 8, cx + 12, T + 16);
            ctx.bezierCurveTo(cx + 4, T + 22, cx - 4, T + 20, cx - 10, T + 14);
            ctx.closePath();
        }, CC.hrH, null);
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
