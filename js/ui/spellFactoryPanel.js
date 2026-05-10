// ============================================
// SPELL FACTORY PANEL — CoC-style sehr ishlab chiqarish
// ============================================

const SpellFactoryPanel = {
    _visible: false,
    _rafId: null,

    show() {
        if (this._visible) { this.hide(); return; }
        this._visible = true;
        AudioManager.playClick?.();
        this._mount();
        this._startLoop();
    },

    hide() {
        this._visible = false;
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
        const ov = document.getElementById('modal-overlay');
        if (ov) { ov.classList.remove('show'); ov.onclick = null; }
        const el = document.getElementById('spell-factory-panel');
        if (el) {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(20px) scale(0.97)';
            setTimeout(() => el.remove(), 300);
        }
    },

    _mount() {
        let el = document.getElementById('spell-factory-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'spell-factory-panel';
            el.style.cssText = `
                position:fixed;bottom:80px;left:50%;
                transform:translateX(-50%) translateY(22px) scale(0.965);
                opacity:0;
                width:min(480px,96vw);max-height:70vh;overflow-y:auto;
                background:linear-gradient(160deg,rgba(15,12,30,0.97),rgba(20,15,45,0.97));
                border:1px solid rgba(180,120,255,0.35);border-radius:16px;
                box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 0 1px rgba(180,120,255,0.1);
                z-index:18000;
                transition:opacity 0.22s ease, transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275);
                scrollbar-width:thin;scrollbar-color:rgba(180,120,255,0.3) transparent;
            `;
            document.body.appendChild(el);
        }
        const ov = document.getElementById('modal-overlay');
        if (ov) { ov.classList.add('show'); ov.onclick = () => this.hide(); }
        this._render(el);
        // Trigger animation after render
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateX(-50%) translateY(0) scale(1)';
            });
        });
    },

    _startLoop() {
        const tick = () => {
            if (!this._visible) return;
            const el = document.getElementById('spell-factory-panel');
            if (el) this._updateTimers(el);
            this._rafId = requestAnimationFrame(tick);
        };
        this._rafId = requestAnimationFrame(tick);
    },

    _render(el) {
        const hasFab  = SpellSystem.hasSpellFactory();
        const maxSlots = SpellSystem.getMaxSlots();
        const used     = SpellSystem.getTotalInventory();
        const thLv     = Game.townHallLevel || 1;

        // Active brewing (timerManager dan brew timerlari)
        const brewing = this._getBrewingQueue();

        el.innerHTML = `
            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:14px 16px 10px;border-bottom:1px solid rgba(180,120,255,0.15);">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:20px;">🧪</span>
                    <div>
                        <div style="font-family:'Cinzel',serif;font-weight:700;font-size:14px;color:#ce93d8;">
                            SEHR FABRIKASI
                        </div>
                        <div style="font-size:10px;color:#777;margin-top:1px;">
                            ${hasFab
                                ? `Slotlar: <span style="color:#ffd700;">${used}/${maxSlots}</span>`
                                : `<span style="color:#f44336;">Sehr Fabrikasi kerak</span>`}
                        </div>
                    </div>
                </div>
                <button onclick="SpellFactoryPanel.hide()"
                        style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;">✕</button>
            </div>

            <!-- Slot bar -->
            ${hasFab ? `
            <div style="padding:10px 16px 6px;">
                <div style="display:flex;gap:6px;align-items:center;">
                    ${Array.from({length: maxSlots}, (_, i) => `
                        <div style="flex:1;height:8px;border-radius:4px;background:${
                            i < used ? 'linear-gradient(90deg,#9c27b0,#ce93d8)' : 'rgba(255,255,255,0.08)'
                        };transition:background 0.3s;${
                            i < used ? 'box-shadow:0 0 6px rgba(156,39,176,0.5);' : ''
                        }"></div>
                    `).join('')}
                </div>
                <div style="font-size:9px;color:#666;text-align:right;margin-top:3px;">${used}/${maxSlots} sehr</div>
            </div>` : ''}

            <!-- Brewing queue -->
            ${brewing.length > 0 ? `
            <div style="padding:8px 16px 4px;">
                <div style="font-size:10px;color:#9c27b0;letter-spacing:1px;margin-bottom:6px;">⏳ TAYYORLANMOQDA</div>
                ${brewing.map(b => this._brewCard(b)).join('')}
            </div>` : ''}

            <!-- Inventory -->
            ${used > 0 ? `
            <div style="padding:8px 16px 4px;">
                <div style="font-size:10px;color:#7986cb;letter-spacing:1px;margin-bottom:6px;">🎒 ZAHIRADA</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${this._inventoryCards()}
                </div>
            </div>` : ''}

            <!-- Brew section -->
            <div style="padding:10px 16px 14px;">
                <div style="font-size:10px;color:#aaa;letter-spacing:1px;margin-bottom:8px;">✨ SEHR TANLASH</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    ${Object.entries(SPELL_DATA).map(([type, sd]) =>
                        this._spellCard(type, sd, hasFab, maxSlots, used, thLv)
                    ).join('')}
                </div>
            </div>
        `;
    },

    _brewCard(b) {
        const sd = SPELL_DATA[b.spellType] || {};
        const pct = Math.round((b.progress || 0) * 100);
        const sec = Math.ceil(b.remaining || 0);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        const timeStr = h > 0 ? `${h}s ${m}d` : m > 0 ? `${m}d ${s}s` : `${s}s`;
        const isQueued = !!b.queued;

        return `
            <div data-brew-id="${b.id}" style="display:flex;align-items:center;gap:10px;
                        padding:8px 10px;margin-bottom:6px;
                        background:${isQueued ? 'rgba(100,40,130,0.07)' : 'rgba(156,39,176,0.1)'};
                        border:1px solid ${isQueued ? 'rgba(156,39,176,0.15)' : 'rgba(156,39,176,0.25)'};
                        border-radius:10px;opacity:${isQueued ? '0.7' : '1'};">
                <!-- Ring progress -->
                <div style="position:relative;width:42px;height:42px;flex-shrink:0;">
                    ${!isQueued ? `<svg width="42" height="42" style="transform:rotate(-90deg);">
                        <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3.5"/>
                        <circle cx="21" cy="21" r="17" fill="none"
                                stroke="url(#spellGrad)" stroke-width="3.5"
                                stroke-dasharray="${2 * Math.PI * 17}"
                                stroke-dashoffset="${2 * Math.PI * 17 * (1 - (b.progress||0))}"
                                stroke-linecap="round"
                                style="transition:stroke-dashoffset 0.5s ease;"
                                data-brew-ring="${b.id}"/>
                        <defs>
                            <linearGradient id="spellGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stop-color="#9c27b0"/>
                                <stop offset="100%" stop-color="#e040fb"/>
                            </linearGradient>
                        </defs>
                    </svg>` : `
                    <div style="width:42px;height:42px;border-radius:50%;
                                background:rgba(100,40,130,0.25);border:2px dashed rgba(156,39,176,0.3);
                                display:flex;align-items:center;justify-content:center;font-size:10px;color:#9c27b0;">
                        #${b.queueIdx + 1}
                    </div>`}
                    <div style="position:absolute;inset:0;display:flex;align-items:center;
                                justify-content:center;font-size:${isQueued ? '16px' : '16px'};">${sd.icon || '✨'}</div>
                </div>

                <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:${isQueued ? '#9c27b0' : '#ce93d8'};
                                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sd.name || b.spellType}</div>
                    ${!isQueued ? `
                    <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
                        <div style="flex:1;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#9c27b0,#e040fb);
                                        transition:width 0.5s ease;" data-brew-bar="${b.id}"></div>
                        </div>
                        <span style="font-size:9px;color:#9c27b0;min-width:28px;text-align:right;">${pct}%</span>
                    </div>
                    <div style="font-size:10px;color:#666;margin-top:2px;" data-brew-time="${b.id}">⏰ ${timeStr}</div>
                    ` : `<div style="font-size:9px;color:#666;margin-top:2px;">Navbatda · ~${timeStr}</div>`}
                </div>

                <!-- Cancel button -->
                <button onclick="SpellSystem.cancelBrew(${b.queueIdx});SpellFactoryPanel._rerender()"
                        style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.3);
                               border-radius:6px;padding:3px 6px;color:#ef9a9a;font-size:9px;
                               cursor:pointer;flex-shrink:0;">✕</button>
            </div>`;
    },

    _inventoryCards() {
        return Object.entries(SpellSystem.inventory).map(([type, count]) => {
            const sd = SPELL_DATA[type] || {};
            return `
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;
                            padding:8px 12px;background:rgba(255,255,255,0.04);
                            border:1px solid rgba(180,120,255,0.2);border-radius:10px;
                            min-width:60px;cursor:default;"
                     title="${sd.description || ''}">
                    <div style="font-size:24px;">${sd.icon || '✨'}</div>
                    <div style="font-size:10px;color:#bbb;text-align:center;max-width:60px;
                                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sd.name || type}</div>
                    <div style="background:rgba(156,39,176,0.3);border:1px solid rgba(156,39,176,0.5);
                                border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;color:#e040fb;">
                        x${count}
                    </div>
                </div>`;
        }).join('');
    },

    _spellCard(type, sd, hasFab, maxSlots, used, thLv) {
        const locked     = thLv < (sd.thRequired || 1);
        const slotsFull  = used >= maxSlots;
        const noFab      = !hasFab;
        const disabled   = locked || slotsFull || noFab;

        const costStr = Object.entries(sd.cost || {}).map(([res, amt]) => {
            const icon = res === 'gold' ? '🪙' : res === 'food' ? '🍎' : res === 'diamond' ? '💎' : res;
            const canAfford = typeof Resources !== 'undefined'
                ? (Resources.get(res) || 0) >= amt : true;
            return `<span style="color:${canAfford ? '#aaa' : '#f44336'}">${icon} ${Helpers.formatNumber(amt)}</span>`;
        }).join(' ');

        const timeStr = (() => {
            const s = sd.time || 0;
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            return h > 0 ? `${h}s ${m}d` : m > 0 ? `${m}d` : `${s}s`;
        })();

        const canAffordAll = !disabled && (typeof Resources !== 'undefined'
            ? Object.entries(sd.cost || {}).every(([r, a]) => (Resources.get(r) || 0) >= a)
            : true);

        const btnColor = disabled || !canAffordAll
            ? 'rgba(60,60,60,0.5)'
            : 'linear-gradient(135deg,#7b1fa2,#9c27b0)';
        const btnBorder = disabled || !canAffordAll
            ? 'rgba(80,80,80,0.4)'
            : 'rgba(156,39,176,0.6)';
        const btnText  = locked ? `🔒 TH${sd.thRequired}` : slotsFull ? 'Slot to\'la' : noFab ? 'Fabrika yo\'q' : 'Tayyorla';

        // Inventory count badge
        const invCount = SpellSystem.inventory[type] || 0;

        return `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(180,120,255,0.12);
                        border-radius:12px;padding:12px;
                        ${!disabled && canAffordAll ? 'box-shadow:0 2px 8px rgba(0,0,0,0.3);' : ''}
                        opacity:${locked ? '0.55' : '1'};transition:opacity 0.2s;">
                <!-- Top: icon + name + count -->
                <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <div style="position:relative;flex-shrink:0;">
                        <div style="width:40px;height:40px;background:rgba(156,39,176,0.15);
                                    border:1px solid rgba(156,39,176,0.3);border-radius:10px;
                                    display:flex;align-items:center;justify-content:center;font-size:22px;">
                            ${sd.icon}
                        </div>
                        ${invCount > 0 ? `
                        <div style="position:absolute;top:-5px;right:-5px;background:#9c27b0;
                                    border-radius:8px;padding:0 5px;font-size:9px;font-weight:700;color:#fff;
                                    min-width:14px;text-align:center;">x${invCount}</div>` : ''}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:12px;font-weight:700;color:${locked ? '#666' : '#ce93d8'};
                                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sd.name}</div>
                        <div style="font-size:9px;color:#555;margin-top:2px;line-height:1.3;">${sd.description}</div>
                    </div>
                </div>

                <!-- Cost + time row -->
                <div style="display:flex;justify-content:space-between;align-items:center;
                            font-size:9px;margin-bottom:8px;color:#777;">
                    <div>${costStr}</div>
                    <div>⏱ ${timeStr}</div>
                </div>

                <!-- Brew button -->
                <button onclick="SpellFactoryPanel._brew('${type}')"
                        ${disabled || !canAffordAll ? 'disabled' : ''}
                        style="width:100%;padding:7px;border-radius:8px;border:1px solid ${btnBorder};
                               background:${btnColor};
                               color:${disabled || !canAffordAll ? '#555' : '#fff'};
                               font-size:11px;font-weight:700;cursor:${disabled ? 'not-allowed' : 'pointer'};
                               transition:all 0.2s;">
                    ${btnText}
                </button>
            </div>`;
    },

    _brew(type) {
        const ok = SpellSystem.brew(type);
        if (ok) {
            const el = document.getElementById('spell-factory-panel');
            if (el) this._render(el);
        }
    },

    _rerender() {
        const el = document.getElementById('spell-factory-panel');
        if (el) this._render(el);
    },

    // SpellSystem._brewQueue dan queue ma'lumotlarini olish
    _getBrewingQueue() {
        if (typeof SpellSystem === 'undefined') return [];
        return SpellSystem._brewQueue.map((item, idx) => {
            const id   = item.timerId || ('q' + idx);
            const prog = idx === 0 && item.timerId ? (timerManager.getProgress?.(item.timerId) ?? 0) : 0;
            const rem  = idx === 0 && item.timerId ? (timerManager.getRemaining?.(item.timerId) ?? 0) : (SPELL_DATA[item.type]?.time || 0);
            return { id, spellType: item.type, progress: prog, remaining: rem, queued: idx > 0, queueIdx: idx };
        });
    },

    // Faqat timerlarni yangilash (har frame'da chaqiriladi)
    _updateTimers(el) {
        const brewing = this._getBrewingQueue();
        for (const b of brewing) {
            if (b.queued) continue; // Navbatdagiga progress yo'q
            // Progress ring
            const ring = el.querySelector(`[data-brew-ring="${b.id}"]`);
            if (ring) {
                const circ = 2 * Math.PI * 17;
                ring.setAttribute('stroke-dashoffset', circ * (1 - (b.progress || 0)));
            }
            // Bar
            const bar = el.querySelector(`[data-brew-bar="${b.id}"]`);
            if (bar) bar.style.width = Math.round((b.progress || 0) * 100) + '%';
            // Time text
            const timeEl = el.querySelector(`[data-brew-time="${b.id}"]`);
            if (timeEl) {
                const sec = Math.ceil(b.remaining || 0);
                const h = Math.floor(sec / 3600);
                const m = Math.floor((sec % 3600) / 60);
                const s = sec % 60;
                timeEl.textContent = '⏰ ' + (h > 0 ? `${h}s ${m}d` : m > 0 ? `${m}d ${s}s` : `${s}s`);
            }
        }
        // Re-render if queue changed (new item started or completed)
        const newLen = brewing.length;
        if (this._lastQueueLen !== newLen) {
            this._lastQueueLen = newLen;
            this._render(el);
        }
    },

    _lastQueueLen: 0,
};
