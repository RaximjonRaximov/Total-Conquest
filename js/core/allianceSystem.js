// ============================================
// ALLIANCE SYSTEM - Ittifoq (Klan) Tizimi
// ============================================

const ALLIANCES = [
    { id: 'a1', name: 'SPQR', level: 10, members: 49, minTrophies: 1000, description: 'Senatus Populusque Romanus' },
    { id: 'a2', name: 'Legion IX', level: 8, members: 35, minTrophies: 500, description: 'Sodiq legionerlar uchun' },
    { id: 'a3', name: 'Gladiators', level: 5, members: 20, minTrophies: 0, description: 'Yangi boshlaganlar xush kelibsiz' },
    { id: 'a4', name: 'Caesar\'s Guard', level: 15, members: 50, minTrophies: 2000, description: 'Eng kuchli rimliklar bu yerda' }
];

const AllianceSystem = {
    currentAlliance: null,
    lastRequestTime: 0,
    requestCooldown: 300 * 1000, // 5 minut
    
    // Save/Load uchun
    serialize() {
        return {
            currentAlliance: this.currentAlliance,
            lastRequestTime: this.lastRequestTime
        };
    },
    
    deserialize(data) {
        if (!data) return;
        this.currentAlliance = data.currentAlliance;
        this.lastRequestTime = data.lastRequestTime;
    },

    join(allianceId) {
        if (this.currentAlliance) {
            Toast.show("Siz allaqachon ittifoqdasiz!", "error");
            return false;
        }

        const alliance = ALLIANCES.find(a => a.id === allianceId);
        if (!alliance) return false;

        if (BattleSystem.trophies < alliance.minTrophies) {
            Toast.show(`Sizga ${alliance.minTrophies} kubok kerak!`, "warning");
            return false;
        }

        if (alliance.members >= 50) {
            Toast.show("Bu ittifoq to'la!", "error");
            return false;
        }

        this.currentAlliance = allianceId;
        Toast.show(`🤝 ${alliance.name} ittifoqiga qo'shildingiz!`, "success");
        AudioManager.playClick();
        if (typeof AchievementSystem !== 'undefined') AchievementSystem.set('allianceJoined', 1);
        return true;
    },

    leave() {
        if (!this.currentAlliance) return;
        const _doLeave = () => {
            this.currentAlliance = null;
            Toast.show("Ittifoqdan chiqdingiz.", "warning");
            AudioManager.playClick();
        };
        document.getElementById('_as-leave-modal')?.remove();
        const ov = document.createElement('div');
        ov.id = '_as-leave-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);
            z-index:100020;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a1020);
                        border:2px solid rgba(255,152,0,0.45);border-radius:16px;
                        padding:22px 24px;width:min(280px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(255,152,0,0.12);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:36px;margin-bottom:8px;">🚪</div>
                <div style="font-size:13px;font-weight:800;color:#ffb74d;margin-bottom:10px;">Ittifoqni tark etish</div>
                <div style="font-size:11px;color:#aaa;margin-bottom:18px;line-height:1.5;">
                    Haqiqatan ham ittifoqni tark etmoqchimisiz?
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_as-leave-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_as-leave-ok"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(255,152,0,0.5),rgba(230,81,0,0.4));
                                   border:1px solid rgba(255,152,0,0.5);border-radius:9px;
                                   color:#ffb74d;font-size:12px;font-weight:800;cursor:pointer;">🚪 Chiqish</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_as-leave-ok').onclick = () => { ov.remove(); _doLeave(); };
    },

    requestTroops() {
        if (!this.currentAlliance) {
            Toast.show("Avval ittifoqqa qo'shiling!", "warning");
            return false;
        }

        // Ittifoq binosini tekshirish (Legion Forum)
        const forumExists = Object.values(BuildingManager.buildings).some(b => b.type === 'legionForum');
        if (!forumExists) {
            Toast.show("Askarlarni saqlash uchun Legion Forum binosini quring!", "warning");
            return false;
        }

        const now = Date.now();
        if (now - this.lastRequestTime < this.requestCooldown) {
            const rem = Math.ceil((this.requestCooldown - (now - this.lastRequestTime)) / 1000);
            Toast.show(`Kuting: ${Helpers.formatTime(rem)}`, "warning");
            return false;
        }

        this.lastRequestTime = now;
        Toast.show("🛡️ Askarlar so'raldi! Ular tez orada yetib keladi...", "info");
        AudioManager.playClick();

        // 5 soniyadan keyin "dostlar" askar beradi
        setTimeout(() => {
            if (!this.currentAlliance) return; // agar chiqib ketgan bo'lsa
            const troopTypes = ['legionary', 'sagittarius', 'praetorian'];
            const randomType = troopTypes[Math.floor(Math.random() * troopTypes.length)];
            const amount = Math.floor(Math.random() * 5) + 3; // 3-7 askar
            
            // Askar qo'shish (sig'im tekshiruvisiz do'stona yordam sifatida)
            TroopManager.army[randomType] = (TroopManager.army[randomType] || 0) + amount;
            TroopManager.totalTroops = TroopManager.getTotal();
            
            const td = TROOP_DATA[randomType];
            Toast.show(`🎁 Ittifoqdoshlar sizga ${amount} ta ${td.name} yubordi!`, "success");
            AudioManager.playCoin();
        }, 5000);

        return true;
    },

    _serverData: null,

    getCurrentData() {
        if (this._serverData) return this._serverData;
        if (!this.currentAlliance) return null;
        return ALLIANCES.find(a => a.id === this.currentAlliance) || null;
    },

    // ===== URUSH MUKOFOTI =====
    hasClaimedWarReward(warId) {
        return !!localStorage.getItem(`tc_war_reward_${warId}`);
    },

    canClaimWarReward(war) {
        if (!war || war.state !== 'ended') return false;
        return !this.hasClaimedWarReward(war.id);
    },

    calculateWarReward(war, myUserId) {
        if (!war) return null;
        const myAllianceId = war.my_alliance_id;
        const isAlliance1 = war.alliance1_id === myAllianceId;
        const myStars  = isAlliance1 ? (war.alliance1_stars || 0) : (war.alliance2_stars || 0);
        const oppStars = isAlliance1 ? (war.alliance2_stars || 0) : (war.alliance1_stars || 0);
        const won = myStars > oppStars;
        const tied = myStars === oppStars;

        const myAttacks = (war.attacks || []).filter(a => a.attacker_id === myUserId);
        const totalStars = myAttacks.reduce((s, a) => s + (a.stars || 0), 0);
        const perfectAttacks = myAttacks.filter(a => a.stars === 3).length;

        const baseGold = 1000;
        const baseDiamond = 1;
        const starGoldBonus = totalStars * 200;
        const perfectBonus = perfectAttacks * 300;
        const winGoldBonus = won ? 2000 : tied ? 500 : 0;
        const winDiamondBonus = won ? 3 : tied ? 1 : 0;

        return {
            gold:    baseGold + starGoldBonus + perfectBonus + winGoldBonus,
            food:    Math.floor((baseGold + starGoldBonus + winGoldBonus) * 0.4),
            diamond: baseDiamond + winDiamondBonus,
            won,
            tied,
            myStars,
            oppStars,
            totalStars,
            perfectAttacks,
        };
    },

    claimWarReward(war, myUserId) {
        if (!this.canClaimWarReward(war)) {
            Toast.show('Mukofot allaqachon olindi!', 'warn');
            return;
        }

        const reward = this.calculateWarReward(war, myUserId);
        if (!reward) return;

        localStorage.setItem(`tc_war_reward_${war.id}`, '1');

        Resources.add('gold', reward.gold);
        Resources.add('food', reward.food);
        Resources.add('diamond', reward.diamond);
        Resources.updateDisplay();

        const result = reward.won ? '🏆 G\'ALABA' : reward.tied ? '🤝 DURRANG' : '💀 YUTQIZISH';
        Toast.show(
            `${result} | 🪙+${Helpers.formatNumber(reward.gold)} 🍎+${Helpers.formatNumber(reward.food)} 💎+${reward.diamond}`,
            reward.won ? 'success' : 'info',
            5000
        );

        if (typeof NotificationSystem !== 'undefined') {
            NotificationSystem.add('alliance',
                `⚔️ Urush tugadi — ${result}`,
                `Mukofot: 🪙${Helpers.formatNumber(reward.gold)} 💎${reward.diamond}`
            );
        }

        if (typeof XPSystem !== 'undefined') {
            const xp = reward.won ? 200 : reward.tied ? 80 : 40;
            XPSystem.addXP(xp, 'Klan Urushi');
        }

        if (typeof AudioManager !== 'undefined') {
            AudioManager.playCoin?.();
        }
    }
};
