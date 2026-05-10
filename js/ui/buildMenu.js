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

    _searchQuery: '',

    setTab(tab) {
        this.activeTab = tab;
        this._searchQuery = '';
        const searchEl = document.getElementById('build-search-input');
        if (searchEl) searchEl.value = '';
        this.render();
    },

    setSearch(q) {
        this._searchQuery = q.toLowerCase().trim();
        this._renderGrid();
    },

    render() {
        const container = document.getElementById('build-grid');
        const tabsEl = document.getElementById('build-tabs');
        if (!container) return;

        // Add search box if not present
        let searchBox = document.getElementById('build-search-box');
        if (!searchBox) {
            searchBox = document.createElement('div');
            searchBox.id = 'build-search-box';
            searchBox.style.cssText = 'padding:6px 10px 2px;';
            searchBox.innerHTML = `<input id="build-search-input" type="text" placeholder="🔍 Bino qidirish..." autocomplete="off"
                style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                       border-radius:8px;padding:6px 10px;color:#fff;font-size:12px;outline:none;">`;
            tabsEl.parentElement.insertBefore(searchBox, tabsEl);
            document.getElementById('build-search-input').addEventListener('input', e => BuildMenu.setSearch(e.target.value));
        }

        // ── "Barcha quruvchilar band" banneri (CoC-style) ────────────────────
        let busyBanner = document.getElementById('bm-busy-banner');
        const allBusy = typeof BuilderSystem !== 'undefined'
            && BuilderSystem.busyBuilders >= BuilderSystem.totalBuilders
            && BuilderSystem.totalBuilders > 0;
        if (allBusy) {
            if (!busyBanner) {
                busyBanner = document.createElement('div');
                busyBanner.id = 'bm-busy-banner';
                tabsEl.parentElement.insertBefore(busyBanner, tabsEl);
            }
            const freeAt = this._getEarliestFreeBuilderTime();
            busyBanner.style.cssText = `
                margin:6px 10px 4px;padding:7px 10px;border-radius:10px;
                background:linear-gradient(135deg,rgba(255,152,0,0.18),rgba(230,90,0,0.12));
                border:1px solid rgba(255,152,0,0.35);
                display:flex;align-items:center;gap:8px;
            `;
            busyBanner.innerHTML = `
                <span style="font-size:16px;">🔨</span>
                <div style="flex:1;">
                    <div style="font-size:11px;font-weight:700;color:#ffb74d;">
                        Barcha quruvchilar band
                    </div>
                    <div style="font-size:9px;color:#888;margin-top:1px;">
                        ${freeAt
                            ? `Bo'shaydi: <span style="color:#ffcc80;">${freeAt}</span>`
                            : `${BuilderSystem.busyBuilders}/${BuilderSystem.totalBuilders} ta ishlayapti`
                        }
                    </div>
                </div>
                <div style="font-size:9px;color:#ff9800;cursor:pointer;padding:3px 7px;
                            background:rgba(255,152,0,0.1);border-radius:6px;border:1px solid rgba(255,152,0,0.25);"
                     onclick="document.getElementById('bm-busy-banner').style.display='none';BuilderSystem.showPopup()">
                    👷 Batafsil
                </div>
            `;
        } else if (busyBanner) {
            busyBanner.remove();
        }

        tabsEl.innerHTML = '';
        for (const [key, name] of Object.entries(CATEGORY_NAMES)) {
            const btn = document.createElement('div');
            btn.className = 'build-tab' + (this.activeTab === key ? ' active' : '');
            btn.textContent = name;
            btn.onclick = () => this.setTab(key);
            tabsEl.appendChild(btn);
        }

        this._renderGrid();
    },

    _renderGrid() {
        const container = document.getElementById('build-grid');
        if (!container) return;

        const q = this._searchQuery;
        container.innerHTML = '';
        let shown = 0;

        const RES_ICONS = { gold: '🪙', food: '🍎', diamond: '💎', goldenApple: '🍏' };

        for (const [type, bd] of Object.entries(BUILDING_DATA)) {
            if (!q && bd.category !== this.activeTab) continue;
            if (q && !bd.name.toLowerCase().includes(q) && !type.toLowerCase().includes(q)) continue;

            const thReq   = bd.thRequired || 1;
            const locked  = Game.townHallLevel < thReq;
            const count   = BuildingManager.countType(type);
            const maxed   = count >= bd.maxCount;
            const lvData  = bd.levels[1];

            // Quruvchi uyi — narx BuilderSystem.builderCosts'dan olinadi
            let effectiveCost;
            if (bd.isBuilderHut && typeof BuilderSystem !== 'undefined') {
                const hutCost = BuilderSystem.builderCosts[count] || 0;
                effectiveCost = hutCost > 0 ? { diamond: hutCost } : {};
            } else {
                const costMult = typeof ResearchSystem !== 'undefined' ? ResearchSystem.getBuildCostMultiplier() : 1;
                effectiveCost = lvData.cost && costMult < 1
                    ? Object.fromEntries(Object.entries(lvData.cost).map(([r, a]) => [r, Math.max(1, Math.floor(a * costMult))]))
                    : lvData.cost;
            }

            const canAfford = !locked && !maxed && Resources.canAfford(effectiveCost);
            const isUnavail = locked || maxed;

            // Cost HTML — green if affordable, red if not
            let costHtml = '';
            if (effectiveCost && !locked) {
                for (const [res, amt] of Object.entries(effectiveCost)) {
                    const has = Resources[res] >= amt;
                    costHtml += `<span style="color:${isUnavail ? '#666' : has ? '#aaa' : '#ef5350'};font-size:9px;">
                        ${RES_ICONS[res] || ''}${Helpers.formatNumber(amt)}
                    </span> `;
                }
            } else if (!locked) {
                costHtml = `<span style="color:#4caf50;font-size:9px;">Bepul</span>`;
            }

            // Status / count bar
            let statusHtml = '';
            if (locked) {
                statusHtml = `<span style="color:#555;font-size:8px;">🔒 TH${thReq}</span>`;
            } else if (maxed) {
                statusHtml = `<span style="color:#555;font-size:8px;">✅ Max</span>`;
            } else {
                // Mini pip count
                const pips = Math.min(bd.maxCount, 8);
                let pipHtml = '';
                for (let i = 0; i < pips; i++) {
                    pipHtml += `<div style="width:5px;height:5px;border-radius:1px;
                        background:${i < count ? 'rgba(212,175,55,0.8)' : 'rgba(255,255,255,0.12)'};"></div>`;
                }
                statusHtml = `<div style="display:flex;gap:2px;align-items:center;">
                    ${pipHtml}
                    ${bd.maxCount > 8 ? `<span style="font-size:8px;color:#666;">${count}/${bd.maxCount}</span>` : ''}
                </div>`;
            }

            // Affordability glow
            const affordBorder = isUnavail
                ? 'rgba(255,255,255,0.06)'
                : canAfford
                    ? 'rgba(212,175,55,0.4)'
                    : 'rgba(255,255,255,0.08)';
            const affordBg = isUnavail
                ? 'rgba(255,255,255,0.02)'
                : canAfford
                    ? 'rgba(212,175,55,0.06)'
                    : 'rgba(255,255,255,0.04)';
            const affordGlow = canAfford ? 'box-shadow:0 0 8px rgba(212,175,55,0.12);' : '';

            const item = document.createElement('div');
            item.style.cssText = `
                position:relative;display:flex;flex-direction:column;align-items:center;
                padding:8px 4px 6px;border-radius:12px;cursor:${isUnavail ? 'default' : 'pointer'};
                background:${affordBg};border:1px solid ${affordBorder};${affordGlow}
                transition:all 0.15s;text-align:center;gap:2px;
                opacity:${isUnavail ? '0.5' : '1'};
            `;

            item.innerHTML = `
                <!-- Affordable checkmark -->
                ${canAfford ? `<div style="position:absolute;top:4px;right:4px;
                    width:10px;height:10px;border-radius:50%;background:#4caf50;
                    display:flex;align-items:center;justify-content:center;font-size:7px;color:#fff;">✓</div>` : ''}

                <!-- Icon -->
                <div style="font-size:24px;line-height:1;margin-bottom:1px;
                            filter:${isUnavail ? 'grayscale(0.7)' : 'drop-shadow(0 1px 4px rgba(0,0,0,0.4))'};
                            transition:transform 0.15s;">
                    ${bd.icon}
                </div>

                <!-- Name -->
                <div style="font-size:9px;font-weight:700;color:${isUnavail ? '#555' : '#ddd'};
                            line-height:1.2;max-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${bd.name}
                </div>

                <!-- Cost -->
                <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;min-height:13px;">
                    ${costHtml}
                </div>

                <!-- Time -->
                ${!locked && !maxed ? `<div style="font-size:8px;color:#666;">⏱ ${Helpers.formatTime(lvData.time)}</div>` : ''}

                <!-- Count pips -->
                <div style="margin-top:2px;">${statusHtml}</div>
            `;

            if (!isUnavail) {
                item.addEventListener('mouseenter', () => {
                    item.style.transform = 'translateY(-2px) scale(1.04)';
                    item.style.borderColor = canAfford ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.18)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.transform = '';
                    item.style.borderColor = affordBorder;
                });
                item.onclick = () => this.startPlacing(type);
            }

            container.appendChild(item);
            shown++;
        }

        if (shown === 0 && q) {
            container.innerHTML = `<div style="color:#888;text-align:center;padding:20px;font-size:12px;">
                "${q}" bo'yicha hech narsa topilmadi
            </div>`;
        }
    },

    // Eng erta bo'shadigan quruvchi vaqtini formatlash
    _getEarliestFreeBuilderTime() {
        if (typeof BuildingManager === 'undefined') return null;
        let minRemaining = Infinity;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (!b.building) continue;
            const remaining = b.buildEnd - Date.now();
            if (remaining > 0 && remaining < minRemaining) minRemaining = remaining;
        }
        if (!isFinite(minRemaining)) return null;
        return Helpers.formatTime(Math.ceil(minRemaining / 1000));
    },

    startPlacing(type) {
        AudioManager.playClick();
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
            AudioManager.playBuild();
            // Devor/Darvoza rejimi: bitta joylashtirgandan keyin shu turda davom et
            const isWall = this.placingType === 'wall' || this.placingType === 'gate';
            if (isWall && BuildingManager.countType(this.placingType) < (bd.maxCount || 100)) {
                const type = this.placingType;
                this.cancelPlacing();
                this.startPlacing(type); // immediately start placing another
                Toast.show('🧱 Devor rejimi: yana bosing yoki [ESC] — to\'xtatish', 'info', 1500);
            } else {
                this.cancelPlacing();
            }
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

    // Devor/Darvoza uchun to'g'ridan-to'g'ri joylash (drag-paint rejimi)
    placeWallAt(x, y) {
        if (!this.placing) return;
        const type = this.placingType;
        if (type !== 'wall' && type !== 'gate') return;
        if (x < 0 || y < 0 || x >= Grid.SIZE || y >= Grid.SIZE) return;
        if (!Grid.isFree(x, y, 1, 1)) return;
        const bd = BUILDING_DATA[type];
        const placed = BuildingManager.place(type, x, y);
        if (placed) {
            AudioManager.playBuild();
            if (BuildingManager.countType(type) >= (bd.maxCount || 100)) {
                this.cancelPlacing();
            } else {
                this.placingX = x;
                this.placingY = y;
            }
        }
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
