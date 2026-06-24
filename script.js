document.addEventListener("DOMContentLoaded", () => {
    const dialogueBox = document.getElementById('dialogue-box');
    let currentVerb = 'look';
    let inventory = [];

    // --- Verb Selection ---
    const actionButtons = document.querySelectorAll('.action-buttons button');

    actionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            actionButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentVerb = e.currentTarget.id.replace('btn-', '');
            dialogueBox.style.display = 'none';
        });
    });

    // --- Hotspot Interactions ---
    const hotspots = document.querySelectorAll('.hotspot');

    hotspots.forEach(spot => {
        spot.addEventListener('click', (e) => {
            const targetName = e.target.dataset.target;
            const targetType = e.target.classList[1]; // prop, exit, npc, item
            handleAction(currentVerb, targetName, targetType, e.target);
        });
    });

    // --- Interaction Logic ---
    function handleAction(verb, target, type, element) {
        let text = "";

        switch (verb) {
            case 'look':
                if (target === 'Lower Cellar') {
                    text = "A private tasting seems to be happening downstairs.";
                } else if (target === 'Giant Corkscrew') {
                    text = "An oversized, antique brass corkscrew. Looks heavy.";
                } else if (target === 'Glowing Bottle') {
                    text = "It's emitting a strange, unnatural green glow.";
                } else {
                    text = `You look at the ${target}.`;
                }
                break;

            case 'take':
                if (type === 'item') {
                    text = `You take the ${target}.`;
                    addToInventory(target, element);
                } else if (target === 'Giant Corkscrew') {
                    text = "It's bolted to the floor.";
                } else {
                    text = `You can't pick up the ${target}.`;
                }
                break;

            case 'talk':
                if (type === 'npc') {
                    text = `You approach the ${target}. "Can I help you select a vintage?" he asks.`;
                } else {
                    text = `You talk to the ${target}. It doesn't answer.`;
                }
                break;

            case 'use':
                if (type === 'exit') {
                    text = `You push through the ${target} and leave the cellar.`;
                } else {
                    text = `You can't use that right now.`;
                }
                break;
        }

        displayMessage(text);
    }

    // --- Inventory ---
    function addToInventory(itemName, domElement) {
        if (!inventory.includes(itemName)) {
            inventory.push(itemName);
            domElement.style.display = 'none';
            updateInventoryUI();
        }
    }

    function updateInventoryUI() {
        const slots = document.querySelectorAll('.slot');
        inventory.forEach((item, index) => {
            if (index < slots.length) {
                if (item === 'Glowing Bottle') {
                    slots[index].innerHTML = '🍾';
                }
            }
        });
    }

    // --- Dialogue ---
    let messageTimer;
    function displayMessage(msg) {
        dialogueBox.textContent = msg;
        dialogueBox.style.display = 'block';
        clearTimeout(messageTimer);
        messageTimer = setTimeout(() => {
            dialogueBox.style.display = 'none';
        }, 3500);
    }
});
