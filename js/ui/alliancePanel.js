// ============================================
// ALLIANCE PANEL - Ittifoq UI
// ============================================

const AlliancePanel = {
    visible: false,
    _tab: 'browse',       // 'browse' | 'create' | 'members' | 'war'
    _myAlliance: null,    // null = not loaded, undefined = loading, object = loaded
    _searchResults: null,
    _searchQuery: '',
    _searchTimer: null,
    _creating: false,
    _warData: null,
    _warLoading: false,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('alliance-panel');
        const overlay = document.getElementById('modal-overlay');

        if (!el) {
            this._createPanel();
            return this.toggle();
        }

        if (this.visible) {
            this._myAlliance = null;
            this._tab = 'browse';
            this._chatLastTs = null;
            this.render();
            this._loadMyAlliance();
            el.classList.add('show');
            overlay.classList.add('show');
            this._startChatPoll();
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
            this._stopChatPoll();
        }
    },

    hide() {
        this.visible = false;
        this._stopChatPoll();
        const el = document.getElementById('alliance-panel');
        if (el) el.classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'alliance-panel';
        panel.className = 'panel-container';
        document.body.appendChild(panel);
    },

    async _loadMyAlliance() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            this._myAlliance = AllianceSystem.getCurrentData() || null;
            this.render();
            return;
        }
        this._myAlliance = undefined;
        try {
            this._myAlliance = await Api.getMyAlliance();
            AllianceSystem._serverData = this._myAlliance;
        } catch (err) {
            this._myAlliance = err?.status === 404 ? null : AllianceSystem.getCurrentData() || null;
        }
        if (this.visible) this.render();
    },

    render() {
        const panel = document.getElementById('alliance-panel');
        if (!panel) return;

        const loading = this._myAlliance === undefined;
        const inAlliance = !loading && this._myAlliance !== null;

        let html = `
            <div class="panel-header">
                <div class="panel-title">🤝 ITTIFOQ</div>
                <div class="panel-close" onclick="AlliancePanel.hide()">✖</div>
            </div>
            <div class="panel-content">
        `;

        if (loading) {
            html += `<div style="text-align:center;padding:40px;color:#aaa;">⏳ Yuklanmoqda...</div>`;
        } else if (inAlliance) {
            html += this._renderInAlliance();
        } else {
            html += this._renderNoAlliance();
        }

        html += `</div>`;
        panel.innerHTML = html;
        this._bindSearchInput();
    },

    _renderInAlliance() {
        const a = this._myAlliance;
        const role = a.role || 'member';
        const roleLabels = { leader: '👑 Rahbar', 'co-leader': '⭐ Yordamchi', member: '👤 A\'zo' };
        const memberCount = a.member_count ?? 1;

        let tabs = '';
        if (this._tab === 'browse') {
            tabs = `
                <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px;">
                    <div style="text-align:center;margin-bottom:12px;">
                        <div style="font-size:36px;margin-bottom:6px;">🛡️</div>
                        <div style="font-size:20px;font-weight:bold;color:#d4af37;">${this._esc(a.name)}</div>
                        <div style="color:#888;font-size:12px;">#${this._esc(a.tag)}</div>
                        ${a.description ? `<div style="color:#aaa;font-size:12px;margin-top:6px;">${this._esc(a.description)}</div>` : ''}
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;font-size:12px;text-align:center;">
                        <div style="background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;">
                            <div style="color:#ffd700;font-weight:bold;">${memberCount}/50</div>
                            <div style="color:#888;">A'zolar</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;">
                            <div style="color:#4caf50;font-weight:bold;">${a.war_wins ?? 0}</div>
                            <div style="color:#888;">Urush g'alabasi</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;">
                            <div style="color:#d4af37;font-weight:bold;">${roleLabels[role] || role}</div>
                            <div style="color:#888;">Rol</div>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                        <button class="btn btn-primary" onclick="AlliancePanel._setTab('members')">
                            👥 A'zolar
                        </button>
                        <button class="btn" style="background:rgba(244,67,54,0.3);border-color:#f44336;"
                                onclick="AlliancePanel._setTab('war')">
                            ⚔️ Ittifoq Urushi
                        </button>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                        <button class="btn" style="background:rgba(156,39,176,0.3);border-color:#9c27b0;"
                                onclick="AlliancePanel._setTab('donations')">
                            🎁 Askar So'rovlar
                        </button>
                        <button class="btn btn-danger" onclick="AlliancePanel._confirmLeave()">
                            🚪 Tark Etish
                        </button>
                    </div>
                </div>

                <div style="background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-size:12px;">
                    <div style="color:#d4af37;font-weight:bold;margin-bottom:8px;">💬 Ittifoq Chati</div>
                    <div id="alliance-chat-msgs"
                         style="max-height:140px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;margin-bottom:8px;">
                        <div style="color:#555;text-align:center;font-size:11px;">Yuklanmoqda...</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <input id="alliance-chat-input" type="text" maxlength="200"
                               placeholder="Xabar yozing..."
                               style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                                      color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;outline:none;"
                               onkeydown="if(event.key==='Enter')AlliancePanel._sendChat()">
                        <button onclick="AlliancePanel._sendChat()"
                                style="background:rgba(212,175,55,0.3);border:1px solid #d4af37;color:#ffd700;
                                       padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">➤</button>
                    </div>
                </div>
            `;
        } else if (this._tab === 'members') {
            tabs = this._renderMembersTab();
        } else if (this._tab === 'donations') {
            tabs = this._renderDonationsTab();
        } else if (this._tab === 'war') {
            tabs = this._renderWarTab();
        }

        return tabs;
    },

    _renderMembersTab() {
        return `
            <div>
                <button class="btn" style="width:100%;margin-bottom:12px;background:rgba(255,255,255,0.08);"
                        onclick="AlliancePanel._setTab('browse')">
                    ← Ittifoq Ma'lumotlariga Qaytish
                </button>
                <div id="alliance-members-list" style="display:flex;flex-direction:column;gap:6px;">
                    <div style="text-align:center;color:#aaa;font-size:12px;">⏳ Yuklanmoqda...</div>
                </div>
            </div>
        `;
    },

    _renderNoAlliance() {
        if (this._tab === 'create') {
            return this._renderCreateForm();
        }

        // Browse / search
        let html = `
            <div style="color:#aaa;font-size:13px;margin-bottom:12px;text-align:center;">
                Ittifoqqa qo'shiling va boshqalar bilan birga kuchayib boring!
            </div>

            <div style="display:flex;gap:8px;margin-bottom:12px;">
                <input id="alliance-search-input" type="text"
                       placeholder="Ittifoq nomini qidirish..."
                       value="${this._esc(this._searchQuery)}"
                       style="flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
                              color:#fff;padding:8px 12px;border-radius:6px;font-size:13px;outline:none;">
                <button class="btn btn-primary" style="padding:8px 14px;white-space:nowrap;"
                        onclick="AlliancePanel._setTab('create')">
                    ➕ Yaratish
                </button>
            </div>
        `;

        if (this._searchResults === null) {
            html += `<div style="text-align:center;color:#888;font-size:12px;padding:20px;">
                Ittifoq qidirish uchun nom kiriting yoki yuqoridagi "Yaratish" tugmasini bosing.
            </div>`;
        } else if (this._searchResults.length === 0) {
            html += `<div style="text-align:center;color:#888;font-size:12px;padding:20px;">
                "${this._esc(this._searchQuery)}" bo'yicha ittifoq topilmadi.
            </div>`;
        } else {
            html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
            for (const a of this._searchResults) {
                const mc = a.member_count ?? 0;
                const canJoin = a.is_open && mc < 50 && BattleSystem.trophies >= (a.min_trophies ?? 0);
                html += `
                    <div style="display:flex;align-items:center;background:rgba(255,255,255,0.05);
                                padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);">
                        <div style="font-size:28px;margin-right:12px;">🛡️</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:bold;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${this._esc(a.name)} <span style="color:#888;font-size:11px;">#${this._esc(a.tag)}</span>
                            </div>
                            <div style="font-size:11px;color:#aaa;">
                                ${mc}/50 a'zo · ${a.min_trophies ?? 0} 🏆 kerak
                                ${!a.is_open ? ' · 🔒 Yopiq' : ''}
                            </div>
                        </div>
                        <button class="btn ${canJoin ? 'btn-primary' : 'btn-disabled'}"
                                style="padding:6px 12px;font-size:12px;flex-shrink:0;"
                                onclick="${canJoin ? `AlliancePanel._join('${a.id}')` : ''}"
                                ${!canJoin ? 'disabled' : ''}>
                            Qo'shilish
                        </button>
                    </div>
                `;
            }
            html += `</div>`;
        }

        return html;
    },

    _renderCreateForm() {
        return `
            <div>
                <button class="btn" style="width:100%;margin-bottom:12px;background:rgba(255,255,255,0.08);"
                        onclick="AlliancePanel._setTab('browse')">
                    ← Orqaga
                </button>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <div>
                        <label style="font-size:12px;color:#aaa;display:block;margin-bottom:4px;">Ittifoq Nomi *</label>
                        <input id="ac-name" type="text" maxlength="30" placeholder="Mening Ittifoqim"
                               style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.1);
                                      border:1px solid rgba(255,255,255,0.2);color:#fff;
                                      padding:8px 12px;border-radius:6px;font-size:13px;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#aaa;display:block;margin-bottom:4px;">Tag (2-8 harf/raqam) *</label>
                        <input id="ac-tag" type="text" maxlength="8" placeholder="MENING"
                               style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.1);
                                      border:1px solid rgba(255,255,255,0.2);color:#fff;
                                      padding:8px 12px;border-radius:6px;font-size:13px;text-transform:uppercase;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#aaa;display:block;margin-bottom:4px;">Tavsif (ixtiyoriy)</label>
                        <input id="ac-desc" type="text" maxlength="120" placeholder="Barchaga xush kelibsiz!"
                               style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.1);
                                      border:1px solid rgba(255,255,255,0.2);color:#fff;
                                      padding:8px 12px;border-radius:6px;font-size:13px;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#aaa;display:block;margin-bottom:4px;">Minimal Kubok</label>
                        <input id="ac-trophies" type="number" min="0" max="10000" value="0"
                               style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.1);
                                      border:1px solid rgba(255,255,255,0.2);color:#fff;
                                      padding:8px 12px;border-radius:6px;font-size:13px;">
                    </div>
                    <button class="btn btn-primary" style="width:100%;margin-top:4px;"
                            onclick="AlliancePanel._submitCreate()" ${this._creating ? 'disabled' : ''}>
                        ${this._creating ? '⏳ Yaratilmoqda...' : '✅ Ittifoq Yaratish'}
                    </button>
                </div>
            </div>
        `;
    },

    _bindSearchInput() {
        const input = document.getElementById('alliance-search-input');
        if (!input) return;
        input.addEventListener('input', (e) => {
            this._searchQuery = e.target.value;
            clearTimeout(this._searchTimer);
            if (this._searchQuery.length < 2) {
                this._searchResults = null;
                this._renderSearchResults();
                return;
            }
            this._searchTimer = setTimeout(() => this._doSearch(), 400);
        });
        input.focus();
    },

    async _doSearch() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) return;
        try {
            this._searchResults = await Api.searchAlliances(this._searchQuery);
        } catch {
            this._searchResults = [];
        }
        this._renderSearchResults();
    },

    _renderSearchResults() {
        if (!this.visible) return;
        this.render();
        // Restore focus and cursor position after re-render
        const input = document.getElementById('alliance-search-input');
        if (input) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange(len, len);
        }
    },

    _setTab(tab) {
        this._tab = tab;
        this.render();
        if (tab === 'members') {
            this._loadMembers();
        } else if (tab === 'donations') {
            this._loadDonations();
        } else if (tab === 'war') {
            this._loadWar();
        }
    },

    async _loadMembers() {
        const allianceId = this._myAlliance?.alliance_id;
        if (!allianceId || typeof Api === 'undefined') return;
        try {
            const data = await Api.getAlliance(allianceId);
            const container = document.getElementById('alliance-members-list');
            if (!container) return;

            const roleLabels = { leader: '👑 Rahbar', 'co-leader': '⭐ Yordamchi', member: '👤 A\'zo' };
            const myRole    = this._myAlliance?.role || 'member';
            const myUserId  = typeof Api !== 'undefined' ? (Api.getUserId?.() || null) : null;
            const canManage = ['leader', 'co-leader'].includes(myRole);

            container.innerHTML = data.members.map(m => {
                const isSelf   = m.user_id === myUserId;
                const isLeader = m.role === 'leader';
                const roleColor = { leader: '#ffd700', 'co-leader': '#64b5f6', member: '#aaa' }[m.role] || '#aaa';
                let actions = '';

                if (canManage && !isSelf && !isLeader) {
                    if (myRole === 'leader') {
                        if (m.role === 'member') {
                            actions += `<button class="btn" style="font-size:10px;padding:3px 7px;" onclick="AlliancePanel._setRole('${m.user_id}','co-leader')">⭐ Ko'tarish</button>`;
                        } else {
                            actions += `<button class="btn" style="font-size:10px;padding:3px 7px;" onclick="AlliancePanel._setRole('${m.user_id}','member')">👤 Tushirish</button>`;
                        }
                        actions += `<button class="btn" style="font-size:10px;padding:3px 7px;color:#ef9a9a;" onclick="AlliancePanel._kickMember('${m.user_id}','${this._esc(m.display_name)}')">🚫 Haydash</button>`;
                        actions += `<button class="btn" style="font-size:10px;padding:3px 7px;color:#80cbc4;" onclick="AlliancePanel._transferLeader('${m.user_id}','${this._esc(m.display_name)}')">👑 Rahbar qil</button>`;
                    } else if (myRole === 'co-leader' && m.role === 'member') {
                        actions += `<button class="btn" style="font-size:10px;padding:3px 7px;color:#ef9a9a;" onclick="AlliancePanel._kickMember('${m.user_id}','${this._esc(m.display_name)}')">🚫 Haydash</button>`;
                    }
                }

                return `<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);
                                    padding:10px;border-radius:8px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;color:#fff;font-weight:bold;">${this._esc(m.display_name)} ${isSelf ? '<span style="color:#ffd700;font-size:10px">(Siz)</span>' : ''}</div>
                        <div style="font-size:10px;color:${roleColor};">${roleLabels[m.role] || m.role}</div>
                        <div style="font-size:10px;color:#888;">TH${m.th_level} · ${m.trophies}🏆 · Berildi: ${m.donated}</div>
                    </div>
                    ${actions ? `<div style="display:flex;flex-direction:column;gap:4px;">${actions}</div>` : ''}
                </div>`;
            }).join('');
        } catch {
            const container = document.getElementById('alliance-members-list');
            if (container) container.innerHTML = '<div style="color:#888;text-align:center;font-size:12px;">Xatolik yuz berdi</div>';
        }
    },

    _renderWarTab() {
        const backBtn = `<button class="btn" style="width:100%;margin-bottom:12px;background:rgba(255,255,255,0.08);"
                onclick="AlliancePanel._setTab('browse')">← Orqaga</button>`;

        if (this._warLoading) {
            return backBtn + `
                <div style="text-align:center;padding:40px;">
                    <div style="font-size:32px;margin-bottom:12px;animation:spin 1s linear infinite;display:inline-block;">⚙️</div>
                    <div style="color:#aaa;font-size:12px;">Urush ma'lumotlari yuklanmoqda...</div>
                </div>`;
        }

        const war = this._warData;

        if (!war) {
            const role = this._myAlliance?.role || 'member';
            const canStart = ['leader', 'co-leader'].includes(role);
            return backBtn + `
                <div style="text-align:center;padding:24px 16px;
                            background:radial-gradient(ellipse at center,rgba(244,67,54,0.08),rgba(0,0,0,0));
                            border:1px solid rgba(244,67,54,0.15);border-radius:16px;">
                    <div style="font-size:52px;margin-bottom:10px;">⚔️</div>
                    <div style="color:#fff;font-family:'Cinzel',serif;font-size:15px;font-weight:700;margin-bottom:6px;">
                        Aktiv urush yo'q
                    </div>
                    <div style="color:#777;font-size:11px;margin-bottom:20px;line-height:1.5;">
                        Ittifoq urushida raqib ittifoq bilan kurashasiz.<br>
                        🛡️ Tayyorlik: 24 soat &nbsp;·&nbsp; ⚔️ Hujum: 24 soat
                    </div>
                    ${canStart
                        ? `<button class="btn btn-primary" style="width:100%;padding:12px;font-size:13px;
                                    background:linear-gradient(135deg,#b71c1c,#f44336);
                                    border-color:rgba(244,67,54,0.7);box-shadow:0 4px 16px rgba(244,67,54,0.3);"
                                   onclick="AlliancePanel._startWar()">
                               ⚔️ Urush Boshlash
                           </button>
                           <div style="font-size:10px;color:#555;margin-top:8px;">
                               A'zolar soni, TH darajasi hisobga olinadi
                           </div>`
                        : `<div style="color:#666;font-size:11px;padding:10px;background:rgba(255,255,255,0.04);
                                        border-radius:8px;">Faqat rahbar urush boshlay oladi</div>`
                    }
                </div>
            `;
        }

        const stateLabels = {
            searching:   '🔍 Raqib qidirilmoqda...',
            preparation: '🛡️ Tayyorlik bosqichi',
            battle:      '⚔️ Hujum bosqichi!',
            ended:       '🏁 Urush tugadi',
        };
        const stateColors = {
            searching: '#64b5f6', preparation: '#4fc3f7', battle: '#ff7043', ended: '#9e9e9e',
        };

        const myAllianceId = war.my_alliance_id;
        const isAlliance1  = war.alliance1_id === myAllianceId;
        const myName    = isAlliance1 ? war.alliance1_name  : war.alliance2_name;
        const oppName   = isAlliance1 ? war.alliance2_name  : war.alliance1_name;
        const myStars   = isAlliance1 ? war.alliance1_stars : war.alliance2_stars;
        const oppStars  = isAlliance1 ? war.alliance2_stars : war.alliance1_stars;
        const maxWarStars = ((war.members || []).filter(m => m.alliance_id === myAllianceId).length) * 6;

        const myMembers  = (war.members || []).filter(m => m.alliance_id === myAllianceId);
        const oppMembers = (war.members || []).filter(m => m.alliance_id !== myAllianceId);
        const myAttacks  = (war.attacks || []).filter(a => a.attacker_id === this._myAlliance?.user_id);
        const attacksLeft = 2 - myAttacks.length;

        const stateColor = stateColors[war.state] || '#aaa';
        const myWinning  = myStars > oppStars;
        const scorePctMe  = maxWarStars > 0 ? Math.min(100, Math.round(myStars  / maxWarStars * 100)) : 0;
        const scorePctOpp = maxWarStars > 0 ? Math.min(100, Math.round(oppStars / maxWarStars * 100)) : 0;

        let html = backBtn + `
            <!-- War header banner -->
            <div style="background:linear-gradient(135deg,rgba(183,28,28,0.25),rgba(20,20,40,0.6));
                        border:1px solid rgba(244,67,54,0.3);border-radius:14px;
                        padding:16px 14px;margin-bottom:10px;
                        box-shadow:0 4px 16px rgba(0,0,0,0.4);">

                <!-- State badge -->
                <div style="text-align:center;margin-bottom:12px;">
                    <span style="background:rgba(0,0,0,0.3);border:1px solid ${stateColor}40;
                                 border-radius:20px;padding:3px 14px;
                                 font-size:11px;font-weight:700;color:${stateColor};letter-spacing:1px;">
                        ${stateLabels[war.state] || war.state}
                    </span>
                </div>

                <!-- VS section -->
                <div style="display:grid;grid-template-columns:1fr 40px 1fr;align-items:center;gap:8px;margin-bottom:12px;">
                    <!-- My alliance -->
                    <div style="text-align:center;">
                        <div style="font-size:11px;color:#4caf50;font-weight:700;
                                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            🛡️ ${this._esc(myName || 'Biz')}
                        </div>
                        <div style="font-size:36px;font-weight:900;font-family:'Cinzel',serif;
                                    color:${myWinning ? '#ffd700' : '#eee'};
                                    text-shadow:0 0 20px rgba(255,215,0,0.${myWinning ? '5' : '1'});">
                            ${myStars}
                        </div>
                        <div style="font-size:10px;color:#666;">⭐ yulduz</div>
                    </div>

                    <!-- VS divider -->
                    <div style="text-align:center;font-size:13px;font-weight:900;color:#555;
                                font-family:'Cinzel',serif;">VS</div>

                    <!-- Opponent -->
                    <div style="text-align:center;">
                        <div style="font-size:11px;color:#f44336;font-weight:700;
                                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ⚔️ ${this._esc(oppName || 'Raqib')}
                        </div>
                        <div style="font-size:36px;font-weight:900;font-family:'Cinzel',serif;
                                    color:${!myWinning && myStars !== oppStars ? '#ffd700' : '#eee'};
                                    text-shadow:0 0 20px rgba(255,215,0,0.${!myWinning && myStars !== oppStars ? '5' : '1'});">
                            ${oppStars}
                        </div>
                        <div style="font-size:10px;color:#666;">⭐ yulduz</div>
                    </div>
                </div>

                <!-- Star progress bars -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                    <div>
                        <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
                            <div style="height:100%;width:${scorePctMe}%;background:linear-gradient(90deg,#4caf50,#69f0ae);
                                        border-radius:3px;transition:width 0.5s;"></div>
                        </div>
                        <div style="font-size:8px;color:#4caf50;margin-top:2px;">
                            ${myMembers.length} a'zo · ${myStars}/${maxWarStars} max
                        </div>
                    </div>
                    <div>
                        <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;direction:rtl;">
                            <div style="height:100%;width:${scorePctOpp}%;background:linear-gradient(90deg,#ef5350,#ff7043);
                                        border-radius:3px;transition:width 0.5s;"></div>
                        </div>
                        <div style="font-size:8px;color:#f44336;margin-top:2px;text-align:right;">
                            ${oppMembers.length} a'zo · ${oppStars}/${maxWarStars} max
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Preparation phase
        if (war.state === 'preparation') {
            html += `
                <div style="background:rgba(33,150,243,0.08);border:1px solid rgba(33,150,243,0.25);
                            border-radius:12px;padding:14px;margin-bottom:10px;">
                    <div style="font-size:12px;color:#64b5f6;font-weight:700;margin-bottom:10px;text-align:center;">
                        🛡️ Urush bazangizni sozlang
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <button class="btn" style="background:rgba(33,150,243,0.15);border-color:#2196f360;color:#64b5f6;font-size:11px;"
                                onclick="AlliancePanel._saveWarBase()">
                            💾 Hozirgi bazani saqlash
                        </button>
                        <button class="btn" style="background:rgba(156,39,176,0.15);border-color:#9c27b060;color:#ce93d8;font-size:11px;"
                                onclick="AlliancePanel._enterWarBaseEditor()">
                            ✏️ Bazani tahrirlash
                        </button>
                    </div>
                </div>
            `;
        }

        // Battle phase — opponent cards
        if (war.state === 'battle') {
            html += `
                <div style="background:rgba(255,112,67,0.06);border:1px solid rgba(255,112,67,0.2);
                            border-radius:12px;padding:12px;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <div style="font-size:11px;font-weight:700;color:#ff7043;">⚔️ RAQIB A'ZOLARI</div>
                        <div style="background:${attacksLeft > 0 ? 'rgba(255,112,67,0.2)' : 'rgba(80,80,80,0.2)'};
                                    border-radius:12px;padding:2px 10px;font-size:10px;
                                    color:${attacksLeft > 0 ? '#ff8a65' : '#666'};">
                            ${attacksLeft} hujum qoldi
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;">`;

            for (const opp of oppMembers) {
                const bestAtk = (war.attacks || [])
                    .filter(a => a.defender_id === opp.user_id)
                    .sort((a, b) => b.stars - a.stars)[0];
                const bestStars = bestAtk?.stars ?? 0;
                const attacked  = (war.attacks || []).some(a => a.defender_id === opp.user_id && myAttacks.find(ma => ma.battle_id === a.battle_id));
                const starsHtml = Array.from({length:3}, (_, i) => `<span style="color:${i<bestStars?'#ffd700':'#333'};">★</span>`).join('');

                html += `
                    <div style="display:flex;align-items:center;gap:10px;
                                background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);
                                border-radius:10px;padding:8px 10px;">
                        <!-- Avatar -->
                        <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;
                                    background:linear-gradient(135deg,#b71c1c,#ef5350);
                                    display:flex;align-items:center;justify-content:center;
                                    font-size:14px;border:1px solid rgba(244,67,54,0.4);">
                            ${opp.display_name?.[0]?.toUpperCase() || '?'}
                        </div>

                        <div style="flex:1;min-width:0;">
                            <div style="font-size:12px;font-weight:700;color:#eee;
                                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${this._esc(opp.display_name)}
                            </div>
                            <div style="font-size:9px;color:#777;margin-top:1px;display:flex;gap:6px;align-items:center;">
                                <span>🏛️ TH${opp.th_level ?? '?'}</span>
                                <span>🏆${opp.trophies ?? 0}</span>
                                <span style="font-size:12px;">${starsHtml}</span>
                            </div>
                        </div>

                        ${attacksLeft > 0 && !attacked
                            ? `<button onclick="AlliancePanel._simulateWarAttack('${opp.user_id}','${this._esc(opp.display_name)}')"
                                       style="background:linear-gradient(135deg,#b71c1c,#f44336);
                                              border:none;border-radius:8px;padding:6px 12px;
                                              color:#fff;font-size:11px;font-weight:700;cursor:pointer;
                                              box-shadow:0 2px 8px rgba(244,67,54,0.4);white-space:nowrap;">
                                   ⚔️ Hujum
                               </button>`
                            : `<div style="font-size:9px;color:${attacked?'#4caf50':'#555'};
                                           text-align:center;padding:4px 6px;">
                                   ${attacked ? '✅ Hujum\nqilindi' : 'Hujum\nyoq'}
                               </div>`
                        }
                    </div>`;
            }
            html += `</div></div>`;
        }

        // Score chart (battle + ended)
        if ((war.state === 'battle' || war.state === 'ended') && myMembers.length > 0) {
            html += this._renderWarScoreChart(war, myMembers, oppMembers);
        }

        // Ended result
        if (war.state === 'ended') {
            const myUserId = this._myAlliance?.user_id;
            const canClaim = AllianceSystem.canClaimWarReward(war);
            const reward   = AllianceSystem.calculateWarReward(war, myUserId);
            const won  = myStars > oppStars;
            const tied = myStars === oppStars;
            const resultColor = won ? '#4caf50' : tied ? '#ff9800' : '#f44336';
            const resultIcon  = won ? '🏆' : tied ? '🤝' : '💀';
            const resultLabel = won ? "G'ALABA" : tied ? 'DURRANG' : 'YUTQIZISH';

            html += `
                <div style="background:radial-gradient(ellipse at center,${resultColor}18,rgba(0,0,0,0.4));
                            border:2px solid ${resultColor}60;border-radius:14px;
                            padding:18px;margin-top:10px;text-align:center;">
                    <div style="font-size:36px;margin-bottom:6px;">${resultIcon}</div>
                    <div style="font-family:'Cinzel',serif;font-size:18px;font-weight:900;
                                color:${resultColor};letter-spacing:2px;margin-bottom:10px;">
                        ${resultLabel}
                    </div>
                    ${reward ? `
                    <div style="display:flex;justify-content:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
                        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 12px;font-size:12px;color:#ffd700;">
                            🪙 ${Helpers.formatNumber(reward.gold)}
                        </div>
                        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 12px;font-size:12px;color:#a5d6a7;">
                            🍎 ${Helpers.formatNumber(reward.food)}
                        </div>
                        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 12px;font-size:12px;color:#90caf9;">
                            💎 ${reward.diamond}
                        </div>
                    </div>` : ''}
                    ${canClaim
                        ? `<button class="btn btn-primary" style="width:100%;padding:12px;font-size:13px;
                                    background:linear-gradient(135deg,${resultColor}cc,${resultColor});
                                    border-color:${resultColor};"
                                   onclick="AllianceSystem.claimWarReward(AlliancePanel._warData||{},AlliancePanel._myAlliance?.user_id);AlliancePanel.render();">
                               🎁 Mukofotni Olish
                           </button>`
                        : `<div style="color:#666;font-size:12px;">✅ Mukofot allaqachon olindi</div>`
                    }
                </div>
            `;
        }

        return html;
    },

    _renderWarScoreChart(war, myMembers, oppMembers) {
        const attacks = war.attacks || [];
        const MAX_ATK = 2;
        const MAX_PER = MAX_ATK * 3;

        const memberStats = myMembers.map(m => {
            const myAtks = attacks.filter(a => a.attacker_id === m.user_id);
            const stars  = myAtks.reduce((s, a) => s + (a.stars || 0), 0);
            return { name: m.display_name, attacks: myAtks.length, stars, maxAtk: MAX_ATK };
        }).sort((a, b) => b.stars - a.stars || b.attacks - a.attacks);

        if (!memberStats.length) return '';

        const rows = memberStats.map(ms => {
            const pct = MAX_PER > 0 ? Math.round(ms.stars / MAX_PER * 100) : 0;
            const barColor = ms.stars >= MAX_PER * 0.67 ? '#4caf50'
                           : ms.stars >= MAX_PER * 0.33 ? '#ff9800' : '#ef5350';
            const starsStr = Array.from({length: ms.stars}, () => '⭐').join('') || '—';
            const initials = ms.name?.[0]?.toUpperCase() || '?';

            return `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <!-- Avatar dot -->
                    <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
                                background:rgba(100,181,246,0.2);border:1px solid rgba(100,181,246,0.3);
                                display:flex;align-items:center;justify-content:center;
                                font-size:11px;font-weight:700;color:#90caf9;">${initials}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                            <span style="font-size:11px;color:#ccc;white-space:nowrap;overflow:hidden;
                                         text-overflow:ellipsis;max-width:120px;">${this._esc(ms.name)}</span>
                            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                <span style="font-size:9px;color:#ffd700;">${starsStr}</span>
                                <span style="font-size:9px;color:#555;">${ms.attacks}/${ms.maxAtk}⚔️</span>
                            </div>
                        </div>
                        <div style="height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
                            <div style="height:100%;width:${pct}%;background:${barColor};
                                        border-radius:3px;transition:width 0.5s;"></div>
                        </div>
                    </div>
                </div>`;
        }).join('');

        return `
            <div style="margin-top:10px;background:rgba(0,0,0,0.25);
                        border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px;">
                <div style="font-size:10px;font-weight:700;color:#64b5f6;
                            letter-spacing:1px;margin-bottom:10px;">📊 A'ZOLAR STATISTIKASI</div>
                ${rows}
            </div>`;
    },

    async _loadWar() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            this._warData = null;
            this.render();
            return;
        }
        this._warLoading = true;
        this.render();
        try {
            this._warData = await Api.getMyWar();
        } catch (err) {
            this._warData = err?.status === 404 ? null : null;
        }
        this._warLoading = false;
        if (this.visible && this._tab === 'war') this.render();
    },

    async _startWar() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) return;
        try {
            await Api.startWar();
            Toast.show('⚔️ Ittifoq urushi boshlandi! Tayyorlik bosqichi: 24 soat', 'success', 4000);
            this._warData = null;
            this._loadWar();
        } catch (err) {
            Toast.show('❌ ' + (err.data?.error || 'Xatolik'), 'warn');
        }
    },

    async _saveWarBase() {
        try {
            const buildings = Object.values(BuildingManager.buildings).map(b => ({
                id: b.id, type: b.type, x: b.x, y: b.y, level: b.level,
            }));
            const baseData = { buildings, saved_at: new Date().toISOString() };
            if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                await Api.saveWarBase(baseData);
            }
            localStorage.setItem('tc_war_base', JSON.stringify(baseData));
            Toast.show('🛡️ Urush bazasi saqlandi!', 'success');
        } catch (err) {
            Toast.show('❌ Saqlashda xato: ' + (err.data?.error || err.message || 'unknown'), 'warn');
        }
    },

    _enterWarBaseEditor() {
        const saved = localStorage.getItem('tc_war_base');
        if (!saved) {
            Toast.show('Avval joriy joylashuvni saqlang!', 'warn'); return;
        }
        let warBase;
        try { warBase = JSON.parse(saved); } catch { Toast.show('War base ma\'lumoti buzilgan', 'error'); return; }

        // Save regular village state
        WarBaseEditor._savedVillage = {
            buildings: JSON.stringify(BuildingManager.buildings),
            nextId:    BuildingManager.nextId,
            grid:      JSON.stringify(Grid.tiles),
        };
        WarBaseEditor.active = true;

        // Load war base buildings onto map
        Grid.init();
        BuildingManager.buildings = {};
        BuildingManager.nextId = 1;
        const bList = warBase.buildings || warBase;
        for (const b of bList) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const id = BuildingManager.nextId++;
            BuildingManager.buildings[id] = {
                id, type: b.type, x: b.x, y: b.y, level: b.level || 1,
                hp: bd.levels[b.level || 1]?.hp || 100,
                maxHp: bd.levels[b.level || 1]?.hp || 100,
                building: false, storedResource: 0,
            };
            Grid.occupy(b.x, b.y, bd.size[0], bd.size[1], id);
        }

        this.hide();
        WarBaseEditor._showBanner();
        Toast.show('🛡️ Urush bazasi muharririga kirdingiz. ESC yoki "Saqlash" tugmasini bosing.', 'info', 4000);
    },

    async _simulateWarAttack(defenderId, defenderName) {
        const _doWarAtk = async () => {
            Toast.show('🔍 Raqib bazasi yuklanmoqda...', 'info', 1500);
            let opponentData = null;
            try {
                if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                    const baseInfo = await Api.getWarMemberBase(defenderId);
                    opponentData = {
                        id:          defenderId,
                        opponent_id: defenderId,
                        name:        baseInfo.display_name || defenderName,
                        level:       baseInfo.th_level || 1,
                        trophies:    baseInfo.trophies || 0,
                        is_bot:      false,
                        isWarBattle: true,
                        warDefenderId: defenderId,
                        baseLayout:  baseInfo.war_base
                            ? JSON.stringify(baseInfo.war_base.buildings || baseInfo.war_base)
                            : null,
                    };
                }
            } catch {}
            if (!opponentData) {
                opponentData = {
                    id: defenderId, opponent_id: defenderId,
                    name: defenderName, level: 3,
                    is_bot: false, isWarBattle: true, warDefenderId: defenderId,
                    baseLayout: null,
                };
            }
            const armyTotal = Object.values(TroopManager.army || {}).reduce((s, v) => s + v, 0);
            if (armyTotal === 0) {
                Toast.show('❌ Askarlaringiz yo\'q! Avval askar tayyorlang.', 'error');
                return;
            }
            this.hide();
            BattleManager.startOnlineLiveBattle(opponentData);
        };

        const ov = document.createElement('div');
        ov.id = '_ap-war-atk-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);
            z-index:100010;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#120808,#1a1020);
                        border:2px solid rgba(244,67,54,0.5);border-radius:16px;
                        padding:22px 24px;width:min(290px,88vw);text-align:center;
                        box-shadow:0 0 40px rgba(244,67,54,0.2);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:42px;margin-bottom:8px;">⚔️</div>
                <div style="font-size:14px;font-weight:800;color:#ef5350;margin-bottom:6px;">Urush Hujumi</div>
                <div style="font-size:12px;color:#aaa;margin-bottom:4px;">
                    <strong style="color:#fff;">${defenderName}</strong> ga hujum boshlansinmi?
                </div>
                <div style="font-size:10px;color:#666;margin-bottom:18px;">Askarlaringiz ishlatiladi!</div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_ap-war-atk-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_ap-war-atk-confirm"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,#b71c1c,#f44336);
                                   border:none;border-radius:9px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;
                                   box-shadow:0 2px 12px rgba(244,67,54,0.4);">⚔️ Hujum!</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_ap-war-atk-confirm').onclick = () => { ov.remove(); _doWarAtk(); };
    },

    async _join(id) {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            Toast.show('Ittifoqqa qo\'shilish uchun kirish kerak!', 'warn');
            return;
        }
        try {
            await Api.joinAlliance(id);
            Toast.show('✅ Ittifoqqa qo\'shildingiz!', 'success');
            this._myAlliance = undefined;
            this.render();
            this._loadMyAlliance();
        } catch (err) {
            Toast.show('❌ ' + (err.data?.error || 'Xatolik yuz berdi'), 'warn');
        }
    },

    async _confirmLeave() {
        const _doLeave = async () => {
            if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
                AllianceSystem.leave();
                this._myAlliance = null;
                this._tab = 'browse';
                this.render();
                return;
            }
            try {
                await Api.leaveAlliance();
                AllianceSystem._serverData = null;
                Toast.show('Ittifoqdan chiqdingiz', 'info');
            } catch (err) {
                Toast.show('❌ ' + (err.data?.error || 'Xatolik'), 'warn');
            }
            this._myAlliance = null;
            this._tab = 'browse';
            this._searchResults = null;
            this.render();
        };

        const ov = document.createElement('div');
        ov.id = '_ap-leave-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100010;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a2340);
                        border:2px solid rgba(255,152,0,0.45);border-radius:16px;
                        padding:22px 24px;width:min(280px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(255,152,0,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:42px;margin-bottom:8px;">🚪</div>
                <div style="font-size:14px;font-weight:800;color:#ffa726;margin-bottom:8px;">Ittifoqdan Chiqish</div>
                <div style="font-size:12px;color:#aaa;margin-bottom:18px;line-height:1.5;">
                    Ittifoqdan chiqmoqchimisiz?<br>
                    <span style="font-size:10px;color:#666;">Progress va unvonlar saqlanmaydi</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_ap-leave-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_ap-leave-confirm"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(244,67,54,0.4),rgba(183,28,28,0.3));
                                   border:1px solid rgba(244,67,54,0.5);border-radius:9px;
                                   color:#ef9a9a;font-size:12px;font-weight:800;cursor:pointer;">🚪 Chiqish</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_ap-leave-confirm').onclick = () => { ov.remove(); _doLeave(); };
    },

    async _submitCreate() {
        const name     = document.getElementById('ac-name')?.value?.trim();
        const tag      = document.getElementById('ac-tag')?.value?.trim().toUpperCase();
        const desc     = document.getElementById('ac-desc')?.value?.trim() || '';
        const trophies = parseInt(document.getElementById('ac-trophies')?.value || '0', 10);

        if (!name || name.length < 3) { Toast.show('Nom kamida 3 ta harf bo\'lishi kerak', 'warn'); return; }
        if (!tag || tag.length < 2 || !/^[A-Z0-9]+$/.test(tag)) { Toast.show('Tag 2-8 ta A-Z yoki raqam bo\'lishi kerak', 'warn'); return; }

        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            Toast.show('Ittifoq yaratish uchun kirish kerak!', 'warn');
            return;
        }

        this._creating = true;
        this.render();

        try {
            await Api.createAlliance({ name, tag, description: desc, min_trophies: trophies, is_open: true });
            Toast.show(`✅ "${name}" ittifoqi yaratildi!`, 'success');
            this._myAlliance = undefined;
            this._tab = 'browse';
            this.render();
            this._loadMyAlliance();
        } catch (err) {
            Toast.show('❌ ' + (err.data?.error || 'Xatolik yuz berdi'), 'warn');
            this._creating = false;
            this.render();
        }
        this._creating = false;
    },

    _renderDonationsTab() {
        return `
            <div>
                <button class="btn" style="width:100%;margin-bottom:8px;background:rgba(255,255,255,0.08);"
                        onclick="AlliancePanel._setTab('browse')">← Orqaga</button>
                <button class="btn" style="width:100%;margin-bottom:12px;background:rgba(156,39,176,0.25);border-color:#9c27b0;color:#ce93d8;"
                        onclick="AlliancePanel._requestTroopsPrompt()">
                    📣 Askar So'rash
                </button>
                <div id="alliance-donations-list" style="display:flex;flex-direction:column;gap:6px;">
                    <div style="text-align:center;color:#aaa;font-size:12px;">⏳ Yuklanmoqda...</div>
                </div>
            </div>
        `;
    },

    async _loadDonations() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) return;
        try {
            const requests = await Api.getTroopRequests();
            const container = document.getElementById('alliance-donations-list');
            if (!container) return;

            const myUserId = Api.getUserId?.() || null;

            if (!requests.length) {
                container.innerHTML = `<div style="text-align:center;color:#666;font-size:12px;padding:20px;">Hali askar so'rovlari yo'q</div>`;
                return;
            }

            const TROOP_ICON = typeof TROOP_DATA !== 'undefined'
                ? (type) => TROOP_DATA[type]?.icon || '⚔️'
                : () => '⚔️';

            container.innerHTML = requests.map(r => {
                const isMine   = r.user_id === myUserId;
                const filled   = r.filled || 0;
                const pct      = Math.round((filled / r.amount) * 100);
                const timeLeft = Math.max(0, new Date(r.expires_at) - Date.now());
                const timeStr  = timeLeft > 0 ? Helpers.formatTime(Math.floor(timeLeft / 1000)) : 'Muddati o\'tgan';

                return `<div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <span style="font-size:20px;">${TROOP_ICON(r.troop_type)}</span>
                        <div style="flex:1;">
                            <div style="font-size:12px;color:#fff;font-weight:bold;">${this._esc(r.display_name)}</div>
                            <div style="font-size:10px;color:#888;">${r.troop_type} · ⏱️${timeStr}</div>
                        </div>
                        <div style="font-size:11px;color:#aaa;">${filled}/${r.amount}</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.3);border-radius:4px;height:4px;margin-bottom:8px;">
                        <div style="background:#9c27b0;border-radius:4px;height:100%;width:${pct}%;"></div>
                    </div>
                    ${r.message ? `<div style="font-size:10px;color:#aaa;font-style:italic;margin-bottom:6px;">"${this._esc(r.message)}"</div>` : ''}
                    ${!isMine && filled < r.amount
                        ? `<button class="btn" style="width:100%;font-size:11px;background:rgba(156,39,176,0.2);border-color:#9c27b0;color:#ce93d8;"
                             onclick="AlliancePanel._donateToRequest('${r.id}','${this._esc(r.troop_type)}','${this._esc(r.display_name)}')">
                             🎁 Askar Yuborish
                           </button>`
                        : `<div style="font-size:10px;color:#555;text-align:center;">${isMine ? 'Siz so\'radingiz' : 'To\'ldirilgan'}</div>`
                    }
                </div>`;
            }).join('');
        } catch {
            const c = document.getElementById('alliance-donations-list');
            if (c) c.innerHTML = '<div style="color:#888;text-align:center;font-size:12px;">Xatolik yuz berdi</div>';
        }
    },

    _requestTroopsPrompt() {
        document.getElementById('_ap-req-modal')?.remove();
        // Build troop options from TROOP_DATA
        const troopOpts = typeof TROOP_DATA !== 'undefined'
            ? Object.entries(TROOP_DATA).map(([id, d]) =>
                `<option value="${id}">${d.icon} ${d.name}</option>`).join('')
            : '<option value="soldier">⚔️ Legioner</option>';

        const ov = document.createElement('div');
        ov.id = '_ap-req-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100010;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a2340);
                        border:2px solid rgba(100,181,246,0.4);border-radius:16px;
                        padding:20px 22px;width:min(300px,90vw);
                        box-shadow:0 0 40px rgba(100,181,246,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:14px;font-weight:800;color:#64b5f6;margin-bottom:14px;text-align:center;">
                    📣 Askar So'rash
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Askar turi</label>
                    <select id="_ap-troop-select" style="width:100%;padding:8px;background:rgba(255,255,255,0.07);
                            border:1px solid rgba(100,181,246,0.3);border-radius:8px;color:#fff;font-size:12px;outline:none;">
                        ${troopOpts}
                    </select>
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Miqdor (1–20)</label>
                    <input id="_ap-troop-amount" type="number" min="1" max="20" value="5"
                           style="width:100%;box-sizing:border-box;padding:8px;background:rgba(255,255,255,0.07);
                                  border:1px solid rgba(100,181,246,0.3);border-radius:8px;color:#fff;font-size:12px;outline:none;">
                </div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Xabar (ixtiyoriy)</label>
                    <input id="_ap-troop-msg" type="text" maxlength="80" placeholder="..."
                           style="width:100%;box-sizing:border-box;padding:8px;background:rgba(255,255,255,0.07);
                                  border:1px solid rgba(100,181,246,0.3);border-radius:8px;color:#fff;font-size:12px;outline:none;">
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_ap-req-modal').remove()"
                            style="flex:1;padding:9px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button onclick="AlliancePanel._submitTroopRequest()"
                            style="flex:1;padding:9px;background:linear-gradient(135deg,#1e88e5,#1565c0);
                                   border:none;border-radius:9px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">Yuborish</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
    },

    async _submitTroopRequest() {
        const troopType = document.getElementById('_ap-troop-select')?.value;
        const amount    = parseInt(document.getElementById('_ap-troop-amount')?.value || '1');
        const msg       = document.getElementById('_ap-troop-msg')?.value || '';
        document.getElementById('_ap-req-modal')?.remove();
        if (!troopType || isNaN(amount) || amount < 1 || amount > 20) { Toast.show('Noto\'g\'ri miqdor', 'warn'); return; }
        try {
            await Api.requestTroops(troopType, amount, msg);
            Toast.show('📣 Askar so\'rovi yuborildi!', 'success');
            this._loadDonations();
        } catch (e) {
            Toast.show('❌ ' + (e.data?.error || 'Xatolik'), 'warn');
        }
    },

    _donateToRequest(requestId, troopType, requesterName) {
        document.getElementById('_ap-donate-modal')?.remove();
        const td = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[troopType] : null;
        const icon = td?.icon || '⚔️';
        const name = td?.name || troopType;

        const ov = document.createElement('div');
        ov.id = '_ap-donate-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100010;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a2340);
                        border:2px solid rgba(76,175,80,0.4);border-radius:16px;
                        padding:20px 22px;width:min(280px,90vw);text-align:center;
                        box-shadow:0 0 40px rgba(76,175,80,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:32px;margin-bottom:6px;">${icon}</div>
                <div style="font-size:13px;font-weight:800;color:#81c784;margin-bottom:4px;">${name} Yuborish</div>
                <div style="font-size:11px;color:#888;margin-bottom:12px;">→ <strong style="color:#fff;">${requesterName}</strong></div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Miqdor (1–10)</label>
                    <input id="_ap-donate-amount" type="number" min="1" max="10" value="1"
                           style="width:100%;box-sizing:border-box;padding:8px;text-align:center;
                                  background:rgba(255,255,255,0.07);border:1px solid rgba(76,175,80,0.3);
                                  border-radius:8px;color:#fff;font-size:16px;font-weight:700;outline:none;">
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_ap-donate-modal').remove()"
                            style="flex:1;padding:9px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button onclick="AlliancePanel._submitDonate('${requestId}')"
                            style="flex:1;padding:9px;background:linear-gradient(135deg,#4caf50,#388e3c);
                                   border:none;border-radius:9px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">🎁 Yuborish</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
    },

    async _submitDonate(requestId) {
        const amount = parseInt(document.getElementById('_ap-donate-amount')?.value || '1');
        document.getElementById('_ap-donate-modal')?.remove();
        if (isNaN(amount) || amount < 1 || amount > 10) return;
        try {
            const res = await Api.donateTroops(requestId, amount);
            Toast.show(`🎁 ${res.donated} ta askar yuborildi!`, 'success');
            if (typeof AchievementSystem !== 'undefined') {
                AchievementSystem.track('troopsDonated', res.donated || amount);
            }
            this._loadDonations();
        } catch (e) {
            Toast.show('❌ ' + (e.data?.error || 'Xatolik'), 'warn');
        }
    },

    async _setRole(userId, role) {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) return;
        try {
            await Api.setMemberRole(userId, role);
            const label = role === 'co-leader' ? '⭐ Yordamchi' : '👤 A\'zo';
            Toast.show(`${label} qilib o'zgartirildi`, 'success');
            this._loadMembers();
        } catch (e) {
            Toast.show('❌ ' + (e.data?.error || 'Xatolik'), 'warn');
        }
    },

    async _kickMember(userId, name) {
        const _doKick = async () => {
            if (typeof Api === 'undefined' || !Api.isLoggedIn()) return;
            try {
                await Api.kickMember(userId);
                Toast.show(`🚫 ${name} haydaldi`, 'success');
                this._loadMembers();
            } catch (e) {
                Toast.show('❌ ' + (e.data?.error || 'Xatolik'), 'warn');
            }
        };

        const ov = document.createElement('div');
        ov.id = '_ap-kick-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100010;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a1520);
                        border:2px solid rgba(244,67,54,0.45);border-radius:16px;
                        padding:22px 24px;width:min(280px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(244,67,54,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:42px;margin-bottom:8px;">🚫</div>
                <div style="font-size:14px;font-weight:800;color:#ef5350;margin-bottom:8px;">A'zoni Haydash</div>
                <div style="font-size:12px;color:#aaa;margin-bottom:18px;line-height:1.5;">
                    <strong style="color:#fff;">${name}</strong><br>
                    <span style="font-size:11px;">ni ittifoqdan haydaysizmi?</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_ap-kick-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_ap-kick-confirm"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(244,67,54,0.45),rgba(183,28,28,0.35));
                                   border:1px solid rgba(244,67,54,0.55);border-radius:9px;
                                   color:#ef9a9a;font-size:12px;font-weight:800;cursor:pointer;">🚫 Haydash</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_ap-kick-confirm').onclick = () => { ov.remove(); _doKick(); };
    },

    async _transferLeader(userId, name) {
        const _doTransfer = async () => {
            if (typeof Api === 'undefined' || !Api.isLoggedIn()) return;
            try {
                await Api.transferLeader(userId);
                Toast.show(`👑 Rahbarlik ${name} ga o'tkazildi`, 'success');
                await this._loadMyAlliance();
                this._setTab('members');
            } catch (e) {
                Toast.show('❌ ' + (e.data?.error || 'Xatolik'), 'warn');
            }
        };

        const ov = document.createElement('div');
        ov.id = '_ap-transfer-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100010;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a1a10);
                        border:2px solid rgba(212,175,55,0.5);border-radius:16px;
                        padding:22px 24px;width:min(290px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(212,175,55,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:42px;margin-bottom:8px;">👑</div>
                <div style="font-size:14px;font-weight:800;color:#ffd700;margin-bottom:8px;">Rahbarlikni Topshirish</div>
                <div style="font-size:12px;color:#aaa;margin-bottom:6px;line-height:1.5;">
                    <strong style="color:#fff;">${name}</strong> ga rahbarlikni topshirasizmi?
                </div>
                <div style="font-size:10px;color:#666;margin-bottom:18px;">Siz Co-Leader bo'lasiz</div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_ap-transfer-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_ap-transfer-confirm"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(212,175,55,0.4),rgba(180,130,20,0.25));
                                   border:1px solid rgba(212,175,55,0.6);border-radius:9px;
                                   color:#ffd700;font-size:12px;font-weight:800;cursor:pointer;">👑 Topshirish</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_ap-transfer-confirm').onclick = () => { ov.remove(); _doTransfer(); };
    },

    // ── Ittifoq Chati ─────────────────────────────────────────────────────────
    _chatLastTs: null,
    _chatPollTimer: null,

    async _loadChat() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) return;
        try {
            const msgs = await Api.getAllianceChat(this._chatLastTs);
            if (!msgs || !msgs.length) return;
            this._chatLastTs = msgs[msgs.length - 1].created_at;
            this._appendChatMessages(msgs);
        } catch {}
    },

    _appendChatMessages(msgs) {
        const container = document.getElementById('alliance-chat-msgs');
        if (!container) return;

        const myId = Api.getUserId?.() || null;
        const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 20;

        // Clear "Yuklanmoqda..." placeholder on first load
        if (!this._chatLastTs && msgs.length) {
            container.innerHTML = '';
        }

        for (const m of msgs) {
            const isMe = m.user_id === myId;
            const time = new Date(m.created_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
            const div = document.createElement('div');
            div.style.cssText = `display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};`;
            div.innerHTML = `
                <div style="font-size:9px;color:#666;margin-bottom:1px;">${isMe ? '' : this._esc(m.display_name) + ' · '}${time}</div>
                <div style="max-width:85%;padding:4px 8px;border-radius:8px;font-size:11px;word-break:break-word;
                            background:${isMe ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.08)'};
                            color:${isMe ? '#ffd700' : '#ddd'};">
                    ${this._esc(m.message)}
                </div>`;
            container.appendChild(div);
        }

        if (atBottom) container.scrollTop = container.scrollHeight;
    },

    async _sendChat() {
        const input = document.getElementById('alliance-chat-input');
        const msg = input?.value?.trim();
        if (!msg || !msg.length) return;
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            Toast.show('Chat uchun kirish kerak!', 'warn'); return;
        }
        input.value = '';
        try {
            const sent = await Api.sendAllianceMessage(msg);
            this._chatLastTs = sent.created_at;
            this._appendChatMessages([sent]);
        } catch (e) {
            Toast.show('❌ Xabar yuborilmadi: ' + (e.data?.error || e.message), 'warn');
        }
    },

    _startChatPoll() {
        this._stopChatPoll();
        this._loadChat();
        this._chatPollTimer = setInterval(() => {
            if (this.visible && this._tab === 'browse') this._loadChat();
        }, 8000);
    },

    _stopChatPoll() {
        if (this._chatPollTimer) { clearInterval(this._chatPollTimer); this._chatPollTimer = null; }
    },

    _esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    // Legacy — used by AllianceSystem
    join(id) {
        this._join(id);
    },

    leave() {
        this._confirmLeave();
    },

    requestTroops() {
        AllianceSystem.requestTroops();
    },
};
