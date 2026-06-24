/* ═══════════════════════════════════════════════════════════
   BLUncorked — Interactive World Engine
   Scenes: upper (Vaulted Bar) ↔ lower (Sussex Cellar)
   ═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

    // ── State ──────────────────────────────────────────────
    let currentScene  = 'upper';
    let currentVerb   = 'look';
    let inventory     = [];
    let dialogueNode  = null;

    // ── DOM refs ───────────────────────────────────────────
    const scene         = document.getElementById('game-scene');
    const bgImage       = document.getElementById('background-image');
    const dialogueBox   = document.getElementById('dialogue-box');
    const dialoguePanel = document.getElementById('dialogue-panel');
    const dialogueText  = document.getElementById('dialogue-text');
    const dialogueChoices = document.getElementById('dialogue-choices');
    const zonePanel     = document.getElementById('zone-panel');
    const zonePanelTitle  = document.getElementById('zone-panel-title');
    const zonePanelIcon   = document.getElementById('zone-panel-icon');
    const zonePanelBody   = document.getElementById('zone-panel-body');
    const overlay       = document.getElementById('transition-overlay');
    const floorLabel    = document.getElementById('floor-label');
    const btnUp         = document.getElementById('btn-up');
    const btnDown       = document.getElementById('btn-down');

    // ══════════════════════════════════════════════════════
    //  ZONE CONTENT
    // ══════════════════════════════════════════════════════
    const ZONES = {
        welcome: {
            icon: '🍷',
            title: 'Welcome to BL',
            html: `
                <h3>Welcome to BLUncorked</h3>
                <p>You've arrived at the Brainlabs wine cellar — an interactive world built for the BLUncorked event. Explore both floors, meet the team, and scan your wine.</p>
                <p>Use the <strong>Look</strong>, <strong>Take</strong>, <strong>Talk</strong>, and <strong>Use</strong> verbs to interact with the world around you.</p>
                <p><strong>Head downstairs</strong> through the circular glass opening to explore the Sussex Cellar.</p>
                <div style="margin-top:14px">
                    <span class="zone-tag">🗓 BLUncorked 2025</span>
                    <span class="zone-tag">1000+ Brainlabbers</span>
                    <span class="zone-tag">Global Media Agency</span>
                </div>`
        },
        skills: {
            icon: '🛠',
            title: 'Skills Table',
            html: `
                <h3>Skills Table</h3>
                <p>This is where Brainlabs' proprietary skill sets live. Each practice area brings something distinct to the table — and the table is very long.</p>
                <ul>
                    <li><strong>Paid Search</strong> — precision targeting at scale</li>
                    <li><strong>Paid Social</strong> — audience-first creative strategy</li>
                    <li><strong>Programmatic</strong> — data-driven media buying</li>
                    <li><strong>SEO & CRO</strong> — organic growth and conversion</li>
                    <li><strong>Retail Media</strong> — shelf to screen</li>
                    <li><strong>Analytics</strong> — the engine behind all of it</li>
                </ul>
                <p style="font-size:0.82rem; color:#b8a070">Content from practice teams pending. Drop copy here.</p>`
        },
        casestudies: {
            icon: '📋',
            title: 'Case Studies Corner',
            html: `
                <h3>Case Studies Corner</h3>
                <p>The proprietary tech stack that sets Brainlabs apart — built in-house, deployed at scale.</p>
                <ul>
                    <li><strong>Cortex</strong> — AI-powered budget allocation</li>
                    <li><strong>Halo</strong> — cross-channel attribution modelling</li>
                    <li><strong>Insight Engine</strong> — automated performance reporting</li>
                </ul>
                <p>Each tool was built to solve a problem clients actually had — not a problem worth patenting.</p>
                <p style="font-size:0.82rem; color:#b8a070">Full case study assets pending from relevant practice leads.</p>`
        },
        vintage: {
            icon: '📅',
            title: 'The Vintage Wall',
            html: `
                <h3>The Vintage Wall</h3>
                <p>Brainlabs milestones displayed as wine vintages. The older the label, the more it's worth.</p>
                <ul>
                    <li><strong>2012</strong> — Founded. Dan Gilbert, a spreadsheet, and a hypothesis.</li>
                    <li><strong>2015</strong> — First US expansion. The hypothesis held.</li>
                    <li><strong>2018</strong> — 400 Brainlabbers. Still test-and-learn.</li>
                    <li><strong>2020</strong> — Remote-first before it was mandatory.</li>
                    <li><strong>2022</strong> — 1,000+ Brainlabbers. 9 global hubs.</li>
                    <li><strong>2025</strong> — BLUncorked. You are here.</li>
                </ul>
                <div style="margin-top:14px">
                    <span class="zone-tag">Est. 2012</span>
                    <span class="zone-tag">CEO: Dan Gilbert</span>
                    <span class="zone-tag">1000+ employees</span>
                </div>`
        },
        awards: {
            icon: '🏆',
            title: 'Awards Alcove',
            html: `
                <h3>Awards Alcove</h3>
                <p>Industry wins displayed like bottles on a trophy shelf. The good ones are in magnums.</p>
                <ul>
                    <li>🥇 Performance Agency of the Year</li>
                    <li>🥇 Best Use of Data & Technology</li>
                    <li>🥈 Most Innovative Agency</li>
                    <li>🥇 Best Places to Work — Global</li>
                </ul>
                <p style="font-size:0.82rem; color:#b8a070">Full awards list pending from Marketing team.</p>`
        }
    };

    // ══════════════════════════════════════════════════════
    //  SOMMELIER DIALOGUE TREE
    // ══════════════════════════════════════════════════════
    const DIALOGUE = {
        start: {
            text: `"Ah — welcome. You've found your way to one of the finest cellars in the building." He adjusts his monocle. "I am the Sommelier. I know everything that passes through here. How may I assist?"`,
            choices: [
                { label: "Tell me about this place.",   next: 'about'   },
                { label: "What's that glowing bottle?", next: 'bottle'  },
                { label: "How do I get downstairs?",    next: 'stairs'  },
                { label: "Nothing, thank you.",         next: null      },
            ]
        },
        about: {
            text: `"This is BLUncorked — the Brainlabs world. The upper floor is the social hub: the bar, the skills table, case studies. Downstairs is the Sussex Cellar — quieter, more intimate. The themed sections are dotted throughout. Look for glowing zones."`,
            choices: [
                { label: "What's that glowing bottle?", next: 'bottle' },
                { label: "How do I get downstairs?",    next: 'stairs' },
                { label: "One more question...",        next: 'start'  },
                { label: "That's all. Thank you.",      next: null     },
            ]
        },
        bottle: {
            text: `He glances at the bottle with evident unease. "That is the 2012 Founder's Reserve. It was never meant to be opened — the vintage that started all of this." A pause. "It glows because it hasn't been scanned yet. Scan your wine and it calms down."`,
            choices: [
                { label: "How do I scan my wine?",   next: 'scan'  },
                { label: "Tell me about this place.", next: 'about' },
                { label: "Farewell.",                 next: null    },
            ]
        },
        scan: {
            text: `"Tap the scan icon on your avatar panel. Your camera will open — point it at your label. The system reads it, fetches the vintage notes, and logs it to the shared rack. If the OCR fails, enter the details by hand. It's not cheating. It's manual override."`,
            choices: [
                { label: "Interesting. And downstairs?", next: 'stairs' },
                { label: "That's all. Thank you.",       next: null     },
            ]
        },
        stairs: {
            text: `"The circular glass opening in the floor." He gestures with the bottle. "Walk to the edge and look down — you will find the passage. The Sussex Cellar below is set for this evening's content. The awards, the vintage wall, the guide." He straightens his lapel. "Mind the step."`,
            choices: [
                { label: "One more question...",  next: 'start' },
                { label: "Thank you. Goodbye.",   next: null    },
            ]
        }
    };

    // ══════════════════════════════════════════════════════
    //  SCENE MANAGEMENT
    // ══════════════════════════════════════════════════════
    function goToScene(target) {
        if (target === currentScene) return;
        overlay.classList.add('active');
        setTimeout(() => {
            currentScene = target;
            scene.className = target === 'lower' ? 'lower' : '';
            floorLabel.textContent = target === 'lower' ? 'Sussex Cellar' : 'Upper Bar';
            btnUp.disabled   = (target === 'upper');
            btnDown.disabled = (target === 'lower');
            overlay.classList.remove('active');
            closeAllPanels();
        }, 350);
    }

    btnUp.addEventListener('click', () => goToScene('upper'));
    btnDown.addEventListener('click', () => goToScene('lower'));

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
    //  HOTSPOT ROUTING
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.hotspot').forEach(spot => {
        spot.addEventListener('click', () => {
            // Only fire hotspots for current scene
            if (spot.dataset.scene && spot.dataset.scene !== currentScene) return;

            const { target, zone, goto } = spot.dataset;
            const type = spot.classList[1]; // prop | exit | npc | item | zone

            // Zone tapped — open content panel regardless of verb
            if (zone) { openZonePanel(zone); return; }

            // Floor navigation
            if (goto) { goToScene(goto); return; }

            handleAction(currentVerb, target, type, spot);
        });
    });

    // ══════════════════════════════════════════════════════
    //  INTERACTION LOGIC
    // ══════════════════════════════════════════════════════
    function handleAction(verb, target, type, el) {
        // NPC talk always opens dialogue panel
        if (verb === 'talk' && type === 'npc') {
            openDialogue(target); return;
        }

        let text = '';
        switch (verb) {
            case 'look':
                text = lookText(target);
                break;
            case 'take':
                if (type === 'item') {
                    addToInventory(target, el);
                    text = `You take the ${target}.`;
                } else if (target === 'Giant Corkscrew') {
                    text = "It's bolted to the floor. Decorative, or a warning.";
                } else {
                    text = `You can't pick up the ${target}.`;
                }
                break;
            case 'talk':
                text = `You talk to the ${target}. Silence.`;
                break;
            case 'use':
                if (type === 'exit') {
                    goToScene('lower'); return;
                } else if (target === 'Giant Corkscrew') {
                    text = "You'd need a very large bottle.";
                } else {
                    text = "You're not sure how to use that right now.";
                }
                break;
        }
        showMessage(text);
    }

    function lookText(target) {
        const lines = {
            'Lower Cellar':   "Through the glass you can see the Sussex Cellar below. A private space — warm light, wine walls. Click the pit or use the floor arrows to go down.",
            'Giant Corkscrew':"An oversized antique brass corkscrew. Imposing. Probably Art Deco.",
            'Glowing Bottle': "It pulses with an eerie green light. The label reads: Founder's Reserve, 2012.",
            'Double Doors':   "Heavy wooden doors. A green arrow suggests the way out — or the way in.",
            'Sommelier':      "A distinguished figure with a magnificent moustache. He carries himself like someone who has rejected many wines.",
            'Ceiling Opening':"The circular glass opening you came down through. The upper bar is visible above.",
            'Guide':          "A member of the BL team stationed downstairs. They look helpful.",
        };
        return lines[target] || `You examine the ${target} carefully.`;
    }

    // ══════════════════════════════════════════════════════
    //  SOMMELIER DIALOGUE
    // ══════════════════════════════════════════════════════
    function openDialogue(npcName) {
        closeAllPanels();
        if (npcName === 'Sommelier') {
            showDialogueNode('start');
        } else {
            showDialogueNode(null);
            dialogueText.textContent = `"Hello." The ${npcName} smiles warmly but says nothing more.`;
            dialogueChoices.innerHTML = `<button class="choice-btn" onclick="document.getElementById('dialogue-panel').classList.add('hidden')">Goodbye.</button>`;
        }
        document.getElementById('dialogue-panel').classList.remove('hidden');
    }

    function showDialogueNode(nodeId) {
        if (!nodeId || !DIALOGUE[nodeId]) {
            document.getElementById('dialogue-panel').classList.add('hidden');
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
            const emojis = { 'Glowing Bottle': '🍾' };
            slots[idx].textContent = emojis[itemName] || '📦';
        }
    }

    // ══════════════════════════════════════════════════════
    //  PANEL CLOSE BUTTONS
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.panel-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(btn.dataset.panel).classList.add('hidden');
        });
    });

    function closeAllPanels() {
        document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
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
        msgTimer = setTimeout(hideDialogueBox, 3800);
    }

    function hideDialogueBox() {
        dialogueBox.classList.add('hidden');
    }

});
