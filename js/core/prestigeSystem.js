// ============================================
// PRESTIGE SYSTEM — Qayta boshlash bilan bonus
// ============================================

const PRESTIGE_BONUSES = {
    1: { goldProdMult: 1.10, foodProdMult: 1.10, troopCapBonus: 10,  startGold: 2000,   startFood: 1000,  label: '⭐' },
    2: { goldProdMult: 1.20, foodProdMult: 1.20, troopCapBonus: 20,  startGold: 5000,   startFood: 2500,  label: '⭐⭐' },
    3: { goldProdMult: 1.35, foodProdMult: 1.35, troopCapBonus: 35,  startGold: 10000,  startFood: 5000,  label: '⭐⭐⭐' },
    4: { goldProdMult: 1.50, foodProdMult: 1.50, troopCapBonus: 50,  startGold: 25000,  startFood: 12000, label: '🌟' },
    5: { goldProdMult: 1.75, foodProdMult: 1.75, troopCapBonus: 75,  startGold: 50000,  startFood: 25000, label: '🌟🌟' },
};
const MAX_PRESTIGE = 5;

const PrestigeSystem = {
    level: 0,

    init() {
        this.level = parseInt(localStorage.getItem('tc_prestige') || '0');
        this._updateHUD();
    },

    canPrestige() {
        return Game.townHallLevel >= 10 && this.level < MAX_PRESTIGE;
    },

    getBonuses() {
        return PRESTIGE_BONUSES[this.level] || null;
    },

    getGoldProdMult() {
        return PRESTIGE_BONUSES[this.level]?.goldProdMult ?? 1;
    },

    getFoodProdMult() {
        return PRESTIGE_BONUSES[this.level]?.foodProdMult ?? 1;
    },

    getTroopCapBonus() {
        return PRESTIGE_BONUSES[this.level]?.troopCapBonus ?? 0;
    },

    getLabel() {
        if (!this.level) return '';
        return PRESTIGE_BONUSES[this.level]?.label || `P${this.level}`;
    },

    promptPrestige() {
        if (!this.canPrestige()) {
            if (this.level >= MAX_PRESTIGE) {
                Toast.show('Maksimal prestige darajasiga yetdingiz!', 'info');
            } else {
                Toast.show('Prestige uchun TH 10 kerak!', 'warn');
            }
            return;
        }

        const nextLevel = this.level + 1;
        const bonus = PRESTIGE_BONUSES[nextLevel];
        this._showPrestigeModal(nextLevel, bonus);
    },

    _showPrestigeModal(nextLevel, bonus) {
        document.getElementById('prestige-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'prestige-modal';
        modal.style.cssText = `
            position:fixed; inset:0; z-index:99999;
            display:flex; align-items:center; justify-content:center;
            background:rgba(0,0,0,0.75); backdrop-filter:blur(8px);
        `;

        const bonusList = [
            { icon: '🪙', text: `Oltin ishlab chiqarish: +${Math.round((bonus.goldProdMult - 1) * 100)}%` },
            { icon: '🍎', text: `Oziq-ovqat ishlab chiqarish: +${Math.round((bonus.foodProdMult - 1) * 100)}%` },
            { icon: '⚔️', text: `Qo'shimcha askar sig'imi: +${bonus.troopCapBonus}` },
            { icon: '🪙', text: `Boshlang'ich resurs: ${Helpers.formatNumber(bonus.startGold)} oltin` },
            { icon: '🍎', text: `Boshlang'ich resurs: ${Helpers.formatNumber(bonus.startFood)} ovqat` },
        ];

        modal.innerHTML = `
            <div style="background:linear-gradient(160deg,#0e1220,#1a1500);border:2px solid #ffd70066;
                        border-radius:20px;padding:28px 24px;width:min(340px,92vw);text-align:center;
                        box-shadow:0 0 60px rgba(255,215,0,0.15),0 8px 40px rgba(0,0,0,0.8);
                        animation:thUnlockPop 0.35s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:52px;line-height:1;margin-bottom:8px;">${bonus.label || '⭐'.repeat(nextLevel)}</div>
                <div style="font-family:'Cinzel',serif;font-size:22px;font-weight:900;color:#ffd700;margin-bottom:4px;">
                    PRESTIGE ${nextLevel}
                </div>
                <div style="font-size:11px;color:#888;margin-bottom:16px;line-height:1.5;">
                    Qishloqingiz qayta boshlanadi.<br>Lekin doimiy bonuslar beriladi:
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px;">
                    ${bonusList.map(b => `
                        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;
                                    background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);
                                    border-radius:8px;font-size:12px;color:#e0e0e0;text-align:left;">
                            <span style="font-size:16px;">${b.icon}</span>${b.text}
                        </div>`).join('')}
                </div>
                <div style="background:rgba(229,57,53,0.1);border:1px solid rgba(229,57,53,0.3);
                            border-radius:8px;padding:8px 12px;font-size:11px;color:#ef9a9a;margin-bottom:16px;">
                    ⚠️ Barcha binolar, askarlar va progress o'chiriladi! Bu amal qaytarib bo'lmaydi.
                </div>
                <div style="display:flex;gap:10px;">
                    <button onclick="document.getElementById('prestige-modal').remove()"
                            style="flex:1;padding:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:10px;color:#aaa;font-size:13px;font-weight:bold;cursor:pointer;">
                        Bekor
                    </button>
                    <button id="prestige-confirm-btn"
                            onclick="PrestigeSystem._confirmPrestige(${nextLevel})"
                            style="flex:1;padding:12px;background:linear-gradient(145deg,#ffd700,#ff9800);
                                   border:none;border-radius:10px;color:#000;font-size:13px;
                                   font-weight:900;font-family:'Cinzel',serif;cursor:pointer;
                                   box-shadow:0 4px 16px rgba(255,215,0,0.3);">
                        ⭐ Prestige!
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },

    _confirmPrestige(nextLevel) {
        // Button ni disabled qilamiz (ikki marta bosishdan saqlaymiz)
        const btn = document.getElementById('prestige-confirm-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Bajarilmoqda...'; }

        document.getElementById('prestige-modal')?.remove();
        this._doPrestige(nextLevel);
    },

    _doPrestige(newLevel) {
        localStorage.setItem('tc_prestige', newLevel);
        SaveSystem.deleteSave();
        Toast.show(`🌟 Prestige ${newLevel} ga ko'tarildi! Tabriklaymaiz!`, 'success', 5000);
        setTimeout(() => location.reload(), 2000);
    },

    _applyStartBonuses() {
        const bonus = this.getBonuses();
        if (!bonus) return;
        if (bonus.startGold > 0) Resources.gold = Math.max(Resources.gold, bonus.startGold);
        if (bonus.startFood > 0) Resources.food = Math.max(Resources.food, bonus.startFood);
        Resources.updateDisplay();
    },

    _updateHUD() {
        const label = this.getLabel();
        const rankEl = document.getElementById('player-rank');
        if (rankEl && label) {
            const existing = rankEl.querySelector('.prestige-badge');
            if (!existing) {
                const badge = document.createElement('span');
                badge.className = 'prestige-badge';
                badge.style.cssText = 'margin-left:4px;font-size:10px;';
                badge.textContent = label;
                rankEl.appendChild(badge);
            }
        }

        const thDisplay = document.getElementById('th-display');
        if (thDisplay && label) {
            if (!thDisplay.dataset.prestigeSet) {
                thDisplay.dataset.prestigeSet = '1';
                thDisplay.innerHTML += ` <span style="font-size:9px;color:#ffd700;">${label}</span>`;
            }
        }
    },
};
