// ============================================
// SAQLASH TIZIMI (Save/Load)
// localStorage ga saqlash va yuklash
// ============================================

const SaveSystem = {
    SAVE_KEY: 'totalConquest_save',
    AUTO_SAVE_INTERVAL: 30000, // 30 soniya
    _autoSaveTimer: null,

    // O'yinni saqlash
    save() {
        try {
            const data = {
                version: 2,
                timestamp: Date.now(),
                townHallLevel: Game.townHallLevel,
                resources: {
                    gold: Resources.gold,
                    food: Resources.food,
                    diamond: Resources.diamond,
                    goldenApple: Resources.goldenApple
                },
                buildings: this._serializeBuildings(),
                army: { ...TroopManager.army },
                nextBuildingId: BuildingManager.nextId
            };

            localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Saqlashda xato:', e);
            return false;
        }
    },

    // O'yinni yuklash
    load() {
        try {
            const raw = localStorage.getItem(this.SAVE_KEY);
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (!data || !data.version) return false;

            // Resurslar
            Resources.gold = data.resources.gold || 1000;
            Resources.food = data.resources.food || 500;
            Resources.diamond = data.resources.diamond || 50;
            Resources.goldenApple = data.resources.goldenApple || 0;

            // Town Hall level
            Game.townHallLevel = data.townHallLevel || 1;

            // Gridni tozalash
            Grid.init();

            // Binolar
            BuildingManager.buildings = {};
            BuildingManager.nextId = data.nextBuildingId || 1;

            for (const bd of data.buildings) {
                const building = {
                    id: bd.id,
                    type: bd.type,
                    x: bd.x,
                    y: bd.y,
                    level: bd.level,
                    hp: bd.hp,
                    maxHp: bd.maxHp,
                    building: false,
                    timerId: null,
                    storedResource: bd.storedResource || 0,
                    lastCollect: Date.now()
                };

                // Offline vaqtda ishlab chiqarilgan resursni hisoblash
                if (data.timestamp && bd.lastCollect) {
                    const bData = BUILDING_DATA[bd.type];
                    if (bData) {
                        const lv = bData.levels[bd.level];
                        if (lv && lv.production) {
                            const offlineSeconds = (Date.now() - data.timestamp) / 1000;
                            const offlineMinutes = offlineSeconds / 60;
                            const produced = lv.production * offlineMinutes;
                            building.storedResource += produced;
                        }
                    }
                }

                BuildingManager.buildings[bd.id] = building;
                const bData = BUILDING_DATA[bd.type];
                if (bData) {
                    Grid.occupy(bd.x, bd.y, bData.size[0], bData.size[1], bd.id);
                }
            }

            // Armiya
            if (data.army) {
                TroopManager.army = data.army;
                TroopManager.totalTroops = TroopManager.getTotal();
            }

            return true;
        } catch (e) {
            console.error('Yuklashda xato:', e);
            return false;
        }
    },

    // Binolarni serializatsiya qilish
    _serializeBuildings() {
        const result = [];
        for (const b of Object.values(BuildingManager.buildings)) {
            result.push({
                id: b.id,
                type: b.type,
                x: b.x,
                y: b.y,
                level: b.level,
                hp: b.hp,
                maxHp: b.maxHp,
                storedResource: b.storedResource || 0,
                lastCollect: b.lastCollect
            });
        }
        return result;
    },

    // Saqlangan ma'lumot bormi?
    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    // Saqlangan ma'lumotni o'chirish
    deleteSave() {
        localStorage.removeItem(this.SAVE_KEY);
    },

    // Auto-save boshlash
    startAutoSave() {
        this._autoSaveTimer = setInterval(() => {
            this.save();
        }, this.AUTO_SAVE_INTERVAL);
    },

    // Auto-save to'xtatish
    stopAutoSave() {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
    },

    // Oxirgi saqlangan vaqt
    getLastSaveTime() {
        try {
            const raw = localStorage.getItem(this.SAVE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            return data.timestamp || null;
        } catch (e) {
            return null;
        }
    }
};
