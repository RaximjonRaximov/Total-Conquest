// ============================================
// TO'SIQLAR TIZIMI (Obstacles)
// Daraxtlar, toshlar, buyumlar
// ============================================

const OBSTACLE_DATA = {
    tree1: {
        name: "Katta Daraxt",
        icon: "🌳",
        size: [1, 1],
        removeCost: { gold: 500 },
        removeTime: 30,
        rewards: { xp: 5 },
        color: '#2d8a3e'
    },
    tree2: {
        name: "Kichik Daraxt",
        icon: "🌲",
        size: [1, 1],
        removeCost: { gold: 200 },
        removeTime: 15,
        rewards: { xp: 3 },
        color: '#1b6e30'
    },
    bush: {
        name: "Buta",
        icon: "🌿",
        size: [1, 1],
        removeCost: { gold: 100 },
        removeTime: 10,
        rewards: { xp: 2, diamond: 1 },
        color: '#3a9e50'
    },
    rock1: {
        name: "Katta Tosh",
        icon: "🪨",
        size: [2, 2],
        removeCost: { gold: 1000 },
        removeTime: 60,
        rewards: { xp: 10, diamond: 2 },
        color: '#6b6b6b'
    },
    rock2: {
        name: "Kichik Tosh",
        icon: "🗿",
        size: [1, 1],
        removeCost: { gold: 300 },
        removeTime: 20,
        rewards: { xp: 4 },
        color: '#888888'
    },
    mushroom: {
        name: "Qo'ziqorin",
        icon: "🍄",
        size: [1, 1],
        removeCost: { gold: 50 },
        removeTime: 5,
        rewards: { xp: 1, diamond: 1 },
        color: '#c44'
    },
    flower: {
        name: "Gul",
        icon: "🌸",
        size: [1, 1],
        removeCost: { gold: 80 },
        removeTime: 8,
        rewards: { xp: 2 },
        color: '#e684ae'
    },
    trunk: {
        name: "Eski Daraxt",
        icon: "🪵",
        size: [1, 1],
        removeCost: { gold: 150 },
        removeTime: 12,
        rewards: { xp: 3, diamond: 1 },
        color: '#8B5A2B'
    },
    ancient_stone: {
        name: "Qadimiy Tosh",
        icon: "⛩️",
        size: [2, 2],
        removeCost: { gold: 3000 },
        removeTime: 120,
        rewards: { xp: 25, diamond: 5 },
        color: '#9e8c6c'
    },

    // ── MAXSUS TO'SIQLAR (vaqtida paydo bo'ladi) ─────────────────────────────
    gemBox: {
        name: "Olmos Qutisi",
        icon: "💎",
        size: [1, 1],
        removeCost: { gold: 1000 },
        removeTime: 60,
        rewards: { xp: 15, diamond: 25 },
        color: '#00bcd4',
        isSpecial: true,
        spawnIntervalHours: 24,   // Har 24 soatda bir paydo bo'lishi mumkin
    },
    goldenChest: {
        name: "Oltin Sandiq",
        icon: "📦",
        size: [1, 1],
        removeCost: { food: 2000 },
        removeTime: 45,
        rewards: { xp: 20, gold: 50000 },
        color: '#ffd700',
        isSpecial: true,
        spawnIntervalHours: 36,
    },
};

