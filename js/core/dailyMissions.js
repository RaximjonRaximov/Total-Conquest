// ============================================
// KUNLIK MISSIYALAR TIZIMI
// ============================================

const MISSION_POOL = [
    { id: 'win_battles',    text: 'Jang g\'alaba qozon',        type: 'win',        target: 2,    reward: { diamond: 5 } },
    { id: 'win_3',          text: '3 ta jang g\'alaba qozon',    type: 'win',        target: 3,    reward: { diamond: 8 } },
    { id: 'collect_gold',   text: 'Oltin yig\'',                 type: 'gold',       target: 500,  reward: { diamond: 3 } },
    { id: 'collect_gold2',  text: '2000 oltin yig\'',            type: 'gold',       target: 2000, reward: { diamond: 6 } },
    { id: 'train_troops',   text: '5 ta askar tayyorla',         type: 'train',      target: 5,    reward: { diamond: 4 } },
    { id: 'train_troops2',  text: '10 ta askar tayyorla',        type: 'train',      target: 10,   reward: { diamond: 7 } },
    { id: 'deploy_troops',  text: 'Jangda 10 askar deploy qil',  type: 'deploy',     target: 10,   reward: { diamond: 5 } },
    { id: 'earn_trophies',  text: '20 kubok top',                type: 'trophy',     target: 20,   reward: { diamond: 6 } },
    { id: 'destroy_50',     text: 'Jangda 50% bino vayron qil',  type: 'destroy50',  target: 1,    reward: { diamond: 5 } },
    { id: 'stars_5',        text: '5 yulduz yig\'',              type: 'stars',      target: 5,    reward: { diamond: 8 } },
    { id: 'upgrade_building','text':'Bino yuksalt',              type: 'upgrade',    target: 1,    reward: { diamond: 4 } },
    { id: 'collect_food',   text: '1000 oziq-ovqat yig\'',       type: 'food',       target: 1000, reward: { diamond: 4 } },
    { id: 'do_research',    text: '1 ta tadqiqot tugat',          type: 'research',   target: 1,    reward: { diamond: 6 } },
    { id: 'collect_mine',   text: 'Olmos Konidan olmoslar yig\'', type: 'collectMine',target: 1,    reward: { gold: 5000, diamond: 2 } },
    { id: 'win_streak',     text: '3 jangni ketma-ket yut',      type: 'winStreak',  target: 3,    reward: { diamond: 10, gold: 8000 } },
    { id: 'build_2',        text: '2 ta bino qur yoki yuksalt',  type: 'upgrade',    target: 2,    reward: { diamond: 7 } },
    { id: 'collect_big_gold',text:'10000 oltin yig\'',           type: 'gold',       target: 10000,reward: { diamond: 10 } },
    { id: 'train_army',     text: '20 ta askar tayyorla',        type: 'train',      target: 20,   reward: { diamond: 12, gold: 5000 } },
];

const DailyMissions = {
    missions: [],       // [{...poolEntry, progress, claimed}]
    lastRefresh: 0,     // timestamp

    REFRESH_INTERVAL: 24 * 3600 * 1000,

    init() {
        this._tryRefresh();
    },

    _tryRefresh() {
        const now = Date.now();
        if (now - this.lastRefresh >= this.REFRESH_INTERVAL || this.missions.length === 0) {
            this._refresh();
        }
    },

    _refresh() {
        const pool = [...MISSION_POOL];
        Helpers.shuffle(pool);
        this.missions = pool.slice(0, 3).map(m => ({
            ...m,
            progress: 0,
            claimed: false,
        }));
        this.lastRefresh   = Date.now();
        this._bonusClaimed = false;
    },

    // ── Progress tracking ───────────────────────────────────────────────────
    track(eventType, amount = 1) {
        this._tryRefresh();
        let changed = false;
        for (const m of this.missions) {
            if (m.claimed || m.progress >= m.target) continue;
            if (m.type !== eventType) continue;
            m.progress = Math.min(m.target, m.progress + amount);
            changed = true;
            if (m.progress >= m.target) {
                Toast.show(`✅ Missiya bajarildi: "${m.text}" — mukofotni oling!`, 'success', 4000);
            }
        }
        if (changed && typeof MissionPanel !== 'undefined') MissionPanel.updateBadge?.();
    },

    // ── Claim reward ────────────────────────────────────────────────────────
    claim(missionId) {
        const m = this.missions.find(x => x.id === missionId);
        if (!m || m.claimed || m.progress < m.target) return false;
        m.claimed = true;
        if (m.reward.diamond) {
            Resources.add('diamond', m.reward.diamond);
            Toast.show(`💎 +${m.reward.diamond} olmoslar!`, 'success', 3000);
        }
        if (m.reward.gold)  Resources.add('gold', m.reward.gold);
        if (m.reward.food)  Resources.add('food', m.reward.food);

        // Barcha missiyalar bajarilsa — bonus magic item
        const allDone = this.missions.length > 0
            && this.missions.every(x => x.claimed || x.progress >= x.target);
        const allClaimed = this.missions.length > 0
            && this.missions.every(x => x.claimed);
        if (allClaimed && typeof MagicItems !== 'undefined') {
            // Har missiya jamlanganda 1 marta resource_potion bering
            if (!this._bonusClaimed) {
                this._bonusClaimed = true;
                MagicItems.add('resource_potion', 1);
                setTimeout(() => Toast.show('🎊 Barcha missiyalar bajarildi! +🧪 Resurs Iksiri!', 'reward', 4000), 500);
            }
        }

        return true;
    },

    // Streak kabi qayta boshlanadigan missiyalar uchun progress sıfırlash
    resetProgress(eventType) {
        for (const m of this.missions) {
            if (m.claimed) continue;
            if (m.type !== eventType) continue;
            m.progress = 0;
        }
    },

    getUnclaimedCount() {
        return this.missions.filter(m => !m.claimed && m.progress >= m.target).length;
    },

    getTimeUntilRefresh() {
        return Math.max(0, this.REFRESH_INTERVAL - (Date.now() - this.lastRefresh));
    },

    serialize() {
        return { missions: this.missions, lastRefresh: this.lastRefresh, bonusClaimed: this._bonusClaimed };
    },

    deserialize(data) {
        if (!data) return;
        this.lastRefresh   = data.lastRefresh   || 0;
        this.missions      = data.missions      || [];
        this._bonusClaimed = data.bonusClaimed  || false;
        this._tryRefresh();
    },
};

// ── Helpers.shuffle ga fallback ────────────────────────────────────────────
if (typeof Helpers !== 'undefined' && !Helpers.shuffle) {
    Helpers.shuffle = function(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };
}
