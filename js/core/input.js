// ============================================
// INPUT TIZIMI - Mouse, Touch, Keyboard
// Joylashtirish va bino sudrab ko'chirish
// ============================================

const Input = {
    mouse: { x: 0, y: 0, tileX: -1, tileY: -1 },
    drag: { active: false, sx: 0, sy: 0, cx: 0, cy: 0, moved: false },
    lastTouchDist: 0,
    _pinchStartZoom: 1,

    // Inertia velocity tracking (oxirgi N harakat nuqtasi)
    _velSamples: [],   // [{dx, dy, t}, ...]  (oxirgi 5 ta)
    _velMaxSamples: 5,
    _lastDragX: 0,
    _lastDragY: 0,
    _lastDragT: 0,

    // Bino drag uchun
    _buildingDragPending: false,
    _buildingDragStartX: 0,
    _buildingDragStartY: 0,
    _buildingDragTargetId: null,
    _buildingDragThreshold: 8,   // mobil uchun 8px (oldin 6px)

    // Devor bo'yab joylashtirish uchun
    _wallPainting: false,
    _lastPaintTile: null,

    // ── Hold-to-deploy (CoC uslubi) ──────────────────────────────────────────
    // Barmoq/sichqoncha ushlab tursa → askarlar uzluksiz tushiriladi
    _holdDeployInterval: null,
    _holdDeployTileX: -1,
    _holdDeployTileY: -1,

    _startHoldDeploy(tx, ty) {
        this._stopHoldDeploy();
        this._holdDeployTileX = tx;
        this._holdDeployTileY = ty;
        // ~130ms interval — CoC ga yaqin chastota (8 askar/soniya)
        this._holdDeployInterval = setInterval(() => {
            if (typeof DeployPanel === 'undefined' || Game.mode !== 'attack' || !DeployPanel.selectedTroop) {
                this._stopHoldDeploy(); return;
            }
            // Sehrlar hold-deploy qilinmaydi (faqat bir marta ishlatiladi)
            if (DeployPanel.selectedTroop.startsWith('spell:')) {
                this._stopHoldDeploy(); return;
            }
            const x = this._holdDeployTileX, y = this._holdDeployTileY;
            if (x >= 0 && x < Grid.SIZE && y >= 0 && y < Grid.SIZE) {
                DeployPanel.handleClick(x, y);
            }
        }, 130);
    },

    _stopHoldDeploy() {
        if (this._holdDeployInterval) {
            clearInterval(this._holdDeployInterval);
            this._holdDeployInterval = null;
        }
    },

    setup(canvas) {
        // ========== MOUSE ==========
        canvas.addEventListener('mousedown', (e) => {
            if (e.target !== canvas) return;

            // ── Attack rejimi: zudlik bilan deploy + hold-to-deploy ───────────
            if (Game.mode === 'attack' && typeof DeployPanel !== 'undefined') {
                const g = Camera.toGrid(e.clientX, e.clientY);
                if (g.x >= 0 && g.x < Grid.SIZE && g.y >= 0 && g.y < Grid.SIZE) {
                    DeployPanel.handleClick(g.x, g.y);
                    // Sehrlar hold qilinmaydi; troop tanlanmagan bo'lsa interval kerak emas
                    if (DeployPanel.selectedTroop && !DeployPanel.selectedTroop.startsWith('spell:')) {
                        this._startHoldDeploy(g.x, g.y);
                    }
                }
                return;
            }

            // Inertia + tween to'xtatish — yangi drag boshlanmoqda
            Camera.stopInertia();
            if (Camera._tween) Camera.cancelTween();
            this._velSamples = [];
            this._lastDragX = e.clientX;
            this._lastDragY = e.clientY;
            this._lastDragT = performance.now();

            // Bino dragging rejimida hech narsa
            if (BuildingManager.dragging) return;

            // Devor/darvoza drag-paint rejimi
            if (BuildMenu.placing && !BuildMenu.locked &&
                (BuildMenu.placingType === 'wall' || BuildMenu.placingType === 'gate')) {
                const g = Camera.toGrid(e.clientX, e.clientY);
                this._wallPainting = true;
                this._lastPaintTile = { x: g.x, y: g.y };
                BuildMenu.placeWallAt(g.x, g.y);
                return;
            }

            // Joylashtirish rejimida:
            // - locked bo'lmasa → map surilmaydi (ghost mishka bilan yuradi)
            // - locked bo'lsa → map surilishi mumkin (bino qotib turibdi)
            if (BuildMenu.placing && !BuildMenu.locked) return;

            // Locked joylashtirish rejimida — map surish ruxsat, lekin click ham kerak
            if (BuildMenu.placing && BuildMenu.locked) {
                this.drag.active = true;
                this.drag.moved = false;
                this.drag.sx = e.clientX;
                this.drag.sy = e.clientY;
                this.drag.cx = Camera.x;
                this.drag.cy = Camera.y;
                return;
            }

            // Bino ustiga bosilganmi tekshirish (drag uchun)
            // Hujum rejimida bino drag'i RUXSAT ETILMAYDI
            const building = this._getClickedBuilding(e.clientX, e.clientY);
            if (building && !building.building && Game.mode !== 'attack') {
                this._buildingDragPending = true;
                this._buildingDragStartX = e.clientX;
                this._buildingDragStartY = e.clientY;
                this._buildingDragTargetId = building.id;
                this.drag.active = false;
                this.drag.moved = false;
                this.drag.sx = e.clientX;
                this.drag.sy = e.clientY;
                this.drag.cx = Camera.x;
                this.drag.cy = Camera.y;
                return;
            }

            // Oddiy map drag
            this.drag.active = true;
            this.drag.moved = false;
            this.drag.sx = e.clientX;
            this.drag.sy = e.clientY;
            this.drag.cx = Camera.x;
            this.drag.cy = Camera.y;
            canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            const g = Camera.toGrid(e.clientX, e.clientY);
            this.mouse.tileX = g.x;
            this.mouse.tileY = g.y;

            // Attack rejimida ghost troop preview + hold-deploy tile yangilash
            if (Game.mode === 'attack' && typeof DeployPanel !== 'undefined' && DeployPanel.selectedTroop) {
                BattleRenderer._ghostX = g.x;
                BattleRenderer._ghostY = g.y;
                // Sichqoncha sudralayotganda hold-deploy maqsad tileni yangilaymiz
                if (this._holdDeployInterval) {
                    this._holdDeployTileX = g.x;
                    this._holdDeployTileY = g.y;
                }
            } else {
                BattleRenderer._ghostX = -1;
            }

            // Devor drag-paint: har yangi tileda devor qo'y
            if (this._wallPainting && BuildMenu.placing) {
                const lp = this._lastPaintTile;
                if (!lp || lp.x !== g.x || lp.y !== g.y) {
                    this._lastPaintTile = { x: g.x, y: g.y };
                    BuildMenu.placeWallAt(g.x, g.y);
                }
                return;
            }

            // Joylashtirish rejimi — ghost mishka bilan yuradi (faqat locked emas bo'lsa)
            if (BuildMenu.placing && !BuildMenu.locked) {
                BuildMenu.updateGhostPosition(g.x, g.y);
                return;
            }

            // Bino drag pending
            if (this._buildingDragPending) {
                const dx = e.clientX - this._buildingDragStartX;
                const dy = e.clientY - this._buildingDragStartY;
                if (Math.abs(dx) > this._buildingDragThreshold || Math.abs(dy) > this._buildingDragThreshold) {
                    const started = BuildingManager.startDrag(this._buildingDragTargetId);
                    this._buildingDragPending = false;
                    if (started) {
                        canvas.style.cursor = 'move';
                        BuildingManager.updateDragPosition(g.x, g.y);
                    }
                }
                return;
            }

            // Bino dragging
            if (BuildingManager.dragging) {
                BuildingManager.updateDragPosition(g.x, g.y);
                return;
            }

            // Oddiy map drag
            if (this.drag.active) {
                const dx = e.clientX - this.drag.sx;
                const dy = e.clientY - this.drag.sy;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.drag.moved = true;
                // Velocity sampling for inertia
                const now = performance.now();
                const rdx = e.clientX - this._lastDragX;
                const rdy = e.clientY - this._lastDragY;
                const dt  = Math.max(1, now - this._lastDragT);
                this._velSamples.push({ dx: rdx / dt, dy: rdy / dt });
                if (this._velSamples.length > this._velMaxSamples) this._velSamples.shift();
                this._lastDragX = e.clientX;
                this._lastDragY = e.clientY;
                this._lastDragT = now;
                Camera.x = this.drag.cx - dx / Camera.zoom;
                Camera.y = this.drag.cy - dy / Camera.zoom;
            }
        });

        window.addEventListener('mouseup', (e) => {
            // Hold-to-deploy to'xtatish
            this._stopHoldDeploy();

            // Devor painting to'xtatish
            if (this._wallPainting) {
                this._wallPainting = false;
                this._lastPaintTile = null;
                return;
            }

            // Bino drag pending — suralmadi, oddiy click
            if (this._buildingDragPending) {
                this._buildingDragPending = false;
                if (e.target === canvas) {
                    this._handleClick(e.clientX, e.clientY);
                }
                return;
            }

            // Bino dragging — joylashtirish
            if (BuildingManager.dragging) {
                BuildingManager.confirmDrag();
                canvas.style.cursor = 'default';
                return;
            }

            // Oddiy map drag / click
            const wasDrag = this.drag.moved;
            this.drag.active = false;
            this.drag.moved = false;
            canvas.style.cursor = 'default';

            // Inertia: oxirgi velocity o'rtacha qiymati
            if (wasDrag && this._velSamples.length >= 2) {
                const n = this._velSamples.length;
                let avgDx = 0, avgDy = 0;
                for (const s of this._velSamples) { avgDx += s.dx; avgDy += s.dy; }
                avgDx /= n; avgDy /= n;
                // ms dan frame (~16ms) ga o'girish
                Camera.startInertia(avgDx * -16, avgDy * -16);
            }

            // Attack rejimida deploy mousedown da amalga oshirildi — bu yerda takrorlanmaydi
            if (!wasDrag && e.target === canvas && Game.mode !== 'attack') {
                this._handleClick(e.clientX, e.clientY);
            }
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            Camera.zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
        }, { passive: false });

        // ========== TOUCH ==========
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Inertia + tween to'xtatish — yangi touch boshlanmoqda
            Camera.stopInertia();
            if (Camera._tween) Camera.cancelTween();
            this._velSamples = [];
            if (e.touches.length >= 1) {
                this._lastDragX = e.touches[0].clientX;
                this._lastDragY = e.touches[0].clientY;
                this._lastDragT = performance.now();
            }
            if (e.touches.length === 1) {
                const t = e.touches[0];

                // ── Attack rejimi: zudlik bilan deploy + hold-to-deploy ───────
                if (Game.mode === 'attack' && typeof DeployPanel !== 'undefined') {
                    const g = Camera.toGrid(t.clientX, t.clientY);
                    if (g.x >= 0 && g.x < Grid.SIZE && g.y >= 0 && g.y < Grid.SIZE) {
                        DeployPanel.handleClick(g.x, g.y);
                        if (DeployPanel.selectedTroop && !DeployPanel.selectedTroop.startsWith('spell:')) {
                            this._startHoldDeploy(g.x, g.y);
                        }
                    }
                    return;
                }

                if (BuildingManager.dragging) return;

                // Devor/darvoza touch drag-paint
                if (BuildMenu.placing && !BuildMenu.locked &&
                    (BuildMenu.placingType === 'wall' || BuildMenu.placingType === 'gate')) {
                    const g = Camera.toGrid(t.clientX, t.clientY);
                    this._wallPainting = true;
                    this._lastPaintTile = { x: g.x, y: g.y };
                    BuildMenu.placeWallAt(g.x, g.y);
                    return;
                }

                // Placing + not locked = ghost follows touch, no drag
                if (BuildMenu.placing && !BuildMenu.locked) return;

                // Placing + locked = allow map drag
                if (BuildMenu.placing && BuildMenu.locked) {
                    this.drag.active = true;
                    this.drag.moved = false;
                    this.drag.sx = t.clientX;
                    this.drag.sy = t.clientY;
                    this.drag.cx = Camera.x;
                    this.drag.cy = Camera.y;
                    return;
                }

                const building = this._getClickedBuilding(t.clientX, t.clientY);

                if (building && !building.building) {
                    this._buildingDragPending = true;
                    this._buildingDragStartX = t.clientX;
                    this._buildingDragStartY = t.clientY;
                    this._buildingDragTargetId = building.id;
                    this.drag.active = false;
                    this.drag.moved = false;
                    this.drag.sx = t.clientX;
                    this.drag.sy = t.clientY;
                    this.drag.cx = Camera.x;
                    this.drag.cy = Camera.y;
                    return;
                }

                this.drag.active = true;
                this.drag.moved = false;
                this.drag.sx = t.clientX;
                this.drag.sy = t.clientY;
                this.drag.cx = Camera.x;
                this.drag.cy = Camera.y;
            } else if (e.touches.length === 2) {
                this.drag.active = false;
                this._buildingDragPending = false;
                this.lastTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                // Pinch boshlanganda joriy zoomni eslab qolamiz
                this._pinchStartZoom = Camera.targetZoom;
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const t = e.touches[0];
                const g = Camera.toGrid(t.clientX, t.clientY);

                // Attack rejimida: ghost preview + hold-deploy tile yangilash
                if (Game.mode === 'attack' && typeof DeployPanel !== 'undefined') {
                    if (typeof BattleRenderer !== 'undefined' && DeployPanel.selectedTroop) {
                        BattleRenderer._ghostX = g.x;
                        BattleRenderer._ghostY = g.y;
                    }
                    if (this._holdDeployInterval) {
                        this._holdDeployTileX = g.x;
                        this._holdDeployTileY = g.y;
                    }
                    return;
                }

                // Devor drag-paint (touch)
                if (this._wallPainting && BuildMenu.placing) {
                    const lp = this._lastPaintTile;
                    if (!lp || lp.x !== g.x || lp.y !== g.y) {
                        this._lastPaintTile = { x: g.x, y: g.y };
                        BuildMenu.placeWallAt(g.x, g.y);
                    }
                    return;
                }

                // Ghost follows touch (not locked)
                if (BuildMenu.placing && !BuildMenu.locked) {
                    BuildMenu.updateGhostPosition(g.x, g.y);
                    return;
                }

                // Bino drag pending
                if (this._buildingDragPending) {
                    const dx = t.clientX - this._buildingDragStartX;
                    const dy = t.clientY - this._buildingDragStartY;
                    if (Math.abs(dx) > this._buildingDragThreshold || Math.abs(dy) > this._buildingDragThreshold) {
                        const started = BuildingManager.startDrag(this._buildingDragTargetId);
                        this._buildingDragPending = false;
                        if (started) {
                            BuildingManager.updateDragPosition(g.x, g.y);
                        }
                    }
                    return;
                }

                // Bino dragging
                if (BuildingManager.dragging) {
                    BuildingManager.updateDragPosition(g.x, g.y);
                    return;
                }

                // Map drag
                if (this.drag.active) {
                    const dx = t.clientX - this.drag.sx;
                    const dy = t.clientY - this.drag.sy;
                    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) this.drag.moved = true; // mobil: 8px threshold
                    // Velocity sample (touch)
                    const now2 = performance.now();
                    const rdx2 = t.clientX - this._lastDragX;
                    const rdy2 = t.clientY - this._lastDragY;
                    const dt2  = Math.max(1, now2 - this._lastDragT);
                    this._velSamples.push({ dx: rdx2 / dt2, dy: rdy2 / dt2 });
                    if (this._velSamples.length > this._velMaxSamples) this._velSamples.shift();
                    this._lastDragX = t.clientX;
                    this._lastDragY = t.clientY;
                    this._lastDragT = now2;
                    Camera.x = this.drag.cx - dx / Camera.zoom;
                    Camera.y = this.drag.cy - dy / Camera.zoom;
                }
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                // Pinch zoom: boshlang'ich zoom * nisbat (drift to'planmasin)
                if (this.lastTouchDist > 0 && this._pinchStartZoom) {
                    Camera.targetZoom = Helpers.clamp(
                        this._pinchStartZoom * (dist / this.lastTouchDist),
                        Camera.minZoom, Camera.maxZoom
                    );
                }
                this.lastTouchDist = dist;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            // Hold-to-deploy to'xtatish
            this._stopHoldDeploy();

            // Devor painting to'xtatish (touch)
            if (this._wallPainting) {
                this._wallPainting = false;
                this._lastPaintTile = null;
                return;
            }

            // Bino drag pending — click
            if (this._buildingDragPending) {
                this._buildingDragPending = false;
                if (e.changedTouches.length === 1) {
                    const t = e.changedTouches[0];
                    this._handleClick(t.clientX, t.clientY);
                }
                return;
            }

            // Bino dragging
            if (BuildingManager.dragging) {
                BuildingManager.confirmDrag();
                return;
            }

            const wasDrag = this.drag.moved;
            this.drag.active = false;
            this.drag.moved = false;

            // Touch inertia
            if (wasDrag && this._velSamples.length >= 2) {
                const n = this._velSamples.length;
                let avgDx = 0, avgDy = 0;
                for (const s of this._velSamples) { avgDx += s.dx; avgDy += s.dy; }
                avgDx /= n; avgDy /= n;
                Camera.startInertia(avgDx * -16, avgDy * -16);
            }

            // Attack rejimida deploy touchstart da amalga oshirildi — bu yerda takrorlanmaydi
            if (!wasDrag && e.changedTouches.length === 1 && Game.mode !== 'attack') {
                const t = e.changedTouches[0];
                this._handleClick(t.clientX, t.clientY);
            }
        });

        // Klaviatura yorliqlari
        window.addEventListener('keydown', (e) => {
            // Matn kiritish vaqtida buyruqlarni e'tiborsiz qoldirish
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if (e.key === 'Escape') {
                if (typeof WarBaseEditor !== 'undefined' && WarBaseEditor.active) {
                    WarBaseEditor.handleEscape();
                    return;
                }
                if (BuildingManager.dragging) {
                    BuildingManager.cancelDrag();
                    canvas.style.cursor = 'default';
                } else if (BuildMenu.placing) {
                    BuildMenu.cancelPlacing();
                } else if (typeof Game !== 'undefined') {
                    Game._closeAllPanels();
                    if (typeof InfoPanel !== 'undefined') InfoPanel.hide();
                    if (typeof LeaderboardPanel !== 'undefined' && LeaderboardPanel.visible) LeaderboardPanel.hide();
                    if (typeof AchievementsPanel !== 'undefined' && AchievementsPanel.visible) AchievementsPanel.hide();
                    if (typeof SeasonalEventsPanel !== 'undefined' && SeasonalEventsPanel.visible) SeasonalEventsPanel.hide();
                    document.getElementById('avatar-picker-modal')?.remove();
                }
            }

            // Jang rejimi: raqam tugmalari bilan askar tanlash
            if (Game?.mode === 'attack' && typeof DeployPanel !== 'undefined') {
                if (e.key >= '1' && e.key <= '9') {
                    const troops = Object.entries(BattleManager.availableTroops || {})
                        .filter(([, cnt]) => cnt > 0);
                    const idx = parseInt(e.key) - 1;
                    if (troops[idx]) DeployPanel.selectTroop(troops[idx][0]);
                }
                // Q/W = speed toggle, Space = end battle
                if (e.key === 'q' || e.key === 'Q') DeployPanel.toggleSpeed?.();
                // Space = jangni tugatish (tasdiqlash modali bilan)
                if (e.key === ' ')  {
                    e.preventDefault();
                    if (typeof AttackScreen !== 'undefined') AttackScreen.endBattle();
                    else BattleManager.endBattle();
                }
            }

            // Uy rejimi: B=build, A=army, J=jang, I=ittifoq
            if (Game?.mode === 'home') {
                if (e.key === 'b' || e.key === 'B') document.getElementById('btn-build')?.click();
                if (e.key === 'a' || e.key === 'A') document.getElementById('btn-army')?.click();
                // Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo (CoC-style)
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    BuildingManager.undo();
                }
                if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    BuildingManager.redo();
                }
            }
        });
    },

    // Screen-space hit test: grid → fallback bounding-box scan
    _getClickedBuilding(screenX, screenY) {
        const g = Camera.toGrid(screenX, screenY);
        const byGrid = BuildingManager.getAt(g.x, g.y);
        if (byGrid) return byGrid;

        // Fallback: check visual bounding box of each building (front-to-back)
        const z = Camera.zoom;
        const sorted = Object.values(BuildingManager.buildings)
            .sort((a, b) => (b.x + b.y) - (a.x + a.y));
        for (const b of sorted) {
            const bd = BUILDING_DATA[b.type];
            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
            const bH = (14 + b.level * 4) * z;
            if (screenX >= fp.left.x && screenX <= fp.right.x &&
                screenY >= fp.top.y - bH && screenY <= fp.bottom.y) {
                return b;
            }
        }
        return null;
    },

    _handleClick(screenX, screenY) {
        if (Game.mode === 'attack') {
            const g = Camera.toGrid(screenX, screenY);
            if (g.x >= 0 && g.x < Grid.SIZE && g.y >= 0 && g.y < Grid.SIZE) {
                DeployPanel.handleClick(g.x, g.y);
            }
            return;
        }

        // Joylashtirish rejimi
        if (BuildMenu.placing) {
            // BuildMenu.handleClick ichida locked/unlocked logika bor
            BuildMenu.handleClick(screenX, screenY);
            return;
        }

        // ── Loot Cart click — eng yuqori prioritet ────────────────────────────
        if (Game.mode === 'home' && typeof Matchmaking !== 'undefined' && Matchmaking.hasLootCart()) {
            const pos = Matchmaking.getLootCartScreenPos();
            if (pos) {
                const hitR = Math.max(28, 32 * pos.z); // hit radius (px)
                const dx = screenX - pos.x, dy = screenY - (pos.y - 16 * pos.z);
                if (dx * dx + dy * dy <= hitR * hitR) {
                    this._spawnTapRipple(screenX, screenY);
                    AudioManager.playCoin?.();
                    Matchmaking.collectLootCart();
                    return;
                }
            }
        }

        const building = this._getClickedBuilding(screenX, screenY);
        if (building) {
            // Tap pop animation (CoC uslubida building "sakrash")
            building._tapTime = Date.now();
            // Tap ripple effekti
            this._spawnTapRipple(screenX, screenY);
            // Agar bino resurs ishlab chiqaruvchi bo'lsa va unda resurs bo'lsa - yig'amiz
            if (!building.building && building.storedResource >= 1) {
                // Qaysi resurs ishlab chiqaradi?
                const btype = building.type;
                const isFood = btype === 'farm';
                const isGoldenApple = btype === 'treeOfLife';
                const collected = BuildingManager.collect(building.id);
                if (collected > 0) {
                    AudioManager.playCoin(); // Ovoz chiqarish
                    // Tangalar uchish animatsiyasi
                    const targetId = isFood ? 'res-food' : (isGoldenApple ? 'res-golden-apple' : 'res-gold');
                    const icon = isFood ? '🍎' : (isGoldenApple ? '🍏' : '🪙');
                    this._spawnCoinFly(screenX, screenY, targetId, icon, Math.min(8, Math.ceil(collected / 50) + 2));
                    return; // Panelni ochmaymiz, faqat yig'amiz
                }
            }
            InfoPanel.show(building);
            // CoC-style: bino tanlanganida u tomonga smooth pan
            if (typeof Camera !== 'undefined' && Camera.panTo) {
                const bd2 = BUILDING_DATA[building.type];
                if (bd2) {
                    const bCx = building.x + bd2.size[0] / 2;
                    const bCy = building.y + bd2.size[1] / 2;
                    Camera.panTo(bCx, bCy, 350);
                }
            }
            return;
        }

        // To'siqni tekshirish
        const g = Camera.toGrid(screenX, screenY);
        if (g.x < 0 || g.x >= Grid.SIZE || g.y < 0 || g.y >= Grid.SIZE) return;
        const obstacle = ObstacleManager.getAt(g.x, g.y);
        if (obstacle) {
            InfoPanel.showObstacle(obstacle);
            return;
        }

        InfoPanel.hide();
    },

    // Tanga uchish animatsiyasi — bino → HUD resursi
    _spawnCoinFly(fromX, fromY, targetElId, icon, count) {
        const targetEl = document.getElementById(targetElId);
        const targetRect = targetEl ? targetEl.getBoundingClientRect() : null;
        const tx = targetRect ? targetRect.left + targetRect.width / 2 : 20;
        const ty = targetRect ? targetRect.top  + targetRect.height / 2 : 20;

        for (let i = 0; i < count; i++) {
            const coin = document.createElement('div');
            coin.textContent = icon;
            coin.style.cssText = `
                position:fixed; left:${fromX}px; top:${fromY}px;
                font-size:16px; pointer-events:none; z-index:9999;
                transform:translate(-50%,-50%);
                transition: none;
            `;
            document.body.appendChild(coin);

            const delay = i * 60;
            // Parabola arc: birinchi bir oz yuqoriga, keyin target ga
            setTimeout(() => {
                const arcX = fromX + (Math.random() - 0.5) * 40;
                const arcY = fromY - 40 - Math.random() * 30;
                coin.style.transition = 'left 0.22s ease-out, top 0.22s ease-out, opacity 0.22s';
                coin.style.left = arcX + 'px';
                coin.style.top  = arcY + 'px';
                setTimeout(() => {
                    coin.style.transition = `left 0.35s cubic-bezier(0.4,0,0.8,1), top 0.35s cubic-bezier(0.4,0,0.8,1), opacity 0.15s 0.3s, transform 0.35s`;
                    coin.style.left = tx + 'px';
                    coin.style.top  = ty + 'px';
                    coin.style.transform = 'translate(-50%,-50%) scale(0.4)';
                    coin.style.opacity = '0';
                    setTimeout(() => coin.remove(), 500);
                }, 220);
            }, delay);
        }
    },

    // Bosish ripple DOM effekti
    _spawnTapRipple(x, y) {
        const el = document.createElement('div');
        el.style.cssText = `
            position:fixed; left:${x}px; top:${y}px;
            width:0; height:0;
            pointer-events:none; z-index:9999;
            border-radius:50%;
            border:2px solid rgba(212,175,55,0.8);
            transform:translate(-50%,-50%) scale(0);
            animation:tap-ripple-anim 0.45s ease-out forwards;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 500);
    }
};
