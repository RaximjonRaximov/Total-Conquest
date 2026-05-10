// ============================================
// DAILY REWARD PANEL — Kunlik mukofot
// ============================================

const DailyRewardPanel = {
    _REWARDS: [
        { day: 1, label: '🪙 500',    reward: { gold: 500 } },
        { day: 2, label: '🍎 500',    reward: { food: 500 } },
        { day: 3, label: '🪙 1000',   reward: { gold: 1000 } },
        { day: 4, label: '⭐ 50 XP',  reward: { xp: 50 } },
        { day: 5, label: '💎 5',      reward: { diamond: 5 } },
        { day: 6, label: '🪙+🍎 2k', reward: { gold: 2000, food: 2000 } },
        { day: 7, label: '💎 20 + ⚗️', reward: { diamond: 20, magicItem: 'builder_potion' } },
    ],

    _streak: 0,
    _lastClaimed: null,
    _claimedToday: false,

    _load() {
        try {
            const raw = localStorage.getItem('tc_daily_reward');
            if (raw) {
                const d = JSON.parse(raw);
                this._streak      = d.streak      ?? 0;
                this._lastClaimed = d.lastClaimed  ?? null;
            }
        } catch { /* ignore */ }
        this._claimedToday = this._lastClaimed === this._today();
    },

    _save() {
        localStorage.setItem('tc_daily_reward', JSON.stringify({
            streak:      this._streak,
            lastClaimed: this._lastClaimed,
        }));
    },

    _today() {
        return new Date().toISOString().slice(0, 10);
    },

    _isExpired() {
        if (!this._lastClaimed) return false;
        const last = new Date(this._lastClaimed);
        const today = new Date(this._today());
        const diff = (today - last) / 86400000;
        return diff >= 2; // Missed a day — streak reset
    },

    // Auto-check on login: show if not claimed today
    checkAndShow() {
        this._load();
        if (!this._claimedToday) {
            setTimeout(() => this.show(), 1200);
        }
    },

    show() {
        this._load();
        AudioManager.playClick?.();

        let el = document.getElementById('daily-reward-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'daily-reward-panel';
            el.style.cssText = `
                position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                background:linear-gradient(160deg,#0d1117,#1a2340);
                border:2px solid rgba(212,175,55,0.6);border-radius:16px;
                padding:0;z-index:99998;width:320px;max-width:94vw;
                box-shadow:0 0 60px rgba(212,175,55,0.2);
                animation:thUnlockPop 0.3s cubic-bezier(.175,.885,.32,1.275) both;
            `;
            document.body.appendChild(el);
        }
        el.style.display = 'block';
        document.getElementById('modal-overlay').classList.add('show');
        document.getElementById('modal-overlay').onclick = () => this.hide();
        this._render(el);
    },

    hide() {
        const el = document.getElementById('daily-reward-panel');
        if (el) el.style.display = 'none';
        const overlay = document.getElementById('modal-overlay');
        if (overlay) { overlay.classList.remove('show'); overlay.onclick = null; }
    },

    _currentDay() {
        return ((this._streak) % 7) + 1; // day 1–7, cycles
    },

    _render(el) {
        if (this._isExpired()) {
            this._streak = 0;
            this._save();
        }
        const currentDay = this._currentDay();
        const claimed    = this._claimedToday;
        const streak     = this._streak;

        const daysHtml = this._REWARDS.map(r => {
            const isCurrent = r.day === currentDay;
            const isPast    = r.day < currentDay;
            const isFuture  = r.day > currentDay;
            let bg, border, opacity, claimMark = '';
            if (isPast) {
                bg = 'rgba(76,175,80,0.1)'; border = '1px solid rgba(76,175,80,0.3)';
                opacity = '0.7'; claimMark = '<div style="position:absolute;top:2px;right:4px;font-size:10px;color:#81c784;">✓</div>';
            } else if (isCurrent && !claimed) {
                bg = 'rgba(212,175,55,0.2)'; border = '2px solid rgba(212,175,55,0.8)';
                opacity = '1';
            } else if (isCurrent && claimed) {
                bg = 'rgba(76,175,80,0.15)'; border = '2px solid rgba(76,175,80,0.6)';
                opacity = '1'; claimMark = '<div style="position:absolute;top:2px;right:4px;font-size:10px;color:#81c784;">✓</div>';
            } else {
                bg = 'rgba(255,255,255,0.04)'; border = '1px solid rgba(255,255,255,0.08)';
                opacity = '0.5';
            }
            return `<div style="position:relative;background:${bg};border:${border};border-radius:8px;
                                padding:8px 4px;text-align:center;opacity:${opacity};">
                ${claimMark}
                <div style="font-size:9px;color:#888;margin-bottom:3px;">KUN ${r.day}</div>
                <div style="font-size:12px;color:#fff;font-weight:bold;line-height:1.3;">${r.label}</div>
            </div>`;
        }).join('');

        const todayReward = this._REWARDS.find(r => r.day === currentDay);

        el.innerHTML = `
            <div style="background:linear-gradient(to right,rgba(212,175,55,0.15),rgba(0,0,0,0.3));
                        border-bottom:1px solid rgba(212,175,55,0.3);padding:14px 18px;
                        display:flex;align-items:center;justify-content:space-between;border-radius:14px 14px 0 0;">
                <div>
                    <div style="font-size:15px;font-weight:bold;color:#ffd700;font-family:'Cinzel',serif;">
                        🎁 KUNLIK MUKOFOT
                    </div>
                    <div style="font-size:11px;color:#aaa;margin-top:2px;">
                        🔥 ${streak} kunlik streak
                    </div>
                </div>
                <div onclick="DailyRewardPanel.hide()" style="cursor:pointer;color:#666;font-size:18px;padding:4px 8px;">✖</div>
            </div>

            <div style="padding:14px 16px;">
                <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:14px;">
                    ${daysHtml}
                </div>

                ${!claimed ? `
                <div style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);
                            border-radius:10px;padding:12px;margin-bottom:12px;text-align:center;">
                    <div style="font-size:12px;color:#aaa;margin-bottom:4px;">Bugungi mukofot</div>
                    <div style="font-size:22px;font-weight:bold;color:#fff;">${todayReward?.label ?? '🎁'}</div>
                </div>
                <button onclick="DailyRewardPanel.claim()"
                        style="width:100%;padding:12px;background:linear-gradient(to bottom,#d4af37,#b8860b);
                               border:none;border-radius:10px;color:#000;font-weight:bold;font-size:14px;
                               cursor:pointer;font-family:'Cinzel',serif;letter-spacing:1px;">
                    🎁 OLISH
                </button>` : `
                <div style="text-align:center;padding:14px 0;color:#81c784;font-size:13px;">
                    ✅ Bugun mukofot olindi!<br>
                    <span style="color:#888;font-size:11px;margin-top:4px;display:block;">
                        Ertaga qaytib keling
                    </span>
                </div>
                <button onclick="DailyRewardPanel.hide()"
                        style="width:100%;padding:10px;background:rgba(255,255,255,0.1);
                               border:1px solid rgba(255,255,255,0.15);border-radius:10px;
                               color:#aaa;font-size:13px;cursor:pointer;">
                    Yopish
                </button>`}
            </div>
        `;
    },

    claim() {
        this._load();
        if (this._claimedToday) return;
        if (this._isExpired()) { this._streak = 0; }

        const currentDay = this._currentDay();
        const r = this._REWARDS.find(d => d.day === currentDay);
        if (!r) return;

        // Apply rewards
        if (r.reward.gold)      Resources.add('gold', r.reward.gold);
        if (r.reward.food)      Resources.add('food', r.reward.food);
        if (r.reward.diamond)   Resources.add('diamond', r.reward.diamond);
        if (r.reward.xp)        XPSystem.addXP(r.reward.xp);
        if (r.reward.magicItem && typeof MagicItems !== 'undefined') MagicItems.add(r.reward.magicItem, 1);

        this._streak++;
        this._lastClaimed = this._today();
        this._claimedToday = true;
        this._save();

        Toast.show(`🎁 ${r.label} olindi! (${this._streak} kunlik streak 🔥)`, 'success', 2500);
        AudioManager.playBuild?.();

        const el = document.getElementById('daily-reward-panel');
        if (el) this._render(el);
    },
};
