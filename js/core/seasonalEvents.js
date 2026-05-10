// ============================================
// SEASONAL EVENTS TIZIMI
// Vaqtinchalik musobaqa va maxsus mukofotlar
// ============================================

const SEASONAL_EVENTS = [
    {
        id: 'roman_festival',
        name: 'Rim Festivali',
        icon: '🏛️',
        color: '#d4af37',
        description: 'Rim Imperiyasining buyuk bayrami! Maxsus mukofotlar sizi kutmoqda.',
        durationDays: 7,
        challenges: [
            { id: 'build_5',      name: '5 ta bino quring',        stat: 'buildCount',   target: 5,   reward: { gold: 5000 } },
            { id: 'win_3',        name: '3 ta jang yuting',         stat: 'winCount',     target: 3,   reward: { diamond: 10 } },
            { id: 'train_20',     name: '20 ta askar tayyorlang',   stat: 'troopsTotal',  target: 20,  reward: { food: 3000 } },
            { id: 'upgrade_3',    name: '3 ta bino yangilang',      stat: 'upgradeCount', target: 3,   reward: { gold: 8000, diamond: 5 } },
            { id: 'trophies_100', name: '100 kubok to\'plang',      stat: 'trophies',     target: 100, reward: { diamond: 20 }, absolute: true },
        ],
        bonus: { type: 'loot_boost', value: 1.25, label: '+25% O\'lja' },
    },
    {
        id: 'legion_march',
        name: 'Legion Yurishi',
        icon: '⚔️',
        color: '#f44336',
        description: 'Legion yurishi boshlandi! Jang maydoni sizi chaqirmoqda.',
        durationDays: 5,
        challenges: [
            { id: 'attack_10',  name: '10 ta hujum qiling',       stat: 'attackCount',  target: 10,  reward: { gold: 10000 } },
            { id: 'stars_15',   name: '15 ta yulduz yig\'ing',    stat: 'starsEarned',  target: 15,  reward: { diamond: 15 } },
            { id: 'loot_50k',   name: '50k loot yig\'ing',        stat: 'totalLoot',    target: 50000, reward: { food: 5000, gold: 5000 } },
            { id: 'donate_10',  name: '10 ta askar yuboring',     stat: 'troopsDonated', target: 10, reward: { diamond: 8 } },
        ],
        bonus: { type: 'trophy_boost', value: 1.5, label: '+50% Kubok' },
    },
    {
        id: 'harvest_season',
        name: 'Hosil Mavsumi',
        icon: '🌾',
        color: '#ff9800',
        description: 'Hosil vaqti keldi! Resurslar ikki baravar ko\'paysin.',
        durationDays: 4,
        challenges: [
            { id: 'collect_20', name: '20 marta resurs yig\'ing',   stat: 'collectCount', target: 20, reward: { gold: 6000 } },
            { id: 'build_3',    name: '3 ta tejamkorlik binosi quring', stat: 'buildCount', target: 3, reward: { food: 4000 } },
            { id: 'gold_100k',  name: '100k oltin yig\'ing (jami)', stat: 'totalLoot',  target: 100000, reward: { diamond: 25 } },
        ],
        bonus: { type: 'production_boost', value: 2.0, label: 'x2 Ishlab Chiqarish' },
    },
];

