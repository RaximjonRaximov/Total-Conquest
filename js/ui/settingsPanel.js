// ============================================
// SOZLAMALAR PANELI (Settings)
// ============================================

const SettingsPanel = {
    visible: false,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('settings-panel');
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
        document.getElementById('settings-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    render() {
        const panel = document.getElementById('settings-panel');
        if (!panel) return;

        const lastSave = SaveSystem.getLastSaveTime();
        const lastSaveText = lastSave ? new Date(lastSave).toLocaleString('uz') : 'Saqlanmagan';
        const obstacleCount = Object.keys(ObstacleManager.obstacles).length;

        panel.innerHTML = `
            <div class="settings-title">⚙️ SOZLAMALAR</div>

            <div class="settings-section">
                <div class="settings-section-title">💾 Saqlash</div>
                <div class="settings-info">Oxirgi: ${lastSaveText}</div>
                <div class="settings-buttons">
                    <div class="settings-btn" onclick="SettingsPanel.saveGame()">💾 Saqlash</div>
                    <div class="settings-btn" onclick="SettingsPanel.loadGame()">📂 Yuklash</div>
                    <div class="settings-btn danger" onclick="SettingsPanel.resetGame()">🗑️ O'chirish</div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-section-title">📊 Statistika</div>
                <div class="settings-stat-grid">
                    <div class="settings-stat">
                        <span class="stat-label">Daraja</span>
                        <span class="stat-value">${XPSystem.level}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Unvon</span>
                        <span class="stat-value" style="font-size:10px">${XPSystem.getRankName()}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">XP</span>
                        <span class="stat-value">${Helpers.formatNumber(XPSystem.xp)}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Binolar</span>
                        <span class="stat-value">${Object.keys(BuildingManager.buildings).length}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">TH daraja</span>
                        <span class="stat-value">${Game.townHallLevel}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Askarlar</span>
                        <span class="stat-value">${TroopManager.getTotal()}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">🏆 Kubok</span>
                        <span class="stat-value">${BattleSystem.trophies}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">To'siqlar</span>
                        <span class="stat-value">${obstacleCount}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Quruvchi</span>
                        <span class="stat-value">${BuilderSystem.totalBuilders}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Oltin</span>
                        <span class="stat-value">${Helpers.formatNumber(Resources.gold)}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Olma</span>
                        <span class="stat-value">${Helpers.formatNumber(Resources.food)}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Olmos</span>
                        <span class="stat-value">${Helpers.formatNumber(Resources.diamond)}</span>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-section-title">👷 Quruvchi</div>
                <div class="settings-info">Hozirgi: ${BuilderSystem.totalBuilders} ta quruvchi (${BuilderSystem.totalBuilders - BuilderSystem.busyBuilders} ta bo'sh)</div>
                ${BuilderSystem.getNextBuilderCost() !== null ? `
                    <div class="settings-buttons">
                        <div class="settings-btn" onclick="SettingsPanel.buyBuilder()">💎 ${BuilderSystem.getNextBuilderCost()} — Yangi quruvchi</div>
                    </div>
                ` : '<div class="settings-info" style="color:#4caf50">Maksimal quruvchi soni!</div>'}
            </div>

            <div class="settings-section">
                <div class="settings-section-title">🔊 Ovoz Sozlamalari</div>
                <div class="settings-buttons">
                    <div class="settings-btn ${AudioManager.enabled ? '' : 'danger'}" onclick="SettingsPanel.toggleAudio()">
                        ${AudioManager.enabled ? '🔊 Ovoz Yonik' : '🔇 Ovoz O\'chiq'}
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-section-title">ℹ️ Haqida</div>
                <div class="settings-about">
                    <div>Total Conquest — Rim Imperiyasi</div>
                    <div style="color:#888;font-size:10px;margin-top:4px">v2.0 | 2026</div>
                </div>
            </div>
        `;
    },

    toggleAudio() {
        AudioManager.toggle();
        AudioManager.playClick();
        this.render();
    },

    buyBuilder() {
        BuilderSystem.buyBuilder();
        this.render();
    },

    saveGame() {
        const result = SaveSystem.save();
        if (result) {
            Toast.show('O\'yin saqlandi!', 'success');
            this.render();
        } else {
            Toast.show('Saqlashda xato!', 'error');
        }
    },

    loadGame() {
        if (!SaveSystem.hasSave()) {
            Toast.show('Saqlangan o\'yin topilmadi!', 'warning');
            return;
        }

        const result = SaveSystem.load();
        if (result) {
            Resources.updateDisplay();
            XPSystem.updateDisplay();
            BuilderSystem.updateDisplay();
            document.getElementById('th-display').textContent = 'Town Hall: Lvl ' + Game.townHallLevel;
            Toast.show('O\'yin yuklandi!', 'success');
            this.hide();
        } else {
            Toast.show('Yuklashda xato!', 'error');
        }
    },

    resetGame() {
        if (!confirm('Haqiqatan ham o\'yinni qayta boshlashni xohlaysizmi?\n\nBarcha ma\'lumotlar o\'chiriladi!')) return;

        SaveSystem.deleteSave();
        location.reload();
    }
};
