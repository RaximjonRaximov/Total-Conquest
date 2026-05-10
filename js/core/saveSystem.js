// ============================================
// SAQLASH TIZIMI (Save/Load)
// localStorage ga saqlash va yuklash
// ============================================

const SaveSystem = {
    SAVE_KEY_PREFIX: 'totalConquest_save_',
    playerId: 'default',
    AUTO_SAVE_INTERVAL: 30000, // 30 soniya (xavfsizroq)
    _autoSaveTimer: null,

    setPlayerId(id) {
        this.playerId = id;
    },

    get _key() {
        return this.SAVE_KEY_PREFIX + this.playerId;
    },

    // O'yinni saqlash
    save() {
        // MUHIM: Hujum rejimida saqlash MUMKIN EMAS!
        // Aks holda dushman bazasi o'yinchining bazasi sifatida saqlanib qoladi
        if (Game.mode === 'attack' || BattleManager.active) {
            console.warn('Hujum rejimida saqlash bloklandi!');
            return false;
        }
        try {
            const buildingsData = this._serializeBuildings();
            const data = {
                version: 3,
                timestamp: Date.now(),
                townHallLevel: Game.townHallLevel,
                resources: {
                    gold: Resources.gold,
                    food: Resources.food,
                    diamond: Resources.diamond,
                    goldenApple: Resources.goldenApple
                },
                buildings: buildingsData,
                army: { ...TroopManager.army },
                lastBattleArmy: TroopManager._lastBattleArmy ? { ...TroopManager._lastBattleArmy } : null,
                nextBuildingId: BuildingManager.nextId,
                // Yangi tizimlar
                xp: XPSystem.xp,
                level: XPSystem.level,
                obstacles: ObstacleManager.serialize(),
                obstacleNextId: ObstacleManager.nextId,
                trophies: BattleSystem.trophies,
                claimedLeagues: BattleSystem._claimedLeagues || [],
                offlineHistory: BattleSystem._offlineHistory || {},
                battleLog: BattleSystem.battleLog.slice(0, 10),
                lastBattle: BattleSystem.lastBattle,
                winStreak: BattleSystem.winStreak || 0,
                shieldUntil: BattleSystem.shieldUntil || 0,
                researchLevels: { ...ResearchSystem.levels },
                researchInProgress: (() => {
                    if (!ResearchSystem.currentResearch) return null;
                    const rem = timerManager.getRemaining(ResearchSystem.currentResearch.timerId);
                    return { id: ResearchSystem.currentResearch.id, remaining: rem };
                })(),
                builderTotal: BuilderSystem.totalBuilders,
                alliance: AllianceSystem.serialize(),
                spells: typeof SpellSystem !== 'undefined' ? SpellSystem.serialize() : null,
                heroes: typeof HeroSystem !== 'undefined' ? HeroSystem.serialize() : null,
                dailyMissions: typeof DailyMissions !== 'undefined' ? DailyMissions.serialize() : null,
                seasonPass: typeof SeasonPass !== 'undefined' ? SeasonPass.serialize() : null,
                armyCompositions: (typeof TroopManager !== 'undefined' ? TroopManager.savedCompositions : [null,null,null]),
                trainingQueues: (typeof TroopManager !== 'undefined') ? TroopManager.serializeQueues() : null,
                // Global boost timestamps
                trainBoostUntil: (typeof TroopManager !== 'undefined' ? TroopManager._boostUntil : 0) || 0,
                resBoostUntil: (typeof BuildingManager !== 'undefined' ? BuildingManager._resBoostUntil : 0) || 0,
                buildBoostUntil: (typeof BuildingManager !== 'undefined' ? BuildingManager._buildBoostUntil : 0) || 0,
                magicItems: typeof MagicItems !== 'undefined' ? MagicItems.serialize() : null,
                superTroops: typeof SuperTroops !== 'undefined' ? SuperTroops.serialize() : null,
                matchmaking: typeof Matchmaking !== 'undefined' ? Matchmaking.serialize() : null,
            };

            localStorage.setItem(this._key, JSON.stringify(data));
            
            // Database-ga o'yinchining bazasini sinxronlash
            if (typeof DatabaseSystem !== 'undefined') {
                DatabaseSystem.syncCurrentUser(JSON.stringify(buildingsData));
            }
            return true;
        } catch (e) {
            console.error('Saqlashda xato:', e);
            return false;
        }
    },

    // O'yinni yuklash
    load() {
        try {
            const raw = localStorage.getItem(this._key);
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (!data || !data.version) return false;

            // Resurslar
            Resources.gold = data.resources.gold || 1000;
            Resources.food = data.resources.food || 500;
            Resources.diamond = data.resources.diamond || 999999;
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
                if (data.timestamp) {
                    const bData = BUILDING_DATA[bd.type];
                    if (bData) {
                        const lv = bData.levels[bd.level];
                        const offlineSec = Math.min((Date.now() - data.timestamp) / 1000, 8 * 3600); // max 8h
                        if (lv && lv.production) {
                            const produced = lv.production * offlineSec / 60;
                            const cap      = lv.capacity || 999999;
                            building.storedResource = Math.min(cap, building.storedResource + produced);
                        }
                        // GemMine offline olmos
                        if (bd.type === 'gemMine' && lv && lv.diamondPerHour) {
                            const produced = lv.diamondPerHour * offlineSec / 3600;
                            const cap      = lv.capacity || 12;
                            building.storedDiamond = Math.min(cap, (building.storedDiamond || 0) + produced);
                        }
                    }
                }
                // Boost holati
                if (bd.boostUntil && bd.boostUntil > Date.now()) {
                    building._boostUntil = bd.boostUntil;
                }
                // GemMine saqlangan olmos
                if (bd.storedDiamond) building.storedDiamond = bd.storedDiamond;
                // Praetorium saqlangan askarlar
                if (bd._storedTroops) building._storedTroops = bd._storedTroops;

                BuildingManager.buildings[bd.id] = building;

                // ── Qurilish holatini tiklash (offline restart) ──────────────
                if (bd.building && bd.upgradeRemaining > 0) {
                    // Offline vaqtda o'tgan sekundlarni hisoblaymiz
                    const savedTimestamp = data.timestamp || Date.now();
                    const offlineSec = (Date.now() - savedTimestamp) / 1000;
                    const actualRemaining = Math.max(0, bd.upgradeRemaining - offlineSec);

                    if (actualRemaining > 0) {
                        // Qurilish hali tugamagan — timerni qayta ishga tushuramiz
                        building.building = true;
                        BuilderSystem.busyBuilders = Math.min(
                            BuilderSystem.totalBuilders,
                            BuilderSystem.busyBuilders + 1
                        );
                        const nextLevel = bd.level + 1;
                        building.timerId = timerManager.add(actualRemaining, () => {
                            const bData2 = BUILDING_DATA[building.type];
                            if (!bData2) return;
                            const lv2 = bData2.levels[nextLevel];
                            if (!lv2) return;
                            building.level   = nextLevel;
                            building.maxHp   = lv2.hp;
                            building.hp      = lv2.hp;
                            building.building = false;
                            building.timerId  = null;
                            BuilderSystem.freeBuilder();
                            const xp = typeof XPSystem !== 'undefined' ? XPSystem.getBuildXP(building.type, nextLevel) : 0;
                            if (typeof XPSystem !== 'undefined') XPSystem.addXP(xp);
                            if (typeof Toast !== 'undefined') {
                                Toast.show(`✅ ${bData2.icon} ${bData2.name} Lvl ${nextLevel} qurildi!`, 'success', 2500);
                            }
                            building._upgradeGlow = Date.now() + 2000;
                            building._placeBounce = Date.now();
                            if (typeof BuilderQueueHUD !== 'undefined') BuilderQueueHUD._render?.();
                            if (typeof ArmyPanel !== 'undefined' && ArmyPanel.visible) ArmyPanel.render();
                        });
                    } else {
                        // Qurilish offline da tugagan — darhol tayyor qiling
                        const bData2 = BUILDING_DATA[building.type];
                        if (bData2) {
                            const nextLevel = bd.level + 1;
                            const lv2 = bData2.levels[nextLevel];
                            if (lv2) {
                                building.level  = nextLevel;
                                building.maxHp  = lv2.hp;
                                building.hp     = lv2.hp;
                                const xp = typeof XPSystem !== 'undefined' ? XPSystem.getBuildXP(building.type, nextLevel) : 0;
                                if (typeof XPSystem !== 'undefined') XPSystem.addXP(xp);
                            }
                        }
                        // Builder allaqachon hisoblandi — qo'shmaymiz
                    }
                }
                const bData = BUILDING_DATA[bd.type];
                if (bData) {
                    Grid.occupy(bd.x, bd.y, bData.size[0], bData.size[1], bd.id);
                }
            }

            // Offline bildirishnoma
            if (data.timestamp) {
                this._lastSaveTime = data.timestamp;
                const offlineSec = Math.min((Date.now() - data.timestamp) / 1000, 8 * 3600);
                if (offlineSec > 120) { // only if offline > 2 minutes
                    this._pendingOfflineNotify = offlineSec;
                }
            }

            // Armiya
            if (data.army) {
                TroopManager.army = data.army;
                TroopManager.totalTroops = TroopManager.getTotal();
            }
            if (data.lastBattleArmy && typeof TroopManager !== 'undefined') {
                TroopManager._lastBattleArmy = data.lastBattleArmy;
            }
            if (data.armyCompositions && typeof TroopManager !== 'undefined') {
                TroopManager.savedCompositions = data.armyCompositions;
            }

            // Trening navbatlarini tiklash (offline restart)
            if (data.trainingQueues && typeof TroopManager !== 'undefined') {
                const offlineSec = data.timestamp
                    ? Math.min((Date.now() - data.timestamp) / 1000, 8 * 3600)
                    : 0;
                TroopManager.restoreQueues(data.trainingQueues, offlineSec);
            }

            // XP tizimi
            if (data.xp !== undefined) {
                XPSystem.xp = data.xp;
                XPSystem.level = data.level || 1;
            }

            // To'siqlar
            if (data.obstacles) {
                ObstacleManager.deserialize(data.obstacles);
                if (data.obstacleNextId) ObstacleManager.nextId = data.obstacleNextId;
            }

            // Jang tizimi
            if (data.trophies !== undefined) {
                BattleSystem.trophies = data.trophies;
            }
            if (data.claimedLeagues) {
                BattleSystem._claimedLeagues = data.claimedLeagues;
            }
            if (data.offlineHistory) {
                BattleSystem._offlineHistory = data.offlineHistory;
            }
            if (data.battleLog) {
                BattleSystem.battleLog = data.battleLog;
            }
            if (data.winStreak !== undefined) BattleSystem.winStreak = data.winStreak;
            if (data.shieldUntil) BattleSystem.shieldUntil = data.shieldUntil;
            if (data.lastBattle) {
                BattleSystem.lastBattle = data.lastBattle;
            }

            // Tadqiqot
            if (data.researchLevels) {
                ResearchSystem.levels = data.researchLevels;
            }

            // Tadqiqot jarayonini tiklash (offline restart)
            if (data.researchInProgress && data.researchInProgress.id) {
                const rip = data.researchInProgress;
                const offlineSec = data.timestamp ? (Date.now() - data.timestamp) / 1000 : 0;
                const actualRemaining = Math.max(0, rip.remaining - offlineSec);
                const rd = RESEARCH_DATA[rip.id];
                if (rd) {
                    const currentLevel = ResearchSystem.levels[rip.id] || 0;
                    const nextLevel = currentLevel + 1;
                    if (actualRemaining > 0) {
                        const timerId = timerManager.add(actualRemaining, () => {
                            ResearchSystem.levels[rip.id] = nextLevel;
                            ResearchSystem.currentResearch = null;
                            if (typeof XPSystem !== 'undefined') XPSystem.addXP(nextLevel * 10);
                            if (typeof Toast !== 'undefined') Toast.show(`${rd.icon} ${rd.name} Lvl ${nextLevel} tugallandi!`, 'reward');
                            ResearchSystem._showResearchCompleteBanner(rd, nextLevel);
                            if (typeof NotificationSystem !== 'undefined')
                                NotificationSystem.add('research', `${rd.name} tadqiqot tugadi!`, `Lvl ${nextLevel} — bonus qo'llanildi`, rd.icon);
                            if (typeof AchievementSystem !== 'undefined') AchievementSystem.track('researchCount');
                            if (typeof DailyMissions !== 'undefined') DailyMissions.track('research', 1);
                        }, null, { researchId: rip.id });
                        ResearchSystem.currentResearch = { id: rip.id, timerId };
                    } else {
                        // Offline vaqtda tadqiqot tugagan
                        ResearchSystem.levels[rip.id] = nextLevel;
                        if (typeof XPSystem !== 'undefined') XPSystem.addXP(nextLevel * 10);
                        if (typeof Toast !== 'undefined')
                            Toast.show(`${rd.icon} ${rd.name} Lvl ${nextLevel} (offline) tugallandi!`, 'success', 3000);
                    }
                }
            }

            // Quruvchi — save data va builderHut soni'dan kattasini tanlash
            if (data.builderTotal) {
                BuilderSystem.totalBuilders = data.builderTotal;
            }
            // Xaritadagi builderHut soni bilan sinx
            {
                const hutCount = BuildingManager.countType('builderHut');
                if (hutCount > BuilderSystem.totalBuilders) {
                    BuilderSystem.totalBuilders = hutCount;
                }
            }

            // Ittifoq
            if (data.alliance) {
                AllianceSystem.deserialize(data.alliance);
            }

            // Sehrlar (offline vaqtni hisobga olgan holda)
            if (data.spells && typeof SpellSystem !== 'undefined') {
                const spellOfflineSec = data.timestamp
                    ? Math.min((Date.now() - data.timestamp) / 1000, 8 * 3600)
                    : 0;
                SpellSystem.deserialize(data.spells, spellOfflineSec);
            }

            // Qahramonlar
            if (data.heroes && typeof HeroSystem !== 'undefined') {
                HeroSystem.deserialize(data.heroes);
            }

            // Kunlik missiyalar
            if (typeof DailyMissions !== 'undefined') {
                DailyMissions.deserialize(data.dailyMissions || null);
            }

            // Season Pass
            if (typeof SeasonPass !== 'undefined') {
                SeasonPass.deserialize(data.seasonPass || null);
                SeasonPass.init();
            }

            // Global boost timestamps
            const now = Date.now();
            if (data.trainBoostUntil && data.trainBoostUntil > now && typeof TroopManager !== 'undefined') {
                TroopManager._boostUntil = data.trainBoostUntil;
            }
            if (data.resBoostUntil && data.resBoostUntil > now && typeof BuildingManager !== 'undefined') {
                BuildingManager._resBoostUntil = data.resBoostUntil;
            }
            if (data.buildBoostUntil && data.buildBoostUntil > now && typeof BuildingManager !== 'undefined') {
                BuildingManager._buildBoostUntil = data.buildBoostUntil;
            }
            if (data.magicItems && typeof MagicItems !== 'undefined') {
                MagicItems.deserialize(data.magicItems);
                if (typeof MagicItemsPanel !== 'undefined') MagicItemsPanel.updateBadge();
            }
            if (data.superTroops && typeof SuperTroops !== 'undefined') {
                SuperTroops.deserialize(data.superTroops);
            }
            if (data.matchmaking && typeof Matchmaking !== 'undefined') {
                Matchmaking.deserialize(data.matchmaking);
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
            // Qurilish vaqtini saqlash (offline restart uchun)
            let upgradeRemaining = 0;
            let upgradeDuration  = 0;
            if (b.building && b.timerId) {
                const rem = timerManager.getRemaining(b.timerId);
                const prg = timerManager.getProgress(b.timerId);
                upgradeRemaining = rem;
                if (prg > 0 && prg < 1) {
                    upgradeDuration = rem / (1 - prg); // sekundda
                } else {
                    upgradeDuration = rem;
                }
            }
            result.push({
                id: b.id,
                type: b.type,
                x: b.x,
                y: b.y,
                level: b.level,
                hp: b.hp,
                maxHp: b.maxHp,
                storedResource: b.storedResource || 0,
                storedDiamond: b.storedDiamond || 0,
                lastCollect: b.lastCollect,
                boostUntil: b._boostUntil || 0,
                _storedTroops: b._storedTroops || 0,
                // Qurilish holati
                building: b.building || false,
                upgradeRemaining: upgradeRemaining,
                upgradeDuration:  upgradeDuration,
            });
        }
        return result;
    },

    // Offline bildirishnomani ko'rsatish (game init dan keyin chaqiriladi)
    showOfflineNotify() {
        if (!this._pendingOfflineNotify) return;
        const offlineSec = this._pendingOfflineNotify;
        this._pendingOfflineNotify = null;

        // Hozirgi storedResource qiymatlarini hisoblash (bino bo'yicha)
        const breakdown = [];
        let totalGold = 0, totalFood = 0, totalApple = 0, totalDiamond = 0;

        for (const b of Object.values(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            // GemMine alohida
            if (b.type === 'gemMine' && (b.storedDiamond || 0) >= 1) {
                const amt = Math.floor(b.storedDiamond);
                totalDiamond += amt;
                breakdown.push({ icon: '💎', name: 'Olmos Koni', amt, type: 'diamond' });
                continue;
            }
            if (b.storedResource < 1) continue;
            const amt = Math.floor(b.storedResource);
            if (b.type === 'villa')       totalGold  += amt;
            else if (b.type === 'farm')   totalFood  += amt;
            else if (b.type === 'treeOfLife') totalApple += amt;
            breakdown.push({ icon: bd.icon || '🏠', name: bd.name || b.type, amt,
                type: b.type === 'villa' ? 'gold' : b.type === 'farm' ? 'food' : 'apple' });
        }

        if (totalGold + totalFood + totalApple + totalDiamond < 10) return;

        const h = Math.floor(offlineSec / 3600);
        const m = Math.floor((offlineSec % 3600) / 60);
        const timeStr = h > 0 ? `${h}s ${m}d` : `${m} daqiqa`;

        setTimeout(() => this._showOfflineModal(timeStr, totalGold, totalFood, totalApple, breakdown, totalDiamond), 1800);
    },

    _showOfflineModal(timeStr, totalGold, totalFood, totalApple, breakdown, totalDiamond) {
        const modal = document.getElementById('offline-modal');
        const overlay = document.getElementById('modal-overlay');
        if (!modal) return;
        totalDiamond = totalDiamond || 0;

        // Summary chips
        const chips = [];
        if (totalGold    > 0) chips.push(`<div class="offl-chip offl-gold">🪙 <span>+${Helpers.formatNumber(totalGold)}</span></div>`);
        if (totalFood    > 0) chips.push(`<div class="offl-chip offl-food">🍎 <span>+${Helpers.formatNumber(totalFood)}</span></div>`);
        if (totalApple   > 0) chips.push(`<div class="offl-chip offl-apple">🍏 <span>+${Helpers.formatNumber(totalApple)}</span></div>`);
        if (totalDiamond > 0) chips.push(`<div class="offl-chip offl-gem">💎 <span>+${totalDiamond}</span></div>`);

        // Breakdown rows (max 5)
        const topBuildings = breakdown.sort((a, b) => b.amt - a.amt).slice(0, 5);
        const rowsHtml = topBuildings.map(b => {
            const color = b.type === 'gold' ? '#ffd700' : b.type === 'food' ? '#76c442' : '#a5d6a7';
            return `<div style="display:flex;justify-content:space-between;align-items:center;
                                padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span style="font-size:11px;color:#bbb;">${b.icon} ${b.name}</span>
                        <span style="font-size:11px;font-weight:700;color:${color};">+${Helpers.formatNumber(b.amt)}</span>
                    </div>`;
        }).join('');

        modal.innerHTML = `
            <!-- Top shimmer bar -->
            <div style="position:absolute;top:0;left:8%;right:8%;height:2px;
                        background:linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent);
                        border-radius:2px;"></div>

            <!-- Header -->
            <div style="text-align:center;margin-bottom:14px;">
                <div style="font-size:32px;margin-bottom:6px;
                            filter:drop-shadow(0 0 10px rgba(212,175,55,0.5));
                            animation:achIconPulse 2s ease-in-out infinite;">⏰</div>
                <div style="font-family:'Cinzel',serif;font-size:14px;font-weight:700;
                            color:#d4af37;letter-spacing:2px;margin-bottom:3px;">
                    OFFLINE DAROMAD
                </div>
                <div style="font-size:11px;color:#888;">${timeStr} davomida to'plangan resurslar</div>
            </div>

            <!-- Total chips -->
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:14px;">
                ${chips.join('')}
            </div>

            <!-- Building breakdown -->
            ${rowsHtml ? `
            <div style="background:rgba(0,0,0,0.25);border-radius:10px;padding:8px 12px;
                        margin-bottom:14px;border:1px solid rgba(255,255,255,0.05);">
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;
                            color:#555;margin-bottom:6px;font-weight:700;">Bino bo'yicha</div>
                ${rowsHtml}
            </div>` : ''}

            <!-- Collect button -->
            <button onclick="SaveSystem._collectOfflineAndClose()"
                    style="width:100%;padding:12px;border:none;border-radius:12px;
                           background:linear-gradient(135deg,#d4af37,#ff8c00);
                           color:#000;font-weight:800;font-size:13px;cursor:pointer;
                           letter-spacing:0.5px;
                           box-shadow:0 4px 16px rgba(212,175,55,0.4);
                           font-family:'Cinzel',serif;
                           transition:transform 0.15s,box-shadow 0.15s;">
                💰 Hammasini Yig'ish
            </button>
        `;

        // Inject chip styles if not present
        if (!document.getElementById('offl-chip-style')) {
            const s = document.createElement('style');
            s.id = 'offl-chip-style';
            s.textContent = `
                .offl-chip { display:inline-flex;align-items:center;gap:5px;
                    border-radius:20px;padding:5px 14px;font-size:13px;font-weight:700; }
                .offl-chip span { font-size:12px; }
                .offl-gold  { background:rgba(255,215,0,0.12);border:1px solid rgba(255,215,0,0.3);color:#ffd700; }
                .offl-food  { background:rgba(118,196,66,0.12);border:1px solid rgba(118,196,66,0.3);color:#a5d6a7; }
                .offl-apple { background:rgba(76,175,80,0.12);border:1px solid rgba(76,175,80,0.3);color:#c8e6c9; }
                .offl-gem   { background:rgba(126,206,242,0.12);border:1px solid rgba(126,206,242,0.3);color:#7ecef2; }
            `;
            document.head.appendChild(s);
        }

        if (overlay) {
            overlay.classList.add('show');
            overlay.onclick = () => SaveSystem._collectOfflineAndClose();
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(() => modal.classList.add('show'));
        });
        if (typeof AudioManager !== 'undefined') AudioManager.playCollect?.();
    },

    _collectOfflineAndClose() {
        const modal = document.getElementById('offline-modal');
        const overlay = document.getElementById('modal-overlay');
        if (modal) modal.classList.remove('show');
        if (overlay) { overlay.classList.remove('show'); overlay.onclick = null; }
        // Resources already stored in buildings — collect them all
        if (typeof Game !== 'undefined') Game.collectAll?.();
        Toast.show('💰 Resurslar yig\'ildi!', 'success', 2500);
    },

    // Saqlangan ma'lumot bormi?
    hasSave() {
        return localStorage.getItem(this._key) !== null;
    },

    // Saqlangan ma'lumotni o'chirish
    deleteSave() {
        localStorage.removeItem(this._key);
    },

    // Auto-save boshlash
    startAutoSave() {
        this._autoSaveTimer = setInterval(() => {
            this.save();
            // Backend sync ham shu intervalda
            if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                const buildings = this._serializeBuildings();
                Api.saveVillage({
                    map_data:  { buildings, obstacles: ObstacleManager.serialize() },
                    army_data: { ...TroopManager.army },
                    resources: {
                        gold:    Resources.gold,
                        food:    Resources.food,
                        diamond: Resources.diamond,
                    },
                    research: { ...ResearchSystem.levels },
                }).catch(() => {/* silent */});

                // Resurs konflikt sinxronizatsiyasi
                Api.syncResources(Resources.gold, Resources.food, Resources.diamond)
                    .then(result => {
                        if (result && result.conflict) {
                            const r = result.resources;
                            const goldDiff    = (r.gold    ?? Resources.gold)    - Resources.gold;
                            const foodDiff    = (r.food    ?? Resources.food)    - Resources.food;
                            const diamondDiff = (r.diamond ?? Resources.diamond) - Resources.diamond;
                            if (r.gold    !== undefined) Resources.gold    = r.gold;
                            if (r.food    !== undefined) Resources.food    = r.food;
                            if (r.diamond !== undefined) Resources.diamond = r.diamond;
                            Resources.updateDisplay();
                            if (goldDiff > 0)    Toast.show(`🪙 +${Helpers.formatNumber(goldDiff)} (server sync)`, 'info', 2000);
                            if (foodDiff > 0)    Toast.show(`🍎 +${Helpers.formatNumber(foodDiff)} (server sync)`, 'info', 2000);
                            if (diamondDiff > 0) Toast.show(`💎 +${diamondDiff} (server sync)`, 'info', 2000);
                        }
                    })
                    .catch(() => {/* silent */});
            }
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
            const raw = localStorage.getItem(this._key);
            if (!raw) return null;
            const data = JSON.parse(raw);
            return data.timestamp || null;
        } catch (e) {
            return null;
        }
    }
};
