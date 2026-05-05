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

        const bsLevel = ResearchSystem.getBlacksmithLevel();
        const researches = ResearchSystem.getAvailable();
        const current = ResearchSystem.currentResearch;

        let html = `
            <div class="research-title">📜 TADQIQOT</div>
            <div class="research-info">Temirchi: ${bsLevel > 0 ? `Lvl ${bsLevel}` : '❌ Qurilmagan'}</div>
        `;

        // Hozirgi tadqiqot
        if (current) {
            const rd = RESEARCH_DATA[current.id];
            const remaining = timerManager.getRemaining(current.timerId);
            const progress = timerManager.getProgress(current.timerId);
            const gemCost = Helpers.calcGemCost(remaining);

            html += `
                <div class="research-current">
                    <div class="research-current-title">🔬 Tadqiqot ketmoqda...</div>
                    <div class="research-current-name">${rd.icon} ${rd.name}</div>
                    <div class="build-progress"><div class="build-progress-fill" style="width:${progress * 100}%"></div></div>
                    <div class="research-current-time">${Helpers.formatTime(remaining)}</div>
                    <div class="research-speedup" onclick="ResearchPanel.speedUp()">💎 ${gemCost} Tezlashtirish</div>
                </div>
            `;
        }

        // Tadqiqotlar ro'yxati
        const categories = {};
        for (const r of researches) {
            if (!categories[r.category]) categories[r.category] = [];
            categories[r.category].push(r);
        }

        const catNames = {
            piyoda: '⚔️ Piyoda',
            otishma: '🏹 Otishma',
            otliq: '🐴 Otliq',
            maxsus: '🛠️ Maxsus'
        };

        for (const [cat, items] of Object.entries(categories)) {
            html += `<div class="research-category">${catNames[cat] || cat}</div>`;
            html += '<div class="research-grid">';

            for (const r of items) {
                const isActive = current && current.id === r.id;
                const canResearch = !current && !r.locked && !r.maxed && bsLevel > 0;
                let costText = '';
                if (r.nextLevelData && r.nextLevelData.cost) {
                    for (const [res, amt] of Object.entries(r.nextLevelData.cost)) {
                        const icons = { gold: '🪙', food: '🍎', diamond: '💎' };
                        costText += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
                    }
                }

                let bonusText = '';
                if (r.nextLevelData && r.nextLevelData.bonus) {
                    for (const [stat, amt] of Object.entries(r.nextLevelData.bonus)) {
                        bonusText += `${stat === 'hp' ? '❤️' : '⚡'}+${amt} `;
                    }
                }

                html += `
                    <div class="research-item ${r.locked ? 'locked' : ''} ${r.maxed ? 'maxed' : ''} ${isActive ? 'active' : ''} ${!canResearch ? 'disabled' : ''}"
                         ${canResearch ? `onclick="ResearchPanel.startResearch('${r.id}')"` : ''}>
                        <div class="research-item-icon">${r.icon}</div>
                        <div class="research-item-name">${r.name}</div>
                        <div class="research-item-level">Lvl ${r.currentLevel}${r.maxed ? ' (MAX)' : ` → ${r.nextLevel}`}</div>
                        ${!r.maxed ? `<div class="research-item-bonus">${bonusText}</div>` : ''}
                        ${!r.maxed ? `<div class="research-item-cost">${costText}</div>` : ''}
                        ${!r.maxed && r.nextLevelData ? `<div class="research-item-time">⏱️ ${Helpers.formatTime(r.nextLevelData.time)}</div>` : ''}
                        ${r.locked ? `<div class="research-item-lock">Temirchi Lvl ${r.requiredBsLevel}</div>` : ''}
                    </div>
                `;
            }

            html += '</div>';
        }

        panel.innerHTML = html;
    },

    startResearch(id) {
        const result = ResearchSystem.startResearch(id);
        if (result) {
            this.render();
        }
    },

    speedUp() {
        const result = ResearchSystem.speedUpResearch();
        if (result) this.render();
    },

    update() {
        if (this.visible && ResearchSystem.currentResearch) {
            this.render();
        }
    }
};
