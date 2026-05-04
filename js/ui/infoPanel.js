// ============================================
// INFO PANEL - Bino ma'lumotlari
// ============================================

const InfoPanel = {
    currentBuilding: null,

    show(building) {
        this.currentBuilding = building;
        const panel = document.getElementById('info-panel');
        panel.classList.add('show');
        this.render();
    },

    hide() {
        this.currentBuilding = null;
        document.getElementById('info-panel').classList.remove('show');
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

            // Upgrade
            const nextLv = bd.levels[b.level + 1];
            if (nextLv) {
                let upgradeCost = '';
                for (const [res, amt] of Object.entries(nextLv.cost)) {
                    const icons = { gold: '🪙', food: '🍎', diamond: '💎', goldenApple: '🍏' };
                    upgradeCost += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
                }
                const canAfford = Resources.canAfford(nextLv.cost);
                html += `<div class="info-btn" onclick="InfoPanel.upgrade()" ${!canAfford ? 'style="opacity:0.4"' : ''}>⬆️ Upgrade (${upgradeCost})</div>`;
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
        const bd = BUILDING_DATA[this.currentBuilding.type];
        const nextLv = bd.levels[this.currentBuilding.level + 1];
        if (nextLv && !Resources.canAfford(nextLv.cost)) {
            Toast.show('Resurslar yetarli emas!', 'error');
            return;
        }
        const result = BuildingManager.upgrade(this.currentBuilding.id);
        if (result) {
            Toast.show(`${bd.icon} ${bd.name} yangilanmoqda...`, 'info');
        }
        this.render();
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
    }
};
