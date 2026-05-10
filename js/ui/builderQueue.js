// ============================================
// BUILDER QUEUE HUD — Aktif qurilishlar paneli
// CoC uslubida quyi-o'ng burchakda ko'rinadi
// ============================================

const BuilderQueueHUD = {
    _el: null,
    _rafId: null,
    _collapsed: false,

    init() {
        let el = document.getElementById('builder-queue-hud');
        if (!el) {
            el = document.createElement('div');
            el.id = 'builder-queue-hud';
            document.body.appendChild(el);
        }
        this._el = el;
        this._applyBaseStyle();
        this._render();
        this._loop();
    },

    _applyBaseStyle() {
        this._el.style.cssText = `
            position: fixed;
            bottom: 88px;
            right: 8px;
            z-index: 300;
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: flex-end;
            pointer-events: none;
        `;
    },

    _loop() {
        this._rafId = requestAnimationFrame(() => {
            // Only render when home mode
            if (typeof Game !== 'undefined' && Game.mode !== 'home') {
                this._el.style.display = 'none';
            } else {
                this._el.style.display = 'flex';
                this._render();
            }
            this._loop();
        });
    },

    _render() {
        if (!this._el) return;
        if (typeof BuildingManager === 'undefined') return;

        // Collect all buildings under construction/upgrade
        const active = [];
        for (const [id, b] of Object.entries(BuildingManager.buildings)) {
            if (!b.building) continue;
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;

            // Get timer info via existing API
            const remaining = typeof timerManager !== 'undefined' && b.timerId
                ? timerManager.getRemaining(b.timerId) * 1000  // ms
                : 0;
            const progress = typeof timerManager !== 'undefined' && b.timerId
                ? timerManager.getProgress(b.timerId)
                : 1;
            const nextLevel = b.level + 1;

            active.push({ id, b, bd, remaining, progress, nextLevel });
        }

        if (active.length === 0) {
            // Barcha quruvchilar bo'sh — CoC uslubida pulsing idle indicator
            if (typeof BuilderSystem !== 'undefined' && BuilderSystem.totalBuilders >= 1) {
                const total = BuilderSystem.totalBuilders;
                this._el.innerHTML = `
                    <div style="
                        display:flex;align-items:center;gap:8px;
                        background:rgba(10,14,23,0.88);
                        border:1px solid rgba(105,240,174,0.35);
                        border-radius:10px;
                        padding:5px 10px;
                        pointer-events:auto;
                        backdrop-filter:blur(8px);
                        box-shadow:0 2px 12px rgba(0,0,0,0.5),0 0 0 2px rgba(105,240,174,0.08);
                        animation:builderIdlePulse 2.2s ease-in-out infinite;
                        cursor:pointer;
                    " title="Quruvchi bo'sh — biror binoni upgrade qiling!" onclick="BuildMenu.open?.()">
                        <span style="font-size:20px;animation:achIconPulse 1.5s ease-in-out infinite;">🔨</span>
                        <div>
                            <div style="font-size:10px;font-weight:700;color:#69f0ae;letter-spacing:0.5px;">Bo'sh!</div>
                            <div style="font-size:9px;color:#888;">👷 ${total} quruvchi kutmoqda</div>
                        </div>
                    </div>
                `;
            } else {
                this._el.innerHTML = '';
            }
            return;
        }

        // Sort by remaining (soonest first)
        active.sort((a, b) => a.remaining - b.remaining);

        let html = '';
        for (const item of active) {
            const { bd, remaining, progress, nextLevel } = item;
            const pct = Math.round(progress * 100);
            const timeStr = this._formatTime(remaining);
            const barColor = this._barColor(progress);

            html += `
                <div style="
                    display:flex;align-items:center;gap:7px;
                    background:rgba(10,14,23,0.92);
                    border:1px solid rgba(212,175,55,0.25);
                    border-radius:10px;
                    padding:5px 8px;
                    min-width:150px;max-width:190px;
                    pointer-events:auto;
                    backdrop-filter:blur(8px);
                    box-shadow:0 2px 12px rgba(0,0,0,0.5);
                ">
                    <!-- Icon -->
                    <div style="font-size:18px;flex-shrink:0;line-height:1;">${bd.icon}</div>

                    <!-- Info -->
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
                            <span style="font-size:10px;font-weight:600;color:#e0e0e0;
                                         white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                                         max-width:90px;">${bd.name}</span>
                            <span style="font-size:9px;color:#888;flex-shrink:0;margin-left:4px;">Lv${nextLevel}</span>
                        </div>

                        <!-- Progress bar -->
                        <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:3px;">
                            <div style="height:100%;width:${pct}%;background:${barColor};
                                        border-radius:2px;transition:width 0.5s linear;
                                        box-shadow:0 0 6px ${barColor};"></div>
                        </div>

                        <!-- Time row + gem boost -->
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:9px;color:#aaa;">⏱ ${timeStr}</span>
                            <button onclick="event.stopPropagation();BuilderQueueHUD._gemBoost('${item.id}')"
                                    style="padding:1px 6px;font-size:9px;font-weight:700;cursor:pointer;
                                           background:rgba(212,175,55,0.18);
                                           border:1px solid rgba(212,175,55,0.5);
                                           border-radius:5px;color:#ffd700;
                                           line-height:1.4;transition:background 0.15s;"
                                    onmouseover="this.style.background='rgba(212,175,55,0.35)'"
                                    onmouseout="this.style.background='rgba(212,175,55,0.18)'"
                                    title="Olmos bilan darhol tugatish">
                                💎 ${Helpers.calcGemCost(Math.ceil(item.remaining / 1000))}
                            </button>
                        </div>
                    </div>

                    <!-- Builder icon -->
                    <div style="font-size:14px;flex-shrink:0;" title="Quruvchi ishlayapti">👷</div>
                </div>
            `;
        }

        this._el.innerHTML = html;
    },

    _formatTime(ms) {
        if (!ms || ms <= 0) return '✓';
        const s = Math.ceil(ms / 1000);
        if (s < 60)  return `${s}s`;
        const m = Math.floor(s / 60);
        const rs = s % 60;
        if (m < 60)  return `${m}m ${rs}s`;
        const h = Math.floor(m / 60);
        const rm = m % 60;
        if (h < 24)  return `${h}s ${rm}m`;
        const d = Math.floor(h / 24);
        const rh = h % 24;
        return `${d}k ${rh}s`;
    },

    _gemBoost(id) {
        const b = BuildingManager.buildings[id];
        if (!b || !b.building) return;
        const bd = BUILDING_DATA[b.type];
        const remaining = timerManager.getRemaining(b.timerId);
        const cost = Helpers.calcGemCost(remaining);

        // ── CoC-style mini confirm overlay ──────────────────────────────────
        const old = document.getElementById('bq-gem-confirm');
        if (old) old.remove();

        const pop = document.createElement('div');
        pop.id = 'bq-gem-confirm';
        pop.style.cssText = `
            position:fixed;inset:0;z-index:9999;display:flex;
            align-items:center;justify-content:center;
            background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);
        `;
        pop.innerHTML = `
            <div style="background:linear-gradient(160deg,#1a2236,#0d1220);
                        border:1px solid rgba(212,175,55,0.4);border-radius:18px;
                        padding:20px 24px;min-width:220px;max-width:280px;
                        box-shadow:0 12px 40px rgba(0,0,0,0.8);text-align:center;
                        font-family:'Inter',sans-serif;animation:popIn 0.2s ease forwards;">
                <div style="font-size:28px;margin-bottom:6px;">${bd?.icon || '🏗️'}</div>
                <div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:4px;">
                    Darhol tugatish
                </div>
                <div style="font-size:11px;color:#aaa;margin-bottom:14px;line-height:1.5;">
                    ${bd?.name || ''} qurilishini<br>
                    <span style="color:#ffd700;font-weight:700;">💎 ${cost} olmos</span> evaziga<br>
                    darhol tugatilsinmi?
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('bq-gem-confirm')?.remove()"
                            style="flex:1;padding:8px;font-size:12px;cursor:pointer;
                                   background:rgba(255,255,255,0.06);
                                   border:1px solid rgba(255,255,255,0.15);
                                   border-radius:10px;color:#aaa;">
                        Bekor
                    </button>
                    <button onclick="BuilderQueueHUD._doGemBoost('${id}');document.getElementById('bq-gem-confirm')?.remove()"
                            style="flex:1;padding:8px;font-size:12px;font-weight:800;cursor:pointer;
                                   background:linear-gradient(135deg,rgba(212,175,55,0.4),rgba(180,130,20,0.2));
                                   border:1px solid rgba(212,175,55,0.6);
                                   border-radius:10px;color:#ffd700;">
                        💎 ${cost}
                    </button>
                </div>
            </div>
        `;
        // Close on backdrop click
        pop.addEventListener('click', e => { if (e.target === pop) pop.remove(); });
        document.body.appendChild(pop);
    },

    _doGemBoost(id) {
        const ok = BuildingManager.speedUp(id);
        if (!ok) Toast.show('💎 Olmos yetarli emas!', 'error');
        else Toast.show('⚡ Qurilish tugadi!', 'success');
    },

    _barColor(progress) {
        if (progress >= 0.9) return '#69f0ae';   // yashil (deyarli tayyor)
        if (progress >= 0.6) return '#ffd700';   // sariq
        if (progress >= 0.3) return '#ff9800';   // to'q sariq
        return '#ff5722';                         // qizil (endigina boshlandi)
    },
};
