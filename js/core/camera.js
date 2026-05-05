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

    // Canvas keshi — har frame getElementById chaqirmaslik uchun
    _canvas: null,
    _cw: 0,
    _ch: 0,

    getCanvas() {
        if (!this._canvas) {
            this._canvas = document.getElementById('gameCanvas');
        }
        return this._canvas;
    },

    // Resize bo'lganda keshni yangilash
    onResize() {
        const c = this.getCanvas();
        this._cw = c.width;
        this._ch = c.height;
    },

    // Izometrik: grid -> world iso koordinata
    toIso(gx, gy) {
        return {
            x: (gx - gy) * (Grid.TILE_W / 2),
            y: (gx + gy) * (Grid.TILE_H / 2)
        };
    },

    // Ekran -> grid koordinata
    toGrid(screenX, screenY) {
        const hw = this._cw / 2, hh = this._ch / 2;
        const wx = (screenX - hw) / this.zoom + this.x;
        const wy = (screenY - hh) / this.zoom + this.y;
        const gx = Math.floor(wx / Grid.TILE_W + wy / Grid.TILE_H);
        const gy = Math.floor(wy / Grid.TILE_H - wx / Grid.TILE_W);
        return { x: gx, y: gy };
    },

    // World koordinatani ekranga aylantirish (eng ko'p chaqiriladigan funksiya)
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom + this._cw / 2,
            y: (wy - this.y) * this.zoom + this._ch / 2
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

// Camera tayyor bo'lgach canvas o'lchamlarini kesh qilamiz
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => Camera.onResize(), 0);
});
window.addEventListener('resize', () => Camera.onResize());
