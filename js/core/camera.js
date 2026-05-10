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

    // Inertia (Pan Momentum)
    _vx: 0,            // Horizontal velocity (world units/frame)
    _vy: 0,            // Vertical velocity
    _friction: 0.88,   // Velocity decay per frame (0.88 = 88% retained each frame)

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
        this._clamp();
    },

    // Inertia boshlash (drag tugaganda chaqiriladi)
    startInertia(vx, vy) {
        this._vx = vx / this.zoom;
        this._vy = vy / this.zoom;
    },

    // Inertia to'xtatish (boshqa drag boshlanganda)
    stopInertia() {
        this._vx = 0;
        this._vy = 0;
    },

    // Kamera chegaralarini qo'llash
    _clamp() {
        // Izometrik xaritaning world-space chegaralari:
        // Eng chap nuqta: (0, SIZE) grid → x = -(SIZE/2)*TILE_W
        // Eng o'ng nuqta: (SIZE, 0) grid → x = +(SIZE/2)*TILE_W
        // Yuqori nuqta:   (0, 0)   grid → y = 0
        // Pastki nuqta:   (SIZE,SIZE) grid → y = SIZE*TILE_H
        const half = Grid.SIZE / 2;
        const mapHalfW = half * Grid.TILE_W;
        const mapH     = Grid.SIZE * Grid.TILE_H;
        const margin   = Grid.TILE_W; // 1 tile margin
        this.x = Helpers.clamp(this.x, -mapHalfW - margin, mapHalfW + margin);
        this.y = Helpers.clamp(this.y, -margin,             mapH + margin);
    },

    // ── Smooth tween animatsiyasi ─────────────────────────────────────────
    _tween: null,  // { startX, startY, endX, endY, startZ, endZ, startMs, dur, onDone }

    // Kamera va zoom ni bir vaqtda silkimasdan animatsiyalash (CoC uslubi)
    // gx, gy — grid koordinatasi; zoomTarget — yaqinlash darajasi; dur — ms
    tweenTo(gx, gy, zoomTarget, dur = 700, onDone = null) {
        const iso = this.toIso(gx, gy);
        this._tween = {
            startX:  this.x,
            startY:  this.y,
            endX:    iso.x,
            endY:    iso.y,
            startZ:  this.zoom,
            endZ:    Helpers.clamp(zoomTarget, this.minZoom, this.maxZoom),
            startMs: performance.now(),
            dur,
            onDone,
        };
        this.stopInertia();
    },

    // Faqat kamera pozitsiyasini tween (zoom o'zgarishsiz)
    panTo(gx, gy, dur = 500, onDone = null) {
        this.tweenTo(gx, gy, this.zoom, dur, onDone);
    },

    // Tween ni bekor qilish
    cancelTween() {
        if (this._tween?.onDone) this._tween.onDone();
        this._tween = null;
    },

    // Ease funksiyasi: ease-in-out cubic
    _easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    // Smooth zoom + inertia yangilash
    update() {
        // ── Tween animatsiya ──────────────────────────────────────────────────
        if (this._tween) {
            const tw = this._tween;
            const elapsed = performance.now() - tw.startMs;
            const rawT    = Math.min(1, elapsed / tw.dur);
            const t       = this._easeInOut(rawT);

            this.x    = tw.startX + (tw.endX - tw.startX) * t;
            this.y    = tw.startY + (tw.endY - tw.startY) * t;
            this.zoom = tw.startZ + (tw.endZ - tw.startZ) * t;
            this.targetZoom = this.zoom; // smooth zoom bilan conflict olmasin

            if (rawT >= 1) {
                this.x    = tw.endX;
                this.y    = tw.endY;
                this.zoom = tw.endZ;
                this.targetZoom = tw.endZ;
                const cb  = tw.onDone;
                this._tween = null;
                if (cb) cb();
            }
            this._clamp();
            return; // Tween paytida inertia o'chirilgan
        }

        this.zoom += (this.targetZoom - this.zoom) * this.smoothing;
        if (Math.abs(this.targetZoom - this.zoom) < 0.001) {
            this.zoom = this.targetZoom;
        }
        // Inertia harakat
        if (Math.abs(this._vx) > 0.05 || Math.abs(this._vy) > 0.05) {
            this.x += this._vx;
            this.y += this._vy;
            this._vx *= this._friction;
            this._vy *= this._friction;
            this._clamp();
        } else {
            this._vx = 0;
            this._vy = 0;
        }
    }
};

// Camera tayyor bo'lgach canvas o'lchamlarini kesh qilamiz
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => Camera.onResize(), 0);
});
window.addEventListener('resize', () => Camera.onResize());
