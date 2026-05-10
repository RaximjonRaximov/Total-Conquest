// ============================================
// ASOSIY GAME CLASS - O'yin boshqaruvchisi
// ============================================

const Game = {
    mode: 'home', // 'home' | 'attack'
    townHallLevel: 1,
    canvas: null,
    ctx: null,
    running: false,
    lastTimestamp: 0,       // Real delta time uchun
    lastInfoUpdate: 0,
    lastArmyUpdate: 0,
    lastBattleUpdate: 0,
    gameSpeed: 1,           // 1 = normal, 2 = 2x (jang rejimi)

    init(preloaded = false) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Toast tizimini ishga tushirish
        Toast.init();
        AudioManager.init();

        // Tizimlarni ishga tushirish
        Grid.init();
        MapRenderer.init(this.canvas);
        MapRenderer.resize();
        // Minimap.init() — eski flat-grid minimap o'chirildi, MiniMap (isometrik) ishlatiladi

        // Saqlangan o'yin bormi?
        // preloaded=true bo'lsa — backend allaqachon yukladi
        const loaded = preloaded || SaveSystem.load();
        if (loaded) {
            Toast.show('O\'yin yuklandi! Xush kelibsiz!', 'info');
        } else {
            // Boshlang'ich binolar
            BuildingManager.placeStarterBuildings();
            // Boshlang'ich to'siqlar
            ObstacleManager.placeInitialObstacles();
        }

        // ── Village Intro Camera Sweep — o'yin yuklanganda panorama (CoC-style) ─
        // Avval TH/Praetorium topiladi, keyin zoom-out dan TH ga tween
        {
            const thBuilding = Object.values(BuildingManager.buildings)
                .find(b => b.type === 'cityHall' || b.type === 'praetorium');
            const cx = thBuilding ? thBuilding.x + 1 : Grid.SIZE / 2;
            const cy = thBuilding ? thBuilding.y + 1 : Grid.SIZE / 2;
            // Uzoqdan boshlash
            Camera.centerOn(cx + 8, cy + 8);
            Camera.zoom = 0.38;
            Camera.targetZoom = 0.38;
            // TH ga smooth tween
            Camera.tweenTo(cx, cy, 1.05, 1200);
        }

        // Inputni sozlash
        Input.setup(this.canvas);

        // Resize
        window.addEventListener('resize', () => {
            MapRenderer.resize();
        });

        // HUD tugmalarini ulash
        this._setupButtons();

        // Resurslarni ko'rsatish
        Resources.updateDisplay(true); // snap — animatsiya yo'q, hozirgi qiymat
        TroopManager.updateCapacity();
        XPSystem.updateDisplay();
        BuilderSystem.init();
        document.getElementById('th-display').textContent = 'Town Hall: Lvl ' + this.townHallLevel;

        // Shield HUD
        ShieldHUD.init();
        BattleSystem.updateLeagueDisplay();

        // Yutuqlar va bildirishnomalar tizimi
        if (typeof AchievementSystem    !== 'undefined') AchievementSystem.init();
        if (typeof ThemeSystem          !== 'undefined') ThemeSystem.init();
        if (typeof NotificationSystem   !== 'undefined') NotificationSystem.init();
        if (typeof SeasonalEvents       !== 'undefined') { SeasonalEvents.init(); SeasonalEvents.updateHUD(); }

        // Prestige tizimi
        if (typeof PrestigeSystem !== 'undefined') {
            PrestigeSystem.init();
            if (!preloaded && !SaveSystem.hasSave()) PrestigeSystem._applyStartBonuses();
        }

        // Hero tizimi
        if (typeof HeroSystem !== 'undefined') {
            HeroSystem.init();
        }

        // Kunlik missiyalar
        if (typeof DailyMissions !== 'undefined') {
            DailyMissions.init();
            if (typeof MissionPanel !== 'undefined') MissionPanel.updateBadge();
        }

        // Season Pass — SaveSystem.load() dan keyin init() chaqiriladi,
        // lekin yangi o'yinda (save yo'q) init() alohida chaqirilishi kerak
        if (typeof SeasonPass !== 'undefined' && !SeasonPass._seasonStart) {
            SeasonPass.init();
        }

        // Sehrli buyumlar
        if (typeof MagicItems !== 'undefined') MagicItems.init();
        if (typeof MagicItemsPanel !== 'undefined') MagicItemsPanel.updateBadge();

        // Matchmaking pool boshlash
        if (typeof Matchmaking !== 'undefined') {
            Matchmaking.refreshPool();
            // Offline vaqtida hujum bo'ldimi?
            this._simulateOfflineDefense();
        }

        // Mini-Map
        if (typeof MiniMap !== 'undefined') MiniMap.init();

        // Builder Queue HUD
        if (typeof BuilderQueueHUD !== 'undefined') BuilderQueueHUD.init();

        // Hero Ability HUD
        if (typeof HeroAbilityHUD !== 'undefined') HeroAbilityHUD.init();

        // Auto-save boshlash
        SaveSystem.startAutoSave();

        // Offline bildirishnoma
        SaveSystem.showOfflineNotify();

        // Sahifadan chiqishda saqlash
        window.addEventListener('beforeunload', () => {
            if (BattleManager.active && BattleManager.playerBaseData) {
                BattleManager.returnHome();
            }
            SaveSystem.save();
        });

        // Tab yashirilganda loopni to'xtatish (timer spike oldini olish)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._tabHiddenAt = Date.now();
            } else {
                // Tab qaytdi — lastTimestamp ni yangilab spike'ni oldini olamiz
                this.lastTimestamp = performance.now();
                if (!this.running) {
                    this.running = true;
                    requestAnimationFrame((ts) => this.gameLoop(ts));
                }
            }
        });

        this.running = true;
        requestAnimationFrame((ts) => this.gameLoop(ts));

        // Global Chat tugmasini ko'rsatish
        setTimeout(() => {
            const gcpBtn = document.getElementById('gcp-float-btn');
            if (gcpBtn) gcpBtn.style.display = 'flex';
        }, 1000);
    },

    gameLoop(timestamp = 0) {
        if (!this.running) return;

        // === REAL DELTA TIME (hardcoded 16ms o'rniga) ===
        const rawDelta = timestamp - (this.lastTimestamp || timestamp);
        this.lastTimestamp = timestamp;
        // 50ms cap (20 FPS minimum) — tab yashirilganda spike bo'lmasligi uchun
        const delta = Math.min(rawDelta / 1000, 0.05);

        Camera.update();
        timerManager.update();

        if (this.mode === 'home') {
            BuildingManager.updateProduction();
            if (typeof HeroSystem !== 'undefined') HeroSystem.checkRegen();
        } else if (this.mode === 'attack') {
            BattleManager.update(delta * this.gameSpeed);
            if (typeof SpellSystem !== 'undefined') SpellSystem.update(delta * this.gameSpeed);
        }

        MapRenderer.renderMap();
        this._renderObjectsSorted(this.ctx);

        if (this.mode === 'attack') {
            BattleRenderer.renderAll(this.ctx);
            // Deploy panel statsini har 500ms yangilash
            const nowMs = Date.now();
            if (!this._lastDeployUpdate || nowMs - this._lastDeployUpdate > 500) {
                this._lastDeployUpdate = nowMs;
                DeployPanel.update();
            }
        }

        BuildMenu.renderGhost(this.ctx);
        BuildingRenderer.drawDragGhost(this.ctx);

        // ── Loot Cart — uy rejimida TH yonida (CoC-style) ────────────────────
        if (this.mode === 'home') {
            BuildingRenderer.drawLootCart(this.ctx);
            // ── Shield Dome — himoya qalqoni kupoli ────────────────────────────
            if (typeof BattleSystem !== 'undefined' && BattleSystem.hasShield()) {
                this._drawShieldDome(this.ctx);
            }
        }

        // Minimap.render() — eski flat-grid, MiniMap o'z RAF loop'ida render qiladi

        const coordEl = document.getElementById('coord-display');
        const mx = Input.mouse.tileX;
        const my = Input.mouse.tileY;
        if (mx >= 0 && mx < Grid.SIZE && my >= 0 && my < Grid.SIZE) {
            coordEl.textContent = `Tile: (${mx}, ${my})`;
        } else {
            coordEl.textContent = 'Tile: -';
        }

        if (BuildMenu.placing) {
            coordEl.textContent += BuildMenu.locked
                ? ' | ✅ Tasdiqlang yoki ❌ Bekor qiling'
                : ' | 👆 Joyni tanlang...';
        }
        if (BuildingManager.dragging) {
            coordEl.textContent += ' | 🔄 Ko\'chirish...';
        }

        if (this.mode === 'home') {
            const now = Date.now();
            if (now - this.lastInfoUpdate > 500) {
                this.lastInfoUpdate = now;
                InfoPanel.update();
            }
            if (now - this.lastArmyUpdate > 1000) {
                this.lastArmyUpdate = now;
                ArmyPanel.update();
                ResearchPanel.update();
                this._updateTroopCapHUD();
                this._updateCollectAllBtn();
                this._updateConstructionHUD();
                this._checkStorageOverflow();
                this._updateHUDBadges();
                // Maxsus to'siqlar spawn tekshiruvi (har daqiqada bir marta)
                if (!this._lastSpecialSpawnCheck || now - this._lastSpecialSpawnCheck > 60000) {
                    this._lastSpecialSpawnCheck = now;
                    if (typeof ObstacleManager !== 'undefined') {
                        ObstacleManager.checkSpecialSpawns();
                        ObstacleManager.checkRegularGrowth();
                    }
                }
            }
            if (now - this.lastBattleUpdate > 1000) {
                this.lastBattleUpdate = now;
                BattlePanel.update();
            }
        }

        requestAnimationFrame((ts) => this.gameLoop(ts));
    },

    _updateTroopCapHUD() {
        const current  = TroopManager.getTotal();
        const capacity = TroopManager.maxTroops ?? 0;
        const fill  = document.getElementById('troop-cap-fill');
        const label = document.getElementById('troop-cap-text');
        if (!fill || !label) return;
        const pct = capacity > 0 ? Math.min(100, Math.round(current / capacity * 100)) : 0;
        fill.style.width  = pct + '%';
        fill.style.background = pct >= 100 ? '#f44336' : pct >= 75 ? '#ff9800' : '#4caf50';
        label.textContent = `${current}/${capacity}`;

        // Training-done badge on army button (queue empty + troops available)
        const armyBtn = document.getElementById('btn-army');
        if (armyBtn) {
            let armyBadge = document.getElementById('army-train-badge');
            const allQueuesEmpty = typeof TroopManager !== 'undefined'
                && Object.values(TroopManager.queues || {}).every(q => q.length === 0);
            const hasTroops = current > 0;
            if (allQueuesEmpty && hasTroops) {
                if (!armyBadge) {
                    armyBadge = document.createElement('div');
                    armyBadge.id = 'army-train-badge';
                    armyBadge.style.cssText = `
                        position:absolute;top:-4px;right:-4px;
                        background:#4caf50;color:#fff;font-size:8px;
                        font-weight:800;border-radius:50%;
                        width:14px;height:14px;
                        display:flex;align-items:center;justify-content:center;
                        pointer-events:none;z-index:10;
                        box-shadow:0 0 6px rgba(76,175,80,0.8);
                        animation:armyReadyPulse 2s ease-in-out infinite;
                    `;
                    armyBadge.textContent = '✓';
                    armyBtn.style.position = 'relative';
                    armyBtn.appendChild(armyBadge);
                }
            } else if (armyBadge) {
                armyBadge.remove();
            }
        }

        // Army-ready badge on battle button
        const battleBtn = document.getElementById('btn-battle');
        if (battleBtn) {
            let badge = document.getElementById('army-ready-badge');
            if (pct >= 100 && capacity > 0) {
                if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'army-ready-badge';
                    badge.style.cssText = `
                        position:absolute;top:-5px;right:-5px;
                        background:linear-gradient(135deg,#e53935,#ff5722);
                        color:#fff;font-size:8px;font-weight:800;
                        border-radius:10px;padding:2px 5px;
                        white-space:nowrap;pointer-events:none;
                        animation:armyReadyPulse 1.2s ease-in-out infinite;
                        box-shadow:0 0 8px rgba(255,87,34,0.7);
                        letter-spacing:0.3px;z-index:10;
                    `;
                    badge.textContent = '⚔️ TAYYOR';
                    battleBtn.style.position = 'relative';
                    battleBtn.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        }
    },

    _updateCollectAllBtn() {
        const btn = document.getElementById('collect-all-btn');
        if (!btn) return;

        let totalGold = 0, totalFood = 0, totalApple = 0, totalDiamond = 0;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.building) continue;
            if (b.type === 'gemMine') {
                if ((b.storedDiamond || 0) >= 1) totalDiamond += Math.floor(b.storedDiamond);
                continue;
            }
            if (b.storedResource < 1) continue;
            if (b.type === 'villa')           totalGold  += Math.floor(b.storedResource);
            else if (b.type === 'farm')       totalFood  += Math.floor(b.storedResource);
            else if (b.type === 'treeOfLife') totalApple += Math.floor(b.storedResource);
        }

        const hasResource = totalGold > 0 || totalFood > 0 || totalApple > 0 || totalDiamond > 0;
        if (!hasResource) {
            btn.style.display = 'none';
            return;
        }

        btn.style.display = 'flex';

        // Build amount preview
        const parts = [];
        if (totalGold    > 0) parts.push(`🪙${Helpers.formatNumber(totalGold)}`);
        if (totalFood    > 0) parts.push(`🍎${Helpers.formatNumber(totalFood)}`);
        if (totalApple   > 0) parts.push(`🍏${Helpers.formatNumber(totalApple)}`);
        if (totalDiamond > 0) parts.push(`💎${totalDiamond}`);

        btn.innerHTML = `
            <span style="font-size:13px;">📦</span>
            <div style="display:flex;flex-direction:column;gap:1px;align-items:flex-start;">
                <span style="font-size:9px;font-weight:800;letter-spacing:0.3px;">Yig'ish</span>
                <span style="font-size:8px;font-weight:700;color:rgba(0,0,0,0.6);">+${parts.join(' ')}</span>
            </div>
        `;
    },

    _updateConstructionHUD() {
        let hud = document.getElementById('construction-hud');
        const building = Object.values(BuildingManager.buildings)
            .filter(b => b.building && b.timerId);

        if (building.length === 0) {
            if (hud) hud.style.display = 'none';
            return;
        }
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'construction-hud';
            hud.style.cssText = `position:fixed;top:56px;left:50%;transform:translateX(-50%);
                z-index:600;display:flex;gap:4px;flex-wrap:wrap;justify-content:center;
                max-width:280px;pointer-events:none;`;
            document.body.appendChild(hud);
        }
        hud.style.display = 'flex';
        hud.innerHTML = building.map(b => {
            const bd = BUILDING_DATA[b.type];
            const rem = timerManager.getRemaining(b.timerId);
            const prog = timerManager.getProgress(b.timerId);
            return `<div style="background:rgba(0,0,0,0.7);border:1px solid rgba(212,175,55,0.4);
                                border-radius:6px;padding:3px 7px;font-size:10px;color:#ffd700;
                                display:flex;align-items:center;gap:4px;">
                        <span>${bd.icon}</span>
                        <div style="width:36px;height:3px;background:rgba(255,255,255,0.15);border-radius:2px;">
                            <div style="width:${Math.round(prog*100)}%;height:100%;background:#d4af37;border-radius:2px;"></div>
                        </div>
                        <span>${Helpers.formatTime(rem)}</span>
                    </div>`;
        }).join('');
    },

    _updateHUDBadges() {
        // Daily reward badge (settings button)
        const settBtn = document.getElementById('btn-settings');
        if (settBtn) {
            let dailyBadge = document.getElementById('daily-reward-badge');
            const hasDaily = typeof DailyRewardPanel !== 'undefined' && !DailyRewardPanel._claimedToday;
            if (hasDaily) {
                if (!dailyBadge) {
                    dailyBadge = document.createElement('div');
                    dailyBadge.id = 'daily-reward-badge';
                    dailyBadge.style.cssText = `position:absolute;top:-4px;right:-4px;
                        background:linear-gradient(135deg,#ff6f00,#ffa000);
                        color:#fff;font-size:8px;font-weight:800;border-radius:50%;
                        width:14px;height:14px;display:flex;align-items:center;
                        justify-content:center;pointer-events:none;z-index:10;
                        box-shadow:0 0 6px rgba(255,160,0,0.7);
                        animation:armyReadyPulse 1.8s ease-in-out infinite;`;
                    dailyBadge.textContent = '!';
                    settBtn.style.position = 'relative';
                    settBtn.appendChild(dailyBadge);
                }
            } else if (dailyBadge) {
                dailyBadge.remove();
            }
        }

        // Trophy road badge (battle button) — unclaimed rewards
        const btlBtn = document.getElementById('btn-battle');
        if (btlBtn) {
            let trpBadge = document.getElementById('trp-reward-badge');
            const leagues = (typeof window !== 'undefined' && window.LEAGUES_DATA) || [];
            const trophies = typeof BattleSystem !== 'undefined' ? BattleSystem.trophies : 0;
            const claimed  = typeof BattleSystem !== 'undefined' ? (BattleSystem._claimedLeagues || []) : [];
            const hasUnclaimed = leagues.some((l, idx) => trophies >= l.min && !claimed.includes(idx)
                && (l.reward.gold > 0 || l.reward.diamond > 0 || l.reward.item));
            if (hasUnclaimed) {
                if (!trpBadge) {
                    trpBadge = document.createElement('div');
                    trpBadge.id = 'trp-reward-badge';
                    trpBadge.style.cssText = `position:absolute;top:-4px;left:-4px;
                        background:linear-gradient(135deg,#ffd700,#ff8f00);
                        color:#000;font-size:7px;font-weight:900;border-radius:50%;
                        width:14px;height:14px;display:flex;align-items:center;
                        justify-content:center;pointer-events:none;z-index:10;
                        box-shadow:0 0 6px rgba(255,215,0,0.7);`;
                    trpBadge.textContent = '🎁';
                    btlBtn.style.position = 'relative';
                    btlBtn.appendChild(trpBadge);
                }
            } else if (trpBadge) {
                trpBadge.remove();
            }
        }

        // Magic Items badge (shop button) — items in inventory
        const shopBtn = document.getElementById('btn-shop');
        if (shopBtn) {
            let itemsBadge = document.getElementById('magic-items-badge');
            const itemCount = typeof MagicItems !== 'undefined' ? MagicItems.getTotalCount() : 0;
            if (itemCount > 0) {
                if (!itemsBadge) {
                    itemsBadge = document.createElement('div');
                    itemsBadge.id = 'magic-items-badge';
                    itemsBadge.style.cssText = `position:absolute;top:-4px;right:-4px;
                        background:linear-gradient(135deg,#9c27b0,#e040fb);
                        color:#fff;font-size:8px;font-weight:800;border-radius:50%;
                        width:15px;height:15px;display:flex;align-items:center;
                        justify-content:center;pointer-events:none;z-index:10;
                        box-shadow:0 0 6px rgba(156,39,176,0.7);`;
                    shopBtn.style.position = 'relative';
                    shopBtn.appendChild(itemsBadge);
                }
                itemsBadge.textContent = itemCount > 9 ? '9+' : itemCount;
            } else if (itemsBadge) {
                itemsBadge.remove();
            }
        }

        // Daily mission completion badge (mission button)
        const missionBtn = document.getElementById('btn-missions') || document.querySelector('[onclick*="MissionPanel"]');
        if (missionBtn) {
            let missionBadge = document.getElementById('mission-complete-badge');
            const unclaimedCount = typeof DailyMissions !== 'undefined' ? DailyMissions.getUnclaimedCount() : 0;
            if (unclaimedCount > 0) {
                if (!missionBadge) {
                    missionBadge = document.createElement('div');
                    missionBadge.id = 'mission-complete-badge';
                    missionBadge.style.cssText = `position:absolute;top:-4px;right:-4px;
                        background:linear-gradient(135deg,#f44336,#e53935);
                        color:#fff;font-size:8px;font-weight:800;border-radius:50%;
                        width:15px;height:15px;display:flex;align-items:center;
                        justify-content:center;pointer-events:none;z-index:10;
                        box-shadow:0 0 6px rgba(244,67,54,0.7);
                        animation:armyReadyPulse 1.5s ease-in-out infinite;`;
                    missionBtn.style.position = 'relative';
                    missionBtn.appendChild(missionBadge);
                }
                missionBadge.textContent = unclaimedCount;
            } else if (missionBadge) {
                missionBadge.remove();
            }
        }
    },

    _checkStorageOverflow() {
        // Oltin va oziq-ovqat ombori sig'imini tekshirish
        let goldCap = 0, foodCap = 0;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.building) continue;
            const bd = BUILDING_DATA[b.type];
            const lv = bd.levels[b.level];
            if (!lv?.capacity) continue;
            if (b.type === 'goldStorage' || b.type === 'cityHall') goldCap += lv.capacity;
            if (b.type === 'foodStorage' || b.type === 'cityHall') foodCap += lv.capacity;
        }
        if (!this._lastOverflowWarn) this._lastOverflowWarn = 0;
        const now = Date.now();
        if (now - this._lastOverflowWarn < 120000) return; // max har 2 daqiqada bir marta
        if (goldCap > 0 && Resources.gold >= goldCap * 0.9) {
            this._lastOverflowWarn = now;
            Toast.show('⚠️ Oltin ombori to\'lib borayapti! Yangi ombor quring.', 'warn', 4000);
        } else if (foodCap > 0 && Resources.food >= foodCap * 0.9) {
            this._lastOverflowWarn = now;
            Toast.show('⚠️ Oziq-ovqat ombori to\'lib borayapti! Yangi ombor quring.', 'warn', 4000);
        }
    },

    collectAll() {
        let totalGold = 0, totalFood = 0, totalApple = 0, totalDiamond = 0;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.building) continue;
            // GemMine alohida kanal
            if (b.type === 'gemMine') {
                if ((b.storedDiamond || 0) >= 1) {
                    const amt = BuildingManager.collect(b.id);
                    totalDiamond += amt;
                }
                continue;
            }
            if (b.storedResource < 1) continue;
            const amount = BuildingManager.collect(b.id);
            if (amount > 0) {
                if (b.type === 'villa')       totalGold  += amount;
                else if (b.type === 'farm')   totalFood  += amount;
                else if (b.type === 'treeOfLife') totalApple += amount;
            }
        }
        const parts = [];
        if (totalGold    > 0) parts.push(`🪙 +${Helpers.formatNumber(totalGold)}`);
        if (totalFood    > 0) parts.push(`🍎 +${Helpers.formatNumber(totalFood)}`);
        if (totalApple   > 0) parts.push(`🍏 +${Helpers.formatNumber(totalApple)}`);
        if (totalDiamond > 0) parts.push(`💎 +${totalDiamond}`);
        if (parts.length > 0) {
            Toast.show(parts.join('  ') + ' yig\'ildi!', 'success', 2000);
            AudioManager.playClick?.();
        }
        this._updateCollectAllBtn();
    },

    // ── Sorted render cache — har frame da sort yo'q ─────────────────────────
    _sortedRenderCache: [],
    _sortedRenderDirty: true,
    markRenderDirty() { this._sortedRenderDirty = true; },

    // Binolar + to'siqlarni bitta depth-sorted passda chizish (painter's algorithm)
    _renderObjectsSorted(ctx) {
        const dragging    = BuildingManager.dragging;
        const dragId      = BuildingManager.dragBuildingId;
        const inBattle    = this.mode === 'attack';

        // Battle rejimida binolar tez-tez o'zgaradi — har doim qayta sort
        // Home rejimida cache ishlatiladi, faqat dirty bo'lsa qayta sort
        if (this._sortedRenderDirty || inBattle) {
            const cache = this._sortedRenderCache;
            cache.length = 0;
            const buildings = Object.values(BuildingManager.buildings);
            const obstacles = Object.values(ObstacleManager.obstacles);
            const total = buildings.length + obstacles.length;

            // Pre-alloc yoki resize
            while (cache.length < total) cache.push({ key: 0, kind: 'b', obj: null });
            let idx = 0;
            for (let i = 0; i < buildings.length; i++) {
                const b = buildings[i];
                if (dragging && b.id === dragId) continue;
                const slot = cache[idx] || (cache[idx] = {});
                slot.key = b.x + b.y;
                slot.kind = 'b';
                slot.obj = b;
                idx++;
            }
            for (let i = 0; i < obstacles.length; i++) {
                const obs = obstacles[i];
                const slot = cache[idx] || (cache[idx] = {});
                slot.key = obs.x + obs.y;
                slot.kind = 'o';
                slot.obj = obs;
                idx++;
            }
            cache.length = idx;
            // Insertion sort — nearly-sorted input uchun O(n) ya near-O(n)
            for (let i = 1; i < cache.length; i++) {
                const cur = cache[i];
                let j = i - 1;
                while (j >= 0 && cache[j].key > cur.key) {
                    cache[j + 1] = cache[j];
                    j--;
                }
                cache[j + 1] = cur;
            }
            if (!inBattle) this._sortedRenderDirty = false;
        }

        const cache = this._sortedRenderCache;
        for (let i = 0; i < cache.length; i++) {
            const item = cache[i];
            if (item.kind === 'b') BuildingRenderer.drawBuilding(ctx, item.obj);
            else ObstacleRenderer.drawObstacle(ctx, item.obj);
        }
    },

    // Barcha ma'lumotlarni o'chirib, o'yinni qaytadan boshlash
    fullReset() {
        SaveSystem.stopAutoSave();
        
        // Hujum rejimida bo'lsa, avval uyga qaytish
        if (BattleManager.active) {
            BattleManager.returnHome();
        }
        
        // BARCHA o'yinga tegishli localStorage kalitlarini o'chirish
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('totalConquest')) {
                keysToRemove.push(key);
            }
        }
        // tc_ prefixli kalitlar ham
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tc_')) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
        
        // Sahifani qaytadan yuklash
        location.reload();
    },

    _setupButtons() {
        // Restart tugmasi (fullReset onclick da, qo'shimcha handler shart emas)

        // Qurish tugmasi — agar ochiq bo'lsa, faqat yopadi
        document.getElementById('btn-build').onclick = () => {
            AudioManager.playClick();
            const wasOpen = BuildMenu.visible;
            this._closeAllPanels();
            if (!wasOpen) BuildMenu.toggle();
        };

        // Askar tugmasi — agar ochiq bo'lsa, faqat yopadi
        document.getElementById('btn-army').onclick = () => {
            AudioManager.playClick();
            const wasOpen = ArmyPanel.visible;
            this._closeAllPanels();
            if (!wasOpen) ArmyPanel.toggle();
        };

        // Ilm-fan — agar ochiq bo'lsa, faqat yopadi
        document.getElementById('btn-research').onclick = () => {
            AudioManager.playClick();
            const wasOpen = ResearchPanel.visible;
            this._closeAllPanels();
            if (!wasOpen) ResearchPanel.toggle();
        };

        // Ittifoq — agar ochiq bo'lsa, faqat yopadi
        document.getElementById('btn-alliance').onclick = () => {
            AudioManager.playClick();
            const wasOpen = typeof AlliancePanel !== 'undefined' && AlliancePanel.visible;
            this._closeAllPanels();
            if (!wasOpen) AlliancePanel.toggle();
        };

        // Jang — agar ochiq bo'lsa, faqat yopadi
        document.getElementById('btn-battle').onclick = () => {
            AudioManager.playClick();
            const wasOpen = BattlePanel.visible;
            this._closeAllPanels();
            if (!wasOpen) BattlePanel.toggle();
        };

        // Do'kon — agar ochiq bo'lsa, faqat yopadi
        document.getElementById('btn-shop').onclick = () => {
            AudioManager.playClick();
            const wasOpen = ShopPanel.visible;
            this._closeAllPanels();
            if (!wasOpen) ShopPanel.toggle();
        };

        // Sozlamalar — agar ochiq bo'lsa, faqat yopadi
        document.getElementById('btn-settings').onclick = () => {
            AudioManager.playClick();
            const wasOpen = SettingsPanel.visible;
            this._closeAllPanels();
            if (!wasOpen) SettingsPanel.toggle();
        };

        // Overlay bosish — barcha menyularni yopish
        document.getElementById('modal-overlay').onclick = () => {
            this._closeAllPanels();
        };

        // Quruvchi tugmasi
        const builderBtn = document.getElementById('builder-display');
        if (builderBtn) {
            builderBtn.onclick = () => {
                const cost = BuilderSystem.getNextBuilderCost();
                if (cost === null) {
                    Toast.show("Maksimal quruvchi soni!", "info");
                    return;
                }
                // Custom gem confirm modal (no native confirm)
                document.getElementById('_gc-builder-modal')?.remove();
                const _gcOv = document.createElement('div');
                _gcOv.id = '_gc-builder-modal';
                _gcOv.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);
                    z-index:100020;display:flex;align-items:center;justify-content:center;`;
                _gcOv.innerHTML = `
                    <div style="background:linear-gradient(160deg,#0d1117,#1a1020);
                                border:2px solid rgba(100,181,246,0.45);border-radius:16px;
                                padding:22px 24px;width:min(290px,88vw);text-align:center;
                                box-shadow:0 0 36px rgba(100,181,246,0.12);
                                animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                        <div style="font-size:36px;margin-bottom:8px;">👷</div>
                        <div style="font-size:13px;font-weight:800;color:#90caf9;margin-bottom:8px;">Yangi Quruvchi</div>
                        <div style="font-size:11px;color:#aaa;margin-bottom:6px;line-height:1.5;">
                            Quruvchi sotib olish uchun
                        </div>
                        <div style="font-size:20px;font-weight:800;color:#80deea;margin-bottom:16px;">💎 ${cost} olmos</div>
                        <div style="display:flex;gap:8px;">
                            <button onclick="document.getElementById('_gc-builder-modal')?.remove()"
                                    style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                           border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                            <button id="_gc-builder-ok"
                                    style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(100,181,246,0.5),rgba(30,136,229,0.4));
                                           border:1px solid rgba(100,181,246,0.5);border-radius:9px;
                                           color:#90caf9;font-size:12px;font-weight:800;cursor:pointer;">💎 Sotib olish</button>
                        </div>
                    </div>`;
                document.body.appendChild(_gcOv);
                _gcOv.onclick = e => { if (e.target === _gcOv) _gcOv.remove(); };
                document.getElementById('_gc-builder-ok').onclick = () => {
                    _gcOv.remove();
                    BuilderSystem.buyBuilder();
                };
            };
        }
    },

    _closeAllPanels() {
        BuildMenu.hide();
        InfoPanel.hide();
        if (ArmyPanel.visible)    ArmyPanel.hide();
        if (ShopPanel.visible)    ShopPanel.hide();
        if (SettingsPanel.visible) SettingsPanel.hide();
        if (BattlePanel.visible)  BattlePanel.hide();
        if (ResearchPanel.visible) ResearchPanel.hide();
        if (typeof AlliancePanel !== 'undefined' && AlliancePanel.visible) AlliancePanel.hide();
        if (typeof LeaderboardPanel !== 'undefined' && LeaderboardPanel.visible) LeaderboardPanel.hide();
        if (typeof ProfilePanel !== 'undefined' && ProfilePanel.visible) ProfilePanel.hide();
        if (typeof SeasonPassPanel !== 'undefined' && SeasonPassPanel.visible) SeasonPassPanel.hide();
    },

    _showMessage(text) {
        Toast.show(text, 'info');
    },

    // ── Shield Dome — xaritaning o'rtasida isometrik qalqon kupoli (CoC-style) ──
    _drawShieldDome(ctx) {
        if (typeof Camera === 'undefined' || typeof Grid === 'undefined') return;
        const now = Date.now();
        const z   = Camera.zoom;
        const W   = this.canvas.width;
        const H   = this.canvas.height;

        // Baza markazi
        const cx = Grid.SIZE / 2;
        const cy = Grid.SIZE / 2;
        const iso    = Camera.toIso(cx, cy);
        const center = Camera.worldToScreen(iso.x, iso.y);

        // Qalqon radiusi: xaritaning ~1/3 ekran kengligiga mos
        const shieldRx = (Grid.SIZE / 2) * Grid.TILE_W * z * 0.55;
        const shieldRy = shieldRx * 0.42; // isometrik

        ctx.save();

        // ── Pulsating bubble — ichki yashil-ko'k oval ─────────────────────────
        const pulse = 0.7 + Math.sin(now * 0.002) * 0.18;
        const alpha = 0.08 + Math.sin(now * 0.0025) * 0.03;

        // Tashqi glow halqa
        const outerGrad = ctx.createRadialGradient(
            center.x, center.y, shieldRx * 0.5,
            center.x, center.y, shieldRx * 1.1
        );
        outerGrad.addColorStop(0, `rgba(100,180,255,0)`);
        outerGrad.addColorStop(0.7, `rgba(80,150,255,${alpha})`);
        outerGrad.addColorStop(1, `rgba(40,120,255,0)`);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, shieldRx * 1.1, shieldRy * 1.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = outerGrad;
        ctx.fill();

        // Asosiy qalqon ellips (yupqa chiziq)
        ctx.strokeStyle = `rgba(120,200,255,${0.5 * pulse})`;
        ctx.lineWidth = 2 * z;
        ctx.setLineDash([8 * z, 4 * z]);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, shieldRx, shieldRy, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ichki nurlanish
        const innerGrad = ctx.createRadialGradient(
            center.x, center.y - shieldRy * 0.2, 0,
            center.x, center.y, shieldRx
        );
        innerGrad.addColorStop(0, `rgba(200,240,255,${alpha * 0.6})`);
        innerGrad.addColorStop(0.6, `rgba(100,180,255,${alpha * 0.35})`);
        innerGrad.addColorStop(1, `rgba(60,140,255,0)`);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, shieldRx, shieldRy, 0, 0, Math.PI * 2);
        ctx.fillStyle = innerGrad;
        ctx.fill();

        // Yuqori qism — highlight (yorqin yarim oy)
        ctx.beginPath();
        ctx.ellipse(center.x - shieldRx * 0.1, center.y - shieldRy * 0.4,
                    shieldRx * 0.45, shieldRy * 0.22, -0.15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.06 * pulse})`;
        ctx.fill();

        // ── Orbiting rune particles (3 ta) ────────────────────────────────────
        if (z > 0.35) {
            for (let i = 0; i < 3; i++) {
                const rAng = now * 0.0008 + (i / 3) * Math.PI * 2;
                const rx = center.x + Math.cos(rAng) * shieldRx * 0.9;
                const ry = center.y + Math.sin(rAng) * shieldRy * 0.9;
                const rPulse = 0.5 + 0.5 * Math.sin(now * 0.004 + i * 2.1);
                ctx.beginPath();
                ctx.arc(rx, ry, (2.5 + rPulse) * z, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(160,220,255,${0.7 * rPulse})`;
                ctx.shadowColor = 'rgba(120,200,255,0.8)';
                ctx.shadowBlur  = 6 * z;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        ctx.restore();
    },

    _simulateOfflineDefense() {
        if (typeof Matchmaking === 'undefined' || typeof SaveSystem === 'undefined') return;
        const lastSave = SaveSystem._lastSaveTime || 0;
        if (!lastSave) return;
        const offlineSec = (Date.now() - lastSave) / 1000;
        // 10 daqiqadan ko'p offlayn bo'lgan bo'lsa, 25% ehtimol bilan hujum
        if (offlineSec < 600) return;
        // Har 30 daqiqada bir hujum ehtimoli (maks 3)
        const slots = Math.min(3, Math.floor(offlineSec / 1800));
        for (let i = 0; i < slots; i++) {
            if (Math.random() < 0.25) {
                Matchmaking.simulateOfflineAttack();
            }
        }
        // Agar hujum bo'lgan bo'lsa, badge va toast
        const unread = Matchmaking.getUnreadDefenseCount();
        if (unread > 0) {
            setTimeout(() => {
                Toast.show(`🛡️ Siz yo'q bo'lganingizda ${unread} marta hujum bo'ldi!`, 'warn', 5000);
            }, 2500);
            // Loot cart mavjud bo'lsa — alohida xabarnoma
            if (Matchmaking.hasLootCart()) {
                const cart = Matchmaking._lootCart;
                const cartParts = [];
                if (cart.gold > 0) cartParts.push(`🪙${Helpers.formatNumber(cart.gold)}`);
                if (cart.food > 0) cartParts.push(`🍎${Helpers.formatNumber(cart.food)}`);
                setTimeout(() => {
                    Toast.show(`🛒 Loot Cart siz uchun saqlab qo'yildi! ${cartParts.join(' ')} — Town Hall yonidagi aravani teging.`, 'info', 7000);
                }, 4500);
            }
        }
    }
};

