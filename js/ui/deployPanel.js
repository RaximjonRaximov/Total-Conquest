// ============================================
// DEPLOY PANEL - Jangda askarlarni tushirish
// ============================================

const DeployPanel = {
    selectedTroop: null,

    show() {
        let panel = document.getElementById('deploy-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'deploy-panel';
            document.body.appendChild(panel);
        }
        panel.style.display = 'flex';
        this.selectedTroop = null;
        this.update();
    },

    hide() {
        const panel = document.getElementById('deploy-panel');
        if (panel) panel.style.display = 'none';
        
        const resultPanel = document.getElementById('battle-result-modal');
        if (resultPanel) resultPanel.style.display = 'none';
    },

    update() {
        if (Game.mode !== 'attack') return;
        
        const panel = document.getElementById('deploy-panel');
        if (!panel) return;

        let html = `
            <div class="deploy-header">
                <div class="deploy-loot">
                    <span>🪙 O'lja: ${Helpers.formatNumber(BattleManager.lootAvailable.gold - BattleManager.lootGained.gold)}</span>
                    <span>🍎 O'lja: ${Helpers.formatNumber(BattleManager.lootAvailable.food - BattleManager.lootGained.food)}</span>
                </div>
                <div class="deploy-progress">
                    <span>Vayronagarchilik: ${Math.floor((BattleManager.destroyedCount / BattleManager.totalBuildings) * 100)}%</span>
                </div>
                <div class="deploy-btn-end" onclick="BattleManager.endBattle()">Jangni Yakunlash</div>
            </div>
            <div class="deploy-troops">
        `;

        for (const [type, count] of Object.entries(BattleManager.availableTroops)) {
            if (count <= 0) continue;
            
            const data = TROOP_DATA[type];
            const isSelected = this.selectedTroop === type;
            
            html += `
                <div class="deploy-troop ${isSelected ? 'selected' : ''}" onclick="DeployPanel.selectTroop('${type}')">
                    <div class="deploy-troop-icon">${data.icon}</div>
                    <div class="deploy-troop-count">x${count}</div>
                </div>
            `;
        }

        if (Object.values(BattleManager.availableTroops).every(c => c === 0)) {
            html += `<div style="color:#aaa; font-size:12px; margin:auto">Barcha askarlar tushirildi!</div>`;
        }

        html += `</div>`;
        panel.innerHTML = html;
    },

    selectTroop(type) {
        if (BattleManager.availableTroops[type] > 0) {
            this.selectedTroop = type;
            this.update();
        }
    },

    handleClick(x, y) {
        if (!this.selectedTroop) {
            Toast.show("Askar tanlang!", "warning");
            return;
        }
        
        if (BattleManager.deployTroop(this.selectedTroop, x, y)) {
            // Agar askar qolmasa, tanlovni bekor qilish
            if (BattleManager.availableTroops[this.selectedTroop] <= 0) {
                this.selectedTroop = null;
                this.update();
            }
        }
    },

    showResult(victory, stars, loot, percent, xp, trophies) {
        let modal = document.getElementById('battle-result-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'battle-result-modal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const starHtml = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        
        modal.innerHTML = `
            <div class="battle-result-box ${victory ? 'victory' : 'defeat'}">
                <div class="br-title">${victory ? '🏆 G\'ALABA!' : '💀 MAG\'LUBIYAT'}</div>
                <div class="br-stars">${starHtml}</div>
                <div class="br-percent">Vayronagarchilik: ${percent}%</div>
                
                <div class="br-loot">
                    <div class="br-row"><span>🪙 Oltin</span><span>+${Helpers.formatNumber(loot.gold)}</span></div>
                    <div class="br-row"><span>🍎 Olma</span><span>+${Helpers.formatNumber(loot.food)}</span></div>
                    <div class="br-row"><span>⭐ XP</span><span>+${xp}</span></div>
                    <div class="br-row"><span>🏆 Kubok</span><span>${trophies > 0 ? '+' : ''}${trophies}</span></div>
                </div>
                
                <div class="br-btn" onclick="BattleManager.returnHome()">Uyga Qaytish</div>
            </div>
        `;
        
        modal.style.display = 'block';
    }
};
