// ============================================
// INPUT TIZIMI - Mouse, Touch, Keyboard
// Joylashtirish va bino sudrab ko'chirish
// ============================================

const Input = {
    mouse: { x: 0, y: 0, tileX: -1, tileY: -1 },
    drag: { active: false, sx: 0, sy: 0, cx: 0, cy: 0, moved: false },
    lastTouchDist: 0,

    // Bino drag uchun
    _buildingDragPending: false,
    _buildingDragStartX: 0,
    _buildingDragStartY: 0,
    _buildingDragTargetId: null,
    _buildingDragThreshold: 6,

    setup(canvas) {
        // ========== MOUSE ==========
        canvas.addEventListener('mousedown', (e) => {
            if (e.target !== canvas) return;

            // Bino dragging rejimida hech narsa
            if (BuildingManager.dragging) return;

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
            const g = Camera.toGrid(e.clientX, e.clientY);
            const building = BuildingManager.getAt(g.x, g.y);
            if (building && !building.building) {
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
                Camera.x = this.drag.cx - dx / Camera.zoom;
                Camera.y = this.drag.cy - dy / Camera.zoom;
            }
        });

        window.addEventListener('mouseup', (e) => {
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
            if (!wasDrag && e.target === canvas) {
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
            if (e.touches.length === 1) {
                if (BuildingManager.dragging) return;

                const t = e.touches[0];

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

                const g = Camera.toGrid(t.clientX, t.clientY);
                const building = BuildingManager.getAt(g.x, g.y);

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
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const t = e.touches[0];
                const g = Camera.toGrid(t.clientX, t.clientY);

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
                    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.drag.moved = true;
                    Camera.x = this.drag.cx - dx / Camera.zoom;
                    Camera.y = this.drag.cy - dy / Camera.zoom;
                }
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                Camera.zoomBy(dist / this.lastTouchDist);
                this.lastTouchDist = dist;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
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
            if (!wasDrag && e.changedTouches.length === 1) {
                const t = e.changedTouches[0];
                this._handleClick(t.clientX, t.clientY);
            }
        });

        // ESC — bekor qilish
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (BuildingManager.dragging) {
                    BuildingManager.cancelDrag();
                    canvas.style.cursor = 'default';
                } else if (BuildMenu.placing) {
                    BuildMenu.cancelPlacing();
                }
            }
        });
    },

    _handleClick(screenX, screenY) {
        // Joylashtirish rejimi
        if (BuildMenu.placing) {
            // BuildMenu.handleClick ichida locked/unlocked logika bor
            BuildMenu.handleClick(screenX, screenY);
            return;
        }

        const g = Camera.toGrid(screenX, screenY);
        if (g.x < 0 || g.x >= Grid.SIZE || g.y < 0 || g.y >= Grid.SIZE) return;

        const building = BuildingManager.getAt(g.x, g.y);
        if (building) {
            InfoPanel.show(building);
        } else {
            InfoPanel.hide();
        }
    }
};
