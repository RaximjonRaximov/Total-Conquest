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
        affects: ['legionary', 'centurion', 'praetorian', 'gladiator'],
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
        affects: ['legionary', 'centurion', 'praetorian', 'gladiator'],
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
        affects: ['archer', 'crossbowman', 'scorpioOperator'],
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
        affects: ['archer', 'crossbowman', 'scorpioOperator'],
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
        affects: ['cavalry', 'cataphract'],
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
        affects: ['battering_ram', 'war_elephant'],
        levels: {
            1: { cost: { gold: 8000, food: 5000 }, time: 1800, bonus: { hp: 50, damage: 15 } },
            2: { cost: { gold: 30000, food: 15000 }, time: 7200, bonus: { hp: 100, damage: 30 } },
            3: { cost: { gold: 100000, food: 50000 }, time: 28800, bonus: { hp: 200, damage: 50 } }
        },
        description: 'Maxsus qurol va hayvonlar kuchini oshiradi.'
    }
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

    // Askar bonusini olish
    getTroopBonus(troopType) {
        let bonus = { hp: 0, damage: 0 };
        for (const [researchId, rd] of Object.entries(RESEARCH_DATA)) {
            if (!rd.affects.includes(troopType)) continue;
            const level = this.levels[researchId] || 0;
            if (level === 0) continue;
            const lv = rd.levels[level];
            if (lv && lv.bonus) {
                bonus.hp += lv.bonus.hp || 0;
                bonus.damage += lv.bonus.damage || 0;
            }
        }
        return bonus;
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
    }
};
