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

    // ── Scene background and shadow setup ────────────────
    scene3d.background = new THREE.Color(0x0d0503);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Floor groups ──────────────────────────────────────
    const upperGroup = new THREE.Group();
    const lowerGroup = new THREE.Group();
    scene3d.add(upperGroup);
    scene3d.add(lowerGroup);
    lowerGroup.visible = false;

    // ════════════════════════════════════════════════════════
    //  3D WORLD BUILDER — helper functions
    // ════════════════════════════════════════════════════════
    function box(w, h, d, color, x, y, z, ry) {
        const m = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshLambertMaterial({ color })
        );
        m.position.set(x, y, z);
        if (ry) m.rotation.y = ry;
        return m;
    }
    function cyl(rt, rb, h, color, x, y, z, segs) {
        const m = new THREE.Mesh(
            new THREE.CylinderGeometry(rt, rb, h, segs || 12),
            new THREE.MeshLambertMaterial({ color })
        );
        m.position.set(x, y, z);
        return m;
    }
    function ptLight(color, intensity, x, y, z, dist) {
        const l = new THREE.PointLight(color, intensity, dist || 18);
        l.position.set(x, y, z);
        return l;
    }
    function wineRack(x, z, ry, group) {
        const g = new THREE.Group();
        // Backing panel: height=4, centre at y=2 (bottom on floor, top at y=4)
        g.add(box(3.0, 4.0, 0.3, 0x3d1f0a, 0, 2.0, 0));
        // Horizontal shelves at various heights
        for (let sh = 0; sh < 4; sh++) {
            g.add(box(2.8, 0.1, 0.5, 0x2e1608, 0, 0.8 + sh * 1.0, 0.15));
        }
        // Bottles lying on each shelf
        const bCols = [0x1a3d14, 0x3d1010, 0x102038, 0x1a2808];
        for (let sh = 0; sh < 3; sh++) {
            for (let bi = 0; bi < 3; bi++) {
                const bm = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.14, 1.0, 8),
                    new THREE.MeshLambertMaterial({ color: bCols[(sh * 3 + bi) % bCols.length] })
                );
                bm.rotation.x = Math.PI / 2;
                // bottle centre: shelf y + bottle radius above shelf surface
                bm.position.set((bi - 1) * 0.9, 0.95 + sh * 1.0, 0.05);
                g.add(bm);
            }
        }
        g.position.set(x, 0, z);
        g.rotation.y = ry || 0;
        group.add(g);
    }
    function barrel(x, z, yBase, group) {
        // yBase = y of barrel bottom in world space; barrel body centre at yBase + 0.7
        const g = new THREE.Group();
        g.add(cyl(0.75, 0.65, 1.4, 0x5a2e0a, 0, 0.7, 0, 10)); // centre at y=0.7
        for (const hy of [0.3, 0.7, 1.1]) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.77, 0.06, 6, 16),
                new THREE.MeshLambertMaterial({ color: 0x8a6020 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = hy;
            g.add(ring);
        }
        g.position.set(x, yBase || 0, z);
        group.add(g);
        return g;
    }

    // ════════════════════════════════════════════════════════
    //  BUILD UPPER FLOOR  (all y values = absolute centre)
    // ════════════════════════════════════════════════════════
    function buildUpperFloor() {
        const u = upperGroup;

        // ── Lighting ─────────────────────────────────────
        u.add(new THREE.AmbientLight(0x7a4020, 1.4));
        const sunU = new THREE.DirectionalLight(0xffdd99, 1.2);
        sunU.position.set(5, 20, -5);
        u.add(sunU);

        // ── Wood floor ───────────────────────────────────
        const floorU = new THREE.Mesh(
            new THREE.PlaneGeometry(60, 58),
            new THREE.MeshLambertMaterial({ color: 0x8a5a22 })
        );
        floorU.rotation.x = -Math.PI / 2;
        u.add(floorU);
        for (let pi = 0; pi < 10; pi++) {
            const pl = new THREE.Mesh(
                new THREE.PlaneGeometry(60, 0.06),
                new THREE.MeshLambertMaterial({ color: 0x3a2008 })
            );
            pl.rotation.x = -Math.PI / 2;
            pl.position.set(0, 0.01, -27 + pi * 6);
            u.add(pl);
        }

        // ── Vaulted ceiling (half cylinder, inside visible) ──
        const vaultU = new THREE.Mesh(
            new THREE.CylinderGeometry(13, 13, 60, 22, 1, true, 0, Math.PI),
            new THREE.MeshLambertMaterial({ color: 0x9a5a38, side: THREE.BackSide })
        );
        vaultU.rotation.z = Math.PI / 2;
        vaultU.position.set(0, 13, 0);
        u.add(vaultU);
        // (no flat cap — open vault sides let light through)

        // ── Walls ─────────────────────────────────────────
        // back wall: height 16, centre y=8
        u.add(box(62, 16, 0.8, 0x8a5030, 0, 8, -30));
        // side walls: depth 62, centre y=8
        u.add(box(0.8, 16, 62, 0x7a4828, -29, 8, -1));
        u.add(box(0.8, 16, 62, 0x7a4828,  29, 8, -1));
        // front wall (split for doors: 6 wide × 10 tall)
        u.add(box(26, 16, 0.8, 0x7a4a32, -17, 8, 35));
        u.add(box(26, 16, 0.8, 0x7a4a32,  17, 8, 35));
        u.add(box(12, 6, 0.8, 0x7a4a32, 0, 13, 35));  // lintel

        // ── Double doors ──────────────────────────────────
        u.add(box(5.6, 10, 0.4, 0x3a1a06, -3, 5, 35));
        u.add(box(5.6, 10, 0.4, 0x3a1a06,  3, 5, 35));
        u.add(cyl(0.07, 0.07, 0.5, 0xc8963c, -0.5, 4.5, 35.3, 8));
        u.add(cyl(0.07, 0.07, 0.5, 0xc8963c,  0.5, 4.5, 35.3, 8));
        u.add(ptLight(0x44ff44, 0.6, 0, 3, 34, 5));

        // ── Bar counter (z≈-23) ───────────────────────────
        u.add(box(24, 1.1, 2.4, 0x2a1205, 0, 0.55, -23));   // counter body (centre y=0.55)
        u.add(box(24.4, 0.15, 2.8, 0x5a3010, 0, 1.175, -23)); // top slab
        // Back bar shelves on wall
        for (let si = 0; si < 3; si++) {
            const sy = 3.5 + si * 2.6;
            u.add(box(20, 0.14, 0.7, 0x3a2008, 0, sy, -29.4));
            const bbc = [0x1a3d14, 0x3d1010, 0x102038, 0x2a3008, 0x3a1028];
            for (let bi = -9; bi <= 9; bi++) {
                const c = bbc[(bi + si * 4 + 12) % bbc.length];
                // bottle body: height 0.9, centre y = shelf + 0.52
                u.add(cyl(0.12, 0.12, 0.9, c, bi * 2, sy + 0.52, -29.2, 8));
                // neck: height 0.28, centre y = shelf + 1.01
                u.add(cyl(0.05, 0.09, 0.28, c, bi * 2, sy + 1.01, -29.2, 8));
            }
        }
        u.add(ptLight(0xffaa44, 2.0, 0, 7, -27, 30));

        // ── Wine racks (side walls) ────────────────────────
        wineRack(-26, -14, Math.PI / 2, u);
        wineRack(-26,  -7, Math.PI / 2, u);
        wineRack(-26,   0, Math.PI / 2, u);
        wineRack( 26, -14, -Math.PI / 2, u);
        wineRack( 26,  -7, -Math.PI / 2, u);
        wineRack( 26,   0, -Math.PI / 2, u);

        // ── Giant corkscrew (x=-20, z=-8) ─────────────────
        u.add(cyl(0.45, 0.55, 0.35, 0xc8963c, -20, 0.175, -8, 28)); // base
        u.add(cyl(0.14, 0.14, 3.2, 0xc8963c, -20, 1.6, -8, 8));     // shaft (centre y=1.6)
        u.add(box(2.6, 0.18, 0.18, 0xc8963c, -20, 3.29, -8));        // handle
        for (let hi = 0; hi < 8; hi++) {
            const ang = (hi / 8) * Math.PI * 4;
            const sp = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 6, 4),
                new THREE.MeshLambertMaterial({ color: 0xb8860b })
            );
            sp.position.set(-20 + Math.cos(ang) * 0.65, 0.5 + hi * 0.36, -8 + Math.sin(ang) * 0.65);
            u.add(sp);
        }
        u.add(ptLight(0xffaa44, 0.5, -20, 5, -8, 8));

        // ── Pit (centre at world 0,0,4) ───────────────────
        const pitDisc = new THREE.Mesh(
            new THREE.CircleGeometry(4.4, 32),
            new THREE.MeshLambertMaterial({ color: 0x04010a })
        );
        pitDisc.rotation.x = -Math.PI / 2;
        pitDisc.position.set(0, 0.05, 4);
        u.add(pitDisc);
        const pitRim = new THREE.Mesh(
            new THREE.TorusGeometry(4.5, 0.3, 8, 36),
            new THREE.MeshLambertMaterial({ color: 0xc8963c })
        );
        pitRim.rotation.x = Math.PI / 2;
        pitRim.position.set(0, 0.3, 4);
        u.add(pitRim);
        const pitSurr = new THREE.Mesh(
            new THREE.RingGeometry(4.5, 5.5, 32),
            new THREE.MeshLambertMaterial({ color: 0x4a2e08, side: THREE.DoubleSide })
        );
        pitSurr.rotation.x = -Math.PI / 2;
        pitSurr.position.set(0, 0.08, 4);
        u.add(pitSurr);
        u.add(ptLight(0x4466ff, 1.0, 0, -1, 4, 14));

        // ── Chandeliers (hanging from y≈12) ───────────────
        [[-12, -8], [0, -13], [12, -6]].forEach(([cx, cz]) => {
            u.add(cyl(0.06, 0.06, 2.4, 0xb8860b, cx, 11.8, cz, 6)); // rod: centre y=11.8
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.85, 0.09, 6, 16),
                new THREE.MeshLambertMaterial({ color: 0xc8963c })
            );
            ring.position.set(cx, 10.6, cz);
            u.add(ring);
            for (let gi = 0; gi < 5; gi++) {
                const ang = (gi / 5) * Math.PI * 2;
                const globe = new THREE.Mesh(
                    new THREE.SphereGeometry(0.14, 7, 6),
                    new THREE.MeshLambertMaterial({ color: 0xffeeaa })
                );
                globe.position.set(cx + Math.cos(ang) * 0.85, 10.6, cz + Math.sin(ang) * 0.85);
                u.add(globe);
            }
            u.add(ptLight(0xffdd88, 3.0, cx, 10, cz, 32));
        });

        // ── Wall sconces ───────────────────────────────────
        [[-28, 5, -12], [28, 5, -12], [-28, 5, 8], [28, 5, 8]].forEach(([sx, sy, sz]) => {
            u.add(box(0.3, 0.5, 0.5, 0xc8963c, sx, sy, sz));
            u.add(ptLight(0xffaa55, 1.5, sx < 0 ? sx + 1 : sx - 1, sy, sz, 14));
        });

        // ── Sommelier gold floor ring (at x=20, z=8) ──────
        const somRing = new THREE.Mesh(
            new THREE.RingGeometry(1.3, 1.7, 32),
            new THREE.MeshLambertMaterial({ color: 0xc8963c, side: THREE.DoubleSide })
        );
        somRing.rotation.x = -Math.PI / 2;
        somRing.position.set(20, 0.04, 8);
        u.add(somRing);
        u.add(ptLight(0xffcc66, 0.9, 20, 5, 8, 12));

        // ── Glowing bottle on pedestal (x=22, z=10) ───────
        u.add(cyl(0.55, 0.65, 1.0, 0x2a1205, 22, 0.5, 10, 12));   // pedestal centre y=0.5
        u.add(cyl(0.16, 0.20, 0.95, 0x1a5a1a, 22, 1.475, 10, 8)); // bottle centre y=1.475
        u.add(cyl(0.06, 0.11, 0.30, 0x1a5a1a, 22, 2.1, 10, 8));   // neck centre y=2.1
        u.add(ptLight(0x66ff44, 1.0, 22, 3, 10, 6));

        // ── Round tables ───────────────────────────────────
        [[-9, 8], [9, 8], [-9, 2]].forEach(([tx, tz]) => {
            u.add(cyl(0.09, 0.09, 2.5, 0x2a1205, tx, 1.25, tz, 8)); // leg: centre y=1.25
            u.add(cyl(1.0, 1.0, 0.1, 0x3a1a08, tx, 2.55, tz, 16));  // top: centre y=2.55
            u.add(cyl(0.7, 0.7, 0.08, 0x3a1a08, tx, 0.04, tz, 16)); // foot base
        });

        // ── Corner barrels near entrance ──────────────────
        barrel(-26, 22, 0, u); barrel(-24, 22, 0, u);
        barrel( 24, 22, 0, u); barrel( 26, 22, 0, u);
        barrel(-25, 22, 1.5, u); barrel(25, 22, 1.5, u); // stacked row
    }

    // ════════════════════════════════════════════════════════
    //  BUILD LOWER FLOOR  (all y values = absolute centre)
    // ════════════════════════════════════════════════════════
    function buildLowerFloor() {
        const lo = lowerGroup;

        // ── Lighting ─────────────────────────────────────
        lo.add(new THREE.AmbientLight(0x503818, 1.2));
        lo.add(ptLight(0xff8833, 2.5, 0, 7, 0, 40));

        // ── Stone floor ───────────────────────────────────
        const floorL = new THREE.Mesh(
            new THREE.PlaneGeometry(52, 44),
            new THREE.MeshLambertMaterial({ color: 0x40382c })
        );
        floorL.rotation.x = -Math.PI / 2;
        lo.add(floorL);
        // Tile grid (alternating box pairs, y centre = 0.03)
        const tileCols = [0x40382c, 0x302820];
        for (let ti = 0; ti < 7; ti++) {
            for (let tj = 0; tj < 6; tj++) {
                const tile = new THREE.Mesh(
                    new THREE.BoxGeometry(7, 0.06, 7),
                    new THREE.MeshLambertMaterial({ color: tileCols[(ti + tj) % 2] })
                );
                tile.position.set(-21 + ti * 7, 0.03, -17.5 + tj * 7);
                lo.add(tile);
            }
        }

        // ── Low vault ceiling ─────────────────────────────
        const vaultL = new THREE.Mesh(
            new THREE.CylinderGeometry(9.5, 9.5, 52, 18, 1, true, 0, Math.PI),
            new THREE.MeshLambertMaterial({ color: 0x261408, side: THREE.BackSide })
        );
        vaultL.rotation.z = Math.PI / 2;
        vaultL.position.set(0, 9.5, 0);
        lo.add(vaultL);
        const capL = new THREE.Mesh(
            new THREE.PlaneGeometry(52, 19),
            new THREE.MeshLambertMaterial({ color: 0x1a0e04, side: THREE.BackSide })
        );
        capL.rotation.x = Math.PI / 2;
        capL.position.set(0, 9.5, 0);
        lo.add(capL);

        // ── Walls (height 12, centre y=6) ─────────────────
        const stoneCol = 0x4a3c2e;
        lo.add(box(54, 12, 0.8, stoneCol, 0, 6, -22));
        lo.add(box(54, 12, 0.8, stoneCol, 0, 6,  22));
        lo.add(box(0.8, 12, 46, stoneCol, -25, 6, 0));
        lo.add(box(0.8, 12, 46, stoneCol,  25, 6, 0));

        // ── Ceiling opening (warm glow at y≈9.4, z=-8) ────
        const ceilRing = new THREE.Mesh(
            new THREE.RingGeometry(2.8, 3.8, 32),
            new THREE.MeshLambertMaterial({ color: 0xb8820a, side: THREE.DoubleSide })
        );
        ceilRing.rotation.x = -Math.PI / 2;
        ceilRing.position.set(0, 9.35, -8);
        lo.add(ceilRing);
        const ceilGlow = new THREE.Mesh(
            new THREE.CircleGeometry(2.7, 32),
            new THREE.MeshLambertMaterial({ color: 0xeebb44, emissive: 0x664400 })
        );
        ceilGlow.rotation.x = -Math.PI / 2;
        ceilGlow.position.set(0, 9.4, -8);
        lo.add(ceilGlow);
        lo.add(ptLight(0xffdd88, 2.2, 0, 8, -8, 16));

        // ── Barrel stacks left ─────────────────────────────
        for (const bz of [-12, -6, 0, 6]) {
            barrel(-22, bz, 0, lo);
            barrel(-20, bz, 0, lo);
        }
        for (const bz of [-9, -3, 3]) {
            barrel(-21, bz, 1.5, lo); // stacked: bottom at y=1.5, so barrel top at y=1.5+1.5=3
        }

        // ── Awards alcove (against z=-21 back wall) ────────
        lo.add(box(12, 7, 0.3, 0x1e0a04, -18, 4.5, -21.5)); // back panel
        for (let si = 0; si < 3; si++) {
            lo.add(box(10, 0.14, 1.0, 0x3a2008, -18, 3.0 + si * 2.2, -21)); // shelf
            for (let ti2 = 0; ti2 < 5; ti2++) {
                const tx2 = -22 + ti2 * 2;
                lo.add(cyl(0.18, 0.14, 0.55, 0xffd700, tx2, 3.35 + si * 2.2, -21, 8));  // stem
                const cup = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.28, 0.12, 0.38, 8),
                    new THREE.MeshLambertMaterial({ color: 0xffd700 })
                );
                cup.position.set(tx2, 3.82 + si * 2.2, -21);
                lo.add(cup);
            }
        }
        lo.add(ptLight(0xffdd44, 1.4, -18, 6, -20, 12));

        // ── Wine racks right ──────────────────────────────
        wineRack(22, -10, -Math.PI / 2, lo);
        wineRack(22,  -3, -Math.PI / 2, lo);
        wineRack(22,   5, -Math.PI / 2, lo);
        lo.add(ptLight(0xffaa55, 0.6, 20, 4, -5, 10));

        // ── Guide NPC floor ring (at x=0, z=8) ────────────
        const guideRing = new THREE.Mesh(
            new THREE.RingGeometry(1.2, 1.7, 32),
            new THREE.MeshLambertMaterial({ color: 0xc8963c, side: THREE.DoubleSide })
        );
        guideRing.rotation.x = -Math.PI / 2;
        guideRing.position.set(0, 0.04, 8);
        lo.add(guideRing);
        lo.add(ptLight(0xff9944, 0.7, 0, 5, 8, 10));

        // ── Wall torches ───────────────────────────────────
        [[-24, 5, -10], [24, 5, -10], [-24, 5, 10], [24, 5, 10]].forEach(([tx, ty, tz]) => {
            lo.add(box(0.3, 0.6, 0.3, 0x8a4020, tx, ty, tz));
            lo.add(ptLight(0xff6622, 0.8, tx < 0 ? tx + 1 : tx - 1, ty, tz, 8));
        });
    }
    // Build both floors
    buildUpperFloor();
    buildLowerFloor();

    // ── Player group (invisible geometry — just a position anchor) ──
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 0);
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
    const sph = { theta: 0, phi: 0.92, r: 18 };
    const CAM_K = 4.5;
    let camBase = new THREE.Vector3();
    camBase.copy(playerGroup.position);

    function updateCamera(dt) {
        // Smooth follow: exponential lerp toward player
        const alpha = 1 - Math.exp(-CAM_K * dt);
        camBase.lerp(playerGroup.position, alpha);

        // Look-ahead: nudge camera toward movement direction
        const lookAhead = moveDir.clone().multiplyScalar(3.5);
        const target = camBase.clone().add(lookAhead);

        // Spherical orbit from base
        const cx = target.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
        const cy = target.y + sph.r * Math.cos(sph.phi);
        const cz = target.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);

        camera.position.set(cx, cy, cz);
        camera.lookAt(target.x, target.y + 1.2, target.z);
    }

    // ════════════════════════════════════════════════════════
    //  WASD MOVEMENT
    // ════════════════════════════════════════════════════════
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

            // Pit exclusion on upper floor
            if (currentScene === 'upper') {
                const inPit = Math.hypot(newPos.x / 9, (newPos.z - 4) / 9) < 1;
                if (!inPit) {
                    newPos.x = Math.max(bounds.minX, Math.min(bounds.maxX, newPos.x));
                    newPos.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, newPos.z));
                    playerGroup.position.copy(newPos);
                }
            } else {
                newPos.x = Math.max(bounds.minX, Math.min(bounds.maxX, newPos.x));
                newPos.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, newPos.z));
                playerGroup.position.copy(newPos);
            }

            // Facing direction
            if (moveDir.x < -0.3) avatarFacing = 'left';
            else if (moveDir.x > 0.3) avatarFacing = 'right';
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
        playerGroup.position.set(nx, 0, nz);

        if (dx < -0.3) avatarFacing = 'left';
        else if (dx > 0.3) avatarFacing = 'right';
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
        projectAvatar();
        chromaKeyFrame();
        drawMinimap();
        renderer.render(scene3d, camera);
    }

    // ════════════════════════════════════════════════════════
    //  CANVAS CHROMA-KEY RENDERER (strips grey background)
    // ════════════════════════════════════════════════════════
    const avatarVideo  = document.getElementById('avatar-video');
    const avatarCanvas = document.getElementById('avatar-canvas');
    const ctx = avatarCanvas ? avatarCanvas.getContext('2d', { willReadFrequently: true }) : null;
    let chromaKeyFailed = false;

    const SRC_X = Math.round(1280 * 0.18);
    const SRC_Y = 0;
    const SRC_W = Math.round(1280 * 0.64);
    const SRC_H = 720;

    function chromaKeyFrame() {
        if (!ctx || chromaKeyFailed || avatarVideo.readyState < 2) return;
        try {
            ctx.drawImage(avatarVideo, SRC_X, SRC_Y, SRC_W, SRC_H, 0, 0, avatarCanvas.width, avatarCanvas.height);
            const imgData = ctx.getImageData(0, 0, avatarCanvas.width, avatarCanvas.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i+1], b = d[i+2];
                const lum = (r + g + b) / 3;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);
                if (sat < 28 && lum > 140) {
                    const bgStrength = (1 - sat / 28) * Math.min(1, (lum - 140) / 45);
                    d[i+3] = Math.round((1 - bgStrength) * 255);
                }
            }
            ctx.putImageData(imgData, 0, 0);
        } catch (e) {
            chromaKeyFailed = true;
            if (avatarCanvas) avatarCanvas.style.display = 'none';
            if (avatarVideo)  avatarVideo.style.display  = 'block';
        }
    }

    if (ctx) {
        avatarVideo.addEventListener('canplay', () => {
            avatarVideo.currentTime = 0.0;
            avatarVideo.play().catch(() => {});
        }, { once: true });
    }

    // ════════════════════════════════════════════════════════
    //  AVATAR ANIMATION STATE MACHINE
    // ════════════════════════════════════════════════════════
    const AVATAR_SEGS = {
        idle:    { start: 0.0, end: 1.5  },
        walking: { start: 2.5, end: 5.0  },
        talking: { start: 9.0, end: 10.0 },
    };
    let avatarAnimState = 'idle';

    function setAvatarState(state) {
        if (avatarAnimState === state) return;
        avatarAnimState = state;
        avatar.setAttribute('data-state', state);
        const seg = AVATAR_SEGS[state];
        if (!seg) return;
        avatarVideo.currentTime = seg.start;
        avatarVideo.play().catch(() => {});
    }

    avatarVideo.addEventListener('timeupdate', () => {
        const seg = AVATAR_SEGS[avatarAnimState];
        if (seg && avatarVideo.currentTime >= seg.end) {
            avatarVideo.currentTime = seg.start;
        }
    });

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
            scene3d.background = new THREE.Color(target === 'lower' ? 0x080403 : 0x0d0503);

            floorLabel.textContent = target === 'lower' ? 'Sussex Cellar' : 'Upper Bar';
            btnUp.disabled   = target === 'upper';
            btnDown.disabled = target === 'lower';

            // Teleport player to arrival position
            if (target === 'lower') {
                playerGroup.position.set(0, 0, -2);
            } else {
                playerGroup.position.set(0, 0, 4);
            }
            camBase.copy(playerGroup.position);

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
