// ============================================
// KAMERA TIZIMI
// Pan, Zoom, Izometrik hisob-kitoblar
// ============================================

const Camera = {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.25,
    maxZoom: 2.5,
    targetZoom: 1,
    smoothing: 0.12,

    // Izometrik: grid -> ekran
    toIso(gx, gy) {
        return {
            x: (gx - gy) * (Grid.TILE_W / 2),
            y: (gx + gy) * (Grid.TILE_H / 2)
        };
    },

    // Ekran -> grid koordinata
    toGrid(screenX, screenY) {
        const canvas = document.getElementById('gameCanvas');
        const wx = (screenX - canvas.width / 2) / this.zoom + this.x;
        const wy = (screenY - canvas.height / 2) / this.zoom + this.y;
        const gx = Math.floor(wx / Grid.TILE_W + wy / Grid.TILE_H);
        const gy = Math.floor(wy / Grid.TILE_H - wx / Grid.TILE_W);
        return { x: gx, y: gy };
    },

    // World koordinatani ekranga aylantirish
    worldToScreen(wx, wy) {
        const canvas = document.getElementById('gameCanvas');
        return {
            x: (wx - this.x) * this.zoom + canvas.width / 2,
            y: (wy - this.y) * this.zoom + canvas.height / 2
        };
    },

    // Markazga o'tish
    centerOn(gx, gy) {
        const iso = this.toIso(gx, gy);
        this.x = iso.x;
        this.y = iso.y;
    },

    // Zoom qilish
    zoomBy(delta) {
        this.targetZoom = Helpers.clamp(this.targetZoom * delta, this.minZoom, this.maxZoom);
    },

    // Pan (surish)
    pan(dx, dy) {
        this.x -= dx / this.zoom;
        this.y -= dy / this.zoom;
    },

    // Smooth zoom yangilash
    update() {
        this.zoom += (this.targetZoom - this.zoom) * this.smoothing;
        if (Math.abs(this.targetZoom - this.zoom) < 0.001) {
            this.zoom = this.targetZoom;
        }
    }
};