const SeasonalEvents = {
    _state: null,   // { eventId, startDate, progress: { challengeId: currentVal } }
    _STORAGE_KEY: 'tc_seasonal_events',

    init() {
        const saved = localStorage.getItem(this._STORAGE_KEY);
        if (saved) {
            try { this._state = JSON.parse(saved); } catch {}
        }
        this._ensureActive();
        setTimeout(() => this._checkDailyNotification(), 3000);
    },

    _checkDailyNotification() {
        const ev = this.getActive();
        if (!ev || typeof NotificationSystem === 'undefined') return;

        const todayKey = 'tc_seasonal_notif_' + new Date().toDateString();
        if (localStorage.getItem(todayKey)) return;
        localStorage.setItem(todayKey, '1');

        // Bajarilmagan vazifalar soni
        const incomplete = ev.challenges.filter(ch => {
            const progress = ev.state.progress[ch.id] ?? 0;
            return !ev.state.claimed[ch.id] && progress < ch.target;
        });

        if (incomplete.length === 0) return;

        NotificationSystem.add(
            'seasonal',
            `${ev.icon} ${ev.name} Vazifalari`,
            `${incomplete.length} ta vazifa sizni kutmoqda! Bugun ${ev.bonus.label} bonusi aktiv.`,
            ev.icon
        );
    },

    _ensureActive() {
        const now = Date.now();

        // Agar aktiv event bo'lsa va muddati o'tmagan bo'lsa — qoldirish
        if (this._state && this._state.eventId) {
            const ev = SEASONAL_EVENTS.find(e => e.id === this._state.eventId);
            if (ev) {
                const end = new Date(this._state.startDate).getTime() + ev.durationDays * 86400000;
                if (now < end) return;
            }
        }

        // Yangi event tanlash (kun asosida deterministik)
        const dayIndex = Math.floor(now / (86400000 * 3)) % SEASONAL_EVENTS.length;
        const ev = SEASONAL_EVENTS[dayIndex];
        this._state = {
            eventId:   ev.id,
            startDate: new Date().toISOString(),
            progress:  {},
            claimed:   {},
        };
        this._save();
    },

    _save() {
        localStorage.setItem(this._STORAGE_KEY, JSON.stringify(this._state));
    },

    getActive() {
        this._ensureActive();
        const ev = SEASONAL_EVENTS.find(e => e.id === this._state.eventId);
        if (!ev) return null;
        const end = new Date(this._state.startDate).getTime() + ev.durationDays * 86400000;
        const timeLeft = Math.max(0, end - Date.now());
        return { ...ev, timeLeft, state: this._state };
    },

    // AchievementSystem.track() bilan sinxronlash
    syncFromAchievements() {
        if (!this._state || typeof AchievementSystem === 'undefined') return;
        const stats = AchievementSystem._stats || {};
        const ev = SEASONAL_EVENTS.find(e => e.id === this._state.eventId);
        if (!ev) return;
        for (const ch of ev.challenges) {
            const val = ch.absolute ? (stats[ch.stat] ?? 0) : (stats[ch.stat] ?? 0);
            this._state.progress[ch.id] = val;
        }
        this._save();
    },

    claimChallenge(challengeId) {
        const ev = this.getActive();
        if (!ev) return false;
        const ch = ev.challenges.find(c => c.id === challengeId);
        if (!ch) return false;

        const progress = this._state.progress[challengeId] ?? 0;
        if (progress < ch.target) {
            Toast.show('Vazifa hali bajarilmagan!', 'warn'); return false;
        }
        if (this._state.claimed[challengeId]) {
            Toast.show('Allaqachon olingan!', 'info'); return false;
        }

        this._state.claimed[challengeId] = true;
        this._save();

        // Mukofot berish
        const parts = [];
        if (ch.reward.gold)    { Resources.add('gold', ch.reward.gold);       parts.push(`🪙 +${Helpers.formatNumber(ch.reward.gold)}`); }
        if (ch.reward.food)    { Resources.add('food', ch.reward.food);       parts.push(`🍎 +${Helpers.formatNumber(ch.reward.food)}`); }
        if (ch.reward.diamond) { Resources.add('diamond', ch.reward.diamond); parts.push(`💎 +${ch.reward.diamond}`); }
        if (ch.reward.goldenApple) { Resources.add('goldenApple', ch.reward.goldenApple); parts.push(`🍏 +${ch.reward.goldenApple}`); }

        Toast.show(`🎁 Vazifa bajarildi! ${parts.join(' ')}`, 'reward', 3000);
        AudioManager.playClick?.();
        return true;
    },

    // Joriy bonus multiplikatorini qaytarish
    getBonus(type) {
        const ev = this.getActive();
        if (!ev || !ev.bonus || ev.bonus.type !== type) return 1;
        return ev.bonus.value;
    },

    // HUD'da event badge ko'rsatish
    updateHUD() {
        const ev = this.getActive();
        let badge = document.getElementById('seasonal-event-badge');
        if (!ev) {
            if (badge) badge.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'seasonal-event-badge';
            badge.style.cssText = `position:fixed;bottom:76px;right:6px;z-index:600;
                background:linear-gradient(135deg,rgba(0,0,0,0.8),rgba(30,30,30,0.9));
                border:1px solid ${ev.color};border-radius:8px;padding:4px 8px;
                cursor:pointer;font-size:11px;font-weight:bold;color:${ev.color};
                box-shadow:0 0 8px ${ev.color}40;`;
            badge.onclick = () => SeasonalEventsPanel.toggle();
            document.body.appendChild(badge);
        }
        badge.style.borderColor = ev.color;
        badge.style.color = ev.color;
        const doneCount = Object.keys(this._state?.claimed || {}).length;
        const total = ev.challenges.length;
        badge.textContent = `${ev.icon} ${ev.name} (${doneCount}/${total})`;
    },
};