const ObstacleManager = {
    obstacles: {},  // id -> obstacle object
    nextId: 1000,

    // Boshlang'ich to'siqlarni joylashtirish (CoC uslubi — klaster va tabiiy)
    placeInitialObstacles() {
        const S    = Grid.SIZE;
        const cx   = Math.floor(S / 2);
        const cy   = Math.floor(S / 2);
        const CLEAR_R = 10; // markazdan bu masofada hech narsa yo'q

        // ─ 1. Daraxt klasterlari (chetlarda, guruh-guruh)
        const CLUSTER_TYPES = ['tree1', 'tree2', 'bush', 'trunk'];
        const CLUSTER_W     = [25,      30,       25,     20];
        const clusterSeeds  = [
            { x: 4,    y: 4  }, { x: S-8,  y: 4  },
            { x: 4,    y: S-8}, { x: S-8,  y: S-8},
            { x: cx-2, y: 4  }, { x: cx-2, y: S-8},
            { x: 4,    y: cy-2}, { x: S-8, y: cy-2},
        ];
        for (const seed of clusterSeeds) {
            const clusterSize = 4 + Math.floor(Math.random() * 5);
            for (let i = 0; i < clusterSize; i++) {
                const type = this._weightedRandom(CLUSTER_TYPES, CLUSTER_W);
                const od   = OBSTACLE_DATA[type];
                const w    = od.size[0];
                const h    = od.size[1];
                // Seed atrofida 3 tile radius
                for (let attempt = 0; attempt < 20; attempt++) {
                    const dx = Math.floor((Math.random() - 0.5) * 6);
                    const dy = Math.floor((Math.random() - 0.5) * 6);
                    const x  = Math.max(2, Math.min(S - w - 2, seed.x + dx));
                    const y  = Math.max(2, Math.min(S - h - 2, seed.y + dy));
                    const distC = Math.hypot(x + w/2 - cx, y + h/2 - cy);
                    if (distC < CLEAR_R) continue;
                    if (Grid.isFree(x, y, w, h)) { this._placeObstacle(type, x, y); break; }
                }
            }
        }

        // ─ 2. Toshlar — har bir kvadrantda 1-2 ta (xaritaning chetroqida)
        const ROCK_TYPES = ['rock1', 'rock2', 'ancient_stone'];
        const ROCK_W     = [40,      45,       15];
        const quadrants  = [
            { x1: 3,    y1: 3,    x2: cx-6, y2: cy-6 },
            { x1: cx+6, y1: 3,    x2: S-4,  y2: cy-6 },
            { x1: 3,    y1: cy+6, x2: cx-6, y2: S-4  },
            { x1: cx+6, y1: cy+6, x2: S-4,  y2: S-4  },
        ];
        for (const q of quadrants) {
            const n = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < n; i++) {
                const type = this._weightedRandom(ROCK_TYPES, ROCK_W);
                const od   = OBSTACLE_DATA[type];
                const w    = od.size[0];
                const h    = od.size[1];
                for (let attempt = 0; attempt < 25; attempt++) {
                    const x = q.x1 + Math.floor(Math.random() * Math.max(1, q.x2 - q.x1 - w));
                    const y = q.y1 + Math.floor(Math.random() * Math.max(1, q.y2 - q.y1 - h));
                    if (x < 2 || y < 2 || x + w > S - 2 || y + h > S - 2) continue;
                    const distC = Math.hypot(x + w/2 - cx, y + h/2 - cy);
                    if (distC < CLEAR_R) continue;
                    if (Grid.isFree(x, y, w, h)) { this._placeObstacle(type, x, y); break; }
                }
            }
        }

        // ─ 3. Tarqoq dekorlar (mushroom, flower) — xaritaning to'rt tomoni
        const DECO_TYPES = ['mushroom', 'flower', 'bush'];
        const DECO_W     = [35,         40,        25];
        const decoCount  = 12 + Math.floor(Math.random() * 8);
        for (let i = 0; i < decoCount; i++) {
            const type = this._weightedRandom(DECO_TYPES, DECO_W);
            const od   = OBSTACLE_DATA[type];
            for (let attempt = 0; attempt < 30; attempt++) {
                const x = 2 + Math.floor(Math.random() * (S - 4));
                const y = 2 + Math.floor(Math.random() * (S - 4));
                const distC = Math.hypot(x - cx, y - cy);
                if (distC < CLEAR_R) continue;
                if (Grid.isFree(x, y, od.size[0], od.size[1])) {
                    this._placeObstacle(type, x, y);
                    break;
                }
            }
        }
    },

    _placeObstacle(type, x, y) {
        const od = OBSTACLE_DATA[type];
        const id = this.nextId++;
        const obstacle = {
            id: id,
            type: type,
            x: x,
            y: y,
            removing: false,
            timerId: null
        };
        this.obstacles[id] = obstacle;
        Grid.occupy(x, y, od.size[0], od.size[1], 'obs_' + id);
    },

    _weightedRandom(items, weights) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        for (let i = 0; i < items.length; i++) {
            r -= weights[i];
            if (r <= 0) return items[i];
        }
        return items[items.length - 1];
    },

    // To'siqni olib tashlashni boshlash
    startRemove(id) {
        const obs = this.obstacles[id];
        if (!obs || obs.removing) return false;

        const od = OBSTACLE_DATA[obs.type];

        // Builder bo'shmi?
        if (!BuilderSystem.hasFreeBuilder()) {
            Toast.show("Quruvchi band! Boshqa quruvchi kerak.", "warning");
            return false;
        }

        // Narxni tekshirish
        if (!Resources.canAfford(od.removeCost)) {
            Toast.show("Resurs yetarli emas!", "error");
            return false;
        }
        Resources.spendMultiple(od.removeCost);

        // Builderni band qilish
        BuilderSystem.assignBuilder();

        obs.removing = true;
        obs.timerId = timerManager.add(
            od.removeTime,
            () => {
                // Mukofotlar
                if (od.rewards) {
                    if (od.rewards.xp) XPSystem.addXP(od.rewards.xp);
                    if (od.rewards.diamond) {
                        Resources.add('diamond', od.rewards.diamond);
                        Toast.show(`💎 +${od.rewards.diamond} olmos topildi!`, 'reward');
                    }
                }

                // Griddan olib tashlash
                Grid.free(obs.x, obs.y, od.size[0], od.size[1]);

                // Particle burst effekti
                if (typeof BuildingRenderer !== 'undefined') {
                    const cx = obs.x + od.size[0] / 2;
                    const cy = obs.y + od.size[1] / 2;
                    // Wood/stone chip particles
                    const color = (od.type === 'tree' || obs.type === 'pine') ? '#8d6e63' : '#9e9e9e';
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const speed = 1.5 + Math.random() * 2;
                        const iso = Camera.toIso(cx + Math.cos(angle) * 0.5, cy + Math.sin(angle) * 0.5);
                        const sc  = Camera.worldToScreen(iso.x, iso.y);
                        // We'll use MapRenderer's explosion helper if available
                    }
                }
                if (typeof MapRenderer !== 'undefined' && MapRenderer.ctx) {
                    // Gold reward float
                    if (od.rewards?.xp) {
                        const iso = Camera.toIso(obs.x + od.size[0]/2, obs.y + od.size[1]/2);
                        const sc  = Camera.worldToScreen(iso.x, iso.y);
                        // Show XP float via a DOM element since we don't have battle renderer here
                    }
                }

                // Clearing DOM burst animation
                if (typeof Camera !== 'undefined' && typeof Grid !== 'undefined') {
                    const cx = obs.x + od.size[0] / 2;
                    const cy = obs.y + od.size[1] / 2;
                    const wx = (cx - cy) * Grid.TILE_W;
                    const wy = (cx + cy) * Grid.TILE_H;
                    const sc = Camera.worldToScreen(wx, wy);
                    const sx = Math.round(sc.x), sy = Math.round(sc.y);
                    const chipColor = (obs.type.startsWith('tree') || obs.type === 'pine' || obs.type === 'bush')
                        ? ['#8d6e63','#a5d6a7','#66bb6a','#4caf50']
                        : ['#9e9e9e','#bdbdbd','#757575','#e0e0e0'];
                    for (let i = 0; i < 14; i++) {
                        const chip = document.createElement('div');
                        const angle = Math.random() * Math.PI * 2;
                        const spd   = 40 + Math.random() * 60;
                        const sz    = 4 + Math.random() * 5;
                        const col   = chipColor[Math.floor(Math.random() * chipColor.length)];
                        const dur   = 500 + Math.random() * 300;
                        chip.style.cssText = `
                            position:fixed;left:${sx}px;top:${sy}px;
                            width:${sz}px;height:${sz}px;
                            background:${col};border-radius:${Math.random()>0.5?'50%':'2px'};
                            pointer-events:none;z-index:8799;
                            transform:translate(-50%,-50%);
                            animation:buildConfettiPiece ${dur}ms ease-out forwards;
                            --vx:${Math.cos(angle)*spd}px;--vy:${Math.sin(angle)*spd-20}px;
                        `;
                        document.body.appendChild(chip);
                        setTimeout(() => chip.remove(), dur + 50);
                    }
                }

                delete this.obstacles[id];

                // Builderni bo'shatish
                BuilderSystem.freeBuilder();

                // Completion toast with reward summary
                const rewardStr = od.rewards
                    ? [od.rewards.xp ? `✨ +${od.rewards.xp}XP` : '', od.rewards.diamond ? `💎 +${od.rewards.diamond}` : ''].filter(Boolean).join(' ')
                    : '';
                Toast.show(`${od.icon} ${od.name} olib tashlandi! ${rewardStr}`, 'success');
            },
            null,
            { obstacleId: id }
        );
        return true;
    },

    // Tezlashtirish (olmos)
    speedUpRemove(id) {
        const obs = this.obstacles[id];
        if (!obs || !obs.timerId) return false;

        const remaining = timerManager.getRemaining(obs.timerId);
        const gemCost = Helpers.calcGemCost(remaining);

        if (!Resources.spend('diamond', gemCost)) {
            Toast.show("Olmos yetarli emas!", "error");
            return false;
        }

        timerManager.instant(obs.timerId);
        return true;
    },

    // Koordinatadagi to'siqni topish
    getAt(gx, gy) {
        if (gx < 0 || gx >= Grid.SIZE || gy < 0 || gy >= Grid.SIZE) return null;
        const tile = Grid.tiles[gy][gx];
        if (!tile.buildingId || typeof tile.buildingId !== 'string' || !tile.buildingId.startsWith('obs_')) return null;
        const obsId = parseInt(tile.buildingId.replace('obs_', ''));
        return this.obstacles[obsId] || null;
    },

    // ── Muntazam o'simlik o'sishi — CoC-style har 8 soatda ─────────────────────
    // Max 40 ta oddiy to'siq bo'lishi mumkin
    _lastGrowthCheck: 0,
    MAX_NATURAL_OBSTACLES: 40,
    GROWTH_INTERVAL_MS: 8 * 3_600_000,  // 8 soat

    checkRegularGrowth() {
        const now = Date.now();
        if (now - this._lastGrowthCheck < this.GROWTH_INTERVAL_MS) return;
        this._lastGrowthCheck = now;

        // Hozirgi oddiy to'siqlar soni
        const naturalTypes = ['tree1','tree2','bush','flower','mushroom','trunk'];
        const naturalCount = Object.values(this.obstacles).filter(o =>
            naturalTypes.includes(o.type) && !o.removing
        ).length;

        if (naturalCount >= this.MAX_NATURAL_OBSTACLES) return;

        // 1-2 ta yangi o'simlik qo'sh
        const growCount = 1 + (Math.random() < 0.35 ? 1 : 0);
        const S = typeof Grid !== 'undefined' ? Grid.SIZE : 44;
        const cx = Math.floor(S / 2);
        const cy = Math.floor(S / 2);
        const CLEAR_R = 9;

        // Yaqinidagi to'siq bor joyga (klaster)
        const existing = Object.values(this.obstacles).filter(o =>
            naturalTypes.includes(o.type) && !o.removing
        );

        let spawned = 0;
        for (let gi = 0; gi < growCount; gi++) {
            // 60% — mavjud to'siq yaqinida; 40% — tasodifiy
            const growNear = existing.length > 0 && Math.random() < 0.6;
            const GROW_TYPES = ['tree2','bush','flower','mushroom','tree1','trunk'];
            const GROW_W     = [30,     30,     20,      15,       10,     5];
            const type = this._weightedRandom(GROW_TYPES, GROW_W);
            const od = OBSTACLE_DATA[type];
            const [w, h] = od.size;

            let placed = false;
            for (let attempt = 0; attempt < 40; attempt++) {
                let x, y;
                if (growNear && existing.length > 0) {
                    const ref = existing[Math.floor(Math.random() * existing.length)];
                    x = Math.max(2, Math.min(S - w - 2, ref.x + Math.floor((Math.random()-0.5)*5)));
                    y = Math.max(2, Math.min(S - h - 2, ref.y + Math.floor((Math.random()-0.5)*5)));
                } else {
                    x = 2 + Math.floor(Math.random() * (S - 4 - w));
                    y = 2 + Math.floor(Math.random() * (S - 4 - h));
                }
                const dist = Math.hypot(x + w/2 - cx, y + h/2 - cy);
                if (dist < CLEAR_R) continue;
                if (typeof Grid !== 'undefined' && Grid.isFree(x, y, w, h)) {
                    this._placeObstacle(type, x, y);
                    placed = true;
                    spawned++;
                    break;
                }
            }
        }
    },

    // ── Maxsus to'siqlar spawn (Gem Box, Golden Chest) ───────────────────────
    _lastSpecialSpawn: {},   // { gemBox: timestamp, goldenChest: timestamp }

    checkSpecialSpawns() {
        const now = Date.now();
        const SPECIAL_TYPES = ['gemBox', 'goldenChest'];
        for (const type of SPECIAL_TYPES) {
            const od = OBSTACLE_DATA[type];
            if (!od?.isSpecial) continue;
            // Bu tip allaqachon xaritada bormi?
            const exists = Object.values(this.obstacles).some(o => o.type === type && !o.removing);
            if (exists) continue;
            // Intervalni tekshirish
            const lastSpawn = this._lastSpecialSpawn[type] || 0;
            const intervalMs = (od.spawnIntervalHours || 24) * 3_600_000;
            if (now - lastSpawn < intervalMs) continue;
            // Tasodifiy joyga joylash
            const spawned = this._spawnSpecialObstacle(type);
            if (spawned) {
                this._lastSpecialSpawn[type] = now;
                const name = od.name;
                const rewardStr = od.rewards.diamond
                    ? `💎 ${od.rewards.diamond} olmos`
                    : `🪙 ${Helpers.formatNumber(od.rewards.gold || 0)} oltin`;
                if (typeof Toast !== 'undefined') {
                    Toast.show(`✨ ${od.icon} ${name} paydo bo'ldi! (${rewardStr})`, 'info', 5000);
                }
            }
        }
    },

    _spawnSpecialObstacle(type) {
        const od = OBSTACLE_DATA[type];
        if (!od) return false;
        const [w, h] = od.size;
        const S = typeof Grid !== 'undefined' ? Grid.SIZE : 40;
        const cx = Math.floor(S / 2);
        const cy = Math.floor(S / 2);
        // Markazga nisbatan biroz chetroqda
        for (let attempt = 0; attempt < 60; attempt++) {
            const x = Math.floor(5 + Math.random() * (S - 10));
            const y = Math.floor(5 + Math.random() * (S - 10));
            const dist = Math.hypot(x + w/2 - cx, y + h/2 - cy);
            if (dist < 8 || dist > 28) continue;
            if (typeof Grid !== 'undefined' && Grid.isFree(x, y, w, h)) {
                this._placeObstacle(type, x, y);
                return true;
            }
        }
        return false;
    },

    // Serializatsiya
    serialize() {
        const result = [];
        for (const obs of Object.values(this.obstacles)) {
            if (!obs.removing) { // faqat olib tashlanmayotganlarni saqlash
                result.push({
                    id: obs.id,
                    type: obs.type,
                    x: obs.x,
                    y: obs.y
                });
            }
        }
        return {
            obstacles: result,
            lastSpecialSpawn: this._lastSpecialSpawn,
            lastGrowthCheck: this._lastGrowthCheck,
        };
    },

    // Deserializatsiya
    deserialize(data) {
        this.obstacles = {};
        // Yangi format: { obstacles: [...], lastSpecialSpawn: {} }
        // Eski format: [...]
        const arr = Array.isArray(data) ? data : (data?.obstacles || []);
        if (data?.lastSpecialSpawn) this._lastSpecialSpawn = data.lastSpecialSpawn;
        if (data?.lastGrowthCheck) this._lastGrowthCheck = data.lastGrowthCheck;
        if (!arr || !Array.isArray(arr)) return;
        for (const od of arr) {
            const obstacle = {
                id: od.id,
                type: od.type,
                x: od.x,
                y: od.y,
                removing: false,
                timerId: null
            };
            this.obstacles[od.id] = obstacle;
            const oData = OBSTACLE_DATA[od.type];
            if (oData) {
                Grid.occupy(od.x, od.y, oData.size[0], oData.size[1], 'obs_' + od.id);
            }
            if (od.id >= this.nextId) this.nextId = od.id + 1;
        }
    }
};
