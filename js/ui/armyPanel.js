// ============================================
// ASKAR PANELI (Army Panel)
// Kazarmada askar yaratish, armiyani ko'rish
// ============================================

const ArmyPanel = {
    visible: false,
    activeTab: 'train',  // 'train' | 'army'
    selectedBarracks: null,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('army-panel');
        const overlay = document.getElementById('modal-overlay');
        if (this.visible) {
            this.selectedBarracks = this._findBarracks();
            TroopManager.updateCapacity();
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
        document.getElementById('army-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _findBarracks() {
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'barracks' && !b.building) return b;
        }
        return null;
    },

    setTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    render() {
        const panel = document.getElementById('army-panel');
        if (!panel) return;

        const barracks = this.selectedBarracks;
        const barracksLevel = barracks ? barracks.level : 0;
        const total = TroopManager.getTotal();
        const queueTotal = TroopManager.getQueueTotal();
        const maxTroops = TroopManager.maxTroops;

        let html = `
            <div class="army-panel-title">⚔️ ASKARLAR</div>
            <div class="army-capacity">
                <span>Armiya: ${total}/${maxTroops}</span>
                ${queueTotal > 0 ? `<span class="army-queue-count">(+${queueTotal} navbatda)</span>` : ''}
            </div>
            <div class="army-tabs">
                <div class="army-tab ${this.activeTab === 'train' ? 'active' : ''}" onclick="ArmyPanel.setTab('train')">🏋️ Yaratish</div>
                <div class="army-tab ${this.activeTab === 'army' ? 'active' : ''}" onclick="ArmyPanel.setTab('army')">🛡️ Armiya</div>
            </div>
        `;

        if (this.activeTab === 'train') {
            html += this._renderTrainTab(barracks, barracksLevel, total, queueTotal, maxTroops);
        } else {
            html += this._renderArmyTab();
        }

        panel.innerHTML = html;
    },

    _renderTrainTab(barracks, barracksLevel, total, queueTotal, maxTroops) {
        if (!barracks) {
            return `<div class="army-empty">
                <div style="font-size:32px;margin-bottom:8px">🏗️</div>
                <div>Kazarma qurib, askar yarating!</div>
            </div>`;
        }

        let html = `<div class="army-barracks-info">Kazarma Lvl ${barracksLevel}</div>`;

        // Navbat
        const queue = TroopManager.getQueue(barracks.id);
        if (queue.length > 0) {
            html += '<div class="army-queue">';
            html += '<div class="army-queue-title">📋 Navbat:</div>';
            for (let i = 0; i < queue.length; i++) {
                const q = queue[i];
                const td = TROOP_DATA[q.type];
                const remaining = timerManager.getRemaining(q.timerId);
                const progress = timerManager.getProgress(q.timerId);
                html += `<div class="army-queue-item">
                    <span>${td.icon} ${td.name}</span>
                    ${i === 0 ? `<div class="army-queue-progress"><div class="army-queue-fill" style="width:${progress*100}%"></div></div>
                    <span class="army-queue-time">${Helpers.formatTime(remaining)}</span>` : ''}
                </div>`;
            }
            html += `<div style="display:flex; gap:5px; margin-top:5px;">`;
            // Tezlashtirish tugmasi (birinchi askar uchun)
            if (queue[0] && queue[0].timerId) {
                const rem = timerManager.getRemaining(queue[0].timerId);
                const gemCost = Helpers.calcGemCost(rem);
                if (gemCost > 0) {
                    html += `<div class="army-queue-cancel" onclick="ArmyPanel.speedUpTrain()" style="background:rgba(0,188,212,0.3); border-color:#00bcd4;">💎 ${gemCost} Tezlashtirish</div>`;
                }
            }
            html += `<div class="army-queue-cancel" onclick="ArmyPanel.cancelTrain()">❌ Bekor qilish</div>`;
            html += `</div>`;
            html += '</div>';
        }

        // Askarlar ro'yxati
        const available = TroopManager.getAvailableTroops(barracksLevel);
        const full = total + queueTotal >= maxTroops;

        html += '<div class="army-troops-grid">';
        for (const troop of available) {
            let costText = '';
            for (const [res, amt] of Object.entries(troop.cost)) {
                const icons = { gold: '🪙', food: '🍎', diamond: '💎' };
                costText += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
            }

            const canAfford = Resources.canAfford(troop.cost);
            const hasDiamonds = Resources.diamond >= Resources.getMissingCostInDiamonds(troop.cost);
            const disabled = full || (!canAfford && !hasDiamonds);

            html += `<div class="army-troop-item ${disabled ? 'disabled' : ''} ${!canAfford && hasDiamonds ? 'diamond-buy' : ''}" ${!disabled ? `onclick="ArmyPanel.trainTroop('${troop.type}')"` : ''}>
                <div class="army-troop-icon">${troop.icon}</div>
                <div class="army-troop-name">${troop.name}</div>
                <div class="army-troop-stats">
                    <span>❤️${troop.stats.hp}</span>
                    <span>⚡${troop.stats.damage}</span>
                </div>
                <div class="army-troop-cost">${costText}</div>
                ${!canAfford && hasDiamonds ? `<div class="army-troop-cost" style="color:#00bcd4;">💎 olmos bilan</div>` : ''}
                <div class="army-troop-time">⏱️ ${Helpers.formatTime(troop.time)}</div>
            </div>`;
        }

        // Locked askarlar
        for (const [type, data] of Object.entries(TROOP_DATA)) {
            if (data.unlockBarracks > barracksLevel) {
                html += `<div class="army-troop-item disabled locked-troop">
                    <div class="army-troop-icon">🔒</div>
                    <div class="army-troop-name">${data.name}</div>
                    <div class="army-troop-cost">Kazarma Lvl ${data.unlockBarracks}</div>
                </div>`;
            }
        }

        html += '</div>';
        return html;
    },

    _renderArmyTab() {
        const army = TroopManager.army;
        const entries = Object.entries(army).filter(([_, count]) => count > 0);

        if (entries.length === 0) {
            return `<div class="army-empty">
                <div style="font-size:32px;margin-bottom:8px">🏕️</div>
                <div>Hali askaringiz yo'q.</div>
                <div style="font-size:11px;color:#888;margin-top:4px">Kazarmada askar yarating!</div>
            </div>`;
        }

        let html = '<div class="army-list">';
        let totalHP = 0, totalDMG = 0;

        for (const [type, count] of entries) {
            const data = TROOP_DATA[type];
            if (!data) continue;
            totalHP += data.stats.hp * count;
            totalDMG += data.stats.damage * count;

            html += `<div class="army-list-item">
                <div class="army-list-icon">${data.icon}</div>
                <div class="army-list-info">
                    <div class="army-list-name">${data.name}</div>
                    <div class="army-list-stats">❤️${data.stats.hp} ⚡${data.stats.damage}</div>
                </div>
                <div class="army-list-count">x${count}</div>
            </div>`;
        }

        html += '</div>';
        html += `<div class="army-total-stats">
            <span>Jami kuch: ❤️${Helpers.formatNumber(totalHP)} | ⚡${Helpers.formatNumber(totalDMG)}</span>
        </div>`;
        return html;
    },

    trainTroop(type) {
        if (!this.selectedBarracks) return;
        const result = TroopManager.train(type, this.selectedBarracks.id);
        if (result) {
            this.render();
        } else {
            Toast.show('Askar yaratib bo\'lmadi!', 'error');
        }
    },

    cancelTrain() {
        if (!this.selectedBarracks) return;
        TroopManager.cancelLast(this.selectedBarracks.id);
        this.render();
    },

    // Olmos bilan navbatni tezlashtirish
    speedUpTrain() {
        if (!this.selectedBarracks) return;
        const queue = TroopManager.getQueue(this.selectedBarracks.id);
        if (!queue || queue.length === 0 || !queue[0].timerId) return;

        const rem = timerManager.getRemaining(queue[0].timerId);
        const gemCost = Helpers.calcGemCost(rem);

        if (!Resources.spend('diamond', gemCost)) {
            Toast.show("Olmos yetarli emas!", "error");
            return;
        }
        
        timerManager.instant(queue[0].timerId);
        Toast.show("💎 Askar darhol tayyor!", "success");
        this.render();
    },

    // Har 1 soniyada yangilash (queue progress)
    update() {
        if (this.visible && this.activeTab === 'train') {
            this.render();
        }
    }
};
