// ============================================
// SEASON PASS — CoC-style Battle Pass tizimi
// Free track + Premium track, 30 bosqich
// ============================================

// Magic Item reward milestone mapping
const _SP_FREE_ITEMS  = { 10: 'resource_potion', 20: 'training_potion', 30: 'book_building' };
const _SP_PREM_ITEMS  = { 5: 'builder_potion', 10: 'rune_gold', 15: 'training_potion', 20: 'book_building', 25: 'gem_potion', 30: 'book_research' };

const SEASON_PASS_TIERS = (() => {
    const tiers = [];
    for (let i = 1; i <= 30; i++) {
        const isPremiumSpecial = i % 5 === 0;

        // Free track
        let free;
        if (_SP_FREE_ITEMS[i]) {
            const itemId = _SP_FREE_ITEMS[i];
            free = { type: 'item', itemId, icon: '⚗️', special: true };
        } else if (i % 3 === 0) {
            free = { type: 'gold', amount: 1000 * Math.ceil(i / 5), icon: '🪙' };
        } else if (i % 7 === 0) {
            free = { type: 'food', amount: 800 * Math.ceil(i / 5), icon: '🍎' };
        } else {
            free = { type: 'xp', amount: 50 * i, icon: '⭐' };
        }

        // Premium track
        let premium;
        if (_SP_PREM_ITEMS[i]) {
            const itemId = _SP_PREM_ITEMS[i];
            premium = { type: 'item', itemId, icon: '⚗️', special: true };
        } else if (isPremiumSpecial) {
            premium = { type: 'diamond', amount: 10 + Math.floor(i / 5) * 5, icon: '💎', special: true };
        } else if (i % 2 === 0) {
            premium = { type: 'gold', amount: 2000 * Math.ceil(i / 5), icon: '🪙' };
        } else {
            premium = { type: 'food', amount: 1500 * Math.ceil(i / 5), icon: '🍎' };
        }

        tiers.push({
            tier: i,
            xpRequired: i * 200,
            free,
            premium,
        });
    }
    return tiers;
})();

