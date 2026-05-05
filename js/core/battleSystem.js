// ============================================
// JANG TIZIMI (Battle System)
// NPC bazalarga hujum, loot olish
// ============================================

const ENEMY_BASES = [
    {
        id: 'base_1',
        name: 'Barbar Qishloqi',
        icon: '🏚️',
        difficulty: 1,
        lootGold: [200, 500],
        lootFood: [100, 300],
        xpReward: 15,
        trophyReward: 5,
        enemyForce: 80,
        requiredLevel: 1,
        description: 'Zaif barbar qishloqi. Dastlabki jang uchun ideal.'
    },
    {
        id: 'base_2',
        name: 'Qaroqchilar Makon',
        icon: '⛺',
        difficulty: 2,
        lootGold: [400, 1000],
        lootFood: [200, 600],
        xpReward: 30,
        trophyReward: 10,
        enemyForce: 200,
        requiredLevel: 2,
        description: 'Qaroqchilar guruhi. O\'rtacha kuchli.'
    },
    {
        id: 'base_3',
        name: 'Gall Qal\'asi',
        icon: '🏰',
        difficulty: 3,
        lootGold: [800, 2000],
        lootFood: [500, 1200],
        xpReward: 50,
        trophyReward: 15,
        enemyForce: 400,
        requiredLevel: 3,
        description: 'Kuchli Gall jangchilari tomonidan himoyalangan qal\'a.'
    },
    {
        id: 'base_4',
        name: 'Kartajen Shahri',
        icon: '🏛️',
        difficulty: 4,
        lootGold: [1500, 4000],
        lootFood: [1000, 2500],
        xpReward: 80,
        trophyReward: 20,
        enemyForce: 700,
        requiredLevel: 4,
        description: 'Kartajen imperiyasining mustahkam shahri.'
    },
    {
        id: 'base_5',
        name: 'Parfiya Qo\'rg\'oni',
        icon: '🏯',
        difficulty: 5,
        lootGold: [3000, 8000],
        lootFood: [2000, 5000],
        xpReward: 120,
        trophyReward: 30,
        enemyForce: 1200,
        requiredLevel: 5,
        description: 'Sharqning eng kuchli qo\'rg\'oni. Faqat botirlar uchun!'
    },
    {
        id: 'base_6',
        name: 'Teutoburg O\'rmoni',
        icon: '🌲',
        difficulty: 6,
        lootGold: [5000, 15000],
        lootFood: [3000, 8000],
        xpReward: 180,
        trophyReward: 40,
        enemyForce: 2000,
        requiredLevel: 6,
        description: 'German qabilalari yashiringan dahshatli o\'rmon.'
    },
    {
        id: 'base_7',
        name: 'Misr Piramidasi',
        icon: '🏺',
        difficulty: 7,
        lootGold: [10000, 30000],
        lootFood: [5000, 15000],
        xpReward: 250,
        trophyReward: 50,
        enemyForce: 3500,
        requiredLevel: 7,
        description: 'Qadimiy Misrning eng boy xazinasi.'
    },
    {
        id: 'base_8',
        name: 'Spartak Qo\'zg\'oloni',
        icon: '⚔️',
        difficulty: 8,
        lootGold: [20000, 60000],
        lootFood: [10000, 30000],
        xpReward: 400,
        trophyReward: 60,
        enemyForce: 5000,
        requiredLevel: 8,
        description: 'Spartak gladiatorlari va ularning kuchli armiyasi.'
    }
];

