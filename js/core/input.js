// ============================================
// INPUT TIZIMI - Mouse, Touch, Keyboard
// ============================================

const Input = {
    mouse: { x: 0, y: 0, tileX: -1, tileY: -1 },
    drag: { active: false, sx: 0, sy: 0, cx: 0, cy: 0, moved: false },
    lastTouchDist: 0,

    setup(canvas) {
        // --- MOUSE ---
        canvas.addEventListener('mousedown', (e) => {
            if (e.target !== canvas) return;
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

            // Joylashtirish rejimida ghost pozitsiyani yangilash
            if (BuildMenu.placing) {
                BuildMenu.updateGhostPosition(g.x, g.y);
            }

            if (this.drag.active) {
                const dx = e.clientX - this.drag.sx;
                const dy = e.clientY - this.drag.sy;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.drag.moved = true;
                Camera.x = this.drag.cx - dx / Camera.zoom;
                Camera.y = this.drag.cy - dy / Camera.zoom;
            }
        });

        window.addEventListener('mouseup', (e) => {
            const wasDrag = this.drag.moved;
            this.drag.active = false;
            canvas.style.cursor = 'default';

            if (!wasDrag && e.target === canvas) {
                this._handleClick(e.clientX, e.clientY);
            }
        });

        // --- ZOOM ---
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            Camera.zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
        }, { passive: false });

        // --- TOUCH ---
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.drag.active = true;
                this.drag.moved = false;
                this.drag.sx = e.touches[0].clientX;
                this.drag.sy = e.touches[0].clientY;
                this.drag.cx = Camera.x;
                this.drag.cy = Camera.y;
            } else if (e.touches.length === 2) {
                this.drag.active = false;
                this.lastTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.drag.active) {
                const dx = e.touches[0].clientX - this.drag.sx;
                const dy = e.touches[0].clientY - this.drag.sy;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.drag.moved = true;
                Camera.x = this.drag.cx - dx / Camera.zoom;
                Camera.y = this.drag.cy - dy / Camera.zoom;

                // Ghost yangilash
                if (BuildMenu.placing) {
                    const g = Camera.toGrid(e.touches[0].clientX, e.touches[0].clientY);
                    BuildMenu.updateGhostPosition(g.x, g.y);
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
            if (!this.drag.moved && e.changedTouches.length === 1) {
                const t = e.changedTouches[0];
                this._handleClick(t.clientX, t.clientY);
            }
            this.drag.active = false;
        });
    },

    _handleClick(screenX, screenY) {
        // Joylashtirish rejimida — ✅/❌ tugmalarni tekshirish
        if (BuildMenu.placing) {
            if (BuildMenu.handleClick(screenX, screenY)) return;
            // Tugma bosilmadi — ghost pozitsiyani yangilash
            const g = Camera.toGrid(screenX, screenY);
            BuildMenu.updateGhostPosition(g.x, g.y);
            return;
        }

        const g = Camera.toGrid(screenX, screenY);
        if (g.x < 0 || g.x >= Grid.SIZE || g.y < 0 || g.y >= Grid.SIZE) return;

        // Binoni tanlash
        const building = BuildingManager.getAt(g.x, g.y);
        if (building) {
            InfoPanel.show(building);
        } else {
            InfoPanel.hide();
        }
    }
};