// ============================================
// LOADING VA ISHGA TUSHIRISH
// ============================================
function startLoading() {
    const loadBar    = document.getElementById('loading-bar');
    const loadText   = document.getElementById('loading-text');
    const loadScreen = document.getElementById('loading-screen');
    const tipEl      = document.getElementById('loading-tip');

    const TIPS = [
        '💡 Qurilish vaqtlarini qisqartirish uchun tadqiqot olib boring.',
        '⚔️ Hujumdan oldin raqib bazasini diqqat bilan o\'rganing.',
        '🛡️ Mudofaa qurilmalarini TH atrofida quyib qo\'ying.',
        '💎 Olmosni qurilmalarni tezlashtirishga sarflang.',
        '🏆 Har kuni o\'yin o\'ynaydigan bo\'lsangiz streak mukofoti olib boring!',
        '🔬 Tadqiqot tizimi askarlaringizni sezilarli kuchaytiradi.',
        '🌟 3 yulduz olish uchun Town Hall ni vayron qiling.',
        '👑 Qahramonlar qobiliyatini jangning eng qiyin paytida ishlating!',
        '🏗️ Bir vaqtda bir nechta bino qurish uchun quruvchi sotib oling.',
        '📋 Kunlik missiyalarni bajarib bonus resurslar yig\'ing.',
        '🤝 Ittifoqqa qo\'shilish urush mukofotlarini beradi.',
        '🎯 Artilleriya va minomyotlar masofadan hujum qiladi.',
        '🐢 Testudo askarlar siper hosil qilib mudofaa minorasini mag\'lub etadi.',
        '❄️ Muzlatish sehri mudofaa minorasini to\'xtatadi — qiyin bazalarda sinab ko\'ring!',
        '🏛️ Town Hall darajasi qanchalik yuqori, shuncha ko\'p bino qura olasiz.',
        '💛 Qahramonlar jangdan so\'ng regeneratsiya qiladi — ularga dam bering.',
        '🔥 Yutish seriyasi to\'plang: ketma-ket g\'alaba qo\'shimcha lut beradi!',
        '🧱 Devorlar dushman askarlarini kechiktiradi — mudofaa minoralari yo\'liga qo\'ying.',
        '🌿 Daraxt va toshlarni tozalang — yangi binolar uchun joy oching.',
        '📦 Ombor sig\'imini oshirishni unutmang — to\'lib qolgan resurs yo\'qoladi.',
        '🏹 Yoychi minorasi eng ko\'p ishlatiladigan mudofaa — birinchi upgrade qiling.',
        '⚡ Jangda 2x tezlik tugmasidan foydalaning!',
        '⚔️ Askar tayyorlashda ovqat va oltin sarflanadi, olmos emas.',
        '🗺️ Minimap orqali raqib bazasini tezroq ko\'rish mumkin.',
    ];

    // Tip rotation
    let tipIdx = Math.floor(Math.random() * TIPS.length);
    if (tipEl) {
        tipEl.textContent = TIPS[tipIdx];
        const tipIv = setInterval(() => {
            if (!tipEl.isConnected) { clearInterval(tipIv); return; }
            tipIdx = (tipIdx + 1) % TIPS.length;
            tipEl.style.opacity = '0';
            setTimeout(() => {
                if (!tipEl.isConnected) return;
                tipEl.textContent = TIPS[tipIdx];
                tipEl.style.opacity = '1';
            }, 300);
        }, 2800);
    }

    let progress = 0;
    const msgs = [
        'Xarita yuklanmoqda...',
        'Binolar tayyorlanmoqda...',
        'Rim legionlari yig\'ilmoqda...',
        'Askarlar saflanmoqda...',
        'Imperiya qurilmoqda...'
    ];

    const iv = setInterval(() => {
        progress += Math.random() * 18 + 6;
        if (progress > 100) progress = 100;

        loadBar.style.width = progress + '%';
        loadText.textContent = msgs[Math.min(Math.floor(progress / 22), msgs.length - 1)];

        if (progress >= 100) {
            clearInterval(iv);

            setTimeout(() => {
                loadScreen.classList.add('hidden');
                setTimeout(() => loadScreen.remove(), 800);

                LoginSystem.init();
            }, 400);
        }
    }, 180);
}

window.addEventListener('DOMContentLoaded', startLoading);
