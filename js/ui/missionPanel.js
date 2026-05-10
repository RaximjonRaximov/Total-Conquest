// ============================================
// KUNLIK MISSIYALAR PANELI
// ============================================

const MissionPanel = {
    visible: false,

    toggle() {
        this.visible = !this.visible;
        const modal   = document.getElementById('mission-modal');
        const overlay = document.getElementById('modal-overlay');
        if (this.visible) {
            this.render();
            requestAnimationFrame(() => modal.classList.add('show'));
            overlay.classList.add('show');
        } else {
            modal.classList.remove('show');
            overlay.classList.remove('show');
        }
    },

    hide() {
        this.visible = false;
        const modal = document.getElementById('mission-modal');
        if (modal) modal.classList.remove('show');
        document.getElementById('modal-overlay')?.classList.remove('show');
    },

    render() {
        const modal = document.getElementById('mission-modal');
        if (!modal || typeof DailyMissions === 'undefined') return;

        const msLeft  = DailyMissions.getTimeUntilRefresh();
        const hours   = Math.floor(msLeft / 3600000);
        const minutes = Math.floor((msLeft % 3600000) / 60000);
        const refreshStr = msLeft > 0 ? `${hours}s ${minutes}d` : 'Yangilanmoqda…';

        const missions   = DailyMissions.missions;
        const doneCount  = missions.filter(m => m.progress >= m.target).length;
        const claimCount = missions.filter(m => m.claimed).length;
        const totalDiam  = missions.reduce((s, m) => s + (m.reward?.diamond || 0), 0);
        const earnedDiam = missions.filter(m => m.claimed).reduce((s, m) => s + (m.reward?.diamond || 0), 0);
        const overallPct = missions.length > 0 ? Math.round(claimCount / missions.length * 100) : 0;

        // Summary header
        const summaryBg = doneCount === missions.length
            ? 'linear-gradient(135deg,rgba(255,215,0,0.2),rgba(139,105,20,0.3))'
            : 'rgba(0,0,0,0.3)';

        let rows = '';
        for (const m of missions) {
            const pct     = Math.min(1, m.progress / m.target);
            const done    = m.progress >= m.target;
            const claimed = m.claimed;
            const fillW   = Math.round(pct * 100);

            // Color scheme per state
            const barGrad = claimed   ? '#444'
                          : done      ? 'linear-gradient(90deg,#ffd700,#ff8c00)'
                          : 'linear-gradient(90deg,#7b1fa2,#9c27b0)';
            const cardBg  = claimed   ? 'rgba(255,255,255,0.02)'
                          : done      ? 'rgba(255,215,0,0.06)'
                          : 'rgba(255,255,255,0.04)';
            const cardBdr = claimed   ? 'rgba(255,255,255,0.05)'
                          : done      ? 'rgba(255,215,0,0.4)'
                          : 'rgba(255,255,255,0.08)';
            const glow    = done && !claimed ? 'box-shadow:0 0 12px rgba(255,215,0,0.15);' : '';

            const btnHtml = claimed
                ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                       <span style="font-size:14px;">✅</span>
                       <span style="color:#555;font-size:10px;font-weight:600;">Olindi</span>
                   </div>`
                : done
                    ? `<button onclick="MissionPanel.claim('${m.id}')"
                              style="background:linear-gradient(135deg,#d4af37,#ff8c00);
                                     border:none;border-radius:20px;padding:5px 12px;
                                     color:#000;font-weight:800;font-size:11px;cursor:pointer;
                                     white-space:nowrap;box-shadow:0 2px 8px rgba(255,215,0,0.4);
                                     animation:achIconPulse 1.5s infinite;">
                          💎 +${m.reward.diamond}
                      </button>`
                    : `<span style="color:#666;font-size:10px;white-space:nowrap;flex-shrink:0;">
                           ${m.progress}/${m.target}
                       </span>`;

            // Category icon
            const catIcon = m.type === 'battle'    ? '⚔️'
                          : m.type === 'build'     ? '🏗️'
                          : m.type === 'collect'   ? '💰'
                          : m.type === 'train'     ? '🪖'
                          : m.type === 'research'  ? '🔬'
                          : '📋';

            rows += `
                <div style="padding:10px 12px;background:${cardBg};
                            border:1px solid ${cardBdr};border-radius:12px;
                            margin-bottom:6px;${glow}
                            transition:all 0.2s;">

                    <!-- Top row: icon + text + button -->
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
                        <span style="font-size:16px;flex-shrink:0;">${catIcon}</span>
                        <span style="font-size:12px;color:${claimed ? '#555' : done ? '#ffe082' : '#ddd'};
                                     flex:1;line-height:1.3;
                                     text-decoration:${claimed ? 'line-through' : 'none'};">${m.text}</span>
                        ${btnHtml}
                    </div>

                    <!-- Progress bar -->
                    <div style="display:flex;align-items:center;gap:6px;">
                        <div style="flex:1;height:5px;background:rgba(255,255,255,0.08);
                                    border-radius:3px;overflow:hidden;">
                            <div style="height:100%;width:${fillW}%;
                                        background:${barGrad};border-radius:3px;
                                        transition:width 0.5s ease;
                                        ${done && !claimed ? 'box-shadow:0 0 6px rgba(255,215,0,0.5);' : ''}">
                            </div>
                        </div>
                        <span style="font-size:9px;color:${done ? '#ffd700' : '#666'};
                                     min-width:28px;text-align:right;font-weight:${done ? '700' : '400'};">
                            ${fillW}%
                        </span>
                    </div>
                </div>`;
        }

        const claimableCount = missions.filter(m => m.progress >= m.target && !m.claimed).length;
        const claimableGems  = missions.filter(m => m.progress >= m.target && !m.claimed)
                                       .reduce((s, m) => s + (m.reward?.diamond || 0), 0);

        modal.innerHTML = `
            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="font-family:'Cinzel',serif;font-weight:700;font-size:15px;color:var(--accent);">
                    📋 KUNLIK MISSIYALAR
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    ${claimableCount > 0 ? `
                    <button onclick="MissionPanel.claimAll()"
                            style="background:linear-gradient(135deg,#d4af37,#ff8c00);
                                   border:none;border-radius:14px;padding:5px 12px;
                                   color:#000;font-weight:800;font-size:11px;cursor:pointer;
                                   white-space:nowrap;box-shadow:0 2px 8px rgba(255,215,0,0.4);
                                   animation:achIconPulse 1.5s infinite;">
                        💎 +${claimableGems} Hammasini Ol
                    </button>` : ''}
                    <button onclick="MissionPanel.hide()"
                            style="background:none;border:none;color:#888;font-size:18px;cursor:pointer;">✕</button>
                </div>
            </div>

            <!-- Summary card -->
            <div style="background:${summaryBg};border:1px solid rgba(212,175,55,0.25);
                        border-radius:12px;padding:10px 14px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="font-size:11px;color:#aaa;">Kunlik progress</span>
                    <span style="font-size:10px;color:#666;">⏰ ${refreshStr}</span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
                    <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${overallPct}%;
                                    background:linear-gradient(90deg,#d4af37,#ffd700);border-radius:3px;
                                    transition:width 0.6s;"></div>
                    </div>
                    <span style="font-size:10px;color:#ffd700;font-weight:700;min-width:30px;">${overallPct}%</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;">
                    <span>✅ ${claimCount}/${missions.length} bajarildi</span>
                    <span>💎 ${earnedDiam}/${totalDiam} olindi</span>
                </div>
            </div>

            <!-- Mission rows -->
            ${rows}
        `;
    },

    claimAll() {
        if (typeof DailyMissions === 'undefined') return;
        const ready = DailyMissions.missions.filter(m => m.progress >= m.target && !m.claimed);
        if (!ready.length) { Toast.show('Hozirda talab qilinadigan missiya yo\'q', 'info'); return; }
        let totalGems = 0;
        for (const m of ready) {
            DailyMissions.claim(m.id);
            totalGems += m.reward?.diamond || 0;
        }
        if (totalGems > 0) Toast.show(`💎 +${totalGems} olmos olindi! (${ready.length} missiya)`, 'success');
        this.render();
        this.updateBadge();
    },

    claim(missionId) {
        if (typeof DailyMissions === 'undefined') return;
        DailyMissions.claim(missionId);
        this.render();
        this.updateBadge();
    },

    updateBadge() {
        if (typeof DailyMissions === 'undefined') return;
        const count = DailyMissions.getUnclaimedCount();
        const badge = document.getElementById('mission-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },
};
