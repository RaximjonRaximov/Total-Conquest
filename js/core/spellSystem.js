// ============================================
// SPELL SYSTEM — Jang sehrlari
// ============================================

const SPELL_DATA = {
    healing: {
        name: 'Shifobaxsh Sehr',
        icon: '💚',
        description: 'Yaqin atrofdagi askarlarga HP qaytaradi',
        cost: { gold: 5000, food: 2000 },
        time: 600, // 10 daqiqa tayyorlanish
        thRequired: 5,
        effect: { type: 'heal', radius: 3.5, healPerSecond: 80, duration: 8 }
    },
    rage: {
        name: 'Qahram Sehr',
        icon: '🔥',
        description: 'Yaqin atrofdagi askarlarni 2x tezlashtirib, zararni oshiradi',
        cost: { gold: 8000, food: 3000 },
        time: 900,
        thRequired: 6,
        effect: { type: 'rage', radius: 3.5, damageMult: 2.0, speedMult: 1.8, duration: 6 }
    },
    lightning: {
        name: 'Chaqmoq Sehr',
        icon: '⚡',
        description: 'Belgilangan binoga kuchli chaqmoq zarari beradi',
        cost: { gold: 3000, food: 1000 },
        time: 300,
        thRequired: 5,
        effect: { type: 'lightning', damage: 500, splashRadius: 1.5 }
    },
    freeze: {
        name: 'Muzlatish Sehr',
        icon: '❄️',
        description: 'Mudofaa minoralarini vaqtincha muzlatadi',
        cost: { gold: 10000, food: 4000 },
        time: 1200,
        thRequired: 7,
        effect: { type: 'freeze', radius: 4, duration: 5 }
    },
    earthquake: {
        name: 'Zilzila Sehr',
        icon: '🌍',
        description: 'Keng hududdagi devorlar va binolarga kuchli zarar beradi',
        cost: { gold: 6000, food: 3000 },
        time: 900,
        thRequired: 6,
        effect: { type: 'earthquake', radius: 3.5, damage: 300, wallDamageMult: 4, splashFalloff: true }
    },
    haste: {
        name: 'Tezlik Sehr',
        icon: '💨',
        description: 'Yaqin atrofdagi askarlarni juda tez harakatga undaydi',
        cost: { gold: 7000, food: 2500 },
        time: 800,
        thRequired: 8,
        effect: { type: 'haste', radius: 3.5, speedMult: 2.5, duration: 7 }
    },
    jump: {
        name: 'Sakrash Sehr',
        icon: '🦘',
        description: 'Askarlar devorlar orqali sakrab o\'ta oladi — devorlar e\'tiborga olinmaydi',
        cost: { gold: 4000, food: 3000 },
        time: 500,
        thRequired: 7,
        effect: { type: 'jump', radius: 3.0, duration: 10 }
    },
    poison: {
        name: 'Zahar Sehr',
        icon: '☠️',
        description: 'Hududga zahar yoyadi — qo\'riqchi askarlarni sekinlashtiradi va zaharli zararlar keltiradi',
        cost: { gold: 5000, food: 4000 },
        time: 600,
        thRequired: 7,
        effect: { type: 'poison', radius: 2.5, damagePerSec: 60, slowMult: 0.55, duration: 8 }
    },
    clone: {
        name: 'Ko\'payish Sehr',
        icon: '🪞',
        description: 'Hududdagi askarlarning klonlarini yaratadi (kamaytrilgan HP bilan)',
        cost: { gold: 9000, food: 5000 },
        time: 1200,
        thRequired: 9,
        effect: { type: 'clone', radius: 3.0, cloneHpFactor: 0.5, maxClones: 8, duration: 30 }
    }
};

