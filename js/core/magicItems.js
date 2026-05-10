// ============================================
// SEHRLI BUYUMLAR (Magic Items / Potions)
// CoC-style consumable items
// ============================================

const MAGIC_ITEM_DATA = {
    builder_potion: {
        name:    "Quruvchi Iksiri",
        icon:    "⚗️",
        desc:    "1 soat barcha qurilishlar 10x tez",
        color:   "#ff8f00",
        rarity:  "common",
        category: 'potion',
    },
    resource_potion: {
        name:    "Resurs Iksiri",
        icon:    "🧪",
        desc:    "Barcha resurs binolar darhol to'ldiriladi",
        color:   "#4caf50",
        rarity:  "common",
        category: 'potion',
    },
    training_potion: {
        name:    "Trening Iksiri",
        icon:    "💊",
        desc:    "Qo'shin trening vaqtini 1 soat 10x tezlashtiradi",
        color:   "#2196f3",
        rarity:  "common",
        category: 'potion',
    },
    gem_potion: {
        name:    "Olmos Iksiri",
        icon:    "💎",
        desc:    "Olmos Konini darhol to'liq to'ldiradi",
        color:   "#7ecef2",
        rarity:  "rare",
        category: 'potion',
    },
    book_building: {
        name:    "Qurilish Kitobi",
        icon:    "📖",
        desc:    "Joriy qurilish yoki yuksaltishni darhol yakunlaydi",
        color:   "#9c27b0",
        rarity:  "epic",
        category: 'book',
    },
    book_research: {
        name:    "Tadqiqot Kitobi",
        icon:    "📚",
        desc:    "Joriy tadqiqotni darhol yakunlaydi",
        color:   "#e91e63",
        rarity:  "epic",
        category: 'book',
    },
    rune_gold: {
        name:    "Oltin Runi",
        icon:    "🔶",
        desc:    "500,000 oltin qo'shadi",
        color:   "#ffd700",
        rarity:  "rare",
        category: 'rune',
    },
    rune_food: {
        name:    "Oziq Runi",
        icon:    "🔷",
        desc:    "500,000 oziq-ovqat qo'shadi",
        color:   "#76c442",
        rarity:  "rare",
        category: 'rune',
    },
};

const MAGIC_ITEMS_SHOP = [
    { itemId: 'builder_potion', cost: 20,  limit: 5 },
    { itemId: 'resource_potion',cost: 15,  limit: 5 },
    { itemId: 'training_potion',cost: 20,  limit: 5 },
    { itemId: 'gem_potion',     cost: 25,  limit: 3 },
    { itemId: 'book_building',  cost: 50,  limit: 2 },
    { itemId: 'book_research',  cost: 50,  limit: 2 },
    { itemId: 'rune_gold',      cost: 30,  limit: 10 },
    { itemId: 'rune_food',      cost: 30,  limit: 10 },
];

