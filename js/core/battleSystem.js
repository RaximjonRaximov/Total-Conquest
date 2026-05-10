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
    },
    {
        id: 'base_9',
        name: 'Aleksandriya Porti',
        icon: '🌊',
        difficulty: 9,
        lootGold: [40000, 120000],
        lootFood: [20000, 60000],
        xpReward: 600,
        trophyReward: 80,
        enemyForce: 8000,
        requiredLevel: 9,
        description: 'Dengiz savdosining markazi — boy va qattiq himoyalangan.'
    },
    {
        id: 'base_10',
        name: 'Rim Kolizeyi',
        icon: '🏟️',
        difficulty: 10,
        lootGold: [80000, 250000],
        lootFood: [40000, 120000],
        xpReward: 1000,
        trophyReward: 120,
        enemyForce: 15000,
        requiredLevel: 10,
        description: 'Rim imperiyasining qalbi. Faqat eng kuchli qo\'shinlar uchun!'
    },
    {
        id: 'base_11',
        name: 'Konstantinopol Qamal',
        icon: '🗼',
        difficulty: 12,
        lootGold: [150000, 500000],
        lootFood: [80000, 250000],
        xpReward: 1500,
        trophyReward: 180,
        enemyForce: 30000,
        requiredLevel: 12,
        description: 'Sharq imperiyasining buyuk shahri — siz uchun so\'nggi imtihon.'
    },
    {
        id: 'base_12',
        name: 'Vikinglar Qalqoni',
        icon: '⚓',
        difficulty: 14,
        lootGold: [200000, 700000],
        lootFood: [100000, 350000],
        xpReward: 1800,
        trophyReward: 220,
        enemyForce: 45000,
        requiredLevel: 13,
        description: 'Shimoldan kelgan dengiz odamlari — kuchli va shafqatsiz.'
    },
    {
        id: 'base_13',
        name: 'Salib Yurishi Qal\'asi',
        icon: '✝️',
        difficulty: 16,
        lootGold: [350000, 900000],
        lootFood: [150000, 450000],
        xpReward: 2200,
        trophyReward: 270,
        enemyForce: 65000,
        requiredLevel: 14,
        description: 'Muqaddas yerlarni himoya qiluvchi og\'ir qurollangan qal\'a.'
    },
    {
        id: 'base_14',
        name: 'Mo\'g\'ul Ordasi',
        icon: '🐎',
        difficulty: 18,
        lootGold: [500000, 1200000],
        lootFood: [200000, 600000],
        xpReward: 2800,
        trophyReward: 330,
        enemyForce: 90000,
        requiredLevel: 15,
        description: 'Chingizxon merosxo\'rlarining qo\'riqchilari — otliq jangchilar!'
    },
    {
        id: 'base_15',
        name: 'Osmon Minorasi',
        icon: '🌃',
        difficulty: 20,
        lootGold: [700000, 1800000],
        lootFood: [300000, 800000],
        xpReward: 3500,
        trophyReward: 400,
        enemyForce: 130000,
        requiredLevel: 16,
        description: 'Osmonni teshgan mustahkam minora — zabt etish imkonsiz deb o\'ylangan.'
    },
    {
        id: 'base_16',
        name: 'Dragonlord Qo\'rgoni',
        icon: '🐉',
        difficulty: 22,
        lootGold: [1000000, 2500000],
        lootFood: [400000, 1000000],
        xpReward: 4500,
        trophyReward: 490,
        enemyForce: 200000,
        requiredLevel: 17,
        description: 'Afsonaviy ajdaho hukmdori — eng jasur jangchilar uchun.'
    },
    {
        id: 'base_17',
        name: 'Qorong\'u Qal\'a',
        icon: '🏰',
        difficulty: 25,
        lootGold: [1500000, 3500000],
        lootFood: [600000, 1400000],
        xpReward: 5500,
        trophyReward: 600,
        enemyForce: 300000,
        requiredLevel: 18,
        description: 'Zulmat ichida cho\'msib ketgan qal\'a — dushman ko\'zlari tevarak-atrofda.'
    },
    {
        id: 'base_18',
        name: 'Galaktika Markazi',
        icon: '🌌',
        difficulty: 28,
        lootGold: [2000000, 5000000],
        lootFood: [800000, 2000000],
        xpReward: 7000,
        trophyReward: 740,
        enemyForce: 450000,
        requiredLevel: 19,
        description: 'Yulduzlar oralig\'idagi maxfiy istehkom — eng yuqori mukofot!'
    },
    {
        id: 'base_19',
        name: 'Olmos Imperiyasi',
        icon: '💠',
        difficulty: 32,
        lootGold: [3000000, 7000000],
        lootFood: [1200000, 3000000],
        xpReward: 9000,
        trophyReward: 900,
        enemyForce: 650000,
        requiredLevel: 20,
        description: 'Eng kuchli imperiya — faqat efsona jangchilar yeta oladi!'
    },
    {
        id: 'base_20',
        name: 'YAKUNIY BOSS: O\'lmaz Qo\'mondon',
        icon: '👑',
        difficulty: 40,
        lootGold: [5000000, 10000000],
        lootFood: [2000000, 5000000],
        xpReward: 15000,
        trophyReward: 1200,
        enemyForce: 1000000,
        requiredLevel: 22,
        description: '⚠️ BOSS JANG! Eng yakuniy va eng kuchli dushman. Faqat eng kuchli imperiya g\'alaba qiladi!'
    }
];

