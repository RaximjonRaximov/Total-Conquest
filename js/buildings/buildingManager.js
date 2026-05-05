// ============================================
// BINO BOSHQARUVCHISI
// Qo'yish, upgrade, olib tashlash, resurs ishlab chiqarish
// ============================================

const BuildingManager = {
    buildings: {},  // id -> building object
    nextId: 1,

    // Drag tizimi
    dragging: false,
    dragBuildingId: null,
    dragOrigX: -1,
    dragOrigY: -1,
    dragCurrentX: -1,
    dragCurrentY: -1,

    // Bino qo'yish
    place(type, gridX, gridY) {
        const bd = BUILDING_DATA[type];
        if (!bd) return null;

        const w = bd.size[0];
        const h = bd.size[1];

        // Joyni tekshirish
        if (!Grid.isFree(gridX, gridY, w, h)) return null;
        if (gridX + w > Grid.SIZE || gridY + h > Grid.SIZE) return null;

        // TH talabini tekshirish
        if (bd.thRequired && Game.townHallLevel < bd.thRequired) return null;

        // Max sonni tekshirish
        const count = this.countType(type);
        if (count >= bd.maxCount) return null;

        // Narxni tekshirish va to'lash
        const levelData = bd.levels[1];
        // Builder tekshirish (vaqt kerak bo'lsa)
        if (levelData.time > 0 && !BuilderSystem.hasFreeBuilder()) {
            Toast.show("Quruvchi band! Boshqa quruvchi kerak.", "warning");
            return null;
        }

        if (levelData.cost && Object.keys(levelData.cost).length > 0) {
            if (!Resources.canAfford(levelData.cost)) {
                const missingDiamonds = Resources.getMissingCostInDiamonds(levelData.cost);
                if (Resources.diamond >= missingDiamonds) {
                    const ans = confirm(`Sizda yetarli resurs yo'q. Kamini ${missingDiamonds} olmos evaziga to'laysizmi?`);
                    if (!ans) return null;
                    Resources.spendMissingWithDiamonds(levelData.cost, missingDiamonds);
                } else {
                    Toast.show("Resurs va olmos yetarli emas!", "error");
                    return null;
                }
            } else {
                Resources.spendMultiple(levelData.cost);
            }
        }

        const id = this.nextId++;
        const building = {
            id: id,
            type: type,
            x: gridX,
            y: gridY,
            level: 1,
            hp: levelData.hp,
            maxHp: levelData.hp,
            building: levelData.time > 0,  // qurilmoqdami?
            timerId: null,
            storedResource: 0,  // yig'ilmagan resurs
            lastCollect: Date.now()
        };

        // Qurilish vaqti
        if (levelData.time > 0) {
            BuilderSystem.assignBuilder();
            building.timerId = timerManager.add(
                levelData.time,
                () => {
                    building.building = false;
                    building.timerId = null;
                    BuilderSystem.freeBuilder();
                    // XP mukofoti
                    const xp = XPSystem.getBuildXP(type, 1);
                    XPSystem.addXP(xp);
                },
                null,
                { buildingId: id }
            );
        } else {
            building.building = false;
            // Bepul binolar ham XP beradi
            XPSystem.addXP(1);
        }

        this.buildings[id] = building;
        Grid.occupy(gridX, gridY, w, h, id);

        // Agar cityHall bo'lsa, TH darajasini yangilash
        if (type === 'cityHall') {
            Game.townHallLevel = building.level;
            Resources.updateDisplay();
        }

        return building;
    },

    // Binoni olib tashlash
    remove(id) {
        const b = this.buildings[id];
        if (!b) return;

        const bd = BUILDING_DATA[b.type];
        Grid.free(b.x, b.y, bd.size[0], bd.size[1]);

        if (b.timerId) timerManager.cancel(b.timerId);
        delete this.buildings[id];
    },

    // Bino ko'chirish (drag & drop)
    startDrag(id) {
        const b = this.buildings[id];
        if (!b) return false;
        // Qurilayotgan binoni ko'chirib bo'lmaydi
        if (b.building) return false;

        const bd = BUILDING_DATA[b.type];
        // Griddan bo'shatish (ko'chirish vaqtida)
        Grid.free(b.x, b.y, bd.size[0], bd.size[1]);

        this.dragging = true;
        this.dragBuildingId = id;
        this.dragOrigX = b.x;
        this.dragOrigY = b.y;
        this.dragCurrentX = b.x;
        this.dragCurrentY = b.y;
        return true;
    },

    updateDragPosition(tileX, tileY) {
        if (!this.dragging) return;
        if (tileX >= 0 && tileX < Grid.SIZE && tileY >= 0 && tileY < Grid.SIZE) {
            this.dragCurrentX = tileX;
            this.dragCurrentY = tileY;
        }
    },

    confirmDrag() {
        if (!this.dragging) return false;
        const b = this.buildings[this.dragBuildingId];
        if (!b) { this.cancelDrag(); return false; }

        const bd = BUILDING_DATA[b.type];
        const w = bd.size[0];
        const h = bd.size[1];
        const nx = this.dragCurrentX;
        const ny = this.dragCurrentY;

        // Yangi joyga sig'adimi tekshirish
        if (nx + w > Grid.SIZE || ny + h > Grid.SIZE || !Grid.isFree(nx, ny, w, h)) {
            // Sig'maydi — eski joyga qaytarish
            this.cancelDrag();
            return false;
        }

        // Yangi joyga qo'yish
        b.x = nx;
        b.y = ny;
        Grid.occupy(nx, ny, w, h, b.id);

        this.dragging = false;
        this.dragBuildingId = null;
        return true;
    },

    cancelDrag() {
        if (!this.dragging) return;
        const b = this.buildings[this.dragBuildingId];
        if (b) {
            const bd = BUILDING_DATA[b.type];
            // Eski joyga qaytarish
            b.x = this.dragOrigX;
            b.y = this.dragOrigY;
            Grid.occupy(this.dragOrigX, this.dragOrigY, bd.size[0], bd.size[1], b.id);
        }
        this.dragging = false;
        this.dragBuildingId = null;
    },

    canPlaceDrag() {
        if (!this.dragging) return false;
        const b = this.buildings[this.dragBuildingId];
        if (!b) return false;
        const bd = BUILDING_DATA[b.type];
        const w = bd.size[0];
        const h = bd.size[1];
        const nx = this.dragCurrentX;
        const ny = this.dragCurrentY;
        if (nx + w > Grid.SIZE || ny + h > Grid.SIZE) return false;
        return Grid.isFree(nx, ny, w, h);
    },

    // Binoni upgrade qilish
    upgrade(id) {
        const b = this.buildings[id];
        if (!b || b.building) return false;

        const bd = BUILDING_DATA[b.type];
        const nextLevel = b.level + 1;
        const levelData = bd.levels[nextLevel];
        if (!levelData) return false;

        // Builder tekshirish
        if (!BuilderSystem.hasFreeBuilder()) {
            Toast.show("Quruvchi band! Boshqa quruvchi kerak.", "warning");
            return false;
        }

        if (!Resources.canAfford(levelData.cost)) {
            const missingDiamonds = Resources.getMissingCostInDiamonds(levelData.cost);
            if (Resources.diamond >= missingDiamonds) {
                const ans = confirm(`Sizda yetarli resurs yo'q. Kamini ${missingDiamonds} olmos evaziga to'laysizmi?`);
                if (!ans) return false;
                Resources.spendMissingWithDiamonds(levelData.cost, missingDiamonds);
            } else {
                Toast.show("Resurs va olmos yetarli emas!", "error");
                return false;
            }
        } else {
            Resources.spendMultiple(levelData.cost);
        }

        BuilderSystem.assignBuilder();
        b.building = true;
        b.timerId = timerManager.add(
            levelData.time,
            () => {
                b.level = nextLevel;
                b.maxHp = levelData.hp;
                b.hp = levelData.hp;
                b.building = false;
                b.timerId = null;
                BuilderSystem.freeBuilder();

                // XP mukofoti
                const xp = XPSystem.getBuildXP(b.type, nextLevel);
                XPSystem.addXP(xp);

                if (b.type === 'cityHall') {
                    Game.townHallLevel = b.level;
                    Resources.updateDisplay();
                    const thEl = document.getElementById('th-display');
                    if (thEl) thEl.textContent = 'Town Hall: Lvl ' + b.level;
                }
            },
            null,
            { buildingId: id }
        );

        return true;
    },

    // Vaqtsiz (tezkor) upgrade olmos evaziga
    instantUpgrade(id) {
        const b = this.buildings[id];
        if (!b || b.building) return false;

        const bd = BUILDING_DATA[b.type];
        const nextLevel = b.level + 1;
        const levelData = bd.levels[nextLevel];
        if (!levelData) return false;

        const missingDiamonds = Resources.getMissingCostInDiamonds(levelData.cost);
        const timerDiamonds = Helpers.calcGemCost(levelData.time);
        const totalDiamonds = missingDiamonds + timerDiamonds;

        if (Resources.diamond >= totalDiamonds) {
            // Resurslarni to'lash
            Resources.spendMissingWithDiamonds(levelData.cost, missingDiamonds);
            Resources.spend('diamond', timerDiamonds);
            
            // Vaqtsiz upgrade tugallash
            b.level = nextLevel;
            b.maxHp = levelData.hp;
            b.hp = levelData.hp;
            
            if (b.type === 'cityHall') {
                Game.townHallLevel = b.level;
                Resources.updateDisplay();
                const thEl = document.getElementById('th-display');
                if (thEl) thEl.textContent = 'Town Hall: Lvl ' + b.level;
            }
            Toast.show(`💎 ${bd.icon} ${bd.name} darhol yangilandi! (-${totalDiamonds} olmos)`, 'success');
            AudioManager.playClick();
            return true;
        } else {
            Toast.show("Olmos yetarli emas!", "error");
            return false;
        }
    },

    // Olmos bilan tezlashtirish
    speedUp(id) {
        const b = this.buildings[id];
        if (!b || !b.timerId) return false;

        const remaining = timerManager.getRemaining(b.timerId);
        const gemCost = Helpers.calcGemCost(remaining);

        if (!Resources.spend('diamond', gemCost)) return false;

        timerManager.instant(b.timerId);
        return true;
    },

    // Berilgan koordinatadagi binoni topish
    getAt(gx, gy) {
        if (gx < 0 || gx >= Grid.SIZE || gy < 0 || gy >= Grid.SIZE) return null;
        const tile = Grid.tiles[gy][gx];
        if (tile.buildingId === null) return null;
        return this.buildings[tile.buildingId] || null;
    },

    // Tur bo'yicha sanash
    countType(type) {
        let count = 0;
        for (const b of Object.values(this.buildings)) {
            if (b.type === type) count++;
        }
        return count;
    },

    // Resurs ishlab chiqarishni yangilash (har frame)
    updateProduction() {
        const now = Date.now();

        for (const b of Object.values(this.buildings)) {
            if (b.building) continue;

            const bd = BUILDING_DATA[b.type];
            const lv = bd.levels[b.level];
            if (!lv || !lv.production) continue;

            const elapsed = (now - b.lastCollect) / 1000;
            if (elapsed < 1) continue; // At kamida 1 sekund o'tgan bo'lsin

            const produced = lv.production * elapsed / 60; // per minute
            const capacity = lv.capacity || 999999;

            if (b.storedResource < capacity) {
                b.storedResource = Math.min(capacity, b.storedResource + produced);
            }

            b.lastCollect = now;
        }
    },

    // Resurs yig'ish (bino ustiga bosganda)
    collect(id) {
        const b = this.buildings[id];
        if (!b || b.building || b.storedResource < 1) return 0;

        const amount = Math.floor(b.storedResource);
        b.storedResource -= amount;

        if (b.type === 'villa') {
            Resources.add('gold', amount);
        } else if (b.type === 'farm') {
            Resources.add('food', amount);
        } else if (b.type === 'treeOfLife') {
            Resources.add('goldenApple', amount);
        }

        return amount;
    },

    // Boshlang'ich binolarni joylashtirish
    placeStarterBuildings() {
        const cx = Math.floor(Grid.SIZE / 2) - 1;
        const cy = Math.floor(Grid.SIZE / 2) - 1;

        // City Hall markazda
        const ch = {
            id: this.nextId++,
            type: 'cityHall',
            x: cx, y: cy,
            level: 1,
            hp: 500, maxHp: 500,
            building: false,
            timerId: null,
            storedResource: 0,
            lastCollect: Date.now()
        };
        this.buildings[ch.id] = ch;
        Grid.occupy(cx, cy, 3, 3, ch.id);
        Game.townHallLevel = 1;

        // Villa
        this._placeStarter('villa', cx - 3, cy);
        // Ferma
        this._placeStarter('farm', cx + 3, cy);
        // Kazarma
        this._placeStarter('barracks', cx, cy + 4);
    },

    _placeStarter(type, x, y) {
        const bd = BUILDING_DATA[type];
        const id = this.nextId++;
        const lv = bd.levels[1];
        const b = {
            id: id,
            type: type,
            x: x, y: y,
            level: 1,
            hp: lv.hp, maxHp: lv.hp,
            building: false,
            timerId: null,
            storedResource: 0,
            lastCollect: Date.now()
        };
        this.buildings[id] = b;
        Grid.occupy(x, y, bd.size[0], bd.size[1], id);
    }
};
