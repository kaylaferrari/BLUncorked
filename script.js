/* ═══════════════════════════════════════════════════════════
   BLUncorked — Interactive World Engine
   Scenes: upper (Vaulted Bar) ↔ lower (Sussex Cellar)
   ═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

    // ── State ──────────────────────────────────────────────
    let currentScene  = 'upper';
    let currentVerb   = 'look';
    let inventory     = [];
    let avatarX       = 50;
    let avatarY       = 75;
    let avatarFacing  = 'right';
    let pendingAction = null;
    let arrivalTimer  = null;
    let walkTimer     = null;

    // ── DOM refs ───────────────────────────────────────────
    const scene           = document.getElementById('game-scene');
    const dialogueBox     = document.getElementById('dialogue-box');
    const dialoguePanel   = document.getElementById('dialogue-panel');
    const dialogueText    = document.getElementById('dialogue-text');
    const dialogueChoices = document.getElementById('dialogue-choices');
    const zonePanel       = document.getElementById('zone-panel');
    const zonePanelTitle  = document.getElementById('zone-panel-title');
    const zonePanelIcon   = document.getElementById('zone-panel-icon');
    const zonePanelBody   = document.getElementById('zone-panel-body');
    const overlay         = document.getElementById('transition-overlay');
    const floorLabel      = document.getElementById('floor-label');
    const btnUp           = document.getElementById('btn-up');
    const btnDown         = document.getElementById('btn-down');
    const avatar          = document.getElementById('player-avatar');
    const avatarVideo     = document.getElementById('avatar-video');
    const avatarCanvas    = document.getElementById('avatar-canvas');

    // ══════════════════════════════════════════════════════
    //  CANVAS CHROMA-KEY RENDERER
    //  Strips the neutral grey background from the video so
    //  the character lives directly in the scene world.
    // ══════════════════════════════════════════════════════
    const ctx = avatarCanvas ? avatarCanvas.getContext('2d', { willReadFrequently: true }) : null;
    let chromaKeyFailed = false;

    // Source crop: character occupies roughly centre 64% horiz, full height
    const SRC_X = Math.round(1280 * 0.18);  // 230
    const SRC_Y = 0;
    const SRC_W = Math.round(1280 * 0.64);  // 819
    const SRC_H = 720;

    function chromaKeyFrame() {
        if (!ctx || chromaKeyFailed || avatarVideo.readyState < 2) return;
        try {
            ctx.drawImage(avatarVideo, SRC_X, SRC_Y, SRC_W, SRC_H,
                          0, 0, avatarCanvas.width, avatarCanvas.height);
            const imgData = ctx.getImageData(0, 0, avatarCanvas.width, avatarCanvas.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i+1], b = d[i+2];
                const lum = (r + g + b) / 3;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);
                // Neutral grey background: low saturation, above brightness threshold
                if (sat < 28 && lum > 140) {
                    // Soft feather at edges: pixels closer to character colour stay more opaque
                    const bgStrength = (1 - sat / 28) * Math.min(1, (lum - 140) / 45);
                    d[i+3] = Math.round((1 - bgStrength) * 255);
                }
            }
            ctx.putImageData(imgData, 0, 0);
        } catch (e) {
            // Canvas tainted (cross-origin) — fall back to showing the video element
            chromaKeyFailed = true;
            if (avatarCanvas) avatarCanvas.style.display = 'none';
            if (avatarVideo)  avatarVideo.style.display  = 'block';
        }
    }

    function renderLoop() {
        chromaKeyFrame();
        requestAnimationFrame(renderLoop);
    }

    if (ctx) {
        avatarVideo.addEventListener('canplay', () => {
            avatarVideo.currentTime = 0.0;
            avatarVideo.play().catch(() => {});
            renderLoop();
        }, { once: true });
    }

    // ══════════════════════════════════════════════════════
    //  AVATAR ANIMATION STATE MACHINE
    //  Video segments (24fps, 10.01s):
    //    idle    → 0.0 – 1.5s  (standing, front)
    //    walking → 2.5 – 5.0s  (walk cycle)
    //    talking → 9.0 – 10.0s (both-hands gesture)
    // ══════════════════════════════════════════════════════
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

    // ══════════════════════════════════════════════════════
    //  PERSPECTIVE SCALE — avatar shrinks into the distance
    // ══════════════════════════════════════════════════════
    function getScale(yPct) {
        if (currentScene === 'upper') {
            const t = Math.max(0, Math.min(1, (yPct - 42) / 50));
            return 0.45 + t * 0.75; // 0.45 at top → 1.2 at bottom
        } else {
            const t = Math.max(0, Math.min(1, (yPct - 15) / 75));
            return 0.4 + t * 0.75;  // 0.4 at top → 1.15 at bottom
        }
    }

    function applyTransform(xPct, yPct, instant) {
        const scale = getScale(yPct);
        if (instant) {
            avatar.style.transition = 'none';
            requestAnimationFrame(() => { avatar.style.transition = ''; });
        }
        avatar.style.left      = xPct + '%';
        avatar.style.top       = yPct + '%';
        avatar.style.transform = `translateX(-50%) scale(${scale.toFixed(3)})`;
    }

    // ══════════════════════════════════════════════════════
    //  ARRIVAL — fires when CSS position transition ends
    // ══════════════════════════════════════════════════════
    avatar.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'left' && e.propertyName !== 'top') return;
        clearTimeout(arrivalTimer);
        arrivalTimer = setTimeout(() => {
            clearTimeout(walkTimer);
            setAvatarState('idle');
            if (pendingAction) {
                const fn = pendingAction;
                pendingAction = null;
                setTimeout(fn, 120); // brief pause so avatar settles before panel opens
            }
        }, 40);
    });

    // ══════════════════════════════════════════════════════
    //  AVATAR MOVEMENT
    // ══════════════════════════════════════════════════════
    function getWalkDuration(x1, y1, x2, y2) {
        // Distance in %-space, corrected for 16:9 aspect ratio
        const dx = (x2 - x1) / 1.78;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return Math.max(0.3, Math.min(1.6, dist * 0.03));
    }

    function moveAvatar(xPct, yPct) {
        if (xPct < avatarX - 0.5) avatarFacing = 'left';
        else if (xPct > avatarX + 0.5) avatarFacing = 'right';

        const dur = getWalkDuration(avatarX, avatarY, xPct, yPct);
        avatarX = xPct;
        avatarY = yPct;

        avatar.setAttribute('data-facing', avatarFacing);
        avatar.style.transitionDuration = `${dur}s, ${dur}s, ${dur}s, 0.2s`;
        applyTransform(xPct, yPct);
        setAvatarState('walking');
    }

    function placeAvatar(xPct, yPct) {
        avatarX = xPct;
        avatarY = yPct;
        clearTimeout(walkTimer);
        pendingAction = null;
        setAvatarState('idle');
        applyTransform(xPct, yPct, true);
    }

    // Walk to approach point, then execute callback on arrival
    function walkThenDo(xPct, yPct, callback) {
        pendingAction = callback;
        moveAvatar(xPct, yPct);
    }

    // ══════════════════════════════════════════════════════
    //  WALKABLE AREA
    // ══════════════════════════════════════════════════════
    function isWalkable(xPct, yPct) {
        if (currentScene === 'upper') {
            const topBoundary = xPct < 25 ? 52 : 42;
            if (yPct < topBoundary || yPct > 92) return false;
            // Pit exclusion ellipse: centre (50,66), rx=30, ry=16
            if (Math.pow((xPct - 50) / 30, 2) + Math.pow((yPct - 66) / 16, 2) < 1) return false;
            return true;
        }
        if (currentScene === 'lower') {
            if (Math.pow((xPct - 50) / 44, 2) + Math.pow((yPct - 55) / 40, 2) >= 1) return false;
            if (Math.pow((xPct - 50) / 20, 2) + Math.pow((yPct - 14) / 9,  2) < 1) return false;
            return true;
        }
        return false;
    }

    // ══════════════════════════════════════════════════════
    //  SCENE CLICK — WALK TO POINT
    // ══════════════════════════════════════════════════════
    scene.addEventListener('click', (e) => {
        if (e.target !== scene && e.target.closest('.hotspot, .panel, #ui-bar, #player-avatar')) return;

        const rect = scene.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left)  / rect.width)  * 100;
        const yPct = ((e.clientY - rect.top)    / rect.height) * 100;

        if (!isWalkable(xPct, yPct)) {
            showMessage("You can't walk there.");
            return;
        }

        pendingAction = null; // cancel any pending interaction
        moveAvatar(xPct, yPct);
    });

    // ══════════════════════════════════════════════════════
    //  SCENE MANAGEMENT
    // ══════════════════════════════════════════════════════
    function goToScene(target) {
        if (target === currentScene) return;
        pendingAction = null;
        avatar.classList.add('hidden');
        overlay.classList.add('active');

        setTimeout(() => {
            currentScene = target;
            scene.className = target === 'lower' ? 'lower' : '';
            floorLabel.textContent = target === 'lower' ? 'Sussex Cellar' : 'Upper Bar';
            btnUp.disabled   = (target === 'upper');
            btnDown.disabled = (target === 'lower');
            placeAvatar(target === 'lower' ? 50 : 50,
                        target === 'lower' ? 65 : 75);
            overlay.classList.remove('active');
            closeAllPanels();
            setTimeout(() => avatar.classList.remove('hidden'), 100);
        }, 350);
    }

    btnUp.addEventListener('click',   () => goToScene('upper'));
    btnDown.addEventListener('click', () => goToScene('lower'));

    // Wine Scanner panel
    const btnScanWine  = document.getElementById('btn-scan-wine');
    const scannerPanel = document.getElementById('scanner-panel');
    btnScanWine.addEventListener('click', () => {
        if (scannerPanel.classList.contains('hidden')) {
            closeAllPanels();
            scannerPanel.classList.remove('hidden');
        } else {
            scannerPanel.classList.add('hidden');
        }
    });

    // ══════════════════════════════════════════════════════
    //  VERB BUTTONS
    // ══════════════════════════════════════════════════════
    const actionButtons = document.querySelectorAll('.action-buttons button');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            actionButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentVerb = btn.id.replace('btn-', '');
            hideDialogueBox();
        });
    });

    // ══════════════════════════════════════════════════════
    //  HOTSPOT ROUTING — walk first, then interact
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.hotspot').forEach(spot => {
        spot.addEventListener('click', (e) => {
            e.stopPropagation();

            // Only respond to hotspots belonging to the current scene
            if (spot.dataset.scene && spot.dataset.scene !== currentScene) return;

            const { target, zone, goto, ax, ay } = spot.dataset;
            const type = spot.classList[1];

            // Approach coordinates embedded on each hotspot (data-ax, data-ay)
            const approachX = ax ? parseFloat(ax) : avatarX;
            const approachY = ay ? parseFloat(ay) : avatarY;

            if (zone) {
                walkThenDo(approachX, approachY, () => openZonePanel(zone));
                return;
            }
            if (goto) {
                walkThenDo(approachX, approachY, () => goToScene(goto));
                return;
            }
            if (currentVerb === 'talk' && type === 'npc') {
                walkThenDo(approachX, approachY, () => openDialogue(target));
                return;
            }
            walkThenDo(approachX, approachY, () => handleAction(currentVerb, target, type, spot));
        });
    });

    // ══════════════════════════════════════════════════════
    //  INTERACTION LOGIC
    // ══════════════════════════════════════════════════════
    function handleAction(verb, target, type, el) {
        if (verb === 'talk' && type === 'npc') { openDialogue(target); return; }

        let text = '';
        switch (verb) {
            case 'look':
                text = lookText(target);
                break;
            case 'take':
                if (type === 'item') {
                    addToInventory(target, el);
                    text = `You carefully take the ${target}.`;
                } else if (target === 'Giant Corkscrew') {
                    text = "It's bolted to the floor. Decorative, or a warning.";
                } else {
                    text = `You can't pick up the ${target}.`;
                }
                break;
            case 'talk':
                if (type === 'npc') { openDialogue(target); return; }
                text = "There's no one here to talk to about that.";
                break;
            case 'use':
                if (type === 'exit') { goToScene(el.dataset.goto || 'lower'); return; }
                if (target === 'Giant Corkscrew') text = "You'd need a very large bottle.";
                else if (target === 'Glowing Bottle') text = "The bottle hums. Press the Scan Wine button to analyse it.";
                else text = "You're not sure how to use that.";
                break;
        }
        showMessage(text);
    }

    function lookText(target) {
        const lines = {
            'Lower Cellar':    "Through the glass floor you can see the Sussex Cellar below. Click the pit to go down.",
            'Giant Corkscrew': "An oversized antique brass corkscrew. Imposing. Probably Art Deco. Definitely not functional.",
            'Glowing Bottle':  "It pulses with an eerie amber light. The label reads: Founder's Reserve, 2012. It hasn't been scanned.",
            'Double Doors':    "Heavy oak doors bound in iron. The way out — or the way further in.",
            'Sommelier':       "A distinguished figure with an extraordinary moustache. He carries a wine key like a weapon.",
            'Ceiling Opening': "The glass disc you dropped through. Above it, the warm light of the upper bar.",
            'Guide':           "A friendly Brainlabber stationed at the bottom. They know where everything is.",
        };
        return lines[target] || `You examine the ${target}. Interesting.`;
    }

    // ══════════════════════════════════════════════════════
    //  ZONE CONTENT
    // ══════════════════════════════════════════════════════
    const ZONES = {
        welcome: {
            icon: '🍷', title: 'Welcome to BL',
            html: `
                <h3>Welcome to BLUncorked</h3>
                <p>You've arrived at the Brainlabs wine cellar — an interactive world built for BLUncorked. Explore both floors, meet the team, and scan your wine.</p>
                <p>Click anywhere on the floor to walk. Use <strong>Look</strong>, <strong>Take</strong>, <strong>Talk</strong>, and <strong>Use</strong> to interact with the world.</p>
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

    // ══════════════════════════════════════════════════════
    //  SOMMELIER DIALOGUE TREE
    // ══════════════════════════════════════════════════════
    const DIALOGUE = {
        start: {
            text: `"Ah — welcome. You've found your way to one of the finest cellars in the building." He adjusts his monocle. "I am the Sommelier. How may I assist?"`,
            choices: [
                { label: "Tell me about this place.",    next: 'about'  },
                { label: "What's that glowing bottle?",  next: 'bottle' },
                { label: "How do I get downstairs?",     next: 'stairs' },
                { label: "Nothing, thank you.",          next: null     },
            ]
        },
        about: {
            text: `"This is BLUncorked — the Brainlabs world. The upper floor holds the bar, the skills table, case studies. Downstairs is the Sussex Cellar — quieter, more curated. Both floors are yours to explore."`,
            choices: [
                { label: "What's that glowing bottle?",  next: 'bottle' },
                { label: "How do I get downstairs?",     next: 'stairs' },
                { label: "One more question…",           next: 'start'  },
                { label: "That's all. Thank you.",       next: null     },
            ]
        },
        bottle: {
            text: `He glances at it with evident unease. "The 2012 Founder's Reserve. The vintage that started all of this." A pause. "It glows because it hasn't been scanned yet. Use the Wine Scanner — it calms down."`,
            choices: [
                { label: "How do I scan wine?",         next: 'scan'  },
                { label: "Tell me about this place.",   next: 'about' },
                { label: "Farewell.",                   next: null    },
            ]
        },
        scan: {
            text: `"Tap the Scan Wine button in your bar. Point your camera at any label. The system reads it and produces a full tasting profile — score, notes, pairings, all of it. Manual entry if the label is obscured. It's not cheating. It's curation."`,
            choices: [
                { label: "And downstairs?",             next: 'stairs' },
                { label: "That's all. Thank you.",      next: null     },
            ]
        },
        stairs: {
            text: `"The circular glass opening in the floor." He gestures. "Walk to the edge, click down. The Sussex Cellar holds the awards wall, the vintage collection, and a guide. Mind the step."`,
            choices: [
                { label: "One more question…",          next: 'start' },
                { label: "Thank you. Goodbye.",         next: null    },
            ]
        }
    };

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

    // ══════════════════════════════════════════════════════
    //  ZONE PANELS
    // ══════════════════════════════════════════════════════
    function openZonePanel(zoneId) {
        const z = ZONES[zoneId];
        if (!z) return;
        closeAllPanels();
        zonePanelIcon.textContent  = z.icon;
        zonePanelTitle.textContent = z.title;
        zonePanelBody.innerHTML    = z.html;
        zonePanel.classList.remove('hidden');
    }

    // ══════════════════════════════════════════════════════
    //  INVENTORY
    // ══════════════════════════════════════════════════════
    function addToInventory(itemName, el) {
        if (inventory.includes(itemName)) return;
        inventory.push(itemName);
        el.style.display = 'none';
        const slots = document.querySelectorAll('.slot');
        const idx = inventory.length - 1;
        if (idx < slots.length) {
            slots[idx].textContent = { 'Glowing Bottle': '🍾' }[itemName] || '📦';
        }
    }

    // ══════════════════════════════════════════════════════
    //  PANEL CLOSE
    // ══════════════════════════════════════════════════════
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

    // ══════════════════════════════════════════════════════
    //  AMBIENT DIALOGUE BOX
    // ══════════════════════════════════════════════════════
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

});