const LEAGUES = [
    { name: 'Bronza III',   icon: '🥉', min:    0, color: '#cd7f32' },
    { name: 'Bronza II',    icon: '🥉', min:  200, color: '#cd7f32' },
    { name: 'Bronza I',     icon: '🥉', min:  400, color: '#cd7f32' },
    { name: 'Kumush III',   icon: '🥈', min:  600, color: '#c0c0c0' },
    { name: 'Kumush II',    icon: '🥈', min:  900, color: '#c0c0c0' },
    { name: 'Kumush I',     icon: '🥈', min: 1200, color: '#c0c0c0' },
    { name: 'Oltin III',    icon: '🏅', min: 1500, color: '#ffd700' },
    { name: 'Oltin II',     icon: '🏅', min: 1900, color: '#ffd700' },
    { name: 'Oltin I',      icon: '🏅', min: 2300, color: '#ffd700' },
    { name: 'Kristall III', icon: '💎', min: 2800, color: '#7ecef2' },
    { name: 'Kristall II',  icon: '💎', min: 3400, color: '#7ecef2' },
    { name: 'Kristall I',   icon: '💎', min: 4000, color: '#7ecef2' },
    { name: 'Magistr III',  icon: '👑', min: 4700, color: '#ff9800' },
    { name: 'Magistr II',   icon: '👑', min: 5400, color: '#ff9800' },
    { name: 'Magistr I',    icon: '👑', min: 6100, color: '#ff9800' },
    { name: 'Chempion III', icon: '⚡', min: 7000, color: '#e040fb' },
    { name: 'Chempion II',  icon: '⚡', min: 8000, color: '#e040fb' },
    { name: 'Chempion I',   icon: '⚡', min: 9000, color: '#e040fb' },
    { name: 'Titan',        icon: '🔱', min: 10000, color: '#f44336' },
    { name: 'Afsona',       icon: '🌟', min: 15000, color: '#ff1744' },
];

