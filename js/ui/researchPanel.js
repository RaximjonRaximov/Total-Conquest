// ============================================
// TADQIQOT PANELI (Research Panel UI)
// Temirchida ilm o'rganish
// ============================================

const ResearchPanel = {
    visible: false,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('research-panel');
        const overlay = document.getElementById('modal-overlay');
        if (this.visible) {
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
        }
    },

    hide() {
        this.visible = false;
        document.getElementById('research-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    render() {
        const panel = document.getElementById('research-panel');
        if (!panel) return;

        const bsLevel  = ResearchSystem.getBlacksmithLevel();
        const researches = ResearchSystem.getAvailable();
        const current  = ResearchSystem.currentResearch;

        const totalRes   = researches.length;
        const maxedCount = researches.filter(r => r.maxed).length;
        const overallPct = totalRes > 0 ? Math.round(maxedCount / totalRes * 100) : 0;

        // ── Header ────────────────────────────────────────────────────
        let html = `
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:12px 16px 10px;border-bottom:1px solid rgba(206,147,216,0.15);">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:20px;">🔬</span>
                    <div>
                        <div style="font-family:'Cinzel',serif;font-weight:700;font-size:14px;color:#ce93d8;">
                            TADQIQOT MARKAZI
                        </div>
                        <div style="font-size:10px;color:#777;margin-top:1px;">
                            Temirchi: ${bsLevel > 0 ? `<span style="color:#ffd700;">Lvl ${bsLevel}</span>` : '<span style="color:#f44336;">❌ Qurilmagan</span>'}
                            &nbsp;·&nbsp; ${maxedCount}/${totalRes} ilm
                        </div>
                    </div>
                </div>
            </div>

            <!-- Overall progress -->
            <div style="padding:8px 16px 6px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${overallPct}%;
                                    background:linear-gradient(90deg,#7b1fa2,#ce93d8);border-radius:3px;
                                    transition:width 0.5s;"></div>
                    </div>
                    <span style="font-size:9px;color:#9c27b0;min-width:28px;">${overallPct}%</span>
                </div>
            </div>
        `;

        // ── Active research card ──────────────────────────────────────
        if (current) {
            const rd       = RESEARCH_DATA[current.id] || {};
            const remaining = timerManager.getRemaining(current.timerId);
            const progress  = timerManager.getProgress(current.timerId);
            const gemCost   = Helpers.calcGemCost(remaining);
            const R = 22, circ = 2 * Math.PI * R;

            html += `
                <div style="margin:8px 16px;background:rgba(156,39,176,0.12);
                            border:1px solid rgba(156,39,176,0.35);border-radius:12px;padding:12px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <!-- Ring progress -->
                        <div style="position:relative;width:52px;height:52px;flex-shrink:0;">
                            <svg width="52" height="52" style="transform:rotate(-90deg);">
                                <circle cx="26" cy="26" r="${R}" fill="none"
                                        stroke="rgba(255,255,255,0.07)" stroke-width="4"/>
                                <circle cx="26" cy="26" r="${R}" fill="none"
                                        stroke="#ce93d8" stroke-width="4"
                                        stroke-dasharray="${circ * progress} ${circ * (1-progress)}"
                                        stroke-linecap="round"/>
                            </svg>
                            <div style="position:absolute;inset:0;display:flex;align-items:center;
                                        justify-content:center;font-size:18px;">${rd.icon || '🔬'}</div>
                        </div>

                        <div style="flex:1;min-width:0;">
                            <div style="font-size:12px;font-weight:700;color:#ce93d8;">${rd.name || current.id}</div>
                            <div style="font-size:10px;color:#777;margin-top:2px;">⏰ ${Helpers.formatTime(remaining)}</div>
                            <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;
                                        overflow:hidden;margin-top:6px;">
                                <div style="height:100%;width:${Math.round(progress*100)}%;
                                            background:linear-gradient(90deg,#7b1fa2,#e040fb);
                                            border-radius:2px;transition:width 0.4s;"></div>
                            </div>
                        </div>

                        <button onclick="ResearchPanel.speedUp()"
                                style="background:rgba(156,39,176,0.2);border:1px solid rgba(156,39,176,0.5);
                                       border-radius:8px;padding:6px 10px;color:#ce93d8;
                                       font-size:10px;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                            💎 ${gemCost}
                        </button>
                    </div>
                </div>
            `;
        }

        // ── Research grid by category ─────────────────────────────────
        const categories = {};
        for (const r of researches) {
            const cat = r.category || 'boshqa';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(r);
        }

        const catNames = {
            piyoda:   '⚔️ Piyoda',
            otishma:  '🏹 Otishma',
            otliq:    '🐴 Otliq',
            maxsus:   '🛠️ Maxsus',
            harakat:  '💨 Harakat',
            qurilish: '🏗️ Qurilish',
        };

        const bonusFmt = (stat, amt) => {
            const icons = { hp:'❤️', damage:'⚔️', speed:'💨', trainTime:'⏩', buildTimeReduction:'🏗️', buildCostReduction:'💰' };
            const icon = icons[stat] || '⚡';
            if (stat === 'speed' || stat === 'trainTime') return `${icon}+${Math.round(amt*100)}%`;
            if (stat.includes('Reduction')) return `${icon}-${Math.round(amt*100)}%`;
            return `${icon}+${amt}`;
        };

        html += `<div style="padding:8px 16px 16px;display:flex;flex-direction:column;gap:14px;">`;

        for (const [cat, items] of Object.entries(categories)) {
            const catMaxed = items.filter(r => r.maxed).length;
            html += `
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;
                                margin-bottom:8px;padding-bottom:5px;
                                border-bottom:1px solid rgba(255,255,255,0.06);">
                        <span style="font-size:11px;font-weight:700;color:#aaa;letter-spacing:0.5px;">
                            ${catNames[cat] || cat}
                        </span>
                        <span style="font-size:9px;color:#555;">${catMaxed}/${items.length}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">`;

            for (const r of items) {
                const isActive    = current && current.id === r.id;
                const canResearch = !current && !r.locked && !r.maxed && bsLevel > 0;
                const maxLevels   = r.levels ? Object.keys(r.levels).length : 1;

                // Cost affordability
                const canAfford = !r.locked && !r.maxed && r.nextLevelData?.cost
                    ? Object.entries(r.nextLevelData.cost).every(([res, amt]) =>
                        (typeof Resources !== 'undefined' ? Resources.get(res) || 0 : 0) >= amt)
                    : true;

                // Cost string
                const costStr = r.nextLevelData?.cost
                    ? Object.entries(r.nextLevelData.cost).map(([res, amt]) => {
                        const icons = { gold:'🪙', food:'🍎', diamond:'💎' };
                        const color = canAfford ? '#aaa' : '#ef5350';
                        return `<span style="color:${color}">${icons[res]||res} ${Helpers.formatNumber(amt)}</span>`;
                      }).join(' ')
                    : '';

                // Next bonus str
                const nextBonus = r.nextLevelData?.bonus
                    ? Object.entries(r.nextLevelData.bonus).slice(0,2).map(([s,a]) => bonusFmt(s,a)).join(' ')
                    : '';

                // Level dots
                const dots = Array.from({length: maxLevels}, (_, i) =>
                    `<span style="width:5px;height:5px;border-radius:50%;display:inline-block;margin:0 1px;
                                  background:${i < r.currentLevel ? '#ce93d8' : 'rgba(255,255,255,0.1)'};"></span>`
                ).join('');

                // Card state styling
                const cardBg  = r.maxed      ? 'rgba(156,39,176,0.08)'
                              : isActive      ? 'rgba(156,39,176,0.18)'
                              : r.locked      ? 'rgba(0,0,0,0.15)'
                              : canResearch && canAfford ? 'rgba(255,255,255,0.04)'
                              : 'rgba(255,255,255,0.02)';
                const cardBdr = r.maxed      ? 'rgba(156,39,176,0.5)'
                              : isActive      ? 'rgba(156,39,176,0.7)'
                              : r.locked      ? 'rgba(255,255,255,0.05)'
                              : canResearch && canAfford ? 'rgba(255,255,255,0.1)'
                              : 'rgba(255,255,255,0.05)';
                const glow    = isActive ? 'box-shadow:0 0 12px rgba(156,39,176,0.3);' : '';

                html += `
                    <div onclick="${canResearch && canAfford ? `ResearchPanel.startResearch('${r.id}')` : ''}"
                         style="background:${cardBg};border:1px solid ${cardBdr};border-radius:10px;
                                padding:10px 8px;text-align:center;${glow}
                                cursor:${canResearch && canAfford ? 'pointer' : 'default'};
                                opacity:${r.locked ? '0.45' : '1'};
                                transition:all 0.2s;">

                        <!-- Icon with active ring -->
                        <div style="position:relative;display:inline-block;margin-bottom:4px;">
                            <div style="font-size:24px;${isActive ? 'animation:achIconPulse 1.5s infinite;' : ''}
                                        filter:${r.locked ? 'grayscale(1)' : 'none'};">${r.icon}</div>
                            ${r.maxed ? `<div style="position:absolute;top:-4px;right:-4px;background:#9c27b0;
                                border-radius:50%;width:12px;height:12px;display:flex;align-items:center;
                                justify-content:center;font-size:7px;">✓</div>` : ''}
                        </div>

                        <!-- Name -->
                        <div style="font-size:10px;font-weight:700;color:${r.maxed?'#9c27b0':r.locked?'#555':'#ddd'};
                                    margin-bottom:4px;line-height:1.2;">${r.name}</div>

                        <!-- Level dots -->
                        <div style="margin-bottom:5px;">${dots}</div>

                        ${r.maxed
                            ? `<div style="font-size:9px;color:#9c27b0;font-weight:700;">✅ MAKSIMAL</div>`
                            : isActive
                                ? `<div style="font-size:9px;color:#ce93d8;">🔬 Tadqiqotda...</div>`
                                : r.locked
                                    ? `<div style="font-size:9px;color:#555;">🔒 BS Lvl${r.requiredBsLevel}</div>`
                                    : `
                                        ${nextBonus ? `<div style="font-size:9px;color:#a5d6a7;margin-bottom:3px;">${nextBonus}</div>` : ''}
                                        <div style="font-size:8px;line-height:1.4;">${costStr}</div>
                                        ${r.nextLevelData?.time ? `<div style="font-size:8px;color:#666;margin-top:2px;">⏱ ${Helpers.formatTime(r.nextLevelData.time)}</div>` : ''}
                                    `
                        }
                    </div>`;
            }

            html += `</div></div>`;
        }

        html += `</div>`;
        panel.innerHTML = html;
    },

    startResearch(id) {
        const result = ResearchSystem.startResearch(id);
        if (result) {
            this.render();
        }
    },

    speedUp() {
        const cur = ResearchSystem.currentResearch;
        if (!cur) return;
        const remaining = timerManager.getRemaining(cur.timerId);
        const gemCost   = Helpers.calcGemCost(remaining);
        const rd        = RESEARCH_DATA[cur.id] || {};

        if (typeof GemConfirm !== 'undefined') {
            GemConfirm.show({
                gemCost,
                title: 'Tadqiqotni tezlashtirish',
                icon: rd.icon || '🔬',
                timeLabel: `Tejaydi: ${Helpers.formatTime(remaining)}`,
                onConfirm: () => {
                    const result = ResearchSystem.speedUpResearch();
                    if (result) this.render();
                }
            });
        } else {
            const result = ResearchSystem.speedUpResearch();
            if (result) this.render();
        }
    },

    update() {
        if (this.visible && ResearchSystem.currentResearch) {
            this.render();
        }
    }
};
