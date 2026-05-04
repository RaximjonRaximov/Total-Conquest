// ============================================
// QURISH MENYUSI (Build Menu)
// ============================================

const BuildMenu = {
    visible: false,
    placing: false,
    placingType: null,
    activeTab: 'iqtisod',

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('build-menu');
        const overlay = document.getElementById('modal-overlay');
        if (this.visible) {
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
            this.cancelPlacing();
        }
    },

    hide() {
        this.visible = false;
        document.getElementById('build-menu').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
        this.cancelPlacing();
    },

    setTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    render() {
        const container = document.getElementById('build-grid');
        const tabsEl = document.getElementById('build-tabs');
        if (!container) return;

        // Tablar
        tabsEl.innerHTML = '';
        for (const [key, name] of Object.entries(CATEGORY_NAMES)) {
            const btn = document.createElement('div');
            btn.className = 'build-tab' + (this.activeTab === key ? ' active' : '');
            btn.textContent = name;
            btn.onclick = () => this.setTab(key);
            tabsEl.appendChild(btn);
        }

        // Binolar
        container.innerHTML = '';
        for (const [type, bd] of Object.entries(BUILDING_DATA)) {
            if (bd.category !== this.activeTab) continue;

            const thReq = bd.thRequired || 1;
            const locked = Game.townHallLevel < thReq;
            const count = BuildingManager.countType(type);
            const maxed = count >= bd.maxCount;
            const lvData = bd.levels[1];

            const item = document.createElement('div');
            item.className = 'build-item' + (locked || maxed ? ' locked' : '');

            let costText = '';
            if (lvData.cost) {
                for (const [res, amt] of Object.entries(lvData.cost)) {
                    const icons = { gold: '🪙', food: '🍎', diamond: '💎', goldenApple: '🍏' };
                    costText += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
                }
            }
            if (!costText) costText = 'Bepul';

            let statusText = '';
            if (locked) statusText = `TH ${thReq} kerak`;
            else if (maxed) statusText = `Max (${bd.maxCount})`;
            else statusText = `${count}/${bd.maxCount}`;

            item.innerHTML = `
                <div class="build-item-icon">${bd.icon}</div>
                <div class="build-item-name">${bd.name}</div>
                <div class="build-item-cost">${costText}</div>
                <div class="build-item-time">${locked ? statusText : Helpers.formatTime(lvData.time) + ' | ' + statusText}</div>
            `;

            if (!locked && !maxed) {
                item.onclick = () => this.startPlacing(type);
            }

            container.appendChild(item);
        }
    },

    startPlacing(type) {
        this.placing = true;
        this.placingType = type;
        this.hide();
    },

    cancelPlacing() {
        this.placing = false;
        this.placingType = null;
    },

    placeBuilding(tileX, tileY) {
        if (!this.placing || !this.placingType) return;

        const bd = BUILDING_DATA[this.placingType];
        const w = bd.size[0];
        const h = bd.size[1];

        if (!Grid.isFree(tileX, tileY, w, h)) return;
        if (tileX + w > Grid.SIZE || tileY + h > Grid.SIZE) return;

        const result = BuildingManager.place(this.placingType, tileX, tileY);
        if (result) {
            this.cancelPlacing();
        }
    }
};
