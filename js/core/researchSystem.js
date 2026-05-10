// ============================================
// TADQIQOT TIZIMI (Research System)
// Temirchida askar kuchlarini oshirish
// ============================================

const RESEARCH_DATA = {
    // PIYODA TADQIQOTLARI
    sharpSwords: {
        name: 'Keskin Qilich',
        icon: '🗡️',
        category: 'piyoda',
        affects: ['legionary', 'speculator', 'praetorian', 'gladiator'],
        levels: {
            1: { cost: { gold: 2000 }, time: 300, bonus: { damage: 3 } },
            2: { cost: { gold: 8000 }, time: 1200, bonus: { damage: 6 } },
            3: { cost: { gold: 25000 }, time: 3600, bonus: { damage: 10 } },
            4: { cost: { gold: 80000 }, time: 14400, bonus: { damage: 15 } },
            5: { cost: { gold: 200000 }, time: 43200, bonus: { damage: 22 } }
        },
        description: 'Piyoda askarlar zarar kuchini oshiradi.'
    },

    ironShields: {
        name: 'Temir Qalqon',
        icon: '🛡️',
        category: 'piyoda',
        affects: ['legionary', 'speculator', 'praetorian', 'gladiator'],
        levels: {
            1: { cost: { gold: 1500, food: 500 }, time: 300, bonus: { hp: 15 } },
            2: { cost: { gold: 6000, food: 2000 }, time: 1200, bonus: { hp: 30 } },
            3: { cost: { gold: 20000, food: 5000 }, time: 3600, bonus: { hp: 50 } },
            4: { cost: { gold: 60000, food: 15000 }, time: 14400, bonus: { hp: 80 } },
            5: { cost: { gold: 150000, food: 40000 }, time: 43200, bonus: { hp: 120 } }
        },
        description: 'Piyoda askarlar HP ni oshiradi.'
    },

    // KAMONCHI TADQIQOTLARI
    flameArrows: {
        name: 'Olovli O\'q',
        icon: '🔥',
        category: 'otishma',
        affects: ['sagittarius', 'ballistarius', 'ballistae'],
        levels: {
            1: { cost: { gold: 3000 }, time: 600, bonus: { damage: 5 } },
            2: { cost: { gold: 12000 }, time: 1800, bonus: { damage: 10 } },
            3: { cost: { gold: 40000 }, time: 7200, bonus: { damage: 18 } },
            4: { cost: { gold: 120000 }, time: 28800, bonus: { damage: 28 } }
        },
        description: 'Otishma askarlarning zarar kuchini oshiradi.'
    },

    longRange: {
        name: 'Uzoq Manzil',
        icon: '🎯',
        category: 'otishma',
        affects: ['sagittarius', 'ballistarius', 'ballistae'],
        levels: {
            1: { cost: { gold: 4000, food: 1000 }, time: 600, bonus: { hp: 10 } },
            2: { cost: { gold: 15000, food: 4000 }, time: 1800, bonus: { hp: 20 } },
            3: { cost: { gold: 50000, food: 12000 }, time: 7200, bonus: { hp: 35 } }
        },
        description: 'Otishma askarlar chidamliligini oshiradi.'
    },

    // OTLIQ TADQIQOTLARI
    horseArmor: {
        name: 'Ot Zirhli',
        icon: '🐴',
        category: 'otliq',
        affects: ['centaur', 'cataphract', 'sagittarius_equites'],
        levels: {
            1: { cost: { gold: 5000, food: 2000 }, time: 900, bonus: { hp: 25, damage: 5 } },
            2: { cost: { gold: 20000, food: 8000 }, time: 3600, bonus: { hp: 50, damage: 10 } },
            3: { cost: { gold: 60000, food: 20000 }, time: 14400, bonus: { hp: 80, damage: 18 } },
            4: { cost: { gold: 180000, food: 60000 }, time: 43200, bonus: { hp: 120, damage: 28 } }
        },
        description: 'Otliq askarlar kuchini va chidamliligini oshiradi.'
    },

    // MAXSUS TADQIQOTLARI
    siegeEngineering: {
        name: 'Qamal Texnologiyasi',
        icon: '🔧',
        category: 'maxsus',
        affects: ['aries', 'onager', 'minotaur'],
        levels: {
            1: { cost: { gold: 8000, food: 5000 }, time: 1800, bonus: { hp: 50, damage: 15 } },
            2: { cost: { gold: 30000, food: 15000 }, time: 7200, bonus: { hp: 100, damage: 30 } },
            3: { cost: { gold: 100000, food: 50000 }, time: 28800, bonus: { hp: 200, damage: 50 } }
        },
        description: 'Maxsus qurol va hayvonlar kuchini oshiradi.'
    },

    // HARAKAT TEZLIGI TADQIQOTLARI
    swiftFootwork: {
        name: 'Tez Yuriш',
        icon: '💨',
        category: 'harakat',
        affects: ['legionary', 'speculator', 'sagittarius', 'ballistarius', 'centaur'],
        levels: {
            1: { cost: { gold: 4000, food: 1000 }, time: 600,   bonus: { speed: 0.05 } },  // +5%
            2: { cost: { gold: 15000, food: 4000 }, time: 2400,  bonus: { speed: 0.10 } },  // +10%
            3: { cost: { gold: 50000, food: 15000 }, time: 9600, bonus: { speed: 0.15 } },  // +15%
        },
        description: 'Piyoda va otishma askarlar harakatlanish tezligini oshiradi.'
    },

    cavalryCharge: {
        name: 'Otliq Hujum',
        icon: '⚡',
        category: 'harakat',
        affects: ['centaur', 'cataphract'],
        levels: {
            1: { cost: { gold: 8000, food: 3000 }, time: 1200,  bonus: { speed: 0.10, damage: 5 } },
            2: { cost: { gold: 30000, food: 10000 }, time: 4800, bonus: { speed: 0.20, damage: 12 } },
            3: { cost: { gold: 100000, food: 35000 }, time: 18000, bonus: { speed: 0.30, damage: 20 } },
        },
        description: 'Otliq askarlar tezligi va zarari oshadi.'
    },

    rapidTraining: {
        name: 'Tezkor Tayyorlov',
        icon: '⏩',
        category: 'harakat',
        affects: ['legionary', 'speculator', 'sagittarius', 'ballistarius', 'centaur', 'cataphract'],
        levels: {
            1: { cost: { gold: 6000, food: 2000 }, time: 900,   bonus: { trainTime: -0.08 } }, // -8%
            2: { cost: { gold: 25000, food: 8000 }, time: 3600,  bonus: { trainTime: -0.15 } }, // -15%
            3: { cost: { gold: 80000, food: 25000 }, time: 14400, bonus: { trainTime: -0.22 } }, // -22%
        },
        description: 'Askarlarni tayyorlash vaqtini qisqartiradi.'
    },

    // QURILISH TADQIQOTLARI
    engineeringKnowledge: {
        name: 'Muhandislik Bilimi',
        icon: '🏗️',
        category: 'qurilish',
        affects: [],
        levels: {
            1: { cost: { gold: 5000 }, time: 900, bonus: { buildTimeReduction: 0.05 } },
            2: { cost: { gold: 20000, food: 5000 }, time: 3600, bonus: { buildTimeReduction: 0.10 } },
            3: { cost: { gold: 60000, food: 20000 }, time: 14400, bonus: { buildTimeReduction: 0.15 } },
            4: { cost: { gold: 200000, food: 80000 }, time: 43200, bonus: { buildTimeReduction: 0.20 } },
        },
        description: 'Bino qurilish va yangilash vaqtini qisqartiradi.'
    },

    masterBuilders: {
        name: 'Usta Qurilischilar',
        icon: '⚒️',
        category: 'qurilish',
        affects: [],
        levels: {
            1: { cost: { gold: 10000, food: 3000 }, time: 1800, bonus: { buildCostReduction: 0.05 } },
            2: { cost: { gold: 40000, food: 12000 }, time: 7200, bonus: { buildCostReduction: 0.10 } },
            3: { cost: { gold: 150000, food: 50000 }, time: 28800, bonus: { buildCostReduction: 0.15 } },
        },
        description: 'Bino qurilish va yangilash narxini kamaytiradi.'
    },
};

