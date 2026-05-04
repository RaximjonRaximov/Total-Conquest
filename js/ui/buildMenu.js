// ============================================
// QURISH MENYUSI (Build Menu)
// Tanlash -> mapda ghost -> click -> qotish -> ✅/❌ -> joylashtirish
// ============================================

const BuildMenu = {
    visible: false,
    placing: false,
    locked: false,       // true = bino mapda qotib turibdi, ✅/❌ ko'rinadi
    placingType: null,
    placingX: -1,
    placingY: -1,
    activeTab: 'iqtisod',
    _confirmBtn: null,
    _cancelBtn: null,

    toggle() {
        if (this.placing) {
            this.cancelPlacing();
            return;
        }
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
        }
    },

    hide() {
        this.visible = false;
        document.getElementById('build-menu').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    setTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    render() {
        const container = document.getElementById('build-grid');
        const tabsEl = document.getElementById('build-tabs');
        if (!container) return;

        tabsEl.innerHTML = '';
        for (const [key, name] of Object.entries(CATEGORY_NAMES)) {
            const btn = document.createElement('div');
            btn.className = 'build-tab' + (this.activeTab === key ? ' active' : '');
            btn.textContent = name;
            btn.onclick = () => this.setTab(key);
            tabsEl.appendChild(btn);
        }

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
        this.locked = false;
        this.placingType = type;
        this.placingX = Math.floor(Grid.SIZE / 2);
        this.placingY = Math.floor(Grid.SIZE / 2);
        this._confirmBtn = null;
        this._cancelBtn = null;
        this.hide();
    },

    cancelPlacing() {
        this.placing = false;
        this.locked = false;
        this.placingType = null;
        this.placingX = -1;
        this.placingY = -1;
        this._confirmBtn = null;
        this._cancelBtn = null;
    },

    // Ghost pozitsiyani yangilash — faqat locked bo'lmaganda
    updateGhostPosition(tileX, tileY) {
        if (!this.placing || this.locked) return;
        if (tileX >= 0 && tileX < Grid.SIZE && tileY >= 0 && tileY < Grid.SIZE) {
            this.placingX = tileX;
            this.placingY = tileY;
        }
    },

    // Mapda click — binoni qotirish (lock)
    lockPosition(tileX, tileY) {
        if (!this.placing) return;
        if (tileX >= 0 && tileX < Grid.SIZE && tileY >= 0 && tileY < Grid.SIZE) {
            this.placingX = tileX;
            this.placingY = tileY;
        }
        this.locked = true;
    },

    // Qotgan binoni boshqa joyga ko'chirish (locked holda map click)
    moveLockedPosition(tileX, tileY) {
        if (!this.placing || !this.locked) return;
        if (tileX >= 0 && tileX < Grid.SIZE && tileY >= 0 && tileY < Grid.SIZE) {
            this.placingX = tileX;
            this.placingY = tileY;
        }
    },

    // ✅ tugma bosildi — joylashtirish
    confirmPlacement() {
        if (!this.placing || !this.placingType) return;

        const bd = BUILDING_DATA[this.placingType];
        const w = bd.size[0];
        const h = bd.size[1];
        const x = this.placingX;
        const y = this.placingY;

        if (!Grid.isFree(x, y, w, h)) return;
        if (x + w > Grid.SIZE || y + h > Grid.SIZE) return;

        const result = BuildingManager.place(this.placingType, x, y);
        if (result) {
            this.cancelPlacing();
        }
    },

    // Ekranda click — tugmalarni tekshirish
    handleClick(screenX, screenY) {
        if (!this.placing) return false;

        // Locked holda — avval ✅/❌ tugmalarni tekshir
        if (this.locked) {
            // ✅ tugma
            if (this._confirmBtn) {
                const cp = this._confirmBtn;
                const dist = Math.hypot(screenX - cp.x, screenY - cp.y);
                if (dist <= cp.r + 6) {
                    this.confirmPlacement();
                    return true;
                }
            }

            // ❌ tugma
            if (this._cancelBtn) {
                const xp = this._cancelBtn;
                const dist = Math.hypot(screenX - xp.x, screenY - xp.y);
                if (dist <= xp.r + 6) {
                    this.cancelPlacing();
                    return true;
                }
            }

            // Tugma bosilmadi — binoni yangi joyga ko'chirish
            const g = Camera.toGrid(screenX, screenY);
            if (g.x >= 0 && g.x < Grid.SIZE && g.y >= 0 && g.y < Grid.SIZE) {
                this.moveLockedPosition(g.x, g.y);
            }
            return true;
        }

        // Locked emas — mapda click = binoni qotirish
        const g = Camera.toGrid(screenX, screenY);
        if (g.x >= 0 && g.x < Grid.SIZE && g.y >= 0 && g.y < Grid.SIZE) {
            this.lockPosition(g.x, g.y);
        }
        return true;
    },

    // Ghost binoni chizish (game loop da chaqiriladi)
    renderGhost(ctx) {
        if (!this.placing || !this.placingType) return;
        if (this.placingX < 0 || this.placingY < 0) return;

        const bd = BUILDING_DATA[this.placingType];
        const w = bd.size[0];
        const h = bd.size[1];
        const canPlace = Grid.isFree(this.placingX, this.placingY, w, h) &&
                         this.placingX + w <= Grid.SIZE &&
                         this.placingY + h <= Grid.SIZE;

        BuildingRenderer.drawGhost(ctx, this.placingType, this.placingX, this.placingY, canPlace, this.locked);
    }
};
