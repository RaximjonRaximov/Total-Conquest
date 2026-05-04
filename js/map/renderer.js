// ============================================
// IZOMETRIK RENDERER - Xaritani chizish
// ============================================

const MapRenderer = {
    canvas: null,
    ctx: null,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    // Bitta tile chizish
    drawTile(x, y, hover, placingOk) {
        const iso = Camera.toIso(x, y);
        const screen = Camera.worldToScreen(iso.x, iso.y);
        const px = screen.x;
        const py = screen.y;

        const hw = Grid.TILE_W * Camera.zoom / 2;
        const hh = Grid.TILE_H * Camera.zoom / 2;
        const d = 5 * Camera.zoom;

        // Ekrandan tashqaridagilarni o'tkazish
        if (px + hw < -10 || px - hw > this.canvas.width + 10 ||
            py + hh < -10 || py - hh > this.canvas.height + 60) return;

        const c = Grid.getTileColor(x, y);

        // Yuqori yuz
        this.ctx.beginPath();
        this.ctx.moveTo(px, py - hh);
        this.ctx.lineTo(px + hw, py);
        this.ctx.lineTo(px, py + hh);
        this.ctx.lineTo(px - hw, py);
        this.ctx.closePath();
        this.ctx.fillStyle = c.top;
        this.ctx.fill();

        // Chap yon
        this.ctx.beginPath();
        this.ctx.moveTo(px - hw, py);
        this.ctx.lineTo(px, py + hh);
        this.ctx.lineTo(px, py + hh + d);
        this.ctx.lineTo(px - hw, py + d);
        this.ctx.closePath();
        this.ctx.fillStyle = c.left;
        this.ctx.fill();

        // O'ng yon
        this.ctx.beginPath();
        this.ctx.moveTo(px + hw, py);
        this.ctx.lineTo(px, py + hh);
        this.ctx.lineTo(px, py + hh + d);
        this.ctx.lineTo(px + hw, py + d);
        this.ctx.closePath();
        this.ctx.fillStyle = c.right;
        this.ctx.fill();

        // Grid chiziq
        this.ctx.beginPath();
        this.ctx.moveTo(px, py - hh);
        this.ctx.lineTo(px + hw, py);
        this.ctx.lineTo(px, py + hh);
        this.ctx.lineTo(px - hw, py);
        this.ctx.closePath();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();

        // Hover
        if (hover && !BuildMenu.placing) {
            this.ctx.beginPath();
            this.ctx.moveTo(px, py - hh);
            this.ctx.lineTo(px + hw, py);
            this.ctx.lineTo(px, py + hh);
            this.ctx.lineTo(px - hw, py);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(212,175,55,0.7)';
            this.ctx.lineWidth = 1.5 * Camera.zoom;
            this.ctx.stroke();
        }

        // Qurish rejimi — joylashtirish ko'rsatkichi
        if (placingOk !== undefined) {
            this.ctx.beginPath();
            this.ctx.moveTo(px, py - hh);
            this.ctx.lineTo(px + hw, py);
            this.ctx.lineTo(px, py + hh);
            this.ctx.lineTo(px - hw, py);
            this.ctx.closePath();
            this.ctx.fillStyle = placingOk ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)';
            this.ctx.fill();
            this.ctx.strokeStyle = placingOk ? 'rgba(76,175,80,0.8)' : 'rgba(244,67,54,0.8)';
            this.ctx.lineWidth = 2 * Camera.zoom;
            this.ctx.stroke();
        }
    },

    // Butun xaritani chizish
    renderMap() {
        this.ctx.fillStyle = '#1a2332';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const mx = Input.mouse.tileX;
        const my = Input.mouse.tileY;

        // Tilelarni chizish
        for (let y = 0; y < Grid.SIZE; y++) {
            for (let x = 0; x < Grid.SIZE; x++) {
                const isHover = (x === mx && y === my);

                // Qurish rejimida joylashtirish ko'rsatkichi
                if (BuildMenu.placing && isHover) {
                    const bd = BUILDING_DATA[BuildMenu.placingType];
                    const w = bd.size[0];
                    const h = bd.size[1];
                    // Placement area ichidagi tilelar
                    if (x >= mx && x < mx + w && y >= my && y < my + h) {
                        // skip — pastda chizamiz
                    } else {
                        this.drawTile(x, y, false);
                    }
                } else {
                    this.drawTile(x, y, isHover);
                }
            }
        }

        // Qurish rejimida placement area
        if (BuildMenu.placing && mx >= 0 && my >= 0) {
            const bd = BUILDING_DATA[BuildMenu.placingType];
            const w = bd.size[0];
            const h = bd.size[1];
            const canPlace = Grid.isFree(mx, my, w, h) &&
                             mx + w <= Grid.SIZE && my + h <= Grid.SIZE;
            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    if (mx + dx < Grid.SIZE && my + dy < Grid.SIZE) {
                        this.drawTile(mx + dx, my + dy, false, canPlace);
                    }
                }
            }
        }
    }
};
