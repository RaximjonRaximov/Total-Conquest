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
        if (amount <= 0) return;
        const prevProgress = this.getProgress();
        const prevLevel = this.level;
        this.xp += amount;

        // Season Pass-ga ham XP berish
        if (typeof SeasonPass !== 'undefined') SeasonPass.addXP(Math.ceil(amount * 0.5));

        // Daraja tekshirish
        let leveledUp = false;
        while (this.level < this.xpTable.length && this.xp >= this.xpTable[this.level]) {
            this.level++;
            leveledUp = true;
        }

        // Animatsiyalar
        this._showXPGain(amount);
        if (leveledUp) {
            // Level-up: bar to'lishi kerak, keyin yangi level boshlanadi
            this._animateXPBar(prevProgress, 1, () => {
                this.updateDisplay();
                this._showLevelUp(this.level, this.getRankName());
                Resources.add('diamond', this.level * 2);
            });
        } else {
            this._animateXPBar(prevProgress, this.getProgress(), () => {});
            this.updateDisplay();
        }
    },

    // XP bar animatsiya (from → to, callback oxirida)
    _animateXPBar(from, to, onDone) {
        const fill = document.querySelector('.level-xp-fill');
        if (!fill) { onDone(); return; }
        const start = performance.now();
        const dur = 600;
        const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        const step = now => {
            const p = Math.min(1, (now - start) / dur);
            const val = from + (to - from) * ease(p);
            fill.style.width = (val * 100) + '%';
            if (p < 1) requestAnimationFrame(step);
            else onDone();
        };
        requestAnimationFrame(step);
    },

    // "+N XP" suzuvchi matn XP bar ustida
    _showXPGain(amount) {
        const bar = document.querySelector('.level-xp-bar');
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const el = document.createElement('div');
        el.textContent = `+${amount} XP`;
        el.style.cssText = `
            position:fixed;
            left:${rect.left + rect.width / 2}px;
            top:${rect.top}px;
            transform:translate(-50%,-100%);
            font-size:11px;font-weight:800;
            color:#ffd700;
            text-shadow:0 1px 4px rgba(0,0,0,0.8);
            pointer-events:none;
            z-index:99999;
            animation:xpGainFly 1.2s ease-out forwards;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    },

    // Level-up overlay flash
    _showLevelUp(level, rankName) {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        const el = document.createElement('div');
        el.innerHTML = `
            <div style="font-size:14px;color:#ffd700;letter-spacing:3px;font-family:'Cinzel',serif;margin-bottom:6px;">DARAJA OSHDI!</div>
            <div style="font-size:52px;font-weight:900;color:#fff;font-family:'Cinzel',serif;
                        text-shadow:0 0 30px rgba(255,215,0,0.9);line-height:1;">${level}</div>
            <div style="font-size:13px;color:#ffe082;font-family:'Cinzel',serif;margin-top:6px;">${rankName}</div>
            <div style="font-size:11px;color:#aaa;margin-top:8px;">💎 +${level * 2} Olmos mukofot!</div>
        `;
        el.style.cssText = `
            position:fixed;inset:0;
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            background:radial-gradient(ellipse at center,rgba(212,175,55,0.35) 0%,rgba(0,0,0,0.85) 70%);
            z-index:99000;
            animation:levelUpOverlay 3s ease-in-out forwards;
            pointer-events:none;
        `;
        // Ring burst decoration
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.style.cssText = `
                position:absolute;
                width:80px;height:80px;
                border:2px solid rgba(255,215,0,0.6);
                border-radius:50%;top:50%;left:50%;
                transform:translate(-50%,-50%);
                animation:levelRingBurst ${0.8 + i*0.4}s ${i*0.25}s ease-out forwards;
                pointer-events:none;
            `;
            el.appendChild(ring);
        }
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);

        // Level shield pulse
        const shield = document.getElementById('player-level');
        if (shield) {
            shield.style.animation = 'levelShieldPop 0.5s ease-out';
            setTimeout(() => shield.style.animation = '', 500);
        }
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
        
        const rankEl = document.getElementById('player-rank');
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
