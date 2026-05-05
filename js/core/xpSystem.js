// ============================================
// XP VA DARAJA TIZIMI
// Bino qurish, jang = XP, daraja oshish
// ============================================

const XPSystem = {
    xp: 0,
    level: 1,
    
    // Daraja uchun kerakli XP
    xpTable: [
        0,      // Lvl 1
        50,     // Lvl 2
        120,    // Lvl 3
        250,    // Lvl 4
        500,    // Lvl 5
        900,    // Lvl 6
        1500,   // Lvl 7
        2500,   // Lvl 8
        4000,   // Lvl 9
        6000,   // Lvl 10
        9000,   // Lvl 11
        13000,  // Lvl 12
        18000,  // Lvl 13
        25000,  // Lvl 14
        35000,  // Lvl 15
        50000,  // Lvl 16
        70000,  // Lvl 17
        100000, // Lvl 18
        140000, // Lvl 19
        200000  // Lvl 20
    ],

    // Daraja nomlari
    rankNames: [
        'Yangi Askar',    // 1
        'Legioner',       // 2
        'Dekurion',       // 3
        'Senturion',      // 4
        'Optio',          // 5
        'Prefekt',        // 6
        'Tribun',         // 7
        'LEGATUS',        // 8
        'Proprettor',     // 9
        'Prokonsl',       // 10
        'Konsul',         // 11
        'Praetor',        // 12
        'Diktator',       // 13
        'Imperator',      // 14
        'Tsezar',         // 15
        'Avgustus',       // 16
        'Pontifeks',      // 17
        'Triumfator',     // 18
        'Ilohiy Lider',   // 19
        'RIM IMPERATORI'  // 20
    ],

    // XP qo'shish
    addXP(amount) {
        this.xp += amount;
        
        // Daraja tekshirish
        let leveledUp = false;
        while (this.level < this.xpTable.length && this.xp >= this.xpTable[this.level]) {
            this.level++;
            leveledUp = true;
        }
        
        if (leveledUp) {
            Toast.show(`⭐ Daraja ${this.level}! ${this.getRankName()}`, 'reward');
            // Daraja mukofoti
            Resources.add('diamond', this.level * 2);
            Toast.show(`💎 +${this.level * 2} olmos mukofot!`, 'reward');
        }
        
        this.updateDisplay();
    },

    // Hozirgi daraja uchun XP progress (0-1)
    getProgress() {
        if (this.level >= this.xpTable.length) return 1;
        const currentLevelXP = this.level > 1 ? this.xpTable[this.level - 1] : 0;
        const nextLevelXP = this.xpTable[this.level] || this.xpTable[this.xpTable.length - 1];
        const progress = (this.xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
        return Math.min(1, Math.max(0, progress));
    },

    // Daraja nomi
    getRankName() {
        return this.rankNames[Math.min(this.level - 1, this.rankNames.length - 1)];
    },

    // HUD ni yangilash
    updateDisplay() {
        const levelEl = document.getElementById('player-level');
        if (levelEl) levelEl.textContent = this.level;
        
        const rankEl = document.querySelector('.level-info-text');
        if (rankEl) rankEl.textContent = this.getRankName();
        
        const xpFill = document.querySelector('.level-xp-fill');
        if (xpFill) xpFill.style.width = (this.getProgress() * 100) + '%';

        const xpTextEl = document.getElementById('xp-text');
        if (xpTextEl) {
            const nextXP = this.level < this.xpTable.length ? this.xpTable[this.level] : this.xp;
            xpTextEl.textContent = `${Helpers.formatNumber(this.xp)} / ${Helpers.formatNumber(nextXP)} XP`;
        }
    },

    // Bino qurilganda XP
    getBuildXP(type, level) {
        const bd = BUILDING_DATA[type];
        if (!bd) return 0;
        const lv = bd.levels[level];
        if (!lv) return 0;
        // Narx asosida XP hisoblash
        let totalCost = 0;
        if (lv.cost) {
            for (const amt of Object.values(lv.cost)) {
                totalCost += amt;
            }
        }
        return Math.max(1, Math.floor(totalCost / 200) + lv.time / 60);
    }
};
