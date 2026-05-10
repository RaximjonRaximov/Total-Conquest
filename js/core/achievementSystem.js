// ============================================
// ACHIEVEMENT SYSTEM — Yutuqlar
// ============================================

const ACHIEVEMENTS = [
    // Qurilish
    { id: 'build_1',      name: 'Quruvchi',        icon: '🏗️', desc: '1 ta bino quring',           cat: 'build',   target: 1,   stat: 'buildCount',    reward: { xp: 20, gold: 200 } },
    { id: 'build_10',     name: 'Me\'mor',          icon: '🏛️', desc: '10 ta bino quring',          cat: 'build',   target: 10,  stat: 'buildCount',    reward: { xp: 80, gold: 1000 } },
    { id: 'build_25',     name: 'Shahar Quruvchi',  icon: '🌆', desc: '25 ta bino quring',          cat: 'build',   target: 25,  stat: 'buildCount',    reward: { xp: 200, gold: 5000 } },
    { id: 'upgrade_1',    name: 'Rivojlanish',      icon: '⬆️', desc: '1 ta binoni yangilang',      cat: 'build',   target: 1,   stat: 'upgradeCount',  reward: { xp: 30, gold: 500 } },
    { id: 'upgrade_20',   name: 'Modernizatsiya',   icon: '🔧', desc: '20 ta yangilash',            cat: 'build',   target: 20,  stat: 'upgradeCount',  reward: { xp: 150, diamond: 5 } },
    { id: 'th5',          name: 'Kuchli Markaz',    icon: '🏛️', desc: 'TH 5 ga yeting',            cat: 'build',   target: 5,   stat: 'thLevel',       reward: { xp: 200, diamond: 10 } },
    { id: 'th8',          name: 'Buyuk Imperator',  icon: '👑', desc: 'TH 8 ga yeting',            cat: 'build',   target: 8,   stat: 'thLevel',       reward: { xp: 500, diamond: 25 } },
    { id: 'th10',         name: 'Rim Imperatori',   icon: '🏆', desc: 'TH 10 ga yeting',           cat: 'build',   target: 10,  stat: 'thLevel',       reward: { xp: 1000, diamond: 50 } },

    // Jang
    { id: 'attack_1',     name: 'Birinchi Qon',     icon: '⚔️', desc: '1 ta hujum qiling',         cat: 'battle',  target: 1,   stat: 'attackCount',   reward: { xp: 25, gold: 300 } },
    { id: 'attack_10',    name: 'Jangchi',           icon: '🗡️', desc: '10 ta hujum',              cat: 'battle',  target: 10,  stat: 'attackCount',   reward: { xp: 100, gold: 2000 } },
    { id: 'attack_50',    name: 'Urush Generali',   icon: '🎖️', desc: '50 ta hujum',              cat: 'battle',  target: 50,  stat: 'attackCount',   reward: { xp: 300, diamond: 10 } },
    { id: 'win_1',        name: 'G\'olib',           icon: '🏅', desc: '1 ta g\'alaba',            cat: 'battle',  target: 1,   stat: 'winCount',      reward: { xp: 50, gold: 500 } },
    { id: 'win_10',       name: 'Qo\'mondon',       icon: '🌟', desc: '10 ta g\'alaba',            cat: 'battle',  target: 10,  stat: 'winCount',      reward: { xp: 200, diamond: 5 } },
    { id: 'win_50',       name: 'Unbeatable',       icon: '⚡', desc: '50 ta g\'alaba',            cat: 'battle',  target: 50,  stat: 'winCount',      reward: { xp: 600, diamond: 20 } },
    { id: 'trophy_100',   name: 'Kubokchi',          icon: '🏆', desc: '100 kubok yig\'ing',       cat: 'battle',  target: 100, stat: 'trophies',      reward: { xp: 100, gold: 1000 } },
    { id: 'trophy_500',   name: 'Chempion',          icon: '🥇', desc: '500 kubokga yeting',       cat: 'battle',  target: 500, stat: 'trophies',      reward: { xp: 400, diamond: 15 } },
    { id: 'trophy_1000',  name: 'Legenda',           icon: '💫', desc: '1000 kubokga yeting',      cat: 'battle',  target: 1000,stat: 'trophies',      reward: { xp: 1000, diamond: 40 } },
    { id: 'stars_10',     name: 'Yulduz Teruv',      icon: '⭐', desc: '10 ta yulduz to\'pla',    cat: 'battle',  target: 10,  stat: 'starsEarned',   reward: { xp: 80, gold: 1000 } },
    { id: 'stars_50',     name: 'Yulduz Hukmdori',  icon: '🌠', desc: '50 ta yulduz',             cat: 'battle',  target: 50,  stat: 'starsEarned',   reward: { xp: 300, diamond: 8 } },

    // Resurs
    { id: 'loot_10k',     name: 'Boylik Teruv',     icon: '💰', desc: '10k oltin o\'g\'irla',     cat: 'econ',    target: 10000,  stat: 'totalLoot',  reward: { xp: 60, food: 500 } },
    { id: 'loot_100k',    name: 'Xazinachi',        icon: '🪙', desc: '100k oltin o\'g\'irla',    cat: 'econ',    target: 100000, stat: 'totalLoot',  reward: { xp: 200, diamond: 5 } },
    { id: 'loot_1m',      name: 'Boylik Imperatori',icon: '💎', desc: '1M oltin o\'g\'irla',      cat: 'econ',    target: 1000000,stat: 'totalLoot',  reward: { xp: 500, diamond: 20 } },

    // Qo'shin
    { id: 'train_50',     name: 'Harbiy Baza',      icon: '🪖', desc: '50 askar tayyorla',        cat: 'troops',  target: 50,  stat: 'troopsTotal',   reward: { xp: 80, gold: 1000 } },
    { id: 'train_200',    name: 'Legion',            icon: '🛡️', desc: '200 askar tayyorla',      cat: 'troops',  target: 200, stat: 'troopsTotal',   reward: { xp: 250, diamond: 8 } },
    { id: 'train_1000',   name: 'Buyuk Ordu',       icon: '⚔️', desc: '1000 askar tayyorla',     cat: 'troops',  target: 1000,stat: 'troopsTotal',   reward: { xp: 600, diamond: 20 } },

    // Ittifoq
    { id: 'join_alliance',name: 'Ittifoqchi',       icon: '🤝', desc: 'Ittifoqqa qo\'shiling',   cat: 'social',  target: 1,   stat: 'allianceJoined',reward: { xp: 100, gold: 2000 } },
    { id: 'donate_10',    name: 'Saxiy Sardor',     icon: '🎁', desc: '10 askar hadya qiling',   cat: 'social',  target: 10,  stat: 'troopsDonated', reward: { xp: 120, gold: 1500 } },

    // Tadqiqot
    { id: 'research_1',   name: 'Olim',             icon: '🔬', desc: '1 ta tadqiqot tugat',     cat: 'research',target: 1,   stat: 'researchCount', reward: { xp: 50, gold: 500 } },
    { id: 'research_5',   name: 'Tadqiqotchi',      icon: '⚗️', desc: '5 ta tadqiqot tugat',    cat: 'research',target: 5,   stat: 'researchCount', reward: { xp: 200, diamond: 5 } },
    { id: 'research_15',  name: 'Buyuk Olim',       icon: '🧪', desc: '15 ta tadqiqot tugat',   cat: 'research',target: 15,  stat: 'researchCount', reward: { xp: 600, diamond: 15 } },
];

