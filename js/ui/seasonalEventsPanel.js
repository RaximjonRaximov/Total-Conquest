// ============================================
// SEASONAL EVENTS PANEL UI
// ============================================

const SeasonalEventsPanel = {
    visible: false,

    toggle() {
        this.visible = !this.visible;
        const overlay = document.getElementById('modal-overlay');
        if (this.visible) {
            AudioManager.playClick?.();
            this._createOrShow();
            overlay.classList.add('show');
        } else {
            this._hide();
        }
    },

    hide() {
        this.visible = false;
        this._hide();
    },

    _hide() {
        const el = document.getElementById('seasonal-panel');
        if (el) el.classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _createOrShow() {
        let el = document.getElementById('seasonal-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'seasonal-panel';
            el.className = 'panel-container';
            document.body.appendChild(el);
        }
        this._render(el);
        el.classList.add('show');
    },

    _render(el) {
        const ev = SeasonalEvents.getActive();

        if (!el) el = document.getElementById('seasonal-panel');
        if (!el) return;

        if (!ev) {
            el.innerHTML = `
                <div class="panel-header">
                    <div class="panel-title">🌟 MAVSUMIY VOQEALAR</div>
                    <div class="panel-close" onclick="SeasonalEventsPanel.hide()">✖</div>
                </div>
                <div class="panel-content" style="text-align:center;padding:40px;">
                    <div style="font-size:40px;margin-bottom:12px;">🌙</div>
                    <div style="color:#888;">Hozirda aktiv voqea yo'q.<br>Tez kunda yangi voqea!</div>
                </div>`;
            return;
        }

        SeasonalEvents.syncFromAchievements();
        const state = ev.state;
        const timeStr = Helpers.formatTime(Math.floor(ev.timeLeft / 1000));
        const claimedCount = Object.keys(state.claimed || {}).length;
        const totalCount   = ev.challenges.length;
        const allDone      = claimedCount >= totalCount;

        let challengesHtml = ev.challenges.map(ch => {
            const progress = state.progress[ch.id] ?? 0;
            const claimed  = !!(state.claimed?.[ch.id]);
            const done     = progress >= ch.target;
            const pct      = Math.min(100, Math.round((progress / ch.target) * 100));

            const rewardParts = [];
            if (ch.reward.gold)       rewardParts.push(`🪙${Helpers.formatNumber(ch.reward.gold)}`);
            if (ch.reward.food)       rewardParts.push(`🍎${Helpers.formatNumber(ch.reward.food)}`);
            if (ch.reward.diamond)    rewardParts.push(`💎${ch.reward.diamond}`);
            if (ch.reward.goldenApple) rewardParts.push(`🍏${ch.reward.goldenApple}`);

            const bg = claimed ? 'rgba(76,175,80,0.1)' : done ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)';
            const border = claimed ? 'rgba(76,175,80,0.4)' : done ? `${ev.color}66` : 'rgba(255,255,255,0.08)';

            return `
                <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:10px 12px;margin-bottom:8px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <div style="font-size:12px;font-weight:bold;color:${claimed ? '#4caf50' : done ? ev.color : '#ccc'};">
                            ${claimed ? '✅ ' : done ? '🎁 ' : ''}${ch.name}
                        </div>
                        <div style="font-size:10px;color:#888;">${rewardParts.join(' ')}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;background:rgba(255,255,255,0.08);border-radius:3px;height:5px;">
                            <div style="width:${pct}%;height:100%;border-radius:3px;
                                        background:${claimed ? '#4caf50' : done ? ev.color : '#888'};transition:width 0.3s;"></div>
                        </div>
                        <div style="font-size:10px;color:#888;white-space:nowrap;">
                            ${Math.min(progress, ch.target)}/${ch.target}
                        </div>
                        ${done && !claimed
                            ? `<button onclick="SeasonalEventsPanel._claim('${ch.id}')"
                                       style="background:${ev.color};color:#000;border:none;border-radius:5px;
                                              padding:3px 8px;font-size:10px;font-weight:bold;cursor:pointer;">
                                   Olish!
                               </button>`
                            : `<div style="width:48px;"></div>`
                        }
                    </div>
                </div>`;
        }).join('');

        el.innerHTML = `
            <div class="panel-header" style="border-bottom:1px solid ${ev.color}40;">
                <div class="panel-title" style="color:${ev.color};">${ev.icon} ${ev.name}</div>
                <div class="panel-close" onclick="SeasonalEventsPanel.hide()">✖</div>
            </div>
            <div class="panel-content">
                <!-- Event info -->
                <div style="background:linear-gradient(135deg,${ev.color}15,rgba(0,0,0,0.4));
                            border:1px solid ${ev.color}40;border-radius:10px;padding:12px;margin-bottom:12px;">
                    <div style="font-size:12px;color:#ccc;margin-bottom:8px;">${ev.description}</div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;">
                        <div>
                            <span style="color:#888;">Qolgan vaqt: </span>
                            <span style="color:${ev.color};font-weight:bold;">⏱️ ${timeStr}</span>
                        </div>
                        <div>
                            <span style="color:#888;">Bajarildi: </span>
                            <span style="color:${allDone ? '#4caf50' : '#fff'};font-weight:bold;">${claimedCount}/${totalCount}</span>
                        </div>
                    </div>
                    <div style="margin-top:8px;background:rgba(0,0,0,0.3);border-radius:4px;padding:6px 10px;
                                font-size:11px;color:${ev.color};font-weight:bold;text-align:center;">
                        🎯 Aktiv Bonus: ${ev.bonus.label}
                    </div>
                </div>

                <!-- Progress bar overall -->
                <div style="margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;margin-bottom:4px;">
                        <span>Umumiy progress</span>
                        <span>${claimedCount}/${totalCount}</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:6px;">
                        <div style="width:${Math.round(claimedCount/totalCount*100)}%;height:100%;
                                    border-radius:4px;background:${ev.color};transition:width 0.4s;"></div>
                    </div>
                </div>

                <!-- Challenges -->
                <div style="font-size:12px;color:#888;font-weight:bold;margin-bottom:8px;">📋 Vazifalar</div>
                ${challengesHtml}
            </div>`;
    },

    _claim(challengeId) {
        const ok = SeasonalEvents.claimChallenge(challengeId);
        if (ok) {
            const el = document.getElementById('seasonal-panel');
            if (el) this._render(el);
            SeasonalEvents.updateHUD();
        }
    },
};