const SeasonPass = {
    currentTier: 0,      // 0-based: progress index (ne tier)
    currentXP: 0,        // shu tier ichidagi XP
    premium: false,      // premium pass sotib olinganmi
    claimedFree: [],     // claimed tier indekslar (free)
    claimedPremium: [],  // claimed tier indekslar (premium)

    // Season oxiri vaqti (30 kunlik season)
    _seasonStart: null,
    SEASON_DAYS: 30,

    init() {
        if (!this._seasonStart) {
            this._seasonStart = Date.now();
        }
        // Season tugagan bo'lsa yangilash
        this._checkSeasonEnd();
    },

    _checkSeasonEnd() {
        if (!this._seasonStart) return;
        const timeLeft = this.getSeasonTimeLeft();
        if (timeLeft > 0) return;   // Hali tugamagan

        const tier = this.currentTier;
        const wasPremium = this.premium;

        // Auto-claim qilinmagan barcha free rewardlarni berish
        let autoClaimed = 0;
        for (let i = 0; i < SEASON_PASS_TIERS.length; i++) {
            if (i < tier && !this.claimedFree.includes(i)) {
                this._giveReward(SEASON_PASS_TIERS[i].free);
                autoClaimed++;
            }
            if (wasPremium && i < tier && !this.claimedPremium.includes(i)) {
                this._giveReward(SEASON_PASS_TIERS[i].premium);
            }
        }

        // Season reset
        const prevTier = this.currentTier;
        this.currentTier    = 0;
        this.currentXP      = 0;
        this.premium        = false;
        this.claimedFree    = [];
        this.claimedPremium = [];
        this._seasonStart   = Date.now();

        // Kubok kamaytirish (CoC-style league reset: ~50% bosqichlarga qarab)
        if (typeof BattleSystem !== 'undefined' && BattleSystem.trophies > 400) {
            const reset = Math.floor(BattleSystem.trophies * 0.4); // 40% ni olib tashlaydi
            BattleSystem.trophies = Math.max(400, BattleSystem.trophies - reset);
            if (typeof BattleSystem.updateLeagueDisplay === 'function') BattleSystem.updateLeagueDisplay();
        }

        // Xabar
        setTimeout(() => {
            if (typeof Toast !== 'undefined') {
                Toast.show(
                    `🏆 Season ${prevTier > 0 ? prevTier + '-bosqich' : ''} tugadi! Yangi season boshlandi!` +
                    (autoClaimed > 0 ? ` (+${autoClaimed} mukofot avtomatik berildi)` : ''),
                    'reward', 5000
                );
            }
            if (typeof NotificationSystem !== 'undefined') {
                NotificationSystem.add('reward', '🏆 Yangi Season!', 'Eski season tugadi — mukofotlar berildi. Yangi season boshlandi!', '🏆');
            }
        }, 1500);
    },

    // XP qo'shish (jangdan, qurishdan)
    addXP(amount) {
        this.currentXP += amount;
        while (this.currentTier < SEASON_PASS_TIERS.length) {
            const needed = SEASON_PASS_TIERS[this.currentTier].xpRequired;
            if (this.currentXP >= needed) {
                this.currentXP -= needed;
                this.currentTier++;
                if (typeof Toast !== 'undefined') {
                    Toast.show(`🏅 Season Pass ${this.currentTier}-bosqich!`, 'reward', 3000);
                }
            } else break;
        }
    },

    // Tier uchun progress (0-1)
    getTierProgress() {
        if (this.currentTier >= SEASON_PASS_TIERS.length) return 1;
        const needed = SEASON_PASS_TIERS[this.currentTier].xpRequired;
        return Math.min(1, this.currentXP / needed);
    },

    claimFree(tierIdx) {
        if (this.claimedFree.includes(tierIdx)) return false;
        if (this.currentTier <= tierIdx) return false;
        const tier = SEASON_PASS_TIERS[tierIdx];
        if (!tier) return false;
        this.claimedFree.push(tierIdx);
        this._giveReward(tier.free);
        return true;
    },

    claimPremium(tierIdx) {
        if (!this.premium) {
            if (typeof Toast !== 'undefined') Toast.show('Premium Pass kerak! 💎 500 olmos.', 'warn');
            return false;
        }
        if (this.claimedPremium.includes(tierIdx)) return false;
        if (this.currentTier <= tierIdx) return false;
        const tier = SEASON_PASS_TIERS[tierIdx];
        if (!tier) return false;
        this.claimedPremium.push(tierIdx);
        this._giveReward(tier.premium);
        return true;
    },

    buyPremium() {
        const COST = 500;
        if (this.premium) { if (typeof Toast !== 'undefined') Toast.show('Allaqachon Premium!', 'info'); return; }
        if (typeof Resources === 'undefined' || !Resources.canAfford({ diamond: COST })) {
            if (typeof Toast !== 'undefined') Toast.show(`💎 ${COST} olmos kerak!`, 'error');
            return;
        }
        Resources.spendMultiple({ diamond: COST });
        this.premium = true;
        if (typeof Toast !== 'undefined') Toast.show('⭐ Premium Pass faollashtirildi!', 'success', 4000);
    },

    _giveReward(r) {
        if (!r) return;
        if (r.type === 'item') {
            if (typeof MagicItems !== 'undefined') {
                MagicItems.add(r.itemId, 1);
            } else if (typeof Toast !== 'undefined') {
                const d = (typeof MAGIC_ITEM_DATA !== 'undefined' && MAGIC_ITEM_DATA[r.itemId]) || {};
                Toast.show(`${d.icon || '⚗️'} ${d.name || r.itemId} olindi!`, 'reward');
            }
        } else if (r.type === 'xp') {
            if (typeof XPSystem !== 'undefined') XPSystem.addXP(r.amount);
            if (typeof Toast !== 'undefined') Toast.show(`⭐ +${r.amount} XP`, 'reward');
        } else {
            if (typeof Resources !== 'undefined') Resources.add(r.type, r.amount);
            if (typeof Toast !== 'undefined') {
                Toast.show(`${r.icon} +${Helpers.formatNumber(r.amount)} olindi!`, 'reward');
            }
        }
    },

    getSeasonTimeLeft() {
        if (!this._seasonStart) return 0;
        const end = this._seasonStart + this.SEASON_DAYS * 86400000;
        return Math.max(0, end - Date.now());
    },

    serialize() {
        return {
            currentTier: this.currentTier,
            currentXP: this.currentXP,
            premium: this.premium,
            claimedFree: [...this.claimedFree],
            claimedPremium: [...this.claimedPremium],
            _seasonStart: this._seasonStart,
        };
    },

    deserialize(data) {
        if (!data) return;
        this.currentTier    = data.currentTier    ?? 0;
        this.currentXP      = data.currentXP      ?? 0;
        this.premium        = data.premium        ?? false;
        this.claimedFree    = data.claimedFree    ?? [];
        this.claimedPremium = data.claimedPremium ?? [];
        this._seasonStart   = data._seasonStart   ?? Date.now();
    },
};
