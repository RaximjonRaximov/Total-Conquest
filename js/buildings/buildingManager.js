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

    // ── Undo/Redo tizimi (CoC-style base builder) ─────────────────────────
    _undoStack: [],    // [{action:'move', id, fromX, fromY, toX, toY}]
    _redoStack: [],
    _MAX_UNDO: 20,

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

        // Quruvchi uyi — maxsus narx tizimi (BuilderSystem.builderCosts ishlatadi)
        if (bd.isBuilderHut) {
            const currentHuts = this.countType('builderHut');
            const existingTotal = typeof BuilderSystem !== 'undefined' ? BuilderSystem.totalBuilders : 1;
            // Agar hut soni allaqachon oldindan sotib olingan quruvchilardan kam bo'lsa — bepul qo'yish
            const isVisualizingExisting = currentHuts < existingTotal;
            const nextIdx = isVisualizingExisting ? -1 : currentHuts; // -1 = bepul
            const hutCost = (!isVisualizingExisting && typeof BuilderSystem !== 'undefined')
                ? (BuilderSystem.builderCosts[nextIdx] || 0)
                : 0;
            if (hutCost > 0) {
                if ((Resources.diamond || 0) < hutCost) {
                    Toast.show(`💎 ${hutCost} olmos kerak!`, 'error');
                    return null;
                }
                Resources.spend('diamond', hutCost);
            }
            // BuilderSystem ni sinx qilish — faqat yangi quruvchi sotib olinayotgan bo'lsa
            if (typeof BuilderSystem !== 'undefined' && !isVisualizingExisting) {
                BuilderSystem.totalBuilders = currentHuts + 1;
                BuilderSystem.updateDisplay();
            }
        } else if (levelData.cost && Object.keys(levelData.cost).length > 0) {
            const costMult = typeof ResearchSystem !== 'undefined' ? ResearchSystem.getBuildCostMultiplier() : 1;
            const effectiveCost = costMult < 1
                ? Object.fromEntries(Object.entries(levelData.cost).map(([r, a]) => [r, Math.max(1, Math.floor(a * costMult))]))
                : levelData.cost;
            if (!Resources.canAfford(effectiveCost)) {
                const missingDiamonds = Resources.getMissingCostInDiamonds(effectiveCost);
                if (Resources.diamond >= missingDiamonds) {
                    // Native confirm() ni GemConfirm/custom modal bilan almashtirish
                    this._gemConfirmForPlace(type, gridX, gridY, effectiveCost, missingDiamonds, bd);
                    return null;
                } else {
                    Toast.show("Resurs va olmos yetarli emas!", "error");
                    return null;
                }
            } else {
                Resources.spendMultiple(effectiveCost);
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
            let buildTimeMult = typeof ResearchSystem !== 'undefined' ? ResearchSystem.getBuildTimeMultiplier() : 1;
            // Shop build speed boost (2x qurilish)
            if (BuildingManager._buildBoostUntil && BuildingManager._buildBoostUntil > Date.now()) {
                buildTimeMult *= 0.5;
            }
            // Magic Item: Builder Potion (10x tezlashuv)
            if (typeof MagicItems !== 'undefined' && MagicItems.isBuilderPotionActive()) {
                buildTimeMult *= 0.1;
            }
            building.timerId = timerManager.add(
                Math.max(1, Math.floor(levelData.time * buildTimeMult)),
                () => {
                    building.building = false;
                    building.timerId = null;
                    BuilderSystem.freeBuilder();
                    // XP mukofoti
                    const xp = XPSystem.getBuildXP(type, 1);
                    XPSystem.addXP(xp);
                    // Qurilish tugadi animatsiyasi
                    if (typeof BuildingCompleteAnim !== 'undefined') {
                        const _bd = BUILDING_DATA[type];
                        BuildingCompleteAnim.play(gridX, gridY, _bd?.icon || '🏗️', _bd?.name || type, 1, xp);
                    }
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
        if (typeof Game !== 'undefined') Game.markRenderDirty();

        // Agar cityHall bo'lsa, TH darajasini yangilash
        if (type === 'cityHall') {
            Game.townHallLevel = building.level;
            Resources.updateDisplay();
        }

        // Yutuqlar
        if (typeof AchievementSystem !== 'undefined') {
            AchievementSystem.track('buildCount');
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
        if (typeof Game !== 'undefined') Game.markRenderDirty();
        // Smoke state ni tozalash
        if (typeof BuildingRenderer !== 'undefined' && BuildingRenderer._smokeState) {
            delete BuildingRenderer._smokeState[id];
        }
        // Quruvchi uyi o'chirilsa BuilderSystem yangilash
        if (b.type === 'builderHut' && typeof BuilderSystem !== 'undefined') {
            const remaining = this.countType('builderHut');  // already deleted above
            BuilderSystem.totalBuilders = Math.max(1, remaining);
            // Band quruvchilar sonini ham kamaytirish (agar kerak bo'lsa)
            if (BuilderSystem.busyBuilders > BuilderSystem.totalBuilders) {
                BuilderSystem.busyBuilders = BuilderSystem.totalBuilders;
            }
            BuilderSystem.updateDisplay();
        }
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

        // Undo stack ga yozish (faqat haraqat bo'lsa)
        if (this.dragOrigX !== nx || this.dragOrigY !== ny) {
            this._undoStack.push({ action: 'move', id: b.id, fromX: this.dragOrigX, fromY: this.dragOrigY, toX: nx, toY: ny });
            if (this._undoStack.length > this._MAX_UNDO) this._undoStack.shift();
            this._redoStack = []; // Yangi harakat — redo stack tozalanadi
        }

        this.dragging = false;
        this.dragBuildingId = null;
        if (typeof Game !== 'undefined') { Game.markRenderDirty(); MapRenderer.markTilesDirty(); }
        this._notifyUndoUI();
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

    // ── Undo: oxirgi bino harakatini bekor qilish ─────────────────────────
    undo() {
        if (this._undoStack.length === 0) { Toast.show('Bekor qilish yo\'q', 'info'); return; }
        if (this.dragging) return; // Drag davomida undo ta'qiqlanadi

        const op = this._undoStack.pop();
        const b  = this.buildings[op.id];
        if (!b) return; // Bino o'chirilgan bo'lishi mumkin

        const bd = BUILDING_DATA[b.type];
        // Hozirgi joyni bo'shatish
        Grid.free(b.x, b.y, bd.size[0], bd.size[1]);
        // Oldingi joyga qaytarish
        b.x = op.fromX; b.y = op.fromY;
        Grid.occupy(op.fromX, op.fromY, bd.size[0], bd.size[1], b.id);

        // Redo stack ga qo'shish
        this._redoStack.push(op);

        if (typeof Game !== 'undefined') { Game.markRenderDirty(); MapRenderer.markTilesDirty(); }
        this._notifyUndoUI();
        Toast.show('↩ Bekor qilindi', 'info');
    },

    // ── Redo: bekor qilingan harakatni qaytarish ─────────────────────────
    redo() {
        if (this._redoStack.length === 0) { Toast.show('Qaytarish yo\'q', 'info'); return; }
        if (this.dragging) return;

        const op = this._redoStack.pop();
        const b  = this.buildings[op.id];
        if (!b) return;

        const bd = BUILDING_DATA[b.type];
        Grid.free(b.x, b.y, bd.size[0], bd.size[1]);
        b.x = op.toX; b.y = op.toY;
        Grid.occupy(op.toX, op.toY, bd.size[0], bd.size[1], b.id);

        this._undoStack.push(op);
        if (this._undoStack.length > this._MAX_UNDO) this._undoStack.shift();

        if (typeof Game !== 'undefined') { Game.markRenderDirty(); MapRenderer.markTilesDirty(); }
        this._notifyUndoUI();
        Toast.show('↪ Qaytarildi', 'info');
    },

    // UI ni yangilash (undo tugmasi ko'rinishi)
    _notifyUndoUI() {
        const bar     = document.getElementById('bm-undo-bar');
        const undoBtn = document.getElementById('bm-undo-btn');
        const redoBtn = document.getElementById('bm-redo-btn');

        // Attack rejimida bar yashiriladi
        const inAttack = typeof Game !== 'undefined' && Game.mode === 'attack';
        if (bar) bar.style.display = inAttack ? 'none' : 'flex';

        if (undoBtn) {
            const hasUndo = this._undoStack.length > 0;
            undoBtn.disabled = !hasUndo;
            undoBtn.style.opacity = hasUndo ? '1' : '0.35';
            undoBtn.style.cursor  = hasUndo ? 'pointer' : 'default';
        }
        if (redoBtn) {
            const hasRedo = this._redoStack.length > 0;
            redoBtn.disabled = !hasRedo;
            redoBtn.style.opacity = hasRedo ? '1' : '0.35';
            redoBtn.style.cursor  = hasRedo ? 'pointer' : 'default';
        }
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

        const upgCostMult = typeof ResearchSystem !== 'undefined' ? ResearchSystem.getBuildCostMultiplier() : 1;
        const effectiveUpgCost = upgCostMult < 1
            ? Object.fromEntries(Object.entries(levelData.cost).map(([r, a]) => [r, Math.max(1, Math.floor(a * upgCostMult))]))
            : levelData.cost;
        if (!Resources.canAfford(effectiveUpgCost)) {
            const missingDiamonds = Resources.getMissingCostInDiamonds(effectiveUpgCost);
            if (Resources.diamond >= missingDiamonds) {
                // Native confirm() ni GemConfirm/custom modal bilan almashtirish
                this._gemConfirmForUpgrade(id, effectiveUpgCost, missingDiamonds, bd, nextLevel);
                return false;
            } else {
                Toast.show("Resurs va olmos yetarli emas!", "error");
                return false;
            }
        } else {
            Resources.spendMultiple(effectiveUpgCost);
        }

        BuilderSystem.assignBuilder();
        b.building = true;
        let upgTimeMult = typeof ResearchSystem !== 'undefined' ? ResearchSystem.getBuildTimeMultiplier() : 1;
        // Shop build speed boost (2x qurilish)
        if (BuildingManager._buildBoostUntil && BuildingManager._buildBoostUntil > Date.now()) {
            upgTimeMult *= 0.5;
        }
        // Magic Item: Builder Potion (10x tezlashuv)
        if (typeof MagicItems !== 'undefined' && MagicItems.isBuilderPotionActive()) {
            upgTimeMult *= 0.1;
        }
        b.timerId = timerManager.add(
            Math.max(1, Math.floor(levelData.time * upgTimeMult)),
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

                // Upgrade tugallandi bildirishnoma
                const bd2 = BUILDING_DATA[b.type];
                Toast.show(`✅ ${bd2.icon} ${bd2.name} Lvl ${nextLevel} qurildi! (+${xp} XP)`, 'success', 2500);
                if (typeof AudioManager !== 'undefined') AudioManager.playBuild?.();

                // Glow effekti — upgrade tugaganda qisqa vaqt uchun yashil glow
                b._upgradeGlow = Date.now() + 2000; // 2 soniya davom etadi

                // CoC-style placement bounce — bino qurilishi tugaganda pastdan sakrash
                b._placeBounce = Date.now();

                // Qurilish tugadi animatsiyasi
                if (typeof BuildingCompleteAnim !== 'undefined') {
                    BuildingCompleteAnim.play(b.x, b.y, bd2.icon || '🏗️', bd2.name, nextLevel, xp);
                }

                if (typeof NotificationSystem !== 'undefined') {
                    NotificationSystem.add('build', `${bd2.name} tayyor!`, `Lvl ${nextLevel} qurildi. +${xp} XP`, bd2.icon);
                }

                // Yutuqlar
                if (typeof DailyMissions !== 'undefined') DailyMissions.track('upgrade', 1);
                if (typeof AchievementSystem !== 'undefined') {
                    AchievementSystem.track('upgradeCount');
                    if (nextLevel === 1) AchievementSystem.track('buildCount');
                    if (b.type === 'cityHall') AchievementSystem.set('thLevel', b.level);
                }

                if (b.type === 'cityHall') {
                    Game.townHallLevel = b.level;
                    Resources.updateDisplay();
                    const thEl = document.getElementById('th-display');
                    if (thEl) thEl.textContent = 'Town Hall: Lvl ' + b.level;
                    BuildingManager._showUnlockedBuildings(b.level);
                    // TH ko'tarilish confetti banner
                    BuildingManager._showTHLevelUp(b.level);
                    // Backend bilan sinxronlash
                    if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                        Api._request('PATCH', '/village/me/th', { th_level: b.level })
                           .catch(() => {});
                    }
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
                BuildingManager._showUnlockedBuildings(b.level);
            }
            Toast.show(`💎 ${bd.icon} ${bd.name} darhol yangilandi! (-${totalDiamonds} olmos)`, 'success');
            AudioManager.playClick();
            if (typeof DailyMissions !== 'undefined') DailyMissions.track('upgrade', 1);
            if (typeof AchievementSystem !== 'undefined') {
                AchievementSystem.track('upgradeCount');
                if (b.type === 'cityHall') AchievementSystem.set('thLevel', b.level);
            }
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

    // Ta'mirlash — HP ni to'ldirish (oltin evaziga)
    repair(id) {
        const b = this.buildings[id];
        if (!b || b.building) return false;
        if (b.hp >= b.maxHp) return false;

        const missingHpPct = 1 - b.hp / b.maxHp;
        const bd = BUILDING_DATA[b.type];
        const lv = bd.levels[b.level];
        const baseCost = (lv.cost?.gold || 100);
        const repairCost = Math.max(10, Math.floor(baseCost * missingHpPct * 0.25));

        if (!Resources.spend('gold', repairCost)) {
            Toast.show('Ta\'mirlash uchun oltin yetarli emas!', 'warn');
            return false;
        }

        b.hp = b.maxHp;
        AudioManager.playClick();
        Toast.show(`🔧 ${bd.icon} ${bd.name} ta'mirlandi! (-🪙${repairCost})`, 'success');
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

    // Resurs ishlab chiqarishni yangilash — har 250ms dan keyin (har frame emas)
    _lastProductionUpdate: 0,
    updateProduction() {
        const now = Date.now();
        if (now - this._lastProductionUpdate < 250) return;
        this._lastProductionUpdate = now;

        for (const b of Object.values(this.buildings)) {
            if (b.building) continue;

            const bd = BUILDING_DATA[b.type];
            const lv = bd.levels[b.level];

            // Gem Mine — olmos ishlab chiqarish (alohida kanal: storedDiamond)
            if (b.type === 'gemMine' && lv && lv.diamondPerHour) {
                const elapsed = (now - b.lastCollect) / 1000;
                if (elapsed >= 1) {
                    const produced = lv.diamondPerHour * elapsed / 3600; // per second
                    const capacity = lv.capacity || 12;
                    b.storedDiamond = Math.min(capacity, (b.storedDiamond || 0) + produced);
                    b.lastCollect = now;
                }
                continue;
            }

            if (!lv || !lv.production) continue;

            const elapsed = (now - b.lastCollect) / 1000;
            if (elapsed < 1) continue; // At kamida 1 sekund o'tgan bo'lsin

            let prodMult = 1;
            if (typeof PrestigeSystem !== 'undefined') {
                if (b.type === 'villa' || b.type === 'treeOfLife') prodMult = PrestigeSystem.getGoldProdMult();
                else if (b.type === 'farm') prodMult = PrestigeSystem.getFoodProdMult();
            }
            // Per-building boost (2x ishlab chiqarish — infoPanel dan)
            if (b._boostUntil && b._boostUntil > now) {
                prodMult *= 2;
            } else if (b._boostUntil && b._boostUntil <= now) {
                b._boostUntil = 0; // Boost tugadi
            }
            // Global resource boost (shop dan)
            if (BuildingManager._resBoostUntil && BuildingManager._resBoostUntil > now) {
                prodMult *= 2;
            } else if (BuildingManager._resBoostUntil && BuildingManager._resBoostUntil <= now) {
                BuildingManager._resBoostUntil = 0;
            }
            const produced = lv.production * prodMult * elapsed / 60; // per minute
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
        if (!b || b.building) return 0;

        // Gem Mine — alohida kanal
        if (b.type === 'gemMine') {
            const amount = Math.floor(b.storedDiamond || 0);
            if (amount < 1) return 0;
            b.storedDiamond -= amount;
            Resources.add('diamond', amount);
            // Fly animatsiyasi
            if (typeof ResourceFlyAnim !== 'undefined') {
                const bd = BUILDING_DATA[b.type];
                if (bd) {
                    const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
                    ResourceFlyAnim.play(fp.cx, fp.top.y, 'diamond', amount);
                }
            }
            if (typeof AchievementSystem !== 'undefined') AchievementSystem.track('collectCount');
            if (typeof DailyMissions !== 'undefined') DailyMissions.track('collectMine', 1);
            return amount;
        }

        if (b.storedResource < 1) return 0;

        const amount = Math.floor(b.storedResource);
        b.storedResource -= amount;

        let resType = null;
        if (b.type === 'villa') {
            Resources.add('gold', amount);
            if (typeof DailyMissions !== 'undefined') DailyMissions.track('gold', amount);
            resType = 'gold';
        } else if (b.type === 'farm') {
            Resources.add('food', amount);
            if (typeof DailyMissions !== 'undefined') DailyMissions.track('food', amount);
            resType = 'food';
        } else if (b.type === 'treeOfLife') {
            Resources.add('goldenApple', amount);
            resType = 'goldenApple';
        }

        // Fly-to-HUD animatsiyasi
        if (resType && typeof ResourceFlyAnim !== 'undefined') {
            const bd = BUILDING_DATA[b.type];
            if (bd) {
                const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
                ResourceFlyAnim.play(fp.cx, fp.top.y, resType, amount);
            }
        }

        if (typeof AchievementSystem !== 'undefined') AchievementSystem.track('collectCount');
        return amount;
    },

    // Boshlang'ich binolarni joylashtirish — CoC-style keng qishloq
    placeStarterBuildings() {
        // Grid markazi: cx=21, cy=21 (Grid.SIZE=44 uchun)
        const cx = Math.floor(Grid.SIZE / 2) - 1;
        const cy = Math.floor(Grid.SIZE / 2) - 1;

        // ── City Hall (3×3) — markazda ──────────────────────────────────────
        const chLv = BUILDING_DATA.cityHall?.levels?.[1] || {};
        const ch = {
            id: this.nextId++,
            type: 'cityHall',
            x: cx, y: cy,
            level: 1,
            hp: chLv.hp || 500, maxHp: chLv.hp || 500,
            building: false,
            timerId: null,
            storedResource: 0,
            lastCollect: Date.now()
        };
        this.buildings[ch.id] = ch;
        Grid.occupy(cx, cy, 3, 3, ch.id);
        Game.townHallLevel = 1;

        // ── Yuqori satr (CH dan 3 qator yuqori) ────────────────────────────
        // [goldStorage][     ][villa ][farm  ][      ][foodStorage]
        this._placeStarter('goldStorage', cx - 4, cy - 4);   // chap-yuqori
        this._placeStarter('villa',       cx - 1, cy - 3);   // CH ustida-chap
        this._placeStarter('farm',        cx + 2, cy - 3);   // CH ustida-o'ng
        this._placeStarter('foodStorage', cx + 4, cy - 4);   // o'ng-yuqori

        // ── O'rta satr (CH bilan bir qatorda) ───────────────────────────────
        // [villa]  ← CH →  [farm]
        this._placeStarter('villa', cx - 4, cy);              // CH chapida
        this._placeStarter('farm',  cx + 4, cy);              // CH o'ngida

        // ── Pastki satr (CH dan 3 qator past) ──────────────────────────────
        // [goldStorage2] [barracks 3×3] [musterGround 3×3] [foodStorage2]
        this._placeStarter('goldStorage',  cx - 5, cy + 4);  // chap-past
        this._placeStarter('barracks',     cx - 1, cy + 5);  // kazarma (3×3)
        this._placeStarter('musterGround', cx + 3, cy + 5);  // yig'ilish maydoni (3×3)
        this._placeStarter('foodStorage',  cx + 7, cy + 4);  // o'ng-past

        // ── Quruvchi uyi (CoC-style: har quruvchi = 1 hut map da) ─────────────
        this._placeStarter('builderHut', cx + 7, cy - 2);   // TH o'ng-yuqori
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
        // Quruvchi uyi starter'i — BuilderSystem sinx
        if (type === 'builderHut' && typeof BuilderSystem !== 'undefined') {
            const hutCount = this.countType('builderHut');
            if (hutCount > BuilderSystem.totalBuilders) {
                BuilderSystem.totalBuilders = hutCount;
            }
        }
    },

    _showUnlockedBuildings(thLevel) {
        const unlocked = Object.entries(BUILDING_DATA)
            .filter(([type, bd]) => bd.thRequired === thLevel && type !== 'cityHall')
            .map(([, bd]) => `${bd.icon} ${bd.name}`);

        Toast.show(`🏛️ Town Hall Lvl ${thLevel} tayyor!`, 'success', 2500);

        if (!unlocked.length) return;

        // Delay slightly so TH toast shows first
        setTimeout(() => {
            const existing = document.getElementById('th-unlock-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'th-unlock-modal';
            modal.style.cssText = `
                position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                background:linear-gradient(160deg,#1a1200,#2a1e00);
                border:2px solid #ffd700;border-radius:14px;
                padding:18px 22px;z-index:99999;min-width:240px;max-width:320px;
                box-shadow:0 0 40px rgba(255,215,0,0.25);
                animation:thUnlockPop 0.35s cubic-bezier(.175,.885,.32,1.275) both;
            `;
            modal.innerHTML = `
                <div style="text-align:center;font-size:22px;margin-bottom:4px;">🏛️</div>
                <div style="text-align:center;font-size:15px;font-weight:bold;color:#ffd700;margin-bottom:10px;">
                    Town Hall ${thLevel} — Yangi binolar!
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
                    ${unlocked.map(name => `
                        <div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);
                                    border-radius:8px;padding:7px 10px;font-size:13px;color:#fff;">
                            ${name}
                        </div>`).join('')}
                </div>
                <button onclick="document.getElementById('th-unlock-modal').remove()"
                        style="width:100%;padding:8px;background:linear-gradient(to bottom,#d4af37,#b8860b);
                               border:none;border-radius:8px;color:#000;font-weight:bold;font-size:13px;cursor:pointer;">
                    Ajoyib! 🎉
                </button>
            `;
            document.body.appendChild(modal);

            // Auto-close after 10s
            setTimeout(() => modal.remove(), 10000);
        }, 2600);
    },

    // ── Gem Confirm modali: bino qo'yish ────────────────────────────────────
    _gemConfirmForPlace(type, gridX, gridY, cost, missingDiamonds, bd) {
        const _doPlace = () => {
            const lv = bd.levels[1];
            if (!lv) return;
            if (lv.time > 0 && !BuilderSystem.hasFreeBuilder()) {
                Toast.show("Quruvchi band!", "warning");
                return;
            }
            // spendMissingWithDiamonds to'liq to'laydi — keyin place() ni chaqirmaslik kerak
            // (double-spend oldini olish uchun _doPlaceCore ishlatiladi)
            Resources.spendMissingWithDiamonds(cost, missingDiamonds);
            BuildingManager._doPlaceCore(type, gridX, gridY, bd, lv);
        };
        this._showGemSpendModal(
            `${bd.icon || '🏗️'} ${bd.name} qurishni boshlash`,
            missingDiamonds,
            _doPlace
        );
    },

    // Resurs tekshiruvsiz bino qo'yish (gem confirm callback uchun)
    _doPlaceCore(type, gridX, gridY, bd, levelData) {
        const w = bd.size[0], h = bd.size[1];
        if (!Grid.isFree(gridX, gridY, w, h)) return null;
        if (gridX + w > Grid.SIZE || gridY + h > Grid.SIZE) return null;

        const id = this.nextId++;
        const building = {
            id, type, x: gridX, y: gridY, level: 1,
            hp: levelData.hp, maxHp: levelData.hp,
            building: levelData.time > 0,
            timerId: null, storedResource: 0, lastCollect: Date.now()
        };
        if (levelData.time > 0) {
            BuilderSystem.assignBuilder();
            let mult = typeof ResearchSystem !== 'undefined' ? ResearchSystem.getBuildTimeMultiplier() : 1;
            if (this._buildBoostUntil && this._buildBoostUntil > Date.now()) mult *= 0.5;
            if (typeof MagicItems !== 'undefined' && MagicItems.isBuilderPotionActive()) mult *= 0.1;
            building.timerId = timerManager.add(
                Math.max(1, Math.floor(levelData.time * mult)),
                () => {
                    building.building = false; building.timerId = null;
                    BuilderSystem.freeBuilder();
                    const xp = XPSystem.getBuildXP(type, 1);
                    XPSystem.addXP(xp);
                    if (typeof BuildingCompleteAnim !== 'undefined')
                        BuildingCompleteAnim.play(gridX, gridY, bd.icon || '🏗️', bd.name, 1, xp);
                }, null, { buildingId: id }
            );
        } else {
            building.building = false;
            XPSystem.addXP(1);
        }
        this.buildings[id] = building;
        Grid.occupy(gridX, gridY, w, h, id);
        if (type === 'cityHall') { Game.townHallLevel = 1; Resources.updateDisplay(); }
        if (typeof AchievementSystem !== 'undefined') AchievementSystem.track('buildCount');
        if (typeof Game !== 'undefined') Game.markRenderDirty();
        return building;
    },

    // ── Gem Confirm modali: bino upgrade ────────────────────────────────────
    _gemConfirmForUpgrade(id, cost, missingDiamonds, bd, nextLevel) {
        const _doUpgrade = () => {
            const b = BuildingManager.buildings[id];
            if (!b || b.building) return;
            if (!BuilderSystem.hasFreeBuilder()) {
                Toast.show("Quruvchi band!", "warning");
                return;
            }
            Resources.spendMissingWithDiamonds(cost, missingDiamonds);
            BuildingManager._doUpgradeCore(b, bd, nextLevel);
        };
        this._showGemSpendModal(
            `${bd.icon || '🏗️'} ${bd.name} Lvl ${nextLevel}`,
            missingDiamonds,
            _doUpgrade
        );
    },

    // Resurs tekshiruvsiz bino upgrade (gem confirm callback uchun)
    _doUpgradeCore(b, bd, nextLevel) {
        const levelData = bd.levels[nextLevel];
        if (!levelData) return false;
        BuilderSystem.assignBuilder();
        b.building = true;
        let mult = typeof ResearchSystem !== 'undefined' ? ResearchSystem.getBuildTimeMultiplier() : 1;
        if (this._buildBoostUntil && this._buildBoostUntil > Date.now()) mult *= 0.5;
        if (typeof MagicItems !== 'undefined' && MagicItems.isBuilderPotionActive()) mult *= 0.1;
        b.timerId = timerManager.add(
            Math.max(1, Math.floor(levelData.time * mult)),
            () => {
                b.level = nextLevel; b.maxHp = levelData.hp; b.hp = levelData.hp;
                b.building = false; b.timerId = null;
                BuilderSystem.freeBuilder();
                const xp = XPSystem.getBuildXP(b.type, nextLevel);
                XPSystem.addXP(xp);
                Toast.show(`✅ ${bd.icon} ${bd.name} Lvl ${nextLevel} qurildi! (+${xp} XP)`, 'success', 2500);
                if (typeof AudioManager !== 'undefined') AudioManager.playBuild?.();
                b._upgradeGlow = Date.now() + 2000; b._placeBounce = Date.now();
                if (typeof BuildingCompleteAnim !== 'undefined')
                    BuildingCompleteAnim.play(b.x, b.y, bd.icon || '🏗️', bd.name, nextLevel, xp);
                if (typeof NotificationSystem !== 'undefined')
                    NotificationSystem.add('build', `${bd.name} tayyor!`, `Lvl ${nextLevel} qurildi. +${xp} XP`, bd.icon);
                if (typeof DailyMissions !== 'undefined') DailyMissions.track('upgrade', 1);
                if (typeof AchievementSystem !== 'undefined') {
                    AchievementSystem.track('upgradeCount');
                    if (b.type === 'cityHall') AchievementSystem.set('thLevel', b.level);
                }
                if (b.type === 'cityHall') {
                    Game.townHallLevel = b.level; Resources.updateDisplay();
                    const thEl = document.getElementById('th-display');
                    if (thEl) thEl.textContent = 'Town Hall: Lvl ' + b.level;
                    BuildingManager._showUnlockedBuildings(b.level);
                    BuildingManager._showTHLevelUp(b.level);
                    if (typeof Api !== 'undefined' && Api.isLoggedIn())
                        Api._request('PATCH', '/village/me/th', { th_level: b.level }).catch(() => {});
                }
            }, null, { buildingId: b.id }
        );
        return true;
    },

    // ── Umumiy olmos sarflash modali ─────────────────────────────────────────
    _showGemSpendModal(titleText, gemCost, onConfirm) {
        if (typeof GemConfirm !== 'undefined') {
            GemConfirm.show({
                gemCost,
                title: titleText,
                icon: '💎',
                timeLabel: `${gemCost} olmos sarf bo'ladi`,
                onConfirm
            });
            return;
        }
        // GemConfirm mavjud emas — custom modal
        document.getElementById('_bm-gem-modal')?.remove();
        const ov = document.createElement('div');
        ov.id = '_bm-gem-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);
            z-index:100020;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a1520);
                        border:2px solid rgba(33,150,243,0.45);border-radius:16px;
                        padding:22px 24px;width:min(290px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(33,150,243,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:36px;margin-bottom:8px;">💎</div>
                <div style="font-size:13px;font-weight:800;color:#64b5f6;margin-bottom:8px;">Olmos sarflash</div>
                <div style="font-size:12px;color:#ccc;margin-bottom:4px;">${titleText}</div>
                <div style="font-size:11px;color:#aaa;margin-bottom:18px;">
                    <span style="color:#90caf9;font-weight:700;">💎 ${gemCost}</span> olmos sarf bo'ladi
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_bm-gem-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_bm-gem-confirm"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,#1e88e5,#1565c0);
                                   border:none;border-radius:9px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">
                        💎 To'lash</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_bm-gem-confirm').onclick = () => {
            ov.remove();
            onConfirm();
        };
    },

    _showTHLevelUp(level) {
        // Confetti burst — DOM elementlar bilan
        const colors = ['#ffd700','#ff5252','#69f0ae','#40c4ff','#ce93d8','#ff9800'];
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:88888;overflow:hidden;';
        document.body.appendChild(container);

        for (let i = 0; i < 60; i++) {
            const c = document.createElement('div');
            const color = colors[i % colors.length];
            const size = 6 + Math.random() * 8;
            const startX = 20 + Math.random() * 60; // %
            c.style.cssText = `
                position:absolute; top:-${size}px; left:${startX}%;
                width:${size}px; height:${size * (0.4 + Math.random() * 0.8)}px;
                background:${color}; border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
                animation:confettiFall ${1.2 + Math.random() * 1.4}s ${Math.random() * 0.8}s ease-in forwards;
                transform:rotate(${Math.random() * 360}deg);
            `;
            container.appendChild(c);
        }
        setTimeout(() => container.remove(), 3000);
    }
};
