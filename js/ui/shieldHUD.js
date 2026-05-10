// ============================================
// SHIELD HUD — Qalqon holati ko'rsatish
// ============================================

const ShieldHUD = {
    _el: null,
    _interval: null,

    init() {
        let el = document.getElementById('shield-hud');
        if (!el) {
            el = document.createElement('div');
            el.id = 'shield-hud';
            el.style.cssText = `
                position:fixed;top:46px;left:50%;transform:translateX(-50%);
                z-index:5000;display:none;cursor:pointer;
                animation:none;
            `;
            el.title = 'Qalqon aktiv — hujum qilsangiz bekor bo\'ladi';
            document.body.appendChild(el);
        }
        this._el = el;
        this.update();
    },

    activate(seconds) {
        if (typeof BattleSystem !== 'undefined' && BattleSystem.activateShield) {
            BattleSystem.activateShield(seconds);
        }
        this.update();
        // Activation flash
        const flash = document.createElement('div');
        flash.style.cssText = `
            position:fixed;inset:0;background:rgba(33,150,243,0.12);
            z-index:19990;pointer-events:none;
            animation:achFlash 0.6s ease-out forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 650);
    },

    update() {
        if (!this._el) return;
        if (typeof BattleSystem === 'undefined' || !BattleSystem.hasShield()) {
            this._el.style.display = 'none';
            if (this._interval) { clearInterval(this._interval); this._interval = null; }
            return;
        }
        this._el.style.display = 'block';
        this._render();
        if (!this._interval) {
            this._interval = setInterval(() => {
                if (typeof BattleSystem === 'undefined' || !BattleSystem.hasShield()) {
                    this._el.style.display = 'none';
                    clearInterval(this._interval);
                    this._interval = null;
                    Toast.show('🛡️ Qalqon muddati tugadi!', 'warn');
                    return;
                }
                this._render();
            }, 1000);
        }
    },

    _render() {
        const rem = BattleSystem.getShieldRemaining();
        const h   = Math.floor(rem / 3_600_000);
        const m   = Math.floor((rem % 3_600_000) / 60_000);
        const s   = Math.floor((rem % 60_000) / 1_000);
        const time = h > 0 ? `${h}s ${m}d` : m > 0 ? `${m}d ${s}s` : `${s}s`;

        // Progress (fraction of shield remaining vs total — approximate with 24h max)
        const totalMs = 24 * 3_600_000;
        const pct     = Math.max(5, Math.min(100, Math.round(rem / totalMs * 100)));

        this._el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;
                        background:linear-gradient(135deg,rgba(13,71,161,0.92),rgba(21,101,192,0.88));
                        border:1px solid rgba(100,181,246,0.5);
                        border-radius:20px;padding:4px 12px 4px 8px;
                        box-shadow:0 0 12px rgba(33,150,243,0.4),0 2px 6px rgba(0,0,0,0.4);
                        backdrop-filter:blur(6px);white-space:nowrap;">
                <span style="font-size:14px;filter:drop-shadow(0 0 4px rgba(100,181,246,0.8));
                             animation:pulse 2s ease-in-out infinite;">🛡️</span>
                <div style="display:flex;flex-direction:column;gap:1px;">
                    <span style="font-size:10px;font-weight:800;color:#fff;letter-spacing:0.3px;">
                        Qalqon aktiv: ${time}
                    </span>
                    <div style="width:80px;height:3px;background:rgba(255,255,255,0.15);border-radius:2px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#42a5f5,#90caf9);border-radius:2px;"></div>
                    </div>
                </div>
            </div>
        `;
    },
};
