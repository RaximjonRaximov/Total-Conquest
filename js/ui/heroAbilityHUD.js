// ============================================
// HERO ABILITY HUD — Jangda barcha qahramonlar qobiliyati
// Har qahramon uchun alohida cooldown ring + tugma
// ============================================

const HeroAbilityHUD = {
    _el: null,
    _rafId: null,
    _activateModes: {}, // { commander: false, sagittaria: false }

    init() {
        this._el = document.getElementById('hero-ability-hud');
        if (!this._el) {
            this._el = document.createElement('div');
            this._el.id = 'hero-ability-hud';
            this._el.style.cssText = `
                position:fixed;bottom:85px;right:16px;
                display:none;
                flex-direction:column;align-items:center;
                gap:8px;z-index:12000;
                pointer-events:auto;
            `;
            document.body.appendChild(this._el);
        }
        this._startLoop();
    },

    _startLoop() {
        const tick = () => {
            this._rafId = requestAnimationFrame(tick);
            if (typeof Game === 'undefined' || Game.mode !== 'attack') {
                this._hide();
                return;
            }
            // Jangda hech bo'lmasa bitta qahramon bormi?
            const anyHeroInBattle = typeof BattleManager !== 'undefined'
                && typeof HeroSystem !== 'undefined'
                && Object.keys(HeroSystem.commanders).some(ht =>
                    BattleManager.troops.some(t => t.type === ht && t.hp > 0)
                );

            if (!anyHeroInBattle) { this._hide(); return; }
            this._show();
            this._update();
        };
        this._rafId = requestAnimationFrame(tick);
    },

    _show() {
        if (this._el) this._el.style.display = 'flex';
    },

    _hide() {
        if (this._el) this._el.style.display = 'none';
        this._activateModes = {};
    },

    _update() {
        if (!this._el || typeof HeroSystem === 'undefined' || typeof BattleManager === 'undefined') return;

        let html = '';

        for (const [heroType, hero] of Object.entries(HeroSystem.commanders)) {
            // Faqat jangda tirik qahramon
            const inBattle = BattleManager.troops.some(t => t.type === heroType && t.hp > 0);
            if (!inBattle) continue;

            const canUse   = HeroSystem.canUseAbility(heroType);
            const coolLeft = HeroSystem.getAbilityCooldownLeft(heroType);
            const cdTotal  = ((typeof HERO_CONFIG !== 'undefined' && HERO_CONFIG[heroType]?.abilityCooldown) || 45000) / 1000;
            const progress = canUse ? 1 : Math.max(0, 1 - coolLeft / cdTotal);
            const info     = HeroSystem.getAbilityInfo(heroType);
            const activating = !!this._activateModes[heroType];

            const R    = 28;
            const circ = 2 * Math.PI * R;
            const dash = circ * progress;
            const gap  = circ - dash;

            const ringColor = canUse ? info.color : '#9e9e9e';
            const btnGrad   = canUse
                ? `linear-gradient(135deg,${info.color}dd,${info.color}88)`
                : 'rgba(40,40,40,0.9)';
            const btnBorder = canUse ? info.color + 'aa' : 'rgba(80,80,80,0.5)';
            const animCls   = canUse ? 'animation:achIconPulse 1.5s infinite;' : '';
            const coolStr   = canUse ? '' : `${coolLeft}s`;

            html += `
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                <!-- Hero label -->
                <div style="font-size:8px;color:#aaa;letter-spacing:1px;text-shadow:0 1px 3px rgba(0,0,0,0.8);text-transform:uppercase;">
                    ${info.icon} ${info.name.toUpperCase().substring(0,10)}
                </div>

                <!-- Ring + icon button -->
                <div style="position:relative;width:68px;height:68px;cursor:${canUse ? 'pointer' : 'not-allowed'};"
                     onclick="HeroAbilityHUD._onTap('${heroType}')"
                     title="${canUse ? info.name + ' faollashtirish' : `Tayyor bo'lishiga: ${coolLeft}s`}">

                    <svg width="68" height="68" style="position:absolute;top:0;left:0;transform:rotate(-90deg);">
                        <circle cx="34" cy="34" r="${R}" fill="none"
                                stroke="rgba(255,255,255,0.08)" stroke-width="5"/>
                        <circle cx="34" cy="34" r="${R}" fill="none"
                                stroke="${ringColor}" stroke-width="5"
                                stroke-dasharray="${dash} ${gap}"
                                stroke-linecap="round"
                                style="transition:stroke-dasharray 0.25s ease,stroke 0.3s;
                                       filter:${canUse ? `drop-shadow(0 0 6px ${ringColor})` : 'none'};"/>
                    </svg>

                    <div style="position:absolute;inset:8px;border-radius:50%;
                                background:${btnGrad};
                                border:2px solid ${btnBorder};
                                display:flex;align-items:center;justify-content:center;
                                flex-direction:column;
                                box-shadow:0 2px 12px rgba(0,0,0,0.6);
                                ${animCls}
                                transition:background 0.3s,border-color 0.3s;">
                        <span style="font-size:20px;line-height:1;">${info.icon}</span>
                        ${coolStr ? `<span style="font-size:9px;color:#ccc;font-weight:700;margin-top:2px;">${coolStr}</span>` : ''}
                    </div>

                    ${canUse ? `
                    <div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);
                                background:linear-gradient(90deg,${info.color},${info.color}88);
                                border-radius:8px;padding:1px 7px;
                                font-size:8px;font-weight:800;color:#000;
                                white-space:nowrap;
                                animation:achFlash 1s infinite alternate;">TAYYOR!</div>` : ''}
                </div>

                ${activating ? `
                <div style="background:rgba(0,0,0,0.6);border:1px solid ${info.color}66;
                            border-radius:8px;padding:4px 8px;font-size:9px;color:${info.color};
                            text-align:center;max-width:90px;
                            animation:pulse 0.8s infinite;">
                    📍 Joylashtirishni tanlang
                </div>` : ''}
            </div>
            `;
        }

        this._el.innerHTML = html;
    },

    _onTap(heroType) {
        if (typeof HeroSystem === 'undefined' || !HeroSystem.canUseAbility(heroType)) return;

        if (!this._activateModes[heroType]) {
            this._activateModes[heroType] = true;
            const info = HeroSystem.getAbilityInfo(heroType);
            if (typeof Toast !== 'undefined') {
                Toast.show(`${info.icon} ${info.name} joylashtirishni tanlang!`, 'info', 2000);
            }
            this._registerPlacementClick(heroType);
        }
    },

    _registerPlacementClick(heroType) {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        const handler = (e) => {
            if (!this._activateModes[heroType]) return;
            canvas.removeEventListener('click', handler);
            this._activateModes[heroType] = false;

            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;

            if (typeof Camera !== 'undefined') {
                const g = Camera.toGrid(cx, cy);
                HeroSystem.useAbility(heroType, g.x, g.y);
            }
        };

        canvas.addEventListener('click', handler, { once: true });

        // ESC yoki 5s da bekor
        const cancel = () => {
            this._activateModes[heroType] = false;
            canvas.removeEventListener('click', handler);
        };
        document.addEventListener('keydown', e => { if (e.key === 'Escape') cancel(); }, { once: true });
        setTimeout(cancel, 5000);
    },

    destroy() {
        if (this._rafId) cancelAnimationFrame(this._rafId);
        if (this._el) this._el.remove();
    },
};