const SpellSystem = {
    inventory: {}, // type -> count
    _activeEffects: [], // [{type, x, y, radius, endTime, ...data}]
    _brewQueue: [],     // [{type, timerId|null}] — sequential brew queue (CoC-style)

    // Sehr fabrikasiga qarab slot soni
    getMaxSlots() {
        let slots = 0;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'spellFactory' && !b.building) {
                const lv = BUILDING_DATA.spellFactory.levels[b.level];
                if (lv?.spellSlots) slots = Math.max(slots, lv.spellSlots);
            }
        }
        return slots;
    },

    hasSpellFactory() {
        return Object.values(BuildingManager.buildings).some(b => b.type === 'spellFactory' && !b.building);
    },

    getTotalInventory() {
        return Object.values(this.inventory).reduce((s, n) => s + n, 0);
    },

    // Navbatdagi + inventardagi jami (slot check uchun)
    getTotalPending() {
        return this.getTotalInventory() + this._brewQueue.length;
    },

    brew(type) {
        if (!SPELL_DATA[type]) return false;
        if (!this.hasSpellFactory()) {
            Toast.show('Sehr Fabrikasi kerak!', 'warn');
            return false;
        }
        const maxSlots = this.getMaxSlots();
        if (this.getTotalPending() >= maxSlots) {
            Toast.show(`Sehr slotlari to'la (${maxSlots}/${maxSlots})`, 'warn');
            return false;
        }
        const sd = SPELL_DATA[type];
        const thReq = sd.thRequired || 1;
        if (Game.townHallLevel < thReq) {
            Toast.show(`TH ${thReq} kerak!`, 'warn');
            return false;
        }
        if (!Resources.canAfford(sd.cost)) {
            Toast.show('Resurs yetarli emas!', 'error');
            return false;
        }
        Resources.spendMultiple(sd.cost);

        const queueItem = { type, timerId: null };
        this._brewQueue.push(queueItem);

        // Agar birinchi element bo'lsa, darhol ishga tushiramiz
        if (this._brewQueue.length === 1) {
            this._startNextBrew();
        } else {
            const icon = sd.icon || '🧪';
            Toast.show(`${icon} ${sd.name} navbatga qo'shildi (#${this._brewQueue.length})`, 'info');
        }
        return true;
    },

    _startNextBrew() {
        if (this._brewQueue.length === 0) return;
        const item = this._brewQueue[0];
        const sd   = SPELL_DATA[item.type];
        if (!sd) { this._brewQueue.shift(); this._startNextBrew(); return; }

        item.timerId = timerManager.add(
            sd.time,
            () => {
                // Birinchi element olinadi
                this._brewQueue.shift();
                this.inventory[item.type] = (this.inventory[item.type] || 0) + 1;
                const icon = sd.icon || '🧪';
                Toast.show(`${icon} ${sd.name} tayyor!`, 'success');
                if (typeof NotificationSystem !== 'undefined') {
                    NotificationSystem.add('general', `${icon} Sehr tayyor`, sd.name);
                }
                // Navbatdagi keyingisini boshlash
                this._startNextBrew();
            },
            null,
            { spellType: item.type }
        );
        Toast.show(`${sd.icon} ${sd.name} tayyorlanmoqda...`, 'info');
    },

    // Navbatdagi sehr ni bekor qilish
    cancelBrew(index) {
        if (index < 0 || index >= this._brewQueue.length) return false;
        const item = this._brewQueue[index];
        const sd   = SPELL_DATA[item.type];
        // Resursni qaytarish (50% refund — CoC-style)
        if (sd) {
            for (const [res, amt] of Object.entries(sd.cost)) {
                Resources.add(res, Math.floor(amt * 0.5));
            }
        }
        if (index === 0 && item.timerId) {
            // Aktiv brew ni bekor qilish
            timerManager.cancel?.(item.timerId);
            this._brewQueue.splice(0, 1);
            this._startNextBrew();
        } else {
            this._brewQueue.splice(index, 1);
        }
        if (sd) Toast.show(`${sd.icon} ${sd.name} bekor qilindi (50% refund)`, 'info');
        return true;
    },

    // Jangda sehrni ishlatish
    useInBattle(type, tileX, tileY) {
        if (!this.inventory[type] || this.inventory[type] < 1) {
            Toast.show('Sehringiz yo\'q!', 'warn');
            return false;
        }
        const sd = SPELL_DATA[type];
        if (!sd) return false;

        this.inventory[type]--;
        if (this.inventory[type] <= 0) delete this.inventory[type];

        const eff = sd.effect;
        const endTime = Date.now() + (eff.duration || 0) * 1000;

        const startTime = Date.now();
        if (eff.type === 'heal') {
            this._activeEffects.push({ type: 'heal', x: tileX, y: tileY, radius: eff.radius, endTime, startTime, hps: eff.healPerSecond });
            BattleRenderer.addExplosion(tileX, tileY, '#00e676', 28);
            BattleRenderer.addExplosion(tileX, tileY, '#b9f6ca', 16);
            BattleRenderer.addGroundRing?.(tileX, tileY, '#00e676', eff.radius * 1.1, 800);
            setTimeout(() => BattleRenderer.addGroundRing?.(tileX, tileY, '#69f0ae', eff.radius * 0.8, 600), 180);
            BattleRenderer.addFloatingText(tileX, tileY - 1, '💚 SHIFO!', '#00e676', 13);
            Toast.show('💚 Shifobaxsh Sehr faollashdi!', 'success');
        } else if (eff.type === 'rage') {
            this._activeEffects.push({ type: 'rage', x: tileX, y: tileY, radius: eff.radius, endTime, startTime, damageMult: eff.damageMult, speedMult: eff.speedMult });
            BattleRenderer.addExplosion(tileX, tileY, '#ff6d00', 35);
            BattleRenderer.addExplosion(tileX, tileY, '#ff1744', 20);
            BattleRenderer.addGroundRing?.(tileX, tileY, '#ff6d00', eff.radius * 1.1, 750);
            setTimeout(() => BattleRenderer.addGroundRing?.(tileX, tileY, '#ff8c00', eff.radius * 0.85, 580), 160);
            BattleRenderer.triggerShake?.(8, 300);
            BattleRenderer.addFloatingText(tileX, tileY - 1, '🔥 QAHRAM!', '#ff6d00', 14);
            Toast.show('🔥 Qahram Sehr faollashdi!', 'warning');
        } else if (eff.type === 'lightning') {
            this._castLightning(tileX, tileY, eff.damage, eff.splashRadius);
        } else if (eff.type === 'freeze') {
            this._activeEffects.push({ type: 'freeze', x: tileX, y: tileY, radius: eff.radius, endTime, startTime });
            BattleRenderer.addExplosion(tileX, tileY, '#40c4ff', 32);
            BattleRenderer.addExplosion(tileX, tileY, '#e1f5fe', 18);
            BattleRenderer.addGroundRing?.(tileX, tileY, '#40c4ff', eff.radius * 1.1, 900);
            setTimeout(() => BattleRenderer.addGroundRing?.(tileX, tileY, '#b3e5fc', eff.radius * 0.9, 700), 200);
            BattleRenderer.addFloatingText(tileX, tileY - 1, '❄️ MUZLASH!', '#40c4ff', 13);
            Toast.show('❄️ Mudofaa minoralarei muzladi!', 'info');
        } else if (eff.type === 'earthquake') {
            this._castEarthquake(tileX, tileY, eff.damage, eff.radius, eff.wallDamageMult);
        } else if (eff.type === 'haste') {
            this._activeEffects.push({ type: 'haste', x: tileX, y: tileY, radius: eff.radius, endTime, startTime, speedMult: eff.speedMult });
            BattleRenderer.addExplosion(tileX, tileY, '#b2ebf2', 30);
            BattleRenderer.addGroundRing?.(tileX, tileY, '#00e5ff', eff.radius * 1.1, 700);
            for (let i = 0; i < 3; i++) {
                setTimeout(() => BattleRenderer.addExplosion(tileX + (Math.random()-0.5)*2, tileY + (Math.random()-0.5)*2, '#80deea', 18), i * 150);
            }
            BattleRenderer.addFloatingText(tileX, tileY - 1, '💨 TEZLIK!', '#00e5ff', 13);
            Toast.show('💨 Tezlik Sehr! Askarlar tezlashdi!', 'info');
        } else if (eff.type === 'jump') {
            this._activeEffects.push({ type: 'jump', x: tileX, y: tileY, radius: eff.radius, endTime, startTime });
            BattleRenderer.addExplosion(tileX, tileY, '#b2ff59', 32);
            BattleRenderer.addGroundRing?.(tileX, tileY, '#69f0ae', eff.radius * 1.1, 800);
            for (let i = 0; i < 4; i++) {
                setTimeout(() => BattleRenderer.addExplosion(
                    tileX + (Math.random()-0.5)*eff.radius*2,
                    tileY + (Math.random()-0.5)*eff.radius*2,
                    '#69f0ae', 16), i * 120);
            }
            BattleRenderer.addFloatingText(tileX, tileY - 1, '🦘 SAKRASH!', '#69f0ae', 13);
            Toast.show('🦘 Sakrash Sehr! Askarlar devor oshib o\'ta oladi!', 'success');
        } else if (eff.type === 'poison') {
            this._activeEffects.push({
                type: 'poison', x: tileX, y: tileY, radius: eff.radius, endTime, startTime,
                dps: eff.damagePerSec, slowMult: eff.slowMult || 0.55
            });
            BattleRenderer.addExplosion(tileX, tileY, '#76ff03', 30);
            BattleRenderer.addGroundRing?.(tileX, tileY, '#64dd17', eff.radius * 1.0, 850);
            for (let i = 0; i < 4; i++) {
                setTimeout(() => BattleRenderer.addExplosion(
                    tileX + (Math.random()-0.5)*eff.radius,
                    tileY + (Math.random()-0.5)*eff.radius,
                    '#64dd17', 14), i * 100);
            }
            BattleRenderer.addFloatingText(tileX, tileY - 1, '☠️ ZAHAR!', '#76ff03', 13);
            Toast.show('☠️ Zahar Sehr! Dushman askarlar zaharlanadi!', 'success');
        } else if (eff.type === 'clone') {
            this._castClone(tileX, tileY, eff.radius, eff.cloneHpFactor, eff.maxClones);
        }

        AudioManager.playClick?.();
        return true;
    },

    _castEarthquake(tx, ty, baseDmg, radius, wallMult) {
        let hit = 0;
        for (const [id, b] of Object.entries(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const bx = b.x + bd.size[0] / 2;
            const by = b.y + bd.size[1] / 2;
            const dist = Math.hypot(bx - tx, by - ty);
            if (dist > radius + 1) continue;

            const falloff = 1 - Math.min(1, dist / (radius + 1));
            const isWall  = b.type === 'wall' || b.type === 'gate';
            const dmg     = baseDmg * falloff * (isWall ? (wallMult || 4) : 1);
            if (dmg > 0) { BattleManager._damageBuilding(id, dmg); hit++; }
        }

        // Visual: shake + multiple ground explosions + expanding rings
        BattleRenderer.triggerShake(20 * Camera.zoom, 700);
        BattleRenderer.addGroundRing?.(tx, ty, '#a1887f', radius * 1.2, 900);
        setTimeout(() => BattleRenderer.addGroundRing?.(tx, ty, '#795548', radius * 0.9, 700), 200);
        setTimeout(() => BattleRenderer.addGroundRing?.(tx, ty, '#ff8a65', radius * 0.6, 550), 380);
        BattleRenderer.addFloatingText(tx, ty - 1, '🌍 ZILZILA!', '#a1887f', 14);
        for (let i = 0; i < 6; i++) {
            const ox = (Math.random() - 0.5) * radius * 1.5;
            const oy = (Math.random() - 0.5) * radius * 1.5;
            setTimeout(() => {
                BattleRenderer.addExplosion(tx + ox, ty + oy, '#a1887f', 22 + Math.random() * 10);
                BattleRenderer.addExplosion(tx + ox * 0.6, ty + oy * 0.6, '#795548', 14);
            }, i * 80);
        }
        Toast.show(`🌍 Zilzila! ${hit} bino zararlantirildi!`, 'success');
    },

    _castLightning(tx, ty, baseDmg, splashR) {
        // Targetga eng yaqin binoni top
        let target = null, minDist = Infinity;
        for (const b of Object.values(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const bx = b.x + bd.size[0] / 2;
            const by = b.y + bd.size[1] / 2;
            const d = Math.hypot(bx - tx, by - ty);
            if (d < splashR + 1 && d < minDist) { minDist = d; target = b; }
        }
        if (!target) { Toast.show('⚡ Nishon topilmadi!', 'warn'); return; }

        // Damage with splash
        for (const b of Object.values(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const bx = b.x + bd.size[0] / 2;
            const by = b.y + bd.size[1] / 2;
            const dist = Math.hypot(bx - tx, by - ty);
            if (dist <= splashR + 1) {
                const dmg = dist < 1 ? baseDmg : baseDmg * (1 - dist / (splashR + 1)) * 0.5;
                BattleManager._damageBuilding(b.id, dmg);
            }
        }
        BattleRenderer.addExplosion(tx, ty, '#ffeb3b', 40);
        BattleRenderer.addExplosion(tx, ty, '#fff', 18);
        BattleRenderer.addExplosion(tx, ty, '#ffca28', 25);
        BattleRenderer.addGroundRing?.(tx, ty, '#ffeb3b', splashR * 1.2, 600);
        if (typeof BattleRenderer !== 'undefined' && BattleRenderer.addLightningArc) {
            BattleRenderer.addLightningArc(tx, ty);
            // Ikkinchi kechiktirilgan arc
            setTimeout(() => BattleRenderer.addLightningArc(tx + (Math.random()-0.5)*2, ty + (Math.random()-0.5)*2), 120);
        }
        BattleRenderer.triggerShake(18 * Camera.zoom, 450);
        BattleRenderer.addFloatingText(tx, ty - 1, '⚡ CHAQMOQ!', '#ffeb3b', 14);
        Toast.show('⚡ Chaqmoq urdi!', 'success');
    },

    _castClone(tx, ty, radius, hpFactor, maxClones) {
        if (typeof BattleManager === 'undefined') return;
        const r2     = radius * radius;
        const clones = [];
        for (const t of BattleManager.troops) {
            if (t.hp <= 0) continue;
            const dx = t.x - tx, dy = t.y - ty;
            if (dx*dx + dy*dy > r2) continue;
            if (clones.length >= (maxClones || 8)) break;
            clones.push(t);
        }
        if (clones.length === 0) {
            Toast.show('🪞 Hudud bo\'sh — klon yo\'q!', 'warn');
            return;
        }
        let created = 0;
        for (const original of clones) {
            const clone = Object.assign({}, original);
            clone.id       = Date.now() + Math.random();
            clone.hp       = Math.round(original.maxHp * (hpFactor || 0.5));
            clone.maxHp    = clone.hp;
            clone._isClone = true;
            // Asl askar yoniga joylashtir (kichik offset)
            clone.x = original.x + (Math.random()-0.5) * 1.0;
            clone.y = original.y + (Math.random()-0.5) * 1.0;
            clone.state     = 'moving';
            clone.target    = null;
            clone.lastAttack = 0;
            BattleManager.troops.push(clone);
            if (typeof BattleManager._troopsById !== 'undefined') {
                BattleManager._troopsById.set(clone.id, clone);
            }
            created++;
        }
        BattleRenderer.addExplosion(tx, ty, '#e040fb', 35);
        for (let i = 0; i < 5; i++) {
            setTimeout(() => BattleRenderer.addExplosion(
                tx + (Math.random()-0.5)*radius*2,
                ty + (Math.random()-0.5)*radius*2,
                '#ce93d8', 18), i * 80);
        }
        Toast.show(`🪞 Ko'payish Sehr! ${created} ta klon yaratildi!`, 'success');
    },

    // Har frame update — effektlarni qo'llash
    update(dt) {
        const now = Date.now();
        this._activeEffects = this._activeEffects.filter(e => now < e.endTime);

        for (const eff of this._activeEffects) {
            if (eff.type === 'heal') {
                // SpatialGrid mavjud bo'lsa — O(K) query, aks holda O(N) linear
                const nearby = (typeof SpatialGrid !== 'undefined' && SpatialGrid._cells)
                    ? SpatialGrid.queryAll(eff.x, eff.y, eff.radius)
                    : BattleManager.troops;
                const r2 = eff.radius * eff.radius;
                for (const t of nearby) {
                    if (t.hp <= 0) continue;
                    const dx = t.x - eff.x, dy = t.y - eff.y;
                    if (dx*dx + dy*dy <= r2) {
                        t.hp = Math.min(t.maxHp, t.hp + eff.hps * dt);
                    }
                }
            } else if (eff.type === 'poison') {
                // Guard troops va asosiy askarlar zaharlanadi
                const allTargets = [
                    ...(BattleManager.guardTroops || []),
                    ...(BattleManager.troops || [])
                ];
                const r2 = eff.radius * eff.radius;
                for (const t of allTargets) {
                    if (t.hp <= 0) continue;
                    const dx = t.x - eff.x, dy = t.y - eff.y;
                    if (dx*dx + dy*dy <= r2) {
                        // Damage over time
                        t.hp -= (eff.dps || 60) * dt;
                        // Sekinlashtirish
                        t.slowed     = true;
                        t.slowFactor = eff.slowMult || 0.55;
                        t.slowExpiry = now + 2000; // har tick yangilanadi
                    }
                }
                // Zahar particle effekti
                if (Math.random() < 0.15) {
                    BattleRenderer.addExplosion(
                        eff.x + (Math.random()-0.5)*eff.radius*2,
                        eff.y + (Math.random()-0.5)*eff.radius*2,
                        '#76ff03', 8
                    );
                }
            }
        }
    },

    // Askarning rage multiplier'ini olish (BattleManager._getAuraMult bilan birga)
    getRageMult(troop) {
        const now = Date.now();
        let mult = 1;
        for (const eff of this._activeEffects) {
            if (eff.type !== 'rage' || now >= eff.endTime) continue;
            const dist = Math.hypot(troop.x - eff.x, troop.y - eff.y);
            if (dist <= eff.radius) mult = Math.max(mult, eff.damageMult || 2);
        }
        return mult;
    },

    // Haste spell tezlik multipieri
    getHasteMult(troop) {
        const now = Date.now();
        let mult = 1;
        for (const eff of this._activeEffects) {
            if (eff.type !== 'haste' || now >= eff.endTime) continue;
            const dist = Math.hypot(troop.x - eff.x, troop.y - eff.y);
            if (dist <= eff.radius) mult = Math.max(mult, eff.speedMult || 2.5);
        }
        return mult;
    },

    // Rage spell tezlik multipieri (damage mult != speed mult)
    getRageSpeedMult(troop) {
        const now = Date.now();
        let mult = 1;
        for (const eff of this._activeEffects) {
            if (eff.type !== 'rage' || now >= eff.endTime) continue;
            const dist = Math.hypot(troop.x - eff.x, troop.y - eff.y);
            if (dist <= eff.radius) mult = Math.max(mult, eff.speedMult || 1.8);
        }
        return mult;
    },

    // Troop bu koordinatada sakrash zonadami? (jump spell)
    isInJumpZone(x, y) {
        const now = Date.now();
        for (const eff of this._activeEffects) {
            if (eff.type !== 'jump' || now >= eff.endTime) continue;
            const d2 = (x - eff.x)**2 + (y - eff.y)**2;
            if (d2 <= eff.radius * eff.radius) return true;
        }
        return false;
    },

    // Mudofaa minorasi muzlaganmi?
    isFrozen(building) {
        const now = Date.now();
        const bd = BUILDING_DATA[building.type];
        if (!bd || bd.category !== 'mudofaa') return false;
        const bx = building.x + bd.size[0] / 2;
        const by = building.y + bd.size[1] / 2;
        for (const eff of this._activeEffects) {
            if (eff.type !== 'freeze' || now >= eff.endTime) continue;
            const dist = Math.hypot(bx - eff.x, by - eff.y);
            if (dist <= eff.radius) return true;
        }
        return false;
    },

    serialize() {
        // Brew queue ni saqlash — faqat type va vaqtni saqlaymiz
        const queue = this._brewQueue.map((item, idx) => ({
            type: item.type,
            remaining: idx === 0 && item.timerId
                ? (timerManager.getRemaining?.(item.timerId) || SPELL_DATA[item.type]?.time || 0)
                : (SPELL_DATA[item.type]?.time || 0),
        }));
        return { inventory: { ...this.inventory }, brewQueue: queue };
    },

    deserialize(data, offlineSec = 0) {
        if (!data) return;
        this.inventory = data.inventory || {};
        // Brew queue ni tiklash
        this._brewQueue = [];
        if (Array.isArray(data.brewQueue) && data.brewQueue.length > 0) {
            let remainingOffline = offlineSec;

            for (const q of data.brewQueue) {
                if (!SPELL_DATA[q.type]) continue;
                const savedRemaining = q.remaining || SPELL_DATA[q.type]?.time || 60;
                const actualRemaining = Math.max(0, savedRemaining - remainingOffline);
                remainingOffline = Math.max(0, remainingOffline - savedRemaining);

                if (actualRemaining === 0) {
                    // Offline vaqtda tayyorlandi — inventarga qo'sh
                    this.inventory[q.type] = (this.inventory[q.type] || 0) + 1;
                    const sd = SPELL_DATA[q.type];
                    if (typeof Toast !== 'undefined')
                        Toast.show(`${sd.icon} ${sd.name} (offline) tayyor!`, 'success', 2500);
                } else {
                    this._brewQueue.push({ type: q.type, timerId: null, _savedRemaining: actualRemaining });
                }
            }

            // Birinchi elementni qisman vaqt bilan boshlash
            if (this._brewQueue.length > 0) {
                const item = this._brewQueue[0];
                const sd   = SPELL_DATA[item.type];
                const firstRemaining = item._savedRemaining || sd?.time || 60;
                delete item._savedRemaining;
                item.timerId = timerManager.add(
                    firstRemaining,
                    () => {
                        this._brewQueue.shift();
                        this.inventory[item.type] = (this.inventory[item.type] || 0) + 1;
                        Toast.show(`${sd.icon} ${sd.name} tayyor!`, 'success');
                        this._startNextBrew();
                    },
                    null,
                    { spellType: item.type }
                );
            }
        }
    }
};
