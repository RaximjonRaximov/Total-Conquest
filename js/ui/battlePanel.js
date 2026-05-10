// ============================================
// JANG PANELI (Battle Panel UI)
// Dushman bazalarini ko'rish va hujum qilish
// ============================================

const BattlePanel = {
    visible: false,
    activeTab: 'offline', // 'offline' yoki 'online'
    multiplayerMatch: null,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('battle-panel');
        const overlay = document.getElementById('modal-overlay');
        if (this.visible) {
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
            LoginSystem.clearAttackBadge?.();
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
            this.battleResult = null;
        }
    },

    open() {
        if (this.visible) return;
        this.visible = true;
        this.activeTab = 'online'; // Keyingi jangda to'g'ridan online tabni ochish
        this.multiplayerMatch = null;
        const el = document.getElementById('battle-panel');
        const overlay = document.getElementById('modal-overlay');
        if (el && overlay) {
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
        }
    },

    hide() {
        this.visible = false;
        this.battleResult = null;
        this._serverLogs = null; // next open will re-fetch
        document.getElementById('battle-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    setTab(tab) {
        this.activeTab = tab;
        this.multiplayerMatch = null;
        AudioManager.playClick();
        this.render();
    },

    _searching: false,
    _searchAbort: null,

    cancelSearch() {
        if (!this._searching) return;
        if (this._searchAbort) { this._searchAbort.abort(); this._searchAbort = null; }
        this._searching = false;
        Resources.add('gold', 50); // Qaytarib berish
        Toast.show('Qidiruv bekor qilindi. Oltin qaytarildi.', 'info');
        this.render();
    },

    async findMatch() {
        if (this._searching) return;
        AudioManager.playCoin();
        const cost = 50;
        if (Resources.gold < cost) {
            Toast.show("Qidirish uchun Oltin yetarli emas (50 kerak)!", "error");
            return;
        }
        Resources.spend('gold', cost);

        this._searching = true;
        this._searchAbort = new AbortController();
        this.multiplayerMatch = null;
        this._renderSearching();

        if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
            try {
                const opponent = await Api.findOpponent(this._searchAbort.signal);
                if (!this._searching) return; // cancelled
                this.multiplayerMatch = {
                    id:       opponent.opponent_id,
                    is_bot:   opponent.is_bot,
                    name:     opponent.display_name,
                    trophies: opponent.trophies,
                    village:  opponent.village,
                };
            } catch (e) {
                if (e.name === 'AbortError') return; // user cancelled
                Toast.show('Xato: ' + e.message, 'warn');
                Resources.add('gold', cost);
            }
        } else {
            // Offline — fake bot opponent
            await new Promise(r => setTimeout(r, 1200));
            if (!this._searching) return;
            this.multiplayerMatch = {
                id: 'bot_offline', is_bot: true,
                name: 'Offline Bot', trophies: BattleSystem.trophies,
                village: { resource_hint: { gold: 1000, food: 800 }, map_data: { buildings: [] } },
            };
        }

        this._searching = false;
        this._searchAbort = null;
        this.render();
    },

    _renderSearching() {
        // Simply re-render the full panel — render() will check _searching flag
        this.render();
    },

    render() {
        const panel = document.getElementById('battle-panel');
        if (!panel) return;

        // Jang natijasi ko'rsatish
        if (this.battleResult) {
            panel.innerHTML = this._renderResult();
            return;
        }

        const army = BattleSystem.getArmyPower();
        const total = TroopManager.getTotal();
        const canBattle = BattleSystem.canBattle();
        const cooldown = BattleSystem.getCooldownRemaining();

        let html = `
            <div class="panel-header" style="padding-bottom:5px;">
                <div class="panel-title">⚔️ JANG MAYDONI</div>
                <div class="panel-close" onclick="BattlePanel.hide()">✖</div>
            </div>
            
            <div style="display:flex; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1);">
                <div style="flex:1; text-align:center; padding:10px; cursor:pointer; font-weight:bold; transition:all 0.2s; ${this.activeTab === 'offline' ? 'color:#ffd700; border-bottom:2px solid #ffd700;' : 'color:#888;'}" onclick="BattlePanel.setTab('offline')">
                    🗺️ Hikoya
                </div>
                <div style="flex:1; text-align:center; padding:10px; cursor:pointer; font-weight:bold; transition:all 0.2s; ${this.activeTab === 'online' ? 'color:#ffd700; border-bottom:2px solid #ffd700;' : 'color:#888;'}" onclick="BattlePanel.setTab('online')">
                    🌍 Multiplayer
                </div>
                <div style="flex:1; text-align:center; padding:10px; cursor:pointer; font-weight:bold; transition:all 0.2s; ${this.activeTab === 'history' ? 'color:#ffd700; border-bottom:2px solid #ffd700;' : 'color:#888;'}" onclick="BattlePanel.setTab('history')">
                    📜 Tarix
                </div>
            </div>
        `;

        if (!canBattle) {
            html += `<div class="battle-cooldown">⏳ Keyingi jang: ${Math.ceil(cooldown)}s</div>`;
        }

        if (this.activeTab === 'offline') {
            html += this._renderOffline(canBattle, total);
        } else if (this.activeTab === 'online') {
            html += this._renderOnline(canBattle, total);
        } else if (this.activeTab === 'history') {
            html += this._renderHistory();
        }

        // Jang tarixi
        if (BattleSystem.battleLog.length > 0) {
            html += `<div class="battle-log-title">📜 Oxirgi janglar</div>`;
            html += '<div class="battle-log">';
            for (const log of BattleSystem.battleLog.slice(0, 5)) {
                const timeAgo = this._timeAgo(log.time);
                html += `
                    <div class="battle-log-item ${log.victory ? 'victory' : 'defeat'}">
                        <span>${log.victory ? '✅' : '❌'} ${log.baseName}</span>
                        <span>${log.victory ? `🪙+${Helpers.formatNumber(log.goldLoot)}` : 'Yutqazish'}</span>
                        <span class="battle-log-time">${timeAgo}</span>
                    </div>
                `;
            }
            html += '</div>';
        }

        panel.innerHTML = html;
    },

    _renderOffline(canBattle, total) {
        let html = this._renderArmyStrengthBar(total);
        html += `<div class="battle-targets">`;
        const bases = BattleSystem.getAvailableBases();
        
        for (const base of bases) {
            const isLocked = XPSystem.level < base.requiredLevel;
            const canAttack = canBattle && total > 0 && !isLocked;
            const isBoss    = base.difficulty >= 30 || base.id === 'base_20';
            const difficultyStars = '⭐'.repeat(Math.min(Math.ceil(base.difficulty / 8), 5));

            // Win stats from BattleSystem history
            const history = typeof BattleSystem !== 'undefined' ? (BattleSystem._offlineHistory || {}) : {};
            const baseHist = history[base.id] || { wins: 0, attempts: 0 };
            const winRate  = baseHist.attempts > 0 ? Math.round(baseHist.wins / baseHist.attempts * 100) : null;
            const winRateStr = winRate !== null
                ? `<span style="color:${winRate >= 70 ? '#69f0ae' : winRate >= 40 ? '#ffd700' : '#ef9a9a'}">🏆${winRate}%</span>`
                : `<span style="color:#555">🏆 —</span>`;

            // Difficulty color
            const diffColor = base.difficulty <= 5  ? '#4caf50'
                            : base.difficulty <= 10 ? '#ffc107'
                            : base.difficulty <= 20 ? '#ff7043'
                            : '#f44336';
            const bossGlow  = isBoss ? `box-shadow:0 0 20px rgba(244,67,54,0.3),0 0 40px rgba(244,67,54,0.1);
                                         border-color:rgba(244,67,54,0.4)!important;` : '';

            html += `
                <div class="battle-target ${isLocked ? 'locked' : ''} ${!canAttack ? 'disabled' : ''}"
                     ${canAttack ? `onclick="BattlePanel.startOfflineBattle('${base.id}')"` : ''}
                     style="position:relative;overflow:hidden;${bossGlow}
                            background:${isBoss ? 'linear-gradient(135deg,rgba(244,67,54,0.08),rgba(0,0,0,0.5))' : ''};">

                    <!-- Difficulty color band on left edge -->
                    <div style="position:absolute;left:0;top:0;bottom:0;width:3px;
                                background:${isBoss ? 'linear-gradient(180deg,#f44336,#ff1744)' : diffColor};
                                border-radius:12px 0 0 12px;
                                ${isBoss ? 'animation:boostIconPulse 1.2s ease-in-out infinite;' : ''}"></div>

                    ${isBoss ? `<div style="position:absolute;top:0;left:8px;right:0;height:2px;
                        background:linear-gradient(90deg,rgba(244,67,54,0.8),transparent);"></div>` : ''}

                    <div class="battle-target-header" style="padding-left:8px;">
                        <span class="battle-target-icon"
                              style="${isBoss ? 'animation:boostIconPulse 1.5s ease-in-out infinite;filter:drop-shadow(0 0 8px rgba(244,67,54,0.6));' : ''}">${base.icon}</span>
                        <div class="battle-target-info">
                            <div class="battle-target-name" style="${isBoss ? 'color:#ff5252;font-weight:900;' : ''}">
                                ${base.name}
                                ${isBoss ? `<span style="font-size:8px;background:rgba(244,67,54,0.2);border:1px solid rgba(244,67,54,0.4);
                                    border-radius:4px;padding:1px 5px;margin-left:4px;color:#ff5252;font-weight:900;">⚠️ BOSS</span>` : ''}
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                                <div class="battle-target-diff">${difficultyStars}</div>
                                ${winRateStr}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div class="battle-target-force" style="font-size:10px;color:${isBoss?'#ff5252':'#aaa'};">⚡${Helpers.formatNumber(base.enemyForce)}</div>
                            <div style="font-size:9px;color:#555;margin-top:2px;">Kuch</div>
                        </div>
                    </div>

                    <div class="battle-target-desc" style="padding-left:8px;">${base.description}</div>

                    <!-- Loot row -->
                    <div class="battle-target-loot" style="padding-left:8px;">
                        <span>🪙 ${Helpers.formatNumber(base.lootGold[0])}-${Helpers.formatNumber(base.lootGold[1])}</span>
                        <span>🍎 ${Helpers.formatNumber(base.lootFood[0])}-${Helpers.formatNumber(base.lootFood[1])}</span>
                        <span>⭐ +${base.xpReward} XP</span>
                        <span>🏆 +${base.trophyReward || '?'}</span>
                    </div>

                    ${isLocked ? `<div class="battle-target-lock">🔒 Daraja ${base.requiredLevel} kerak</div>` : ''}
                    ${canAttack ? `<div style="position:absolute;right:12px;bottom:10px;font-size:20px;opacity:0.15">⚔️</div>` : ''}
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    },

    _renderOnline(canBattle, total) {
        let html = '';

        if (this._searching) {
            html += `
            <div style="text-align:center;padding:24px 16px;background:rgba(0,0,0,0.25);
                        border:1px solid rgba(255,255,255,0.07);border-radius:14px;margin-bottom:15px;
                        position:relative;overflow:hidden;">

                <!-- Radar rings -->
                <div style="position:relative;width:100px;height:100px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                    <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(100,181,246,0.15);
                                animation:radarRingExpand 2s ease-out infinite;"></div>
                    <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(100,181,246,0.2);
                                animation:radarRingExpand 2s ease-out 0.65s infinite;"></div>
                    <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(100,181,246,0.25);
                                animation:radarRingExpand 2s ease-out 1.3s infinite;"></div>
                    <!-- Rotating sweep line -->
                    <div style="position:absolute;top:0;left:50%;width:2px;height:50%;
                                transform-origin:bottom center;
                                background:linear-gradient(to top,rgba(100,181,246,0.8),transparent);
                                animation:radarSweep 2s linear infinite;"></div>
                    <!-- Globe icon center -->
                    <div style="font-size:32px;position:relative;z-index:2;filter:drop-shadow(0 0 8px rgba(100,181,246,0.6));
                                animation:radarGlobePulse 1s ease-in-out infinite;">🌍</div>
                </div>

                <div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:6px;">
                    Raqib qidirilmoqda<span id="bp-dots" style="display:inline-block;width:24px;text-align:left;animation:none;">...</span>
                </div>
                <div style="font-size:11px;color:#666;margin-bottom:16px;">
                    Sizning TH darajangizga mos raqib izlanmoqda
                </div>
                <div style="display:flex;gap:8px;justify-content:center;align-items:center;margin-bottom:16px;">
                    <div style="width:8px;height:8px;border-radius:50%;background:#4caf50;animation:pulse 0.8s ease-in-out infinite;"></div>
                    <span style="font-size:10px;color:#666;">Global serverga ulanildi</span>
                </div>

                <button onclick="BattlePanel.cancelSearch()"
                        style="background:rgba(244,67,54,0.12);border:1px solid rgba(244,67,54,0.35);
                               color:#ef9a9a;padding:8px 24px;border-radius:8px;font-size:12px;
                               font-weight:700;cursor:pointer;letter-spacing:0.5px;">
                    ✖ Bekor qilish
                </button>
            </div>
            <script>
            (function() {
                var dots = document.getElementById('bp-dots');
                if (!dots || dots._animated) return;
                dots._animated = true;
                var states = ['.','..','...'];
                var i = 0;
                var iv = setInterval(function() {
                    var el = document.getElementById('bp-dots');
                    if (!el) { clearInterval(iv); return; }
                    el.textContent = states[i++ % 3];
                }, 400);
            })();
            </script>`;
        } else if (!this.multiplayerMatch) {
            const isLoggedIn = typeof Api !== 'undefined' && Api.isLoggedIn();
            const hasShield = typeof BattleSystem !== 'undefined' && BattleSystem.hasShield();

            if (isLoggedIn) {
                // API bilan: eski find match UI
                html += `<div style="text-align:center;padding:20px;background:rgba(0,0,0,0.2);border-radius:12px;margin-bottom:15px;">
                    <div style="font-size:48px;margin-bottom:15px;">🌍</div>
                    <div style="color:#fff;font-size:16px;margin-bottom:10px;font-weight:bold;">Haqiqiy o'yinchilarga hujum!</div>
                    <button class="btn btn-primary" onclick="BattlePanel.findMatch()" style="padding:15px 30px;font-size:16px;">
                        🔍 Raqib Qidirish (🪙 50)
                    </button>
                </div>`;
            } else {
                // Offline: Matchmaking pool — 3 raqib
                html += this._renderMatchmakingPool(canBattle, total);
            }

            // Shield section
            const shieldRem = hasShield ? BattleSystem.getShieldRemaining() : 0;
            const shRh = Math.floor(shieldRem / 3_600_000);
            const shRm = Math.floor((shieldRem % 3_600_000) / 60_000);
            const shieldStr = shRh > 0 ? `${shRh}s ${shRm}d` : `${shRm}d`;
            html += `<div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:14px;margin-bottom:10px;">
                <div style="font-size:13px;font-weight:bold;color:#aaa;margin-bottom:10px;">🛡️ Himoya Qalqoni</div>`;
            if (hasShield) {
                html += `<div style="text-align:center;background:rgba(33,150,243,0.1);border:1px solid rgba(33,150,243,0.3);border-radius:8px;padding:10px;">
                    <div style="font-size:20px;margin-bottom:4px;">🛡️</div>
                    <div style="color:#64b5f6;font-size:14px;font-weight:bold;">Qalqon aktiv: ${shieldStr}</div>
                    <div style="font-size:11px;color:#888;margin-top:4px;">Hujum qilsangiz qalqon bekor bo'ladi</div>
                </div>`;
            } else {
                const SHIELDS = [
                    { hours: 2,  gems: 2,  label: '2 soat' },
                    { hours: 8,  gems: 8,  label: '8 soat' },
                    { hours: 24, gems: 20, label: '1 kun' },
                    { hours: 72, gems: 50, label: '3 kun' },
                ];
                html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`;
                for (const s of SHIELDS) {
                    const canAfford = Resources.diamond >= s.gems;
                    html += `<button class="btn" style="font-size:11px;${canAfford?'':'opacity:0.5;cursor:default;'}"
                        ${canAfford?`onclick="BattlePanel.buyShield(${s.hours},${s.gems})"`:''}>
                        🛡️ ${s.label}<br><span style="color:#b39ddb;">💎 ${s.gems}</span>
                    </button>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
        } else {
            const m = this.multiplayerMatch;
            const hint = m.village?.resource_hint || {};
            const lootG = hint.gold ?? 1000;
            const lootF = hint.food ?? 800;
            const canAttack = canBattle && total > 0;
            const isBot = m.is_bot;
            const thLv = m.village?.map_data?.buildings?.find(b => b.type === 'cityHall')?.level ?? '?';

            html += `<div style="text-align:center;background:rgba(0,0,0,0.2);border-radius:12px;margin-bottom:15px;padding:20px;">
                <div style="font-size:14px; color:#aaa; margin-bottom:10px;">
                    ${isBot ? '🤖 Bot raqib topildi:' : '🌍 Haqiqiy o\'yinchi topildi:'}
                </div>
                <div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:12px; border:1px solid ${isBot ? 'rgba(100,100,200,0.5)' : 'rgba(229,57,53,0.5)'}; margin-bottom:20px;">
                    <div style="font-size:22px; font-weight:bold; color:#fff; margin-bottom:4px; font-family:'Cinzel',serif;">${m.name}</div>
                    <div style="color:#888; font-size:12px; margin-bottom:12px;">🏚️ Town Hall ${thLv} ${isBot ? '(Bot)' : '(Real o\'yinchi)'}</div>

                    <div style="display:flex; justify-content:space-around; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">
                        <div style="text-align:center;">
                            <div style="font-size:14px; margin-bottom:2px;">🏆</div>
                            <div style="font-size:14px; font-weight:bold; color:#ffd700;">${m.trophies}</div>
                            <div style="font-size:10px; color:#666;">Kubok</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:14px; margin-bottom:2px;">🪙</div>
                            <div style="font-size:14px; font-weight:bold; color:#ffb300;">${Helpers.formatNumber(lootG)}</div>
                            <div style="font-size:10px; color:#666;">Oltin</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:14px; margin-bottom:2px;">🍎</div>
                            <div style="font-size:14px; font-weight:bold; color:#81c784;">${Helpers.formatNumber(lootF)}</div>
                            <div style="font-size:10px; color:#666;">Oziq</div>
                        </div>
                    </div>
                </div>

                ${this._renderArmyStrengthBar(total)}

                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn btn-primary" onclick="BattlePanel.startOnlineBattle()" style="flex:1;" ${!canAttack ? 'disabled' : ''}>⚔️ Hujum!</button>
                    <button class="btn" onclick="BattlePanel.findMatch()" style="flex:1; background:rgba(255,255,255,0.1);">🔄 Boshqa (🪙 50)</button>
                </div>
                ${!canAttack ? `<div style="color:#f44336; font-size:12px; margin-top:10px; text-align:center;">⚠️ Askaringiz yo'q!</div>` : ''}
            </div>`;
        }

        return html;
    },

    _renderResult() {
        const r = this.battleResult;

        // ── Star rendering ───────────────────────────────────────────────────
        const starsHtml = [1, 2, 3].map(i => {
            const lit = i <= (r.stars || 0);
            const delay = (i - 1) * 0.18;
            return `<span style="font-size:32px;display:inline-block;
                                 animation:${lit ? `starPop 0.4s ${delay}s cubic-bezier(.175,.885,.32,1.275) both` : 'none'};
                                 filter:${lit ? 'drop-shadow(0 0 8px #ffd700)' : 'grayscale(1) opacity(0.3)'};">
                        ${lit ? '⭐' : '☆'}
                    </span>`;
        }).join('');

        // ── Background gradient ───────────────────────────────────────────────
        const titleText = r.victory ? "G'ALABA!" : "MAG'LUBIYAT";
        const titleIcon = r.victory ? '🏆' : '💀';
        const bgColor   = r.victory
            ? 'linear-gradient(160deg,rgba(27,94,32,0.5),rgba(0,0,0,0.85))'
            : 'linear-gradient(160deg,rgba(183,28,28,0.5),rgba(0,0,0,0.85))';
        const borderColor = r.victory ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)';

        // ── Streak badge ─────────────────────────────────────────────────────
        const streakBadge = r.winStreak >= 2
            ? `<div style="display:inline-block;background:linear-gradient(135deg,#ff6d00,#ff8f00);
                            border-radius:20px;padding:3px 12px;font-size:11px;font-weight:800;
                            color:#fff;margin-bottom:8px;box-shadow:0 2px 10px rgba(255,109,0,0.4);">
                    🔥 ${r.winStreak}x SERIYA! +${r.streakBonus || 0}% LUT
               </div>`
            : '';

        // ── Hero aura row ─────────────────────────────────────────────────────
        const heroLv = (typeof HeroSystem !== 'undefined' && HeroSystem.commanders.commander?.level) || 0;
        const heroAura = typeof r.heroAura === 'number' ? r.heroAura : 1;
        const heroRow = heroLv > 0 && heroAura > 1
            ? `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                   <span style="color:#ffd700;font-size:11px;">👑 Qo'mondon Aura (Lv${heroLv})</span>
                   <span style="color:#ffd700;font-size:11px;font-weight:800;">+${Math.round((heroAura-1)*100)}% kuch</span>
               </div>`
            : '';

        // ── Resource rows ────────────────────────────────────────────────────
        const rows = [];
        if (r.goldLoot > 0) rows.push({ icon: '🪙', label: 'Oltin',   val: `+${Helpers.formatNumber(r.goldLoot)}`,   color: '#ffd700' });
        if (r.foodLoot > 0) rows.push({ icon: '🍎', label: 'Oziq',    val: `+${Helpers.formatNumber(r.foodLoot)}`,   color: '#a5d6a7' });
        rows.push({ icon: '⭐', label: 'XP',     val: `+${r.xp}`,                               color: '#90caf9' });
        rows.push({ icon: '🏆', label: 'Kubok',  val: `${r.trophyChange > 0 ? '+' : ''}${r.trophyChange}`, color: r.trophyChange >= 0 ? '#ffd700' : '#ef9a9a' });
        rows.push({ icon: '💀', label: 'Yo\'qotish', val: `${r.lossPercent}%`,                  color: r.lossPercent <= 20 ? '#69f0ae' : r.lossPercent <= 50 ? '#ffd700' : '#ef9a9a' });

        const rowsHtml = rows.map(row => `
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="font-size:11px;color:#aaa;">${row.icon} ${row.label}</span>
                <span style="font-size:12px;font-weight:800;color:${row.color};">${row.val}</span>
            </div>
        `).join('');

        return `
            <div class="panel-content" style="padding:16px 14px;
                         background:${bgColor};min-height:100%;border-radius:0 0 16px 16px;">

                <!-- Title -->
                <div style="text-align:center;margin-bottom:12px;animation:fadeInDown 0.35s ease both;">
                    <div style="font-size:28px;font-weight:900;font-family:'Cinzel',serif;
                                color:${r.victory ? '#69f0ae' : '#ef5350'};
                                text-shadow:0 0 20px ${r.victory ? 'rgba(105,240,174,0.5)' : 'rgba(239,83,80,0.5)'};">
                        ${titleIcon} ${titleText}
                    </div>
                    <div style="font-size:11px;color:#888;margin-top:4px;">${r.baseName}</div>
                </div>

                <!-- Stars -->
                <div style="text-align:center;margin-bottom:12px;">
                    ${starsHtml}
                </div>

                <!-- Streak badge -->
                <div style="text-align:center;margin-bottom:${streakBadge ? '10px' : '0'};">
                    ${streakBadge}
                </div>

                <!-- Stats card -->
                <div style="background:rgba(0,0,0,0.35);border:1px solid ${borderColor};
                            border-radius:12px;padding:10px 14px;margin-bottom:14px;
                            animation:fadeInUp 0.4s 0.1s ease both;">
                    ${heroRow}
                    ${rowsHtml}
                </div>

                <!-- Action buttons -->
                <div style="display:flex;gap:8px;animation:fadeInUp 0.4s 0.2s ease both;">
                    <button onclick="BattlePanel.closeResult()"
                            style="flex:1;padding:12px;background:${r.victory ? 'linear-gradient(135deg,#1b5e20,#2e7d32)' : 'linear-gradient(135deg,#b71c1c,#c62828)'};
                                   border:1px solid ${r.victory ? 'rgba(76,175,80,0.6)' : 'rgba(244,67,54,0.6)'};
                                   border-radius:10px;color:#fff;font-size:13px;font-weight:800;cursor:pointer;
                                   box-shadow:0 4px 12px ${r.victory ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'};">
                        ${r.victory ? '🎉 Davom Etish' : '😤 Qaytadan!'}
                    </button>
                    ${r.victory ? `
                    <button onclick="BattlePanel.closeResult();BattlePanel.toggle()"
                            style="padding:12px 14px;background:rgba(255,255,255,0.06);
                                   border:1px solid rgba(255,255,255,0.12);
                                   border-radius:10px;color:#aaa;font-size:12px;font-weight:700;cursor:pointer;">
                        ⚔️ Yana Jang
                    </button>` : ''}
                </div>
            </div>
        `;
    },

    _renderArmyStrengthBar(total) {
        if (total === 0) return '';
        const army = TroopManager.army;
        const maxTroops = TroopManager.maxTroops;

        // Armiya tarkibi (emoji strip)
        const catColors = {
            piyoda: '#ef5350', otishma: '#66bb6a', otliq: '#ce93d8',
            qamal: '#ffb74d', uchuvchi: '#42a5f5', commander: '#ffd700',
        };

        // Kuch hisoblash
        let totalPower = 0;
        const strips = [];
        for (const [type, count] of Object.entries(army)) {
            if (count === 0) continue;
            const td = TROOP_DATA[type];
            if (!td) continue;
            const power = (td.stats.hp + td.stats.damage * 2) * count;
            totalPower += power;
            strips.push({ type, count, power, color: catColors[td.category] || '#888', icon: td.icon });
        }

        // Kuch darajasi
        const powerLevel = totalPower < 5000 ? '⚠️ Zaif' :
                           totalPower < 20000 ? '⚔️ O\'rtacha' :
                           totalPower < 60000 ? '💪 Kuchli' : '🔥 Qudratli';
        const powerColor = totalPower < 5000 ? '#f44336' :
                           totalPower < 20000 ? '#ff9800' :
                           totalPower < 60000 ? '#4caf50' : '#ffd700';

        // Strip segmentlari (donut)
        const segmentsHtml = strips.map(s => {
            const pct = (s.power / totalPower * 100).toFixed(1);
            return `<div style="flex:${pct};background:${s.color};height:100%;min-width:2px;" title="${s.icon} x${s.count}"></div>`;
        }).join('');

        return `
            <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:8px 10px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div style="font-size:10px;font-weight:bold;color:#888;">⚔️ QO'SHIN KUCHI</div>
                    <div style="font-size:11px;font-weight:bold;color:${powerColor};">${powerLevel}</div>
                </div>
                <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;gap:1px;margin-bottom:6px;background:rgba(255,255,255,0.05);">
                    ${segmentsHtml}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    ${strips.map(s => `
                        <div style="display:flex;align-items:center;gap:3px;font-size:9px;color:#aaa;">
                            <div style="width:6px;height:6px;border-radius:50%;background:${s.color};"></div>
                            ${s.icon}×${s.count}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    buyShield(hours, gemCost) {
        const hLabel = hours >= 24 ? `${hours / 24} kun` : `${hours} soat`;
        if (typeof GemConfirm !== 'undefined') {
            GemConfirm.show({
                gemCost,
                title: `${hLabel} Himoya Qalqoni`,
                icon: '🛡️',
                timeLabel: `${hLabel} davomida baza himoyalanadi`,
                onConfirm: () => {
                    if (!Resources.spend('diamond', gemCost)) {
                        Toast.show('Olmos yetarli emas!', 'error');
                        return;
                    }
                    BattleSystem.setShield(hours);
                    if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                        Api._request?.('POST', '/player/shield', { hours }).catch(() => {});
                    }
                    Toast.show(`🛡️ ${hLabel} qalqon faollashdi! (-💎${gemCost})`, 'success');
                    ShieldHUD.update();
                    this.render();
                }
            });
        } else {
            if (!Resources.spend('diamond', gemCost)) {
                Toast.show('Olmos yetarli emas!', 'error');
                return;
            }
            BattleSystem.setShield(hours);
            if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                Api._request?.('POST', '/player/shield', { hours }).catch(() => {});
            }
            Toast.show(`🛡️ ${hLabel} qalqon faollashdi! (-💎${gemCost})`, 'success');
            this.render();
        }
    },

    startOfflineBattle(baseId) {
        AudioManager.playClick();
        const base = ENEMY_BASES.find(b => b.id === baseId);
        if (!base) return;

        if (!BattleSystem.canBattle()) {
            Toast.show(`⏳ Jang uchun kuting!`, 'warning');
            return;
        }

        const total = TroopManager.getTotal();
        const hasActiveHeroes = typeof HeroSystem !== 'undefined'
            && HeroSystem.getActiveHeroes().some(h => !HeroSystem.commanders[h]?.sleeping);
        if (total === 0 && !hasActiveHeroes) {
            Toast.show("Askar yoki qahramon kerak! Avval tayyorlang.", 'error');
            return;
        }

        if (XPSystem.level < base.requiredLevel) {
            Toast.show(`Daraja ${base.requiredLevel} kerak!`, 'warning');
            return;
        }

        this.hide();

        // Pre-attack ekrani orqali boshlash
        if (typeof AttackScreen !== 'undefined') {
            AttackScreen.showMultiplayer({
                id:          base.id,
                name:        base.name,
                icon:        '🏰',
                archetype:   `Qiyinlik ${base.difficulty}/5`,
                trophies:    0,
                thLevel:     base.difficulty * 2,
                goldLoot:    Math.round((base.lootGold[0] + base.lootGold[1]) / 2),
                foodLoot:    Math.round((base.lootFood[0] + base.lootFood[1]) / 2),
                _isNpcBase:  baseId,   // BattleManager.startLiveBattle uchun
            });
            // AttackScreen._startBattle() startOnlineLiveBattle chaqiradi
            // lekin NPC uchun startLiveBattle kerak — kengaytirish qilish kerak
            // Soddaroq yo'l: _mode = 'npc' sifatida saqlaymiz
            AttackScreen._npcBaseId = baseId;
            AttackScreen._mode = 'npc';
        } else {
            BattleManager.startLiveBattle(baseId);
        }
    },

    startOnlineBattle() {
        AudioManager.playClick();
        if (!this.multiplayerMatch) return;

        if (!BattleSystem.canBattle()) {
            Toast.show(`⏳ Jang uchun kuting!`, 'warning');
            return;
        }

        const total = TroopManager.getTotal();
        const hasHeroesOnline = typeof HeroSystem !== 'undefined'
            && HeroSystem.getActiveHeroes().some(h => !HeroSystem.commanders[h]?.sleeping);
        if (total === 0 && !hasHeroesOnline) {
            Toast.show("Askar yoki qahramon kerak! Avval tayyorlang.", 'error');
            return;
        }

        const m = this.multiplayerMatch;
        const hint = m.village?.resource_hint || {};
        const thLv = m.village?.map_data?.buildings?.find(b => b.type === 'cityHall')?.level ?? 1;

        // BattleManager uchun opponentData format
        const opponentData = {
            id:          m.id,
            opponent_id: m.id,
            is_bot:      m.is_bot,
            name:        m.name,
            trophies:    m.trophies,
            level:       thLv,
            baseLayout:  JSON.stringify(m.village?.map_data?.buildings ?? []),
            loot:        { gold: hint.gold ?? 1000, food: hint.food ?? 800 },
        };

        this.multiplayerMatch = null;
        this.hide();

        // AttackScreen orqali: pre-attack ko'rinish, keyin hujum
        if (typeof AttackScreen !== 'undefined') {
            AttackScreen.showMultiplayer({
                ...opponentData,
                name:        opponentData.name || m.name,
                icon:        '🌍',
                archetype:   m.is_bot ? '🤖 Bot' : '🌍 O\'yinchi',
                trophies:    m.trophies,
                thLevel:     thLv,
                goldLoot:    opponentData.loot.gold,
                foodLoot:    opponentData.loot.food,
            });
        } else {
            BattleManager.startOnlineLiveBattle(opponentData);
        }
    },

    closeResult() {
        this.battleResult = null;
        this.render();
    },

    // ── Matchmaking Pool UI ────────────────────────────────────────────────────
    _renderMatchmakingPool(canBattle, total) {
        if (typeof Matchmaking === 'undefined') return '';
        const pool = Matchmaking.getPool();
        const playerTrophies = typeof BattleSystem !== 'undefined' ? BattleSystem.trophies : 0;

        let html = `
        <div style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;">
                    🌍 Raqiblar (${pool.length})
                </div>
                <button onclick="Matchmaking.refreshPool();BattlePanel.render()"
                        style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
                               border-radius:6px;padding:3px 10px;color:#aaa;font-size:9px;cursor:pointer;">
                    🔄 Yangilash
                </button>
            </div>`;

        for (let i = 0; i < pool.length; i++) {
            const opp = pool[i];
            const canAttack = canBattle && total > 0;
            const trophyDiff = opp.trophies - playerTrophies;
            const trophyColor = trophyDiff >= 0 ? '#69f0ae' : '#ef9a9a';
            const trophySign  = trophyDiff >= 0 ? '+' : '';

            html += `
            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);
                        border-radius:12px;padding:12px;margin-bottom:8px;
                        position:relative;overflow:hidden;">
                <!-- Left accent -->
                <div style="position:absolute;left:0;top:0;bottom:0;width:3px;
                            background:linear-gradient(180deg,#ffd700,#ff8f00);border-radius:12px 0 0 12px;"></div>
                <div style="padding-left:8px;">
                    <!-- Header row -->
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:20px;">${opp.icon}</span>
                            <div>
                                <div style="font-size:12px;font-weight:700;color:#fff;">${opp.playerName}</div>
                                <div style="font-size:9px;color:#666;">${opp.archetype}</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:12px;font-weight:700;color:#ffd700;">🏆 ${opp.trophies}</div>
                            <div style="font-size:9px;color:${trophyColor};">${trophySign}${trophyDiff} sizdan</div>
                        </div>
                    </div>
                    <!-- Mini baza preview (CoC-style) -->
                    <div style="position:relative;margin-bottom:10px;border-radius:8px;overflow:hidden;
                                border:1px solid rgba(255,255,255,0.1);">
                        <canvas id="base-preview-${opp.id}"
                                width="260" height="100"
                                style="width:100%;display:block;background:linear-gradient(135deg,#1a3a1a,#0d2010);"></canvas>
                        <div style="position:absolute;bottom:3px;right:6px;font-size:8px;color:rgba(255,255,255,0.4);">
                            Baza ko'rinishi
                        </div>
                    </div>
                    <!-- Stats row -->
                    <div style="display:flex;gap:10px;margin-bottom:10px;">
                        <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:6px;padding:5px 8px;text-align:center;">
                            <div style="font-size:14px;">🪙</div>
                            <div style="font-size:11px;font-weight:700;color:#ffb300;">${Helpers.formatNumber(opp.goldLoot)}</div>
                            <div style="font-size:8px;color:#555;">Max lut</div>
                        </div>
                        <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:6px;padding:5px 8px;text-align:center;">
                            <div style="font-size:14px;">🍎</div>
                            <div style="font-size:11px;font-weight:700;color:#81c784;">${Helpers.formatNumber(opp.foodLoot)}</div>
                            <div style="font-size:8px;color:#555;">Max lut</div>
                        </div>
                        <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:6px;padding:5px 8px;text-align:center;">
                            <div style="font-size:14px;">🏠</div>
                            <div style="font-size:11px;font-weight:700;color:#90caf9;">TH${opp.thLevel}</div>
                            <div style="font-size:8px;color:#555;">Daraja</div>
                        </div>
                    </div>
                    <!-- Action buttons -->
                    <div style="display:flex;gap:6px;">
                        <button onclick="BattlePanel.attackFromPool('${opp.id}')"
                                ${!canAttack ? 'disabled' : ''}
                                style="flex:1;padding:7px;font-size:11px;font-weight:700;cursor:pointer;
                                       background:${canAttack ? 'linear-gradient(135deg,#b71c1c,#ef5350)' : 'rgba(100,100,100,0.2)'};
                                       border:1px solid ${canAttack ? '#ef5350' : 'rgba(255,255,255,0.06)'};
                                       border-radius:8px;color:${canAttack ? '#fff' : '#666'};">
                            ⚔️ Hujum!
                        </button>
                        <button onclick="Matchmaking.skipOpponent(${i});BattlePanel.render()"
                                style="padding:7px 12px;background:rgba(255,255,255,0.04);
                                       border:1px solid rgba(255,255,255,0.1);border-radius:8px;
                                       color:#888;font-size:9px;cursor:pointer;">
                            ⏭ O'tkazish
                        </button>
                    </div>
                    ${!canAttack && total === 0 ? `<div style="font-size:9px;color:#f44336;margin-top:5px;">⚠️ Askar yo'q!</div>` : ''}
                </div>
            </div>`;
        }

        html += `</div>`;

        // Canvas preview — render after DOM update
        requestAnimationFrame(() => {
            for (const opp of pool) {
                const canvas = document.getElementById(`base-preview-${opp.id}`);
                if (canvas) this._drawBasePreview(canvas, opp.baseLayout);
            }
        });

        return html;
    },

    // ── Mini baza preview chizish — CoC-style bird's eye view ──────────────────
    _drawBasePreview(canvas, baseLayoutStr) {
        if (!canvas) return;
        let buildings;
        try { buildings = JSON.parse(baseLayoutStr || '[]'); } catch(e) { return; }
        if (!buildings || buildings.length === 0) return;

        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Fon — o't rang
        ctx.fillStyle = '#1a3a1a';
        ctx.fillRect(0, 0, W, H);

        // Grid o'lchami va markazlash
        const gridSize = 44;
        // Buildings bounding box
        let minX = gridSize, minY = gridSize, maxX = 0, maxY = 0;
        for (const b of buildings) {
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            const bd = typeof BUILDING_DATA !== 'undefined' ? BUILDING_DATA[b.type] : null;
            const bw = bd ? bd.size[0] : 1;
            const bh = bd ? bd.size[1] : 1;
            maxX = Math.max(maxX, b.x + bw);
            maxY = Math.max(maxY, b.y + bh);
        }
        const spanX = maxX - minX + 2;
        const spanY = maxY - minY + 2;
        // Cell size — fit all buildings in W x H
        const cellW = Math.min(W / spanX, H / spanY * 1.4, 7);
        const cellH = cellW * 0.55; // isometric ratio
        // Isometric offset from grid coords
        const toIso = (gx, gy) => ({
            x: (gx - gy) * cellW * 0.5 + W * 0.5,
            y: (gx + gy) * cellH * 0.5 + H * 0.15,
        });

        // O't texture — grid tilelar
        ctx.fillStyle = 'rgba(30,70,20,0.35)';
        for (let gx = minX - 1; gx <= maxX + 1; gx++) {
            for (let gy = minY - 1; gy <= maxY + 1; gy++) {
                const p = toIso(gx - minX, gy - minY);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y - cellH);
                ctx.lineTo(p.x + cellW * 0.5, p.y - cellH * 0.5);
                ctx.lineTo(p.x, p.y);
                ctx.lineTo(p.x - cellW * 0.5, p.y - cellH * 0.5);
                ctx.closePath();
                const v = Math.sin(gx * 7.3 + gy * 5.1) * 0.5 + 0.5;
                ctx.fillStyle = `hsl(${100 + v * 20},${40 + v * 15}%,${15 + v * 8}%)`;
                ctx.fill();
            }
        }

        // Building color map
        const colorMap = {
            cityHall: '#ffd700', praetorium: '#b8860b',
            wall: '#607d8b',     gate: '#90a4ae',
            archerTower: '#ef5350', scorpio: '#e53935',
            magicTower: '#7c4dff', infernoColumn: '#ff6d00',
            villa: '#66bb6a',    farm: '#8bc34a', treeOfLife: '#4caf50',
            goldStorage: '#ffa726', foodStorage: '#26a69a',
            barracks: '#5c6bc0', musterGround: '#3949ab',
            default: '#78909c',
        };

        // Sort by y+x for proper iso depth
        const sorted = [...buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));

        for (const b of sorted) {
            const bd = typeof BUILDING_DATA !== 'undefined' ? BUILDING_DATA[b.type] : null;
            const bw = bd ? bd.size[0] : 1;
            const bh = bd ? bd.size[1] : 1;
            const col = colorMap[b.type] || colorMap.default;

            const gx = b.x - minX;
            const gy = b.y - minY;

            // Draw isometric tile for this building
            // Top face
            const corners = [
                toIso(gx, gy),
                toIso(gx + bw, gy),
                toIso(gx + bw, gy + bh),
                toIso(gx, gy + bh),
            ];
            ctx.save();
            // Side face (front) — darker
            if (cellH > 2) {
                ctx.beginPath();
                ctx.moveTo(corners[2].x, corners[2].y);
                ctx.lineTo(corners[3].x, corners[3].y);
                ctx.lineTo(corners[3].x, corners[3].y + cellH * bh * 0.6);
                ctx.lineTo(corners[2].x, corners[2].y + cellH * bh * 0.6);
                ctx.closePath();
                // Darken the top color for side face
                ctx.fillStyle = typeof _darkenColor !== 'undefined'
                    ? _darkenColor(col, 0.38)
                    : 'rgba(0,0,0,0.38)';
                ctx.fill();
            }
            // Top face
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y - cellH * bh * 0.4);
            ctx.lineTo(corners[1].x, corners[1].y - cellH * bh * 0.4);
            ctx.lineTo(corners[2].x, corners[2].y - cellH * bh * 0.4);
            ctx.lineTo(corners[3].x, corners[3].y - cellH * bh * 0.4);
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.fill();
            // Border
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore();
        }

        // Vignette edge
        const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.6);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
    },

    attackFromPool(opponentId) {
        AudioManager.playClick();
        if (typeof Matchmaking === 'undefined') return;

        if (!BattleSystem.canBattle()) {
            Toast.show(`⏳ Jang uchun ${Math.ceil(BattleSystem.getCooldownRemaining())}s kuting!`, 'warning');
            return;
        }
        const total = TroopManager.getTotal();
        if (total === 0) {
            Toast.show("Askaringiz yo'q!", 'error');
            return;
        }

        const result = Matchmaking.attackOpponent(opponentId);
        if (!result) return;

        // Update trophy display
        const prevTrophies = BattleSystem.trophies - result.trophyChange;
        BattleSystem.updateLeagueDisplay(prevTrophies);
        BattleSystem.showTrophyChange(result.trophyChange);

        // Show result
        this.battleResult = result;
        this.render();
        AudioManager.playSuccess?.();
    },

    _serverLogs: null,
    _historySubTab: 'attack',

    async _fetchServerLogs() {
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) return;
        try {
            this._serverLogs = await Api.getBattleLog();
            if (this.visible && this.activeTab === 'history') this.render();
        } catch { this._serverLogs = null; }
    },

    setHistoryTab(sub) {
        this._historySubTab = sub;
        this.render();
    },

    _renderHistory() {
        if (this._serverLogs === null && typeof Api !== 'undefined' && Api.isLoggedIn()) {
            this._serverLogs = undefined; // loading sentinel
            this._fetchServerLogs();
        }

        const allLogs = Array.isArray(this._serverLogs) ? this._serverLogs : null;
        if (!allLogs) return this._renderLocalLogs(BattleSystem.battleLog);

        const tab         = this._historySubTab;
        const attackLogs  = allLogs.filter(l => l.type === 'attack' || !l.type);
        const defenceLogs = allLogs.filter(l => l.type === 'defence');
        const logs        = tab === 'defence' ? defenceLogs : attackLogs;

        let html = `
            <div style="display:flex; margin-bottom:10px; background:rgba(255,255,255,0.05); border-radius:8px; overflow:hidden;">
                <div onclick="BattlePanel.setHistoryTab('attack')" style="flex:1; text-align:center; padding:8px; cursor:pointer; font-size:12px; font-weight:bold;${tab==='attack' ? 'background:rgba(212,175,55,0.2);color:#ffd700;' : 'color:#888;'}">⚔️ Hujum (${attackLogs.length})</div>
                <div onclick="BattlePanel.setHistoryTab('defence')" style="flex:1; text-align:center; padding:8px; cursor:pointer; font-size:12px; font-weight:bold;${tab==='defence' ? 'background:rgba(33,150,243,0.2);color:#64b5f6;' : 'color:#888;'}">🛡️ Mudofaa (${defenceLogs.length})</div>
            </div>
        `;

        if (logs.length === 0) {
            html += `<div style="text-align:center; padding:30px; color:#888; font-size:13px;">Hali ${tab==='defence'?'mudofaa':'hujum'} yozuvi yo'q</div>`;
        } else {
            html += `<div style="max-height:260px; overflow-y:auto;">`;
            for (const log of logs) {
                const isAtk    = tab === 'attack';
                const enemy    = isAtk ? (log.defender_name || 'Noma\'lum') : (log.attacker_name || 'Noma\'lum');
                const stars    = log.stars ?? 0;
                const win      = isAtk ? stars > 0 : stars === 0;
                const starsStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
                const lootG    = Helpers.formatNumber(log.loot_gold ?? 0);
                const tChange  = log.trophy_change ?? 0;
                const tColor   = tChange >= 0 ? '#4caf50' : '#f44336';
                const tSign    = tChange >= 0 ? '+' : '';
                const timeStr  = this._timeAgo(new Date(log.created_at ?? Date.now()).getTime());

                html += `
                    <div style="display:flex; align-items:center; padding:10px; margin-bottom:6px; background:${win ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)'}; border-radius:8px; border-left:3px solid ${win ? '#4caf50' : '#f44336'};">
                        <div style="flex:1;">
                            <div style="font-weight:bold; margin-bottom:3px; font-size:13px;">${isAtk ? '⚔️' : '🛡️'} ${enemy}</div>
                            <div style="font-size:11px;">${starsStr}</div>
                        </div>
                        <div style="text-align:right; font-size:12px;">
                            <div style="color:#ffb300;">🪙 ${isAtk ? '+' : '-'}${lootG}</div>
                            <div style="color:${tColor};">🏆 ${tSign}${tChange}</div>
                            <div style="color:#888; font-size:10px;">${timeStr}</div>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        }

        html += `<button class="btn" onclick="LeaderboardPanel.show()" style="width:100%; margin-top:10px; background:linear-gradient(to bottom,#7b1fa2,#4a148c); font-size:13px;">🏆 Global Reyting (Top 100)</button>`;
        return html;
    },

    _renderLocalLogs(logs) {
        const defenseLogs = typeof Matchmaking !== 'undefined' ? Matchmaking.getDefenseLog() : [];
        const tab = this._historySubTab || 'attack';

        let html = `
            <div style="display:flex;margin-bottom:10px;background:rgba(255,255,255,0.05);border-radius:8px;overflow:hidden;">
                <div onclick="BattlePanel.setHistoryTab('attack')"
                     style="flex:1;text-align:center;padding:8px;cursor:pointer;font-size:11px;font-weight:bold;
                            ${tab==='attack'?'background:rgba(212,175,55,0.2);color:#ffd700;':'color:#888;'}">
                    ⚔️ Hujum (${logs.length})
                </div>
                <div onclick="BattlePanel.setHistoryTab('defence')"
                     style="flex:1;text-align:center;padding:8px;cursor:pointer;font-size:11px;font-weight:bold;
                            ${tab==='defence'?'background:rgba(33,150,243,0.2);color:#64b5f6;':'color:#888;'}
                            position:relative;">
                    🛡️ Mudofaa (${defenseLogs.length})
                    ${defenseLogs.filter(e=>!e._read).length > 0
                        ? `<span style="position:absolute;top:4px;right:8px;background:#f44336;border-radius:50%;
                                        width:14px;height:14px;font-size:8px;display:flex;align-items:center;
                                        justify-content:center;color:#fff;font-weight:700;">
                               ${defenseLogs.filter(e=>!e._read).length}
                           </span>` : ''}
                </div>
            </div>`;

        if (tab === 'defence') {
            Matchmaking.markAllDefenseRead();
            if (defenseLogs.length === 0) {
                return html + `<div style="text-align:center;padding:30px;color:#888;font-size:13px;">
                    <div style="font-size:32px;margin-bottom:8px;">🛡️</div>Hali hujumga uchramadingiz
                </div>`;
            }
            html += `<div style="max-height:280px;overflow-y:auto;">`;
            for (const dl of defenseLogs) {
                const win = !dl.attackerWon; // we defended
                const stars = dl.stars || 0;
                const starsStr = '⭐'.repeat(stars) + '☆'.repeat(3-stars);
                const timeStr = this._timeAgo(dl.time || Date.now());
                html += `<div style="display:flex;align-items:center;padding:10px;margin-bottom:6px;
                                     background:${win?'rgba(76,175,80,0.1)':'rgba(244,67,54,0.1)'};
                                     border-radius:8px;border-left:3px solid ${win?'#4caf50':'#f44336'};">
                    <div style="flex:1;">
                        <div style="font-weight:bold;margin-bottom:2px;font-size:12px;">
                            ${dl.attackerIcon||'⚔️'} ${dl.attackerName}
                            <span style="font-size:9px;color:#aaa;margin-left:4px;">TH${dl.attackerLevel||'?'} · 🏆${dl.attackerTrophies||0}</span>
                        </div>
                        <div style="font-size:10px;color:${win?'#69f0ae':'#ef9a9a'}">
                            ${win ? '🛡️ Himoya ushlab turdi!' : `❌ Mag'lubiyat ${starsStr}`}
                        </div>
                    </div>
                    <div style="text-align:right;font-size:10px;">
                        ${dl.trophyChange !== 0 ? `<div style="color:${dl.trophyChange<0?'#f44336':'#4caf50'}">🏆${dl.trophyChange||0}</div>` : ''}
                        <div style="color:#888;">${timeStr}</div>
                    </div>
                </div>`;
            }
            html += `</div>`;
            return html;
        }

        if (logs.length === 0) {
            return html + `<div style="text-align:center; padding:30px 20px; color:#888;">
                <div style="font-size:40px; margin-bottom:10px;">📜</div>
                <div>Hali jang qilinmagan</div>
            </div>`;
        }
        let wins = 0, losses = 0, totalGold = 0;
        for (const l of logs) { if (l.victory) wins++; else losses++; totalGold += l.goldLoot || 0; }
        html += `
            <div style="display:flex; justify-content:space-around; margin-bottom:12px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
                <div style="text-align:center;"><div style="font-size:20px; font-weight:bold; color:#4caf50;">${wins}</div><div style="font-size:11px; color:#aaa;">G'alaba</div></div>
                <div style="text-align:center;"><div style="font-size:20px; font-weight:bold; color:#f44336;">${losses}</div><div style="font-size:11px; color:#aaa;">Mag'lub</div></div>
                <div style="text-align:center;"><div style="font-size:14px; font-weight:bold; color:#ffd700;">🪙 ${Helpers.formatNumber(totalGold)}</div><div style="font-size:11px; color:#aaa;">O'lja</div></div>
            </div>
            <div style="max-height:280px; overflow-y:auto;">
        `;
        for (const log of logs) {
            const starsStr = '⭐'.repeat(log.stars) + '☆'.repeat(3 - log.stars);
            const tColor   = (log.trophyChange||0) >= 0 ? '#4caf50' : '#f44336';
            const tSign    = (log.trophyChange||0) >= 0 ? '+' : '';
            html += `
                <div style="display:flex; align-items:center; padding:10px; margin-bottom:6px; background:${log.victory ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)'}; border-radius:8px; border-left:3px solid ${log.victory ? '#4caf50' : '#f44336'};">
                    <div style="flex:1;"><div style="font-weight:bold; margin-bottom:3px;">${log.victory ? '⚔️' : '🛡️'} ${log.baseName || 'Noma\'lum'}</div><div style="font-size:11px;">${starsStr}</div></div>
                    <div style="text-align:right; font-size:12px;">
                        <div>🪙 +${Helpers.formatNumber(log.goldLoot || 0)}</div>
                        <div style="color:${tColor};">🏆 ${tSign}${log.trophyChange || 0}</div>
                        <div style="color:#888; font-size:10px;">${this._timeAgo(log.time)}</div>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
        html += `<button class="btn" onclick="LeaderboardPanel.show()" style="width:100%; margin-top:10px; background:linear-gradient(to bottom,#7b1fa2,#4a148c); font-size:13px;">🏆 Global Reyting (Top 100)</button>`;
        return html;
    },

    _timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'Hozirgina';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm oldin';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h oldin';
        return Math.floor(diff / 86400000) + 'k oldin';
    },

    update() {
        if (this.visible && !this.battleResult) {
            // Cooldown yangilash
            if (!BattleSystem.canBattle()) {
                this.render();
            }
        }
    }
};
