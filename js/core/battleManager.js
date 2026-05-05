// ============================================
// BATTLE MANAGER - Jonli jang tizimi
// ============================================

const BattleManager = {
    active: false,
    playerBaseData: null,

    // Jang ma'lumotlari
    troops: [],
    _troopsById: new Map(),   // O(1) troop lookup (projectile targetlash uchun)
    guardTroops: [],          // Militsiya qo'riqchi askarlari
    projectiles: [],
    enemyBuildings: {},
    _defenseBuildings: [],    // Faqat mudofaa binolari keshi
    availableTroops: {},

    // Natijalar
    lootAvailable: { gold: 0, food: 0 },
    lootGained: { gold: 0, food: 0 },
    destroyedCount: 0,
    totalBuildings: 0,
    startTime: 0,
    timeLimit: 180000,
    ended: false,
    battleBaseInfo: null,
    _pathsDirty: false,      // Bino vayron bo'lganda yo'llarni qayta hisoblash

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
        this.battleBaseInfo = base;
        this.startTime = Date.now();
        this.troops = [];
        this._troopsById.clear();
        this.guardTroops = [];
        this.projectiles = [];
        this._pathsDirty = false;
        this.availableTroops = { ...TroopManager.army };
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

        // Kamerani markazga
        Camera.centerOn(Grid.SIZE / 2, Grid.SIZE / 2);
        
        // Deploy UI ni ochish
        DeployPanel.show();
        Toast.show(`⚔️ ${base.name} ga hujum boshlandi!`, 'warning');
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
        this.availableTroops = { ...TroopManager.army };

        Game.mode = 'attack';
        this._hideHUD();
        
        Grid.init();
        BuildingManager.buildings = {};
        ObstacleManager.obstacles = {};
        BuildingManager.nextId = 1;
        
        // Dushman bazasini yuklash
        const bList = JSON.parse(opponentData.baseLayout || '[]');
        for (const b of bList) {
            const id = BuildingManager.nextId++;
            const bd = BUILDING_DATA[b.type];
            const lv = bd.levels[b.level] || bd.levels[1];

            BuildingManager.buildings[id] = {
                id: id,
                type: b.type,
                x: b.x,
                y: b.y,
                level: b.level,
                hp: lv.hp,
                maxHp: lv.hp,
                building: false,
                storedLoot: { gold: 0, food: 0 },
                lastShot: 0
            };
            Grid.occupy(b.x, b.y, bd.size[0], bd.size[1], id);
        }

        const lootG = opponentData.level * 1000 + Math.floor(Math.random() * 500);
        const lootF = opponentData.level * 1000 + Math.floor(Math.random() * 500);
        
        this.lootAvailable = { gold: lootG, food: lootF };
        this.lootGained = { gold: 0, food: 0 };
        this._distributeLoot();

        this.enemyBuildings = BuildingManager.buildings;
        this.totalBuildings = Object.keys(this.enemyBuildings).length;
        this.destroyedCount = 0;
        this._rebuildDefenseCache();

        this.battleBaseInfo = {
            id: opponentData.id,
            name: opponentData.name,
            difficulty: Math.min(5, Math.max(1, opponentData.level / 2)),
            lootGold: [lootG, lootG],
            lootFood: [lootF, lootF],
            xpReward: opponentData.level * 50,
            trophyReward: Math.floor(Math.random() * 20) + 10
        };

        Camera.centerOn(Grid.SIZE / 2, Grid.SIZE / 2);
        DeployPanel.show();
        Toast.show(`🌍 Hujum: ${opponentData.name}!`, 'error');
        AudioManager.playSword();
    },

    _generateEnemyBase(base) {
        // Gridni tozalash
        Grid.init();
        BuildingManager.buildings = {};
        ObstacleManager.obstacles = {};
        BuildingManager.nextId = 1;
        ObstacleManager.nextId = 1;

        const center = Math.floor(Grid.SIZE / 2);

        // Town Hall
        this._spawnEnemyBuilding('cityHall', base.requiredLevel, center - 1, center - 1);

        // Boshqa binolarni yaratish qiyinlik darajasiga qarab
        const bCount = 5 + base.difficulty * 2;
        const bTypes = ['villa', 'farm', 'goldStorage', 'foodStorage', 'archerTower', 'wall', 'scorpio'];
        
        for (let i = 0; i < bCount; i++) {
            const type = bTypes[Math.floor(Math.random() * (Math.min(base.difficulty + 2, bTypes.length)))];
            const level = Math.max(1, Math.floor(Math.random() * base.difficulty));
            
            this._placeRandomBuilding(type, level, center);
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
            return bd && bd.category === 'mudofaa' && bd.levels[b.level] && bd.levels[b.level].damage;
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
        const storages = Object.values(BuildingManager.buildings).filter(b => 
            b.type === 'cityHall' || b.type === 'goldStorage' || b.type === 'foodStorage'
        );

        if (storages.length === 0) return;

        const goldPerNode = Math.floor(this.lootAvailable.gold / storages.length);
        const foodPerNode = Math.floor(this.lootAvailable.food / storages.length);

        for (const b of storages) {
            b.storedLoot = { gold: goldPerNode, food: foodPerNode };
        }
    },

    deployTroop(type, x, y) {
        if (!this.availableTroops[type] || this.availableTroops[type] <= 0) return false;
        
        // Qizil zona tekshiruvi (faqat binolardan uzoqroq joyga)
        if (!this._canDeployAt(x, y)) {
            Toast.show("Qizil zonaga askar tashlab bo'lmaydi!", "error");
            return false;
        }

        const data = TROOP_DATA[type];
        const bonus = ResearchSystem.getTroopBonus(type);

        const troop = {
            id: Math.random().toString(36).substr(2, 9),
            type: type,
            x: x,
            y: y,
            hp: data.stats.hp + bonus.hp,
            maxHp: data.stats.hp + bonus.hp,
            damage: data.stats.damage + bonus.damage,
            speed: data.stats.speed,
            range: data.stats.range,
            target: null,
            state: 'idle', // idle, moving, attacking
            lastAttack: 0,
            attackSpeed: 1000 // ms
        };

        this.troops.push(troop);
        this._troopsById.set(troop.id, troop);
        this.availableTroops[type]--;

        TroopManager.loseTroop(type, 1);
        
        DeployPanel.update();
        return true;
    },

    _canDeployAt(tx, ty) {
        // Asosiy tekshiruv: birorta binogacha bo'lgan masofa kamida 3 tile bo'lishi kerak
        for (const b of Object.values(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
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
            for (const count of Object.values(this.availableTroops)) {
                if (count > 0) hasMore = true;
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
            }
            this._pathsDirty = false;
        }

        // ── BURN EFFEKTLARINI YANGILASH ──────────────────────────────────────────
        for (const t of this.troops) {
            if (!t.burning || t.hp <= 0) continue;
            if (now - t.lastBurnTick > 1000) {
                t.lastBurnTick = now;
                t.hp -= t.burnDamage;
                t.burnTimeLeft -= 1000;
                if (t.burnTimeLeft <= 0) { t.burning = false; }
            }
        }

        // ── TUZOQLARNI TEKSHIRISH ─────────────────────────────────────────────
        this._checkTraps(now);

        // ── ASKARLARNI YANGILASH ──────────────────────────────────────────────
        for (let i = this.troops.length - 1; i >= 0; i--) {
            const t = this.troops[i];

            if (t.hp <= 0) {
                this._troopsById.delete(t.id);
                this.troops.splice(i, 1);
                continue;
            }

            const td = TROOP_DATA[t.type];
            if (!td) continue;

            // SHIFOBAXSH — alohida logika
            if (td.stats.type === 'healer') {
                this._updateHealer(t, td, delta, now);
                continue;
            }

            // NISHON TANLASH — targetPriority ga mos
            if (!t.target || !BuildingManager.buildings[t.target]) {
                t.target = this._findTarget(t, td);
                t.path = null;
            }

            if (!t.target) { t.state = 'idle'; continue; }

            const b  = BuildingManager.buildings[t.target];
            const bd = BUILDING_DATA[b.type];
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
                if (td.flying) {
                    // UCHUVCHI — to'g'ri chiziq, pathfinding yo'q
                    const angle = Math.atan2(by - t.y, bx - t.x);
                    t.x += Math.cos(angle) * t.speed * delta;
                    t.y += Math.sin(angle) * t.speed * delta;
                } else {
                    // YER ASKARI — A* pathfinding
                    if (!t.path || t.path.length === 0) {
                        t.path = Pathfinding.findPath(t.x, t.y, bx, by);
                    }
                    if (t.path && t.path.length > 0) {
                        const nx = t.path[0].x + 0.5;
                        const ny = t.path[0].y + 0.5;
                        const ang = Math.atan2(ny - t.y, nx - t.x);
                        const mv  = t.speed * delta;

                        // Devor to'siqmi?
                        const gx = Math.floor(t.x + Math.cos(ang) * mv * 2);
                        const gy = Math.floor(t.y + Math.sin(ang) * mv * 2);
                        const tile = (Grid.tiles[gy] || [])[gx];
                        let hitWall = false;
                        if (tile && tile.buildingId !== null && tile.buildingId !== t.target) {
                            const obs = BuildingManager.buildings[tile.buildingId];
                            if (obs && (obs.type === 'wall' || obs.type === 'gate')) {
                                t.state = 'attacking';
                                hitWall = true;
                                const wallAtkSpd = t.type === 'aries' ? 800 : 1400;
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
                        t.x += Math.cos(ang) * t.speed * delta;
                        t.y += Math.sin(ang) * t.speed * delta;
                    }
                }
            }
        }

        // ── MUDOFAA BINOLARI — targetType ga qarab nishon tanlash ────────────
        for (const b of this._defenseBuildings) {
            if (!BuildingManager.buildings[b.id]) continue;
            const bd  = BUILDING_DATA[b.type];
            const lv  = bd.levels[b.level];
            const bcx = b.x + bd.size[0] / 2;
            const bcy = b.y + bd.size[1] / 2;
            const atkSpd = bd.attackSpeed || 1500;

            if (now - b.lastShot < atkSpd) continue;

            // targetType: 'air' → faqat uchuvchilar, 'ground' → faqat yer
            const wantAir = bd.targetType === 'air';

            // Tuzoqlar boshqacha ishlaydi (checkTraps da)
            if (bd.attackType === 'trap') continue;

            // Spawn (Militia) boshqacha
            if (bd.attackType === 'spawn_troops') {
                this._updateMilitia(b, bd, lv, now);
                continue;
            }

            let nearest = null;
            let minDist  = lv.range;

            for (const t of this.troops) {
                const isFlying = TROOP_DATA[t.type]?.flying || false;
                if (wantAir && !isFlying) continue;   // Cloud Buster: faqat uchuvchilar
                if (!wantAir && isFlying) continue;    // Ground defenses: uchuvchini o'tmaydi

                // Cloud Buster minimum range tekshiruvi
                if (bd.type === 'cloudBuster' && bd.minRange) {
                    const d = Helpers.distance(bcx, bcy, t.x, t.y);
                    if (d < bd.minRange) continue;
                }

                const dist = Helpers.distance(bcx, bcy, t.x, t.y);
                if (dist < minDist) { minDist = dist; nearest = t; }
            }

            if (!nearest) continue;
            b.lastShot = now;
            AudioManager.playArrow();

            if (bd.attackType === 'splash' || bd.attackType === 'fire_splash') {
                // Splash zarar — atrofdagi hammaga
                this._spawnProjectile(bcx, bcy, nearest.id, lv.damage, 'defense_splash', {
                    splashRadius: bd.splashRadius || 2,
                    fire: bd.attackType === 'fire_splash',
                    burnDamage: bd.burnDamage || 0,
                    burnDuration: bd.burnDuration || 0,
                });
            } else {
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
                tx = targetB.x + bd.size[0]/2; ty = targetB.y + bd.size[1]/2;
            }

            const dist = Helpers.distance(p.x, p.y, tx, ty);
            const moveAmt = 8 * delta;

            if (dist <= moveAmt) {
                if (p.type === 'defense') {
                    const tr = this._troopsById.get(p.targetId);
                    if (tr) tr.hp -= p.damage;

                } else if (p.type === 'defense_splash') {
                    // Splash at impact point — damages all troops in radius
                    for (const t of this.troops) {
                        if (t.hp <= 0) continue;
                        if (Helpers.distance(t.x, t.y, tx, ty) <= (p.splashRadius || 2)) {
                            t.hp -= p.damage;
                            if (p.fire && p.burnDamage) {
                                t.burning      = true;
                                t.burnDamage   = p.burnDamage;
                                t.burnTimeLeft = p.burnDuration || 3000;
                                t.lastBurnTick = now;
                            }
                        }
                    }
                    BattleRenderer.addExplosion(tx, ty, p.fire ? '#ff4500' : '#ff8800', 10);

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

                } else {
                    this._damageBuilding(p.targetId, p.damage);
                }
                this.projectiles.splice(i, 1);
            } else {
                const angle = Math.atan2(ty - p.y, tx - p.x);
                p.x += Math.cos(angle) * moveAmt;
                p.y += Math.sin(angle) * moveAmt;
            }
        }
    },

    _shootBuilding(troop, b) {
        const data = TROOP_DATA[troop.type];
        if (data.stats.type === 'melee' || data.stats.type === 'siege') {
            // Yaqindan urish (projectile yo'q)
            AudioManager.playSword();
            let dmg = troop.damage;
            if (data.stats.bonusVsBuildings && b.type === 'wall') {
                dmg *= data.stats.bonusVsBuildings;
            }
            this._damageBuilding(b.id, dmg);
        } else {
            // Uzoqdan otish
            AudioManager.playArrow();
            this._spawnProjectile(troop.x, troop.y, b.id, troop.damage, 'troop');
        }
    },

    _spawnProjectile(x, y, targetId, damage, type, opts = {}) {
        this.projectiles.push({
            startX: x, startY: y,
            x: x, y: y,
            targetId: targetId,
            damage: damage,
            type: type,
            ...opts
        });
    },

    _damageBuilding(id, damage) {
        const b = BuildingManager.buildings[id];
        if (!b) return;

        b.hp -= damage;
        if (b.hp <= 0) {
            AudioManager.playExplosion();
            
            // Effektlar
            BattleRenderer.triggerShake(10 * Camera.zoom, 300);
            const bd = BUILDING_DATA[b.type];
            BattleRenderer.addExplosion(b.x + bd.size[0]/2, b.y + bd.size[1]/2, '#ff5722', 20);
            BattleRenderer.addExplosion(b.x + bd.size[0]/2, b.y + bd.size[1]/2, '#757575', 10); // Smoke

            // Vayron bo'ldi
            Grid.free(b.x, b.y, bd.size[0], bd.size[1]);
            
            // Loot olish
            if (b.storedLoot) {
                if (b.storedLoot.gold > 0) this.lootGained.gold += b.storedLoot.gold;
                if (b.storedLoot.food > 0) this.lootGained.food += b.storedLoot.food;
            }

            delete BuildingManager.buildings[id];
            this.destroyedCount++;

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

    endBattle() {
        if (this.ended) return;
        this.ended = true;

        // Natijalarni hisoblash
        const percent = Math.floor((this.destroyedCount / this.totalBuildings) * 100);
        let stars = 0;
        
        // Yulduz mantiq
        let thDestroyed = true;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'cityHall') { thDestroyed = false; break; }
        }

        if (thDestroyed) stars++;
        if (percent >= 50) stars++;
        if (percent === 100) stars++;

        const victory = stars > 0;
        
        // Loot berish
        Resources.add('gold', this.lootGained.gold);
        Resources.add('food', this.lootGained.food);

        // Trophies va XP
        let trophyChange = 0;
        let xp = 0;
        if (victory) {
            AudioManager.playVictory();
            trophyChange = Math.max(1, Math.floor(this.battleBaseInfo.trophyReward * (stars/3)));
            xp = this.battleBaseInfo.xpReward;
            BattleSystem.trophies += trophyChange;
            XPSystem.addXP(xp);
        } else {
            trophyChange = -Math.max(1, Math.floor(this.battleBaseInfo.trophyReward / 2));
            BattleSystem.trophies = Math.max(0, BattleSystem.trophies + trophyChange);
            xp = Math.floor(this.battleBaseInfo.xpReward / 4);
            XPSystem.addXP(xp);
        }

        // Professional Result Panelni ko'rsatish
        BattleResultPanel.show(stars, percent, this.lootGained, trophyChange, xp, victory);

        // Logga qo'shish
        BattleSystem.battleLog.unshift({
            victory: victory,
            stars: stars,
            goldLoot: this.lootGained.gold,
            foodLoot: this.lootGained.food,
            xp: xp,
            trophyChange: trophyChange,
            lossPercent: 0, // todo
            baseName: this.battleBaseInfo.name,
            time: Date.now()
        });
        if (BattleSystem.battleLog.length > 20) BattleSystem.battleLog.pop();
        BattleSystem.lastBattle = Date.now();

        DeployPanel.showResult(victory, stars, this.lootGained, percent, xp, trophyChange);
    },

    returnHome() {
        if (!this.playerBaseData) return;

        // Baza ma'lumotlarini tiklash
        BuildingManager.buildings = JSON.parse(this.playerBaseData.buildings);
        BuildingManager.nextId = this.playerBaseData.nextId;
        Grid.tiles = JSON.parse(this.playerBaseData.grid);
        ObstacleManager.obstacles = JSON.parse(this.playerBaseData.obstacles);
        ObstacleManager.nextId = this.playerBaseData.obsNextId;

        this.playerBaseData = null;
        this.active = false;
        this._troopsById.clear();
        this.guardTroops = [];
        this._defenseBuildings = [];
        this._pathsDirty = false;
        Game.mode = 'home';
        
        DeployPanel.hide();
        this._showHUD();
        Resources.updateDisplay();
        
        Camera.centerOn(Grid.SIZE / 2, Grid.SIZE / 2);
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

            for (const t of this.troops) {
                if (t.hp <= 0) continue;
                const td = TROOP_DATA[t.type];
                if (td && (td.avoidTraps || td.flying)) continue; // Speculator & Harpy immune

                if (Helpers.distance(t.x, t.y, bcx, bcy) > radius) continue;

                const lv = bd.levels[b.level] || bd.levels[1];
                const damage = (lv && lv.damage) || 50;

                if (bd.splashRadius) {
                    // Alchemical Trap — splash
                    for (const t2 of this.troops) {
                        if (t2.hp <= 0) continue;
                        const td2 = TROOP_DATA[t2.type];
                        if (td2 && td2.flying) continue;
                        if (Helpers.distance(t2.x, t2.y, bcx, bcy) <= bd.splashRadius) {
                            t2.hp -= damage;
                        }
                    }
                    BattleRenderer.addExplosion(bcx, bcy, '#ff8c00', 12);
                    BattleRenderer.addExplosion(bcx, bcy, '#8B4513', 6);
                } else {
                    // Spike Trap — single
                    t.hp -= damage;
                    BattleRenderer.addExplosion(bcx, bcy, '#a0522d', 6);
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

    // ── NISHON TANLASH (targetPriority) ──────────────────────────────────────
    _findTarget(t, td) {
        const buildings = Object.values(BuildingManager.buildings);
        if (buildings.length === 0) return null;

        const priority = td.targetPriority || 'nearest';

        const getNearest = (list) => {
            let best = null, minDist = Infinity;
            for (const b of list) {
                const bd = BUILDING_DATA[b.type];
                const dist = Helpers.distance(t.x, t.y, b.x + bd.size[0]/2, b.y + bd.size[1]/2);
                if (dist < minDist) { minDist = dist; best = b.id; }
            }
            return best;
        };

        const isDefense  = (b) => BUILDING_DATA[b.type]?.category === 'mudofaa';
        const isResource = (b) => ['villa', 'farm', 'goldStorage', 'foodStorage'].includes(b.type);
        const isMilitia  = (b) => b.type === 'militia';
        const isWall     = (b) => b.type === 'wall' || b.type === 'gate';

        let preferred = null;
        if      (priority === 'defense')  preferred = buildings.filter(isDefense);
        else if (priority === 'resource') preferred = buildings.filter(isResource);
        else if (priority === 'militia')  preferred = buildings.filter(isMilitia);
        else if (priority === 'wall')     preferred = buildings.filter(isWall);

        if (preferred && preferred.length > 0) return getNearest(preferred);
        return getNearest(buildings);
    },

    // ── ZARAR BERISH (bonus multiplier + attack style) ────────────────────────
    _doAttack(t, td, b) {
        const s  = td.stats;
        const bd = BUILDING_DATA[b.type];
        let dmg  = t.damage;

        if (s.bonusVsDefense  && bd.category === 'mudofaa')                                    dmg *= s.bonusVsDefense;
        if (s.bonusVsMilitia  && b.type === 'militia')                                         dmg *= s.bonusVsMilitia;
        if (s.bonusVsWall     && (b.type === 'wall' || b.type === 'gate'))                     dmg *= s.bonusVsWall;
        if (s.bonusVsResource && ['villa','farm','goldStorage','foodStorage'].includes(b.type)) dmg *= s.bonusVsResource;
        if (s.bonusVsBuilding)                                                                  dmg *= s.bonusVsBuilding;

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
            return;
        }

        // Melee
        AudioManager.playSword();
        this._damageBuilding(b.id, dmg);
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
            t.state = 'idle';
        }

        // AOE davolash — radius ichidagi barcha askarlarga
        for (const ally of this.troops) {
            if (ally.id === t.id || ally.hp <= 0 || ally.hp >= ally.maxHp) continue;
            if (Helpers.distance(t.x, t.y, ally.x, ally.y) <= healRadius) {
                ally.hp = Math.min(ally.maxHp, ally.hp + healPerTick);
            }
        }
    },

    // ── MILITSIYA — qo'riqchi askarlar chiqarish ──────────────────────────────
    _updateMilitia(b, bd, lv, now) {
        const spawnInterval = bd.attackSpeed || 30000;
        if (now - (b.lastShot || 0) < spawnInterval) return;
        b.lastShot = now;

        const cx = b.x + bd.size[0] / 2;
        const cy = b.y + bd.size[1] / 2;

        for (let i = 0; i < 2; i++) {
            const angle = (i / 2) * Math.PI * 2;
            this.guardTroops.push({
                id: 'g_' + Math.random().toString(36).substr(2, 7),
                x: cx + Math.cos(angle) * 1.5,
                y: cy + Math.sin(angle) * 1.5,
                hp: 80, maxHp: 80,
                damage: 10,
                speed: 1.2,
                range: 1.0,
                lastAttack: 0,
                stunned: false,
                stunExpiry: 0,
                state: 'idle'
            });
        }
    },

    _hideHUD() {
        document.getElementById('hud-bottom').style.display = 'none';
        document.getElementById('build-menu').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _showHUD() {
        document.getElementById('hud-bottom').style.display = 'flex';
    }
};