const MagicItems = {
    inventory: {},   // itemId -> count
    // Active builder potion state
    _builderPotionUntil: 0,
    _trainingPotionUntil: 0,

    init() {
        // nothing special; data loaded by saveSystem
    },

    // ── Inventory management ─────────────────────────────────────────────────
    add(itemId, amount = 1) {
        if (!MAGIC_ITEM_DATA[itemId]) return;
        this.inventory[itemId] = (this.inventory[itemId] || 0) + amount;
        const d = MAGIC_ITEM_DATA[itemId];
        Toast.show(`${d.icon} +${amount} ${d.name} qo'shildi!`, 'success', 3000);
        if (typeof MagicItemsPanel !== 'undefined') MagicItemsPanel.updateBadge?.();
    },

    getCount(itemId) {
        return this.inventory[itemId] || 0;
    },

    // ── Use item ─────────────────────────────────────────────────────────────
    use(itemId) {
        if ((this.inventory[itemId] || 0) < 1) {
            Toast.show("Bu buyum yo'q!", 'error');
            return false;
        }

        let used = false;
        switch (itemId) {
            case 'builder_potion':  used = this._useBuilderPotion();  break;
            case 'resource_potion': used = this._useResourcePotion(); break;
            case 'training_potion': used = this._useTrainingPotion(); break;
            case 'gem_potion':      used = this._useGemPotion();      break;
            case 'book_building':   used = this._useBookBuilding();   break;
            case 'book_research':   used = this._useBookResearch();   break;
            case 'rune_gold':       used = this._useRuneGold();       break;
            case 'rune_food':       used = this._useRuneFood();       break;
            default: used = false;
        }

        if (used) {
            this.inventory[itemId] = Math.max(0, (this.inventory[itemId] || 1) - 1);
            if (typeof SaveSystem !== 'undefined') SaveSystem.save();
            if (typeof MagicItemsPanel !== 'undefined') MagicItemsPanel.updateBadge?.();
        }
        return used;
    },

    // ── Individual use handlers ───────────────────────────────────────────────
    _useBuilderPotion() {
        const until = Date.now() + 3600 * 1000;
        this._builderPotionUntil = until;
        // Apply 10x build time reduction to all active builders
        if (typeof BuildingManager !== 'undefined' && typeof timerManager !== 'undefined') {
            let boosted = 0;
            for (const b of Object.values(BuildingManager.buildings)) {
                if (b.building && b.timerId) {
                    const rem = timerManager.getRemaining(b.timerId);
                    if (rem > 0) {
                        const newRem = Math.max(3, Math.floor(rem / 10));
                        timerManager.setRemaining(b.timerId, newRem);
                        boosted++;
                    }
                }
            }
            if (boosted > 0) {
                Toast.show(`⚗️ Quruvchi Iksiri! ${boosted} ta qurilish 10x tezlashdi! (1 soat)`, 'success', 4500);
            } else {
                Toast.show(`⚗️ Quruvchi Iksiri faol! Keyingi qurilishlar 10x tez! (1 soat)`, 'success', 4000);
            }
        } else {
            Toast.show(`⚗️ Quruvchi Iksiri faol! (1 soat)`, 'success', 4000);
        }
        return true;
    },

    _useResourcePotion() {
        if (typeof BuildingManager === 'undefined') return false;
        let filled = 0;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.building) continue;
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const lv = bd.levels[b.level];
            if (!lv) continue;
            if (lv.capacity && b.storedResource !== undefined) {
                b.storedResource = lv.capacity;
                filled++;
            }
        }
        if (filled > 0) {
            Toast.show(`🧪 Resurs Iksiri! ${filled} ta bino to'ldirildi!`, 'success', 4000);
            if (typeof BuildingRenderer !== 'undefined') BuildingRenderer.render();
        } else {
            Toast.show(`🧪 Resurs binolar allaqachon to'liq!`, 'warning', 3000);
            return false;
        }
        return true;
    },

    _useTrainingPotion() {
        const until = Date.now() + 3600 * 1000;
        this._trainingPotionUntil = until;
        // Speed up active training timers 10x
        if (typeof TroopManager !== 'undefined' && typeof timerManager !== 'undefined') {
            let boosted = 0;
            const queue = TroopManager.trainingQueue || [];
            for (const slot of queue) {
                if (slot && slot.timerId) {
                    const rem = timerManager.getRemaining(slot.timerId);
                    if (rem > 0) {
                        const newRem = Math.max(1, Math.floor(rem / 10));
                        timerManager.setRemaining(slot.timerId, newRem);
                        boosted++;
                    }
                }
            }
            if (boosted > 0) {
                Toast.show(`💊 Trening Iksiri! ${boosted} ta trening 10x tezlashdi! (1 soat)`, 'success', 4500);
            } else {
                Toast.show(`💊 Trening Iksiri faol! Keyingi trening 10x tez! (1 soat)`, 'success', 4000);
            }
        } else {
            Toast.show(`💊 Trening Iksiri faol! (1 soat)`, 'success', 4000);
        }
        return true;
    },

    _useGemPotion() {
        if (typeof BuildingManager === 'undefined') return false;
        let filled = false;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type !== 'gemMine' || b.building) continue;
            const bd = BUILDING_DATA['gemMine'];
            if (!bd) continue;
            const lv = bd.levels[b.level];
            if (!lv) continue;
            const cap = lv.capacity || 12;
            b.storedDiamond = cap;
            filled = true;
        }
        if (filled) {
            Toast.show(`💎 Olmos Iksiri! Olmos Koni to'ldirildi!`, 'success', 4000);
            if (typeof BuildingRenderer !== 'undefined') BuildingRenderer.render();
        } else {
            Toast.show(`💎 Olmos Koni topilmadi yoki allaqachon to'liq!`, 'warning', 3000);
            return false;
        }
        return true;
    },

    _useBookBuilding() {
        if (typeof BuildingManager === 'undefined' || typeof timerManager === 'undefined') return false;
        // Find first building under construction
        let found = null;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.building && b.timerId) { found = b; break; }
        }
        if (!found) {
            Toast.show(`📖 Joriy qurilish yo'q!`, 'warning', 3000);
            return false;
        }
        const name = (typeof BUILDING_DATA !== 'undefined' && BUILDING_DATA[found.type])
            ? BUILDING_DATA[found.type].name : found.type;
        timerManager.instant(found.timerId);
        Toast.show(`📖 Qurilish Kitobi! "${name}" darhol qurildi!`, 'success', 4500);
        return true;
    },

    _useBookResearch() {
        if (typeof ResearchSystem === 'undefined' || typeof timerManager === 'undefined') return false;
        if (!ResearchSystem.currentResearch) {
            Toast.show(`📚 Faol tadqiqot yo'q!`, 'warning', 3000);
            return false;
        }
        const rId = ResearchSystem.currentResearch.id;
        const tId = ResearchSystem.currentResearch.timerId;
        const rData = typeof RESEARCH_DATA !== 'undefined' && RESEARCH_DATA[rId];
        const name = rData ? rData.name : 'Tadqiqot';
        timerManager.instant(tId);
        Toast.show(`📚 Tadqiqot Kitobi! "${name}" darhol yakunlandi!`, 'success', 4500);
        return true;
    },

    _useRuneGold() {
        Resources.add('gold', 500000);
        Toast.show(`🔶 Oltin Runi! +500,000 oltin!`, 'success', 3500);
        return true;
    },

    _useRuneFood() {
        Resources.add('food', 500000);
        Toast.show(`🔷 Oziq Runi! +500,000 oziq-ovqat!`, 'success', 3500);
        return true;
    },

    // ── Active potion boost checkers ─────────────────────────────────────────
    isBuilderPotionActive() {
        if (this._builderPotionUntil > Date.now()) return true;
        this._builderPotionUntil = 0;
        return false;
    },

    isTrainingPotionActive() {
        if (this._trainingPotionUntil > Date.now()) return true;
        this._trainingPotionUntil = 0;
        return false;
    },

    // ── Serialization ─────────────────────────────────────────────────────────
    serialize() {
        return {
            inventory:             this.inventory,
            builderPotionUntil:    this._builderPotionUntil,
            trainingPotionUntil:   this._trainingPotionUntil,
        };
    },

    deserialize(data) {
        if (!data) return;
        this.inventory             = data.inventory           || {};
        this._builderPotionUntil   = data.builderPotionUntil  || 0;
        this._trainingPotionUntil  = data.trainingPotionUntil || 0;
    },

    // ── Total item count (for badge) ──────────────────────────────────────────
    getTotalCount() {
        return Object.values(this.inventory).reduce((s, c) => s + c, 0);
    },
};
