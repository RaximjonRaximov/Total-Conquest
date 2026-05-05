// ============================================
// JANG PANELI (Battle Panel UI)
// Dushman bazalarini ko'rish va hujum qilish
// ============================================

const BattlePanel = {
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
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
            this.battleResult = null;
        }
    },

    hide() {
        this.visible = false;
        this.battleResult = null;
        document.getElementById('battle-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    setTab(tab) {
        this.activeTab = tab;
        this.multiplayerMatch = null;
        AudioManager.playClick();
        this.render();
    },

    findMatch() {
        AudioManager.playCoin();
        const cost = 50;
        if (Resources.gold < cost) {
            Toast.show("Qidirish uchun Oltin yetarli emas (50 kerak)!", "error");
            return;
        }
        Resources.add('gold', -cost);
        
        // Dushmanni Database dan qidirish
        this.multiplayerMatch = DatabaseSystem.findMatch(BattleSystem.trophies);
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
        let html = `<div class="battle-targets">`;
        const bases = BattleSystem.getAvailableBases();
        
        for (const base of bases) {
            const isLocked = XPSystem.level < base.requiredLevel;
            const canAttack = canBattle && total > 0 && !isLocked;
            const difficultyStars = '⭐'.repeat(Math.min(base.difficulty, 5));

            html += `
                <div class="battle-target ${isLocked ? 'locked' : ''} ${!canAttack ? 'disabled' : ''}" 
                     ${canAttack ? `onclick="BattlePanel.startOfflineBattle('${base.id}')"` : ''}>
                    <div class="battle-target-header">
                        <span class="battle-target-icon">${base.icon}</span>
                        <div class="battle-target-info">
                            <div class="battle-target-name">${base.name}</div>
                            <div class="battle-target-diff">${difficultyStars}</div>
                        </div>
                        <div class="battle-target-force">⚡${Helpers.formatNumber(base.enemyForce)}</div>
                    </div>
                    <div class="battle-target-desc">${base.description}</div>
                    <div class="battle-target-loot">
                        <span>🪙 ${Helpers.formatNumber(base.lootGold[0])}-${Helpers.formatNumber(base.lootGold[1])}</span>
                        <span>🍎 ${Helpers.formatNumber(base.lootFood[0])}-${Helpers.formatNumber(base.lootFood[1])}</span>
                        <span>⭐ ${base.xpReward} XP</span>
                    </div>
                    ${isLocked ? `<div class="battle-target-lock">🔒 Daraja ${base.requiredLevel} kerak</div>` : ''}
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    },

    _renderOnline(canBattle, total) {
        let html = `<div style="text-align:center; padding:20px; background:rgba(0,0,0,0.2); border-radius:12px; margin-bottom:15px;">`;
        
        if (!this.multiplayerMatch) {
            html += `
                <div style="font-size:48px; margin-bottom:15px;">🌍</div>
                <div style="color:#fff; font-size:16px; margin-bottom:10px; font-weight:bold;">Haqiqiy o'yinchilarga hujum qiling!</div>
                <div style="color:#aaa; font-size:12px; margin-bottom:20px;">Kuboklarni yutib oling va imperatorlar orasida 1-o'ringa chiqing.</div>
                <button class="btn btn-primary" onclick="BattlePanel.findMatch()" style="padding:15px 30px; font-size:16px;">
                    🔍 Raqib Qidirish (🪙 50)
                </button>
            `;
        } else {
            const m = this.multiplayerMatch;
            const lootG = m.level * 1000 + Math.floor(Math.random() * 500);
            const lootF = m.level * 1000 + Math.floor(Math.random() * 500);
            const canAttack = canBattle && total > 0;
            
            html += `
                <div style="font-size:14px; color:#aaa; margin-bottom:10px;">Raqib topildi:</div>
                <div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:12px; border:1px solid rgba(229,57,53,0.5); margin-bottom:20px;">
                    <div style="font-size:24px; font-weight:bold; color:#fff; margin-bottom:5px; font-family:'Cinzel',serif;">${m.name}</div>
                    <div style="color:#888; font-size:12px; margin-bottom:15px;">Daraja: ${m.level} | Yoshi: ${m.age}</div>
                    
                    <div style="display:flex; justify-content:space-around; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">
                        <div style="text-align:center;">
                            <div style="font-size:16px; margin-bottom:2px;">🏆</div>
                            <div style="font-size:14px; font-weight:bold; color:#ffd700;">${m.trophies}</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:16px; margin-bottom:2px;">🪙</div>
                            <div style="font-size:14px; font-weight:bold; color:#ffb300;">${lootG}</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:16px; margin-bottom:2px;">🍎</div>
                            <div style="font-size:14px; font-weight:bold; color:#f44336;">${lootF}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn btn-primary" onclick="BattlePanel.startOnlineBattle('${m.id}')" style="flex:1;" ${!canAttack ? 'disabled' : ''}>⚔️ Hujum!</button>
                    <button class="btn btn-danger" onclick="BattlePanel.findMatch()" style="flex:1;">🔄 Boshqa (🪙 50)</button>
                </div>
                ${!canAttack ? `<div style="color:#f44336; font-size:12px; margin-top:10px;">Askaringiz yo'q!</div>` : ''}
            `;
        }
        
        html += `</div>`;
        return html;
    },

    _renderResult() {
        const r = this.battleResult;
        const stars = '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
        
        return `
            <div class="battle-result ${r.victory ? 'victory' : 'defeat'}">
                <div class="battle-result-title">${r.victory ? '🏆 G\'ALABA!' : '💀 MAG\'LUBIYAT'}</div>
                <div class="battle-result-stars">${stars}</div>
                <div class="battle-result-base">${r.baseName}</div>
                
                <div class="battle-result-details">
                    ${r.goldLoot > 0 ? `<div class="result-row"><span>🪙 Oltin</span><span>+${Helpers.formatNumber(r.goldLoot)}</span></div>` : ''}
                    ${r.foodLoot > 0 ? `<div class="result-row"><span>🍎 Olma</span><span>+${Helpers.formatNumber(r.foodLoot)}</span></div>` : ''}
                    <div class="result-row"><span>⭐ XP</span><span>+${r.xp}</span></div>
                    <div class="result-row"><span>🏆 Kubok</span><span>${r.trophyChange > 0 ? '+' : ''}${r.trophyChange}</span></div>
                    <div class="result-row"><span>💀 Yo'qotish</span><span>${r.lossPercent}%</span></div>
                </div>
                
                <div class="battle-result-btn" onclick="BattlePanel.closeResult()">
                    ${r.victory ? '🎉 Yaxshi!' : '😤 Qaytadan!'}
                </div>
            </div>
        `;
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
        if (total === 0) {
            Toast.show("Askaringiz yo'q! Avval askar yarating.", 'error');
            return;
        }

        if (XPSystem.level < base.requiredLevel) {
            Toast.show(`Daraja ${base.requiredLevel} kerak!`, 'warning');
            return;
        }

        this.hide();
        BattleManager.startLiveBattle(baseId);
    },

    startOnlineBattle(opponentId) {
        AudioManager.playClick();
        if (!this.multiplayerMatch) return;

        if (!BattleSystem.canBattle()) {
            Toast.show(`⏳ Jang uchun kuting!`, 'warning');
            return;
        }

        const total = TroopManager.getTotal();
        if (total === 0) {
            Toast.show("Askaringiz yo'q! Avval askar yarating.", 'error');
            return;
        }

        this.hide();
        // Online jang uchun maxsus metod chaqiriladi
        BattleManager.startOnlineLiveBattle(this.multiplayerMatch);
    },

    closeResult() {
        this.battleResult = null;
        this.render();
    },

    _renderHistory() {
        const logs = BattleSystem.battleLog;
        if (logs.length === 0) {
            return `<div style="text-align:center; padding:40px 20px; color:#888;">
                <div style="font-size:48px; margin-bottom:15px;">📜</div>
                <div style="font-size:16px;">Hali jang qilinmagan</div>
                <div style="font-size:12px; margin-top:5px;">Hikoya yoki Multiplayer rejimida jang qiling!</div>
            </div>`;
        }

        let wins = 0, losses = 0, totalGold = 0, totalFood = 0;
        for (const l of logs) {
            if (l.victory) wins++; else losses++;
            totalGold += l.goldLoot || 0;
            totalFood += l.foodLoot || 0;
        }

        let html = `
            <div style="display:flex; justify-content:space-around; margin-bottom:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
                <div style="text-align:center;">
                    <div style="font-size:20px; font-weight:bold; color:#4caf50;">${wins}</div>
                    <div style="font-size:11px; color:#aaa;">G'alaba</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:20px; font-weight:bold; color:#f44336;">${losses}</div>
                    <div style="font-size:11px; color:#aaa;">Mag'lub</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:20px; font-weight:bold; color:#ffd700;">🪙 ${Helpers.formatNumber(totalGold)}</div>
                    <div style="font-size:11px; color:#aaa;">Jami o'lja</div>
                </div>
            </div>
            <div style="max-height:300px; overflow-y:auto;">
        `;

        for (const log of logs) {
            const timeAgo = this._timeAgo(log.time);
            const starsStr = '⭐'.repeat(log.stars) + '☆'.repeat(3 - log.stars);
            const trophyColor = log.trophyChange >= 0 ? '#4caf50' : '#f44336';
            const trophySign = log.trophyChange >= 0 ? '+' : '';
            
            html += `
                <div style="display:flex; align-items:center; padding:10px; margin-bottom:6px; background:${log.victory ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)'}; border-radius:8px; border-left:3px solid ${log.victory ? '#4caf50' : '#f44336'};">
                    <div style="flex:1;">
                        <div style="font-weight:bold; margin-bottom:3px;">${log.victory ? '⚔️' : '🛡️'} ${log.baseName || 'Noma\'lum'}</div>
                        <div style="font-size:11px;">${starsStr}</div>
                    </div>
                    <div style="text-align:right; font-size:12px;">
                        <div>🪙 +${Helpers.formatNumber(log.goldLoot || 0)}</div>
                        <div style="color:${trophyColor};">🏆 ${trophySign}${log.trophyChange || 0}</div>
                        <div style="color:#888; font-size:10px;">${timeAgo}</div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
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
