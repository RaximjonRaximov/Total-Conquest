// ============================================
// MATCHMAKING TIZIMI — "Multiplayer" hujum
// Trophy-based opponent generator + Defense Log
// ============================================

const ROMAN_NAMES = [
    'Maximus','Lucius','Gaius','Marcus','Titus','Flavius','Julius','Claudius',
    'Brutus','Cassius','Pompeius','Crassus','Sulla','Marius','Scipio','Aemilius',
    'Vespasianus','Hadrian','Trajan','Augustus','Nero','Caligula','Domitian',
    'Valeria','Livia','Octavia','Cornelia','Fulvia','Hortensia','Clodia',
    'Theodora','Berenice','Agrippina','Messalina'
];
const NAME_SUFFIX = [
    'qo\'rg\'oni','bazasi','imperiyasi','qal\'asi','armiyasi','forumi',
    'qo\'shin turar joyi','devorlari','qo\'riqchisi','mustahkam joyi'
];

// Tarixiy o\'yin temalari bo\'yicha profil
const PLAYER_ARCHETYPES = [
    { style: '⚔️ Tajovuzkor', icon: '⚔️', desc: 'Kuchli hujum qo\'shini' },
    { style: '🛡️ Himoyachi',  icon: '🛡️', desc: 'Juda kuchli mudofaa' },
    { style: '🏹 Otishmakor', icon: '🏹', desc: 'Masofaviy qurol ustasi' },
    { style: '🐴 Otliq qo\'mondon', icon: '🐴', desc: 'Tez va epchil' },
    { style: '💣 Qamalchi',   icon: '💣', desc: 'Og\'ir siege ustalari' },
    { style: '🌟 Afsonaviy',  icon: '🌟', desc: 'Hamma narsada kuchli' },
];

