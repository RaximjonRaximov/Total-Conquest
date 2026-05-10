// ============================================
// LEADERBOARD PANEL — Global Top 100
// ============================================

const LeaderboardPanel = {
    _players: [],
    _alliances: [],
    _tab: 'players',
    _loading: false,
    _filter: '',
    _refreshInterval: null,
    _prevRanks: {},   // { userId: rank } — from last session

    // ── Public API ────────────────────────────

    async show() {
        AudioManager.playClick();
        let el = document.getElementById('leaderboard-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'leaderboard-panel';
            el.className = 'panel-container';
            document.body.appendChild(el);
        }
        el.classList.add('show');
        document.getElementById('modal-overlay').classList.add('show');
        document.getElementById('modal-overlay').onclick = () => this.hide();

        // Load previously saved ranks for delta calculation
        try {
            this._prevRanks = JSON.parse(localStorage.getItem('lb_prev_ranks') || '{}');
        } catch { this._prevRanks = {}; }

        this._filter = '';
        this._renderLoading(el);
        await this._load();
        this._render(el);

        // Auto-refresh har 30 soniyada
        if (this._refreshInterval) clearInterval(this._refreshInterval);
        this._refreshInterval = setInterval(async () => {
            const panel = document.getElementById('leaderboard-panel');
            if (!panel?.classList.contains('show')) { clearInterval(this._refreshInterval); this._refreshInterval = null; return; }
            await this._load();
            this._render(panel);
        }, 30000);
    },

    hide() {
        const el = document.getElementById('leaderboard-panel');
        if (el) el.classList.remove('show');
        const overlay = document.getElementById('modal-overlay');
        if (overlay) { overlay.classList.remove('show'); overlay.onclick = null; }
        if (this._refreshInterval) { clearInterval(this._refreshInterval); this._refreshInterval = null; }
    },

    setFilter(val) {
        this._filter = val;
        const el = document.getElementById('leaderboard-panel');
        if (el) this._render(el);
    },

    scrollToMe() {
        const myId = typeof Api !== 'undefined' ? String(Api.getUserId()) : null;
        if (!myId) return;
        const el = document.getElementById(`lb-row-${myId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    setTab(tab) {
        this._tab = tab;
        const el = document.getElementById('leaderboard-panel');
        if (el) this._render(el);
    },

    // ── Data Loading ──────────────────────────

    async _load() {
        this._loading = true;
        try {
            if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                [this._players, this._alliances] = await Promise.all([
                    Api.getLeaderboard().catch(() => []),
                    Api.getAllianceLeaderboard().catch(() => [])
                ]);
            } else {
                this._players = [];
                this._alliances = [];
            }
        } catch (e) {
            console.warn('Leaderboard load failed:', e.message);
            this._players = [];
            this._alliances = [];
        }
        this._loading = false;

        // Snapshot current ranks for next session's delta
        if (this._players.length) {
            const snapshot = {};
            this._players.forEach(p => { snapshot[String(p.user_id)] = p.rank; });
            try { localStorage.setItem('lb_prev_ranks', JSON.stringify(snapshot)); } catch {}
        }
    },

    async _reload() {
        const el = document.getElementById('leaderboard-panel');
        if (!el) return;
        this._renderLoading(el);
        await this._load();
        this._render(el);
    },

    // ── Helpers ───────────────────────────────

    /** HSL color derived from name string */
    _avatarColor(name) {
        let hash = 0;
        for (let i = 0; i < (name || '?').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        const h = Math.abs(hash) % 360;
        return `hsl(${h},55%,38%)`;
    },

    /** Initials (up to 2 chars) */
    _initials(name) {
        const n = (name || '?').trim();
        const parts = n.split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return n.slice(0, 2).toUpperCase();
    },

    /** Avatar circle HTML */
    _avatar(name, size = 32) {
        const bg = this._avatarColor(name);
        const init = this._initials(name);
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;
                    background:${bg};border:1.5px solid rgba(255,255,255,0.18);
                    display:flex;align-items:center;justify-content:center;
                    font-size:${Math.round(size*0.36)}px;font-weight:800;color:#fff;
                    letter-spacing:0.5px;flex-shrink:0;text-shadow:0 1px 2px rgba(0,0,0,0.5);">
                    ${init}
                </div>`;
    },

    /** Rank change badge HTML */
    _rankChangeBadge(userId, currentRank) {
        const prev = this._prevRanks[String(userId)];
        if (prev === undefined || prev === currentRank) {
            return `<span style="color:rgba(255,255,255,0.2);font-size:9px;font-weight:700;">—</span>`;
        }
        const delta = prev - currentRank;   // positive = moved UP
        if (delta > 0) {
            return `<span style="color:#66bb6a;font-size:9px;font-weight:800;
                                 text-shadow:0 0 6px rgba(102,187,106,0.6);">▲${delta}</span>`;
        } else {
            return `<span style="color:#ef5350;font-size:9px;font-weight:800;
                                 text-shadow:0 0 6px rgba(239,83,80,0.6);">▼${Math.abs(delta)}</span>`;
        }
    },

    // ── Render: Loading ───────────────────────

    _renderLoading(el) {
        el.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">🏆 REYTING</div>
                <div class="panel-close" onclick="LeaderboardPanel.hide()">✖</div>
            </div>
            <div class="panel-content" style="text-align:center;padding:40px 0;">
                <div style="font-size:32px;margin-bottom:12px;animation:pulse 1s ease-in-out infinite;">⏳</div>
                <div style="color:#aaa;font-size:13px;">Yuklanmoqda...</div>
            </div>
        `;
    },

    // ── Render: Player Rows ───────────────────

    _renderPlayerRows() {
        const myId = (typeof Api !== 'undefined' && Api.getUserId()) ? String(Api.getUserId()) : null;
        let players = this._players;

        if (!players.length) {
            return `<div style="text-align:center;color:#888;padding:30px;">Hali o'yinchilar yo'q.</div>`;
        }

        const q = this._filter.toLowerCase().trim();
        if (q) players = players.filter(p => p.display_name?.toLowerCase().includes(q));
        if (!players.length) return `<div style="text-align:center;color:#888;padding:20px;">Topilmadi.</div>`;

        return players.map(p => {
            const isMe      = myId && String(p.user_id) === myId;
            const r         = p.rank;
            const league    = typeof BattleSystem !== 'undefined' ? BattleSystem.getLeague(p.trophies) : null;
            const leagueTag = league ? `<span style="color:${league.color};">${league.icon}</span>` : '';
            const streak    = p.win_streak || 0;
            const streakBadge = streak >= 3
                ? `<span style="background:rgba(255,87,34,0.2);border:1px solid rgba(255,87,34,0.4);
                               color:#ff8a65;font-size:8px;border-radius:10px;padding:1px 5px;">🔥${streak}</span>`
                : '';

            // ── Rank number / icon
            const rankColor = r === 1 ? '#ffd700' : r === 2 ? '#e8e8e8' : r === 3 ? '#cd9b5a' : 'rgba(255,255,255,0.35)';
            const rankDisplay = r <= 3
                ? `<span style="font-size:20px;">${['🥇','🥈','🥉'][r-1]}</span>`
                : `<span style="font-size:12px;font-weight:800;color:${rankColor};">${r}</span>`;

            // ── Change badge
            const changeBadge = this._rankChangeBadge(p.user_id, r);

            // ── Row background
            let rowBg     = 'rgba(255,255,255,0.03)';
            let rowBorder = '1px solid rgba(255,255,255,0.05)';
            if (isMe)     { rowBg = 'rgba(212,175,55,0.15)'; rowBorder = '1px solid rgba(212,175,55,0.5)'; }
            else if (r===1) { rowBg = 'rgba(255,215,0,0.08)'; rowBorder = '1px solid rgba(255,215,0,0.2)'; }
            else if (r===2) { rowBg = 'rgba(200,200,200,0.07)'; rowBorder = '1px solid rgba(200,200,200,0.15)'; }
            else if (r===3) { rowBg = 'rgba(205,127,50,0.07)'; rowBorder = '1px solid rgba(205,127,50,0.15)'; }

            // ── Stats
            const atkStr = p.attack_wins  !== undefined ? `⚔️${p.attack_wins}`  : '';
            const defStr = p.defense_wins !== undefined ? `🛡️${p.defense_wins}` : '';
            const statsRow = (atkStr || defStr)
                ? `<span style="color:rgba(255,255,255,0.3);font-size:9px;">${[atkStr, defStr].filter(Boolean).join(' ')}</span>`
                : '';

            return `<div id="lb-row-${p.user_id}"
                         style="display:flex;align-items:center;padding:8px 10px;margin-bottom:3px;
                                background:${rowBg};border-radius:10px;border:${rowBorder};
                                ${r<=3?'box-shadow:0 2px 8px rgba(0,0,0,0.3);':''}
                                transition:background 0.2s;">

                <!-- Rank + delta column -->
                <div style="width:38px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;">
                    ${rankDisplay}
                    ${changeBadge}
                </div>

                <!-- Avatar -->
                ${this._avatar(p.display_name, 34)}

                <!-- Info -->
                <div style="flex:1;margin:0 8px;min-width:0;">
                    <div style="font-size:13px;font-weight:700;
                                color:${isMe?'#ffd700':r<=3?'#fff':'#ddd'};
                                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                                display:flex;align-items:center;gap:4px;">
                        ${(p.display_name || '?').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
                        ${isMe ? '<span style="font-size:10px;">👑</span>' : ''}
                        ${streakBadge}
                    </div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;
                                display:flex;align-items:center;gap:4px;">
                        <span>TH${p.th_level ?? '?'}</span>
                        ${leagueTag ? `<span>·</span>${leagueTag} <span style="color:${league?.color||'#888'};font-size:9px;">${league?.name||''}</span>` : ''}
                        ${statsRow ? `<span>·</span>${statsRow}` : ''}
                    </div>
                </div>

                <!-- Trophies -->
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:14px;font-weight:800;color:#ffd700;">🏆 ${(p.trophies||0).toLocaleString()}</div>
                    ${r <= 10 ? `<div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:1px;">Top ${r}</div>` : ''}
                </div>
            </div>`;
        }).join('');
    },

    // ── Render: Alliance Rows ─────────────────

    _renderAllianceRows() {
        if (!this._alliances.length) {
            return `<div style="text-align:center;color:#888;padding:30px;">Hali ittifoqlar reytingda yo'q.</div>`;
        }
        return this._alliances.map(a => {
            const r         = a.rank;
            const rankColor = r === 1 ? '#ffd700' : r === 2 ? '#e0e0e0' : r === 3 ? '#cd7f32' : 'rgba(255,255,255,0.4)';
            const rankDisplay = r <= 3
                ? `<span style="font-size:20px;">${['🥇','🥈','🥉'][r-1]}</span>`
                : `<span style="font-size:12px;font-weight:800;color:${rankColor};">${r}</span>`;
            const winRate = a.war_wins + a.war_losses > 0
                ? Math.round(a.war_wins / (a.war_wins + a.war_losses) * 100) : null;

            return `<div style="display:flex;align-items:center;padding:9px 10px;margin-bottom:3px;
                                background:rgba(255,255,255,0.04);border-radius:10px;
                                border:1px solid rgba(255,255,255,0.07);transition:background 0.2s;">
                <div style="width:38px;flex-shrink:0;text-align:center;">${rankDisplay}</div>
                ${this._avatar(a.name, 34)}
                <div style="flex:1;margin:0 8px;min-width:0;">
                    <div style="font-size:13px;font-weight:700;color:#fff;
                                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        🛡️ ${(a.name||'?').replace(/</g,'&lt;')}
                        <span style="color:rgba(255,255,255,0.35);font-size:10px;">#${a.tag||''}</span>
                    </div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;">
                        👥 ${a.member_count} a'zo
                        ${winRate !== null ? `· ⚔️${a.war_wins}W/${a.war_losses}L (${winRate}%)` : ''}
                    </div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:13px;font-weight:800;color:#ffd700;">🏆 ${Math.round(a.total_trophies).toLocaleString()}</div>
                    <div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:1px;">~${Math.round(a.avg_trophies)} avg</div>
                </div>
            </div>`;
        }).join('');
    },

    // ── Main Render ───────────────────────────

    _render(el) {
        const tab   = this._tab;
        const myId  = typeof Api !== 'undefined' && Api.getUserId() ? String(Api.getUserId()) : null;
        const myEntry = myId ? this._players.find(p => String(p.user_id) === myId) : null;

        // My-position card
        let myCard = '';
        if (myEntry) {
            const changeBadge = this._rankChangeBadge(myEntry.user_id, myEntry.rank);
            myCard = `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:10px;
                        background:linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.05));
                        border:1px solid rgba(212,175,55,0.45);border-radius:12px;">
                ${this._avatar(myEntry.display_name, 38)}
                <div style="flex:1;min-width:0;">
                    <div style="font-size:10px;color:rgba(212,175,55,0.7);font-weight:700;letter-spacing:0.5px;margin-bottom:2px;">SIZ</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:16px;font-weight:800;color:#ffd700;">#${myEntry.rank}</span>
                        ${changeBadge}
                        <span style="font-size:13px;color:#ffd700;">🏆 ${(myEntry.trophies||0).toLocaleString()}</span>
                    </div>
                </div>
                <button onclick="LeaderboardPanel.scrollToMe()"
                        style="background:rgba(212,175,55,0.2);border:1px solid rgba(212,175,55,0.4);
                               color:#ffd700;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">
                    📍 Ko'rish
                </button>
            </div>`;
        }

        // Tab switcher
        const tabSwitcher = `
            <div style="display:flex;background:rgba(255,255,255,0.05);border-radius:10px;
                        overflow:hidden;margin-bottom:10px;border:1px solid rgba(255,255,255,0.07);">
                <div onclick="LeaderboardPanel.setTab('players')"
                     style="flex:1;text-align:center;padding:9px 0;cursor:pointer;font-size:12px;font-weight:700;
                            border-radius:9px 0 0 9px;transition:all 0.2s;
                            ${tab==='players'
                                ? 'background:rgba(212,175,55,0.2);color:#ffd700;box-shadow:inset 0 0 8px rgba(212,175,55,0.08);'
                                : 'color:rgba(255,255,255,0.4);'}">
                    👤 O'yinchilar
                </div>
                <div onclick="LeaderboardPanel.setTab('alliances')"
                     style="flex:1;text-align:center;padding:9px 0;cursor:pointer;font-size:12px;font-weight:700;
                            border-radius:0 9px 9px 0;transition:all 0.2s;
                            ${tab==='alliances'
                                ? 'background:rgba(33,150,243,0.2);color:#64b5f6;box-shadow:inset 0 0 8px rgba(33,150,243,0.08);'
                                : 'color:rgba(255,255,255,0.4);'}">
                    🛡️ Ittifoqlar
                </div>
            </div>`;

        // Search (players only)
        const search = tab === 'players' ? `
            <input type="text" placeholder="🔍 O'yinchi izlash..."
                   value="${this._filter}"
                   oninput="LeaderboardPanel.setFilter(this.value)"
                   style="width:100%;box-sizing:border-box;
                          background:rgba(255,255,255,0.06);
                          border:1px solid rgba(255,255,255,0.1);border-radius:8px;
                          color:#fff;padding:8px 12px;font-size:12px;outline:none;
                          margin-bottom:8px;font-family:inherit;" />` : '';

        // Change legend
        const legend = `
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;padding:0 2px;">
                <span style="font-size:10px;color:rgba(255,255,255,0.3);">O'zgarish:</span>
                <span style="color:#66bb6a;font-size:10px;font-weight:700;">▲ Ko'tarildi</span>
                <span style="color:#ef5350;font-size:10px;font-weight:700;">▼ Tushdi</span>
                <span style="color:rgba(255,255,255,0.2);font-size:10px;">— O'zgarmadi</span>
            </div>`;

        el.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">🏆 REYTING</div>
                <div class="panel-close" onclick="LeaderboardPanel.hide()">✖</div>
            </div>
            <div class="panel-content" style="padding:10px;">
                ${myCard}
                ${tabSwitcher}
                ${search}
                ${tab === 'players' && this._players.length ? legend : ''}
                <div style="max-height:360px;overflow-y:auto;padding-right:2px;
                            scrollbar-width:thin;scrollbar-color:rgba(212,175,55,0.2) transparent;">
                    ${tab === 'players' ? this._renderPlayerRows() : this._renderAllianceRows()}
                </div>
                <button class="btn" onclick="LeaderboardPanel._reload()"
                        style="width:100%;margin-top:10px;font-size:12px;
                               background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);
                               border:1px solid rgba(255,255,255,0.1);">🔄 Yangilash</button>
            </div>
        `;
    },
};
