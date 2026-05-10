// ============================================
// BATTLE MANAGER - Jonli jang tizimi
// ============================================

// ── Projectile Object Pool — har snaryad uchun {} allocation yo'q ─────────────
const _PROJ_POOL_SIZE = 300;
const _projPool = [];
for (let _pi = 0; _pi < _PROJ_POOL_SIZE; _pi++) {
    _projPool.push({ _pooled: true, active: false });
}
function _acquireProjectile() {
    for (let i = 0; i < _projPool.length; i++) {
        if (!_projPool[i].active) { _projPool[i].active = true; return _projPool[i]; }
    }
    return { active: true }; // fallback agar pool to'la bo'lsa
}
function _releaseProjectile(p) { if (p._pooled) p.active = false; }
// ──────────────────────────────────────────────────────────────────────────────

const BattleManager = {
    active: false,
    playerBaseData: null,
    _warAttackInfo: null,  // { defenderId } — set when this is a war battle

    // Jang ma'lumotlari
    troops: [],
    _troopsById: new Map(),   // O(1) troop lookup (projectile targetlash uchun)
    guardTroops: [],          // Militsiya qo'riqchi askarlari
    projectiles: [],
    enemyBuildings: {},
    _defenseBuildings: [],    // Faqat mudofaa binolari keshi
    availableTroops: {},
    _replayEvents: [],        // Replay: [{t, type, x, y}] deploy log

    // Natijalar
    lootAvailable: { gold: 0, food: 0 },
    lootGained: { gold: 0, food: 0 },
    destroyedCount: 0,
    totalBuildings: 0,
    deployedCount: 0,
    startTime: 0,
    timeLimit: 180000,
    ended: false,
    battleBaseInfo: null,
    _pathsDirty: false,      // Bino vayron bo'lganda yo'llarni qayta hisoblash

    // ── Kampaniya hujumi — CampaignLevel ob'ektidan ──────────────────────────
    startCampaignBattle(campaignLevel) {
        // O'yinchi bazasini saqlash
        this.playerBaseData = {
            buildings: JSON.stringify(BuildingManager.buildings),
            nextId:    BuildingManager.nextId,
            grid:      JSON.stringify(Grid.tiles),
            obstacles: JSON.stringify(ObstacleManager.obstacles),
            obsNextId: ObstacleManager.nextId
        };

        this.active    = true;
        this.ended     = false;
        this.startTime = Date.now();
        this.troops    = [];
        this._troopsById.clear();
        this.guardTroops   = [];
        this.projectiles   = [];
        this._pathsDirty   = false;
        this._replayEvents = [];
        this.cityHallDestroyed = false;
        // Oldingi jang sehr effektlarini tozalash
        if (typeof SpellSystem !== 'undefined') SpellSystem._activeEffects = [];

        // Armiya snapshotini saqlash (Retrain Last Army uchun)
        if (typeof TroopManager !== 'undefined') {
            TroopManager._lastBattleArmy = { ...TroopManager.army };
        }

        this.availableTroops = { ...TroopManager.army };
        this._praetoriumBuilding = null;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'praetorium' && !b.building && (b._storedTroops || 0) > 0) {
                this.availableTroops['_praetorium'] = b._storedTroops;
                this._praetoriumBuilding = b;
                break;
            }
        }
        this._addHeroesToAvailableTroops(); // Qahramonlarni qo'shish
        if (typeof SpatialGrid !== 'undefined') SpatialGrid.init();
        this.deployedCount = 0;
        this.lootGained    = { gold: 0, food: 0 };
        this.lootAvailable = {
            gold: Helpers.randInt(campaignLevel.loot.gold[0], campaignLevel.loot.gold[1]),
            food: Helpers.randInt(campaignLevel.loot.food[0], campaignLevel.loot.food[1])
        };

        // Jang meta ma'lumoti
        this.battleBaseInfo = {
            id:           'campaign_' + campaignLevel.id,
            name:         campaignLevel.name,
            difficulty:   campaignLevel.difficulty,
            lootGold:     campaignLevel.loot.gold,
            lootFood:     campaignLevel.loot.food,
            xpReward:     campaignLevel.xpReward,
            trophyReward: campaignLevel.trophyReward,
            isCampaign:   true,
            campaignId:   campaignLevel.id,
        };

        // O'yin rejimini o'zgartirish
        Game.mode = 'attack';
        this._hideHUD();

        // Dushman bazasini campaignLevel.buildings dan yaratish
        this._generateCampaignBase(campaignLevel);

        // Kamera — avval uzoqdan boshlab markazga tween (CoC-style cinematic pan)
        const cx = Grid.SIZE / 2, cy = Grid.SIZE / 2;
        Camera.centerOn(cx, cy);
        Camera.zoom = 0.45;
        Camera.targetZoom = 0.45;
        Camera.tweenTo(cx, cy, 1.1, 900);

        // Attack HUD va Deploy UI
        if (typeof AttackScreen !== 'undefined') AttackScreen.showAttackHUD();
        DeployPanel.show();
        Toast.show(`⚔️ ${campaignLevel.name} ga hujum!`, 'warning');
        if (typeof BattleIntro !== 'undefined') BattleIntro.play();
        AudioManager.playSword?.();
    },

    // Kampaniya bazasini o'yinga yuklaish
    _generateCampaignBase(campaignLevel) {
        Grid.init();
        BuildingManager.buildings = {};
        ObstacleManager.obstacles = {};
        BuildingManager.nextId = 1;

        const CX = Math.floor(Grid.SIZE / 2);
        const CY = Math.floor(Grid.SIZE / 2);

        // TH avval joylashtirish
        const thEntry = campaignLevel.buildings.find(b => b.type === 'cityHall');
        if (thEntry) {
            const bd = BUILDING_DATA['cityHall'];
            const lv = bd.levels[thEntry.lv] || bd.levels[1];
            const bx = CX + thEntry.dx;
            const by = CY + thEntry.dy;
            if (bx >= 0 && by >= 0 && bx + bd.size[0] <= Grid.SIZE && by + bd.size[1] <= Grid.SIZE) {
                const id = BuildingManager.nextId++;
                BuildingManager.buildings[id] = {
                    id, type: 'cityHall', x: bx, y: by,
                    level: thEntry.lv, hp: lv.hp, maxHp: lv.hp,
                    building: false, storedLoot: { gold: 0, food: 0 }, lastShot: 0
                };
                Grid.occupy(bx, by, bd.size[0], bd.size[1], id);
            }
        }

        // Qolgan binolar
        for (const entry of campaignLevel.buildings) {
            if (entry.type === 'cityHall') continue; // allaqachon qo'shildi
            const bd = BUILDING_DATA[entry.type];
            if (!bd) continue;
            const lv = bd.levels[Math.min(entry.lv, Object.keys(bd.levels).length)] || bd.levels[1];
            if (!lv) continue;
            const bx = CX + entry.dx;
            const by = CY + entry.dy;
            // Chegaradan chiqmaslik
            if (bx < 0 || by < 0 || bx + bd.size[0] > Grid.SIZE || by + bd.size[1] > Grid.SIZE) continue;
            // Egallangan joyga qo'ymaslik
            if (!Grid.isFree(bx, by, bd.size[0], bd.size[1])) continue;

            const id = BuildingManager.nextId++;
            BuildingManager.buildings[id] = {
                id, type: entry.type, x: bx, y: by,
                level: Math.min(entry.lv, Object.keys(bd.levels).length),
                hp: lv.hp, maxHp: lv.hp,
                building: false, storedLoot: { gold: 0, food: 0 }, lastShot: 0
            };
            Grid.occupy(bx, by, bd.size[0], bd.size[1], id);
        }

        this.enemyBuildings = BuildingManager.buildings;
        this.totalBuildings = Object.keys(this.enemyBuildings).length;
        this.destroyedCount = 0;
        this._distributeLoot();
        this._rebuildDefenseCache();
    },

    startLiveBattle(baseId) {
        const base = ENEMY_BASES.find(b => b.id === baseId);
        if (!base) return;

        // O'yinchi bazasini saqlash
        this.playerBaseData = {
            buildings: JSON.stringify(BuildingManager.buildings),
            nextId: BuildingManager.nextId,
            grid: JSON.stringify(Grid.tiles),
            obstacles: JSON.stringify(ObstacleManager.obstacles),
            obsNextId: ObstacleManager.nextId
        };

        this.active = true;
        this.ended = false;
        this.cityHallDestroyed = false;
        this.battleBaseInfo = base;
        this.startTime = Date.now();
        this.troops = [];
        this._troopsById.clear();
        this.guardTroops = [];
        this.projectiles = [];
        this._pathsDirty = false;
        this._replayEvents = [];
        // Oldingi jang sehr effektlarini tozalash
        if (typeof SpellSystem !== 'undefined') SpellSystem._activeEffects = [];
        // Armiya snapshotini saqlash (Retrain Last Army uchun)
        if (typeof TroopManager !== 'undefined') {
            TroopManager._lastBattleArmy = { ...TroopManager.army };
        }
        this.availableTroops = { ...TroopManager.army };
        // Praetorium stored troops — jangda ishlatish imkoniyati
        this._praetoriumBuilding = null;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'praetorium' && !b.building && (b._storedTroops || 0) > 0) {
                const stored = b._storedTroops;
                this.availableTroops['_praetorium'] = stored;
                this._praetoriumBuilding = b;
                break;
            }
        }
        this._addHeroesToAvailableTroops(); // Qahramonlarni qo'shish
        if (typeof SpatialGrid !== 'undefined') SpatialGrid.init();
        this.deployedCount = 0;
        this.lootGained = { gold: 0, food: 0 };
        this.lootAvailable = {
            gold: Helpers.randInt(base.lootGold[0], base.lootGold[1]),
            food: Helpers.randInt(base.lootFood[0], base.lootFood[1])
        };

        // O'yin rejimini o'zgartirish
        Game.mode = 'attack';
        this._hideHUD();

        // Dushman bazasini yaratish
        this._generateEnemyBase(base);

        // Kamera — cinematic zoom-in
        const cx2 = Grid.SIZE / 2, cy2 = Grid.SIZE / 2;
        Camera.centerOn(cx2, cy2);
        Camera.zoom = 0.45;
        Camera.targetZoom = 0.45;
        Camera.tweenTo(cx2, cy2, 1.1, 900);

        // Attack HUD + Deploy UI
        if (typeof AttackScreen !== 'undefined') AttackScreen.showAttackHUD();
        DeployPanel.show();
        Toast.show(`⚔️ ${base.name} ga hujum boshlandi!`, 'warning');

        // Countdown overlay
        if (typeof BattleIntro !== 'undefined') BattleIntro.play();
    },

    startOnlineLiveBattle(opponentData) {
        // O'yinchi bazasini saqlash
        this.playerBaseData = {
            buildings: JSON.stringify(BuildingManager.buildings),
            nextId: BuildingManager.nextId,
            grid: JSON.stringify(Grid.tiles),
            obstacles: JSON.stringify(ObstacleManager.obstacles),
            obsNextId: ObstacleManager.nextId
        };

        this.active = true;
        this.ended = false;
        this.startTime = Date.now();
        this.troops = [];
        this._troopsById.clear();
        this.guardTroops = [];
        this.projectiles = [];
        this._pathsDirty = false;
        this._replayEvents = [];
        // Oldingi jang sehr effektlarini tozalash
        if (typeof SpellSystem !== 'undefined') SpellSystem._activeEffects = [];
        // Armiya snapshotini saqlash (Retrain Last Army uchun)
        if (typeof TroopManager !== 'undefined') {
            TroopManager._lastBattleArmy = { ...TroopManager.army };
        }
        this.availableTroops = { ...TroopManager.army };
        // Praetorium stored troops — online jangda ham
        this._praetoriumBuilding = null;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'praetorium' && !b.building && (b._storedTroops || 0) > 0) {
                this.availableTroops['_praetorium'] = b._storedTroops;
                this._praetoriumBuilding = b;
                break;
            }
        }
        this._addHeroesToAvailableTroops(); // Qahramonlarni qo'shish
        if (typeof SpatialGrid !== 'undefined') SpatialGrid.init();
        this._warAttackInfo = opponentData.isWarBattle
            ? { defenderId: opponentData.warDefenderId }
            : null;

        Game.mode = 'attack';
        this._hideHUD();
        
        Grid.init();
        BuildingManager.buildings = {};
        ObstacleManager.obstacles = {};
        BuildingManager.nextId = 1;
        
        // Dushman bazasini yuklash
        const bList = JSON.parse(opponentData.baseLayout || '[]');
        for (const b of bList) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue; // Noma'lum turdagi binolarni o'tkazib yuborish
            const level = Math.min(b.level ?? 1, Object.keys(bd.levels).length);
            const lv = bd.levels[level] || bd.levels[1];
            if (!lv) continue;

            const id = BuildingManager.nextId++;
            BuildingManager.buildings[id] = {
                id:           id,
                type:         b.type,
                x:            b.x,
                y:            b.y,
                level:        level,
                hp:           lv.hp,
                maxHp:        lv.hp,
                building:     false,
                storedLoot:   { gold: 0, food: 0 },
                lastShot:     0
            };
            Grid.occupy(b.x, b.y, bd.size[0], bd.size[1], id);
        }

        // Loot hint dan yoki level hisoblash
        const lootG = opponentData.loot?.gold ?? (opponentData.level * 1000 + Math.floor(Math.random() * 500));
        const lootF = opponentData.loot?.food ?? (opponentData.level * 1000 + Math.floor(Math.random() * 500));

        this.lootAvailable = { gold: lootG, food: lootF };
        this.lootGained = { gold: 0, food: 0 };
        this._distributeLoot();

        this.enemyBuildings = BuildingManager.buildings;
        this.totalBuildings = Object.keys(this.enemyBuildings).length;
        this.destroyedCount = 0;
        this._rebuildDefenseCache();

        const thLv = opponentData.level ?? 1;
        // CoC-style trophy balance: trophy farqiga qarab yutish/yo'qotish
        // Ko'p trophyli raqibni yengsa ko'p oladi, kam trophylini yengsa kam oladi
        const playerTrophies  = typeof BattleSystem !== 'undefined' ? BattleSystem.trophies : 0;
        const opponentTrophies = opponentData.trophies || playerTrophies;
        const trophyDiff  = opponentTrophies - playerTrophies;
        const BASE_WIN    = 15; // asosiy yutish
        const BASE_LOSE   = 8;  // asosiy yo'qotish
        // +1 trophy per 50 diff (max ±10 bonus)
        const diffBonus   = Math.max(-10, Math.min(10, Math.round(trophyDiff / 50)));
        const winTrophy   = Math.max(2, BASE_WIN  + diffBonus);
        const loseTrophy  = Math.max(1, BASE_LOSE - diffBonus);

        this.battleBaseInfo = {
            id:           opponentData.id,
            name:         opponentData.name,
            difficulty:   Math.min(5, Math.max(1, Math.round(thLv / 2))),
            lootGold:     [lootG, lootG],
            lootFood:     [lootF, lootF],
            xpReward:     thLv * 50,
            trophyReward: winTrophy,
            trophyLoss:   loseTrophy, // yo'qotish uchun alohida qiymat
            // Backend sync uchun
            opponent_id:  opponentData.opponent_id || opponentData.id,
            is_bot:       opponentData.is_bot !== false,
        };

        // Cinematic zoom-in
        const cxO = Grid.SIZE / 2, cyO = Grid.SIZE / 2;
        Camera.centerOn(cxO, cyO);
        Camera.zoom = 0.45;
        Camera.targetZoom = 0.45;
        Camera.tweenTo(cxO, cyO, 1.1, 900);

        // Attack HUD + Deploy UI
        if (typeof AttackScreen !== 'undefined') AttackScreen.showAttackHUD();
        DeployPanel.show();
        const label = opponentData.is_bot ? '🤖' : '🌍';
        Toast.show(`${label} Hujum: ${opponentData.name}!`, 'error');
        AudioManager.playSword();
        if (typeof BattleIntro !== 'undefined') BattleIntro.play();
    },

    // ── NPC Baza Layoutlari (CoC/TC uslubida haqiqiy compartment dizayn) ────────
    // QOIDA: Mudofaa binolari DEVOR ICHIDA, Resurslar TASHQARIDA
    // R=4 devor: dx=-4..4 at dy=±4; dy=-3..3 at dx=±4  (9×9 perimetr)
    // R=4 ichki 2x2 burchak pozitsiyalar:
    //   NW:dx=-2,dy=-2  NE:dx=3,dy=-2  SW:dx=-2,dy=3  SE:dx=3,dy=3
    //   N:dx=0,dy=-2   S:dx=0,dy=3   W:dx=-2,dy=0   E:dx=3,dy=0
    _NPC_TEMPLATES: [
        // ── Tier 1 (difficulty 1-2): Ochiq qishloq, devor yo'q ────────────────
        {
            minDiff: 1, maxDiff: 2,
            variants: [
                [   // V1: Shimoliy mudofaa
                    { type:'archerTower', dx: 4, dy:-3, lv:1 },
                    { type:'archerTower', dx:-4, dy: 3, lv:1 },
                    { type:'farm',        dx: 3, dy: 4, lv:1 },
                    { type:'farm',        dx:-5, dy:-1, lv:1 },
                    { type:'goldStorage', dx:-2, dy:-5, lv:1 },
                    { type:'villa',       dx: 5, dy: 2, lv:1 },
                ],
                [   // V2: Janubiy mudofaa
                    { type:'archerTower', dx:-4, dy:-2, lv:1 },
                    { type:'farm',        dx: 4, dy: 3, lv:1 },
                    { type:'goldStorage', dx:-4, dy: 4, lv:1 },
                    { type:'villa',       dx: 3, dy:-4, lv:1 },
                    { type:'foodStorage', dx: 0, dy: 5, lv:1 },
                ],
                [   // V3: Keng tarqalgan qishloq — resurslar diagonal
                    { type:'archerTower', dx: 5, dy: 1, lv:1 },
                    { type:'archerTower', dx:-3, dy:-4, lv:1 },
                    { type:'farm',        dx: 2, dy:-5, lv:1 },
                    { type:'farm',        dx:-5, dy: 3, lv:1 },
                    { type:'goldStorage', dx: 4, dy:-3, lv:1 },
                    { type:'villa',       dx:-4, dy: 5, lv:1 },
                    { type:'foodStorage', dx:-1, dy: 5, lv:1 },
                ],
                [   // V4: Uchburchak mudofaa — 3 minora uchburchakda
                    { type:'archerTower', dx: 0, dy:-5, lv:1 },
                    { type:'archerTower', dx: 4, dy: 4, lv:1 },
                    { type:'archerTower', dx:-4, dy: 4, lv:1 },
                    { type:'farm',        dx:-4, dy:-2, lv:1 },
                    { type:'goldStorage', dx: 4, dy:-2, lv:1 },
                    { type:'villa',       dx: 0, dy: 3, lv:1 },
                    { type:'foodStorage', dx: 3, dy: 2, lv:1 },
                ],
            ]
        },
        // ── Tier 2 (difficulty 3-4): R=4 devor, mudofaa ICHIDA ────────────────
        // CoC uslub: 4 minora devor burchaklarida ICHKI tomonda
        {
            minDiff: 3, maxDiff: 4,
            variants: [
                [   // V1: Janubiy darvoza, 4 AT burchaklarda
                    // Devor: R=4 kvadrat (9×9 perimetr)
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
                    // Mudofaa — devor burchaklarida ICHKI tomonda
                    { type:'archerTower', dx:-2, dy:-2, lv:2 },  // NW ichki burchak
                    { type:'archerTower', dx: 3, dy:-2, lv:2 },  // NE ichki burchak
                    { type:'archerTower', dx:-2, dy: 3, lv:2 },  // SW ichki burchak
                    { type:'archerTower', dx: 3, dy: 3, lv:2 },  // SE ichki burchak
                    // Resurslar — devor TASHQARIDA
                    { type:'farm',        dx: 6, dy: 0, lv:1 },
                    { type:'farm',        dx:-6, dy: 0, lv:1 },
                    { type:'goldStorage', dx: 0, dy: 6, lv:1 },
                    { type:'villa',       dx: 0, dy:-6, lv:1 },
                    { type:'praetorium',  dx: 6, dy: 5, lv:1 },
                ],
                [   // V2: Shimoliy darvoza, 2 AT + 1 scorpio ichida
                    {type:'wall',dx:-4,dy:-4,lv:2},{type:'wall',dx:-3,dy:-4,lv:2},{type:'wall',dx:-2,dy:-4,lv:2},
                    {type:'wall',dx:-1,dy:-4,lv:2},{type:'gate',dx: 0,dy:-4,lv:2},{type:'wall',dx: 1,dy:-4,lv:2},
                    {type:'wall',dx: 2,dy:-4,lv:2},{type:'wall',dx: 3,dy:-4,lv:2},{type:'wall',dx: 4,dy:-4,lv:2},
                    {type:'wall',dx:-4,dy: 4,lv:2},{type:'wall',dx:-3,dy: 4,lv:2},{type:'wall',dx:-2,dy: 4,lv:2},
                    {type:'wall',dx:-1,dy: 4,lv:2},{type:'wall',dx: 0,dy: 4,lv:2},{type:'wall',dx: 1,dy: 4,lv:2},
                    {type:'wall',dx: 2,dy: 4,lv:2},{type:'wall',dx: 3,dy: 4,lv:2},{type:'wall',dx: 4,dy: 4,lv:2},
                    {type:'wall',dx:-4,dy:-3,lv:2},{type:'wall',dx:-4,dy:-2,lv:2},{type:'wall',dx:-4,dy:-1,lv:2},
                    {type:'wall',dx:-4,dy: 0,lv:2},{type:'wall',dx:-4,dy: 1,lv:2},{type:'wall',dx:-4,dy: 2,lv:2},
                    {type:'wall',dx:-4,dy: 3,lv:2},
                    {type:'wall',dx: 4,dy:-3,lv:2},{type:'wall',dx: 4,dy:-2,lv:2},{type:'wall',dx: 4,dy:-1,lv:2},
                    {type:'wall',dx: 4,dy: 0,lv:2},{type:'wall',dx: 4,dy: 1,lv:2},{type:'wall',dx: 4,dy: 2,lv:2},
                    {type:'wall',dx: 4,dy: 3,lv:2},
                    // Mudofaa ICHIDA
                    { type:'archerTower', dx: 3, dy:-2, lv:2 },  // NE
                    { type:'archerTower', dx:-2, dy: 3, lv:2 },  // SW
                    { type:'scorpio',     dx: 3, dy: 0, lv:1 },  // E o'rta
                    // Resurslar tashqarida
                    { type:'farm',        dx:-6, dy:-2, lv:1 },
                    { type:'goldStorage', dx: 6, dy: 2, lv:1 },
                    { type:'villa',       dx: 0, dy: 6, lv:1 },
                    { type:'foodStorage', dx:-5, dy: 5, lv:1 },
                    { type:'barracks',    dx: 5, dy:-5, lv:1 },
                ],
                [   // V3: Sharqiy darvoza, militsiya va scorpio ichida
                    {type:'wall',dx:-4,dy:-4,lv:2},{type:'wall',dx:-3,dy:-4,lv:2},{type:'wall',dx:-2,dy:-4,lv:2},
                    {type:'wall',dx:-1,dy:-4,lv:2},{type:'wall',dx: 0,dy:-4,lv:2},{type:'wall',dx: 1,dy:-4,lv:2},
                    {type:'wall',dx: 2,dy:-4,lv:2},{type:'wall',dx: 3,dy:-4,lv:2},{type:'wall',dx: 4,dy:-4,lv:2},
                    {type:'wall',dx:-4,dy: 4,lv:2},{type:'wall',dx:-3,dy: 4,lv:2},{type:'wall',dx:-2,dy: 4,lv:2},
                    {type:'wall',dx:-1,dy: 4,lv:2},{type:'wall',dx: 0,dy: 4,lv:2},{type:'wall',dx: 1,dy: 4,lv:2},
                    {type:'wall',dx: 2,dy: 4,lv:2},{type:'wall',dx: 3,dy: 4,lv:2},{type:'wall',dx: 4,dy: 4,lv:2},
                    {type:'wall',dx:-4,dy:-3,lv:2},{type:'wall',dx:-4,dy:-2,lv:2},{type:'wall',dx:-4,dy:-1,lv:2},
                    {type:'wall',dx:-4,dy: 0,lv:2},{type:'wall',dx:-4,dy: 1,lv:2},{type:'wall',dx:-4,dy: 2,lv:2},
                    {type:'wall',dx:-4,dy: 3,lv:2},
                    {type:'wall',dx: 4,dy:-3,lv:2},{type:'wall',dx: 4,dy:-2,lv:2},{type:'wall',dx: 4,dy:-1,lv:2},
                    {type:'gate',dx: 4,dy: 0,lv:2},{type:'wall',dx: 4,dy: 1,lv:2},{type:'wall',dx: 4,dy: 2,lv:2},
                    {type:'wall',dx: 4,dy: 3,lv:2},
                    // Mudofaa ICHIDA — NW + SW burchak + scorpio N
                    { type:'archerTower', dx:-2, dy:-2, lv:2 },  // NW ichki
                    { type:'archerTower', dx:-2, dy: 3, lv:2 },  // SW ichki
                    { type:'scorpio',     dx: 0, dy:-2, lv:1 },  // N o'rta
                    { type:'militia',     dx: 0, dy: 0, lv:1 },  // Markaz
                    // Resurslar tashqarida
                    { type:'farm',        dx: 6, dy: 3, lv:1 },
                    { type:'goldStorage', dx:-6, dy: 0, lv:1 },
                    { type:'villa',       dx: 0, dy:-6, lv:1 },
                    { type:'foodStorage', dx: 5, dy:-4, lv:1 },
                ],
            ]
        },
        // ── Tier 3 (difficulty 5-7): R=4 devor, to'liq ichki mudofaa ───────────
        // 4 AT burchaklarda + 2 scorpio yonlarda, hammasi ICHDA
        {
            minDiff: 5, maxDiff: 7,
            variants: [
                [   // V1: Janubiy darvoza, 4 AT + 2 scorpio
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
                    // Mudofaa — devor ICHIDA
                    { type:'archerTower', dx:-2, dy:-2, lv:3 },  // NW burchak
                    { type:'archerTower', dx: 3, dy:-2, lv:3 },  // NE burchak
                    { type:'archerTower', dx:-2, dy: 3, lv:3 },  // SW burchak
                    { type:'archerTower', dx: 3, dy: 3, lv:3 },  // SE burchak
                    { type:'scorpio',     dx:-2, dy: 0, lv:2 },  // W o'rta
                    { type:'scorpio',     dx: 3, dy: 0, lv:2 },  // E o'rta
                    { type:'spikeTrap',   dx: 0, dy:-3, lv:2 },
                    { type:'spikeTrap',   dx: 0, dy: 2, lv:2 },
                    // Resurslar tashqarida
                    { type:'farm',        dx: 6, dy: 2, lv:2 },
                    { type:'farm',        dx:-6, dy:-2, lv:2 },
                    { type:'goldStorage', dx: 2, dy: 6, lv:2 },
                    { type:'goldStorage', dx:-2, dy:-6, lv:2 },
                    { type:'villa',       dx: 6, dy:-3, lv:2 },
                    { type:'foodStorage', dx:-6, dy: 3, lv:2 },
                    { type:'barracks',    dx: 0, dy: 7, lv:2 },
                    { type:'praetorium',  dx: 0, dy:-7, lv:1 },
                ],
                [   // V2: G'arbiy darvoza, 4 AT + N va S o'rtada scorpio
                    {type:'wall',dx:-4,dy:-4,lv:3},{type:'wall',dx:-3,dy:-4,lv:3},{type:'wall',dx:-2,dy:-4,lv:3},
                    {type:'wall',dx:-1,dy:-4,lv:3},{type:'wall',dx: 0,dy:-4,lv:3},{type:'wall',dx: 1,dy:-4,lv:3},
                    {type:'wall',dx: 2,dy:-4,lv:3},{type:'wall',dx: 3,dy:-4,lv:3},{type:'wall',dx: 4,dy:-4,lv:3},
                    {type:'wall',dx:-4,dy: 4,lv:3},{type:'wall',dx:-3,dy: 4,lv:3},{type:'wall',dx:-2,dy: 4,lv:3},
                    {type:'wall',dx:-1,dy: 4,lv:3},{type:'wall',dx: 0,dy: 4,lv:3},{type:'wall',dx: 1,dy: 4,lv:3},
                    {type:'wall',dx: 2,dy: 4,lv:3},{type:'wall',dx: 3,dy: 4,lv:3},{type:'wall',dx: 4,dy: 4,lv:3},
                    {type:'wall',dx:-4,dy:-3,lv:3},{type:'wall',dx:-4,dy:-2,lv:3},{type:'wall',dx:-4,dy:-1,lv:3},
                    {type:'gate',dx:-4,dy: 0,lv:3},{type:'wall',dx:-4,dy: 1,lv:3},{type:'wall',dx:-4,dy: 2,lv:3},
                    {type:'wall',dx:-4,dy: 3,lv:3},
                    {type:'wall',dx: 4,dy:-3,lv:3},{type:'wall',dx: 4,dy:-2,lv:3},{type:'wall',dx: 4,dy:-1,lv:3},
                    {type:'wall',dx: 4,dy: 0,lv:3},{type:'wall',dx: 4,dy: 1,lv:3},{type:'wall',dx: 4,dy: 2,lv:3},
                    {type:'wall',dx: 4,dy: 3,lv:3},
                    // Mudofaa ICHIDA
                    { type:'archerTower', dx:-2, dy:-2, lv:4 },
                    { type:'archerTower', dx: 3, dy:-2, lv:4 },
                    { type:'archerTower', dx:-2, dy: 3, lv:4 },
                    { type:'archerTower', dx: 3, dy: 3, lv:4 },
                    { type:'scorpio',     dx: 0, dy:-2, lv:3 },  // N o'rta
                    { type:'scorpio',     dx: 0, dy: 3, lv:3 },  // S o'rta
                    { type:'spikeTrap',   dx:-3, dy:-3, lv:2 },
                    { type:'spikeTrap',   dx: 2, dy: 2, lv:2 },
                    { type:'alchemicalTrap', dx: 3, dy:-3, lv:2 },
                    // Resurslar tashqarida
                    { type:'farm',        dx: 7, dy: 0, lv:2 },
                    { type:'farm',        dx:-7, dy: 3, lv:2 },
                    { type:'goldStorage', dx:-7, dy:-3, lv:2 },
                    { type:'foodStorage', dx: 0, dy: 7, lv:2 },
                    { type:'villa',       dx: 5, dy: 5, lv:2 },
                    { type:'barracks',    dx:-5, dy: 5, lv:2 },
                ],
                [   // V3: Uch kamera — TH markaz + shimol/janub alohida AT xonalari
                    // Asosiy R=4 devor
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
                    // Shimoliy mini-xona (AT uchun)
                    {type:'wall',dx:-1,dy:-6,lv:3},{type:'wall',dx: 0,dy:-6,lv:3},{type:'wall',dx: 1,dy:-6,lv:3},
                    {type:'wall',dx: 2,dy:-6,lv:3},{type:'wall',dx: 2,dy:-5,lv:3},{type:'gate',dx:-1,dy:-5,lv:3},
                    {type:'wall',dx: 1,dy:-5,lv:3},
                    // Janubiy mini-xona
                    {type:'wall',dx:-1,dy: 6,lv:3},{type:'wall',dx: 0,dy: 6,lv:3},{type:'wall',dx: 1,dy: 6,lv:3},
                    {type:'wall',dx: 2,dy: 6,lv:3},{type:'wall',dx: 2,dy: 5,lv:3},{type:'gate',dx:-1,dy: 5,lv:3},
                    {type:'wall',dx: 1,dy: 5,lv:3},
                    // Mudofaa asosiy ichida
                    { type:'archerTower', dx:-2, dy:-2, lv:4 },
                    { type:'archerTower', dx: 3, dy:-2, lv:4 },
                    { type:'archerTower', dx:-2, dy: 3, lv:4 },
                    { type:'archerTower', dx: 3, dy: 3, lv:4 },
                    { type:'scorpio',     dx:-2, dy: 0, lv:3 },
                    { type:'scorpio',     dx: 3, dy: 0, lv:3 },
                    { type:'militia',     dx: 0, dy: 0, lv:2 },
                    { type:'spikeTrap',   dx: 0, dy:-3, lv:3 },
                    { type:'spikeTrap',   dx: 0, dy: 2, lv:3 },
                    // Resurslar tashqarida
                    { type:'goldStorage', dx: 7, dy: 3, lv:3 },
                    { type:'goldStorage', dx:-7, dy:-3, lv:3 },
                    { type:'foodStorage', dx: 3, dy: 7, lv:3 },
                    { type:'foodStorage', dx:-3, dy:-7, lv:3 },
                    { type:'villa',       dx: 6, dy: 0, lv:2 },
                    { type:'farm',        dx:-6, dy: 0, lv:2 },
                    { type:'barracks',    dx: 0, dy:-7, lv:2 },
                    { type:'praetorium',  dx: 1, dy:-1, lv:2 },
                ],
            ]
        },
        // ── Tier 4 (difficulty 8-12): Qo'sh halqa qal'a (R=3 ichki + R=6 tashqi) ──
        // Mudofaa ikkala halqa ORASIDA, resurslar TASHQARIDA
        {
            minDiff: 8, maxDiff: 12,
            variants: [
                [   // V1: Qo'sh halqa, 8 ta mudofaa o'ralgan
                    // Ichki devor R=3 (TH atrofi, faqat TH ichida)
                    { type:'wall', dx:-3, dy:-3, lv:5 }, { type:'wall', dx:-2, dy:-3, lv:5 },
                    { type:'wall', dx:-1, dy:-3, lv:5 }, { type:'wall', dx: 0, dy:-3, lv:5 },
                    { type:'wall', dx: 1, dy:-3, lv:5 }, { type:'wall', dx: 2, dy:-3, lv:5 },
                    { type:'wall', dx: 3, dy:-3, lv:5 }, { type:'wall', dx: 3, dy:-2, lv:5 },
                    { type:'wall', dx: 3, dy:-1, lv:5 }, { type:'wall', dx: 3, dy: 0, lv:5 },
                    { type:'wall', dx: 3, dy: 1, lv:5 }, { type:'wall', dx: 3, dy: 2, lv:5 },
                    { type:'wall', dx: 3, dy: 3, lv:5 }, { type:'wall', dx: 2, dy: 3, lv:5 },
                    { type:'wall', dx: 1, dy: 3, lv:5 }, { type:'gate', dx: 0, dy: 3, lv:5 },
                    { type:'wall', dx:-1, dy: 3, lv:5 }, { type:'wall', dx:-2, dy: 3, lv:5 },
                    { type:'wall', dx:-3, dy: 3, lv:5 }, { type:'wall', dx:-3, dy: 2, lv:5 },
                    { type:'wall', dx:-3, dy: 1, lv:5 }, { type:'wall', dx:-3, dy: 0, lv:5 },
                    { type:'wall', dx:-3, dy:-1, lv:5 }, { type:'wall', dx:-3, dy:-2, lv:5 },
                    // Tashqi devor R=6 (13×13 perimetr)
                    {type:'wall',dx:-6,dy:-6,lv:4},{type:'wall',dx:-5,dy:-6,lv:4},{type:'wall',dx:-4,dy:-6,lv:4},
                    {type:'wall',dx:-3,dy:-6,lv:4},{type:'wall',dx:-2,dy:-6,lv:4},{type:'wall',dx:-1,dy:-6,lv:4},
                    {type:'wall',dx: 0,dy:-6,lv:4},{type:'wall',dx: 1,dy:-6,lv:4},{type:'wall',dx: 2,dy:-6,lv:4},
                    {type:'wall',dx: 3,dy:-6,lv:4},{type:'wall',dx: 4,dy:-6,lv:4},{type:'wall',dx: 5,dy:-6,lv:4},
                    {type:'wall',dx: 6,dy:-6,lv:4},
                    {type:'wall',dx:-6,dy: 6,lv:4},{type:'wall',dx:-5,dy: 6,lv:4},{type:'wall',dx:-4,dy: 6,lv:4},
                    {type:'wall',dx:-3,dy: 6,lv:4},{type:'wall',dx:-2,dy: 6,lv:4},{type:'wall',dx:-1,dy: 6,lv:4},
                    {type:'gate',dx: 0,dy: 6,lv:4},{type:'wall',dx: 1,dy: 6,lv:4},{type:'wall',dx: 2,dy: 6,lv:4},
                    {type:'wall',dx: 3,dy: 6,lv:4},{type:'wall',dx: 4,dy: 6,lv:4},{type:'wall',dx: 5,dy: 6,lv:4},
                    {type:'wall',dx: 6,dy: 6,lv:4},
                    {type:'wall',dx:-6,dy:-5,lv:4},{type:'wall',dx:-6,dy:-4,lv:4},{type:'wall',dx:-6,dy:-3,lv:4},
                    {type:'wall',dx:-6,dy:-2,lv:4},{type:'wall',dx:-6,dy:-1,lv:4},{type:'wall',dx:-6,dy: 0,lv:4},
                    {type:'wall',dx:-6,dy: 1,lv:4},{type:'wall',dx:-6,dy: 2,lv:4},{type:'wall',dx:-6,dy: 3,lv:4},
                    {type:'wall',dx:-6,dy: 4,lv:4},{type:'wall',dx:-6,dy: 5,lv:4},
                    {type:'wall',dx: 6,dy:-5,lv:4},{type:'wall',dx: 6,dy:-4,lv:4},{type:'wall',dx: 6,dy:-3,lv:4},
                    {type:'wall',dx: 6,dy:-2,lv:4},{type:'wall',dx: 6,dy:-1,lv:4},{type:'wall',dx: 6,dy: 0,lv:4},
                    {type:'wall',dx: 6,dy: 1,lv:4},{type:'wall',dx: 6,dy: 2,lv:4},{type:'wall',dx: 6,dy: 3,lv:4},
                    {type:'wall',dx: 6,dy: 4,lv:4},{type:'wall',dx: 6,dy: 5,lv:4},
                    // Mudofaa — ikkala halqa ORASIDA (R≈4..5)
                    { type:'archerTower', dx:-4, dy:-4, lv:5 },  // NW
                    { type:'archerTower', dx: 5, dy:-4, lv:5 },  // NE
                    { type:'archerTower', dx:-4, dy: 5, lv:5 },  // SW
                    { type:'archerTower', dx: 5, dy: 5, lv:5 },  // SE
                    { type:'archerTower', dx: 0, dy:-4, lv:5 },  // N o'rta
                    { type:'archerTower', dx: 0, dy: 5, lv:5 },  // S o'rta
                    { type:'scorpio',     dx:-4, dy: 0, lv:4 },  // W o'rta
                    { type:'scorpio',     dx: 5, dy: 0, lv:4 },  // E o'rta
                    { type:'scorpio',     dx:-4, dy:-2, lv:4 },
                    { type:'scorpio',     dx: 5, dy: 2, lv:4 },
                    { type:'militia',     dx: 1, dy:-1, lv:3 },
                    { type:'spikeTrap',   dx: 4, dy:-3, lv:3 },
                    { type:'spikeTrap',   dx:-3, dy: 4, lv:3 },
                    { type:'alchemicalTrap', dx: 4, dy: 3, lv:3 },
                    // Resurslar tashqi R=6 dan tashqarida
                    { type:'farm',        dx: 8, dy: 0, lv:4 },
                    { type:'farm',        dx:-8, dy: 0, lv:4 },
                    { type:'goldStorage', dx: 0, dy: 8, lv:4 },
                    { type:'goldStorage', dx: 0, dy:-8, lv:4 },
                    { type:'villa',       dx: 8, dy: 5, lv:3 },
                    { type:'villa',       dx:-8, dy:-5, lv:3 },
                    { type:'foodStorage', dx: 5, dy: 8, lv:4 },
                    { type:'foodStorage', dx:-5, dy:-8, lv:4 },
                    { type:'barracks',    dx: 8, dy:-5, lv:3 },
                    { type:'praetorium',  dx:-8, dy: 5, lv:3 },
                ],
                [   // V2: Diagonal ichki + to'rt resurs xonasi (R=3 inner, R=6 outer)
                    // Ichki R=3 devor
                    {type:'wall',dx:-3,dy:-3,lv:5},{type:'wall',dx:-2,dy:-3,lv:5},{type:'wall',dx:-1,dy:-3,lv:5},
                    {type:'wall',dx: 0,dy:-3,lv:5},{type:'wall',dx: 1,dy:-3,lv:5},{type:'wall',dx: 2,dy:-3,lv:5},
                    {type:'wall',dx: 3,dy:-3,lv:5},{type:'wall',dx: 3,dy:-2,lv:5},{type:'wall',dx: 3,dy:-1,lv:5},
                    {type:'wall',dx: 3,dy: 0,lv:5},{type:'wall',dx: 3,dy: 1,lv:5},{type:'wall',dx: 3,dy: 2,lv:5},
                    {type:'wall',dx: 3,dy: 3,lv:5},{type:'wall',dx: 2,dy: 3,lv:5},{type:'wall',dx: 1,dy: 3,lv:5},
                    {type:'gate',dx: 0,dy: 3,lv:5},{type:'wall',dx:-1,dy: 3,lv:5},{type:'wall',dx:-2,dy: 3,lv:5},
                    {type:'wall',dx:-3,dy: 3,lv:5},{type:'wall',dx:-3,dy: 2,lv:5},{type:'wall',dx:-3,dy: 1,lv:5},
                    {type:'wall',dx:-3,dy: 0,lv:5},{type:'wall',dx:-3,dy:-1,lv:5},{type:'wall',dx:-3,dy:-2,lv:5},
                    // Tashqi R=6 devor
                    {type:'wall',dx:-6,dy:-6,lv:4},{type:'wall',dx:-5,dy:-6,lv:4},{type:'wall',dx:-4,dy:-6,lv:4},
                    {type:'wall',dx:-3,dy:-6,lv:4},{type:'wall',dx:-2,dy:-6,lv:4},{type:'wall',dx:-1,dy:-6,lv:4},
                    {type:'wall',dx: 0,dy:-6,lv:4},{type:'wall',dx: 1,dy:-6,lv:4},{type:'wall',dx: 2,dy:-6,lv:4},
                    {type:'wall',dx: 3,dy:-6,lv:4},{type:'wall',dx: 4,dy:-6,lv:4},{type:'wall',dx: 5,dy:-6,lv:4},
                    {type:'wall',dx: 6,dy:-6,lv:4},
                    {type:'wall',dx:-6,dy: 6,lv:4},{type:'wall',dx:-5,dy: 6,lv:4},{type:'wall',dx:-4,dy: 6,lv:4},
                    {type:'wall',dx:-3,dy: 6,lv:4},{type:'wall',dx:-2,dy: 6,lv:4},{type:'wall',dx:-1,dy: 6,lv:4},
                    {type:'gate',dx: 0,dy: 6,lv:4},{type:'wall',dx: 1,dy: 6,lv:4},{type:'wall',dx: 2,dy: 6,lv:4},
                    {type:'wall',dx: 3,dy: 6,lv:4},{type:'wall',dx: 4,dy: 6,lv:4},{type:'wall',dx: 5,dy: 6,lv:4},
                    {type:'wall',dx: 6,dy: 6,lv:4},
                    {type:'wall',dx:-6,dy:-5,lv:4},{type:'wall',dx:-6,dy:-4,lv:4},{type:'wall',dx:-6,dy:-3,lv:4},
                    {type:'wall',dx:-6,dy:-2,lv:4},{type:'wall',dx:-6,dy:-1,lv:4},{type:'wall',dx:-6,dy: 0,lv:4},
                    {type:'wall',dx:-6,dy: 1,lv:4},{type:'wall',dx:-6,dy: 2,lv:4},{type:'wall',dx:-6,dy: 3,lv:4},
                    {type:'wall',dx:-6,dy: 4,lv:4},{type:'wall',dx:-6,dy: 5,lv:4},
                    {type:'wall',dx: 6,dy:-5,lv:4},{type:'wall',dx: 6,dy:-4,lv:4},{type:'wall',dx: 6,dy:-3,lv:4},
                    {type:'wall',dx: 6,dy:-2,lv:4},{type:'wall',dx: 6,dy:-1,lv:4},{type:'wall',dx: 6,dy: 0,lv:4},
                    {type:'wall',dx: 6,dy: 1,lv:4},{type:'wall',dx: 6,dy: 2,lv:4},{type:'wall',dx: 6,dy: 3,lv:4},
                    {type:'wall',dx: 6,dy: 4,lv:4},{type:'wall',dx: 6,dy: 5,lv:4},
                    // Mudofaa — halqalar orasida
                    { type:'archerTower', dx:-4, dy:-4, lv:5 },
                    { type:'archerTower', dx: 5, dy:-4, lv:5 },
                    { type:'archerTower', dx:-4, dy: 5, lv:5 },
                    { type:'archerTower', dx: 5, dy: 5, lv:5 },
                    { type:'archerTower', dx:-4, dy: 0, lv:5 },
                    { type:'archerTower', dx: 5, dy: 0, lv:5 },
                    { type:'scorpio',     dx: 0, dy:-4, lv:4 },
                    { type:'scorpio',     dx: 0, dy: 5, lv:4 },
                    { type:'scorpio',     dx:-2, dy:-4, lv:4 },
                    { type:'scorpio',     dx: 3, dy: 5, lv:4 },
                    { type:'militia',     dx:-1, dy: 1, lv:3 },
                    { type:'spikeTrap',   dx: 4, dy:-2, lv:3 },
                    { type:'spikeTrap',   dx:-3, dy: 3, lv:3 },
                    { type:'alchemicalTrap', dx:-4, dy: 3, lv:3 },
                    // Resurslar tashqarida
                    { type:'goldStorage', dx: 8, dy:-1, lv:4 },
                    { type:'goldStorage', dx:-7, dy: 1, lv:4 },
                    { type:'foodStorage', dx: 1, dy: 7, lv:4 },
                    { type:'foodStorage', dx:-1, dy:-7, lv:4 },
                    { type:'villa',       dx: 6, dy:-5, lv:3 },
                    { type:'villa',       dx:-6, dy: 5, lv:3 },
                    { type:'farm',        dx: 6, dy: 5, lv:3 },
                    { type:'farm',        dx:-6, dy:-5, lv:3 },
                    { type:'barracks',    dx: 0, dy:-7, lv:3 },
                ],
                [   // V3: "Shimol-Janub qo'sh qanot" — asosiy R=3 + R=6 + 2 resurs xona
                    // Ichki R=3 devor
                    {type:'wall',dx:-3,dy:-3,lv:6},{type:'wall',dx:-2,dy:-3,lv:6},{type:'wall',dx:-1,dy:-3,lv:6},
                    {type:'wall',dx: 0,dy:-3,lv:6},{type:'wall',dx: 1,dy:-3,lv:6},{type:'wall',dx: 2,dy:-3,lv:6},
                    {type:'wall',dx: 3,dy:-3,lv:6},{type:'wall',dx: 3,dy:-2,lv:6},{type:'wall',dx: 3,dy:-1,lv:6},
                    {type:'wall',dx: 3,dy: 0,lv:6},{type:'wall',dx: 3,dy: 1,lv:6},{type:'wall',dx: 3,dy: 2,lv:6},
                    {type:'wall',dx: 3,dy: 3,lv:6},{type:'wall',dx: 2,dy: 3,lv:6},{type:'wall',dx: 1,dy: 3,lv:6},
                    {type:'gate',dx: 0,dy: 3,lv:6},{type:'wall',dx:-1,dy: 3,lv:6},{type:'wall',dx:-2,dy: 3,lv:6},
                    {type:'wall',dx:-3,dy: 3,lv:6},{type:'wall',dx:-3,dy: 2,lv:6},{type:'wall',dx:-3,dy: 1,lv:6},
                    {type:'wall',dx:-3,dy: 0,lv:6},{type:'wall',dx:-3,dy:-1,lv:6},{type:'wall',dx:-3,dy:-2,lv:6},
                    // Tashqi R=6 devor
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
                    // Mudofaa — halqalar orasida
                    { type:'archerTower', dx:-4, dy:-4, lv:6 },
                    { type:'archerTower', dx: 5, dy:-4, lv:6 },
                    { type:'archerTower', dx:-4, dy: 5, lv:6 },
                    { type:'archerTower', dx: 5, dy: 5, lv:6 },
                    { type:'archerTower', dx: 0, dy:-4, lv:6 },
                    { type:'archerTower', dx: 0, dy: 5, lv:6 },
                    { type:'scorpio',     dx:-4, dy: 0, lv:5 },
                    { type:'scorpio',     dx: 5, dy: 0, lv:5 },
                    { type:'scorpio',     dx:-2, dy:-4, lv:5 },
                    { type:'scorpio',     dx: 3, dy: 5, lv:5 },
                    { type:'militia',     dx: 1, dy:-1, lv:4 },
                    { type:'militia',     dx:-1, dy: 1, lv:4 },
                    { type:'spikeTrap',   dx: 4, dy:-2, lv:4 },
                    { type:'spikeTrap',   dx:-3, dy: 3, lv:4 },
                    { type:'alchemicalTrap', dx: 4, dy: 2, lv:3 },
                    { type:'alchemicalTrap', dx:-4, dy:-2, lv:3 },
                    // Resurslar tashqarida
                    { type:'goldStorage', dx: 8, dy: 0, lv:5 },
                    { type:'goldStorage', dx:-8, dy: 0, lv:5 },
                    { type:'foodStorage', dx: 0, dy: 8, lv:5 },
                    { type:'foodStorage', dx: 0, dy:-8, lv:5 },
                    { type:'villa',       dx: 7, dy: 4, lv:4 },
                    { type:'villa',       dx:-7, dy:-4, lv:4 },
                    { type:'farm',        dx: 4, dy:-7, lv:4 },
                    { type:'farm',        dx:-4, dy: 7, lv:4 },
                    { type:'barracks',    dx: 8, dy:-5, lv:4 },
                    { type:'praetorium',  dx:-8, dy: 5, lv:3 },
                ],
            ]
        },
        // ── Tier 5 (difficulty 13+): Boss qal'a (R=3 ichki + R=7 tashqi) ──────
        // Mudofaa halqalar orasida (R≈5..6), resurslar butunlay tashqarida
        {
            minDiff: 13, maxDiff: 99,
            variants: [
                [   // V1: Klassik boss (ko'p AT + scorpio o'ralgan)
                    // Ichki R=3 devor
                    { type:'wall', dx:-3, dy:-3, lv:8 }, { type:'wall', dx:-2, dy:-3, lv:8 },
                    { type:'wall', dx:-1, dy:-3, lv:8 }, { type:'wall', dx: 0, dy:-3, lv:8 },
                    { type:'wall', dx: 1, dy:-3, lv:8 }, { type:'wall', dx: 2, dy:-3, lv:8 },
                    { type:'wall', dx: 3, dy:-3, lv:8 }, { type:'wall', dx: 3, dy:-2, lv:8 },
                    { type:'wall', dx: 3, dy:-1, lv:8 }, { type:'wall', dx: 3, dy: 0, lv:8 },
                    { type:'wall', dx: 3, dy: 1, lv:8 }, { type:'wall', dx: 3, dy: 2, lv:8 },
                    { type:'wall', dx: 3, dy: 3, lv:8 }, { type:'wall', dx: 2, dy: 3, lv:8 },
                    { type:'wall', dx: 1, dy: 3, lv:8 }, { type:'gate', dx: 0, dy: 3, lv:8 },
                    { type:'wall', dx:-1, dy: 3, lv:8 }, { type:'wall', dx:-2, dy: 3, lv:8 },
                    { type:'wall', dx:-3, dy: 3, lv:8 }, { type:'wall', dx:-3, dy: 2, lv:8 },
                    { type:'wall', dx:-3, dy: 1, lv:8 }, { type:'wall', dx:-3, dy: 0, lv:8 },
                    { type:'wall', dx:-3, dy:-1, lv:8 }, { type:'wall', dx:-3, dy:-2, lv:8 },
                    // Tashqi R=7 devor
                    { type:'wall', dx:-7, dy:-7, lv:7 }, { type:'wall', dx:-6, dy:-7, lv:7 },
                    { type:'wall', dx:-5, dy:-7, lv:7 }, { type:'wall', dx:-4, dy:-7, lv:7 },
                    { type:'wall', dx:-3, dy:-7, lv:7 }, { type:'wall', dx:-2, dy:-7, lv:7 },
                    { type:'wall', dx:-1, dy:-7, lv:7 }, { type:'wall', dx: 0, dy:-7, lv:7 },
                    { type:'wall', dx: 1, dy:-7, lv:7 }, { type:'wall', dx: 2, dy:-7, lv:7 },
                    { type:'wall', dx: 3, dy:-7, lv:7 }, { type:'wall', dx: 4, dy:-7, lv:7 },
                    { type:'wall', dx: 5, dy:-7, lv:7 }, { type:'wall', dx: 6, dy:-7, lv:7 },
                    { type:'wall', dx: 7, dy:-7, lv:7 }, { type:'wall', dx: 7, dy:-6, lv:7 },
                    { type:'wall', dx: 7, dy:-5, lv:7 }, { type:'wall', dx: 7, dy:-4, lv:7 },
                    { type:'wall', dx: 7, dy:-3, lv:7 }, { type:'wall', dx: 7, dy:-2, lv:7 },
                    { type:'wall', dx: 7, dy:-1, lv:7 }, { type:'wall', dx: 7, dy: 0, lv:7 },
                    { type:'wall', dx: 7, dy: 1, lv:7 }, { type:'wall', dx: 7, dy: 2, lv:7 },
                    { type:'wall', dx: 7, dy: 3, lv:7 }, { type:'wall', dx: 7, dy: 4, lv:7 },
                    { type:'wall', dx: 7, dy: 5, lv:7 }, { type:'wall', dx: 7, dy: 6, lv:7 },
                    { type:'wall', dx: 7, dy: 7, lv:7 }, { type:'wall', dx: 6, dy: 7, lv:7 },
                    { type:'wall', dx: 5, dy: 7, lv:7 }, { type:'wall', dx: 4, dy: 7, lv:7 },
                    { type:'wall', dx: 3, dy: 7, lv:7 }, { type:'wall', dx: 2, dy: 7, lv:7 },
                    { type:'wall', dx: 1, dy: 7, lv:7 }, { type:'wall', dx: 0, dy: 7, lv:7 },
                    { type:'wall', dx:-1, dy: 7, lv:7 }, { type:'wall', dx:-2, dy: 7, lv:7 },
                    { type:'wall', dx:-3, dy: 7, lv:7 }, { type:'wall', dx:-4, dy: 7, lv:7 },
                    { type:'wall', dx:-5, dy: 7, lv:7 }, { type:'wall', dx:-6, dy: 7, lv:7 },
                    { type:'wall', dx:-7, dy: 7, lv:7 }, { type:'wall', dx:-7, dy: 6, lv:7 },
                    { type:'wall', dx:-7, dy: 5, lv:7 }, { type:'wall', dx:-7, dy: 4, lv:7 },
                    { type:'wall', dx:-7, dy: 3, lv:7 }, { type:'wall', dx:-7, dy: 2, lv:7 },
                    { type:'wall', dx:-7, dy: 1, lv:7 }, { type:'wall', dx:-7, dy: 0, lv:7 },
                    { type:'wall', dx:-7, dy:-1, lv:7 }, { type:'wall', dx:-7, dy:-2, lv:7 },
                    { type:'wall', dx:-7, dy:-3, lv:7 }, { type:'wall', dx:-7, dy:-4, lv:7 },
                    { type:'wall', dx:-7, dy:-5, lv:7 }, { type:'wall', dx:-7, dy:-6, lv:7 },
                    // Mudofaa to'liq joylashtirilgan
                    { type:'archerTower', dx: 5, dy:-5, lv:8 },
                    { type:'archerTower', dx:-5, dy: 5, lv:8 },
                    { type:'archerTower', dx: 5, dy: 5, lv:8 },
                    { type:'archerTower', dx:-5, dy:-5, lv:8 },
                    { type:'archerTower', dx: 0, dy:-5, lv:7 },
                    { type:'archerTower', dx: 0, dy: 5, lv:7 },
                    { type:'scorpio',     dx: 5, dy: 0, lv:7 },
                    { type:'scorpio',     dx:-5, dy: 0, lv:7 },
                    { type:'scorpio',     dx: 2, dy:-5, lv:6 },
                    { type:'militia',     dx: 1, dy:-1, lv:5 },
                    { type:'militia',     dx:-1, dy: 1, lv:5 },
                    { type:'spikeTrap',   dx: 4, dy: 0, lv:5 },
                    { type:'spikeTrap',   dx:-4, dy: 0, lv:5 },
                    { type:'spikeTrap',   dx: 0, dy: 4, lv:5 },
                    { type:'spikeTrap',   dx: 0, dy:-4, lv:5 },
                    { type:'alchemicalTrap', dx: 5, dy: 2, lv:4 },
                    { type:'alchemicalTrap', dx:-5, dy:-2, lv:4 },
                    // Resurslar perimetrda
                    { type:'farm',        dx: 9, dy: 0, lv:7 },
                    { type:'farm',        dx:-9, dy: 0, lv:7 },
                    { type:'farm',        dx: 0, dy: 9, lv:7 },
                    { type:'goldStorage', dx: 0, dy:-9, lv:7 },
                    { type:'goldStorage', dx: 8, dy: 5, lv:6 },
                    { type:'goldStorage', dx:-8, dy:-5, lv:6 },
                    { type:'villa',       dx: 8, dy:-5, lv:5 },
                    { type:'villa',       dx:-8, dy: 5, lv:5 },
                    { type:'foodStorage', dx: 5, dy: 8, lv:6 },
                    { type:'foodStorage', dx:-5, dy:-8, lv:6 },
                    { type:'barracks',    dx: 5, dy:-8, lv:5 },
                    { type:'barracks',    dx:-5, dy: 8, lv:5 },
                    { type:'praetorium',  dx: 4, dy: 4, lv:5 },
                ],
                [   // V2: Boss variant 2 — R=3 + R=7, ko'p AT diagonal
                    // Ichki R=3 devor
                    { type:'wall', dx:-3, dy:-3, lv:9 }, { type:'wall', dx:-2, dy:-3, lv:9 },
                    { type:'wall', dx:-1, dy:-3, lv:9 }, { type:'wall', dx: 0, dy:-3, lv:9 },
                    { type:'wall', dx: 1, dy:-3, lv:9 }, { type:'wall', dx: 2, dy:-3, lv:9 },
                    { type:'wall', dx: 3, dy:-3, lv:9 }, { type:'wall', dx: 3, dy:-2, lv:9 },
                    { type:'wall', dx: 3, dy:-1, lv:9 }, { type:'wall', dx: 3, dy: 0, lv:9 },
                    { type:'wall', dx: 3, dy: 1, lv:9 }, { type:'wall', dx: 3, dy: 2, lv:9 },
                    { type:'wall', dx: 3, dy: 3, lv:9 }, { type:'wall', dx: 2, dy: 3, lv:9 },
                    { type:'wall', dx: 1, dy: 3, lv:9 }, { type:'gate', dx: 0, dy: 3, lv:9 },
                    { type:'wall', dx:-1, dy: 3, lv:9 }, { type:'wall', dx:-2, dy: 3, lv:9 },
                    { type:'wall', dx:-3, dy: 3, lv:9 }, { type:'wall', dx:-3, dy: 2, lv:9 },
                    { type:'wall', dx:-3, dy: 1, lv:9 }, { type:'wall', dx:-3, dy: 0, lv:9 },
                    { type:'wall', dx:-3, dy:-1, lv:9 }, { type:'wall', dx:-3, dy:-2, lv:9 },
                    // Tashqi R=7 devor
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
                    // Mudofaa — R=3 va R=7 orasida (R≈5..6)
                    { type:'archerTower', dx:-5, dy:-5, lv:9 },  // NW
                    { type:'archerTower', dx: 6, dy:-5, lv:9 },  // NE
                    { type:'archerTower', dx:-5, dy: 6, lv:9 },  // SW
                    { type:'archerTower', dx: 6, dy: 6, lv:9 },  // SE
                    { type:'archerTower', dx: 0, dy:-5, lv:9 },  // N mid
                    { type:'archerTower', dx: 0, dy: 6, lv:9 },  // S mid
                    { type:'archerTower', dx:-5, dy: 0, lv:9 },  // W mid
                    { type:'archerTower', dx: 6, dy: 0, lv:9 },  // E mid
                    { type:'scorpio',     dx:-3, dy:-5, lv:8 },
                    { type:'scorpio',     dx: 4, dy: 6, lv:8 },
                    { type:'scorpio',     dx:-5, dy: 3, lv:8 },
                    { type:'scorpio',     dx: 6, dy:-3, lv:8 },
                    { type:'scorpio',     dx:-5, dy:-2, lv:8 },
                    { type:'scorpio',     dx: 6, dy: 3, lv:8 },
                    { type:'militia',     dx: 1, dy:-1, lv:7 },
                    { type:'militia',     dx:-1, dy: 1, lv:7 },
                    { type:'spikeTrap',   dx: 4, dy:-4, lv:6 },
                    { type:'spikeTrap',   dx:-3, dy: 5, lv:6 },
                    { type:'spikeTrap',   dx:-4, dy:-4, lv:6 },
                    { type:'spikeTrap',   dx: 5, dy: 5, lv:6 },
                    { type:'alchemicalTrap', dx: 5, dy:-2, lv:5 },
                    { type:'alchemicalTrap', dx:-4, dy: 3, lv:5 },
                    // Resurslar tashqi R=7 dan tashqarida
                    { type:'farm',        dx: 9, dy: 0, lv:8 },
                    { type:'farm',        dx:-9, dy: 0, lv:8 },
                    { type:'farm',        dx: 0, dy: 9, lv:8 },
                    { type:'goldStorage', dx: 0, dy:-9, lv:8 },
                    { type:'goldStorage', dx: 9, dy: 5, lv:7 },
                    { type:'goldStorage', dx:-9, dy:-5, lv:7 },
                    { type:'villa',       dx: 9, dy:-4, lv:7 },
                    { type:'villa',       dx:-9, dy: 4, lv:7 },
                    { type:'foodStorage', dx: 5, dy: 9, lv:7 },
                    { type:'foodStorage', dx:-5, dy:-9, lv:7 },
                    { type:'barracks',    dx: 9, dy:-7, lv:6 },
                    { type:'barracks',    dx:-9, dy: 7, lv:6 },
                    { type:'praetorium',  dx: 5, dy: 2, lv:7 },
                ],
                [   // V3: Imperator — maksimal boss, R=3+R=7 asimmetrik
                    // Ichki R=3 devor
                    { type:'wall', dx:-3, dy:-3, lv:10 }, { type:'wall', dx:-2, dy:-3, lv:10 },
                    { type:'wall', dx:-1, dy:-3, lv:10 }, { type:'wall', dx: 0, dy:-3, lv:10 },
                    { type:'wall', dx: 1, dy:-3, lv:10 }, { type:'wall', dx: 2, dy:-3, lv:10 },
                    { type:'wall', dx: 3, dy:-3, lv:10 }, { type:'wall', dx: 3, dy:-2, lv:10 },
                    { type:'wall', dx: 3, dy:-1, lv:10 }, { type:'wall', dx: 3, dy: 0, lv:10 },
                    { type:'wall', dx: 3, dy: 1, lv:10 }, { type:'wall', dx: 3, dy: 2, lv:10 },
                    { type:'wall', dx: 3, dy: 3, lv:10 }, { type:'wall', dx: 2, dy: 3, lv:10 },
                    { type:'wall', dx: 1, dy: 3, lv:10 }, { type:'gate', dx: 0, dy: 3, lv:10 },
                    { type:'wall', dx:-1, dy: 3, lv:10 }, { type:'wall', dx:-2, dy: 3, lv:10 },
                    { type:'wall', dx:-3, dy: 3, lv:10 }, { type:'wall', dx:-3, dy: 2, lv:10 },
                    { type:'wall', dx:-3, dy: 1, lv:10 }, { type:'wall', dx:-3, dy: 0, lv:10 },
                    { type:'wall', dx:-3, dy:-1, lv:10 }, { type:'wall', dx:-3, dy:-2, lv:10 },
                    // Tashqi R=7 devor
                    {type:'wall',dx:-7,dy:-7,lv:9},{type:'wall',dx:-6,dy:-7,lv:9},{type:'wall',dx:-5,dy:-7,lv:9},
                    {type:'wall',dx:-4,dy:-7,lv:9},{type:'wall',dx:-3,dy:-7,lv:9},{type:'wall',dx:-2,dy:-7,lv:9},
                    {type:'wall',dx:-1,dy:-7,lv:9},{type:'wall',dx: 0,dy:-7,lv:9},{type:'wall',dx: 1,dy:-7,lv:9},
                    {type:'wall',dx: 2,dy:-7,lv:9},{type:'wall',dx: 3,dy:-7,lv:9},{type:'wall',dx: 4,dy:-7,lv:9},
                    {type:'wall',dx: 5,dy:-7,lv:9},{type:'wall',dx: 6,dy:-7,lv:9},{type:'wall',dx: 7,dy:-7,lv:9},
                    {type:'wall',dx:-7,dy: 7,lv:9},{type:'wall',dx:-6,dy: 7,lv:9},{type:'wall',dx:-5,dy: 7,lv:9},
                    {type:'wall',dx:-4,dy: 7,lv:9},{type:'wall',dx:-3,dy: 7,lv:9},{type:'wall',dx:-2,dy: 7,lv:9},
                    {type:'wall',dx:-1,dy: 7,lv:9},{type:'gate',dx: 0,dy: 7,lv:9},{type:'wall',dx: 1,dy: 7,lv:9},
                    {type:'wall',dx: 2,dy: 7,lv:9},{type:'wall',dx: 3,dy: 7,lv:9},{type:'wall',dx: 4,dy: 7,lv:9},
                    {type:'wall',dx: 5,dy: 7,lv:9},{type:'wall',dx: 6,dy: 7,lv:9},{type:'wall',dx: 7,dy: 7,lv:9},
                    {type:'wall',dx:-7,dy:-6,lv:9},{type:'wall',dx:-7,dy:-5,lv:9},{type:'wall',dx:-7,dy:-4,lv:9},
                    {type:'wall',dx:-7,dy:-3,lv:9},{type:'wall',dx:-7,dy:-2,lv:9},{type:'wall',dx:-7,dy:-1,lv:9},
                    {type:'wall',dx:-7,dy: 0,lv:9},{type:'wall',dx:-7,dy: 1,lv:9},{type:'wall',dx:-7,dy: 2,lv:9},
                    {type:'wall',dx:-7,dy: 3,lv:9},{type:'wall',dx:-7,dy: 4,lv:9},{type:'wall',dx:-7,dy: 5,lv:9},
                    {type:'wall',dx:-7,dy: 6,lv:9},
                    {type:'wall',dx: 7,dy:-6,lv:9},{type:'wall',dx: 7,dy:-5,lv:9},{type:'wall',dx: 7,dy:-4,lv:9},
                    {type:'wall',dx: 7,dy:-3,lv:9},{type:'wall',dx: 7,dy:-2,lv:9},{type:'wall',dx: 7,dy:-1,lv:9},
                    {type:'wall',dx: 7,dy: 0,lv:9},{type:'wall',dx: 7,dy: 1,lv:9},{type:'wall',dx: 7,dy: 2,lv:9},
                    {type:'wall',dx: 7,dy: 3,lv:9},{type:'wall',dx: 7,dy: 4,lv:9},{type:'wall',dx: 7,dy: 5,lv:9},
                    {type:'wall',dx: 7,dy: 6,lv:9},
                    // Mudofaa maksimal — 14 mudofaa qurilmasi halqalar orasida
                    { type:'archerTower', dx:-5, dy:-5, lv:10 },
                    { type:'archerTower', dx: 6, dy:-5, lv:10 },
                    { type:'archerTower', dx:-5, dy: 6, lv:10 },
                    { type:'archerTower', dx: 6, dy: 6, lv:10 },
                    { type:'archerTower', dx: 0, dy:-5, lv:10 },
                    { type:'archerTower', dx: 0, dy: 6, lv:10 },
                    { type:'archerTower', dx:-5, dy: 0, lv:10 },
                    { type:'archerTower', dx: 6, dy: 0, lv:10 },
                    { type:'archerTower', dx:-3, dy:-5, lv:9 },
                    { type:'archerTower', dx: 4, dy: 6, lv:9 },
                    { type:'scorpio',     dx:-5, dy:-2, lv:10 },
                    { type:'scorpio',     dx: 6, dy: 3, lv:10 },
                    { type:'scorpio',     dx:-5, dy: 3, lv:9 },
                    { type:'scorpio',     dx: 6, dy:-3, lv:9 },
                    { type:'scorpio',     dx: 4, dy:-5, lv:9 },
                    { type:'scorpio',     dx:-3, dy: 6, lv:9 },
                    { type:'militia',     dx: 1, dy: 0, lv:8 },
                    { type:'militia',     dx:-1, dy: 0, lv:8 },
                    { type:'militia',     dx: 0, dy: 1, lv:8 },
                    { type:'spikeTrap',   dx: 5, dy:-2, lv:7 },
                    { type:'spikeTrap',   dx:-4, dy: 3, lv:7 },
                    { type:'spikeTrap',   dx: 5, dy: 3, lv:7 },
                    { type:'spikeTrap',   dx:-4, dy:-2, lv:7 },
                    { type:'alchemicalTrap', dx: 4, dy:-4, lv:6 },
                    { type:'alchemicalTrap', dx:-3, dy: 5, lv:6 },
                    // Resurslar maksimal tashqarida
                    { type:'goldStorage', dx: 9, dy: 0, lv:9 },
                    { type:'goldStorage', dx:-9, dy: 0, lv:9 },
                    { type:'goldStorage', dx: 0, dy: 9, lv:9 },
                    { type:'goldStorage', dx: 0, dy:-9, lv:9 },
                    { type:'foodStorage', dx: 9, dy: 6, lv:8 },
                    { type:'foodStorage', dx:-9, dy:-6, lv:8 },
                    { type:'foodStorage', dx: 9, dy:-6, lv:8 },
                    { type:'foodStorage', dx:-9, dy: 6, lv:8 },
                    { type:'villa',       dx: 6, dy: 9, lv:8 },
                    { type:'villa',       dx:-6, dy:-9, lv:8 },
                    { type:'farm',        dx: 6, dy:-9, lv:8 },
                    { type:'farm',        dx:-6, dy: 9, lv:8 },
                    { type:'barracks',    dx: 10, dy: 2, lv:8 },
                    { type:'barracks',    dx:-10, dy:-2, lv:8 },
                    { type:'praetorium',  dx: 5, dy: 2, lv:8 },
                ],
            ]
        },
    ],

    _generateEnemyBase(base) {
        // Gridni tozalash
        Grid.init();
        BuildingManager.buildings = {};
        ObstacleManager.obstacles = {};
        BuildingManager.nextId = 1;
        ObstacleManager.nextId = 1;

        const center = Math.floor(Grid.SIZE / 2);
        const diff = base.difficulty;

        // Difficulty ga mos tier tanlash
        const tier = this._NPC_TEMPLATES.find(t => diff >= t.minDiff && diff <= t.maxDiff)
                  || this._NPC_TEMPLATES[this._NPC_TEMPLATES.length - 1];

        // Variantlardan birini tasodifiy tanlash
        const variant = tier.variants[Math.floor(Math.random() * tier.variants.length)];

        // TH darajasi = min(requiredLevel, max TH level)
        const thLevel = Math.min(base.requiredLevel, 10);

        // Bino darajasini qiyinlikka moslash
        const lvScale = (lv) => {
            const scaled = Math.round(lv * (diff / 10));
            return Math.max(1, Math.min(scaled, 10));
        };

        // ── Tasodifiy rotatsiya (0°/90°/180°/270°) — har jangda yangi layout ──
        // 4 ta rotatsiya × N variant = 4N effektiv layout
        const rot = Math.floor(Math.random() * 4); // 0=0°, 1=90°CW, 2=180°, 3=270°CW
        const rotateDxDy = (dx, dy) => {
            switch (rot) {
                case 0: return [dx, dy];          // 0°   — asl holat
                case 1: return [dy, -dx];         // 90°  CW
                case 2: return [-dx, -dy];        // 180°
                case 3: return [-dy, dx];         // 270° CW
                default: return [dx, dy];
            }
        };

        // TH ni markazga joylashtirish (2x2)
        this._spawnEnemyBuilding('cityHall', thLevel, center - 1, center - 1);

        // Layoutdan binolarni joylashtirish
        for (const entry of variant) {
            const bd = BUILDING_DATA[entry.type];
            if (!bd) continue;

            const [rdx, rdy] = rotateDxDy(entry.dx, entry.dy);
            const tx = center + rdx - Math.floor(bd.size[0] / 2);
            const ty = center + rdy - Math.floor(bd.size[1] / 2);

            // Grid chegaralarini tekshirish
            if (tx < 1 || ty < 1 || tx + bd.size[0] > Grid.SIZE - 1 || ty + bd.size[1] > Grid.SIZE - 1) continue;

            // Joy band bo'lsa o'tkazib yuborish
            if (!Grid.isFree(tx, ty, bd.size[0], bd.size[1])) continue;

            const level = lvScale(entry.lv);
            this._spawnEnemyBuilding(entry.type, level, tx, ty);
        }

        // Lootni omborlar va TH ga taqsimlash
        this._distributeLoot();

        this.enemyBuildings = BuildingManager.buildings;
        this.totalBuildings = Object.keys(this.enemyBuildings).length;
        this.destroyedCount = 0;
        this._rebuildDefenseCache();
    },

    // Mudofaa binolari keshini qayta qurish
    _rebuildDefenseCache() {
        this._defenseBuildings = Object.values(BuildingManager.buildings).filter(b => {
            const bd = BUILDING_DATA[b.type];
            if (!bd || bd.category !== 'mudofaa') return false;
            const lv = bd.levels[b.level];
            if (!lv) return false;
            return lv.damage || bd.attackType === 'trap' || bd.attackType === 'spawn_troops';
        });
    },

    _placeRandomBuilding(type, level, center) {
        const bd = BUILDING_DATA[type];
        if (!bd) return;
        const w = bd.size[0];
        const h = bd.size[1];

        for (let attempt = 0; attempt < 50; attempt++) {
            // Markaz atrofida tasodifiy joy
            const radius = 3 + Math.random() * 8;
            const angle = Math.random() * Math.PI * 2;
            const tx = Math.floor(center + Math.cos(angle) * radius);
            const ty = Math.floor(center + Math.sin(angle) * radius);

            if (tx >= 0 && tx < Grid.SIZE - w && ty >= 0 && ty < Grid.SIZE - h) {
                if (Grid.isFree(tx, ty, w, h)) {
                    this._spawnEnemyBuilding(type, level, tx, ty);
                    break;
                }
            }
        }
    },

    _spawnEnemyBuilding(type, level, x, y) {
        const id = BuildingManager.nextId++;
        const bd = BUILDING_DATA[type];
        const lv = bd.levels[level] || bd.levels[1];

        const b = {
            id: id,
            type: type,
            x: x,
            y: y,
            level: level,
            hp: lv.hp,
            maxHp: lv.hp,
            building: false,
            storedLoot: { gold: 0, food: 0 },
            lastShot: 0 // mudofaa uchun
        };
        BuildingManager.buildings[id] = b;
        Grid.occupy(x, y, bd.size[0], bd.size[1], id);
    },

    _distributeLoot() {
        // CoC-style: loot distributed across storages (50%), collectors (30%), cityHall (20%)
        // gold → goldStorage (50%) + villa collectors (30%) + cityHall (20%)
        // food → foodStorage (50%) + farm collectors (30%) + cityHall (20%)
        const buildings = Object.values(BuildingManager.buildings);

        const goldStorages  = buildings.filter(b => b.type === 'goldStorage');
        const foodStorages  = buildings.filter(b => b.type === 'foodStorage');
        const villas        = buildings.filter(b => b.type === 'villa');
        const farms         = buildings.filter(b => b.type === 'farm');
        const cityHalls     = buildings.filter(b => b.type === 'cityHall');

        const totalG = this.lootAvailable.gold;
        const totalF = this.lootAvailable.food;

        // Reset all
        for (const b of buildings) b.storedLoot = { gold: 0, food: 0 };

        // Gold distribution
        const goldStoragePot = Math.floor(totalG * 0.5);
        const villasPot      = Math.floor(totalG * 0.3);
        const chGoldPot      = totalG - goldStoragePot - villasPot;

        if (goldStorages.length > 0) {
            const perNode = Math.floor(goldStoragePot / goldStorages.length);
            for (const b of goldStorages) b.storedLoot.gold += perNode;
        } else {
            // No gold storage — fallback to villas or cityHall
            if (villas.length > 0) {
                const perNode = Math.floor((goldStoragePot + villasPot) / villas.length);
                for (const b of villas) b.storedLoot.gold += perNode;
            } else if (cityHalls.length > 0) {
                cityHalls[0].storedLoot.gold += goldStoragePot + villasPot;
            }
        }
        if (villas.length > 0) {
            const perNode = Math.floor(villasPot / villas.length);
            for (const b of villas) b.storedLoot.gold += perNode;
        }
        if (cityHalls.length > 0) {
            const perNode = Math.floor(chGoldPot / cityHalls.length);
            for (const b of cityHalls) b.storedLoot.gold += perNode;
        }

        // Food distribution
        const foodStoragePot = Math.floor(totalF * 0.5);
        const farmsPot       = Math.floor(totalF * 0.3);
        const chFoodPot      = totalF - foodStoragePot - farmsPot;

        if (foodStorages.length > 0) {
            const perNode = Math.floor(foodStoragePot / foodStorages.length);
            for (const b of foodStorages) b.storedLoot.food += perNode;
        } else {
            if (farms.length > 0) {
                const perNode = Math.floor((foodStoragePot + farmsPot) / farms.length);
                for (const b of farms) b.storedLoot.food += perNode;
            } else if (cityHalls.length > 0) {
                cityHalls[0].storedLoot.food += foodStoragePot + farmsPot;
            }
        }
        if (farms.length > 0) {
            const perNode = Math.floor(farmsPot / farms.length);
            for (const b of farms) b.storedLoot.food += perNode;
        }
        if (cityHalls.length > 0) {
            const perNode = Math.floor(chFoodPot / cityHalls.length);
            for (const b of cityHalls) b.storedLoot.food += perNode;
        }
    },

    // Praetorium stored troops — hujumda ishlatish (CoC CC troops)
    _deployPraetoriumTroops(x, y) {
        if (!this._canDeployAt(x, y)) {
            Toast.show("Qizil zonaga askar tashlab bo'lmaydi!", "error");
            return false;
        }
        const stored = this.availableTroops['_praetorium'] || 0;
        if (stored <= 0) return false;

        // Praetorian askarlar sifatida jangga tushiriladi
        const count = Math.min(stored, 5);  // Bir vaqtda max 5 ta
        const praetData = TROOP_DATA['praetorian'];
        if (!praetData) return false;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const spawnX = x + Math.cos(angle) * 1.2;
            const spawnY = y + Math.sin(angle) * 1.2;
            const troop = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'praetorian',
                x: spawnX, y: spawnY,
                hp: praetData.stats.hp * 1.5,     // CC askarlar biroz kuchliroq
                maxHp: praetData.stats.hp * 1.5,
                damage: praetData.stats.damage * 1.3,
                speed: praetData.stats.speed,
                range: praetData.stats.range,
                target: null, state: 'idle',
                lastAttack: 0, attackSpeed: 1000,
                _fromPraetorium: true,             // Marker
            };
            this.troops.push(troop);
            this._troopsById.set(troop.id, troop);
        }
        this.availableTroops['_praetorium'] -= count;
        if (this.availableTroops['_praetorium'] <= 0) {
            delete this.availableTroops['_praetorium'];
            // Praetorium binosi bo'shatildi
            if (this._praetoriumBuilding) {
                this._praetoriumBuilding._storedTroops = 0;
            }
        }
        this.deployedCount += count;
        if (typeof BattleRenderer !== 'undefined') {
            BattleRenderer.addExplosion(x, y, '#cd853f', 14);
            BattleRenderer.addDeployRing(x, y, '#cd853f');
            BattleRenderer.addFloatingText(x, y - 1, `🏰 +${count} CC`, '#ffd700', 13);
        }
        DeployPanel.update();
        return true;
    },

    deployTroop(type, x, y) {
        if (!this.availableTroops[type] || this.availableTroops[type] <= 0) return false;

        // Praetorium stored troops — maxsus deploy logika
        if (type === '_praetorium') {
            return this._deployPraetoriumTroops(x, y);
        }

        // Qizil zona tekshiruvi (faqat binolardan uzoqroq joyga)
        if (!this._canDeployAt(x, y)) {
            Toast.show("Qizil zonaga askar tashlab bo'lmaydi!", "error");
            return false;
        }

        const data = TROOP_DATA[type];
        if (!data) return false;  // Noma'lum askar turi
        const bonus = (typeof ResearchSystem !== 'undefined')
            ? ResearchSystem.getTroopBonus(type)
            : { hp: 0, damage: 0, speed: 0, range: 0, trainTime: 0 };

        // Hero: darajali statslar
        let baseHp  = data.stats.hp     + bonus.hp;
        let baseDmg = data.stats.damage + bonus.damage;
        if (data.isHero && typeof HeroSystem !== 'undefined') {
            const heroStats = HeroSystem.getCommanderStats(type);
            if (heroStats) { baseHp = heroStats.hp; baseDmg = heroStats.damage; }
        }

        const baseSpeed = data.stats.speed * (1 + (bonus.speed || 0));

        const troop = {
            id: Math.random().toString(36).substr(2, 9),
            type: type,
            x: x,
            y: y,
            hp:    baseHp,
            maxHp: baseHp,
            damage: baseDmg,
            speed: baseSpeed,
            range: data.stats.range + (bonus.range || 0),
            target: null,
            state: 'idle',
            lastAttack: 0,
            attackSpeed: data.stats.attackSpeed || 1200
        };

        // Super Troop bonuslari
        if (typeof SuperTroops !== 'undefined') {
            SuperTroops.applyToTroop(troop);
        }

        troop._deployDropUntil = Date.now() + 380; // Yerga tushish animatsiyasi
        this.troops.push(troop);
        this._troopsById.set(troop.id, troop);

        // Askar tushirilganida rang particle burst + landing ring
        if (typeof BattleRenderer !== 'undefined') {
            const catColors = {
                piyoda: '#ef5350', otishma: '#66bb6a', otliq: '#ce93d8',
                qamal: '#a1887f', uchuvchi: '#4fc3f7', maxsus: '#ffd54f'
            };
            const color = troop._superColor || catColors[data.category] || '#ffd700';
            BattleRenderer.addExplosion(x, y, color, troop._isSuper ? 18 : 10);
            BattleRenderer.addDeployRing(x, y, color);
            // Deploy tutun pufagi — CoC-style landing cloud
            const pCount = troop._isSuper ? 5 : 3;
            for (let pi = 0; pi < pCount; pi++) {
                BattleRenderer._smokeParticles.push({
                    wx: x + (Math.random() - 0.5) * 0.6,
                    wy: y + (Math.random() - 0.5) * 0.4,
                    vyWorld: -(0.012 + Math.random() * 0.01),
                    vxWorld: (Math.random() - 0.5) * 0.015,
                    life: 1.0,
                    decay: 0.07,
                    size: 2.5 + Math.random() * 2.5,
                    color: null,
                    isCritical: false,
                });
            }
            // Super deploy effekt: ikkinchi portlash
            if (troop._isSuper) {
                setTimeout(() => BattleRenderer.addExplosion(x, y, '#ff6d00', 12), 80);
            }
        }

        // Replay event log (t = ms since battle start)
        if (this._replayEvents.length < 2000) {
            this._replayEvents.push({ t: Date.now() - this.startTime, troopType: type, x, y });
        }
        this.availableTroops[type]--;
        this.deployedCount++;

        TroopManager.loseTroop(type, 1);
        
        DeployPanel.update();
        return true;
    },

    _canDeployAt(tx, ty) {
        // Asosiy tekshiruv: birorta binogacha bo'lgan masofa kamida 3 tile bo'lishi kerak
        for (const b of Object.values(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue; // noma'lum bino turi — o'tkazib yuborish
            const cx = b.x + bd.size[0] / 2;
            const cy = b.y + bd.size[1] / 2;
            const dist = Helpers.distance(tx, ty, cx, cy);
            if (dist < Math.max(bd.size[0], bd.size[1]) + 2) {
                return false; // qizil zona
            }
        }
        return true;
    },

    // Jang tsikli — game.js dan real delta time keladi
    update(delta = 0.016) {
        if (!this.active || this.ended) return;

        const now = Date.now();

        // ── Frame budget reset (pathfinding throttle) ────────────────────────
        if (typeof Pathfinding !== 'undefined') Pathfinding.resetFrameBudget();

        // Vaqt tugashini tekshirish
        if (now - this.startTime > this.timeLimit) {
            this.endBattle();
            return;
        }

        // Barcha binolar vayron bo'ldimi?
        if (this.destroyedCount >= this.totalBuildings) {
            this.endBattle();
            return;
        }

        // Barcha askarlar o'ldimi va deploy qilinadigan qolmadimi?
        if (this.troops.length === 0) {
            let hasMore = false;
            for (const v of Object.values(this.availableTroops)) {
                if (v > 0) { hasMore = true; break; }
            }
            if (!hasMore) {
                this.endBattle();
                return;
            }
        }

        // Binolar vayron bo'lganda barcha yo'llarni tozalash (dirty flag)
        if (this._pathsDirty) {
            for (const t of this.troops) {
                t.path = null;
                t.target = null;
                t._lastTargetSearch = 0; // Targetni qayta topish uchun
            }
            this._pathsDirty = false;
        }

        // ── SpatialGrid rebuild — O(troops) — defense targetlash uchun ───────
        if (typeof SpatialGrid !== 'undefined' && this.troops.length > 0) {
            SpatialGrid.rebuild(this.troops);
        }

        // ── BURN / POISON / SLOW EFFEKTLARINI YANGILASH ─────────────────────────
        for (const t of this.troops) {
            if (t.hp <= 0) continue;
            if (t.burning) {
                if (now - t.lastBurnTick > 1000) {
                    t.lastBurnTick = now;
                    t.hp -= t.burnDamage;
                    t.burnTimeLeft -= 1000;
                    if (t.burnTimeLeft <= 0) { t.burning = false; }
                    if (typeof BattleRenderer !== 'undefined' && t.burnDamage >= 1) {
                        BattleRenderer.addFloatingText(t.x, t.y, `🔥-${Math.round(t.burnDamage)}`, '#ff6d00', 10);
                    }
                }
            }
            if (t.poisoned) {
                if (now - t.lastPoisonTick > 1000) {
                    t.lastPoisonTick = now;
                    t.hp -= t.poisonDamage;
                    t.poisonTimeLeft -= 1000;
                    if (t.poisonTimeLeft <= 0) { t.poisoned = false; }
                    if (typeof BattleRenderer !== 'undefined' && t.poisonDamage >= 1) {
                        BattleRenderer.addFloatingText(t.x, t.y, `☠-${Math.round(t.poisonDamage)}`, '#76ff03', 10);
                    }
                }
            }
            if (t.slowed && now > t.slowExpiry) {
                t.slowed = false;
            }
        }

        // ── TUZOQLARNI TEKSHIRISH ─────────────────────────────────────────────
        this._checkTraps(now);

        // ── ASKARLARNI YANGILASH ──────────────────────────────────────────────
        for (let i = this.troops.length - 1; i >= 0; i--) {
            const t = this.troops[i];

            if (t.hp <= 0) {
                if (!t._deathTime) {
                    // Birinchi o'lim — effekt + vaqt belgilash
                    t._deathTime = Date.now();
                    t.state = 'dying';
                    if (typeof BattleRenderer !== 'undefined') {
                        const td2 = TROOP_DATA[t.type];
                        const isHero  = td2?.isHero;
                        const isLarge = ['minotaur','cyclops','aries','cataphract','onager'].includes(t.type);
                        if (isHero) {
                            // Hero o'limi — katta portlash + yer halqasi + shake
                            BattleRenderer.addExplosion(t.x, t.y, '#ffd700', 28);
                            BattleRenderer.addExplosion(t.x, t.y, '#ef9a9a', 18);
                            BattleRenderer.addExplosion(t.x, t.y, '#ffffff', 10);
                            BattleRenderer.addGroundRing(t.x, t.y, '#ffd700', 4.5, 900);
                            BattleRenderer.addGroundRing(t.x, t.y, '#ff9800', 3.0, 650);
                            BattleRenderer.addGroundMark?.(t.x, t.y, 1.2, 10000);
                            BattleRenderer.triggerShake(7, 350);
                            BattleRenderer.addFloatingText(t.x, t.y, '👑💀', '#ffd700', 15);
                        } else if (isLarge) {
                            // Yirik askar o'limi — portlash + yer halqasi
                            BattleRenderer.addExplosion(t.x, t.y, '#ff5722', 20);
                            BattleRenderer.addExplosion(t.x, t.y, '#ef9a9a', 12);
                            BattleRenderer.addExplosion(t.x, t.y, '#ffcc80', 8);
                            BattleRenderer.addGroundRing(t.x, t.y, '#ff5722', 3.0, 700);
                            BattleRenderer.addGroundMark?.(t.x, t.y, 0.9, 8000);
                            BattleRenderer.triggerShake(4, 200);
                            BattleRenderer.addFloatingText(t.x, t.y, '💀', '#ff5722', 13);
                        } else {
                            // Oddiy askar o'limi — kichik burst ring
                            BattleRenderer.addExplosion(t.x, t.y, '#ef9a9a', 10);
                            BattleRenderer.addExplosion(t.x, t.y, '#ffffff', 4);
                            BattleRenderer.addGroundRing(t.x, t.y, '#ef9a9a', 1.8, 450);
                            BattleRenderer.addFloatingText(t.x, t.y, '💀', '#ffffff', 12);
                        }
                        // Hero regen boshlash
                        if (isHero && typeof HeroSystem !== 'undefined') {
                            HeroSystem.startRegen(t.type);
                        }
                    }
                } else if (Date.now() - t._deathTime > 380) {
                    // 380ms o'tdi — askarni o'chirish
                    this._troopsById.delete(t.id);
                    this.troops.splice(i, 1);
                    continue;
                }
                // O'lish davomida harakat yo'q — skip qolgan logika
                continue;
            }

            const td = TROOP_DATA[t.type];
            if (!td) continue;

            // SHIFOBAXSH — alohida logika
            if (td.stats.type === 'healer') {
                this._updateHealer(t, td, delta, now);
                continue;
            }

            // NISHON TANLASH — targetPriority ga mos (har 500ms qayta tekshirish)
            const needRetarget = !t.target || !BuildingManager.buildings[t.target];
            const retargetReady = !t._lastTargetSearch || (now - t._lastTargetSearch > 500);
            if (needRetarget && retargetReady) {
                t._lastTargetSearch = now;
                t.target = this._findTarget(t, td);
                t.path = null;
            }

            if (!t.target) { t.state = 'idle'; continue; }

            const b  = BuildingManager.buildings[t.target];
            // Bino allaqachon vayron bo'lgan — xavfsiz qayta yo'naltirish
            if (!b) { t.target = null; t.state = 'idle'; t._lastTargetSearch = 0; continue; }
            const bd = BUILDING_DATA[b.type];
            if (!bd) { t.target = null; t.state = 'idle'; continue; }
            const bx = b.x + bd.size[0] / 2 - 0.5;
            const by = b.y + bd.size[1] / 2 - 0.5;
            const dist = Helpers.distance(t.x, t.y, bx, by);
            const attackDist = t.range + Math.max(bd.size[0], bd.size[1]) / 2;

            if (dist <= attackDist) {
                t.state = 'attacking';
                const atkSpd = t.attackSpeed || 1200;
                if (now - t.lastAttack >= atkSpd) {
                    t.lastAttack = now;
                    this._doAttack(t, td, b);
                }
            } else {
                t.state = 'moving';
                // Ability speed buff
                const abilitySpeedMult = (t._abilityBuff && Date.now() < t._abilityBuff.until)
                    ? (1 + t._abilityBuff.spd) : 1;
                // Haste spell + rage spell speed bonus
                const rageSpeedMult  = typeof SpellSystem !== 'undefined' ? SpellSystem.getRageSpeedMult(t) : 1;
                const hasteMult      = typeof SpellSystem !== 'undefined' ? SpellSystem.getHasteMult(t)     : 1;
                const spellSpeedMult = rageSpeedMult * hasteMult;
                const effectiveSpeed = t.speed * (t.slowed ? (1 - (t.slowFactor || 0.4)) : 1) * abilitySpeedMult * spellSpeedMult;
                if (td.flying) {
                    // UCHUVCHI — to'g'ri chiziq, pathfinding yo'q
                    const angle = Math.atan2(by - t.y, bx - t.x);
                    t.x += Math.cos(angle) * effectiveSpeed * delta;
                    t.y += Math.sin(angle) * effectiveSpeed * delta;
                } else {
                    // YER ASKARI — A* pathfinding (budget cheklangan)
                    if (!t.path || t.path.length === 0) {
                        // Jump spell aktiv bo'lsa — devor weightini 1 qilib yo'l topamiz
                        const inJump = typeof SpellSystem !== 'undefined' && SpellSystem.isInJumpZone(t.x, t.y);
                        if (typeof Pathfinding !== 'undefined') Pathfinding.setJumpContext(inJump);
                        const newPath = Pathfinding.findPath(t.x, t.y, bx, by);
                        if (typeof Pathfinding !== 'undefined') Pathfinding.setJumpContext(false);
                        if (newPath !== null) t.path = newPath;
                        // null → budget exhausted: keyingi frameda qayta hisoblash
                    }
                    if (t.path && t.path.length > 0) {
                        const nx = t.path[0].x + 0.5;
                        const ny = t.path[0].y + 0.5;
                        const ang = Math.atan2(ny - t.y, nx - t.x);
                        const mv  = effectiveSpeed * delta;

                        // Devor/darvoza to'siqmi?
                        const gx = Math.floor(t.x + Math.cos(ang) * mv * 2);
                        const gy = Math.floor(t.y + Math.sin(ang) * mv * 2);
                        const tile = (Grid.tiles[gy] || [])[gx];
                        let hitWall = false;
                        if (tile && tile.buildingId !== null && tile.buildingId !== t.target) {
                            const obs = BuildingManager.buildings[tile.buildingId];
                            if (obs && (obs.type === 'wall' || obs.type === 'gate')) {
                                t.state = 'attacking';
                                hitWall = true;
                                // Gate: tezroq uriladi (CoC: darvoza zaifligi), devor: sekinroq
                                const wallAtkSpd = t.type === 'aries' ? 600
                                                 : obs.type === 'gate' ? 900
                                                 : 1400;
                                if (now - t.lastAttack >= wallAtkSpd) {
                                    t.lastAttack = now;
                                    this._doAttack(t, td, obs);
                                }
                            }
                        }
                        if (!hitWall) {
                            if (Helpers.distance(t.x, t.y, nx, ny) <= mv) {
                                t.x = nx; t.y = ny;
                                t.path.shift();
                            } else {
                                t.x += Math.cos(ang) * mv;
                                t.y += Math.sin(ang) * mv;
                            }
                        }
                    } else {
                        const ang = Math.atan2(by - t.y, bx - t.x);
                        t.x += Math.cos(ang) * effectiveSpeed * delta;
                        t.y += Math.sin(ang) * effectiveSpeed * delta;
                    }
                }
            }
        }

        // ── MUDOFAA BINOLARI — targetType ga qarab nishon tanlash ────────────
        for (const b of this._defenseBuildings) {
            if (!BuildingManager.buildings[b.id]) continue;
            const bd  = BUILDING_DATA[b.type];
            if (!bd) continue;
            const lv  = bd.levels[b.level];
            if (!lv) continue;
            const bcx = b.x + bd.size[0] / 2;
            const bcy = b.y + bd.size[1] / 2;
            const atkSpd = bd.attackSpeed || 1500;

            if (now - b.lastShot < atkSpd) continue;

            // targetType: 'air' → faqat uchuvchilar, 'ground' → faqat yer, 'both' → hammasi
            const wantAir  = bd.targetType === 'air';
            const wantBoth = bd.targetType === 'both';

            // Tuzoqlar boshqacha ishlaydi (checkTraps da)
            if (bd.attackType === 'trap') continue;

            // Spawn (Militia) boshqacha
            if (bd.attackType === 'spawn_troops') {
                this._updateMilitia(b, bd, lv, now);
                continue;
            }

            let nearest = null;

            // SpatialGrid mavjud bo'lsa — O(K) query, aks holda O(N) fallback
            if (typeof SpatialGrid !== 'undefined' && SpatialGrid._cells) {
                const minRng = (b.type === 'cloudBuster' && bd.minRange) ? bd.minRange : 0;
                nearest = SpatialGrid.queryNearest(bcx, bcy, lv.range, (t) => {
                    const fly = TROOP_DATA[t.type]?.flying || false;
                    if (!wantBoth && wantAir  && !fly) return false;
                    if (!wantBoth && !wantAir && fly)  return false;
                    if (minRng > 0) {
                        const dx = t.x - bcx, dy = t.y - bcy;
                        if (dx*dx + dy*dy < minRng*minRng) return false;
                    }
                    return true;
                });
            } else {
                // Fallback: linear scan
                let minDist = lv.range;
                for (const t of this.troops) {
                    const isFlying = TROOP_DATA[t.type]?.flying || false;
                    if (!wantBoth && wantAir  && !isFlying) continue;
                    if (!wantBoth && !wantAir && isFlying)  continue;
                    if (b.type === 'cloudBuster' && bd.minRange) {
                        if (Helpers.distance(bcx, bcy, t.x, t.y) < bd.minRange) continue;
                    }
                    const dist = Helpers.distance(bcx, bcy, t.x, t.y);
                    if (dist < minDist) { minDist = dist; nearest = t; }
                }
            }

            if (!nearest) continue;
            b.lastShot = now;
            b._lastFiredAt = now;                          // laser beam flash
            b._lastFiredTarget = { x: nearest.x, y: nearest.y }; // target pos
            AudioManager.playArrow();

            if (bd.attackType === 'splash' || bd.attackType === 'fire_splash') {
                this._spawnProjectile(bcx, bcy, nearest.id, lv.damage, 'defense_splash', {
                    splashRadius: bd.splashRadius || 2,
                    fire: bd.attackType === 'fire_splash',
                    burnDamage: bd.burnDamage || 0,
                    burnDuration: bd.burnDuration || 0,
                });
            } else if (bd.attackType === 'slow_splash') {
                this._spawnProjectile(bcx, bcy, nearest.id, lv.damage, 'defense_slow_splash', {
                    splashRadius: bd.splashRadius || 2.0,
                    slowEffect:   bd.slowEffect   || 0.4,
                    slowDuration: bd.slowDuration || 2500,
                });
            } else if (bd.attackType === 'inferno') {
                // Charge mechanic: zarar oshib boradi
                if (!b._infernoTarget || b._infernoTarget !== nearest.id) {
                    b._infernoTarget = nearest.id;
                    b._infernoCharge = 1.0; // Reset charge on target switch
                }
                b._infernoCharge = Math.min(
                    bd.maxCharge || 4.0,
                    (b._infernoCharge || 1.0) + (bd.chargeRate || 50) / 1000 * (atkSpd / 1000)
                );
                const chargeDmg = Math.floor(lv.damage * (b._infernoCharge || 1));
                this._spawnProjectile(bcx, bcy, nearest.id, chargeDmg, 'defense_inferno', {
                    charge: b._infernoCharge || 1.0,
                });
                // Visual: glowing beam color based on charge
                b._lastFiredAt = now;
                b._lastFiredTarget = { x: nearest.x, y: nearest.y };
            } else {
                // rapid_single va default single-target
                this._spawnProjectile(bcx, bcy, nearest.id, lv.damage, 'defense');
            }
        }

        // ── QOROVUL ASKARLAR (Militsiya guard) ───────────────────────────────
        for (let i = this.guardTroops.length - 1; i >= 0; i--) {
            const g = this.guardTroops[i];
            if (g.hp <= 0) { this.guardTroops.splice(i, 1); continue; }

            if (g.stunned && now > g.stunExpiry) g.stunned = false;
            if (g.stunned) continue;

            let closest = null, minDist = Infinity;
            for (const t of this.troops) {
                if (t.hp <= 0) continue;
                const d = Helpers.distance(g.x, g.y, t.x, t.y);
                if (d < minDist) { minDist = d; closest = t; }
            }
            if (!closest) continue;

            if (minDist <= g.range) {
                if (now - g.lastAttack >= 1200) {
                    g.lastAttack = now;
                    closest.hp -= g.damage;
                    AudioManager.playSword();
                }
            } else {
                const ang = Math.atan2(closest.y - g.y, closest.x - g.x);
                g.x += Math.cos(ang) * g.speed * delta;
                g.y += Math.sin(ang) * g.speed * delta;
            }
        }

        // Snaryadlarni yangilash
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const isDefenseType = (p.type === 'defense' || p.type === 'defense_splash');

            let tx, ty;
            if (isDefenseType) {
                const targetTroop = this._troopsById.get(p.targetId);
                if (!targetTroop || targetTroop.hp <= 0) { this.projectiles.splice(i, 1); continue; }
                tx = targetTroop.x; ty = targetTroop.y;
            } else {
                const targetB = BuildingManager.buildings[p.targetId];
                if (!targetB) { this.projectiles.splice(i, 1); continue; }
                const bd = BUILDING_DATA[targetB.type];
                if (!bd) { this.projectiles.splice(i, 1); continue; } // noma'lum bino
                tx = targetB.x + bd.size[0]/2; ty = targetB.y + bd.size[1]/2;
            }

            const dist = Helpers.distance(p.x, p.y, tx, ty);
            const moveAmt = 8 * delta;

            if (dist <= moveAmt) {
                if (p.type === 'defense') {
                    const tr = this._troopsById.get(p.targetId);
                    if (tr) {
                        const td = TROOP_DATA[tr.type];
                        const evade = td?.stats?.evasion || 0;
                        if (evade > 0 && Math.random() < evade) {
                            // dodged — show "Miss" + dodge visual
                            if (typeof BattleRenderer !== 'undefined') {
                                BattleRenderer.addFloatingText(tr.x, tr.y, 'Miss!', '#ffd700', 11);
                                // Dodge sidestep: troop lateral offset animatsiyasi
                                const dodgeDir = Math.random() < 0.5 ? 1 : -1;
                                tr._dodgeOffset = { dx: dodgeDir * 0.25, dy: -0.12, until: Date.now() + 220 };
                                // Qisqa particle trail (oq)
                                BattleRenderer.addExplosion(tr.x, tr.y, '#ffffff', 5);
                            }
                        } else {
                            tr.hp -= p.damage;
                            tr._hitTime = Date.now();
                            if (typeof BattleRenderer !== 'undefined' && p.damage >= 1) {
                                BattleRenderer.addFloatingText(tr.x, tr.y, `-${Math.round(p.damage)}`, '#ef9a9a', 11);
                            }
                            // Super Praetorian: 30% zarar aks ettirish
                            if (tr._superDmgReflect && p._buildingId) {
                                const reflectDmg = p.damage * tr._superDmgReflect;
                                this._damageBuilding(p._buildingId, reflectDmg);
                                if (typeof BattleRenderer !== 'undefined') {
                                    const rb = BuildingManager.buildings[p._buildingId];
                                    if (rb) {
                                        const rbd = BUILDING_DATA[rb.type];
                                        if (rbd) { // null guard
                                            BattleRenderer.addFloatingText(
                                                rb.x + rbd.size[0]/2, rb.y + rbd.size[1]/2,
                                                `↩ ${Math.round(reflectDmg)}`, '#ffd700', 10
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }

                } else if (p.type === 'defense_splash') {
                    const spl = p.splashRadius || 2;
                    const hitList = (typeof SpatialGrid !== 'undefined' && SpatialGrid._cells)
                        ? SpatialGrid.queryAll(tx, ty, spl)
                        : this.troops;
                    const spl2 = spl * spl;
                    for (const t of hitList) {
                        if (t.hp <= 0) continue;
                        const dx = t.x - tx, dy = t.y - ty;
                        if (dx*dx + dy*dy <= spl2) {
                            t.hp -= p.damage;
                            t._hitTime = Date.now();
                            if (typeof BattleRenderer !== 'undefined' && p.damage >= 1) {
                                BattleRenderer.addFloatingText(t.x, t.y, `-${Math.round(p.damage)}`, p.fire ? '#ff8a50' : '#ef9a9a', 11);
                            }
                            if (p.fire && p.burnDamage) {
                                t.burning      = true;
                                t.burnDamage   = p.burnDamage;
                                t.burnTimeLeft = p.burnDuration || 3000;
                                t.lastBurnTick = now;
                            }
                        }
                    }
                    BattleRenderer.addExplosion(tx, ty, p.fire ? '#ff4500' : '#ff8800', 10);
                    // Shockwave ring — splash zarba to'lqini
                    BattleRenderer.addShockwave(tx, ty, (p.splashRadius || 2) * 1.2, p.fire ? '#ff5722' : '#ff9800');
                    BattleRenderer.triggerShake(p.fire ? 3 : 2, 120);

                } else if (p.type === 'defense_slow_splash') {
                    const sspl = p.splashRadius || 2;
                    const slowList = (typeof SpatialGrid !== 'undefined' && SpatialGrid._cells)
                        ? SpatialGrid.queryAll(tx, ty, sspl)
                        : this.troops;
                    const sspl2 = sspl * sspl;
                    for (const t of slowList) {
                        if (t.hp <= 0) continue;
                        const dx = t.x - tx, dy = t.y - ty;
                        if (dx*dx + dy*dy <= sspl2) {
                            t.hp -= p.damage;
                            t._hitTime = Date.now();
                            if (typeof BattleRenderer !== 'undefined' && p.damage >= 1) {
                                BattleRenderer.addFloatingText(t.x, t.y, `-${Math.round(p.damage)}`, '#ce93d8', 11);
                            }
                            t.slowed     = true;
                            t.slowFactor = p.slowEffect || 0.4;
                            t.slowExpiry = now + (p.slowDuration || 2500);
                        }
                    }
                    BattleRenderer.addExplosion(tx, ty, '#b040e0', 8);
                    BattleRenderer.addShockwave(tx, ty, (p.splashRadius || 2), '#ce93d8');

                } else if (p.type === 'troop_splash') {
                    // Onager: splash damage to nearby buildings
                    for (const [nid, nb] of Object.entries(BuildingManager.buildings)) {
                        const nbd = BUILDING_DATA[nb.type];
                        const nx  = nb.x + nbd.size[0] / 2;
                        const ny  = nb.y + nbd.size[1] / 2;
                        if (Helpers.distance(tx, ty, nx, ny) <= (p.splashRadius || 2.5)) {
                            const factor = (parseInt(nid) === p.targetId) ? 1.0 : 0.5;
                            this._damageBuilding(parseInt(nid), p.damage * factor);
                        }
                    }
                    BattleRenderer.addExplosion(tx, ty, '#cc6600', 14);
                    BattleRenderer.addShockwave(tx, ty, (p.splashRadius || 2.5), '#ff8f00');
                    BattleRenderer.triggerShake(3, 150);

                } else {
                    this._damageBuilding(p.targetId, p.damage);
                    // Impact flash — askar o'qi binoga tegdi
                    if (typeof BattleRenderer !== 'undefined') {
                        BattleRenderer.addExplosion(tx, ty, '#ffcc02', 4);
                    }
                }
                _releaseProjectile(p);
                this.projectiles.splice(i, 1);
            } else {
                const angle = Math.atan2(ty - p.y, tx - p.x);
                p.x += Math.cos(angle) * moveAmt;
                p.y += Math.sin(angle) * moveAmt;
            }
        }
    },

    _getAuraMult(troop) {
        let mult = 1;
        // Commander aura — distSq ishlatiladi (sqrt yo'q)
        for (const t of this.troops) {
            if (t === troop || t.type !== 'commander' || t.hp <= 0) continue;
            const td = TROOP_DATA.commander;
            if (!td?.stats?.aura) continue;
            const radius = td.stats.auraRadius || 4;
            const dx = t.x - troop.x, dy = t.y - troop.y;
            if (dx*dx + dy*dy <= radius * radius) {
                mult *= (1 + (td.stats.auraDamageBonus || 0.2));
            }
        }
        // Rage spell
        if (typeof SpellSystem !== 'undefined') {
            mult *= SpellSystem.getRageMult(troop);
        }
        return mult;
    },

    _shootBuilding(troop, b) {
        // Frozen defense check
        if (typeof SpellSystem !== 'undefined' && SpellSystem.isFrozen(b)) return;

        const data = TROOP_DATA[troop.type];
        const auraMult = this._getAuraMult(troop);

        // Ability buff (qobiliyat buffini qo'llash)
        let abilityDmgMult = 1;
        if (troop._abilityBuff) {
            if (Date.now() < troop._abilityBuff.until) {
                abilityDmgMult = 1 + troop._abilityBuff.dmg;
            } else {
                delete troop._abilityBuff;
            }
        }

        if (data.stats.type === 'melee' || data.stats.type === 'siege') {
            // Yaqindan urish (projectile yo'q)
            AudioManager.playSword();
            let dmg = troop.damage * auraMult * abilityDmgMult;
            if (data.stats.bonusVsBuildings && b.type === 'wall') {
                dmg *= data.stats.bonusVsBuildings;
            }
            this._damageBuilding(b.id, dmg);

            // ── CoC-style melee impact flash — askar binoga tegish nuqtasida chaqnash ──
            if (typeof BattleRenderer !== 'undefined') {
                // Hit point — askar bilan bino orasidagi nuqta
                const bd3 = BUILDING_DATA[b.type];
                if (!bd3) return; // noma'lum bino — vizual effekt yo'q
                const hitX = (troop.x + b.x + bd3.size[0]/2) / 2;
                const hitY = (troop.y + b.y + bd3.size[1]/2) / 2;
                const isSiege = data.stats.type === 'siege';
                const flashCol = isSiege
                    ? '#ff8c00'
                    : (b.type === 'wall' || b.type === 'gate') ? '#b0bec5' : '#fffde7';
                // Kichik burst + kengayuvchi ring
                BattleRenderer.addExplosion(hitX, hitY, flashCol, isSiege ? 7 : 4);
                // Impact shockwave (kichik)
                BattleRenderer.addShockwave?.(hitX, hitY, 0.6, flashCol);
                // Troop rengiga moslanuvchi uchqun
                const troopColor = data.color || '#fff';
                BattleRenderer.addExplosion(hitX, hitY, troopColor, 2);
            }
        } else {
            // Uzoqdan otish
            AudioManager.playArrow();
            const finalDmg = troop.damage * auraMult * abilityDmgMult;
            this._spawnProjectile(troop.x, troop.y, b.id, finalDmg, 'troop');

            // Chain lightning (thunderbird)
            if (data.stats.chainLightning) {
                const chainCount = data.stats.chainCount || 3;
                const decay = data.stats.chainDamageDecay || 0.6;
                let chainDmg = finalDmg * decay;
                const hit = new Set([b.id]);
                let lastPos = { x: b.x + 0.5, y: b.y + 0.5 };
                for (let i = 1; i < chainCount; i++) {
                    let nearest = null, nearDist = Infinity;
                    for (const cb of Object.values(BuildingManager.buildings)) {
                        if (hit.has(cb.id) || cb.hp <= 0) continue;
                        const d = Math.hypot(cb.x - lastPos.x, cb.y - lastPos.y);
                        if (d < nearDist && d < 5) { nearDist = d; nearest = cb; }
                    }
                    if (!nearest) break;
                    hit.add(nearest.id);
                    this._spawnProjectile(lastPos.x, lastPos.y, nearest.id, chainDmg, 'troop');
                    lastPos = { x: nearest.x + 0.5, y: nearest.y + 0.5 };
                    chainDmg *= decay;
                }
            }
        }
    },

    _spawnProjectile(x, y, targetId, damage, type, opts = {}) {
        // Pool dan ob'ekt olish — new {} allocation yo'q
        const p = _acquireProjectile();
        p.startX = x; p.startY = y;
        p.x = x;      p.y = y;
        p.targetId = targetId;
        p.damage   = damage;
        p.type     = type;
        // Opts ni copy qilish (spread yo'q — inline)
        p.splashRadius  = opts.splashRadius  || 0;
        p.fire          = opts.fire          || false;
        p.burnDamage    = opts.burnDamage    || 0;
        p.burnDuration  = opts.burnDuration  || 0;
        p.slowEffect    = opts.slowEffect    || 0;
        p.slowDuration  = opts.slowDuration  || 0;
        p._buildingId   = opts._buildingId   || 0;
        p.charge        = opts.charge        || 1;
        this.projectiles.push(p);
        // Laser beam flash: track bino pozitsiyasini
        if (opts._buildingId && (type === 'defense' || type === 'defense_splash' || type === 'chain' || type === 'defense_inferno')) {
            const b = BuildingManager.buildings[opts._buildingId];
            if (b) b._lastFiredAt = Date.now();
        }
    },

    _damageBuilding(id, damage, attackerId) {
        const b = BuildingManager.buildings[id];
        if (!b) return;

        b.hp -= damage;
        b._hitTime = Date.now();   // Hit flash trigger

        // Floating damage number + hit sparks
        if (typeof BattleRenderer !== 'undefined' && damage >= 1) {
            const bd2 = BUILDING_DATA[b.type];
            if (bd2) {
                const hcx = b.x + bd2.size[0] / 2;
                const hcy = b.y + bd2.size[1] / 2;

                // Critical hit — zarar HP ning 15%+ ini olsa
                const dmgRatio = damage / (b.maxHp || 1);
                const isCrit = dmgRatio >= 0.15;
                const dmgColor = isCrit ? '#ffff00' : '#ff5252';
                const dmgSize  = isCrit ? 15 : 12;
                const dmgText  = isCrit ? `💥-${Math.round(damage)}` : `-${Math.round(damage)}`;
                BattleRenderer.addFloatingText(hcx, hcy, dmgText, dmgColor, dmgSize);

                if (isCrit) {
                    // Katta sariq burst
                    BattleRenderer.addExplosion(hcx, hcy, '#ffff00', 8);
                    BattleRenderer.addExplosion(hcx, hcy, '#ff9800', 5);
                    b._hitTime = Date.now(); // refresh flash
                } else if (Math.random() < 0.28) {
                    const sparkColor = b.type === 'wall' || b.type === 'gate' ? '#9e9e9e'
                                     : b.type === 'infernoColumn' || b.type === 'flamingCitadel' ? '#ff8c00'
                                     : '#ffca28';
                    BattleRenderer.addExplosion(hcx, hcy, sparkColor, 3);
                }
            }
        }

        if (b.hp <= 0) {
            AudioManager.playExplosion();

            // Effektlar — bino kattaligiga qarab kuchli portlash
            const bd = BUILDING_DATA[b.type];
            if (!bd) {
                // Noma'lum bino — minimal o'chirish (Grid freesiz, chunki size noma'lum)
                delete BuildingManager.buildings[id];
                this.destroyedCount++;
                this._pathsDirty = true;
                return;
            }
            const cx = b.x + bd.size[0] / 2;
            const cy = b.y + bd.size[1] / 2;
            const isLarge = bd.size[0] >= 3;
            const isTownHall = b.type === 'cityHall';
            const isClanCastle = b.type === 'praetorium';
            const isEpic = isTownHall || isClanCastle;

            if (isEpic) {
                // ── Epic destroy: TH/Praetorium — CoC uslubida dramatik portlash ──
                BattleRenderer.triggerShake(22 * Camera.zoom, 700);
                // Birinchi portlash — darhol
                BattleRenderer.addExplosion(cx, cy, '#ff5722', 35);
                BattleRenderer.addExplosion(cx, cy, '#ffeb3b', 18);
                BattleRenderer.addExplosion(cx, cy, '#757575', 20);
                // Epic debris — katta bo'laklar
                BattleRenderer.addDebris?.(cx, cy, '#8d6e63', 12);
                BattleRenderer.addDebris?.(cx, cy, '#ffd700', 6);
                BattleRenderer.addDebris?.(cx, cy, '#616161', 5);
                // Ko'p sonli kechiktirilgan portlashlar
                const epicDelays = isTownHall
                    ? [120, 250, 380, 500, 650, 820]
                    : [130, 280, 430, 580];
                epicDelays.forEach((delay, idx) => {
                    setTimeout(() => {
                        if (typeof BattleRenderer === 'undefined') return;
                        const ox = (Math.random() - 0.5) * bd.size[0] * 1.4;
                        const oy = (Math.random() - 0.5) * bd.size[1] * 1.4;
                        const colors = ['#ff5722','#ff8f00','#ffeb3b','#e040fb'];
                        BattleRenderer.addExplosion(cx + ox, cy + oy, colors[idx % colors.length], 18);
                        BattleRenderer.addExplosion(cx + ox, cy + oy, '#757575', 10);
                        BattleRenderer.triggerShake((10 - idx) * Camera.zoom, 200);
                    }, delay);
                });
                // Epic scorch mark — katta kuyish izi
                BattleRenderer.addGroundMark?.(cx, cy, bd.size[0] * 0.9, 25000);
                BattleRenderer.addGroundRing?.(cx, cy, '#ff6d00', bd.size[0] * 1.2, 1000);
                // Final flash + floating text
                setTimeout(() => {
                    if (typeof BattleRenderer === 'undefined') return;
                    BattleRenderer.addExplosion(cx, cy, '#ffd700', 25);
                    BattleRenderer.addGroundRing?.(cx, cy, '#ffd700', bd.size[0] * 1.5, 700);
                    if (isTownHall) {
                        BattleRenderer.addFloatingText(cx, cy - 2, '🏆 SHAHAR QULADI!', '#ffd700', 18);
                    } else {
                        BattleRenderer.addFloatingText(cx, cy - 2, '🏰 QAL\'A YIQILDI!', '#ff6f00', 16);
                    }
                }, epicDelays[epicDelays.length - 1] + 80);
            } else if (b.type === 'gate') {
                // ── Darvoza sinish — maxsus effekt ──────────────────────────────────
                BattleRenderer.triggerShake(12 * Camera.zoom, 500);
                BattleRenderer.addExplosion(cx, cy, '#8b6914', 20);
                BattleRenderer.addExplosion(cx, cy, '#795548', 12);
                BattleRenderer.addExplosion(cx, cy, '#ff8c00', 8);
                // 3 ta taxtacha uchib ketadi (staggered)
                [0, 80, 160].forEach((delay, i) => {
                    setTimeout(() => {
                        const ox = (Math.random() - 0.5) * 1.5;
                        const oy = (Math.random() - 0.5) * 1.0;
                        BattleRenderer.addExplosion(cx + ox, cy + oy, '#a0826d', 10);
                        BattleRenderer.addExplosion(cx + ox, cy + oy, '#5d4037', 6);
                    }, delay);
                });
                BattleRenderer.addGroundRing?.(cx, cy, '#cd853f', 3, 600);
            } else if (b.type === 'wall') {
                // ── Devor parchalanish — tosh bo'laklari ────────────────────────────
                BattleRenderer.triggerShake(8 * Camera.zoom, 350);
                BattleRenderer.addExplosion(cx, cy, '#9e9e9e', 14);
                BattleRenderer.addExplosion(cx, cy, '#616161', 8);
            } else {
                BattleRenderer.triggerShake(isLarge ? 16 * Camera.zoom : 10 * Camera.zoom, isLarge ? 450 : 300);
                // Olov portlash
                BattleRenderer.addExplosion(cx, cy, '#ff5722', isLarge ? 30 : 20);
                // Tutun
                BattleRenderer.addExplosion(cx, cy, '#757575', isLarge ? 18 : 10);
                // ── Uchuvchi bo'laklar — debris arcs ─────────────────────────────────
                const debrisColor = b.type === 'wall' || b.type === 'gate' ? '#8d6e63'
                                  : b.type === 'villa' || b.type === 'farm' ? '#a5896a'
                                  : bd.category === 'mudofaa' ? '#78909c'
                                  : '#8d6e63';
                BattleRenderer.addDebris?.(cx, cy, debrisColor, isLarge ? 9 : 6);
                if (isLarge) {
                    BattleRenderer.addDebris?.(cx, cy, '#616161', 4);
                    setTimeout(() => {
                        BattleRenderer.addExplosion(cx + (Math.random()-0.5)*2, cy + (Math.random()-0.5)*2, '#ff8f00', 15);
                        BattleRenderer.addDebris?.(cx, cy, debrisColor, 4);
                    }, 150);
                }
            }
            // Floating text (bino nomi)
            if (!isEpic) {
                const isWallOrGate = b.type === 'wall' || b.type === 'gate';
                const floatText = b.type === 'gate' ? '🚪 DARVOZA SINADI!' : isWallOrGate ? '🧱 Devor!' : '💥 Vayron!';
                const floatColor = b.type === 'gate' ? '#cd853f' : isWallOrGate ? '#9e9e9e' : '#ffcc02';
                BattleRenderer.addFloatingText(cx, cy - 1, floatText, floatColor, isWallOrGate ? 11 : 14);
            }

            // Vayron bo'ldi — rubble qoldiq effekti + scorch mark
            BattleRenderer.addGroundMark?.(cx, cy, Math.max(bd.size[0], bd.size[1]) * 0.55, 18000);
            if (!isEpic) {
                // Oddiy binolar: bir marta rubble
                BattleRenderer.addRubble(cx, cy, Math.max(bd.size[0], bd.size[1]), b.type);
            } else {
                // Epic binolar: ko'p rubble uchqunlari
                for (let ri = 0; ri < 4; ri++) {
                    const ro = bd.size[0] * 0.5;
                    BattleRenderer.addRubble(
                        cx + (Math.random() - 0.5) * ro,
                        cy + (Math.random() - 0.5) * ro,
                        bd.size[0] * 0.6,
                        b.type
                    );
                }
            }
            Grid.free(b.x, b.y, bd.size[0], bd.size[1]);
            
            // Loot olish + visual scatter
            if (b.storedLoot) {
                const goldAmt = b.storedLoot.gold || 0;
                const foodAmt = b.storedLoot.food || 0;
                if (goldAmt > 0) this.lootGained.gold += goldAmt;
                if (foodAmt > 0) this.lootGained.food += foodAmt;

                // Loot scatter particles — tangalar va olma uchadi
                if (typeof BattleRenderer !== 'undefined') {
                    const dominantColor = goldAmt >= foodAmt ? '#ffd700' : '#81c784';
                    BattleRenderer.addExplosion(cx, cy, dominantColor, Math.min(12, 3 + Math.ceil((goldAmt + foodAmt) / 1000)));
                    if (goldAmt > 0) BattleRenderer.addFloatingText(cx, cy - 1, `+🪙${Helpers.formatNumber(goldAmt)}`, '#ffd700', 12);
                    if (foodAmt > 0) BattleRenderer.addFloatingText(cx, cy - 1.5, `+🍎${Helpers.formatNumber(foodAmt)}`, '#81c784', 12);
                }
            }

            // CityHall vayron bo'ldimi? → yulduz uchun tracking
            if (BuildingManager.buildings[id]?.type === 'cityHall') {
                this.cityHallDestroyed = true;
            }
            delete BuildingManager.buildings[id];
            this.destroyedCount++;

            // ── Shu binoni nishon qilgan askarlarni zudlik bilan qayta-target qilish ──
            // (ayniqsa devor/darvoza yiqilganda — CoC-style responsive retarget)
            const idNum = typeof id === 'string' ? parseInt(id) : id;
            for (const t of this.troops) {
                if (t.target === idNum || t.target === id) {
                    t.target = null;
                    t._lastTargetSearch = 0;
                }
            }

            // ── Aries onDestroyWallSplash — devor/darvoza buzilganda atrofdagi devorldarga splash ──
            if ((b.type === 'wall' || b.type === 'gate') && attackerId != null) {
                const attTroop = this._troopsById.get(attackerId);
                if (attTroop) {
                    const attTd = TROOP_DATA[attTroop.type];
                    const splashFactor = attTd?.specialAbility?.onDestroyWallSplash;
                    const splashR      = attTd?.specialAbility?.splashRadius || 2.0;
                    if (splashFactor > 0) {
                        // Atrofdagi barcha devor/darvoza binalarga splash zarar
                        for (const [nid, nb] of Object.entries(BuildingManager.buildings)) {
                            if (nb.type !== 'wall' && nb.type !== 'gate') continue;
                            const dist = Helpers.distance(cx, cy, nb.x + 0.5, nb.y + 0.5);
                            if (dist <= splashR) {
                                const splashDmg = attTroop.damage * splashFactor * (attTd.stats.bonusVsWall || 1);
                                this._damageBuilding(parseInt(nid), splashDmg);
                                if (typeof BattleRenderer !== 'undefined') {
                                    BattleRenderer.addExplosion(nb.x + 0.5, nb.y + 0.5, '#cd853f', 8);
                                }
                            }
                        }
                    }
                }
            }

            // Dirty flag — keyingi frameda barcha askarlar yo'lini qayta hisoblaydi
            this._pathsDirty = true;
            // Defense keshini yangilash
            this._rebuildDefenseCache();
        }
    },

    _findNearestBuilding(x, y, preferWalls) {
        let nearest = null;
        let minDist = Infinity;

        for (const [id, b] of Object.entries(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue; // noma'lum bino turi
            let dist = Helpers.distance(x, y, b.x + bd.size[0]/2, b.y + bd.size[1]/2);
            
            // Qamal qurollari (Battering Ram) devorlarni nishonga oladi
            if (preferWalls && b.type === 'wall') dist -= 10;
            if (!preferWalls && b.type === 'wall') dist += 20; // Boshqalar devordan qochadi

            if (dist < minDist) {
                minDist = dist;
                nearest = id;
            }
        }
        return nearest;
    },

    // Joriy yulduzlar sonini olish (real vaqt)
    getLiveStars() {
        const percent = Math.floor((this.destroyedCount / this.totalBuildings) * 100);
        let thDestroyed = true;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'cityHall') { thDestroyed = false; break; }
        }
        let s = 0;
        if (thDestroyed) s++;
        if (percent >= 50) s++;
        if (percent === 100) s++;
        return s;
    },

    endBattle() {
        if (this.ended) return;
        this.ended = true;

        // ── Jang tugash cinematik: kamera biroz uzoqlashadi (CoC-style zoom-out) ─
        if (typeof Camera !== 'undefined' && Camera.tweenTo) {
            const midX = Grid.SIZE / 2, midY = Grid.SIZE / 2;
            Camera.tweenTo(midX, midY, 0.6, 750);
        }

        // Attack HUD ni yopish
        if (typeof AttackScreen !== 'undefined') AttackScreen.hideAttackHUD();

        // Natijalarni hisoblash
        const percent = Math.floor((this.destroyedCount / this.totalBuildings) * 100);
        let stars = 0;

        // Yulduz mantiq — TH vayron bo'ldimi?
        let thDestroyed = this.cityHallDestroyed;
        // Double-check: binolar ichida hali TIRIK TH bormi? (hp>0 shart!)
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'cityHall' && b.hp > 0) { thDestroyed = false; break; }
        }
        this.cityHallDestroyed = thDestroyed;

        if (thDestroyed) stars++;
        if (percent >= 50) stars++;
        if (percent === 100) stars++;

        const victory = stars > 0;

        // Win streak yangilash (live battles uchun — simulyatsiyada BattleSystem.attack() qiladi)
        if (victory) {
            BattleSystem.winStreak = (BattleSystem.winStreak || 0) + 1;
            if (typeof DailyMissions !== 'undefined') DailyMissions.track('winStreak', 1);
        } else {
            BattleSystem.winStreak = 0;
            if (typeof DailyMissions !== 'undefined') DailyMissions.resetProgress('winStreak');
        }

        // Loot berish
        Resources.add('gold', this.lootGained.gold);
        Resources.add('food', this.lootGained.food);

        // ── Loot fly animatsiya — CoC-style resurslar yuqoriga uchadi ──────────
        if (victory && typeof ResourceFlyAnim !== 'undefined') {
            const W = window.innerWidth || 400;
            const H = window.innerHeight || 700;
            const cx = W * 0.5;
            const cy = H * 0.5;
            if (this.lootGained.gold > 0) {
                setTimeout(() => ResourceFlyAnim.play(cx - 30, cy, 'gold', this.lootGained.gold), 400);
            }
            if (this.lootGained.food > 0) {
                setTimeout(() => ResourceFlyAnim.play(cx + 30, cy, 'food', this.lootGained.food), 600);
            }
        }

        // Trophies va XP
        let trophyChange = 0;
        let xp = 0;
        if (victory) {
            AudioManager.playVictory();
            trophyChange = Math.max(1, Math.floor(this.battleBaseInfo.trophyReward * (stars / 3)));
            xp = this.battleBaseInfo.xpReward;
            BattleSystem.trophies += trophyChange;
            XPSystem.addXP(xp);
        } else {
            // trophyLoss mavjud bo'lsa (online balanced trophy) — uni ishlatamiz
            const lossAmt = this.battleBaseInfo.trophyLoss
                ?? Math.max(1, Math.floor(this.battleBaseInfo.trophyReward / 2));
            trophyChange = -lossAmt;
            BattleSystem.trophies = Math.max(0, BattleSystem.trophies + trophyChange);
            xp = Math.floor(this.battleBaseInfo.xpReward / 4);
            XPSystem.addXP(xp);
        }

        // Logga qo'shish
        BattleSystem.battleLog.unshift({
            victory: victory,
            stars: stars,
            goldLoot: this.lootGained.gold,
            foodLoot: this.lootGained.food,
            xp: xp,
            trophyChange: trophyChange,
            lossPercent: 0,
            baseName: this.battleBaseInfo.name,
            time: Date.now()
        });
        if (BattleSystem.battleLog.length > 20) BattleSystem.battleLog.pop();
        BattleSystem.lastBattle = Date.now();

        // Bildirishnoma
        if (typeof NotificationSystem !== 'undefined') {
            const icon = victory ? '⚔️' : '🛡️';
            const title = victory ? 'Jang g\'alabasi!' : 'Jang mag\'lubiyati';
            const starsStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
            const tStr = trophyChange >= 0 ? `+${trophyChange}` : `${trophyChange}`;
            NotificationSystem.add('battle', title,
                `${starsStr} ${percent}% | 🏆 ${tStr} | 🪙+${Helpers.formatNumber(this.lootGained.gold || 0)}`,
                icon);
        }

        // Yutuqlar tracking
        if (typeof AchievementSystem !== 'undefined') {
            AchievementSystem.track('attackCount');
            if (victory) AchievementSystem.track('winCount');
            if (stars > 0) AchievementSystem.track('starsEarned', stars);
            const totalLoot = (this.lootGained.gold || 0) + (this.lootGained.food || 0);
            if (totalLoot > 0) AchievementSystem.track('totalLoot', totalLoot);
            AchievementSystem.set('trophies', BattleSystem.trophies);
        }

        // Kunlik missiyalar
        if (typeof DailyMissions !== 'undefined') {
            DailyMissions.track('deploy', this.deployedCount);
            if (victory) {
                DailyMissions.track('win', 1);
                DailyMissions.track('trophy', Math.max(0, trophyChange));
                DailyMissions.track('stars', stars);
                if (percent >= 50) DailyMissions.track('destroy50', 1);
            }
        }

        // Hero XP va regeneratsiya — barcha qahramonlar uchun
        if (typeof HeroSystem !== 'undefined') {
            const deployedHeroTypes = new Set(
                this._replayEvents
                    .filter(e => {
                        const td = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[e.troopType] : null;
                        return td && td.isHero;
                    })
                    .map(e => e.troopType)
            );
            for (const heroKey of deployedHeroTypes) {
                HeroSystem.grantBattleXP(heroKey, victory);
                // Qahramonlar armiyada saqlanmaydi — jangdan keyin regen boshlanadi
                HeroSystem.startRegen(heroKey);
            }
        }

        // League badge yangilash — prevTrophies ni uzatamiz (promo banner uchun)
        const prevTrophiesForLeague = BattleSystem.trophies - trophyChange;
        if (typeof BattleSystem.updateLeagueDisplay === 'function') {
            BattleSystem.updateLeagueDisplay(prevTrophiesForLeague);
        }
        const trophyEl = document.getElementById('trophy-count');
        if (trophyEl) trophyEl.textContent = BattleSystem.trophies;
        if (trophyChange !== 0) BattleSystem.showTrophyChange(trophyChange);

        const battleDuration = Math.floor((Date.now() - this.startTime) / 1000);

        // "Yangi Rekord" va keyingi daraja — campaign uchun
        let isNewBest    = false;
        let nextCampaignId = null;
        if (this.battleBaseInfo?.isCampaign && typeof CampaignProgress !== 'undefined') {
            const prevBest  = CampaignProgress.getCompleted(this.battleBaseInfo.campaignId);
            const prevStars = prevBest?.stars || 0;
            isNewBest = victory && stars > prevStars;

            if (victory && typeof CAMPAIGN_LEVELS !== 'undefined') {
                const nextId = (this.battleBaseInfo.campaignId || 0) + 1;
                if (CAMPAIGN_LEVELS.find(l => l.id === nextId)) nextCampaignId = nextId;
            }
        }

        // AttackScreen ga jang natijasini bildirish (kampaniya progress saqlash)
        if (typeof AttackScreen !== 'undefined') {
            AttackScreen.onBattleEnd({
                stars, victory, duration: battleDuration * 1000,
                goldLoot: this.lootGained.gold, foodLoot: this.lootGained.food
            });
        }

        // Kampaniya to'liq tugallandimi? — onBattleEnd (setCompleted) dan KEYIN tekshiriladi
        let isCampaignComplete = false;
        if (victory && this.battleBaseInfo?.isCampaign && typeof CampaignProgress !== 'undefined') {
            isCampaignComplete = CampaignProgress.isAllComplete?.() || false;
        }

        DeployPanel.showResult(victory, stars, this.lootGained, percent, xp, trophyChange, {
            deployed: this.deployedCount,
            destroyed: this.destroyedCount,
            total: this.totalBuildings,
            duration: battleDuration,
            baseName: this.battleBaseInfo?.name || '?',
            winStreak: BattleSystem.winStreak || 0,
            streakBonus: victory ? Math.min((BattleSystem.winStreak - 1) * 10, 40) : 0,
            isNewBest,
            nextCampaignId,
            isCampaign: !!this.battleBaseInfo?.isCampaign,
            isCampaignComplete,
            lootAvailable: { ...this.lootAvailable },
        });

        // Backend ga jang natijasini yuborish (async, UI ni bloklamaydi)
        if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
            const info = this.battleBaseInfo;
            Api.reportBattle({
                opponent_id:     info.opponent_id || info.id || 'unknown',
                is_bot:          info.is_bot !== false,
                stars:           stars,
                destruction_pct: percent,
                troops_used:     { ...TroopManager.army },
                replay_data:     this._replayEvents.length > 0 ? this._replayEvents : undefined,
            }).then(res => {
                if (res?.trophy_change !== undefined) {
                    // Backend trophy delta ni ishlatamiz
                    const delta = res.trophy_change - trophyChange;
                    if (delta !== 0) {
                        BattleSystem.trophies += delta;
                        BattleSystem.showTrophyChange(delta);
                    }
                    const tc = document.getElementById('trophy-count');
                    if (tc) tc.textContent = BattleSystem.trophies;
                }
                if (res?.loot) {
                    const goldDelta = (res.loot.gold || 0) - (this.lootGained.gold || 0);
                    const foodDelta = (res.loot.food || 0) - (this.lootGained.food || 0);
                    if (goldDelta > 0) Resources.add('gold', goldDelta);
                    else if (goldDelta < 0) Resources.spend('gold', -goldDelta);
                    if (foodDelta > 0) Resources.add('food', foodDelta);
                    else if (foodDelta < 0) Resources.spend('food', -foodDelta);
                }
            }).catch(e => console.warn('reportBattle error:', e.message));
        }

        // Ittifoq urushi natijasini yuborish
        if (this._warAttackInfo && typeof Api !== 'undefined' && Api.isLoggedIn()) {
            const warInfo = this._warAttackInfo;
            this._warAttackInfo = null;
            Api.warAttack(warInfo.defenderId, stars, percent)
                .then(() => Toast.show('⚔️ Urush hujumi qayd etildi!', 'success', 2500))
                .catch(e => Toast.show('⚠️ Urush natijasi saqlanmadi: ' + (e.data?.error || e.message), 'warn'));
        } else {
            this._warAttackInfo = null;
        }

        // Jangdan keyin shield ko'rsatish (hujumchi uchun emas, lekin keyingi login da yuklaydi)
        if (typeof ShieldHUD !== 'undefined') ShieldHUD.update();
    },

    returnHome() {
        // playerBaseData null bo'lsa ham barcha cleanup ni bajar — qotib qolmaslik uchun
        if (this.playerBaseData) {
            // Baza ma'lumotlarini tiklash
            try {
                BuildingManager.buildings = JSON.parse(this.playerBaseData.buildings);
                BuildingManager.nextId = this.playerBaseData.nextId;
                Grid.tiles = JSON.parse(this.playerBaseData.grid);
                ObstacleManager.obstacles = JSON.parse(this.playerBaseData.obstacles);
                ObstacleManager.nextId = this.playerBaseData.obsNextId;
            } catch(e) {
                console.error('[BattleManager] returnHome: baza tiklanmadi', e);
            }
            this.playerBaseData = null;
        }

        this.active = false;
        this.ended  = false;
        this._troopsById.clear();
        this.troops = [];
        this.guardTroops = [];
        this._defenseBuildings = [];
        this._pathsDirty = false;
        this.availableTroops = {};
        // Jang tugaganda spell effektlarini tozalash
        if (typeof SpellSystem !== 'undefined') SpellSystem._activeEffects = [];
        Game.mode = 'home';
        Game.gameSpeed = 1;
        // Render cache yangilash — uy bazasi tiklangandan keyin zarur
        Game.markRenderDirty();

        DeployPanel.hide();
        this._showHUD();
        Resources.updateDisplay();
        TroopManager.updateCapacity();

        // Pre-attack yoki battle overlay qoldiqlari
        document.getElementById('pre-attack-overlay')?.remove();
        document.getElementById('attack-hud')?.remove();
        document.getElementById('battle-result-modal')?.remove();
        document.getElementById('br-cinematic-overlay')?.remove();

        Camera.centerOn(Grid.SIZE / 2, Grid.SIZE / 2);
    },

    // ── QAHRAMONLARNI availableTroops GA QO'SHISH (battle start uchun) ─────────
    // Haykal qurilgan, TH darajasi yetarli, va uxlamayotgan qahramonlar
    _addHeroesToAvailableTroops() {
        if (typeof HeroSystem === 'undefined' || typeof HERO_CONFIG === 'undefined') return;
        const activeHeroes = HeroSystem.getActiveHeroes();
        for (const heroKey of activeHeroes) {
            const hero = HeroSystem.commanders[heroKey];
            if (!hero) continue;
            // Uxlab yotgan qahramonlarni ham ko'rsatish (deploy panelda disabled holatda)
            // Ammo ular availableTroops da 0 bo'ladi
            if (hero.sleeping) {
                this.availableTroops[heroKey] = 0; // Ko'rinadi, ammo deploy bo'lmaydi
            } else {
                this.availableTroops[heroKey] = 1; // Har qahramon 1 ta
            }
        }
    },

    // ── TUZOQLARNI TEKSHIRISH ─────────────────────────────────────────────────
    _checkTraps(now) {
        for (const [id, b] of Object.entries(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            if (!bd || bd.attackType !== 'trap') continue;
            if (b._triggered) continue;
            if (b._trapCooldown && now - b._trapCooldown < 3000) continue;

            const radius = bd.trapTriggerRadius || 0.8;
            const bcx = b.x + bd.size[0] / 2;
            const bcy = b.y + bd.size[1] / 2;
            const r2  = radius * radius;

            // SpatialGrid ishlatish — radius ichidagi askarlarni tez topish
            const nearTroops = (typeof SpatialGrid !== 'undefined' && SpatialGrid._cells)
                ? SpatialGrid.queryAll(bcx, bcy, radius, t => {
                    const td = TROOP_DATA[t.type];
                    return !(td && (td.avoidTraps || td.flying));
                  })
                : this.troops.filter(t => {
                    if (t.hp <= 0) return false;
                    const td = TROOP_DATA[t.type];
                    if (td && (td.avoidTraps || td.flying)) return false;
                    const dx = t.x - bcx, dy = t.y - bcy;
                    return dx*dx + dy*dy <= r2;
                  });

            for (const t of nearTroops) {
                if (t.hp <= 0) continue;

                const lv = bd.levels[b.level] || bd.levels[1];
                const damage = (lv && lv.damage) || 50;

                if (bd.poisonDamage) {
                    // Poison Trap — splash + DOT (spatial grid query)
                    const spl = bd.splashRadius || 1.8;
                    const splTroops = (typeof SpatialGrid !== 'undefined' && SpatialGrid._cells)
                        ? SpatialGrid.queryAll(bcx, bcy, spl, t2 => !(TROOP_DATA[t2.type]?.flying))
                        : this.troops;
                    for (const t2 of splTroops) {
                        if (t2.hp <= 0) continue;
                        const dx = t2.x - bcx, dy = t2.y - bcy;
                        if (dx*dx + dy*dy <= spl*spl) {
                            t2.hp -= damage;
                            t2.poisoned       = true;
                            t2.poisonDamage   = bd.poisonDamage;
                            t2.poisonTimeLeft = bd.poisonDuration || 5000;
                            t2.lastPoisonTick = now;
                        }
                    }
                    // Zahar tuzoq — yashil gaz portlash
                    BattleRenderer.addExplosion(bcx, bcy, '#40b040', 14);
                    BattleRenderer.addExplosion(bcx, bcy, '#00e676', 8);
                    BattleRenderer.addGroundRing?.(bcx, bcy, '#40b040', spl * 1.2, 800);
                    BattleRenderer.addFloatingText(bcx, bcy - 1, '☠️ ZAHAR!', '#69f0ae', 11);
                    BattleRenderer.triggerShake(6, 250);
                } else if (bd.splashRadius) {
                    // Alchemical Trap — splash (spatial grid query)
                    const spl2 = bd.splashRadius;
                    const splTroops2 = (typeof SpatialGrid !== 'undefined' && SpatialGrid._cells)
                        ? SpatialGrid.queryAll(bcx, bcy, spl2, t2 => !(TROOP_DATA[t2.type]?.flying))
                        : this.troops;
                    for (const t2 of splTroops2) {
                        if (t2.hp <= 0) continue;
                        const dx = t2.x - bcx, dy = t2.y - bcy;
                        if (dx*dx + dy*dy <= spl2*spl2) t2.hp -= damage;
                    }
                    // Bomba tuzoq — katta portlash
                    BattleRenderer.addExplosion(bcx, bcy, '#ff8c00', 22);
                    BattleRenderer.addExplosion(bcx, bcy, '#ff5722', 14);
                    BattleRenderer.addExplosion(bcx, bcy, '#ffcc02', 8);
                    BattleRenderer.addGroundRing?.(bcx, bcy, '#ff8c00', spl2 * 1.3, 700);
                    BattleRenderer.addGroundMark?.(bcx, bcy, spl2 * 0.8, 15000);
                    BattleRenderer.triggerShake(14, 400);
                    BattleRenderer.addFloatingText(bcx, bcy - 1, '💥 PORTLASH!', '#ff8c00', 12);
                } else {
                    // Spike Trap — individual nayza otilib chiqadi
                    t.hp -= damage;
                    BattleRenderer.addExplosion(bcx, bcy, '#a0522d', 10);
                    BattleRenderer.addExplosion(bcx, bcy, '#8b0000', 5);
                    // 5 ta yuqoriga otiladigan zarracha (nayza effekti)
                    for (let sp = 0; sp < 5; sp++) {
                        const ang = -Math.PI/2 + (Math.random() - 0.5) * 0.8;
                        BattleRenderer._smokeParticles?.push?.({
                            wx: bcx + (Math.random()-0.5) * 0.3,
                            wy: bcy,
                            color: '#795548',
                            size: 0.25 + Math.random() * 0.2,
                            life: 0.8 + Math.random() * 0.3,
                            decay: 0.018,
                            vx: Math.cos(ang) * 0.04,
                            vy: Math.sin(ang) * 0.06 - 0.03,
                        });
                    }
                    BattleRenderer.triggerShake(5, 200);
                    BattleRenderer.addFloatingText(bcx, bcy - 1, '💀 TUZOQ!', '#ff5722', 11);
                }

                if (bd.oneTimeUse) {
                    b._triggered = true;
                    this._damageBuilding(parseInt(id), b.hp + 1);
                } else {
                    b._trapCooldown = now;
                }
                break;
            }
        }
    },

    // ── NISHON TANLASH — CoC "Rule of 3" bilan ───────────────────────────────
    // CoC mantiq: 3 ta eng yaqin binoni tekshir → ulardan priority type bormi?
    // Bor bo'lsa shu tipni nishonga ol; yo'q bo'lsa globally eng yaqin priority tipga bor.
    // Yo'l narxi (devor kesib o'tish) ham hisobga olinadi.
    _findTarget(t, td) {
        const buildings = Object.values(BuildingManager.buildings);
        if (buildings.length === 0) return null;

        const priority = td.targetPriority || 'nearest';

        // ── Yordamchi funksiyalar ─────────────────────────────────────────────
        const isDefense  = (b) => BUILDING_DATA[b.type]?.category === 'mudofaa';
        const isResource = (b) => ['villa','farm','goldStorage','foodStorage'].includes(b.type);
        const isMilitia  = (b) => b.type === 'militia';
        const isWall     = (b) => b.type === 'wall' || b.type === 'gate';

        // Devor kesish penaltysi: askar pozitsiyasi va bino orasidagi yo'lda
        // nechta devor/darvoza turi bor (oddiy grid tekshiruv)
        const _wallPenalty = (ax, ay, bx, by) => {
            const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
            if (steps < 1) return 0;
            let walls = 0;
            for (let s = 1; s < steps; s++) {
                const ix = Math.round(ax + (bx - ax) * s / steps);
                const iy = Math.round(ay + (by - ay) * s / steps);
                const tile = (Grid.tiles[iy] || [])[ix];
                if (tile && tile.buildingId !== null) {
                    const tb = BuildingManager.buildings[tile.buildingId];
                    if (tb && (tb.type === 'wall' || tb.type === 'gate')) walls++;
                }
            }
            return walls * 1.5; // Har devor uchun +1.5 tile ekvivalenti
        };

        // Barcha binolarga masofani (+ devor penalty) hisoblash
        const withScore = buildings.map(b => {
            const bd = BUILDING_DATA[b.type];
            if (!bd) return null; // noma'lum bino — o'tkazib yuborish
            const bx = b.x + bd.size[0] / 2;
            const by = b.y + bd.size[1] / 2;
            const dist = Helpers.distance(t.x, t.y, bx, by);
            const wallPen = _wallPenalty(t.x, t.y, bx, by);
            return { b, dist, score: dist + wallPen };
        }).filter(Boolean); // null larni olib tashlash

        // Masofaga qarab saralash
        withScore.sort((a, z) => a.score - z.score);

        // ── "Rule of 3": top-3 ichida priority match qidiriladi ──────────────
        const top3 = withScore.slice(0, 3);

        let filterFn = null;
        if      (priority === 'defense')  filterFn = isDefense;
        else if (priority === 'resource') filterFn = isResource;
        else if (priority === 'militia')  filterFn = isMilitia;
        else if (priority === 'wall')     filterFn = isWall;

        if (filterFn) {
            // Top-3 ichida priority type bormi?
            const matchInTop3 = top3.find(e => filterFn(e.b));
            if (matchInTop3) return matchInTop3.b.id;

            // Top-3 da yo'q → globally eng yaqin priority tipga yur (path narxi bilan)
            const globalMatch = withScore.find(e => filterFn(e.b));
            if (globalMatch) return globalMatch.b.id;
        }

        // Default: eng yaqin bino (devor narxi hisoblab)
        return withScore[0]?.b.id ?? null;
    },

    // ── ZARAR BERISH (bonus multiplier + attack style) ────────────────────────
    _doAttack(t, td, b) {
        const s  = td.stats;
        const bd = BUILDING_DATA[b.type];
        if (!bd) return; // noma'lum bino turi — xavfsiz chiqish
        let dmg  = t.damage;

        if (s.bonusVsDefense  && bd.category === 'mudofaa')                                    dmg *= s.bonusVsDefense;
        if (s.bonusVsMilitia  && b.type === 'militia')                                         dmg *= s.bonusVsMilitia;
        if (s.bonusVsWall     && (b.type === 'wall' || b.type === 'gate'))                     dmg *= s.bonusVsWall;
        if (s.bonusVsResource && ['villa','farm','goldStorage','foodStorage'].includes(b.type)) dmg *= s.bonusVsResource;
        if (s.bonusVsBuilding)                                                                  dmg *= s.bonusVsBuilding;

        // Super troop bonuslari
        if (t._superVsDefense && bd.category === 'mudofaa') dmg *= t._superVsDefense;
        if (t._superWallBreaker && (b.type === 'wall' || b.type === 'gate')) dmg *= 2.0;

        const bx = b.x + bd.size[0] / 2;
        const by = b.y + bd.size[1] / 2;

        // Cyclops: melee OR rock throw based on current distance
        if (s.rockThrow) {
            const dist = Helpers.distance(t.x, t.y, bx, by);
            if (dist > t.range) {
                AudioManager.playArrow();
                this._spawnProjectile(t.x, t.y, b.id, s.rockDamage || Math.floor(dmg * 0.6), 'troop');
                return;
            }
        }

        // Splash damage: Minotaur (melee), Onager (siege_ranged), Cyclops (melee)
        if (s.splashDamage && s.splashRadius) {
            if (td.attackStyle === 'siege_ranged') {
                // Onager — projectile with splash payload
                AudioManager.playArrow();
                this._spawnProjectile(t.x, t.y, b.id, dmg, 'troop_splash', { splashRadius: s.splashRadius });
            } else {
                // Minotaur / Cyclops — immediate splash to adjacent buildings
                AudioManager.playSword();
                for (const [nid, nb] of Object.entries(BuildingManager.buildings)) {
                    const nbd = BUILDING_DATA[nb.type];
                    if (!nbd) continue; // noma'lum bino turi
                    const nx  = nb.x + nbd.size[0] / 2;
                    const ny  = nb.y + nbd.size[1] / 2;
                    if (Helpers.distance(bx, by, nx, ny) <= s.splashRadius) {
                        const factor = (parseInt(nid) === b.id) ? 1.0 : 0.5;
                        this._damageBuilding(parseInt(nid), dmg * factor);
                    }
                }
                // Stun nearby guard troops (Minotaur stunChance)
                if (s.stunChance) {
                    for (const g of this.guardTroops) {
                        if (Helpers.distance(g.x, g.y, bx, by) <= s.splashRadius) {
                            if (Math.random() < s.stunChance) {
                                g.stunned    = true;
                                g.stunExpiry = Date.now() + 1500;
                            }
                        }
                    }
                }
            }
            return;
        }

        // Ranged attack
        if (s.type === 'ranged') {
            AudioManager.playArrow();
            this._spawnProjectile(t.x, t.y, b.id, dmg, 'troop');

            // Super Archer: bir vaqtda bir nechta maqsadga otish
            if (t._superMultiTarget && t._superMultiTarget > 1) {
                const maxExtra = t._superMultiTarget - 1;
                const rangeSq  = ((t.range || 5) * 1.8) ** 2;
                const extras   = [];
                for (const [nid, nb] of Object.entries(BuildingManager.buildings)) {
                    if (parseInt(nid) === b.id || nb.hp <= 0) continue;
                    const nbd = BUILDING_DATA[nb.type];
                    if (!nbd) continue; // noma'lum bino turi
                    const nx  = nb.x + nbd.size[0] / 2;
                    const ny  = nb.y + nbd.size[1] / 2;
                    const dx  = t.x - nx, dy = t.y - ny;
                    if (dx*dx + dy*dy <= rangeSq) {
                        extras.push({ id: parseInt(nid), dist: dx*dx + dy*dy });
                    }
                }
                extras.sort((a, c) => a.dist - c.dist);
                for (let i = 0; i < Math.min(maxExtra, extras.length); i++) {
                    this._spawnProjectile(t.x, t.y, extras[i].id, Math.round(dmg * 0.55), 'troop');
                }
            }

            // Super Wizard: chain lightning (3 ta qurilmaga zanjir)
            if (t._superChain) {
                const chainCount = 3;
                const decay      = 0.55;
                let   chainDmg   = dmg * decay;
                const hit        = new Set([b.id]);
                let   lastX      = b.x + (BUILDING_DATA[b.type]?.size[0] || 1) / 2;
                let   lastY      = b.y + (BUILDING_DATA[b.type]?.size[1] || 1) / 2;
                for (let ci = 0; ci < chainCount; ci++) {
                    let nearest = null, nearDistSq = Infinity;
                    for (const nb of Object.values(BuildingManager.buildings)) {
                        if (hit.has(nb.id) || nb.hp <= 0) continue;
                        const nbd = BUILDING_DATA[nb.type];
                        if (!nbd) continue; // noma'lum bino turi
                        const nx  = nb.x + nbd.size[0] / 2;
                        const ny  = nb.y + nbd.size[1] / 2;
                        const d2  = (nx - lastX) ** 2 + (ny - lastY) ** 2;
                        if (d2 < nearDistSq && d2 < 36) { nearDistSq = d2; nearest = nb; }
                    }
                    if (!nearest) break;
                    hit.add(nearest.id);
                    this._spawnProjectile(lastX, lastY, nearest.id, chainDmg, 'troop');
                    const nbd2 = BUILDING_DATA[nearest.type];
                    if (!nbd2) break; // null guard
                    lastX    = nearest.x + nbd2.size[0] / 2;
                    lastY    = nearest.y + nbd2.size[1] / 2;
                    chainDmg *= decay;
                }
            }
            return;
        }

        // Super Troop splash (melee)
        if (t._superSplash && t._superSplashR) {
            AudioManager.playSword();
            const bx2 = b.x + bd.size[0] / 2;
            const by2 = b.y + bd.size[1] / 2;
            for (const [nid, nb] of Object.entries(BuildingManager.buildings)) {
                const nbd = BUILDING_DATA[nb.type];
                if (!nbd) continue; // noma'lum bino turi
                const nx  = nb.x + nbd.size[0] / 2;
                const ny  = nb.y + nbd.size[1] / 2;
                if (Helpers.distance(bx2, by2, nx, ny) <= t._superSplashR) {
                    const factor = (parseInt(nid) === b.id) ? 1.0 : 0.4;
                    this._damageBuilding(parseInt(nid), dmg * factor);
                }
            }
            return;
        }

        // Melee
        AudioManager.playSword();
        this._damageBuilding(b.id, dmg, t.id);
    },

    // ── SHIFOBAXSH — AOE davolash ─────────────────────────────────────────────
    _updateHealer(t, td, delta, now) {
        const s           = td.stats;
        const healRadius  = s.healRadius || 3.5;
        const healRate    = s.healRate   || 20;
        const healPerTick = healRate * delta;

        // Eng ko'p zarar ko'rgan yaqin askarga yurish
        let mostWounded = null, minRatio = 1.0;
        for (const ally of this.troops) {
            if (ally.id === t.id || ally.hp <= 0) continue;
            if (Helpers.distance(t.x, t.y, ally.x, ally.y) > healRadius * 3) continue;
            const ratio = ally.hp / ally.maxHp;
            if (ratio < minRatio) { minRatio = ratio; mostWounded = ally; }
        }

        if (mostWounded) {
            t._healTarget = mostWounded.id;  // Renderer uchun beam targeti
            const dist = Helpers.distance(t.x, t.y, mostWounded.x, mostWounded.y);
            if (dist > healRadius) {
                const ang = Math.atan2(mostWounded.y - t.y, mostWounded.x - t.x);
                t.x += Math.cos(ang) * t.speed * delta;
                t.y += Math.sin(ang) * t.speed * delta;
                t.state = 'moving';
            } else {
                t.state = 'attacking';
            }
        } else {
            t._healTarget = null;
            t.state = 'idle';
        }

        // AOE davolash — radius ichidagi barcha askarlarga
        const healTickInterval = 800; // ms
        const showHealFloat = (now - (t._lastHealFloat || 0)) > healTickInterval;
        if (showHealFloat) t._lastHealFloat = now;

        for (const ally of this.troops) {
            if (ally.id === t.id || ally.hp <= 0 || ally.hp >= ally.maxHp) continue;
            if (Helpers.distance(t.x, t.y, ally.x, ally.y) <= healRadius) {
                const healed = Math.min(ally.maxHp - ally.hp, healPerTick);
                ally.hp += healed;
                // Floating heal text (har 0.8s da)
                if (showHealFloat && typeof BattleRenderer !== 'undefined' && healed >= 0.5) {
                    // healRate per second * 0.8s interval ≈ display value
                    const displayVal = Math.round(healRate * (healTickInterval / 1000));
                    BattleRenderer.addFloatingText(ally.x, ally.y - 0.3, `+${displayVal}`, '#69f0ae', 11);
                }
            }
        }
    },

    // ── MILITSIYA / PRAETORIUM — qo'riqchi askarlar chiqarish ─────────────────
    _updateMilitia(b, bd, lv, now) {
        const spawnInterval = bd.attackSpeed || 30000;
        if (now - (b.lastShot || 0) < spawnInterval) return;
        b.lastShot = now;

        const cx = b.x + bd.size[0] / 2;
        const cy = b.y + bd.size[1] / 2;

        // Praetorium — darajaga qarab kuchliroq askarlar
        const isPraetorium = b.type === 'praetorium';
        const count = isPraetorium ? (lv.guardsCount || 4) : 2;
        const baseHp  = isPraetorium ? 120 + b.level * 40 : 80;
        const baseDmg = isPraetorium ? 18 + b.level * 6  : 10;
        const spd     = isPraetorium ? 1.5 : 1.2;
        const rng     = isPraetorium ? 1.2 : 1.0;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.guardTroops.push({
                id: 'g_' + Math.random().toString(36).substr(2, 7),
                x: cx + Math.cos(angle) * 1.5,
                y: cy + Math.sin(angle) * 1.5,
                hp: baseHp, maxHp: baseHp,
                damage: baseDmg,
                speed: spd,
                range: rng,
                lastAttack: 0,
                stunned: false,
                stunExpiry: 0,
                state: 'idle',
                _isPraetorianGuard: isPraetorium,
            });
        }

        if (typeof BattleRenderer !== 'undefined') {
            if (isPraetorium) {
                // Praetorium — dramatik chiqish effekti
                BattleRenderer.addExplosion(cx, cy, '#cd853f', 20);
                BattleRenderer.addExplosion(cx, cy, '#8d6e63', 12);
                BattleRenderer.addGroundRing?.(cx, cy, '#cd853f', 3.5, 700);
                BattleRenderer.triggerShake(8, 350);
                BattleRenderer.addFloatingText(cx, cy - 1, `🏰 +${count} Praetorian!`, '#cd853f', 13);
            } else {
                // Militia — oddiy chiqish
                BattleRenderer.addExplosion(cx, cy, '#546e7a', 12);
                BattleRenderer.addGroundRing?.(cx, cy, '#78909c', 2.5, 500);
                BattleRenderer.addFloatingText(cx, cy - 1, `⚔️ +${count} Militsiya!`, '#90a4ae', 11);
            }
        }
    },

    _hideHUD() {
        // Barcha ochiq panellarni yopish
        if (typeof Game !== 'undefined') Game._closeAllPanels?.();
        document.getElementById('hud-bottom').style.display = 'none';
        document.getElementById('build-menu').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _showHUD() {
        document.getElementById('hud-bottom').style.display = 'flex';
    }
};