const Matchmaking = {
    // Joriy ko'rsatilayotgan raqiblar
    currentPool: [],
    _defenseLog: [],   // { attackerName, attackerLevel, result, loot, time, revenged }
    _skipCost: 1,      // Olmos
    _maxDefenseLog: 30,

    // ── Loot Cart — hujum qilinganidan keyin resurs tiklanishi (CoC-style) ─────
    // { gold, food, createdAt, expiresAt }  |  null = yo'q
    _lootCart: null,
    LOOT_CART_DURATION: 24 * 60 * 60 * 1000,  // 24 soat (ms)

    // ── Trophy-based raqib generatsiyasi ──────────────────────────────────────
    generateOpponent(playerTrophies) {
        const spread    = Math.max(100, Math.floor(playerTrophies * 0.25));
        const oppTrophy = Math.max(0, playerTrophies + Helpers.randInt(-spread, spread));
        const thLevel   = this._trophyToTH(oppTrophy);
        const level     = Math.max(1, Math.floor(oppTrophy / 150) + 1);
        const archetype = PLAYER_ARCHETYPES[Math.floor(Math.random() * PLAYER_ARCHETYPES.length)];
        const firstName = ROMAN_NAMES[Math.floor(Math.random() * ROMAN_NAMES.length)];
        const suffix    = NAME_SUFFIX[Math.floor(Math.random() * NAME_SUFFIX.length)];

        // Loot: TH darajasiga proporsional
        const lootBase = this._trophyToLoot(oppTrophy);
        const goldAvail = Math.floor(lootBase.gold * (0.7 + Math.random() * 0.6));
        const foodAvail = Math.floor(lootBase.food * (0.7 + Math.random() * 0.6));
        // Faqat % lootlanishi mumkin (CoC: 20% storages, 50% collectors)
        const lootablePct = 0.2 + Math.random() * 0.15; // 20-35%
        const goldLoot  = Math.floor(goldAvail * lootablePct);
        const foodLoot  = Math.floor(foodAvail * lootablePct);

        // Mudofaa kuchi: trophyga qarab
        const defenseForce = Math.floor(oppTrophy * 12 + 500 + Math.random() * oppTrophy * 5);

        // Structured base layout
        const baseLayout = this.generateBaseLayout(thLevel);

        return {
            id: 'mp_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
            name: `${firstName}ning ${suffix}`,
            playerName: firstName,
            icon: archetype.icon,
            archetype: archetype.style,
            trophies: oppTrophy,
            level: level,
            thLevel: thLevel,
            goldLoot,
            foodLoot,
            defenseForce,
            isMultiplayer: true,
            _lootableGold: goldAvail,
            _lootableFood: foodAvail,
            baseLayout: JSON.stringify(baseLayout),
            loot: { gold: goldLoot, food: foodLoot },
        };
    },

    refreshPool() {
        const trophies = typeof BattleSystem !== 'undefined' ? BattleSystem.trophies : 0;
        this.currentPool = [
            this.generateOpponent(trophies),
            this.generateOpponent(trophies),
            this.generateOpponent(trophies),
        ];
    },

    getPool() {
        if (this.currentPool.length === 0) this.refreshPool();
        return this.currentPool;
    },

    skipOpponent(idx) {
        // Olmos sarflash yoki bepul skip (har 5 daqiqada)
        const trophies = typeof BattleSystem !== 'undefined' ? BattleSystem.trophies : 0;
        this.currentPool.splice(idx, 1, this.generateOpponent(trophies));
    },

    // ── Multiplayer hujum ─────────────────────────────────────────────────────
    attackOpponent(opponentId) {
        const opp = this.currentPool.find(o => o.id === opponentId);
        if (!opp) return null;

        if (!BattleSystem.canBattle()) {
            Toast.show(`⏳ Jang uchun ${Math.ceil(BattleSystem.getCooldownRemaining())}s kuting!`, 'warning');
            return null;
        }
        const total = TroopManager.getTotal();
        if (total === 0) {
            Toast.show("Askaringiz yo'q! Avval askar yarating.", 'error');
            return null;
        }

        BattleSystem.lastBattle = Date.now();

        const army = BattleSystem.getArmyPower();
        const winChance = army.total / (army.total + opp.defenseForce * 5);
        const victory = Math.random() < winChance;

        const lossPercent = victory
            ? Math.max(0.05, 0.1 + (opp.defenseForce * 3) / army.total * 0.3)
            : Math.max(0.3, 0.5 + (opp.defenseForce * 3) / army.total * 0.3);
        BattleSystem._applyLosses(Math.min(0.9, lossPercent));

        // Trophy exchange (CoC style)
        const maxTrophies = Math.min(40, Math.floor(Math.abs(opp.trophies - BattleSystem.trophies) / 10) + 15);
        const trophyGain  = victory ? maxTrophies : 0;
        const trophyLoss  = victory ? 0 : Math.floor(maxTrophies * 0.5);

        let result;
        if (victory) {
            BattleSystem.winStreak = (BattleSystem.winStreak || 0) + 1;
            const streakMult = 1 + Math.min(BattleSystem.winStreak - 1, 4) * 0.1;
            const goldLoot = Math.floor(opp.goldLoot * streakMult);
            const foodLoot = Math.floor(opp.foodLoot * streakMult);
            const stars = winChance > 0.7 ? 3 : winChance > 0.4 ? 2 : 1;

            Resources.add('gold', goldLoot);
            Resources.add('food', foodLoot);
            BattleSystem.trophies += trophyGain;
            XPSystem.addXP(Math.floor(30 + trophyGain * 0.5));

            if (typeof DailyMissions !== 'undefined') {
                DailyMissions.track('winStreak', 1);
                DailyMissions.track('attack', 1);
            }

            result = {
                victory: true,
                stars,
                goldLoot,
                foodLoot,
                xp: Math.floor(30 + trophyGain * 0.5),
                trophyChange: trophyGain,
                lossPercent: Math.round(lossPercent * 100),
                baseName: opp.name,
                playerName: opp.playerName,
                opponentTrophies: opp.trophies,
                winStreak: BattleSystem.winStreak,
                streakBonus: BattleSystem.winStreak > 1 ? Math.round((streakMult - 1) * 100) : 0,
                heroAura: army.heroAura || 1,
                isMultiplayer: true,
            };
        } else {
            BattleSystem.winStreak = 0;
            if (typeof DailyMissions !== 'undefined') DailyMissions.resetProgress('winStreak');
            BattleSystem.trophies = Math.max(0, BattleSystem.trophies - trophyLoss);

            result = {
                victory: false,
                stars: 0,
                goldLoot: 0,
                foodLoot: 0,
                xp: 8,
                trophyChange: -trophyLoss,
                lossPercent: Math.round(lossPercent * 100),
                baseName: opp.name,
                playerName: opp.playerName,
                opponentTrophies: opp.trophies,
                winStreak: 0,
                isMultiplayer: true,
            };
            XPSystem.addXP(8);
        }

        // Hero XP
        if (typeof HeroSystem !== 'undefined') {
            for (const heroType of Object.keys(HeroSystem.commanders)) {
                if ((TroopManager.army[heroType] || 0) > 0 || result.victory) {
                    HeroSystem.grantBattleXP(heroType, result.victory);
                }
            }
        }

        // Auto-shield
        BattleSystem._applyAutoShield(result);

        // Remove from pool and replace
        const idx = this.currentPool.findIndex(o => o.id === opponentId);
        if (idx >= 0) this.skipOpponent(idx);

        // Log
        BattleSystem.battleLog.unshift({ ...result, time: Date.now() });
        if (BattleSystem.battleLog.length > 20) BattleSystem.battleLog.pop();

        return result;
    },

    // ── Mudofaa jurnali ───────────────────────────────────────────────────────
    addDefenseEntry(entry) {
        this._defenseLog.unshift({ ...entry, time: Date.now(), revenged: false });
        if (this._defenseLog.length > this._maxDefenseLog) this._defenseLog.pop();
        // Badge yangilash
        if (typeof Game !== 'undefined') Game._updateHUDBadges?.();
    },

    getDefenseLog() {
        return this._defenseLog;
    },

    getUnreadDefenseCount() {
        return this._defenseLog.filter(e => !e._read).length;
    },

    markDefenseRead(idx) {
        if (this._defenseLog[idx]) this._defenseLog[idx]._read = true;
    },

    markAllDefenseRead() {
        for (const e of this._defenseLog) e._read = true;
    },

    // Simulyatsiya: vaqtida tasodifiy hujum bo'lib o'tgan (offline defend)
    simulateOfflineAttack() {
        const trophies = BattleSystem.trophies;
        const attacker = this.generateOpponent(trophies + Helpers.randInt(-100, 200));
        // Mudofaa kuchi: binolarimiz
        const defPower = this._calcDefensePower();
        const atkWinChance = attacker.defenseForce / (attacker.defenseForce + defPower * 5);
        const attackerWon = Math.random() < atkWinChance;

        const trophyLoss = attackerWon ? Helpers.randInt(15, 35) : 0;
        const goldStolen = attackerWon ? Math.floor(Resources.gold * 0.1) : 0;
        const foodStolen = attackerWon ? Math.floor(Resources.food * 0.1) : 0;

        if (attackerWon) {
            BattleSystem.trophies = Math.max(0, trophies - trophyLoss);
            // Resurslarni o'g'irlash (haqiqiy)
            if (goldStolen > 0) Resources.spend('gold', goldStolen);
            if (foodStolen > 0) Resources.spend('food', foodStolen);
            // ── Loot Cart yaratish — o'g'irlangan resurslarning 20%ini qaytaradi ──
            if (goldStolen > 0 || foodStolen > 0) {
                const cartGold = Math.floor(goldStolen * 0.2);
                const cartFood = Math.floor(foodStolen * 0.2);
                this._lootCart = {
                    gold:      cartGold,
                    food:      cartFood,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + this.LOOT_CART_DURATION,
                };
                // HUD badge yangilash (yangi loot cart bor)
                if (typeof Game !== 'undefined') Game._updateHUDBadges?.();
            }
        }

        this.addDefenseEntry({
            attackerName: attacker.playerName,
            attackerIcon: attacker.icon,
            attackerLevel: attacker.level,
            attackerTrophies: attacker.trophies,
            attackerWon,
            trophyChange: -trophyLoss,
            goldStolen,
            foodStolen,
            stars: attackerWon ? Helpers.randInt(1, 3) : 0,
        });

        return { attackerWon, trophyLoss };
    },

    // ── Loot Cart metodlari ───────────────────────────────────────────────────
    hasLootCart() {
        if (!this._lootCart) return false;
        if (Date.now() > this._lootCart.expiresAt) {
            this._lootCart = null;
            return false;
        }
        return true;
    },

    collectLootCart() {
        if (!this.hasLootCart()) return null;
        const cart = this._lootCart;
        this._lootCart = null;

        // Resurslarga qo'shish
        if (cart.gold > 0) Resources.add('gold', cart.gold);
        if (cart.food > 0) Resources.add('food', cart.food);

        // Fly-in animatsiya (TH screen pozitsiyasidan HUD ga uchadi)
        if (typeof ResourceFlyAnim !== 'undefined') {
            const cartPos = this.getLootCartScreenPos();
            const sx = cartPos ? cartPos.x : window.innerWidth / 2;
            const sy = cartPos ? cartPos.y : window.innerHeight / 2;
            if (cart.gold > 0) ResourceFlyAnim.play(sx, sy, 'gold', cart.gold);
            if (cart.food > 0) ResourceFlyAnim.play(sx, sy, 'food', cart.food);
        }

        // Toast
        const parts = [];
        if (cart.gold > 0) parts.push(`🪙 +${Helpers.formatNumber(cart.gold)}`);
        if (cart.food > 0) parts.push(`🍎 +${Helpers.formatNumber(cart.food)}`);
        if (parts.length > 0 && typeof Toast !== 'undefined') {
            Toast.show(`🛒 Loot Cart yig'ildi! ${parts.join(' ')}`, 'success');
        }

        if (typeof SaveSystem !== 'undefined') SaveSystem.save();
        return cart;
    },

    // TH yoki Praetorium binoni topish
    _findTHBuilding() {
        if (typeof BuildingManager === 'undefined') return null;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (!b.building && (b.type === 'cityHall' || b.type === 'praetorium')) return b;
        }
        return null;
    },

    // Loot Cart screen pozitsiyasi (click hit-test va render uchun)
    getLootCartScreenPos() {
        const th = this._findTHBuilding();
        if (!th || typeof Camera === 'undefined' || typeof BuildingRenderer === 'undefined') return null;
        const fp = BuildingRenderer.getScreenFootprint(th.x, th.y, 2, 2);
        // TH ning pastki-chap tomonida (iso y+ = pastga, x- = chapga)
        const z = Camera.zoom;
        return {
            x: fp.left.x + 18 * z,
            y: fp.bottom.y - 8 * z,
            z,
        };
    },

    _calcDefensePower() {
        // Binolarning mudofaa kuchini taxminiy hisoblash
        if (typeof BuildingManager === 'undefined') return 1000;
        let power = 0;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (!b || b.building) continue;
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            // Mudofaa kategoriyasi ko'proq hissa qo'shadi
            const isDefense = bd.category === 'mudofaa';
            const mult = isDefense ? 3 : 0.5;
            const statLevel = bd.levels?.[b.level] || {};
            power += ((statLevel.hp || 300) + (statLevel.damage || 20) * 10) * mult;
        }
        return Math.max(500, power);
    },

    // ── Template-based base layout generator — CoC compartment dizayn ───────────
    // QOIDA: wallR=0, devorlar buildings[] massivida (devorlar avval, keyin mudofaa)
    // Mudofaa DEVOR ICHIDA, resurslar TASHQARIDA
    _MP_TEMPLATES: {
        // TH1: Ochiq baza, devor yo'q
        1: { wallR: 0, buildings: [
            {type:'archerTower', dx: 4, dy: 0, lv:1},
            {type:'archerTower', dx:-4, dy: 0, lv:1},
            {type:'villa',       dx:-5, dy:-4, lv:1},
            {type:'farm',        dx: 5, dy:-4, lv:1},
            {type:'goldStorage', dx: 0, dy: 5, lv:1},
        ]},
        // TH2: R=4 devor, 2 AT ichida
        2: { wallR: 0, buildings: [
            {type:'wall',dx:-4,dy:-4,lv:1},{type:'wall',dx:-3,dy:-4,lv:1},{type:'wall',dx:-2,dy:-4,lv:1},
            {type:'wall',dx:-1,dy:-4,lv:1},{type:'wall',dx: 0,dy:-4,lv:1},{type:'wall',dx: 1,dy:-4,lv:1},
            {type:'wall',dx: 2,dy:-4,lv:1},{type:'wall',dx: 3,dy:-4,lv:1},{type:'wall',dx: 4,dy:-4,lv:1},
            {type:'wall',dx:-4,dy: 4,lv:1},{type:'wall',dx:-3,dy: 4,lv:1},{type:'wall',dx:-2,dy: 4,lv:1},
            {type:'wall',dx:-1,dy: 4,lv:1},{type:'gate',dx: 0,dy: 4,lv:1},{type:'wall',dx: 1,dy: 4,lv:1},
            {type:'wall',dx: 2,dy: 4,lv:1},{type:'wall',dx: 3,dy: 4,lv:1},{type:'wall',dx: 4,dy: 4,lv:1},
            {type:'wall',dx:-4,dy:-3,lv:1},{type:'wall',dx:-4,dy:-2,lv:1},{type:'wall',dx:-4,dy:-1,lv:1},
            {type:'wall',dx:-4,dy: 0,lv:1},{type:'wall',dx:-4,dy: 1,lv:1},{type:'wall',dx:-4,dy: 2,lv:1},
            {type:'wall',dx:-4,dy: 3,lv:1},
            {type:'wall',dx: 4,dy:-3,lv:1},{type:'wall',dx: 4,dy:-2,lv:1},{type:'wall',dx: 4,dy:-1,lv:1},
            {type:'wall',dx: 4,dy: 0,lv:1},{type:'wall',dx: 4,dy: 1,lv:1},{type:'wall',dx: 4,dy: 2,lv:1},
            {type:'wall',dx: 4,dy: 3,lv:1},
            // Mudofaa ICHIDA (burchaklarda)
            {type:'archerTower', dx: 3, dy:-2, lv:1},   // NE
            {type:'archerTower', dx:-2, dy: 3, lv:1},   // SW
            // Resurslar TASHQARIDA
            {type:'villa',       dx:-6, dy:-1, lv:1},
            {type:'farm',        dx: 6, dy:-1, lv:1},
            {type:'goldStorage', dx:-1, dy:-6, lv:1},
            {type:'foodStorage', dx: 1, dy: 6, lv:1},
        ]},
        // TH3: R=4 devor, 4 AT ichida burchaklarda
        3: { wallR: 0, buildings: [
            {type:'wall',dx:-4,dy:-4,lv:2},{type:'wall',dx:-3,dy:-4,lv:2},{type:'wall',dx:-2,dy:-4,lv:2},
            {type:'wall',dx:-1,dy:-4,lv:2},{type:'wall',dx: 0,dy:-4,lv:2},{type:'wall',dx: 1,dy:-4,lv:2},
            {type:'wall',dx: 2,dy:-4,lv:2},{type:'wall',dx: 3,dy:-4,lv:2},{type:'wall',dx: 4,dy:-4,lv:2},
            {type:'wall',dx:-4,dy: 4,lv:2},{type:'wall',dx:-3,dy: 4,lv:2},{type:'wall',dx:-2,dy: 4,lv:2},
            {type:'wall',dx:-1,dy: 4,lv:2},{type:'gate',dx: 0,dy: 4,lv:2},{type:'wall',dx: 1,dy: 4,lv:2},
            {type:'wall',dx: 2,dy: 4,lv:2},{type:'wall',dx: 3,dy: 4,lv:2},{type:'wall',dx: 4,dy: 4,lv:2},
            {type:'wall',dx:-4,dy:-3,lv:2},{type:'wall',dx:-4,dy:-2,lv:2},{type:'wall',dx:-4,dy:-1,lv:2},
            {type:'wall',dx:-4,dy: 0,lv:2},{type:'wall',dx:-4,dy: 1,lv:2},{type:'wall',dx:-4,dy: 2,lv:2},
            {type:'wall',dx:-4,dy: 3,lv:2},
            {type:'wall',dx: 4,dy:-3,lv:2},{type:'wall',dx: 4,dy:-2,lv:2},{type:'wall',dx: 4,dy:-1,lv:2},
            {type:'wall',dx: 4,dy: 0,lv:2},{type:'wall',dx: 4,dy: 1,lv:2},{type:'wall',dx: 4,dy: 2,lv:2},
            {type:'wall',dx: 4,dy: 3,lv:2},
            // Mudofaa — 4 burchak ICHIDA
            {type:'archerTower', dx:-2, dy:-2, lv:2},  // NW
            {type:'archerTower', dx: 3, dy:-2, lv:2},  // NE
            {type:'archerTower', dx:-2, dy: 3, lv:2},  // SW
            {type:'archerTower', dx: 3, dy: 3, lv:2},  // SE
            // Resurslar tashqarida
            {type:'villa',       dx:-7, dy: 0, lv:2},
            {type:'farm',        dx: 7, dy: 0, lv:2},
            {type:'goldStorage', dx: 0, dy:-6, lv:1},
            {type:'foodStorage', dx: 0, dy: 6, lv:2},
        ]},
        // TH4: R=4 devor, 4 AT + 2 scorpio ichida
        4: { wallR: 0, buildings: [
            {type:'wall',dx:-4,dy:-4,lv:2},{type:'wall',dx:-3,dy:-4,lv:2},{type:'wall',dx:-2,dy:-4,lv:2},
            {type:'wall',dx:-1,dy:-4,lv:2},{type:'wall',dx: 0,dy:-4,lv:2},{type:'wall',dx: 1,dy:-4,lv:2},
            {type:'wall',dx: 2,dy:-4,lv:2},{type:'wall',dx: 3,dy:-4,lv:2},{type:'wall',dx: 4,dy:-4,lv:2},
            {type:'wall',dx:-4,dy: 4,lv:2},{type:'wall',dx:-3,dy: 4,lv:2},{type:'wall',dx:-2,dy: 4,lv:2},
            {type:'wall',dx:-1,dy: 4,lv:2},{type:'gate',dx: 0,dy: 4,lv:2},{type:'wall',dx: 1,dy: 4,lv:2},
            {type:'wall',dx: 2,dy: 4,lv:2},{type:'wall',dx: 3,dy: 4,lv:2},{type:'wall',dx: 4,dy: 4,lv:2},
            {type:'wall',dx:-4,dy:-3,lv:2},{type:'wall',dx:-4,dy:-2,lv:2},{type:'wall',dx:-4,dy:-1,lv:2},
            {type:'wall',dx:-4,dy: 0,lv:2},{type:'wall',dx:-4,dy: 1,lv:2},{type:'wall',dx:-4,dy: 2,lv:2},
            {type:'wall',dx:-4,dy: 3,lv:2},
            {type:'wall',dx: 4,dy:-3,lv:2},{type:'wall',dx: 4,dy:-2,lv:2},{type:'wall',dx: 4,dy:-1,lv:2},
            {type:'wall',dx: 4,dy: 0,lv:2},{type:'wall',dx: 4,dy: 1,lv:2},{type:'wall',dx: 4,dy: 2,lv:2},
            {type:'wall',dx: 4,dy: 3,lv:2},
            // Mudofaa — 4 AT + 2 scorpio ICHIDA
            {type:'archerTower', dx:-2, dy:-2, lv:3},
            {type:'archerTower', dx: 3, dy:-2, lv:3},
            {type:'archerTower', dx:-2, dy: 3, lv:3},
            {type:'archerTower', dx: 3, dy: 3, lv:3},
            {type:'scorpio',     dx:-2, dy: 0, lv:2},
            {type:'scorpio',     dx: 3, dy: 0, lv:2},
            // Resurslar tashqarida
            {type:'villa',       dx:-7, dy: 0, lv:3},
            {type:'villa',       dx: 7, dy: 0, lv:3},
            {type:'goldStorage', dx: 0, dy:-6, lv:2},
            {type:'foodStorage', dx: 0, dy: 6, lv:2},
            {type:'farm',        dx:-6, dy: 5, lv:2},
        ]},
        // TH5: R=4 devor, 7 mudofaa ICHIDA (4 AT + 2 scorpio + praetorium), resurslar TASHQARIDA
        5: { wallR: 0, buildings: [
            // R=4 devor halqasi (32 ta) — devorlar AVVAL joylashtiriladi
            {type:'wall',dx:-4,dy:-4,lv:3},{type:'wall',dx:-3,dy:-4,lv:3},{type:'wall',dx:-2,dy:-4,lv:3},
            {type:'wall',dx:-1,dy:-4,lv:3},{type:'wall',dx: 0,dy:-4,lv:3},{type:'wall',dx: 1,dy:-4,lv:3},
            {type:'wall',dx: 2,dy:-4,lv:3},{type:'wall',dx: 3,dy:-4,lv:3},{type:'wall',dx: 4,dy:-4,lv:3},
            {type:'wall',dx:-4,dy: 4,lv:3},{type:'wall',dx:-3,dy: 4,lv:3},{type:'wall',dx:-2,dy: 4,lv:3},
            {type:'wall',dx:-1,dy: 4,lv:3},{type:'gate',dx: 0,dy: 4,lv:3},{type:'wall',dx: 1,dy: 4,lv:3},
            {type:'wall',dx: 2,dy: 4,lv:3},{type:'wall',dx: 3,dy: 4,lv:3},{type:'wall',dx: 4,dy: 4,lv:3},
            {type:'wall',dx:-4,dy:-3,lv:3},{type:'wall',dx:-4,dy:-2,lv:3},{type:'wall',dx:-4,dy:-1,lv:3},
            {type:'wall',dx:-4,dy: 0,lv:3},{type:'wall',dx:-4,dy: 1,lv:3},{type:'wall',dx:-4,dy: 2,lv:3},
            {type:'wall',dx:-4,dy: 3,lv:3},
            {type:'wall',dx: 4,dy:-3,lv:3},{type:'wall',dx: 4,dy:-2,lv:3},{type:'wall',dx: 4,dy:-1,lv:3},
            {type:'wall',dx: 4,dy: 0,lv:3},{type:'wall',dx: 4,dy: 1,lv:3},{type:'wall',dx: 4,dy: 2,lv:3},
            {type:'wall',dx: 4,dy: 3,lv:3},
            // Mudofaa ICHIDA — 4 burchak + 2 yon + shimol
            {type:'archerTower', dx:-2, dy:-2, lv:3},  // NW burchak
            {type:'archerTower', dx: 3, dy:-2, lv:3},  // NE burchak
            {type:'archerTower', dx:-2, dy: 3, lv:3},  // SW burchak
            {type:'archerTower', dx: 3, dy: 3, lv:3},  // SE burchak
            {type:'scorpio',     dx:-2, dy: 0, lv:2},  // G'arb
            {type:'scorpio',     dx: 3, dy: 0, lv:2},  // Sharq
            {type:'praetorium',  dx: 0, dy:-2, lv:1},  // Shimol
            // Resurslar TASHQARIDA
            {type:'villa',       dx:-7, dy: 0, lv:3},
            {type:'villa',       dx: 7, dy: 0, lv:3},
            {type:'goldStorage', dx: 0, dy:-7, lv:2},
            {type:'foodStorage', dx: 0, dy: 7, lv:2},
            {type:'farm',        dx:-6, dy: 6, lv:3},
        ]},
        // TH6: R=4 devor, 8 mudofaa ICHIDA (4 AT + 2 scorpio + praetorium + magicTower)
        6: { wallR: 0, buildings: [
            // R=4 devor halqasi (32 ta)
            {type:'wall',dx:-4,dy:-4,lv:4},{type:'wall',dx:-3,dy:-4,lv:4},{type:'wall',dx:-2,dy:-4,lv:4},
            {type:'wall',dx:-1,dy:-4,lv:4},{type:'wall',dx: 0,dy:-4,lv:4},{type:'wall',dx: 1,dy:-4,lv:4},
            {type:'wall',dx: 2,dy:-4,lv:4},{type:'wall',dx: 3,dy:-4,lv:4},{type:'wall',dx: 4,dy:-4,lv:4},
            {type:'wall',dx:-4,dy: 4,lv:4},{type:'wall',dx:-3,dy: 4,lv:4},{type:'wall',dx:-2,dy: 4,lv:4},
            {type:'wall',dx:-1,dy: 4,lv:4},{type:'gate',dx: 0,dy: 4,lv:4},{type:'wall',dx: 1,dy: 4,lv:4},
            {type:'wall',dx: 2,dy: 4,lv:4},{type:'wall',dx: 3,dy: 4,lv:4},{type:'wall',dx: 4,dy: 4,lv:4},
            {type:'wall',dx:-4,dy:-3,lv:4},{type:'wall',dx:-4,dy:-2,lv:4},{type:'wall',dx:-4,dy:-1,lv:4},
            {type:'wall',dx:-4,dy: 0,lv:4},{type:'wall',dx:-4,dy: 1,lv:4},{type:'wall',dx:-4,dy: 2,lv:4},
            {type:'wall',dx:-4,dy: 3,lv:4},
            {type:'wall',dx: 4,dy:-3,lv:4},{type:'wall',dx: 4,dy:-2,lv:4},{type:'wall',dx: 4,dy:-1,lv:4},
            {type:'wall',dx: 4,dy: 0,lv:4},{type:'wall',dx: 4,dy: 1,lv:4},{type:'wall',dx: 4,dy: 2,lv:4},
            {type:'wall',dx: 4,dy: 3,lv:4},
            // Mudofaa ICHIDA — 8 pozitsiya to'liq
            {type:'archerTower', dx:-2, dy:-2, lv:4},  // NW
            {type:'archerTower', dx: 3, dy:-2, lv:4},  // NE
            {type:'archerTower', dx:-2, dy: 3, lv:4},  // SW
            {type:'archerTower', dx: 3, dy: 3, lv:4},  // SE
            {type:'scorpio',     dx:-2, dy: 0, lv:3},  // G'arb
            {type:'scorpio',     dx: 3, dy: 0, lv:3},  // Sharq
            {type:'praetorium',  dx: 0, dy:-2, lv:2},  // Shimol
            {type:'magicTower',  dx: 0, dy: 3, lv:2},  // Janub
            // Resurslar TASHQARIDA
            {type:'villa',       dx:-8, dy: 0, lv:4},
            {type:'villa',       dx: 8, dy: 0, lv:4},
            {type:'goldStorage', dx: 0, dy:-8, lv:3},
            {type:'foodStorage', dx: 0, dy: 8, lv:3},
            {type:'farm',        dx:-7, dy: 6, lv:3},
            {type:'farm',        dx: 7, dy: 6, lv:3},
        ]},
        // TH7: Ichki R=3 + Tashqi R=6 — ikki qatlamli CoC uslubidagi mudofaa
        // TH ICHKI halqada, mudofaa HALQALAR ORASIDA, resurslar TASHQARIDA
        7: { wallR: 0, buildings: [
            // ── Ichki R=3 halqa (24 ta) — faqat TH himoyasi ──
            {type:'wall',dx:-3,dy:-3,lv:5},{type:'wall',dx:-2,dy:-3,lv:5},{type:'wall',dx:-1,dy:-3,lv:5},
            {type:'wall',dx: 0,dy:-3,lv:5},{type:'wall',dx: 1,dy:-3,lv:5},{type:'wall',dx: 2,dy:-3,lv:5},
            {type:'wall',dx: 3,dy:-3,lv:5},
            {type:'wall',dx:-3,dy: 3,lv:5},{type:'wall',dx:-2,dy: 3,lv:5},{type:'wall',dx:-1,dy: 3,lv:5},
            {type:'gate',dx: 0,dy: 3,lv:5},{type:'wall',dx: 1,dy: 3,lv:5},{type:'wall',dx: 2,dy: 3,lv:5},
            {type:'wall',dx: 3,dy: 3,lv:5},
            {type:'wall',dx:-3,dy:-2,lv:5},{type:'wall',dx:-3,dy:-1,lv:5},{type:'wall',dx:-3,dy: 0,lv:5},
            {type:'wall',dx:-3,dy: 1,lv:5},{type:'wall',dx:-3,dy: 2,lv:5},
            {type:'wall',dx: 3,dy:-2,lv:5},{type:'wall',dx: 3,dy:-1,lv:5},{type:'wall',dx: 3,dy: 0,lv:5},
            {type:'wall',dx: 3,dy: 1,lv:5},{type:'wall',dx: 3,dy: 2,lv:5},
            // ── Tashqi R=6 halqa (48 ta) ──
            {type:'wall',dx:-6,dy:-6,lv:5},{type:'wall',dx:-5,dy:-6,lv:5},{type:'wall',dx:-4,dy:-6,lv:5},
            {type:'wall',dx:-3,dy:-6,lv:5},{type:'wall',dx:-2,dy:-6,lv:5},{type:'wall',dx:-1,dy:-6,lv:5},
            {type:'wall',dx: 0,dy:-6,lv:5},{type:'wall',dx: 1,dy:-6,lv:5},{type:'wall',dx: 2,dy:-6,lv:5},
            {type:'wall',dx: 3,dy:-6,lv:5},{type:'wall',dx: 4,dy:-6,lv:5},{type:'wall',dx: 5,dy:-6,lv:5},
            {type:'wall',dx: 6,dy:-6,lv:5},
            {type:'wall',dx:-6,dy: 6,lv:5},{type:'wall',dx:-5,dy: 6,lv:5},{type:'wall',dx:-4,dy: 6,lv:5},
            {type:'wall',dx:-3,dy: 6,lv:5},{type:'wall',dx:-2,dy: 6,lv:5},{type:'wall',dx:-1,dy: 6,lv:5},
            {type:'gate',dx: 0,dy: 6,lv:5},{type:'wall',dx: 1,dy: 6,lv:5},{type:'wall',dx: 2,dy: 6,lv:5},
            {type:'wall',dx: 3,dy: 6,lv:5},{type:'wall',dx: 4,dy: 6,lv:5},{type:'wall',dx: 5,dy: 6,lv:5},
            {type:'wall',dx: 6,dy: 6,lv:5},
            {type:'wall',dx:-6,dy:-5,lv:5},{type:'wall',dx:-6,dy:-4,lv:5},{type:'wall',dx:-6,dy:-3,lv:5},
            {type:'wall',dx:-6,dy:-2,lv:5},{type:'wall',dx:-6,dy:-1,lv:5},{type:'wall',dx:-6,dy: 0,lv:5},
            {type:'wall',dx:-6,dy: 1,lv:5},{type:'wall',dx:-6,dy: 2,lv:5},{type:'wall',dx:-6,dy: 3,lv:5},
            {type:'wall',dx:-6,dy: 4,lv:5},{type:'wall',dx:-6,dy: 5,lv:5},
            {type:'wall',dx: 6,dy:-5,lv:5},{type:'wall',dx: 6,dy:-4,lv:5},{type:'wall',dx: 6,dy:-3,lv:5},
            {type:'wall',dx: 6,dy:-2,lv:5},{type:'wall',dx: 6,dy:-1,lv:5},{type:'wall',dx: 6,dy: 0,lv:5},
            {type:'wall',dx: 6,dy: 1,lv:5},{type:'wall',dx: 6,dy: 2,lv:5},{type:'wall',dx: 6,dy: 3,lv:5},
            {type:'wall',dx: 6,dy: 4,lv:5},{type:'wall',dx: 6,dy: 5,lv:5},
            // ── Mudofaa HALQALAR ORASIDA ──
            {type:'archerTower', dx:-4, dy:-4, lv:5},  // NW burchak
            {type:'archerTower', dx: 5, dy:-4, lv:5},  // NE burchak
            {type:'archerTower', dx:-4, dy: 5, lv:5},  // SW burchak
            {type:'archerTower', dx: 5, dy: 5, lv:5},  // SE burchak
            {type:'praetorium',  dx:-4, dy: 0, lv:3},  // G'arb markazi
            {type:'magicTower',  dx: 5, dy: 0, lv:3},  // Sharq markazi
            {type:'scorpio',     dx: 0, dy:-4, lv:4},  // Shimol markazi
            {type:'scorpio',     dx: 0, dy: 5, lv:4},  // Janub markazi
            {type:'tormenta',    dx:-4, dy: 2, lv:2},  // G'arb-janub
            {type:'tormenta',    dx: 5, dy: 2, lv:2},  // Sharq-janub
            // ── Resurslar TASHQARIDA (R=6 dan tashqarida) ──
            {type:'villa',       dx:-9, dy: 0, lv:5},
            {type:'villa',       dx: 9, dy: 0, lv:5},
            {type:'goldStorage', dx: 0, dy:-9, lv:4},
            {type:'foodStorage', dx: 0, dy: 9, lv:4},
            {type:'farm',        dx:-8, dy: 8, lv:4},
            {type:'farm',        dx: 8, dy: 8, lv:4},
        ]},
        // TH8: Ichki R=3 + Tashqi R=6, ko'proq mudofaa (flamingCitadel qo'shildi)
        8: { wallR: 0, buildings: [
            // ── Ichki R=3 halqa (24 ta) ──
            {type:'wall',dx:-3,dy:-3,lv:6},{type:'wall',dx:-2,dy:-3,lv:6},{type:'wall',dx:-1,dy:-3,lv:6},
            {type:'wall',dx: 0,dy:-3,lv:6},{type:'wall',dx: 1,dy:-3,lv:6},{type:'wall',dx: 2,dy:-3,lv:6},
            {type:'wall',dx: 3,dy:-3,lv:6},
            {type:'wall',dx:-3,dy: 3,lv:6},{type:'wall',dx:-2,dy: 3,lv:6},{type:'wall',dx:-1,dy: 3,lv:6},
            {type:'gate',dx: 0,dy: 3,lv:6},{type:'wall',dx: 1,dy: 3,lv:6},{type:'wall',dx: 2,dy: 3,lv:6},
            {type:'wall',dx: 3,dy: 3,lv:6},
            {type:'wall',dx:-3,dy:-2,lv:6},{type:'wall',dx:-3,dy:-1,lv:6},{type:'wall',dx:-3,dy: 0,lv:6},
            {type:'wall',dx:-3,dy: 1,lv:6},{type:'wall',dx:-3,dy: 2,lv:6},
            {type:'wall',dx: 3,dy:-2,lv:6},{type:'wall',dx: 3,dy:-1,lv:6},{type:'wall',dx: 3,dy: 0,lv:6},
            {type:'wall',dx: 3,dy: 1,lv:6},{type:'wall',dx: 3,dy: 2,lv:6},
            // ── Tashqi R=6 halqa (48 ta) ──
            {type:'wall',dx:-6,dy:-6,lv:6},{type:'wall',dx:-5,dy:-6,lv:6},{type:'wall',dx:-4,dy:-6,lv:6},
            {type:'wall',dx:-3,dy:-6,lv:6},{type:'wall',dx:-2,dy:-6,lv:6},{type:'wall',dx:-1,dy:-6,lv:6},
            {type:'wall',dx: 0,dy:-6,lv:6},{type:'wall',dx: 1,dy:-6,lv:6},{type:'wall',dx: 2,dy:-6,lv:6},
            {type:'wall',dx: 3,dy:-6,lv:6},{type:'wall',dx: 4,dy:-6,lv:6},{type:'wall',dx: 5,dy:-6,lv:6},
            {type:'wall',dx: 6,dy:-6,lv:6},
            {type:'wall',dx:-6,dy: 6,lv:6},{type:'wall',dx:-5,dy: 6,lv:6},{type:'wall',dx:-4,dy: 6,lv:6},
            {type:'wall',dx:-3,dy: 6,lv:6},{type:'wall',dx:-2,dy: 6,lv:6},{type:'wall',dx:-1,dy: 6,lv:6},
            {type:'gate',dx: 0,dy: 6,lv:6},{type:'wall',dx: 1,dy: 6,lv:6},{type:'wall',dx: 2,dy: 6,lv:6},
            {type:'wall',dx: 3,dy: 6,lv:6},{type:'wall',dx: 4,dy: 6,lv:6},{type:'wall',dx: 5,dy: 6,lv:6},
            {type:'wall',dx: 6,dy: 6,lv:6},
            {type:'wall',dx:-6,dy:-5,lv:6},{type:'wall',dx:-6,dy:-4,lv:6},{type:'wall',dx:-6,dy:-3,lv:6},
            {type:'wall',dx:-6,dy:-2,lv:6},{type:'wall',dx:-6,dy:-1,lv:6},{type:'wall',dx:-6,dy: 0,lv:6},
            {type:'wall',dx:-6,dy: 1,lv:6},{type:'wall',dx:-6,dy: 2,lv:6},{type:'wall',dx:-6,dy: 3,lv:6},
            {type:'wall',dx:-6,dy: 4,lv:6},{type:'wall',dx:-6,dy: 5,lv:6},
            {type:'wall',dx: 6,dy:-5,lv:6},{type:'wall',dx: 6,dy:-4,lv:6},{type:'wall',dx: 6,dy:-3,lv:6},
            {type:'wall',dx: 6,dy:-2,lv:6},{type:'wall',dx: 6,dy:-1,lv:6},{type:'wall',dx: 6,dy: 0,lv:6},
            {type:'wall',dx: 6,dy: 1,lv:6},{type:'wall',dx: 6,dy: 2,lv:6},{type:'wall',dx: 6,dy: 3,lv:6},
            {type:'wall',dx: 6,dy: 4,lv:6},{type:'wall',dx: 6,dy: 5,lv:6},
            // ── Mudofaa HALQALAR ORASIDA — 12 ta qurol ──
            {type:'archerTower',    dx:-4, dy:-4, lv:6},  // NW
            {type:'archerTower',    dx: 5, dy:-4, lv:6},  // NE
            {type:'archerTower',    dx:-4, dy: 5, lv:6},  // SW
            {type:'archerTower',    dx: 5, dy: 5, lv:6},  // SE
            {type:'praetorium',     dx:-4, dy: 0, lv:4},
            {type:'magicTower',     dx: 5, dy: 0, lv:4},
            {type:'scorpio',        dx: 0, dy:-4, lv:5},
            {type:'scorpio',        dx: 0, dy: 5, lv:5},
            {type:'tormenta',       dx:-4, dy: 2, lv:3},
            {type:'tormenta',       dx: 5, dy: 2, lv:3},
            {type:'flamingCitadel', dx:-4, dy:-2, lv:1},
            {type:'flamingCitadel', dx: 5, dy:-2, lv:1},
            // ── Resurslar TASHQARIDA ──
            {type:'villa',       dx:-9, dy: 0, lv:6},
            {type:'villa',       dx: 9, dy: 0, lv:6},
            {type:'goldStorage', dx: 0, dy:-9, lv:5},
            {type:'foodStorage', dx: 0, dy: 9, lv:5},
            {type:'farm',        dx:-8, dy: 8, lv:5},
            {type:'farm',        dx: 8, dy: 8, lv:5},
        ]},
        // TH9: Ichki R=3 + Tashqi R=7 — uch qatlamli (TH/mudofaa/resurslar)
        9: { wallR: 0, buildings: [
            // ── Ichki R=3 halqa (24 ta) ──
            {type:'wall',dx:-3,dy:-3,lv:7},{type:'wall',dx:-2,dy:-3,lv:7},{type:'wall',dx:-1,dy:-3,lv:7},
            {type:'wall',dx: 0,dy:-3,lv:7},{type:'wall',dx: 1,dy:-3,lv:7},{type:'wall',dx: 2,dy:-3,lv:7},
            {type:'wall',dx: 3,dy:-3,lv:7},
            {type:'wall',dx:-3,dy: 3,lv:7},{type:'wall',dx:-2,dy: 3,lv:7},{type:'wall',dx:-1,dy: 3,lv:7},
            {type:'gate',dx: 0,dy: 3,lv:7},{type:'wall',dx: 1,dy: 3,lv:7},{type:'wall',dx: 2,dy: 3,lv:7},
            {type:'wall',dx: 3,dy: 3,lv:7},
            {type:'wall',dx:-3,dy:-2,lv:7},{type:'wall',dx:-3,dy:-1,lv:7},{type:'wall',dx:-3,dy: 0,lv:7},
            {type:'wall',dx:-3,dy: 1,lv:7},{type:'wall',dx:-3,dy: 2,lv:7},
            {type:'wall',dx: 3,dy:-2,lv:7},{type:'wall',dx: 3,dy:-1,lv:7},{type:'wall',dx: 3,dy: 0,lv:7},
            {type:'wall',dx: 3,dy: 1,lv:7},{type:'wall',dx: 3,dy: 2,lv:7},
            // ── Tashqi R=7 halqa (56 ta) ──
            {type:'wall',dx:-7,dy:-7,lv:7},{type:'wall',dx:-6,dy:-7,lv:7},{type:'wall',dx:-5,dy:-7,lv:7},
            {type:'wall',dx:-4,dy:-7,lv:7},{type:'wall',dx:-3,dy:-7,lv:7},{type:'wall',dx:-2,dy:-7,lv:7},
            {type:'wall',dx:-1,dy:-7,lv:7},{type:'wall',dx: 0,dy:-7,lv:7},{type:'wall',dx: 1,dy:-7,lv:7},
            {type:'wall',dx: 2,dy:-7,lv:7},{type:'wall',dx: 3,dy:-7,lv:7},{type:'wall',dx: 4,dy:-7,lv:7},
            {type:'wall',dx: 5,dy:-7,lv:7},{type:'wall',dx: 6,dy:-7,lv:7},{type:'wall',dx: 7,dy:-7,lv:7},
            {type:'wall',dx:-7,dy: 7,lv:7},{type:'wall',dx:-6,dy: 7,lv:7},{type:'wall',dx:-5,dy: 7,lv:7},
            {type:'wall',dx:-4,dy: 7,lv:7},{type:'wall',dx:-3,dy: 7,lv:7},{type:'wall',dx:-2,dy: 7,lv:7},
            {type:'wall',dx:-1,dy: 7,lv:7},{type:'gate',dx: 0,dy: 7,lv:7},{type:'wall',dx: 1,dy: 7,lv:7},
            {type:'wall',dx: 2,dy: 7,lv:7},{type:'wall',dx: 3,dy: 7,lv:7},{type:'wall',dx: 4,dy: 7,lv:7},
            {type:'wall',dx: 5,dy: 7,lv:7},{type:'wall',dx: 6,dy: 7,lv:7},{type:'wall',dx: 7,dy: 7,lv:7},
            {type:'wall',dx:-7,dy:-6,lv:7},{type:'wall',dx:-7,dy:-5,lv:7},{type:'wall',dx:-7,dy:-4,lv:7},
            {type:'wall',dx:-7,dy:-3,lv:7},{type:'wall',dx:-7,dy:-2,lv:7},{type:'wall',dx:-7,dy:-1,lv:7},
            {type:'wall',dx:-7,dy: 0,lv:7},{type:'wall',dx:-7,dy: 1,lv:7},{type:'wall',dx:-7,dy: 2,lv:7},
            {type:'wall',dx:-7,dy: 3,lv:7},{type:'wall',dx:-7,dy: 4,lv:7},{type:'wall',dx:-7,dy: 5,lv:7},
            {type:'wall',dx:-7,dy: 6,lv:7},
            {type:'wall',dx: 7,dy:-6,lv:7},{type:'wall',dx: 7,dy:-5,lv:7},{type:'wall',dx: 7,dy:-4,lv:7},
            {type:'wall',dx: 7,dy:-3,lv:7},{type:'wall',dx: 7,dy:-2,lv:7},{type:'wall',dx: 7,dy:-1,lv:7},
            {type:'wall',dx: 7,dy: 0,lv:7},{type:'wall',dx: 7,dy: 1,lv:7},{type:'wall',dx: 7,dy: 2,lv:7},
            {type:'wall',dx: 7,dy: 3,lv:7},{type:'wall',dx: 7,dy: 4,lv:7},{type:'wall',dx: 7,dy: 5,lv:7},
            {type:'wall',dx: 7,dy: 6,lv:7},
            // ── Mudofaa HALQALAR ORASIDA — 14 ta qurol ──
            {type:'archerTower',    dx:-4, dy:-4, lv:8},
            {type:'archerTower',    dx: 5, dy:-4, lv:8},
            {type:'archerTower',    dx:-4, dy: 5, lv:8},
            {type:'archerTower',    dx: 5, dy: 5, lv:8},
            {type:'praetorium',     dx:-4, dy: 0, lv:5},
            {type:'magicTower',     dx: 5, dy: 0, lv:5},
            {type:'scorpio',        dx: 0, dy:-4, lv:7},
            {type:'scorpio',        dx: 0, dy: 5, lv:7},
            {type:'tormenta',       dx:-4, dy: 2, lv:4},
            {type:'tormenta',       dx: 5, dy: 2, lv:4},
            {type:'flamingCitadel', dx:-4, dy:-2, lv:2},
            {type:'flamingCitadel', dx: 5, dy:-2, lv:2},
            {type:'boltTower',      dx:-5, dy:-5, lv:1},  // Tashqi shimol-g'arb burchak
            {type:'boltTower',      dx: 6, dy:-5, lv:1},  // Tashqi shimol-sharq burchak
            // ── Resurslar TASHQARIDA (R=7 dan tashqarida) ──
            {type:'villa',       dx:-10, dy: 0, lv:8},
            {type:'villa',       dx: 10, dy: 0, lv:8},
            {type:'villa',       dx:  0, dy:-10, lv:7},
            {type:'goldStorage', dx:-10, dy: 7, lv:7},
            {type:'foodStorage', dx: 10, dy: 7, lv:7},
            {type:'farm',        dx: -9, dy: 9, lv:6},
            {type:'farm',        dx:  9, dy: 9, lv:6},
        ]},
        // TH10: Ichki R=3 + Tashqi R=7 — eng yuqori daraja, to'liq qurollangan baza
        10: { wallR: 0, buildings: [
            // ── Ichki R=3 halqa (24 ta) ──
            {type:'wall',dx:-3,dy:-3,lv:8},{type:'wall',dx:-2,dy:-3,lv:8},{type:'wall',dx:-1,dy:-3,lv:8},
            {type:'wall',dx: 0,dy:-3,lv:8},{type:'wall',dx: 1,dy:-3,lv:8},{type:'wall',dx: 2,dy:-3,lv:8},
            {type:'wall',dx: 3,dy:-3,lv:8},
            {type:'wall',dx:-3,dy: 3,lv:8},{type:'wall',dx:-2,dy: 3,lv:8},{type:'wall',dx:-1,dy: 3,lv:8},
            {type:'gate',dx: 0,dy: 3,lv:8},{type:'wall',dx: 1,dy: 3,lv:8},{type:'wall',dx: 2,dy: 3,lv:8},
            {type:'wall',dx: 3,dy: 3,lv:8},
            {type:'wall',dx:-3,dy:-2,lv:8},{type:'wall',dx:-3,dy:-1,lv:8},{type:'wall',dx:-3,dy: 0,lv:8},
            {type:'wall',dx:-3,dy: 1,lv:8},{type:'wall',dx:-3,dy: 2,lv:8},
            {type:'wall',dx: 3,dy:-2,lv:8},{type:'wall',dx: 3,dy:-1,lv:8},{type:'wall',dx: 3,dy: 0,lv:8},
            {type:'wall',dx: 3,dy: 1,lv:8},{type:'wall',dx: 3,dy: 2,lv:8},
            // ── Tashqi R=7 halqa (56 ta) ──
            {type:'wall',dx:-7,dy:-7,lv:8},{type:'wall',dx:-6,dy:-7,lv:8},{type:'wall',dx:-5,dy:-7,lv:8},
            {type:'wall',dx:-4,dy:-7,lv:8},{type:'wall',dx:-3,dy:-7,lv:8},{type:'wall',dx:-2,dy:-7,lv:8},
            {type:'wall',dx:-1,dy:-7,lv:8},{type:'wall',dx: 0,dy:-7,lv:8},{type:'wall',dx: 1,dy:-7,lv:8},
            {type:'wall',dx: 2,dy:-7,lv:8},{type:'wall',dx: 3,dy:-7,lv:8},{type:'wall',dx: 4,dy:-7,lv:8},
            {type:'wall',dx: 5,dy:-7,lv:8},{type:'wall',dx: 6,dy:-7,lv:8},{type:'wall',dx: 7,dy:-7,lv:8},
            {type:'wall',dx:-7,dy: 7,lv:8},{type:'wall',dx:-6,dy: 7,lv:8},{type:'wall',dx:-5,dy: 7,lv:8},
            {type:'wall',dx:-4,dy: 7,lv:8},{type:'wall',dx:-3,dy: 7,lv:8},{type:'wall',dx:-2,dy: 7,lv:8},
            {type:'wall',dx:-1,dy: 7,lv:8},{type:'gate',dx: 0,dy: 7,lv:8},{type:'wall',dx: 1,dy: 7,lv:8},
            {type:'wall',dx: 2,dy: 7,lv:8},{type:'wall',dx: 3,dy: 7,lv:8},{type:'wall',dx: 4,dy: 7,lv:8},
            {type:'wall',dx: 5,dy: 7,lv:8},{type:'wall',dx: 6,dy: 7,lv:8},{type:'wall',dx: 7,dy: 7,lv:8},
            {type:'wall',dx:-7,dy:-6,lv:8},{type:'wall',dx:-7,dy:-5,lv:8},{type:'wall',dx:-7,dy:-4,lv:8},
            {type:'wall',dx:-7,dy:-3,lv:8},{type:'wall',dx:-7,dy:-2,lv:8},{type:'wall',dx:-7,dy:-1,lv:8},
            {type:'wall',dx:-7,dy: 0,lv:8},{type:'wall',dx:-7,dy: 1,lv:8},{type:'wall',dx:-7,dy: 2,lv:8},
            {type:'wall',dx:-7,dy: 3,lv:8},{type:'wall',dx:-7,dy: 4,lv:8},{type:'wall',dx:-7,dy: 5,lv:8},
            {type:'wall',dx:-7,dy: 6,lv:8},
            {type:'wall',dx: 7,dy:-6,lv:8},{type:'wall',dx: 7,dy:-5,lv:8},{type:'wall',dx: 7,dy:-4,lv:8},
            {type:'wall',dx: 7,dy:-3,lv:8},{type:'wall',dx: 7,dy:-2,lv:8},{type:'wall',dx: 7,dy:-1,lv:8},
            {type:'wall',dx: 7,dy: 0,lv:8},{type:'wall',dx: 7,dy: 1,lv:8},{type:'wall',dx: 7,dy: 2,lv:8},
            {type:'wall',dx: 7,dy: 3,lv:8},{type:'wall',dx: 7,dy: 4,lv:8},{type:'wall',dx: 7,dy: 5,lv:8},
            {type:'wall',dx: 7,dy: 6,lv:8},
            // ── Mudofaa HALQALAR ORASIDA — 18 ta qurol (maksimal) ──
            {type:'archerTower',    dx:-4, dy:-4, lv:10},  // NW
            {type:'archerTower',    dx: 5, dy:-4, lv:10},  // NE
            {type:'archerTower',    dx:-4, dy: 5, lv:10},  // SW
            {type:'archerTower',    dx: 5, dy: 5, lv:10},  // SE
            {type:'archerTower',    dx:-4, dy:-2, lv:9},   // G'arb-shimol flank
            {type:'archerTower',    dx: 5, dy:-2, lv:9},   // Sharq-shimol flank
            {type:'praetorium',     dx:-4, dy: 0, lv:7},
            {type:'magicTower',     dx: 5, dy: 0, lv:8},
            {type:'scorpio',        dx: 0, dy:-4, lv:9},
            {type:'scorpio',        dx: 0, dy: 5, lv:9},
            {type:'scorpio',        dx:-5, dy: 0, lv:8},   // Tashqi g'arb
            {type:'scorpio',        dx: 6, dy: 0, lv:8},   // Tashqi sharq
            {type:'tormenta',       dx:-4, dy: 2, lv:6},
            {type:'tormenta',       dx: 5, dy: 2, lv:6},
            {type:'flamingCitadel', dx:-5, dy:-5, lv:4},   // Burchak istehkomlari
            {type:'flamingCitadel', dx: 6, dy:-5, lv:4},
            {type:'boltTower',      dx:-5, dy: 5, lv:3},
            {type:'boltTower',      dx: 6, dy: 5, lv:3},
            // ── Resurslar TASHQARIDA (R=7 dan tashqarida) ──
            {type:'villa',       dx:-10, dy: 0, lv:10},
            {type:'villa',       dx: 10, dy: 0, lv:10},
            {type:'villa',       dx:-10, dy: 5, lv:9},
            {type:'villa',       dx: 10, dy: 5, lv:9},
            {type:'goldStorage', dx:  0, dy:-10, lv:9},
            {type:'foodStorage', dx:  0, dy: 10, lv:9},
            {type:'farm',        dx: -9, dy:  9, lv:8},
            {type:'farm',        dx:  9, dy:  9, lv:8},
        ]},
    },

    generateBaseLayout(thLevel) {
        const center = 22;  // Grid markazi (44/2)
        const thLv   = Math.min(10, Math.max(1, thLevel));
        const result = [];

        // Tile band qilish uchun Set
        const occ = new Set();
        const occupy = (x, y, w, h) => {
            for (let dx = 0; dx < w; dx++)
                for (let dy = 0; dy < h; dy++)
                    occ.add(`${x+dx},${y+dy}`);
        };
        const isFree = (x, y, w, h) => {
            for (let dx = 0; dx < w; dx++)
                for (let dy = 0; dy < h; dy++)
                    if (occ.has(`${x+dx},${y+dy}`)) return false;
            return true;
        };

        // Bino joylashtirish helper: dx,dy — markazdan offset
        const place = (type, dx, dy, level) => {
            const bd = (typeof BUILDING_DATA !== 'undefined') ? BUILDING_DATA[type] : null;
            if (!bd) return;
            const [w, h] = bd.size;
            const tx = center + dx - Math.floor(w / 2);
            const ty = center + dy - Math.floor(h / 2);
            if (tx < 2 || ty < 2 || tx + w > 42 || ty + h > 42) return;
            if (!isFree(tx, ty, w, h)) return;
            occupy(tx, ty, w, h);
            const maxLv = Object.keys(bd.levels).length;
            result.push({ type, x: tx, y: ty, level: Math.max(1, Math.min(level, maxLv)) });
        };

        // 1. Town Hall — markaz
        place('cityHall', 0, 0, thLv);

        // 2. Template tanlash
        const tmpl = this._MP_TEMPLATES[thLv] || this._MP_TEMPLATES[1];

        // 3. Devor halqasi
        if (tmpl.wallR > 0) {
            const wr = tmpl.wallR;
            const wallLv = Math.min(5, thLv);
            const addWall = (wx, wy) => {
                if (wx < 2 || wy < 2 || wx >= 42 || wy >= 42) return;
                if (!isFree(wx, wy, 1, 1)) return;
                occupy(wx, wy, 1, 1);
                result.push({ type:'wall', x:wx, y:wy, level:wallLv });
            };
            for (let d = -wr; d <= wr; d++) {
                addWall(center + d, center - wr);
                addWall(center + d, center + wr);
            }
            for (let d = -wr + 1; d < wr; d++) {
                addWall(center - wr, center + d);
                addWall(center + wr, center + d);
            }
        }

        // 4. Template binolari
        for (const e of tmpl.buildings) {
            place(e.type, e.dx, e.dy, e.lv);
        }

        return result;
    },

    // ── Helper functions ──────────────────────────────────────────────────────
    _trophyToTH(trophies) {
        if (trophies >= 4000) return 10;
        if (trophies >= 2800) return 9;
        if (trophies >= 1500) return 8;
        if (trophies >= 800)  return 7;
        if (trophies >= 400)  return 6;
        if (trophies >= 200)  return 5;
        return Math.max(1, Math.ceil(trophies / 100) + 1);
    },

    _trophyToLoot(trophies) {
        const base = Math.max(500, trophies * 80);
        return { gold: base, food: Math.floor(base * 0.7) };
    },

    // ── Save / Load ───────────────────────────────────────────────────────────
    serialize() {
        return {
            defenseLog: this._defenseLog.slice(0, 20),
            lootCart:   this._lootCart || null,
        };
    },

    deserialize(data) {
        if (!data) return;
        if (data.defenseLog) this._defenseLog = data.defenseLog;
        if (data.lootCart && data.lootCart.expiresAt > Date.now()) {
            this._lootCart = data.lootCart;
        }
    },
};
