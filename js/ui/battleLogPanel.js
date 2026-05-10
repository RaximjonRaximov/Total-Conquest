// ============================================
// BATTLE LOG PANEL — Jang tarixi
// ============================================

const BattleLogPanel = {
    _tab: 'attacks',  // 'attacks' | 'defenses'
    _data: null,

    async show() {
        AudioManager.playClick();
        let el = document.getElementById('battle-log-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'battle-log-panel';
            el.className = 'panel-container';
            document.body.appendChild(el);
        }
        el.classList.add('show');
        document.getElementById('modal-overlay').classList.add('show');
        document.getElementById('modal-overlay').onclick = () => this.hide();

        this._renderLoading(el);
        await this._load();
        this._render(el);
    },

    hide() {
        const el = document.getElementById('battle-log-panel');
        if (el) el.classList.remove('show');
        const overlay = document.getElementById('modal-overlay');
        if (overlay) { overlay.classList.remove('show'); overlay.onclick = null; }
    },

    setTab(tab) {
        this._tab = tab;
        const el = document.getElementById('battle-log-panel');
        if (el) this._render(el);
    },

    async _load() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            // Fallback: local battle log
            this._data = { attacks: BattleSystem.battleLog || [], defenses: [] };
            return;
        }
        try {
            const rows = await Api.getBattleLog().catch(() => []);
            this._data = {
                attacks:  rows.filter(r => r.type === 'attack'),
                defenses: rows.filter(r => r.type === 'defence'),
            };
        } catch {
            this._data = { attacks: [], defenses: [] };
        }
    },

    _renderLoading(el) {
        el.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">📜 JANG TARIXI</div>
                <div class="panel-close" onclick="BattleLogPanel.hide()">✖</div>
            </div>
            <div class="panel-content" style="text-align:center;padding:40px 0;">
                <div style="font-size:32px;margin-bottom:12px;">⏳</div>
                <div style="color:#aaa;">Yuklanmoqda...</div>
            </div>
        `;
    },

    _timeAgo(iso) {
        if (!iso) return '?';
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1)  return 'Hozir';
        if (m < 60) return `${m} daqiqa oldin`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} soat oldin`;
        const d = Math.floor(h / 24);
        return `${d} kun oldin`;
    },

    _starsHtml(stars, max = 3) {
        let s = '';
        for (let i = 1; i <= max; i++) {
            s += `<span style="color:${i <= stars ? '#ffd700' : '#333'};font-size:14px;">★</span>`;
        }
        return s;
    },

    _renderRows(list, isAttacker) {
        if (!list || !list.length) {
            const empty = isAttacker ? 'Hali hujum qilmagansiz.' : 'Hali himoyalanmagansiz.';
            return `<div style="text-align:center;color:#888;padding:30px;">${empty}</div>`;
        }
        return list.map(r => {
            const opponent  = isAttacker ? (r.defender_name || 'Noma\'lum') : (r.attacker_name || 'Noma\'lum');
            const stars     = r.stars ?? 0;
            // For attacks: victory = got at least 1 star. For defenses: victory = attacker got 0 stars
            const victory   = isAttacker ? (stars > 0) : (stars === 0);
            const trophies  = r.trophy_change ?? 0;
            const tColor    = trophies >= 0 ? '#4caf50' : '#f44336';
            const tSign     = trophies >= 0 ? '+' : '';
            const loot      = r.loot_gold ?? r.loot ?? 0;
            const lootFood  = r.loot_food ?? 0;
            const destPct   = r.destruction ?? r.destruction_percent ?? r.percent ?? 0;
            const ts        = this._timeAgo(r.created_at || r.time);

            return `<div style="display:flex;align-items:center;padding:8px 10px;margin-bottom:4px;
                                background:${victory ? 'rgba(76,175,80,0.07)' : 'rgba(244,67,54,0.07)'};
                                border-radius:8px;border:1px solid ${victory ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)'};">
                <div style="margin-right:8px;font-size:20px;">${victory ? '⚔️' : '🛡️'}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                        <span style="font-size:12px;font-weight:bold;color:${victory ? '#81c784' : '#e57373'};
                                     white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;">
                            ${opponent}
                        </span>
                        <span style="flex-shrink:0;">${this._starsHtml(stars)}</span>
                    </div>
                    <div style="font-size:10px;color:#888;">
                        💥 ${destPct}%
                        ${loot > 0 ? `· 🪙+${Helpers.formatNumber(loot)}` : ''}
                        ${lootFood > 0 ? `· 🍎+${Helpers.formatNumber(lootFood)}` : ''}
                    </div>
                </div>
                <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;gap:3px;align-items:flex-end;">
                    <div style="font-size:13px;font-weight:bold;color:${tColor};">
                        🏆 ${tSign}${trophies}
                    </div>
                    <div style="font-size:9px;color:#666;">${ts}</div>
                    ${isAttacker && r.id ? `<button onclick="BattleLogPanel.showReplay('${r.id}')"
                        style="background:rgba(33,150,243,0.2);border:1px solid rgba(33,150,243,0.4);
                               border-radius:4px;color:#90caf9;font-size:9px;padding:2px 6px;cursor:pointer;">
                        ▶ Replay
                    </button>` : ''}
                </div>
            </div>`;
        }).join('');
    },

    async showReplay(battleId) {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            Toast.show('Replay faqat online rejimda ishlaydi', 'warn');
            return;
        }
        try {
            const data = await Api._request('GET', `/battle/${encodeURIComponent(battleId)}/replay`);
            const events = data?.replay;
            if (!events || events.length === 0) {
                Toast.show('Bu jang uchun replay mavjud emas', 'info');
                return;
            }
            this._renderReplayModal(events, battleId);
        } catch {
            Toast.show('Replay yuklab bo\'lmadi', 'error');
        }
    },

    // ── Visual Replay Viewer ─────────────────────────────────────────────────
    _replay: null,  // { events, curMs, playing, speed, rafId, troops[], buildings[] }

    _renderReplayModal(events, battleId) {
        document.getElementById('battle-replay-modal')?.remove();

        const totalMs = events.length > 0 ? (events[events.length - 1].t + 8000) : 10000;
        const dMin = Math.floor(totalMs / 60000);
        const dSec = Math.floor((totalMs % 60000) / 1000);

        // Troop category colors
        const CAT_COLORS = {
            piyoda: '#ef5350', otishma: '#66bb6a', otliq: '#ce93d8',
            qamal: '#ffb74d', uchuvchi: '#42a5f5', commander: '#ffd700',
        };

        // Group by type for legend
        const grouped = {};
        for (const ev of events) { grouped[ev.type] = (grouped[ev.type] || 0) + 1; }

        const modal = document.createElement('div');
        modal.id = 'battle-replay-modal';
        modal.style.cssText = `
            position:fixed;inset:0;z-index:99998;
            background:rgba(0,0,0,0.82);backdrop-filter:blur(6px);
            display:flex;align-items:center;justify-content:center;
        `;

        modal.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#111a2e);
                        border:1px solid rgba(33,150,243,0.25);border-radius:18px;
                        padding:14px;width:min(380px,96vw);
                        box-shadow:0 8px 60px rgba(0,0,0,0.85);
                        animation:thUnlockPop 0.3s ease both;">
                <!-- Header -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-size:13px;font-weight:bold;color:#90caf9;">▶ Jang Replay · ${dMin}:${String(dSec).padStart(2,'0')}</div>
                    <button onclick="BattleLogPanel._stopReplay()"
                        style="background:none;border:none;color:#666;font-size:20px;cursor:pointer;line-height:1;">✕</button>
                </div>

                <!-- Canvas -->
                <div style="position:relative;background:#0a0a14;border-radius:10px;overflow:hidden;margin-bottom:8px;">
                    <canvas id="replay-canvas" width="352" height="220"
                        style="display:block;width:100%;height:auto;"></canvas>
                    <!-- Overlay: time display -->
                    <div id="replay-time-overlay"
                        style="position:absolute;top:6px;left:8px;font-size:10px;
                               color:#90caf9;background:rgba(0,0,0,0.5);
                               padding:2px 7px;border-radius:20px;pointer-events:none;">0:00</div>
                    <!-- Troop count overlay -->
                    <div id="replay-troop-overlay"
                        style="position:absolute;top:6px;right:8px;font-size:10px;
                               color:#aaa;background:rgba(0,0,0,0.5);
                               padding:2px 7px;border-radius:20px;pointer-events:none;">⚔️ 0</div>
                </div>

                <!-- Progress bar -->
                <div id="replay-progress-wrap" style="position:relative;height:6px;background:rgba(255,255,255,0.08);
                     border-radius:3px;margin-bottom:8px;cursor:pointer;"
                     onclick="BattleLogPanel._seekReplay(event)">
                    <div id="replay-progress-fill" style="height:100%;width:0%;background:#1e88e5;border-radius:3px;
                         transition:width 0.05s linear;pointer-events:none;"></div>
                </div>

                <!-- Controls -->
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <button id="replay-play-btn" onclick="BattleLogPanel._toggleReplayPlay()"
                        style="background:rgba(30,136,229,0.2);border:1px solid rgba(30,136,229,0.4);
                               border-radius:8px;color:#90caf9;font-size:14px;padding:5px 14px;cursor:pointer;">
                        ⏸
                    </button>
                    <button onclick="BattleLogPanel._restartReplay()"
                        style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                               border-radius:8px;color:#aaa;font-size:12px;padding:5px 10px;cursor:pointer;">
                        ↺
                    </button>
                    <button id="replay-speed-btn" onclick="BattleLogPanel._cycleReplaySpeed()"
                        style="background:rgba(255,179,0,0.12);border:1px solid rgba(255,179,0,0.3);
                               border-radius:8px;color:#ffb300;font-size:11px;padding:5px 10px;cursor:pointer;margin-left:auto;">
                        1×
                    </button>
                </div>

                <!-- Legend -->
                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    ${Object.entries(grouped).map(([type, cnt]) => {
                        const td = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[type] : null;
                        const cat = td?.category || 'piyoda';
                        const col = CAT_COLORS[cat] || CAT_COLORS[type] || '#aaa';
                        return `<div style="display:flex;align-items:center;gap:3px;
                                    background:rgba(255,255,255,0.05);border-radius:20px;
                                    padding:2px 7px;font-size:9px;color:#ccc;">
                            <div style="width:7px;height:7px;border-radius:50%;background:${col};flex-shrink:0;"></div>
                            ${td?.name || type} ×${cnt}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) this._stopReplay(); });

        // Init replay state
        this._replay = {
            events,
            totalMs,
            curMs: 0,
            playing: true,
            speed: 1,
            lastRaf: null,
            activeMarkers: [],  // { x, y, color, bornAt, label }
            buildings: typeof BuildingManager !== 'undefined'
                ? Object.values(BuildingManager.buildings) : [],
        };

        requestAnimationFrame(ts => this._replayLoop(ts));
    },

    _stopReplay() {
        if (this._replay?.rafId) cancelAnimationFrame(this._replay.rafId);
        this._replay = null;
        document.getElementById('battle-replay-modal')?.remove();
    },

    _toggleReplayPlay() {
        if (!this._replay) return;
        this._replay.playing = !this._replay.playing;
        document.getElementById('replay-play-btn').textContent = this._replay.playing ? '⏸' : '▶';
        if (this._replay.playing) requestAnimationFrame(() => this._replayLoop());
    },

    _restartReplay() {
        if (!this._replay) return;
        this._replay.curMs = 0;
        this._replay.activeMarkers = [];
        this._replay.lastRaf = null;
        this._replay.playing = true;
        for (const ev of this._replay.events) delete ev._spawned;
        document.getElementById('replay-play-btn').textContent = '⏸';
        requestAnimationFrame(ts => this._replayLoop(ts));
    },

    _cycleReplaySpeed() {
        if (!this._replay) return;
        const speeds = [1, 2, 4, 0.5];
        const cur = speeds.indexOf(this._replay.speed);
        this._replay.speed = speeds[(cur + 1) % speeds.length];
        document.getElementById('replay-speed-btn').textContent = `${this._replay.speed}×`;
    },

    _seekReplay(e) {
        if (!this._replay) return;
        const bar = document.getElementById('replay-progress-wrap');
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this._replay.curMs = frac * this._replay.totalMs;
        this._replay.activeMarkers = [];
        this._replay.lastRaf = null;
        // Reset spawned flags so events before seek point replay correctly
        for (const ev of this._replay.events) delete ev._spawned;
        if (!this._replay.playing) {
            requestAnimationFrame(ts => this._replayLoop(ts));
        }
    },

    _replayLoop(ts) {
        const r = this._replay;
        if (!r || !document.getElementById('battle-replay-modal')) return;

        const canvas = document.getElementById('replay-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        if (r.playing) {
            if (r.lastRaf !== null) {
                const dt = ts - r.lastRaf;
                r.curMs += dt * r.speed;
                if (r.curMs >= r.totalMs) {
                    r.curMs = r.totalMs;
                    r.playing = false;
                    const btn = document.getElementById('replay-play-btn');
                    if (btn) btn.textContent = '▶';
                }
            }
            r.lastRaf = ts;
        }

        // Spawn markers for events up to curMs
        const alreadySpawned = r.activeMarkers.length;
        const toSpawn = r.events.filter(ev => ev.t <= r.curMs && !ev._spawned);
        for (const ev of toSpawn) {
            ev._spawned = true;
            const td = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[ev.type] : null;
            const cat = td?.category;
            const colors = {
                piyoda:'#ef5350', otishma:'#66bb6a', otliq:'#ce93d8',
                qamal:'#ffb74d', uchuvchi:'#42a5f5', commander:'#ffd700',
            };
            r.activeMarkers.push({
                wx: ev.x, wy: ev.y,
                color: colors[cat] || colors[ev.type] || '#fff',
                bornAt: r.curMs,
                label: td?.icon || '⚔️',
                type: ev.type,
            });
        }

        // ── Draw ──
        ctx.clearRect(0, 0, W, H);

        // Dark grass background
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0e1520');
        grad.addColorStop(1, '#0a1008');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Grid dots
        const GRID = typeof Grid !== 'undefined' ? Grid.SIZE : 30;
        const TILE = Math.min(W, H) / GRID * 0.85;
        // Isometric projection (standalone, no Camera)
        const ISO_X = TILE * 0.5;
        const ISO_Y = TILE * 0.25;
        const OFFSET_X = W * 0.5;
        const OFFSET_Y = H * 0.2;
        const toScreen = (wx, wy) => ({
            x: OFFSET_X + (wx - wy) * ISO_X,
            y: OFFSET_Y + (wx + wy) * ISO_Y,
        });

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= GRID; i += 5) {
            const a = toScreen(i, 0), b = toScreen(i, GRID);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            const c = toScreen(0, i), d = toScreen(GRID, i);
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
        }

        // Buildings
        for (const b of r.buildings) {
            const bd = typeof BUILDING_DATA !== 'undefined' ? BUILDING_DATA[b.type] : null;
            if (!bd) continue;
            const bw = bd.size[0], bh2 = bd.size[1];
            const p1 = toScreen(b.x, b.y);
            const p2 = toScreen(b.x + bw, b.y);
            const p3 = toScreen(b.x + bw, b.y + bh2);
            const p4 = toScreen(b.x, b.y + bh2);
            // Building footprint fill
            const typeColors = {
                townHall: '#ffd700', archerTower: '#80cbc4', tormenta: '#42a5f5',
                scorpio: '#ffb300', wall: '#546e7a', barracks: '#ef5350',
                goldmine: '#ffee58', farm: '#a5d6a7', laboratory: '#ce93d8',
                default: '#455a64',
            };
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
            ctx.closePath();
            ctx.fillStyle = (typeColors[b.type] || typeColors.default) + '55';
            ctx.fill();
            ctx.strokeStyle = (typeColors[b.type] || typeColors.default) + 'aa';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Troop markers
        const now2 = r.curMs;
        for (const m of r.activeMarkers) {
            const age = now2 - m.bornAt;
            const lifeMs = 6000;
            const life = Math.max(0, 1 - age / lifeMs);
            if (life <= 0) continue;

            const sp = toScreen(m.wx, m.wy);
            const pulse = (Math.sin(now2 * 0.006 + m.wx) + 1) / 2;
            const r2 = (2.5 + pulse * 1) * (age < 300 ? age / 300 : 1);

            // Glow
            ctx.save();
            ctx.globalAlpha = life * 0.4;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, r2 * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = m.color;
            ctx.fill();
            ctx.restore();

            // Core dot
            ctx.save();
            ctx.globalAlpha = life;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, r2, 0, Math.PI * 2);
            ctx.fillStyle = m.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore();
        }

        // Remove expired markers
        r.activeMarkers = r.activeMarkers.filter(m => (now2 - m.bornAt) < 6000);

        // HUD overlays
        const timeMs = Math.min(r.curMs, r.totalMs);
        const tSec = Math.floor(timeMs / 1000);
        const tMin = Math.floor(tSec / 60);
        document.getElementById('replay-time-overlay').textContent =
            `${tMin}:${String(tSec % 60).padStart(2, '0')}`;
        document.getElementById('replay-troop-overlay').textContent =
            `⚔️ ${r.activeMarkers.length}`;
        const pct = (timeMs / r.totalMs * 100).toFixed(1);
        const fill = document.getElementById('replay-progress-fill');
        if (fill) fill.style.width = pct + '%';

        if (r.playing) {
            r.rafId = requestAnimationFrame(ts2 => this._replayLoop(ts2));
        }
    },

    _render(el) {
        const tab = this._tab;
        const attacks  = this._data?.attacks  || [];
        const defenses = this._data?.defenses || [];

        const atkWins    = attacks.filter(r => (r.stars ?? 0) > 0 || r.victory).length;
        const atkLosses  = attacks.length - atkWins;
        const winRate    = attacks.length > 0 ? Math.round(atkWins / attacks.length * 100) : 0;
        const totalStars = attacks.reduce((s, r) => s + (r.stars ?? 0), 0);
        const totalLoot  = attacks.reduce((s, r) => s + (r.loot_gold ?? r.loot ?? 0), 0);
        const avgDest    = attacks.length > 0
            ? Math.round(attacks.reduce((s, r) => s + (r.destruction ?? r.destruction_percent ?? r.percent ?? 0), 0) / attacks.length)
            : 0;

        const defWins    = defenses.filter(r => (r.stars ?? 0) === 0).length;
        const defLosses  = defenses.length - defWins;
        const defLootLost = defenses.reduce((s, r) => s + (r.loot_gold ?? r.loot ?? 0), 0);

        el.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">📜 JANG TARIXI</div>
                <div class="panel-close" onclick="BattleLogPanel.hide()">✖</div>
            </div>
            <div class="panel-content" style="padding:10px;">

                <!-- Tab switcher -->
                <div style="display:flex;background:rgba(255,255,255,0.04);border-radius:10px;
                            overflow:hidden;margin-bottom:10px;padding:3px;gap:3px;">
                    <div onclick="BattleLogPanel.setTab('attacks')"
                         style="flex:1;text-align:center;padding:7px;cursor:pointer;font-size:11px;font-weight:700;
                                border-radius:8px;transition:all 0.2s;
                                ${tab==='attacks' ? 'background:rgba(76,175,80,0.25);color:#81c784;' : 'color:#666;'}">
                        ⚔️ Hujumlar (${attacks.length})
                    </div>
                    <div onclick="BattleLogPanel.setTab('defenses')"
                         style="flex:1;text-align:center;padding:7px;cursor:pointer;font-size:11px;font-weight:700;
                                border-radius:8px;transition:all 0.2s;
                                ${tab==='defenses' ? 'background:rgba(244,67,54,0.25);color:#e57373;' : 'color:#666;'}">
                        🛡️ Himoya (${defenses.length})
                    </div>
                </div>

                ${tab === 'attacks' && attacks.length > 0 ? `
                <!-- Attack stats grid -->
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:10px;">
                    ${[
                        { val: atkWins,   label: "G'alaba", color: '#81c784', icon: '✅' },
                        { val: atkLosses, label: "Mag'lubiyat", color: '#e57373', icon: '❌' },
                        { val: winRate+'%', label: 'Win Rate', color: winRate>=50?'#ffd700':'#ef9a9a', icon: '📊' },
                        { val: totalStars, label: 'Yulduz', color: '#ffd700', icon: '⭐' },
                    ].map(s => `
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
                                    border-radius:8px;padding:7px 4px;text-align:center;">
                            <div style="font-size:12px;">${s.icon}</div>
                            <div style="font-size:13px;font-weight:800;color:${s.color};">${s.val}</div>
                            <div style="font-size:8px;color:#555;margin-top:1px;">${s.label}</div>
                        </div>`).join('')}
                </div>

                <!-- Loot summary bar -->
                <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);
                            border-radius:8px;padding:7px 10px;margin-bottom:8px;
                            display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:10px;color:#888;">Jami o'g'irlangan</span>
                    <span style="font-size:12px;font-weight:800;color:#ffd700;">
                        🪙 ${Helpers.formatNumber(totalLoot)} · 💥 ${avgDest}% avg
                    </span>
                </div>` : ''}

                ${tab === 'defenses' && defenses.length > 0 ? `
                <!-- Defense stats -->
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:10px;">
                    ${[
                        { val: defWins,   label: 'Himoya', color: '#81c784', icon: '🛡️' },
                        { val: defLosses, label: 'Buzildi', color: '#e57373', icon: '💥' },
                        { val: defenses.length > 0 ? Math.round(defWins/defenses.length*100)+'%' : '0%', label: 'Himoya %', color: '#90caf9', icon: '📊' },
                    ].map(s => `
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
                                    border-radius:8px;padding:7px 4px;text-align:center;">
                            <div style="font-size:12px;">${s.icon}</div>
                            <div style="font-size:13px;font-weight:800;color:${s.color};">${s.val}</div>
                            <div style="font-size:8px;color:#555;">${s.label}</div>
                        </div>`).join('')}
                </div>
                ${defLootLost > 0 ? `
                <div style="background:rgba(244,67,54,0.06);border:1px solid rgba(244,67,54,0.15);
                            border-radius:8px;padding:7px 10px;margin-bottom:8px;
                            display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:10px;color:#888;">O'g'irlandi</span>
                    <span style="font-size:12px;font-weight:800;color:#ef9a9a;">🪙 -${Helpers.formatNumber(defLootLost)}</span>
                </div>` : ''}` : ''}

                <div style="max-height:340px;overflow-y:auto;padding-right:2px;
                            scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.1) transparent;">
                    ${tab === 'attacks'
                        ? this._renderRows(attacks, true)
                        : this._renderRows(defenses, false)}
                </div>

                <button class="btn" onclick="BattleLogPanel.show()"
                        style="width:100%;margin-top:8px;font-size:11px;background:rgba(255,255,255,0.06);">
                    🔄 Yangilash
                </button>
            </div>
        `;
    },
};
