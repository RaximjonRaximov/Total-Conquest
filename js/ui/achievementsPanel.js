// ============================================
// ACHIEVEMENTS PANEL — Yutuqlar paneli
// ============================================

const AchievementsPanel = {
    _tab: 'all',  // 'all' | 'build' | 'battle' | 'econ' | 'troops' | 'social'

    show() {
        AudioManager.playClick();
        let el = document.getElementById('achievements-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'achievements-panel';
            el.className = 'panel-container';
            document.body.appendChild(el);
        }
        el.classList.add('show');
        document.getElementById('modal-overlay').classList.add('show');
        document.getElementById('modal-overlay').onclick = () => this.hide();
        this._render(el);
    },

    hide() {
        const el = document.getElementById('achievements-panel');
        if (el) el.classList.remove('show');
        const overlay = document.getElementById('modal-overlay');
        if (overlay) { overlay.classList.remove('show'); overlay.onclick = null; }
    },

    setTab(tab) {
        this._tab = tab;
        const el = document.getElementById('achievements-panel');
        if (el) this._render(el);
    },

    _render(el) {
        const all     = AchievementSystem.getAll();
        const tab     = this._tab;
        const list    = tab === 'all' ? all : all.filter(a => a.cat === tab);
        const done    = all.filter(a => a.done).length;
        const total   = all.length;
        const pct     = Math.round(done / total * 100);

        const tabs = [
            { id: 'all',    label: '🌟 Barchasi' },
            { id: 'build',  label: '🏗️ Qurish' },
            { id: 'battle', label: '⚔️ Jang' },
            { id: 'econ',   label: '🪙 Resurs' },
            { id: 'troops', label: '🪖 Qo\'shin' },
            { id: 'social', label: '🤝 Ittifoq' },
        ];

        const tabsHtml = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">
            ${tabs.map(t => `
                <div onclick="AchievementsPanel.setTab('${t.id}')"
                     style="padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold;
                            ${t.id === tab
                                ? 'background:rgba(212,175,55,0.25);color:#ffd700;border:1px solid rgba(212,175,55,0.5);'
                                : 'background:rgba(255,255,255,0.05);color:#888;border:1px solid transparent;'}">
                    ${t.label}
                </div>`).join('')}
        </div>`;

        const rowsHtml = list.length === 0
            ? `<div style="text-align:center;color:#888;padding:20px;">Yutuq yo'q</div>`
            : list.map(a => {
                const pctDone = a.target > 0 ? Math.round(a.progress / a.target * 100) : 0;
                const rewardStr = Object.entries(a.reward)
                    .map(([k, v]) => `${k === 'gold' ? '🪙' : k === 'food' ? '🍎' : k === 'diamond' ? '💎' : '⭐'}${v}`)
                    .join(' ');
                return `<div style="display:flex;align-items:center;padding:9px 10px;margin-bottom:5px;
                                    background:${a.done ? 'rgba(76,175,80,0.08)' : 'rgba(255,255,255,0.04)'};
                                    border:1px solid ${a.done ? 'rgba(76,175,80,0.25)' : 'rgba(255,255,255,0.07)'};
                                    border-radius:8px;opacity:${a.done ? '1' : '0.85'};">
                    <div style="font-size:22px;margin-right:10px;flex-shrink:0;">${a.icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
                            <span style="font-size:12px;font-weight:bold;color:${a.done ? '#81c784' : '#fff'};">
                                ${a.name} ${a.done ? '✓' : ''}
                            </span>
                            <span style="font-size:10px;color:#888;">${rewardStr}</span>
                        </div>
                        <div style="font-size:10px;color:#888;margin-bottom:4px;">${a.desc}</div>
                        <div style="background:rgba(255,255,255,0.1);border-radius:3px;height:4px;overflow:hidden;">
                            <div style="height:100%;width:${a.done ? 100 : pctDone}%;
                                        background:${a.done ? '#4caf50' : '#ffd700'};
                                        border-radius:3px;transition:width 0.3s;"></div>
                        </div>
                        <div style="font-size:9px;color:#666;margin-top:2px;text-align:right;">
                            ${a.done ? 'Bajarildi!' : `${a.progress} / ${a.target}`}
                        </div>
                    </div>
                </div>`;
            }).join('');

        el.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">🏅 YUTUQLAR</div>
                <div class="panel-close" onclick="AchievementsPanel.hide()">✖</div>
            </div>
            <div class="panel-content" style="padding:10px;">
                <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:12px;color:#aaa;">Umumiy progress</span>
                        <span style="font-size:13px;font-weight:bold;color:#ffd700;">${done} / ${total}</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:6px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:linear-gradient(to right,#d4af37,#ffd700);
                                    border-radius:4px;"></div>
                    </div>
                </div>
                ${tabsHtml}
                <div style="max-height:360px;overflow-y:auto;padding-right:2px;">
                    ${rowsHtml}
                </div>
            </div>
        `;
    },
};