const BattleSystem = {
    trophies: 0,
    battleCooldown: 0,
    lastBattle: 0,
    COOLDOWN_TIME: 60000, // 1 daqiqa
    battleLog: [],
    winStreak: 0,
    _claimedLeagues: [],     // Liga mukofotlari yig'ilgan indekslar
    _offlineHistory: {},     // { baseId: { wins, attempts } }

    getLeague(trophies = this.trophies) {
        let best = LEAGUES[0];
        for (const l of LEAGUES) {
            if (trophies >= l.min) best = l;
            else break;
        }
        return best;
    },

    getNextLeague(trophies = this.trophies) {
        for (let i = 0; i < LEAGUES.length; i++) {
            if (LEAGUES[i].min > trophies) return LEAGUES[i];
        }
        return null;
    },

    showTrophyChange(delta) {
        if (!delta || delta === 0) return;
        const el = document.getElementById('trophy-count');
        if (!el) return;

        const popup = document.createElement('div');
        popup.textContent = delta > 0 ? `+${delta}` : `${delta}`;
        popup.style.cssText = `
            position:absolute; pointer-events:none;
            font-size:13px; font-weight:bold;
            color:${delta > 0 ? '#ffd700' : '#ef9a9a'};
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            animation: trophyPop 1.4s ease-out forwards;
            z-index:9999;
        `;
        const rect = el.getBoundingClientRect();
        popup.style.left = (rect.left + rect.width / 2 - 16) + 'px';
        popup.style.top  = (rect.top - 4) + 'px';
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1400);

        el.style.animation = 'none';
        el.offsetHeight; // reflow
        el.style.animation = 'trophyBump 0.35s ease-out';
    },

    updateLeagueDisplay(prevTrophies = null) {
        const badge = document.getElementById('league-badge');
        if (!badge) return;
        const league = this.getLeague();
        const next   = this.getNextLeague();
        badge.textContent = `${league.icon} ${league.name}`;
        badge.style.color = league.color;
        badge.title = next ? `Keyingi: ${next.icon} ${next.name} (${next.min} kubokda)` : 'Eng yuqori liga!';

        // Liga o'zgardimi?
        if (prevTrophies !== null && prevTrophies !== this.trophies) {
            const prevLeague = this.getLeague(prevTrophies);
            if (prevLeague.name !== league.name && this.trophies > prevTrophies) {
                this._showLeaguePromotion(league);
            }
        }
    },

    _showLeaguePromotion(league) {
        // Screen flash
        const flash = document.createElement('div');
        flash.style.cssText = `
            position:fixed;inset:0;z-index:99998;pointer-events:none;
            background:radial-gradient(ellipse at center,${league.color}30 0%,transparent 70%);
            animation:achFlash 0.8s ease-out forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 850);

        // Main banner
        const banner = document.createElement('div');
        banner.style.cssText = `
            position:fixed; top:50%; left:50%;
            z-index:99999; text-align:center;
            background:linear-gradient(155deg,rgba(10,14,24,0.97),rgba(20,26,44,0.97));
            border:2px solid ${league.color};
            border-radius:24px; padding:28px 36px 22px;
            min-width:240px;
            animation:leaguePromoBanner 3.2s ease-out forwards;
            pointer-events:none;
            box-shadow:0 0 0 1px ${league.color}33,
                       0 0 60px ${league.color}44,
                       0 12px 48px rgba(0,0,0,0.9);
        `;

        // Animated rings inside banner
        let rings = '';
        for (let i = 0; i < 3; i++) {
            rings += `<div style="position:absolute;top:50%;left:50%;
                          width:${60 + i*30}px;height:${60 + i*30}px;
                          border:1px solid ${league.color}${50 - i*15};
                          border-radius:50%;
                          transform:translate(-50%,-50%);
                          animation:levelRingBurst ${0.8 + i*0.35}s ${i*0.2}s ease-out forwards;
                          pointer-events:none;"></div>`;
        }

        banner.innerHTML = `
            ${rings}
            <!-- Top label -->
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:4px;
                        color:${league.color}99;font-weight:700;margin-bottom:10px;">
                ✦ Liga Ko'tarilish ✦
            </div>

            <!-- League icon with glow -->
            <div style="font-size:54px;line-height:1;margin-bottom:10px;
                        filter:drop-shadow(0 0 16px ${league.color});
                        animation:achIconPulse 1.5s ease-in-out infinite;">
                ${league.icon}
            </div>

            <!-- League name -->
            <div style="font-family:'Cinzel',serif;font-size:24px;font-weight:900;
                        color:${league.color};
                        text-shadow:0 0 24px ${league.color};
                        margin-bottom:6px;letter-spacing:1px;">
                ${league.name}
            </div>

            <!-- Trophy count chip -->
            <div style="display:inline-flex;align-items:center;gap:5px;
                        background:rgba(255,255,255,0.06);
                        border:1px solid rgba(255,255,255,0.1);
                        border-radius:20px;padding:4px 14px;
                        font-size:12px;color:#e0e0e0;font-weight:700;
                        margin-top:2px;">
                🏆 ${this.trophies} kubok
            </div>
        `;
        document.body.appendChild(banner);

        // Confetti burst from center
        this._burstLeagueConfetti(league.color);

        if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();
        setTimeout(() => banner.remove(), 3500);
    },

    _burstLeagueConfetti(leagueColor) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const colors = [leagueColor, '#ffd700', '#ffffff', '#ff8c00', '#69f0ae', '#40c4ff'];
        const COUNT = 40;

        for (let i = 0; i < COUNT; i++) {
            const p = document.createElement('div');
            const size = 5 + Math.random() * 7;
            const angle = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
            const dist  = 80 + Math.random() * 160;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist - 60;
            const rot = Math.random() * 900 - 450;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = Math.random() > 0.4 ? '50%' : '2px';
            const delay = Math.random() * 120;

            p.style.cssText = `
                position:fixed;left:${cx}px;top:${cy}px;
                width:${size}px;height:${size}px;
                background:${color};border-radius:${shape};
                pointer-events:none;z-index:100000;
                transform:translate(-50%,-50%);
                transition:transform ${900 + Math.random()*400}ms ${delay}ms cubic-bezier(0,.7,.3,1),
                           opacity   ${700 + Math.random()*300}ms ${delay + 200}ms ease-in;
                opacity:1;
            `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg)`;
                    p.style.opacity = '0';
                });
            });
            setTimeout(() => p.remove(), 1400 + delay);
        }
    },

    // Shield tizimi
    shieldUntil: 0, // timestamp ms

    hasShield() {
        return this.shieldUntil > Date.now();
    },

    getShieldRemaining() {
        return Math.max(0, this.shieldUntil - Date.now());
    },

    setShield(hours) {
        this.shieldUntil = Date.now() + hours * 3600_000;
        if (typeof ShieldHUD !== 'undefined') ShieldHUD.update();
    },

    setShieldFromISO(isoString) {
        if (!isoString) { this.shieldUntil = 0; if (typeof ShieldHUD !== 'undefined') ShieldHUD.update(); return; }
        this.shieldUntil = new Date(isoString).getTime();
        if (typeof ShieldHUD !== 'undefined') ShieldHUD.update();
    },

    // ShieldHUD.activate(seconds) tomonidan chaqiriladi
    activateShield(seconds) {
        const ms = seconds * 1000;
        // Faqat mavjud qalqonni uzaytirish mumkin, qisqartirish yo'q
        this.shieldUntil = Math.max(this.shieldUntil, Date.now() + ms);
        if (typeof ShieldHUD !== 'undefined') ShieldHUD.update();
        if (typeof Toast !== 'undefined') {
            const h = Math.round(seconds / 3600);
            const m = Math.round((seconds % 3600) / 60);
            const label = h > 0 ? `${h} soat` : `${m} daqiqa`;
            Toast.show(`🛡️ Qalqon faollashdi: ${label}!`, 'info', 3000);
        }
    },

    // Jang natijasiga qarab avto-qalqon berish
    _applyAutoShield(result) {
        // CoC qoidasi: 40%+ yo'qotish yoki mag'lubiyatda qalqon
        if (!result.victory && result.lossPercent >= 30) {
            // 12 soat qalqon
            this.activateShield(12 * 3600);
        } else if (result.victory && result.stars === 3) {
            // 3 yulduzli g'alabadan keyin 2 soat himoya
            this.activateShield(2 * 3600);
        }
    },

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

            let hp  = data.stats.hp     + bonus.hp;
            let dmg = data.stats.damage + bonus.damage;

            // Hero Commander bonusi — leveli qanchalik yuqori bo'lsa, u qanchalik kuchli
            if (data.isHero && typeof HeroSystem !== 'undefined') {
                const heroStats = HeroSystem.getCommanderStats(type);
                if (heroStats) { hp = heroStats.hp; dmg = heroStats.damage; }
            }

            totalHP  += hp  * count;
            totalDMG += dmg * count;
        }

        // Hero passive aura bonus (barcha qahramonlardan)
        let heroAura = 1.0;
        if (typeof HeroSystem !== 'undefined') {
            const auras = HeroSystem.getAllHeroAura();
            heroAura = auras.damageMult;
        }

        return {
            hp: totalHP,
            damage: totalDMG,
            total: Math.floor((totalHP + totalDMG * 3) * heroAura),
            heroAura,
        };
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
        const lossPercent = Math.min(0.9, victory ?
            Math.max(0.05, 0.1 + (enemyForce * 3) / army.total * 0.3) :
            Math.max(0.3, 0.5 + (enemyForce * 3) / army.total * 0.3));

        this._applyLosses(lossPercent);

        let result;
        if (victory) {
            // Win streak
            this.winStreak = (this.winStreak || 0) + 1;
            const streakMult = 1 + Math.min(this.winStreak - 1, 4) * 0.1; // +10% per win, max +40%

            // 1-3 yulduz (win ehtimolidan)
            const stars = winChance > 0.7 ? 3 : winChance > 0.4 ? 2 : 1;

            // Loot hisoblash — CoC uslubi: yulduzlarga qarab loot %
            // 3⭐ = 100%, 2⭐ = 70%, 1⭐ = 40%
            const starLootMult = stars === 3 ? 1.0 : stars === 2 ? 0.70 : 0.40;
            const baseGold = Helpers.randInt(base.lootGold[0], base.lootGold[1]);
            const baseFood = Helpers.randInt(base.lootFood[0], base.lootFood[1]);
            const goldLoot = Math.floor(baseGold * streakMult * starLootMult);
            const foodLoot = Math.floor(baseFood * streakMult * starLootMult);

            Resources.add('gold', goldLoot);
            Resources.add('food', foodLoot);
            XPSystem.addXP(base.xpReward);
            this.trophies += base.trophyReward;

            if (this.winStreak >= 2) {
                Toast.show(`🔥 ${this.winStreak}x Yutish seriyasi! +${Math.round((streakMult-1)*100)}% lut!`, 'success', 3000);
                if (this.winStreak === 3 || this.winStreak === 5 || this.winStreak === 10 || this.winStreak % 10 === 0) {
                    this._showStreakBanner(this.winStreak, Math.round((streakMult - 1) * 100));
                }
            }
            // Kunlik missiya: winStreak
            if (typeof DailyMissions !== 'undefined') DailyMissions.track('winStreak', 1);

            result = {
                victory: true,
                stars: stars,
                goldLoot: goldLoot,
                foodLoot: foodLoot,
                xp: base.xpReward,
                trophyChange: base.trophyReward,
                lossPercent: Math.round(lossPercent * 100),
                baseName: base.name,
                winStreak: this.winStreak,
                streakBonus: streakMult > 1 ? Math.round((streakMult - 1) * 100) : 0,
                heroAura: army.heroAura || 1,
            };
        } else {
            // Yutqazish — streak tushadi
            this.winStreak = 0;
            // winStreak missiya progressini sıfırlash
            if (typeof DailyMissions !== 'undefined') DailyMissions.resetProgress('winStreak');
            this.trophies = Math.max(0, this.trophies - Math.floor(base.trophyReward / 2));

            result = {
                victory: false,
                stars: 0,
                goldLoot: 0,
                foodLoot: 0,
                xp: Math.floor(base.xpReward / 4),
                trophyChange: -Math.floor(base.trophyReward / 2),
                lossPercent: Math.round(lossPercent * 100),
                baseName: base.name,
                winStreak: 0
            };
            XPSystem.addXP(result.xp); // biroz XP beramiz
        }

        // Hero XP (NPC janglarida ham, barcha deploy qilingan qahramonlar)
        if (typeof HeroSystem !== 'undefined') {
            for (const heroType of Object.keys(HeroSystem.commanders)) {
                if ((TroopManager.army[heroType] || 0) > 0 || result.victory) {
                    HeroSystem.grantBattleXP(heroType, result.victory);
                }
            }
        }

        // Avto-qalqon
        this._applyAutoShield(result);

        // Log saqlash
        this.battleLog.unshift({
            ...result,
            time: Date.now()
        });
        if (this.battleLog.length > 20) this.battleLog.pop();

        // Offline history (win rate tracker)
        if (!this._offlineHistory) this._offlineHistory = {};
        if (!this._offlineHistory[baseId]) this._offlineHistory[baseId] = { wins: 0, attempts: 0 };
        this._offlineHistory[baseId].attempts++;
        if (result.victory) this._offlineHistory[baseId].wins++;

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

    _showStreakBanner(streak, bonusPct) {
        const colors = streak >= 10 ? ['#ff1744','#ff6d00','#ffd700']
                     : streak >= 5  ? ['#ff6d00','#ffd700','#ff8c00']
                     : ['#ff8c00','#ffd700','#ffb74d'];
        const label = streak >= 10 ? '🏆 LEGEND' : streak >= 5 ? '⚡ HOT' : '🔥';
        const titleColor = streak >= 10 ? '#ff1744' : streak >= 5 ? '#ff6d00' : '#ff8c00';

        // Flash
        const flash = document.createElement('div');
        flash.style.cssText = `
            position:fixed;inset:0;z-index:19990;pointer-events:none;
            background:radial-gradient(ellipse at center,${colors[0]}22 0%,transparent 65%);
            animation:achFlash 0.7s ease-out forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 750);

        const banner = document.createElement('div');
        banner.style.cssText = `
            position:fixed;top:72px;left:50%;
            transform:translateX(-50%) translateY(-18px);opacity:0;
            background:linear-gradient(160deg,#1a0800 0%,#2a1200 50%,#1a0800 100%);
            border:2px solid ${colors[0]};border-radius:16px;
            padding:13px 22px 11px;z-index:20000;
            min-width:220px;max-width:290px;text-align:center;
            box-shadow:0 0 0 1px ${colors[0]}22,
                       0 4px 28px ${colors[0]}55,
                       0 0 50px ${colors[0]}20;
            transition:transform 0.42s cubic-bezier(.175,.885,.32,1.275),opacity 0.28s;
            cursor:pointer;
        `;

        banner.innerHTML = `
            <div style="position:absolute;top:0;left:10%;right:10%;height:2px;
                        background:linear-gradient(90deg,transparent,${colors[0]},transparent);
                        border-radius:2px;"></div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:3px;
                        color:${colors[0]}99;font-weight:700;margin-bottom:6px;">
                ${label} SERIYA
            </div>
            <div style="font-size:48px;line-height:1.1;margin-bottom:6px;
                        filter:drop-shadow(0 0 12px ${colors[0]});">
                🔥
            </div>
            <div style="font-family:'Cinzel',serif;font-size:26px;font-weight:900;
                        color:${titleColor};
                        text-shadow:0 0 20px ${titleColor};
                        margin-bottom:4px;">
                ${streak}x
            </div>
            <div style="font-size:11px;color:#ccc;margin-bottom:7px;">Ketma-ket g'alaba!</div>
            ${bonusPct > 0 ? `
            <div style="display:inline-flex;align-items:center;gap:4px;
                        background:rgba(255,255,255,0.06);
                        border:1px solid rgba(255,255,255,0.1);
                        border-radius:20px;padding:3px 10px;
                        font-size:11px;color:#ffd700;font-weight:700;">
                💰 +${bonusPct}% ko'proq lut!
            </div>` : ''}
            <div style="position:absolute;bottom:0;left:10%;right:10%;height:1px;
                        background:linear-gradient(90deg,transparent,${colors[0]}44,transparent);"></div>
        `;

        document.body.appendChild(banner);
        requestAnimationFrame(() => {
            banner.style.transform = 'translateX(-50%) translateY(0)';
            banner.style.opacity = '1';
        });

        if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();

        // Confetti in streak colors
        const cx = window.innerWidth / 2;
        const cy = 120;
        for (let i = 0; i < 18; i++) {
            const p = document.createElement('div');
            const size = 5 + Math.random() * 5;
            const angle = (Math.random() * Math.PI * 2);
            const dist  = 40 + Math.random() * 80;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist + 20;
            const color = colors[Math.floor(Math.random() * colors.length)];
            p.style.cssText = `
                position:fixed;left:${cx}px;top:${cy}px;
                width:${size}px;height:${size}px;
                background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
                pointer-events:none;z-index:20001;
                transform:translate(-50%,-50%);
                transition:transform 0.8s cubic-bezier(0,.7,.3,1),opacity 0.8s ease-in;opacity:1;
            `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${Math.random()*360}deg)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 900);
        }

        const timer = setTimeout(() => {
            banner.style.transform = 'translateX(-50%) translateY(-14px)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.3s ease-in,opacity 0.25s';
            setTimeout(() => banner.remove(), 320);
        }, 3200);

        banner.onclick = () => {
            clearTimeout(timer);
            banner.style.transform = 'translateX(-50%) translateY(-14px)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.22s ease-in,opacity 0.18s';
            setTimeout(() => banner.remove(), 240);
        };
    },

    // Mavjud bazalar (level ga qarab)
    getAvailableBases() {
        return ENEMY_BASES.filter(b => XPSystem.level >= b.requiredLevel);
    }
};
