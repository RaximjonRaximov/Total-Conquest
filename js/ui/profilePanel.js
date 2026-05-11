// ============================================
// PROFILE PANEL - O'yinchi profili
// ============================================

const ProfilePanel = {
    visible: false,

    _avatarList: ['👑','⚔️','🛡️','🏹','🐉','🦁','🐺','🦅','🔱','🌟','💀','🗡️','🔥','⚡','🌊','🏛️','🎯','🐗','🦊','🦂'],
    _editingName: false,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('profile-panel');
        const overlay = document.getElementById('modal-overlay');
        
        if (!el) {
            this._createPanel();
            return this.toggle();
        }

        if (this.visible) {
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
            AudioManager.playClick();
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
        }
    },

    hide() {
        this.visible = false;
        this._serverProfile = null;
        const el = document.getElementById('profile-panel');
        if (el) el.classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'profile-panel';
        panel.className = 'panel-container';
        document.body.appendChild(panel);
    },

    _serverProfile: null,

    render() {
        const panel = document.getElementById('profile-panel');
        if (!panel) return;

        const name     = document.getElementById('profile-name-display')?.textContent || 'Mehmon';
        const alliance = AllianceSystem.getCurrentData();

        // Local fallback stats
        const localWin  = BattleSystem.battleLog.filter(l => l.victory).length;
        const localLoss = BattleSystem.battleLog.filter(l => !l.victory).length;

        // Server stats (if available)
        const sp     = this._serverProfile;
        const wins   = sp?.attack_won   ?? localWin;
        const losses = sp?.attack_lost  ?? localLoss;
        const defLost = sp?.defence_lost ?? '—';
        const thLv   = sp?.th_level     ?? Game.townHallLevel;
        const isGuest = typeof Api !== 'undefined' && Api.isGuest?.();

        const winRate = wins + losses > 0 ? Math.round(wins / (wins + losses) * 100) : 0;

        let html = `
            <div class="panel-header">
                <div class="panel-title">👤 IMPERATOR PROFILI</div>
                <div class="panel-close" onclick="ProfilePanel.hide()">✖</div>
            </div>
            <div class="panel-content">
                <div style="background:linear-gradient(145deg,rgba(212,175,55,0.2),rgba(0,0,0,0.5));border:1px solid rgba(212,175,55,0.4);padding:20px;border-radius:12px;margin-bottom:15px;text-align:center;">
                    <div style="font-size:52px;margin-bottom:6px;cursor:pointer;" title="Avatar o'zgartirish"
                         onclick="ProfilePanel._showAvatarPicker()">
                        ${this._avatarList[sp?.avatar_id ?? 0] ?? '👑'}
                    </div>
                    <div style="font-size:9px;color:#666;margin-bottom:6px;">▼ Avatarni o'zgartirish</div>
                    <div style="font-size:20px;font-weight:bold;color:#fff;font-family:'Cinzel',serif;">${name}</div>
                    <div style="font-size:10px;color:#555;margin-top:3px;cursor:pointer;"
                         onclick="ProfilePanel._editName()">${isGuest ? '' : '✏️ Ism o\'zgartirish'}</div>
                    <div style="color:#d4af37;font-size:13px;font-weight:bold;margin:4px 0;">${XPSystem.getRankName()}</div>
                    <div style="color:#888;font-size:11px;">🏚️ Town Hall ${thLv} ${isGuest ? '· Mehmon' : ''}</div>
                    ${(() => { const lg = BattleSystem.getLeague(); return `<div style="font-size:13px;font-weight:bold;color:${lg.color};margin-top:4px;">${lg.icon} ${lg.name}</div>`; })()}
                </div>

                <!-- Key stats row -->
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">
                    ${[
                        { icon: '🏆', val: BattleSystem.trophies.toLocaleString(), label: 'Kubok', color: '#ffd700' },
                        { icon: '⭐', val: `Lvl ${XPSystem.level}`, label: 'Daraja', color: '#ce93d8' },
                        { icon: '📊', val: `${winRate}%`, label: 'Win Rate', color: winRate>=50?'#4caf50':'#f44336' },
                        { icon: '🏅', val: `${SeasonPass?.currentTier ?? 0}/${30}`, label: 'Season', color: '#ce93d8' },
                    ].map(s => `
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
                                    padding:8px 4px;border-radius:8px;text-align:center;">
                            <div style="font-size:14px;">${s.icon}</div>
                            <div style="font-size:13px;font-weight:800;color:${s.color};margin-top:2px;">${s.val}</div>
                            <div style="font-size:8px;color:#555;margin-top:1px;">${s.label}</div>
                        </div>`).join('')}
                </div>

                <!-- Win/Loss visual bars -->
                <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);
                            border-radius:10px;padding:12px;margin-bottom:10px;">
                    <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.5px;margin-bottom:8px;">
                        ⚔️ JANG STATISTIKASI
                    </div>
                    <!-- Win/Loss bar -->
                    <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-bottom:6px;">
                        <div style="flex:${wins};background:linear-gradient(90deg,#388e3c,#4caf50);min-width:${wins>0?'4px':'0'};"></div>
                        <div style="flex:${losses};background:linear-gradient(90deg,#c62828,#f44336);min-width:${losses>0?'4px':'0'};"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:9px;color:#666;margin-bottom:8px;">
                        <span style="color:#4caf50;">✅ ${wins} g'alaba</span>
                        <span style="color:#f44336;">❌ ${losses} mag'lubiyat</span>
                    </div>

                    ${[
                        ['Mudofaa mag\'lubiyatlari', defLost, '#ff9800'],
                        ['Hujum seriyasi',    BattleSystem.winStreak > 0 ? `🔥 ${BattleSystem.winStreak}` : '—', '#ff7043'],
                        ['Global Reyting',   sp?._globalRank ? `#${sp._globalRank}` : '—', '#ffd700'],
                        ['Ittifoq',          alliance ? `🛡️ ${alliance.name}` : "Yo'q", '#64b5f6'],
                    ].map(([label, val, color]) => `
                        <div style="display:flex;justify-content:space-between;align-items:center;
                                    margin-bottom:5px;font-size:11px;">
                            <span style="color:#777;">${label}</span>
                            <span style="color:${color};font-weight:700;">${val}</span>
                        </div>`).join('')}
                </div>

                <!-- Hero stats chip -->
                ${typeof HeroSystem !== 'undefined' ? (() => {
                    const _activeHeroes = HeroSystem.getActiveHeroes();
                    const _heroKey = _activeHeroes.length > 0 ? _activeHeroes[0] : 'legatus';
                    const hero = HeroSystem.commanders[_heroKey];
                    const stats = HeroSystem.getCommanderStats(_heroKey);
                    const prog  = HeroSystem.getXPProgress(_heroKey);
                    const regenSec = HeroSystem.getRegenRemaining(_heroKey);
                    const _heroData = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[_heroKey] : null;
                    const _heroIcon = _heroData?.icon || '🦁';
                    const _heroName = _heroData?.name || 'Qahramon';
                    return `
                    <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);
                                border-radius:10px;padding:10px;margin-bottom:10px;
                                display:flex;align-items:center;gap:10px;">
                        <div style="font-size:24px;flex-shrink:0;">${_heroIcon}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <span style="font-size:12px;font-weight:700;color:#ffd700;">${_heroName}</span>
                                <span style="font-size:10px;color:#888;">Lvl ${hero?.level || 1}</span>
                            </div>
                            <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-bottom:3px;">
                                <div style="height:100%;width:${Math.round(prog*100)}%;
                                            background:linear-gradient(90deg,#d4af37,#ffd700);border-radius:2px;"></div>
                            </div>
                            <div style="font-size:9px;color:#666;display:flex;gap:8px;">
                                <span>❤️ ${Helpers.formatNumber(stats?.hp || 0)}</span>
                                <span>⚔️ ${Helpers.formatNumber(stats?.damage || 0)}</span>
                                ${regenSec > 0 ? `<span style="color:#ff9800;">⏳ ${Math.ceil(regenSec/60)}d tiklanish</span>` : '<span style="color:#4caf50;">✅ Tayyor</span>'}
                            </div>
                        </div>
                    </div>`;
                })() : ''}

                <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <button onclick="ProfilePanel.hide();BattleLogPanel.show()"
                            class="btn" style="flex:1;font-size:11px;background:rgba(255,255,255,0.08);">
                        📜 Jang Tarixi
                    </button>
                    <button onclick="ProfilePanel.hide();DailyRewardPanel.show()"
                            class="btn" style="flex:1;font-size:11px;background:rgba(212,175,55,0.15);border-color:rgba(212,175,55,0.4);color:#ffd700;">
                        🎁 Kunlik Mukofot
                    </button>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <button onclick="ProfilePanel.hide();AchievementsPanel.show()"
                            class="btn" style="flex:1;font-size:12px;background:rgba(255,215,0,0.08);border-color:rgba(255,215,0,0.3);color:#ffd700;">
                        🏅 Yutuqlar (${AchievementSystem?.getUnlocked?.() ?? 0}/${AchievementSystem?.getTotal?.() ?? 0})
                    </button>
                    <button onclick="ProfilePanel.hide();LeaderboardPanel.show()"
                            class="btn" style="flex:1;font-size:12px;background:rgba(33,150,243,0.12);border-color:rgba(33,150,243,0.4);color:#64b5f6;">
                        🏆 Reyting
                    </button>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <button onclick="ProfilePanel.hide();LayoutShare.showExport()"
                            class="btn" style="flex:1;font-size:11px;background:rgba(0,188,212,0.1);border-color:rgba(0,188,212,0.3);color:#80deea;">
                        📤 Bazani Ulash
                    </button>
                    <button onclick="ProfilePanel.hide();LayoutShare.showImport()"
                            class="btn" style="flex:1;font-size:11px;background:rgba(0,188,212,0.1);border-color:rgba(0,188,212,0.3);color:#80deea;">
                        📥 Import
                    </button>
                </div>
                <button onclick="ProfilePanel._logout()" class="btn btn-danger" style="width:100%;">🚪 Boshqa Profilga Kirish</button>
            </div>
        `;
        panel.innerHTML = html;

        // Server profileni yuklash (async, keyin re-render)
        if (this._serverProfile === null && typeof Api !== 'undefined' && Api.isLoggedIn()) {
            this._serverProfile = undefined;
            Promise.all([Api.getMe(), Api.getMyRank().catch(() => null)]).then(([p, rankData]) => {
                this._serverProfile = p;
                if (rankData?.rank) this._serverProfile._globalRank = rankData.rank;
                if (this.visible) this.render();
            }).catch(() => { this._serverProfile = null; });
        }
    },

    _showAvatarPicker() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn() || Api.isGuest?.()) {
            Toast.show('Avatar o\'zgartirish uchun Google bilan kiring!', 'warn'); return;
        }
        const existing = document.getElementById('avatar-picker-modal');
        if (existing) { existing.remove(); return; }

        const modal = document.createElement('div');
        modal.id = 'avatar-picker-modal';
        modal.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            z-index:12000;background:#1a1a2e;border:1px solid rgba(212,175,55,0.4);
            border-radius:12px;padding:16px;max-width:280px;width:90%;`;
        modal.innerHTML = `
            <div style="color:#d4af37;font-weight:bold;font-size:14px;margin-bottom:12px;text-align:center;">
                Avatar Tanlang
            </div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px;">
                ${this._avatarList.map((a, i) => `
                    <div onclick="ProfilePanel._selectAvatar(${i})"
                         style="font-size:24px;text-align:center;padding:6px;border-radius:8px;cursor:pointer;
                                background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                                transition:background 0.15s;" onmouseover="this.style.background='rgba(212,175,55,0.2)'"
                         onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                        ${a}
                    </div>`).join('')}
            </div>
            <button onclick="document.getElementById('avatar-picker-modal').remove()"
                    style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                           color:#aaa;border-radius:6px;cursor:pointer;">Bekor qilish</button>
        `;
        document.body.appendChild(modal);
    },

    async _selectAvatar(idx) {
        document.getElementById('avatar-picker-modal')?.remove();
        if (typeof Api === 'undefined') return;
        try {
            await Api.updateProfile({ avatar_id: idx });
            if (this._serverProfile) this._serverProfile.avatar_id = idx;
            Toast.show('✅ Avatar yangilandi!', 'success');
            if (this.visible) this.render();
        } catch (e) {
            Toast.show('❌ ' + (e.data?.error || 'Xatolik'), 'warn');
        }
    },

    _editName() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn() || Api.isGuest?.()) {
            Toast.show('Ism o\'zgartirish uchun Google bilan kiring!', 'warn'); return;
        }
        const current = document.getElementById('profile-name-display')?.textContent || '';
        document.getElementById('profile-name-modal')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'profile-name-modal';
        overlay.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100002;display:flex;align-items:center;justify-content:center;
        `;
        overlay.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a2340);
                        border:2px solid rgba(212,175,55,0.5);border-radius:16px;
                        padding:20px 22px;width:min(300px,90vw);
                        box-shadow:0 0 40px rgba(212,175,55,0.2);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:14px;font-weight:800;color:#ffd700;margin-bottom:12px;text-align:center;">
                    ✏️ Ism o'zgartirish
                </div>
                <input id="profile-name-input" type="text" maxlength="32"
                       value="${current.replace(/"/g,'&quot;')}"
                       placeholder="Yangi ism..."
                       style="width:100%;box-sizing:border-box;padding:9px 12px;
                              background:rgba(255,255,255,0.07);
                              border:1px solid rgba(212,175,55,0.4);border-radius:9px;
                              color:#fff;font-size:14px;outline:none;margin-bottom:6px;"
                       oninput="const v=this.value.trim();
                                document.getElementById('profile-name-len').textContent=v.length+'/32';
                                document.getElementById('profile-name-save').disabled=v.length<2;">
                <div style="font-size:9px;color:#666;margin-bottom:12px;text-align:right;" id="profile-name-len">${current.length}/32</div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('profile-name-modal').remove()"
                            style="flex:1;padding:9px;background:rgba(255,255,255,0.07);
                                   border:1px solid rgba(255,255,255,0.15);border-radius:9px;
                                   color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="profile-name-save" onclick="ProfilePanel._saveName()"
                            style="flex:1;padding:9px;
                                   background:linear-gradient(135deg,#d4af37,#b8860b);
                                   border:none;border-radius:9px;
                                   color:#000;font-size:12px;font-weight:700;cursor:pointer;">Saqlash</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        const inp = document.getElementById('profile-name-input');
        inp.focus(); inp.select();
        inp.onkeydown = e => { if (e.key === 'Enter') ProfilePanel._saveName(); };
    },

    async _saveName() {
        const inp = document.getElementById('profile-name-input');
        if (!inp) return;
        const newName = inp.value.trim();
        if (newName.length < 2) return;
        document.getElementById('profile-name-modal')?.remove();
        try {
            await Api.updateProfile({ display_name: newName });
            const nameEl = document.getElementById('profile-name-display');
            if (nameEl) nameEl.textContent = newName;
            if (this._serverProfile) this._serverProfile.display_name = newName;
            Toast.show('✅ Ism yangilandi!', 'success');
            if (this.visible) this.render();
        } catch (e) {
            Toast.show('❌ ' + (e.data?.error || 'Xatolik'), 'warn');
        }
    },

    async _logout() {
        if (typeof Api !== 'undefined') await Api.logout().catch(() => {});
        else if (typeof DatabaseSystem !== 'undefined') DatabaseSystem.logout();
        location.reload();
    },
};
