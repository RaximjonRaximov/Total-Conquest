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
    }
};

const ObstacleManager = {
    obstacles: {},  // id -> obstacle object
    nextId: 1000,

    // Boshlang'ich to'siqlarni joylashtirish
    placeInitialObstacles() {
        const center = Math.floor(Grid.SIZE / 2);
        const count = 35 + Math.floor(Math.random() * 15); // 35-50 ta to'siq

        const types = Object.keys(OBSTACLE_DATA);
        const weights = [25, 25, 15, 5, 10, 5, 8, 5, 2]; // Ehtimollik

        for (let i = 0; i < count; i++) {
            const type = this._weightedRandom(types, weights);
            const od = OBSTACLE_DATA[type];
            const w = od.size[0];
            const h = od.size[1];

            // Tasodifiy joy topish (markazdan 5+ tile uzoqda)
            let attempts = 0;
            while (attempts < 40) {
                const x = Math.floor(Math.random() * (Grid.SIZE - w));
                const y = Math.floor(Math.random() * (Grid.SIZE - h));

                // Markazdan masofani tekshirish
                const dist = Math.abs(x - center) + Math.abs(y - center);
                if (dist < 6) { attempts++; continue; }

                // Bo'sh joyni tekshirish
                if (Grid.isFree(x, y, w, h)) {
                    this._placeObstacle(type, x, y);
                    break;
                }
                attempts++;
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
                delete this.obstacles[id];

                // Builderni bo'shatish
                BuilderSystem.freeBuilder();

                Toast.show(`${od.icon} ${od.name} olib tashlandi!`, 'success');
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
        return result;
    },

    // Deserializatsiya
    deserialize(data) {
        this.obstacles = {};
        if (!data || !Array.isArray(data)) return;
        for (const od of data) {
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