const AchievementSystem = {
    _stats: {},
    _unlocked: {},

    init() {
        try {
            const raw = localStorage.getItem('tc_achievements');
            if (raw) {
                const d = JSON.parse(raw);
                this._stats   = d.stats   || {};
                this._unlocked = d.unlocked || {};
            }
        } catch { /* ignore */ }
    },

    _save() {
        localStorage.setItem('tc_achievements', JSON.stringify({
            stats:    this._stats,
            unlocked: this._unlocked,
        }));
    },

    // Increment a stat and check all matching achievements
    track(stat, value = 1) {
        const prev = this._stats[stat] ?? 0;
        this._stats[stat] = prev + value;
        this._checkAll(stat);
        this._save();
        if (typeof SeasonalEvents !== 'undefined') SeasonalEvents.syncFromAchievements();
    },

    // Set a stat to a specific value (e.g. trophies, thLevel)
    set(stat, value) {
        this._stats[stat] = value;
        this._checkAll(stat);
        this._save();
        if (typeof SeasonalEvents !== 'undefined') SeasonalEvents.syncFromAchievements();
    },

    _checkAll(stat) {
        for (const ach of ACHIEVEMENTS) {
            if (ach.stat !== stat) continue;
            if (this._unlocked[ach.id]) continue;
            if ((this._stats[stat] ?? 0) >= ach.target) {
                this._unlock(ach);
            }
        }
    },

    _unlock(ach) {
        this._unlocked[ach.id] = Date.now();

        // Apply rewards
        if (ach.reward.gold)    Resources.add('gold', ach.reward.gold);
        if (ach.reward.food)    Resources.add('food', ach.reward.food);
        if (ach.reward.diamond) Resources.add('diamond', ach.reward.diamond);
        if (ach.reward.xp)      XPSystem.addXP(ach.reward.xp);

        // Show unlock notification
        const rewardStr = Object.entries(ach.reward)
            .map(([k, v]) => `${k === 'gold' ? '🪙' : k === 'food' ? '🍎' : k === 'diamond' ? '💎' : '⭐'} +${v}`)
            .join(' ');
        Toast.show(`🏅 Yutuq: ${ach.icon} ${ach.name}! ${rewardStr}`, 'success', 4000);
        AchievementSystem._showUnlockBanner(ach, rewardStr);
        if (typeof NotificationSystem !== 'undefined') {
            NotificationSystem.add('achievement', `🏅 ${ach.name}!`, `Yangi yutuq! ${rewardStr}`, ach.icon);
        }
        if (typeof AudioManager !== 'undefined') AudioManager.playClick?.();
    },

    _showUnlockBanner(ach, rewardStr) {
        // Queue up if one is already showing
        if (!this._bannerQueue) this._bannerQueue = [];
        this._bannerQueue.push({ ach, rewardStr });
        if (this._bannerShowing) return;
        this._showNextBanner();
    },

    _bannerShowing: false,
    _bannerQueue: [],

    _showNextBanner() {
        if (!this._bannerQueue || this._bannerQueue.length === 0) {
            this._bannerShowing = false;
            return;
        }
        this._bannerShowing = true;
        const { ach, rewardStr } = this._bannerQueue.shift();

        // Remove old
        const existing = document.getElementById('achievement-banner');
        if (existing) existing.remove();

        // Overlay flash
        const flash = document.createElement('div');
        flash.style.cssText = `
            position:fixed;inset:0;background:rgba(255,215,0,0.07);
            z-index:19990;pointer-events:none;
            animation:achFlash 0.5s ease-out forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);

        // Main banner
        const banner = document.createElement('div');
        banner.id = 'achievement-banner';
        banner.style.cssText = `
            position:fixed;top:72px;left:50%;
            transform:translateX(-50%) translateY(-20px);opacity:0;
            background:linear-gradient(160deg,#1c1400 0%,#2e1e00 50%,#1c1400 100%);
            border:2px solid #ffd700;border-radius:16px;
            padding:16px 24px 14px;z-index:20000;
            min-width:260px;max-width:320px;text-align:center;
            box-shadow:0 0 0 1px rgba(255,215,0,0.15),
                       0 4px 32px rgba(255,140,0,0.45),
                       0 0 60px rgba(255,215,0,0.15);
            transition:transform 0.45s cubic-bezier(.175,.885,.32,1.275),opacity 0.3s;
        `;

        // Build reward chips
        const chips = Object.entries(ach.reward).map(([k, v]) => {
            const icon = k === 'gold' ? '🪙' : k === 'food' ? '🍎' : k === 'diamond' ? '💎' : '⭐';
            const color = k === 'gold' ? '#ffd700' : k === 'food' ? '#76c442' : k === 'diamond' ? '#40c4ff' : '#e0b0ff';
            return `<span style="display:inline-flex;align-items:center;gap:3px;
                        background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                        border-radius:20px;padding:2px 8px;font-size:11px;color:${color};font-weight:600;">
                        ${icon} +${v}
                    </span>`;
        }).join('');

        banner.innerHTML = `
            <!-- Shimmer top bar -->
            <div style="position:absolute;top:0;left:10%;right:10%;height:2px;
                        background:linear-gradient(90deg,transparent,#ffd700,transparent);
                        border-radius:2px;"></div>

            <!-- Stars decoration -->
            <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);
                        display:flex;gap:4px;align-items:center;">
                <span style="font-size:10px;opacity:0.6;">✦</span>
                <span style="font-size:16px;filter:drop-shadow(0 0 6px #ffd700);">✦</span>
                <span style="font-size:10px;opacity:0.6;">✦</span>
            </div>

            <div style="font-size:9px;text-transform:uppercase;letter-spacing:3px;
                        color:#b8860b;margin-bottom:8px;font-weight:700;">✦ Yutuq Ochildi ✦</div>

            <!-- Icon with glow ring -->
            <div style="position:relative;display:inline-block;margin-bottom:10px;">
                <div style="width:68px;height:68px;border-radius:50%;margin:0 auto;
                            background:radial-gradient(circle,rgba(255,215,0,0.2) 0%,rgba(255,140,0,0.05) 70%);
                            border:2px solid rgba(255,215,0,0.5);display:flex;align-items:center;
                            justify-content:center;font-size:36px;
                            box-shadow:0 0 20px rgba(255,215,0,0.4),inset 0 0 15px rgba(255,215,0,0.1);
                            animation:achIconPulse 1.8s ease-in-out infinite;">
                    ${ach.icon}
                </div>
            </div>

            <div style="font-family:'Cinzel',serif;font-size:15px;font-weight:700;
                        color:#ffd700;margin-bottom:4px;text-shadow:0 0 12px rgba(255,215,0,0.5);">
                ${ach.name}
            </div>
            <div style="font-size:11px;color:rgba(200,200,200,0.6);margin-bottom:10px;">
                ${ach.desc}
            </div>

            <!-- Reward chips -->
            <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
                ${chips}
            </div>

            <!-- Bottom shimmer -->
            <div style="position:absolute;bottom:0;left:10%;right:10%;height:1px;
                        background:linear-gradient(90deg,transparent,rgba(255,215,0,0.3),transparent);"></div>
        `;

        document.body.appendChild(banner);

        // Animate in
        requestAnimationFrame(() => {
            banner.style.transform = 'translateX(-50%) translateY(0)';
            banner.style.opacity = '1';
        });

        // Confetti burst
        this._burstConfetti(banner);

        // Auto dismiss
        const dismissTimer = setTimeout(() => {
            banner.style.transform = 'translateX(-50%) translateY(-16px)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.35s ease-in,opacity 0.3s';
            setTimeout(() => {
                banner.remove();
                this._bannerShowing = false;
                this._showNextBanner();
            }, 350);
        }, 3800);

        // Click to dismiss early
        banner.onclick = () => {
            clearTimeout(dismissTimer);
            banner.style.transform = 'translateX(-50%) translateY(-16px)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.25s ease-in,opacity 0.2s';
            setTimeout(() => {
                banner.remove();
                this._bannerShowing = false;
                this._showNextBanner();
            }, 250);
        };
    },

    _burstConfetti(anchor) {
        const rect = anchor.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const colors = ['#ffd700','#ff8c00','#fff59d','#ffe082','#ffcc02','#ffffff','#ff6d00'];

        for (let i = 0; i < 28; i++) {
            const p = document.createElement('div');
            const size = 4 + Math.random() * 6;
            const angle = (Math.random() * Math.PI * 2);
            const dist  = 60 + Math.random() * 100;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist - 30;
            const rot = Math.random() * 720 - 360;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = Math.random() > 0.5 ? '50%' : '2px';

            p.style.cssText = `
                position:fixed;
                left:${cx - size / 2}px;top:${cy - size / 2}px;
                width:${size}px;height:${size}px;
                background:${color};border-radius:${shape};
                pointer-events:none;z-index:20001;
                transition:transform 0.9s cubic-bezier(0,.7,.3,1),opacity 0.9s ease-in;
                opacity:1;
            `;
            document.body.appendChild(p);

            requestAnimationFrame(() => {
                p.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg)`;
                p.style.opacity = '0';
            });

            setTimeout(() => p.remove(), 950);
        }
    },

    getAll() {
        return ACHIEVEMENTS.map(ach => ({
            ...ach,
            progress: Math.min(this._stats[ach.stat] ?? 0, ach.target),
            done: !!this._unlocked[ach.id],
            unlockedAt: this._unlocked[ach.id] || null,
        }));
    },

    getStats()   { return { ...this._stats }; },
    getUnlocked(){ return Object.keys(this._unlocked).length; },
    getTotal()   { return ACHIEVEMENTS.length; },
};