const BattleSystem = {
    trophies: 0,
    battleCooldown: 0, // ms
    lastBattle: 0,
    COOLDOWN_TIME: 60000, // 1 minut
    battleLog: [],

    canBattle() {
        return Date.now() - this.lastBattle >= this.COOLDOWN_TIME;
    },

    getCooldownRemaining() {
        const remaining = this.COOLDOWN_TIME - (Date.now() - this.lastBattle);
        return Math.max(0, remaining / 1000);
    },

    // Armiya kuchi
    getArmyPower() {
        let totalHP = 0;
        let totalDMG = 0;
        for (const [type, count] of Object.entries(TroopManager.army)) {
            const data = TROOP_DATA[type];
            if (!data) continue;

            // Tadqiqot bonusi
            const bonus = ResearchSystem.getTroopBonus(type);

            totalHP += (data.stats.hp + bonus.hp) * count;
            totalDMG += (data.stats.damage + bonus.damage) * count;
        }
        return { hp: totalHP, damage: totalDMG, total: totalHP + totalDMG * 3 };
    },

    // Jangni boshlash
    attack(baseId) {
        const base = ENEMY_BASES.find(b => b.id === baseId);
        if (!base) return null;

        // Cooldown tekshirish
        if (!this.canBattle()) {
            Toast.show(`⏳ Jang uchun ${Math.ceil(this.getCooldownRemaining())}s kuting!`, 'warning');
            return null;
        }

        // Askar bormi?
        const total = TroopManager.getTotal();
        if (total === 0) {
            Toast.show("Askaringiz yo'q! Avval askar yarating.", 'error');
            return null;
        }

        // Level tekshirish
        if (XPSystem.level < base.requiredLevel) {
            Toast.show(`Daraja ${base.requiredLevel} kerak!`, 'warning');
            return null;
        }

        this.lastBattle = Date.now();

        // Jang simulyatsiyasi
        const army = this.getArmyPower();
        const enemyForce = base.enemyForce;
        
        // Yutish ehtimoli = armiya kuchi / (armiya kuchi + dushman kuchi)
        const winChance = army.total / (army.total + enemyForce * 5);
        const roll = Math.random();
        const victory = roll < winChance;

        // Yo'qotishlar hisoblash
        const lossPercent = victory ? 
            Math.max(0.05, 0.1 + (enemyForce * 3) / army.total * 0.3) :
            Math.max(0.3, 0.5 + (enemyForce * 3) / army.total * 0.3);
        
        this._applyLosses(Math.min(0.9, lossPercent));

        let result;
        if (victory) {
            // Loot hisoblash
            const goldLoot = Helpers.randInt(base.lootGold[0], base.lootGold[1]);
            const foodLoot = Helpers.randInt(base.lootFood[0], base.lootFood[1]);
            
            // 1-3 yulduz
            const stars = winChance > 0.7 ? 3 : winChance > 0.4 ? 2 : 1;

            Resources.add('gold', goldLoot);
            Resources.add('food', foodLoot);
            XPSystem.addXP(base.xpReward);
            this.trophies += base.trophyReward;

            result = {
                victory: true,
                stars: stars,
                goldLoot: goldLoot,
                foodLoot: foodLoot,
                xp: base.xpReward,
                trophyChange: base.trophyReward,
                lossPercent: Math.round(lossPercent * 100),
                baseName: base.name
            };
        } else {
            // Yutqazish
            this.trophies = Math.max(0, this.trophies - Math.floor(base.trophyReward / 2));

            result = {
                victory: false,
                stars: 0,
                goldLoot: 0,
                foodLoot: 0,
                xp: Math.floor(base.xpReward / 4),
                trophyChange: -Math.floor(base.trophyReward / 2),
                lossPercent: Math.round(lossPercent * 100),
                baseName: base.name
            };
            XPSystem.addXP(result.xp); // biroz XP beramiz
        }

        // Log saqlash
        this.battleLog.unshift({
            ...result,
            time: Date.now()
        });
        if (this.battleLog.length > 20) this.battleLog.pop();

        return result;
    },

    _applyLosses(lossPercent) {
        const armyTypes = Object.entries(TroopManager.army).filter(([_, count]) => count > 0);
        
        for (const [type, count] of armyTypes) {
            const losses = Math.max(0, Math.floor(count * lossPercent));
            if (losses > 0) {
                TroopManager.loseTroop(type, losses);
            }
        }
    },

    // Mavjud bazalar (level ga qarab)
    getAvailableBases() {
        return ENEMY_BASES.filter(b => XPSystem.level >= b.requiredLevel);
    }
};