const ResearchSystem = {
    // Har bir tadqiqotning hozirgi darajasi
    levels: {}, // researchId -> level (0 = tadqiq qilinmagan)

    // Hozir tadqiqot qilinmoqdami
    currentResearch: null, // {id, timerId}

    // Temirchi binosi darajasi
    getBlacksmithLevel() {
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'blacksmith' && !b.building) {
                return b.level;
            }
        }
        return 0;
    },

    // Tadqiqot boshlash
    startResearch(researchId) {
        if (this.currentResearch) {
            Toast.show("Allaqachon tadqiqot ketmoqda!", "warning");
            return false;
        }

        const bsLevel = this.getBlacksmithLevel();
        if (bsLevel === 0) {
            Toast.show("Avval Temirchi quring!", "error");
            return false;
        }

        const rd = RESEARCH_DATA[researchId];
        if (!rd) return false;

        const currentLevel = this.levels[researchId] || 0;
        const nextLevel = currentLevel + 1;
        const levelData = rd.levels[nextLevel];
        if (!levelData) {
            Toast.show("Maksimal daraja!", "warning");
            return false;
        }

        // Temirchi darajasini tekshirish (har 2 ta research level = 1 blacksmith level)
        const requiredBsLevel = Math.ceil(nextLevel / 2);
        if (bsLevel < requiredBsLevel) {
            Toast.show(`Temirchi Lvl ${requiredBsLevel} kerak!`, "warning");
            return false;
        }

        // Narxni tekshirish
        if (!Resources.canAfford(levelData.cost)) {
            Toast.show("Resurs yetarli emas!", "error");
            return false;
        }
        Resources.spendMultiple(levelData.cost);

        // Timer boshlash
        const timerId = timerManager.add(
            levelData.time,
            () => {
                this.levels[researchId] = nextLevel;
                this.currentResearch = null;
                XPSystem.addXP(nextLevel * 10);
                Toast.show(`${rd.icon} ${rd.name} Lvl ${nextLevel} tugallandi!`, 'reward');
                this._showResearchCompleteBanner(rd, nextLevel);
                if (typeof NotificationSystem !== 'undefined') {
                    NotificationSystem.add('research', `${rd.name} tadqiqot tugadi!`,
                        `Lvl ${nextLevel} — qo'shinlarga bonus qo'llanildi`, rd.icon);
                }
                if (typeof AchievementSystem !== 'undefined') {
                    AchievementSystem.track('researchCount');
                }
                if (typeof DailyMissions !== 'undefined') {
                    DailyMissions.track('research', 1);
                }
            },
            null,
            { researchId }
        );

        this.currentResearch = { id: researchId, timerId };
        Toast.show(`${rd.icon} ${rd.name} tadqiqot boshlandi...`, 'info');
        return true;
    },

    // Tezlashtirish
    speedUpResearch() {
        if (!this.currentResearch) return false;
        const remaining = timerManager.getRemaining(this.currentResearch.timerId);
        const gemCost = Helpers.calcGemCost(remaining);
        if (!Resources.spend('diamond', gemCost)) {
            Toast.show("Olmos yetarli emas!", "error");
            return false;
        }
        timerManager.instant(this.currentResearch.timerId);
        return true;
    },

    // Askar uchun ko'rsatish darajasi (deploy card uchun) — 1-10
    // Qo'llaniladigan barcha tadqiqotlar o'rtacha darajasi
    getTroopDisplayLevel(troopType) {
        let totalLevels = 0, researchCount = 0;
        let maxPossible = 0;
        for (const [researchId, rd] of Object.entries(RESEARCH_DATA)) {
            if (!rd.affects.includes(troopType)) continue;
            const maxLv = Math.max(...Object.keys(rd.levels).map(Number));
            maxPossible += maxLv;
            totalLevels += (this.levels[researchId] || 0);
            researchCount++;
        }
        if (researchCount === 0 || maxPossible === 0) return 1;
        // 0% → 1, 100% → 10
        return Math.max(1, Math.round(1 + (totalLevels / maxPossible) * 9));
    },

    // Askar bonusini olish
    getTroopBonus(troopType) {
        let bonus = { hp: 0, damage: 0, speed: 0, trainTime: 0 };
        for (const [researchId, rd] of Object.entries(RESEARCH_DATA)) {
            if (!rd.affects.includes(troopType)) continue;
            const level = this.levels[researchId] || 0;
            if (level === 0) continue;
            const lv = rd.levels[level];
            if (lv && lv.bonus) {
                bonus.hp        += lv.bonus.hp         || 0;
                bonus.damage    += lv.bonus.damage      || 0;
                bonus.speed     += lv.bonus.speed       || 0;
                bonus.trainTime += lv.bonus.trainTime   || 0; // negative = faster
            }
        }
        return bonus;
    },

    // Qurilish vaqti multiplikatori (1.0 = o'zgarmagan, 0.8 = 20% kamaygan)
    getBuildTimeMultiplier() {
        const lv = this.levels['engineeringKnowledge'] || 0;
        if (lv === 0) return 1;
        const bonus = RESEARCH_DATA.engineeringKnowledge.levels[lv]?.bonus?.buildTimeReduction || 0;
        return Math.max(0.5, 1 - bonus);
    },

    // Qurilish narxi multiplikatori
    getBuildCostMultiplier() {
        const lv = this.levels['masterBuilders'] || 0;
        if (lv === 0) return 1;
        const bonus = RESEARCH_DATA.masterBuilders.levels[lv]?.bonus?.buildCostReduction || 0;
        return Math.max(0.5, 1 - bonus);
    },

    // Mavjud tadqiqotlar
    getAvailable() {
        const bsLevel = this.getBlacksmithLevel();
        const result = [];
        for (const [id, rd] of Object.entries(RESEARCH_DATA)) {
            const currentLevel = this.levels[id] || 0;
            const nextLevel = currentLevel + 1;
            const levelData = rd.levels[nextLevel];
            const maxed = !levelData;
            const requiredBsLevel = maxed ? 0 : Math.ceil(nextLevel / 2);
            const locked = bsLevel < requiredBsLevel;

            result.push({
                id,
                ...rd,
                currentLevel,
                nextLevel: maxed ? currentLevel : nextLevel,
                maxed,
                locked,
                requiredBsLevel,
                nextLevelData: levelData
            });
        }
        return result;
    },

    _showResearchCompleteBanner(rd, level) {
        // Overlay flash (purple tint for research)
        const flash = document.createElement('div');
        flash.style.cssText = `
            position:fixed;inset:0;z-index:19990;pointer-events:none;
            background:radial-gradient(ellipse at center,rgba(126,87,194,0.15) 0%,transparent 70%);
            animation:achFlash 0.6s ease-out forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 650);

        const banner = document.createElement('div');
        banner.style.cssText = `
            position:fixed;top:72px;left:50%;
            transform:translateX(-50%) translateY(-18px);opacity:0;
            background:linear-gradient(160deg,#0d0a1a 0%,#16103a 50%,#0d0a1a 100%);
            border:2px solid #7e57c2;border-radius:16px;
            padding:13px 22px 11px;z-index:20000;
            min-width:230px;max-width:300px;text-align:center;
            box-shadow:0 0 0 1px rgba(126,87,194,0.15),
                       0 4px 28px rgba(126,87,194,0.45),
                       0 0 50px rgba(126,87,194,0.12);
            transition:transform 0.42s cubic-bezier(.175,.885,.32,1.275),opacity 0.28s;
            cursor:pointer;
        `;

        // Bonus info
        const levelData = rd.levels?.[level];
        const bonusLines = [];
        if (levelData?.bonus) {
            const b = levelData.bonus;
            if (b.damage)    bonusLines.push(`⚔️ +${b.damage} zarar`);
            if (b.hp)        bonusLines.push(`❤️ +${b.hp} HP`);
            if (b.speed)     bonusLines.push(`⚡ +${b.speed} tezlik`);
            if (b.trainTime) bonusLines.push(`⏱ ${Math.abs(b.trainTime)}s tezroq tayyorlanish`);
            if (b.buildTimeReduction) bonusLines.push(`🔨 -${Math.round(b.buildTimeReduction*100)}% qurilish vaqt`);
        }

        banner.innerHTML = `
            <div style="position:absolute;top:0;left:12%;right:12%;height:2px;
                        background:linear-gradient(90deg,transparent,#7e57c2,transparent);
                        border-radius:2px;"></div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:3px;
                        color:#b39ddb;font-weight:700;margin-bottom:7px;">✦ Tadqiqot Tugallandi ✦</div>
            <div style="width:56px;height:56px;border-radius:50%;margin:0 auto 8px;
                        background:radial-gradient(circle,rgba(126,87,194,0.3) 0%,rgba(126,87,194,0.05) 70%);
                        border:2px solid rgba(126,87,194,0.6);
                        display:flex;align-items:center;justify-content:center;font-size:28px;
                        box-shadow:0 0 16px rgba(126,87,194,0.5);
                        animation:achIconPulse 1.8s ease-in-out infinite;">
                ${rd.icon}
            </div>
            <div style="font-family:'Cinzel',serif;font-size:13px;font-weight:700;
                        color:#ce93d8;margin-bottom:3px;text-shadow:0 0 10px rgba(206,147,216,0.5);">
                ${rd.name}
            </div>
            <div style="font-size:10px;color:rgba(200,200,200,0.5);margin-bottom:${bonusLines.length ? 7 : 0}px;">
                Daraja ${level} tugallandi
            </div>
            ${bonusLines.length ? `
            <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
                ${bonusLines.map(b => `<span style="display:inline-flex;align-items:center;gap:2px;
                    background:rgba(126,87,194,0.15);border:1px solid rgba(126,87,194,0.25);
                    border-radius:12px;padding:2px 7px;font-size:10px;color:#b39ddb;font-weight:600;">
                    ${b}</span>`).join('')}
            </div>` : ''}
            <div style="position:absolute;bottom:0;left:12%;right:12%;height:1px;
                        background:linear-gradient(90deg,transparent,rgba(126,87,194,0.35),transparent);"></div>
        `;

        document.body.appendChild(banner);
        requestAnimationFrame(() => {
            banner.style.transform = 'translateX(-50%) translateY(0)';
            banner.style.opacity = '1';
        });

        if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();

        const timer = setTimeout(() => {
            banner.style.transform = 'translateX(-50%) translateY(-14px)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.3s ease-in,opacity 0.25s';
            setTimeout(() => banner.remove(), 320);
        }, 3500);
        banner.onclick = () => {
            clearTimeout(timer);
            banner.style.transform = 'translateX(-50%) translateY(-14px)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.22s ease-in,opacity 0.18s';
            setTimeout(() => banner.remove(), 240);
        };
    }
};
