// ============================================
// BATTLE MANAGER - Jonli jang tizimi
// ============================================

const BattleManager = {
    active: false,
    playerBaseData: null,
    
    // Jang ma'lumotlari
    troops: [],
    projectiles: [],
    enemyBuildings: {},
    availableTroops: {}, // deploy qilish uchun
    
    // Natijalar
    lootAvailable: { gold: 0, food: 0 },
    lootGained: { gold: 0, food: 0 },
    destroyedCount: 0,
    totalBuildings: 0,
    startTime: 0,
    timeLimit: 180000, // 3 minut
    ended: false,
    battleBaseInfo: null,

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

        // Jang parametrlarini sozlash
        this.active = true;
        this.ended = false;
        this.battleBaseInfo = base;
        this.startTime = Date.now();
        this.troops = [];
        this.projectiles = [];
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
        this.projectiles = [];
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
        this.availableTroops[type]--;
        
        // Haqiqiy yo'qotish (darhol armiyadan olinadi)
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

    // Jang tsikli (har freymda chaqiriladi)
    update() {
        if (!this.active || this.ended) return;

        const now = Date.now();
        const delta = 16 / 1000; // taxminan 60 FPS

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

        // Askarlarni yangilash
        for (let i = this.troops.length - 1; i >= 0; i--) {
            const t = this.troops[i];
            
            // O'lgan askarlarni tozalash
            if (t.hp <= 0) {
                this.troops.splice(i, 1);
                continue;
            }

            // Shifobaxsh askarlar binolarga hujum qilmaydi (ular alohida logikada boshqariladi)
            const troopData = TROOP_DATA[t.type];
            if (troopData && troopData.stats.type === 'healer') continue;

            // Nishonni qidirish
            if (!t.target || !BuildingManager.buildings[t.target]) {
                t.target = this._findNearestBuilding(t.x, t.y, t.type === 'battering_ram');
            }

            if (t.target) {
                const b = BuildingManager.buildings[t.target];
                const bd = BUILDING_DATA[b.type];
                
                const bx = b.x + bd.size[0]/2 - 0.5;
                const by = b.y + bd.size[1]/2 - 0.5;
                
                const dist = Helpers.distance(t.x, t.y, bx, by);
                const attackDist = t.range + Math.max(bd.size[0], bd.size[1])/2;

                if (dist <= attackDist) {
                    // Hujum qilish
                    t.state = 'attacking';
                    if (now - t.lastAttack >= t.attackSpeed) {
                        t.lastAttack = now;
                        this._shootBuilding(t, b);
                    }
                } else {
                    // Harakatlanish
                    t.state = 'moving';
                    
                    // A* Pathfinding yo'lini qidirish
                    if (!t.path || t.path.length === 0 || Math.random() < 0.05) { // 5% ehtimol bilan qayta hisoblash (dinamiklik)
                        t.path = Pathfinding.findPath(t.x, t.y, bx, by);
                    }

                    if (t.path && t.path.length > 0) {
                        const nextStep = t.path[0];
                        const stepX = nextStep.x + 0.5; // Katak markaziga qarab
                        const stepY = nextStep.y + 0.5;
                        
                        const angle = Math.atan2(stepY - t.y, stepX - t.x);
                        const moveDist = t.speed * delta;
                        const distToStep = Helpers.distance(t.x, t.y, stepX, stepY);
                        
                        // Oldindagi tile ni tekshirish (Devorlarga hujum)
                        const gx = Math.floor(t.x + Math.cos(angle) * moveDist * 2);
                        const gy = Math.floor(t.y + Math.sin(angle) * moveDist * 2);
                        const tile = Grid.tiles[gy] ? Grid.tiles[gy][gx] : null;
                        
                        let hitWall = false;
                        if (tile && tile.buildingId !== null && tile.buildingId !== t.target) {
                            const obstacle = BuildingManager.buildings[tile.buildingId];
                            if (obstacle && (obstacle.type === 'wall' || t.type === 'battering_ram')) {
                                // Devorni urish
                                t.state = 'attacking';
                                hitWall = true;
                                if (now - t.lastAttack >= t.attackSpeed) {
                                    t.lastAttack = now;
                                    this._shootBuilding(t, obstacle);
                                }
                            }
                        }

                        if (!hitWall) {
                            if (distToStep <= moveDist) {
                                t.x = stepX;
                                t.y = stepY;
                                t.path.shift(); // Bu qadamga yetdik
                            } else {
                                t.x += Math.cos(angle) * moveDist;
                                t.y += Math.sin(angle) * moveDist;
                            }
                        }
                    } else {
                        // Fallback: Agar yo'l umuman bo'lmasa, to'g'ri yuradi
                        const angle = Math.atan2(by - t.y, bx - t.x);
                        t.x += Math.cos(angle) * t.speed * delta;
                        t.y += Math.sin(angle) * t.speed * delta;
                    }
                }
            } else {
                t.state = 'idle';
            }
        }

        // === SHIFOBAXSH (Healer) logikasi ===
        for (const t of this.troops) {
            if (t.hp <= 0) continue;
            const tData = TROOP_DATA[t.type];
            if (!tData || tData.stats.type !== 'healer') continue;

            // Eng kam HP li do'st askarni topish
            let weakest = null;
            let lowestHpRatio = 1;
            for (const ally of this.troops) {
                if (ally.id === t.id || ally.hp <= 0) continue;
                if (TROOP_DATA[ally.type] && TROOP_DATA[ally.type].stats.type === 'healer') continue;
                const ratio = ally.hp / ally.maxHp;
                if (ratio < lowestHpRatio) {
                    lowestHpRatio = ratio;
                    weakest = ally;
                }
            }

            if (weakest && lowestHpRatio < 0.95) {
                const dist = Helpers.distance(t.x, t.y, weakest.x, weakest.y);
                if (dist <= tData.stats.range) {
                    // Davolash
                    t.state = 'attacking'; // aslida "healing"
                    if (now - t.lastAttack >= 1000) {
                        t.lastAttack = now;
                        weakest.hp = Math.min(weakest.maxHp, weakest.hp + tData.stats.healRate);
                    }
                } else {
                    // Yaqinlashish
                    t.state = 'moving';
                    const angle = Math.atan2(weakest.y - t.y, weakest.x - t.x);
                    t.x += Math.cos(angle) * tData.stats.speed * delta;
                    t.y += Math.sin(angle) * tData.stats.speed * delta;
                }
            } else {
                // Hech kimni davolash shart emas — qo'shin ortidan yurish
                if (this.troops.length > 1) {
                    let avgX = 0, avgY = 0, count = 0;
                    for (const a of this.troops) {
                        if (a.id !== t.id && a.hp > 0) {
                            avgX += a.x; avgY += a.y; count++;
                        }
                    }
                    if (count > 0) {
                        avgX /= count; avgY /= count;
                        const dist = Helpers.distance(t.x, t.y, avgX, avgY);
                        if (dist > 2) {
                            t.state = 'moving';
                            const angle = Math.atan2(avgY - t.y, avgX - t.x);
                            t.x += Math.cos(angle) * tData.stats.speed * delta;
                            t.y += Math.sin(angle) * tData.stats.speed * delta;
                        }
                    }
                }
            }
        }

        // Mudofaa binolarini yangilash
        for (const [id, b] of Object.entries(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            if (bd.category === 'mudofaa' && bd.levels[b.level].damage) {
                const lv = bd.levels[b.level];
                
                // Eng yaqin askarni topish
                let nearest = null;
                let minDist = lv.range;

                for (const t of this.troops) {
                    const dist = Helpers.distance(b.x + bd.size[0]/2, b.y + bd.size[1]/2, t.x, t.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = t;
                    }
                }

                if (nearest && now - b.lastShot > 1500) { // mudofaa otish tezligi
                    b.lastShot = now;
                    AudioManager.playArrow();
                    this._spawnProjectile(
                        b.x + bd.size[0]/2, b.y + bd.size[1]/2,
                        nearest.id,
                        lv.damage,
                        'defense'
                    );
                }
            }
        }

        // Snaryadlarni yangilash
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            let tx, ty;
            if (p.type === 'defense') {
                const targetTroop = this.troops.find(tr => tr.id === p.targetId);
                if (!targetTroop) { this.projectiles.splice(i, 1); continue; }
                tx = targetTroop.x; ty = targetTroop.y;
            } else {
                const targetB = BuildingManager.buildings[p.targetId];
                if (!targetB) { this.projectiles.splice(i, 1); continue; }
                const bd = BUILDING_DATA[targetB.type];
                tx = targetB.x + bd.size[0]/2; ty = targetB.y + bd.size[1]/2;
            }

            const dist = Helpers.distance(p.x, p.y, tx, ty);
            const moveAmt = 8 * delta; // snaryad tezligi

            if (dist <= moveAmt) {
                // Tegdi
                if (p.type === 'defense') {
                    const tr = this.troops.find(tr => tr.id === p.targetId);
                    if (tr) tr.hp -= p.damage;
                } else {
                    this._damageBuilding(p.targetId, p.damage);
                }
                this.projectiles.splice(i, 1);
            } else {
                // Harakatlanish
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

    _spawnProjectile(x, y, targetId, damage, type) {
        this.projectiles.push({
            startX: x, startY: y,
            x: x, y: y,
            targetId: targetId,
            damage: damage,
            type: type // 'troop' or 'defense'
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

            // Yangi nishon qidirish uchun askarlarni yangilash
            for (const t of this.troops) {
                if (t.target === id) t.target = null;
            }
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
        Game.mode = 'home';
        
        DeployPanel.hide();
        this._showHUD();
        Resources.updateDisplay();
        
        Camera.centerOn(Grid.SIZE / 2, Grid.SIZE / 2);
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
