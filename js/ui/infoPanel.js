// ============================================
// INFO PANEL - Bino va to'siq ma'lumotlari
// ============================================

const InfoPanel = {
    currentBuilding: null,
    currentObstacle: null,

    show(building) {
        this.currentBuilding = building;
        this.currentObstacle = null;
        const panel = document.getElementById('info-panel');
        panel.classList.add('show');
        this.render();
    },

    showObstacle(obstacle) {
        this.currentObstacle = obstacle;
        this.currentBuilding = null;
        const panel = document.getElementById('info-panel');
        panel.classList.add('show');
        this.renderObstacle();
    },

    hide() {
        this.currentBuilding = null;
        this.currentObstacle = null;
        document.getElementById('info-panel').classList.remove('show');
    },

    renderObstacle() {
        const obs = this.currentObstacle;
        if (!obs) return;

        const od = OBSTACLE_DATA[obs.type];
        const panel = document.getElementById('info-panel');

        let html = `<div class="info-title">${od.icon} ${od.name}</div>`;

        // Pozitsiya
        html += `<div class="info-row"><span class="label">Pozitsiya</span><span class="value">(${obs.x}, ${obs.y})</span></div>`;
        html += `<div class="info-row"><span class="label">O'lcham</span><span class="value">${od.size[0]}x${od.size[1]}</span></div>`;

        // Olib tashlash narxi
        let costText = '';
        for (const [res, amt] of Object.entries(od.removeCost)) {
            const icons = { gold: '🪙', food: '🍎', diamond: '💎' };
            costText += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
        }
        html += `<div class="info-row"><span class="label">Olib tashlash</span><span class="value">${costText}</span></div>`;
        html += `<div class="info-row"><span class="label">Vaqt</span><span class="value">${Helpers.formatTime(od.removeTime)}</span></div>`;

        // Mukofotlar
        if (od.rewards) {
            let rewardText = '';
            if (od.rewards.xp) rewardText += `⭐ ${od.rewards.xp} XP `;
            if (od.rewards.diamond) rewardText += `💎 ${od.rewards.diamond} `;
            html += `<div class="info-row"><span class="label">Mukofot</span><span class="value">${rewardText}</span></div>`;
        }

        // Olib tashlash holati
        if (obs.removing && obs.timerId) {
            const rem = timerManager.getRemaining(obs.timerId);
            const prog = timerManager.getProgress(obs.timerId);
            const gemCost = Helpers.calcGemCost(rem);
            html += `<div class="info-row"><span class="label">Olib tashlanmoqda</span><span class="value">${Helpers.formatTime(rem)}</span></div>`;
            html += `<div class="build-progress"><div class="build-progress-fill" style="width:${prog * 100}%"></div></div>`;
            html += `<div class="info-buttons">
                <div class="info-btn" onclick="InfoPanel.speedUpObstacle()">💎 ${gemCost} Tezlashtirish</div>
            </div>`;
        } else {
            // Olib tashlash tugmasi
            html += `<div class="info-buttons">
                <div class="info-btn" onclick="InfoPanel.removeObstacle()">🪓 Olib tashlash</div>
            </div>`;
        }

        panel.innerHTML = html;
    },

    removeObstacle() {
        if (!this.currentObstacle) return;
        const result = ObstacleManager.startRemove(this.currentObstacle.id);
        if (result) {
            this.renderObstacle();
        }
    },

    speedUpObstacle() {
        if (!this.currentObstacle) return;
        ObstacleManager.speedUpRemove(this.currentObstacle.id);
        this.renderObstacle();
    },

    render() {
        const b = this.currentBuilding;
        if (!b) return;

        const bd = BUILDING_DATA[b.type];
        const lv = bd.levels[b.level];
        const panel = document.getElementById('info-panel');

        let html = `<div class="info-title">${bd.icon} ${bd.name} (Lvl ${b.level})</div>`;

        // HP
        const hpPercent = Math.round(b.hp / b.maxHp * 100);
        html += `<div class="info-row"><span class="label">HP</span><span class="value">${b.hp}/${b.maxHp} (${hpPercent}%)</span></div>`;

        // Ishlab chiqarish
        if (lv.production) {
            const resName = b.type === 'villa' ? 'Oltin' : b.type === 'farm' ? 'Olma' : 'Olma Oltin';
            html += `<div class="info-row"><span class="label">Ishlab chiqarish</span><span class="value">${lv.production}/min ${resName}</span></div>`;
        }

        // Sig'im
        if (lv.capacity) {
            html += `<div class="info-row"><span class="label">Sig'im</span><span class="value">${Helpers.formatNumber(lv.capacity)}</span></div>`;
        }

        // Mudofaa
        if (lv.damage) {
            html += `<div class="info-row"><span class="label">Zarar</span><span class="value">${lv.damage}</span></div>`;
            html += `<div class="info-row"><span class="label">Radius</span><span class="value">${lv.range} tile</span></div>`;
        }

        // Pozitsiya
        html += `<div class="info-row"><span class="label">Pozitsiya</span><span class="value">(${b.x}, ${b.y})</span></div>`;

        // Yig'ilmagan resurs
        if (b.storedResource >= 1) {
            const resIcon = b.type === 'villa' ? '🪙' : b.type === 'farm' ? '🍎' : '🍏';
            html += `<div class="info-row"><span class="label">Yig'ilmagan</span><span class="value">${resIcon} ${Math.floor(b.storedResource)}</span></div>`;
        }

        // Qurilish holati
        if (b.building && b.timerId) {
            const rem = timerManager.getRemaining(b.timerId);
            const prog = timerManager.getProgress(b.timerId);
            const gemCost = Helpers.calcGemCost(rem);
            html += `<div class="info-row"><span class="label">Qurilmoqda</span><span class="value">${Helpers.formatTime(rem)}</span></div>`;
            html += `<div class="build-progress"><div class="build-progress-fill" style="width:${prog * 100}%"></div></div>`;
            html += `<div class="info-buttons">
                <div class="info-btn" onclick="InfoPanel.speedUp()">💎 ${gemCost} Tezlashtirish</div>
            </div>`;
        } else {
            // Tugmalar
            html += '<div class="info-buttons">';

            // Yig'ish
            if (b.storedResource >= 1) {
                html += `<div class="info-btn" onclick="InfoPanel.collect()">📦 Yig'ish</div>`;
            }

            // Askar tayyorlash (Kazarma uchun)
            if (b.type === 'barracks') {
                html += `<div class="info-btn" onclick="InfoPanel.openArmyPanel()" style="background: linear-gradient(to bottom, #d4af37, #b8860b); color: #000; border-color: #ffd700;">⚔️ Askar Tayyorlash</div>`;
            }

            // Upgrade
            const nextLv = bd.levels[b.level + 1];
            if (nextLv) {
                let upgradeCost = '';
                for (const [res, amt] of Object.entries(nextLv.cost)) {
                    const icons = { gold: '🪙', food: '🍎', diamond: '💎', goldenApple: '🍏' };
                    upgradeCost += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
                }
                html += `<div class="info-btn" onclick="InfoPanel.upgrade()">⬆️ Upgrade (${upgradeCost})</div>`;
                
                // Vaqtsiz (Tezkor) Upgrade tugmasi
                const missingDiamonds = Resources.getMissingCostInDiamonds(nextLv.cost);
                const timerDiamonds = Helpers.calcGemCost(nextLv.time);
                const totalDiamonds = missingDiamonds + timerDiamonds;
                
                html += `<div class="info-btn" onclick="InfoPanel.instantUpgrade()" style="margin-left: 5px;">💎 ${totalDiamonds} Tezkor Upgrade</div>`;
            }

            html += '</div>';

            // Qo'shimcha tugmalar (ikkinchi qator)
            html += '<div class="info-buttons" style="margin-top:4px">';

            // Ko'chirish
            html += `<div class="info-btn" onclick="InfoPanel.moveBuilding()">🔄 Ko'chirish</div>`;

            // Olib tashlash (cityHall bo'lmasa)
            if (b.type !== 'cityHall') {
                html += `<div class="info-btn danger" onclick="InfoPanel.removeBuilding()">🗑️ Buzish</div>`;
            }

            html += '</div>';
        }

        panel.innerHTML = html;
    },

    openArmyPanel() {
        this.hide();
        ArmyPanel.toggle();
    },

    collect() {
        if (!this.currentBuilding) return;
        const amount = BuildingManager.collect(this.currentBuilding.id);
        if (amount > 0) {
            const resIcon = this.currentBuilding.type === 'villa' ? '🪙' : this.currentBuilding.type === 'farm' ? '🍎' : '🍏';
            Toast.show(`${resIcon} +${amount} yig'ildi!`, 'success');
        }
        this.render();
    },

    upgrade() {
        if (!this.currentBuilding) return;
        const result = BuildingManager.upgrade(this.currentBuilding.id);
        if (result) {
            const bd = BUILDING_DATA[this.currentBuilding.type];
            Toast.show(`${bd.icon} ${bd.name} yangilanmoqda...`, 'info');
        }
        this.render();
    },

    instantUpgrade() {
        if (!this.currentBuilding) return;
        const result = BuildingManager.instantUpgrade(this.currentBuilding.id);
        if (result) {
            // Toast building manager ichida ko'rsatiladi
            this.render();
        }
    },

    speedUp() {
        if (!this.currentBuilding) return;
        const result = BuildingManager.speedUp(this.currentBuilding.id);
        if (result) {
            Toast.show('💎 Qurilish tezlashtirildi!', 'success');
        } else {
            Toast.show('Olmos yetarli emas!', 'error');
        }
        this.render();
    },

    moveBuilding() {
        if (!this.currentBuilding) return;
        if (this.currentBuilding.building) {
            Toast.show('Qurilayotgan binoni ko\'chirib bo\'lmaydi!', 'warning');
            return;
        }
        BuildingManager.startDrag(this.currentBuilding.id);
        this.hide();
        Toast.show('🔄 Binoni yangi joyga surib qo\'ying', 'info');
    },

    removeBuilding() {
        if (!this.currentBuilding) return;
        if (this.currentBuilding.type === 'cityHall') return;

        const bd = BUILDING_DATA[this.currentBuilding.type];

        if (!confirm(`${bd.icon} ${bd.name} ni buzishni xohlaysizmi?\n\nNarxning 30% qaytariladi.`)) return;

        // Narxning 30% qaytarish
        const lv = bd.levels[this.currentBuilding.level];
        if (lv.cost) {
            for (const [res, amt] of Object.entries(lv.cost)) {
                Resources.add(res, Math.floor(amt * 0.3));
            }
        }

        BuildingManager.remove(this.currentBuilding.id);
        Toast.show(`🗑️ ${bd.name} buzildi!`, 'warning');
        this.hide();
    },

    // Har frame yangilash (progress bar uchun)
    update() {
        if (this.currentBuilding && this.currentBuilding.building) {
            this.render();
        }
        if (this.currentObstacle && this.currentObstacle.removing) {
            this.renderObstacle();
        }
    }
};
