// ============================================
// IZOMETRIK RENDERER - Yaxshilangan xarita
// Xarita chegaralarida suv, teranga variatsia
// ============================================

const MapRenderer = {
    canvas: null,
    ctx: null,
    imageCache: {},

    // ── Ambient environment ──────────────────────────
    _clouds: [],
    _birds:  [],
    _ambientInited: false,

    // ── Day/Night cycle ──────────────────────────────
    _dayStart: Date.now(),  // Real time boshlash vaqti
    _dayDuration: 600000,   // 10 daqiqa = to'liq kun (real ms)
    _rainDrops: [],
    _rainActive: false,
    _rainStartTime: 0,
    _rainDuration: 0,
    _lastRainCheck: 0,
    _rainSplashes: [],   // Yerda hosil bo'ladigan doira splashlar
    _lightningTimer: 0,  // Keyingi chaqmoq vaqti
    _lightningFlash: 0,  // Chaqmoq chaqnash alpha

    getDayProgress() {
        const elapsed = (Date.now() - this._dayStart) % this._dayDuration;
        return elapsed / this._dayDuration; // 0→1: erta tong→tun
    },

    // p: 0=tong, 0.25=tush, 0.5=kech, 0.75=yarim tun, 1=tong
    getSkyAlpha() {
        const p = this.getDayProgress();
        // 0.0-0.15: tong (qizg'ish)
        // 0.15-0.4: kun (yoriq)
        // 0.4-0.55: kech (to'q sariq)
        // 0.55-0.7: shom (to'q ko'k)
        // 0.7-1.0: tun (qorong'i)
        if (p < 0.15) return { phase:'dawn', dark: 0.4 - p * 2 };
        if (p < 0.4)  return { phase:'day',  dark: 0 };
        if (p < 0.55) return { phase:'dusk',  dark: (p - 0.4) * 3 };
        if (p < 0.7)  return { phase:'eve',   dark: 0.45 + (p - 0.55) * 1.5 };
        return { phase:'night', dark: Math.min(0.7, 0.45 + (p - 0.7) * 0.8) };
    },

    _checkRain() {
        const now = Date.now();
        if (now - this._lastRainCheck < 60000) return; // Har daqiqada tekshir
        this._lastRainCheck = now;
        if (!this._rainActive && Math.random() < 0.12) { // 12% yomg'ir boshlanishi
            this._rainActive = true;
            this._rainStartTime = now;
            this._rainDuration  = 60000 + Math.random() * 120000; // 1-3 daqiqa
            this._rainDrops = [];
            // 80 ta tomchi yaratish
            const W = this.canvas?.width || 400;
            const H = this.canvas?.height || 700;
            for (let i = 0; i < 80; i++) {
                this._rainDrops.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    speed: 6 + Math.random() * 6,
                    len: 8 + Math.random() * 10,
                    alpha: 0.15 + Math.random() * 0.2,
                });
            }
        } else if (this._rainActive && now - this._rainStartTime > this._rainDuration) {
            this._rainActive = false;
        }
    },

    _drawWeather(ctx) {
        // Day/Night overlay
        const sky = this.getSkyAlpha();
        if (sky.dark > 0.01) {
            ctx.save();
            if (sky.phase === 'dawn') {
                ctx.fillStyle = `rgba(180,80,20,${sky.dark * 0.45})`;
            } else if (sky.phase === 'dusk') {
                ctx.fillStyle = `rgba(220,100,20,${sky.dark * 0.4})`;
            } else if (sky.phase === 'eve') {
                ctx.fillStyle = `rgba(20,30,80,${sky.dark * 0.55})`;
            } else {
                ctx.fillStyle = `rgba(5,10,30,${sky.dark})`;
            }
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Fireflies at night/eve
            if ((sky.phase === 'night' || sky.phase === 'eve')
                && (typeof Game === 'undefined' || Game.mode === 'home')) {
                this._drawFireflies(ctx, sky.dark * 0.9);
            }

            // Stars at night
            if (sky.phase === 'night' || sky.phase === 'eve') {
                const starAlpha = sky.dark * 0.6;
                ctx.fillStyle = `rgba(255,255,255,${starAlpha})`;
                for (let s = 0; s < 40; s++) {
                    // Pseudo-random stable positions based on index
                    const sx = ((s * 137 + 53) % 400) / 400 * this.canvas.width;
                    const sy = ((s * 89 + 17) % 300) / 300 * this.canvas.height * 0.5;
                    const twinkle = 0.4 + Math.sin(Date.now() * 0.001 + s) * 0.3;
                    ctx.globalAlpha = starAlpha * twinkle;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        }

        // Rain
        if (this._rainActive) {
            const now = Date.now();
            const elapsed = now - this._rainStartTime;
            const fade = elapsed < 5000 ? elapsed / 5000
                        : elapsed > this._rainDuration - 5000 ? (this._rainDuration - elapsed) / 5000
                        : 1.0;

            const W = this.canvas.width;
            const H = this.canvas.height;
            ctx.save();
            ctx.strokeStyle = 'rgba(160,200,255,0.6)';
            ctx.lineWidth = 0.8;
            for (const d of this._rainDrops) {
                d.y += d.speed;
                d.x -= d.speed * 0.15;
                if (d.y > H) {
                    // Splash — tomchi yerga tushganda doira hosil bo'ladi
                    if (Math.random() < 0.35) {
                        this._rainSplashes.push({
                            x: d.x, y: d.y,
                            r: 0, maxR: 3 + Math.random() * 4,
                            alpha: 0.55 * fade,
                            born: now,
                            dur: 300 + Math.random() * 200,
                        });
                    }
                    d.y = -d.len;
                    d.x = Math.random() * W;
                }
                if (d.x < 0) { d.x = W; }
                ctx.globalAlpha = d.alpha * fade;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - d.speed * 0.15 * (d.len / d.speed), d.y - d.len);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Splash doiralarni chizish
            ctx.strokeStyle = 'rgba(150,200,255,0.6)';
            ctx.lineWidth = 0.6;
            this._rainSplashes = this._rainSplashes.filter(s => {
                const age = now - s.born;
                if (age > s.dur) return false;
                const t = age / s.dur;
                s.r = s.maxR * Math.pow(t, 0.4);
                ctx.globalAlpha = s.alpha * (1 - t);
                ctx.beginPath();
                ctx.ellipse(s.x, s.y, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
                ctx.stroke();
                return true;
            });
            ctx.globalAlpha = 1;

            // Chaqmoq chaqnash (intense rain paytida) — CoC-style
            if (!this._lightningTimer || now > this._lightningTimer) {
                this._lightningTimer = now + 8000 + Math.random() * 12000;
                this._lightningFlash = now;
            }
            if (this._lightningFlash && now - this._lightningFlash < 180) {
                const lAge = now - this._lightningFlash;
                const lAlpha = lAge < 80 ? (1 - lAge/80) * 0.18
                             : lAge < 140 ? (lAge - 80) / 60 * 0.1
                             : (1 - (lAge - 140) / 40) * 0.1;
                ctx.save();
                ctx.fillStyle = `rgba(200,220,255,${lAlpha})`;
                ctx.fillRect(0, 0, W, H);
                ctx.restore();
            }

            ctx.restore();
        }
    },

    _initAmbient() {
        this._ambientInited = true;
        // 5 ta bulut
        for (let i = 0; i < 5; i++) {
            this._clouds.push(this._makeCloud(true));
        }
        // 2 ta qush to'dasi
        for (let i = 0; i < 2; i++) {
            this._birds.push(this._makeFlock(true));
        }
    },

    _makeCloud(randomPos = false) {
        const w = this.canvas ? this.canvas.width : 400;
        const h = this.canvas ? this.canvas.height : 600;
        return {
            x: randomPos ? Math.random() * w : -150,
            y: randomPos ? 20 + Math.random() * h * 0.45 : 20 + Math.random() * (h * 0.45),
            speed: 0.12 + Math.random() * 0.18,   // px/frame at 60fps
            alpha: 0.06 + Math.random() * 0.10,
            r1: 28 + Math.random() * 20,
            r2: 20 + Math.random() * 14,
            r3: 16 + Math.random() * 12,
        };
    },

    _makeFlock(randomPos = false) {
        const w = this.canvas ? this.canvas.width : 400;
        const h = this.canvas ? this.canvas.height : 600;
        return {
            x: randomPos ? Math.random() * w : -80,
            y: 30 + Math.random() * (h * 0.35),
            speed: 0.4 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2,
            count: 3 + Math.floor(Math.random() * 4),
        };
    },

    _drawAmbient(ctx) {
        if (!this._ambientInited) this._initAmbient();
        const W = this.canvas.width;
        const H = this.canvas.height;
        const now = Date.now();

        ctx.save();

        // Bulutlar
        for (let i = 0; i < this._clouds.length; i++) {
            const c = this._clouds[i];
            c.x += c.speed;
            if (c.x > W + 180) {
                // Qayta keladi
                Object.assign(c, this._makeCloud(false));
                c.y = 20 + Math.random() * H * 0.4;
            }
            ctx.globalAlpha = c.alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(c.x,       c.y,       c.r1, 0, Math.PI * 2);
            ctx.arc(c.x + c.r1 * 0.7, c.y - c.r2 * 0.3, c.r2, 0, Math.PI * 2);
            ctx.arc(c.x - c.r1 * 0.5, c.y - c.r3 * 0.2, c.r3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Qushlar
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#cce4ff';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < this._birds.length; i++) {
            const f = this._birds[i];
            f.x += f.speed;
            if (f.x > W + 100) {
                Object.assign(f, this._makeFlock(false));
                f.y = 30 + Math.random() * H * 0.3;
            }
            const t = now * 0.001 + f.phase;
            for (let j = 0; j < f.count; j++) {
                const bx = f.x + j * 14 - (f.count - 1) * 7;
                const by = f.y + Math.sin(t * 2.5 + j * 0.8) * 4;
                const flap = Math.sin(t * 5 + j * 0.6) * 3;
                ctx.beginPath();
                ctx.moveTo(bx - 5, by + flap);
                ctx.quadraticCurveTo(bx, by - 2, bx + 5, by + flap);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    },
    // ──────────────────────────────────────────────────

    loadImage(src) {
        if (this.imageCache[src] !== undefined) return this.imageCache[src];
        const img = new Image();
        img.src = src;
        this.imageCache[src] = null;
        img.onload = () => { this.imageCache[src] = img; };
        return null;
    },

    // ── Offscreen tile cache — kamera o'zgarmasa tileni qayta chizmaslik ────
    _tileCache: null,       // OffscreenCanvas yoki null
    _tileCacheCtx: null,
    _tileCamX: null,        // Oxirgi kesh paytdagi camera holati
    _tileCamY: null,
    _tileCamZ: null,
    _tileDirty: true,       // true bo'lsa — qayta chizish kerak

    markTilesDirty() { this._tileDirty = true; },

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._tileDirty = true;
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        Camera.onResize(); // Canvas keshini yangilash
        this._tileDirty = true;  // Canvas o'lchami o'zgardi — qayta chiz
        this._tileCache = null;
    },

    // Bitta tile chizish
    drawTile(x, y, hover, isBgLoaded = false) {
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

        // Agar foydalanuvchi fon rasmini qo'ygan bo'lsa, qattiq green tilelarni chizmaymiz
        if (!isBgLoaded) {
            const c = Grid.getTileColor(x, y);

            // Chegaradagi tilelar — qumloq rang
            const distFromEdge = Math.min(x, y, Grid.SIZE - 1 - x, Grid.SIZE - 1 - y);
            let topColor = c.top;
            let leftColor = c.left;
            let rightColor = c.right;

            if (distFromEdge <= 1) {
                // Suv chegarasi — qumli
                topColor = `hsl(45, 40%, ${42 + distFromEdge * 5}%)`;
                leftColor = `hsl(45, 40%, ${34 + distFromEdge * 5}%)`;
                rightColor = `hsl(45, 40%, ${28 + distFromEdge * 5}%)`;
            } else if (distFromEdge <= 3) {
                // O'tish zonasi — yashil-qumloq
                const mix = (distFromEdge - 1) / 2;
                topColor = this._blendColor(c.top, `hsl(45, 40%, 42%)`, 1 - mix);
                leftColor = this._blendColor(c.left, `hsl(45, 40%, 34%)`, 1 - mix);
                rightColor = this._blendColor(c.right, `hsl(45, 40%, 28%)`, 1 - mix);
            }

            const tileImg = this.loadImage('assets/map/tile.png');

            if (tileImg) {
                const iw = Grid.TILE_W * Camera.zoom;
                const ih = tileImg.height * (iw / tileImg.width); // Aspect ratio saqlash
                // Tile rasm isometrik hisoblangani uchun top-left koordinatasini to'g'rilash
                this.ctx.drawImage(tileImg, px - hw, py - ih/2, iw, ih);
            } else {
                // Yuqori yuz
                this.ctx.beginPath();
                this.ctx.moveTo(px, py - hh);
                this.ctx.lineTo(px + hw, py);
                this.ctx.lineTo(px, py + hh);
                this.ctx.lineTo(px - hw, py);
                this.ctx.closePath();
                this.ctx.fillStyle = topColor;
                this.ctx.fill();

                // Chap yon
                this.ctx.beginPath();
                this.ctx.moveTo(px - hw, py);
                this.ctx.lineTo(px, py + hh);
                this.ctx.lineTo(px, py + hh + d);
                this.ctx.lineTo(px - hw, py + d);
                this.ctx.closePath();
                this.ctx.fillStyle = leftColor;
                this.ctx.fill();

                // O'ng yon
                this.ctx.beginPath();
                this.ctx.moveTo(px + hw, py);
                this.ctx.lineTo(px, py + hh);
                this.ctx.lineTo(px, py + hh + d);
                this.ctx.lineTo(px + hw, py + d);
                this.ctx.closePath();
                this.ctx.fillStyle = rightColor;
                this.ctx.fill();

                // ── Tile dekoratsiyasi — o't, gul, tosh patchlar ─────────────────
                if (distFromEdge > 3) {
                    const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
                    const v = seed - Math.floor(seed);
                    const seed2 = Math.sin(x * 1664525 + y * 1013904223) * 22695477.5;
                    const v2 = seed2 - Math.floor(seed2);
                    const z2 = Camera.zoom;

                    if (v > 0.88) {
                        // O't cho'qi — 2-3 ta kichik chiziq
                        const gx0 = px + (v - 0.5) * hw * 0.5;
                        const gy0 = py + (v - 0.5) * hh * 0.3;
                        const blades = 2 + (v2 > 0.5 ? 1 : 0);
                        for (let bi = 0; bi < blades; bi++) {
                            const bOx = (bi - 1) * 2 * z2;
                            this.ctx.globalAlpha = 0.28 + v * 0.12;
                            this.ctx.strokeStyle = `hsl(${90 + v * 30},${60 + bi * 5}%,${30 + v * 12}%)`;
                            this.ctx.lineWidth   = 0.8 * z2;
                            this.ctx.lineCap     = 'round';
                            this.ctx.beginPath();
                            this.ctx.moveTo(gx0 + bOx, gy0 + 2 * z2);
                            this.ctx.lineTo(gx0 + bOx + (bi - 0.5) * z2, gy0 - 2.5 * z2);
                            this.ctx.stroke();
                        }
                        this.ctx.globalAlpha = 1;
                    } else if (v > 0.80 && v2 > 0.65) {
                        // Kichik tosh — kulrang ellips
                        const rx = px + (v2 - 0.5) * hw * 0.6;
                        const ry = py + (v  - 0.5) * hh * 0.4;
                        this.ctx.globalAlpha = 0.22;
                        this.ctx.fillStyle   = `hsl(0,0%,${40 + v2 * 18}%)`;
                        this.ctx.beginPath();
                        this.ctx.ellipse(rx, ry, 2.2 * z2, 1.2 * z2, v2 * Math.PI, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.globalAlpha = 1;
                    } else if (v > 0.76 && v2 < 0.25) {
                        // Kichik gul — sariq/oq nuqta
                        const fx = px + (v2 - 0.5) * hw * 0.8;
                        const fy = py + (v  - 0.5) * hh * 0.5;
                        const flowerColor = v2 < 0.12 ? `hsl(55,90%,${65 + v*15}%)` : `rgba(255,255,255,0.7)`;
                        this.ctx.globalAlpha = 0.45;
                        this.ctx.fillStyle   = flowerColor;
                        this.ctx.beginPath();
                        this.ctx.arc(fx, fy, 1.0 * z2, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.globalAlpha = 1;
                    }
                }
            }
        } // if !isBgLoaded end

        // Grid chiziq (Har doim chizamiz, hattoki rasm qo'yilgan bo'lsa ham)
        this.ctx.beginPath();
        this.ctx.moveTo(px, py - hh);
        this.ctx.lineTo(px + hw, py);
        this.ctx.lineTo(px, py + hh);
        this.ctx.lineTo(px - hw, py);
        this.ctx.closePath();
        this.ctx.strokeStyle = isBgLoaded ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.06)';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();

        // Hover (faqat joylashtirish rejimida emas)
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
    },

    // === FRUSTUM CULLING — faqat ekranda ko'rinadigan tilelarni chizamiz ===
    // 1936 tile o'rniga ~150-400 tile (zoom ga qarab). ~5-10x tezlashtirish.
    _getVisibleRange() {
        const cw = this.canvas.width, ch = this.canvas.height;
        const z  = Camera.zoom;
        const hw = Grid.TILE_W / 2;
        const hh = Grid.TILE_H / 2;

        // Ekran 4 burchagi → iso world → grid koordinata
        const corners = [[0,0],[cw,0],[0,ch],[cw,ch]];
        let minGX = Infinity, maxGX = -Infinity;
        let minGY = Infinity, maxGY = -Infinity;

        for (const [sx, sy] of corners) {
            const ix = (sx - cw/2) / z + Camera.x;
            const iy = (sy - ch/2) / z + Camera.y;
            const u = ix / hw;
            const v = iy / hh;
            const gx = (u + v) / 2;
            const gy = (v - u) / 2;
            if (gx < minGX) minGX = gx;
            if (gx > maxGX) maxGX = gx;
            if (gy < minGY) minGY = gy;
            if (gy > maxGY) maxGY = gy;
        }

        const margin = 2;
        return {
            x1: Math.max(0, Math.floor(minGX) - margin),
            x2: Math.min(Grid.SIZE - 1, Math.ceil(maxGX) + margin),
            y1: Math.max(0, Math.floor(minGY) - margin),
            y2: Math.min(Grid.SIZE - 1, Math.ceil(maxGY) + margin)
        };
    },

    // Butun xaritani chizish
    renderMap() {
        const bgImg = this.loadImage('assets/map/bg.png');

        if (bgImg) {
            const centerIso = Camera.toIso(Grid.SIZE / 2, Grid.SIZE / 2);
            const screen = Camera.worldToScreen(centerIso.x, centerIso.y);
            const z = Camera.zoom;
            const iw = bgImg.width * z;
            const ih = bgImg.height * z;
            this.ctx.drawImage(bgImg, screen.x - iw/2, screen.y - ih/2, iw, ih);
        } else {
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 0,
                this.canvas.width / 2, this.canvas.height / 2,
                Math.max(this.canvas.width, this.canvas.height) / 1.5
            );
            gradient.addColorStop(0, '#1a2840');
            gradient.addColorStop(0.6, '#122035');
            gradient.addColorStop(1, '#0a1525');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this._drawWaterEffect();
        }

        const mx = Input.mouse.tileX;
        const my = Input.mouse.tileY;

        // Frustum culling — faqat ko'rinadigan tilelar
        const r = this._getVisibleRange();

        // ── Offscreen tile cache — kamera o'zgarmasa qayta chizmaslik ─────────
        // Battle rejimida yoki kamera harakatlanganda — har doim qayta chiz
        const camChanged = Camera.x !== this._tileCamX ||
                           Camera.y !== this._tileCamY ||
                           Camera.zoom !== this._tileCamZ;
        const inBattle   = typeof Game !== 'undefined' && Game.mode === 'attack';
        const useCache   = !inBattle && !bgImg; // faqat home va custom bg yo'q bo'lsa

        if (useCache && !camChanged && !this._tileDirty && this._tileCache) {
            // Cached tileni blit — drawTile loop o'rniga bitta drawImage
            this.ctx.drawImage(this._tileCache, 0, 0);
        } else {
            // Yangi kesh yaratish yoki qayta chizish
            if (useCache) {
                // OffscreenCanvas support tekshiruvi
                if (!this._tileCache || this._tileCache.width !== this.canvas.width ||
                    this._tileCache.height !== this.canvas.height) {
                    if (typeof OffscreenCanvas !== 'undefined') {
                        this._tileCache    = new OffscreenCanvas(this.canvas.width, this.canvas.height);
                        this._tileCacheCtx = this._tileCache.getContext('2d');
                    } else {
                        this._tileCache    = document.createElement('canvas');
                        this._tileCache.width  = this.canvas.width;
                        this._tileCache.height = this.canvas.height;
                        this._tileCacheCtx = this._tileCache.getContext('2d');
                    }
                }
                // Ofscreenga chizish uchun ctx ni vaqtincha almashtirish
                const mainCtx = this.ctx;
                this.ctx = this._tileCacheCtx;
                this._tileCacheCtx.clearRect(0, 0, this._tileCache.width, this._tileCache.height);
                for (let y = r.y1; y <= r.y2; y++) {
                    for (let x = r.x1; x <= r.x2; x++) {
                        this.drawTile(x, y, false, false); // hover ofscreenda chizilmaydi
                    }
                }
                this.ctx = mainCtx;
                this.ctx.drawImage(this._tileCache, 0, 0);
                // Hover tile ni asosiy canvasga chizish
                if (mx >= 0 && my >= 0) this.drawTile(mx, my, true, false);
                this._tileCamX   = Camera.x;
                this._tileCamY   = Camera.y;
                this._tileCamZ   = Camera.zoom;
                this._tileDirty  = false;
            } else {
                // bg rasm yoki battle rejimi — oddiy chizish
                for (let y = r.y1; y <= r.y2; y++) {
                    for (let x = r.x1; x <= r.x2; x++) {
                        this.drawTile(x, y, x === mx && y === my, !!bgImg);
                    }
                }
            }
        }

        // Ambient muhit effektlari (bulutlar, qushlar) — binolar ustida
        if (typeof Game === 'undefined' || Game.mode === 'home') {
            this._drawAmbient(this.ctx);
        }

        // Ob-havo va kun/tun
        this._checkRain();
        this._drawWeather(this.ctx);

        // Mavsumiy ambient zarralar (qor, barglar, gul)
        if (typeof Game === 'undefined' || Game.mode === 'home') {
            this._drawSeasonalParticles(this.ctx);
        }

        // Vignette — chetlarda qorong'i qatlam (CoC style)
        this._drawVignette(this.ctx);
    },

    // ── Seasonal particles ─────────────────────────────────────────────────
    _seasonalParticles: [],
    _seasonalLastSpawn: 0,
    _seasonalWind: 0,         // Global shamol kuchi (sinusoidal)
    _seasonalWindT: 0,        // Shamol vaqt o'zgaruvchisi

    _drawSeasonalParticles(ctx) {
        const month = new Date().getMonth(); // 0-11
        let season = null;
        let spawnRate = 0;
        let maxPart = 80;

        if (month === 11 || month === 0 || month === 1) {
            season = 'winter'; spawnRate = 0.55; maxPart = 110;
        } else if (month >= 2 && month <= 4) {
            season = 'spring'; spawnRate = 0.32; maxPart = 75;
        } else if (month >= 8 && month <= 10) {
            season = 'autumn'; spawnRate = 0.42; maxPart = 90;
        } else {
            // Yoz — butterflylar va issiqlik zarralari
            season = 'summer'; spawnRate = 0.10; maxPart = 25;
        }

        const now  = Date.now();
        const W    = ctx.canvas.width;
        const H    = ctx.canvas.height;

        // ── Shamol simulyatsiya — vaqt bilan silliq o'zgaradi ────────────────
        this._seasonalWindT += 0.0004;
        this._seasonalWind = Math.sin(this._seasonalWindT) * 0.7
                           + Math.sin(this._seasonalWindT * 2.3 + 1.2) * 0.3;
        const wind = this._seasonalWind;

        // Yangi zarralarni hosil qilish
        const spawnInterval = 1000 / (spawnRate * 30);
        if (now - this._seasonalLastSpawn > spawnInterval) {
            this._seasonalLastSpawn = now;
            const spawnCount = season === 'winter' ? 2 : 1;
            for (let si = 0; si < spawnCount; si++) {
                if (this._seasonalParticles.length >= maxPart) break;
                const isLarge = Math.random() < 0.15;
                const p = {
                    x:     Math.random() * (W + 60) - 30,
                    y:     -12,
                    vx:    (Math.random() - 0.5) * (season === 'autumn' ? 1.1 : 0.55),
                    vy:    season === 'winter'
                              ? (isLarge ? 1.5 : 0.5) + Math.random() * (isLarge ? 1.5 : 1.0)
                              : (season === 'autumn' ? 0.6 : 0.35) + Math.random() * 0.7,
                    rot:   Math.random() * Math.PI * 2,
                    vrot:  (Math.random() - 0.5) * (season === 'autumn' ? 0.07 : 0.03),
                    size:  season === 'winter'  ? (isLarge ? 5 : 2 + Math.random() * 3)
                         : season === 'spring'  ? 3 + Math.random() * 4
                         : season === 'autumn'  ? 4 + Math.random() * 6
                         :                       3 + Math.random() * 3,
                    life:  1.0,
                    decay: season === 'winter' ? 0.0008 : 0.0012,
                    season,
                    phase:    Math.random() * Math.PI * 2,
                    colorIdx: Math.floor(Math.random() * 5),
                    isLarge,
                    wobble:   Math.random() * Math.PI * 2,  // o'z sway fazasi
                    wobbleF:  0.6 + Math.random() * 0.8,   // sway tezligi
                };
                this._seasonalParticles.push(p);
            }
        }

        ctx.save();

        // Zarrachalarni yangilash va chizish
        this._seasonalParticles = this._seasonalParticles.filter(p => {
            // Fizika yangilash
            const sway = Math.sin(now * 0.001 * p.wobbleF + p.wobble) *
                         (season === 'winter' ? 0.22 : 0.45);
            p.x   += p.vx + sway + wind * (p.size / 5);
            p.y   += p.vy;
            p.rot += p.vrot;
            p.life -= p.decay;

            if (p.y > H + 30 || p.x < -60 || p.x > W + 60 || p.life <= 0) return false;

            const fadeIn  = Math.min(1, p.life * 4);   // Tez ko'rinadi
            const fadeOut = p.life < 0.2 ? p.life / 0.2 : 1; // Asta yo'qoladi
            ctx.save();
            ctx.globalAlpha = fadeIn * fadeOut * (p.season === 'winter' ? 0.82 : 0.75);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);

            // ── QISH: Qor uchqunlari ──────────────────────────────────────────
            if (p.season === 'winter') {
                const r = p.size / 2;
                if (p.isLarge) {
                    // Katta qor parchalari — detalli 6 qirrali
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
                    ctx.fillStyle = '#edf6ff';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(180,220,255,0.9)';
                    ctx.lineWidth = 0.9;
                    for (let i = 0; i < 6; i++) {
                        const ang = (i / 6) * Math.PI * 2;
                        const cos = Math.cos(ang), sin = Math.sin(ang);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(cos * r * 1.8, sin * r * 1.8);
                        ctx.stroke();
                        // Yon shoxlar
                        const bLen = r * 0.7;
                        const bx = cos * r, by = sin * r;
                        const perpX = -sin, perpY = cos;
                        ctx.beginPath();
                        ctx.moveTo(bx, by);
                        ctx.lineTo(bx + perpX * bLen * 0.45, by + perpY * bLen * 0.45);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(bx, by);
                        ctx.lineTo(bx - perpX * bLen * 0.45, by - perpY * bLen * 0.45);
                        ctx.stroke();
                    }
                    // Markaziy yaltiroq
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.beginPath();
                    ctx.arc(-r*0.12, -r*0.12, r*0.22, 0, Math.PI*2);
                    ctx.fill();
                } else {
                    // Kichik qor — oddiy 6 ta tish
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
                    ctx.fillStyle = '#e0f2ff';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(180,215,255,0.7)';
                    ctx.lineWidth = 0.6;
                    for (let i = 0; i < 6; i++) {
                        const a = (i / 6) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
                        ctx.stroke();
                    }
                }

            // ── BAHOR: Gul barglari ───────────────────────────────────────────
            } else if (p.season === 'spring') {
                const petalColors = ['#ffb7c5', '#ff8fad', '#ffc8d0', '#f9a8b8', '#ffd1dc'];
                const col = petalColors[p.colorIdx % petalColors.length];
                // Asosiy barg shakli — ikki qavs bilan
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.bezierCurveTo(p.size * 0.85, -p.size * 0.4, p.size * 0.85, p.size * 0.4, 0, p.size * 0.8);
                ctx.bezierCurveTo(-p.size * 0.85, p.size * 0.4, -p.size * 0.85, -p.size * 0.4, 0, -p.size);
                const pgrd = ctx.createLinearGradient(0, -p.size, 0, p.size * 0.8);
                pgrd.addColorStop(0, col + 'ff');
                pgrd.addColorStop(0.5, col + 'dd');
                pgrd.addColorStop(1, '#ff6fa0' + '99');
                ctx.fillStyle = pgrd;
                ctx.fill();
                // Tomircha
                ctx.strokeStyle = 'rgba(200,80,120,0.25)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(0, -p.size * 0.7);
                ctx.lineTo(0, p.size * 0.6);
                ctx.stroke();

            // ── KUZ: Barglar ─────────────────────────────────────────────────
            } else if (p.season === 'autumn') {
                const leafCols = [
                    ['#ff6b35', '#ff4500'],  // Qizg'ish to'q sariq
                    ['#d4a017', '#b8860b'],  // Oltin
                    ['#c0392b', '#922b21'],  // Qovoq qizili
                    ['#e67e22', '#d35400'],  // To'q sariq
                    ['#8e44ad', '#6c3483'],  // Binafsha barg
                ];
                const lc = leafCols[p.colorIdx % leafCols.length];
                // Tuxumsimon barg + uchi uchlangan
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.bezierCurveTo(p.size * 0.7, -p.size * 0.5, p.size * 0.6, p.size * 0.5, 0, p.size);
                ctx.bezierCurveTo(-p.size * 0.6, p.size * 0.5, -p.size * 0.7, -p.size * 0.5, 0, -p.size);
                const lgrd = ctx.createLinearGradient(0, -p.size, 0, p.size);
                lgrd.addColorStop(0, lc[0]);
                lgrd.addColorStop(1, lc[1]);
                ctx.fillStyle = lgrd;
                ctx.fill();
                // Asosiy tomircha
                ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(0, -p.size * 0.8);
                ctx.lineTo(0, p.size * 0.85);
                ctx.stroke();
                // Yon tomirlari (3 ta)
                ctx.lineWidth = 0.35;
                for (let lv = 0; lv < 3; lv++) {
                    const ly = -p.size * 0.3 + lv * p.size * 0.4;
                    const lr = p.size * 0.45 * (1 - Math.abs(lv - 1) * 0.2);
                    ctx.beginPath();
                    ctx.moveTo(0, ly);
                    ctx.lineTo(lr, ly + p.size * 0.2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, ly);
                    ctx.lineTo(-lr, ly + p.size * 0.2);
                    ctx.stroke();
                }

            // ── YOZ: Kapalaklar / issiqlik zarralari ─────────────────────────
            } else if (p.season === 'summer') {
                // Kichik ko'k-yashil kapalak silueti
                const bf = Math.sin(now * 0.008 + p.phase) > 0; // qanotlar holati
                ctx.fillStyle = Math.random() < 0.5 ? '#80deea' : '#a5f3fc';
                if (bf) {
                    // Ochiq qanotlar
                    ctx.beginPath();
                    ctx.ellipse(-p.size*0.7, -p.size*0.2, p.size*0.8, p.size*0.45, -0.4, 0, Math.PI*2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(p.size*0.7, -p.size*0.2, p.size*0.8, p.size*0.45, 0.4, 0, Math.PI*2);
                    ctx.fill();
                } else {
                    // Yopiq qanotlar
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size*0.25, p.size*0.9, 0, 0, Math.PI*2);
                    ctx.fill();
                }
                // Tana
                ctx.fillStyle = '#0e7490';
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size*0.12, p.size*0.6, 0, 0, Math.PI*2);
                ctx.fill();
            }

            ctx.restore();
            return true;
        });

        ctx.restore();
    },

    // ── Fireflies — kechasi uchuvchi chiroqlar (CoC ambient) ─────────────────
    _fireflies: null,  // lazy init
    _fireflyLastUpdate: 0,

    _initFireflies(W, H) {
        this._fireflies = [];
        for (let i = 0; i < 18; i++) {
            this._fireflies.push({
                x:     Math.random() * W,
                y:     H * 0.2 + Math.random() * H * 0.65,
                vx:    (Math.random() - 0.5) * 0.4,
                vy:    (Math.random() - 0.5) * 0.25,
                phase: Math.random() * Math.PI * 2,     // blink offset
                blinkSpeed: 0.002 + Math.random() * 0.003, // blink tezligi
                r:     1.2 + Math.random() * 1.8,       // radius
                // Har bir chiroq biroz sariq-yashil rangda
                hue: 80 + Math.random() * 40,           // 80-120 = sariq-yashil
            });
        }
    },

    _drawFireflies(ctx, nightAlpha) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;

        // Lazy init
        if (!this._fireflies) this._initFireflies(W, H);

        const now = Date.now();
        const dt  = Math.min(50, now - (this._fireflyLastUpdate || now));
        this._fireflyLastUpdate = now;

        ctx.save();

        for (const f of this._fireflies) {
            // Harakat (sinusoidal drift)
            f.x += f.vx + Math.sin(now * 0.0006 + f.phase) * 0.3;
            f.y += f.vy + Math.cos(now * 0.0007 + f.phase * 1.3) * 0.2;

            // Ekran chetidan chiqsa qaytarish
            if (f.x < -10)  { f.x = W + 10; }
            if (f.x > W+10) { f.x = -10; }
            if (f.y < H*0.1) f.vy += 0.05;
            if (f.y > H*0.9) f.vy -= 0.05;

            // Blink: 0→1→0 (sinus bilan)
            const blink = 0.3 + 0.7 * (Math.sin(now * f.blinkSpeed + f.phase) * 0.5 + 0.5);
            const alpha = nightAlpha * blink * 0.85;

            if (alpha < 0.04) continue;

            // Glow halo
            const glowR = f.r * 5;
            const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowR);
            grd.addColorStop(0, `hsla(${f.hue},100%,85%,${alpha})`);
            grd.addColorStop(0.4, `hsla(${f.hue},90%,65%,${alpha * 0.6})`);
            grd.addColorStop(1, `hsla(${f.hue},80%,50%,0)`);
            ctx.beginPath();
            ctx.arc(f.x, f.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();

            // Markaziy nuqta (porlayotgan)
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${f.hue},100%,95%,${alpha * 1.2})`;
            ctx.fill();
        }

        ctx.restore();
    },

    _drawVignette(ctx) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        ctx.save();
        // Tashqi halqa
        const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    },

    _drawWaterEffect() {
        const z = Camera.zoom;
        const time = Date.now() * 0.001;
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // ── Katta to'lqin panjaralari — xaritaning barcha 4 tomonida ─────────────
        const LAYERS = 5;
        for (let side = 0; side < 4; side++) {
            for (let i = 0; i < LAYERS; i++) {
                const wavePhase = time * 0.6 + i * 1.4 + side * 2.7;
                const waveOff   = Math.sin(wavePhase) * 2.5 * z;
                const alpha     = (0.12 - i * 0.02) * Math.max(0.3, z);

                let edgeA, edgeB;  // start/end tile coords of this edge strip
                if (side === 0) { // Top-left edge (x+y = -1 - i)
                    edgeA = { x: -1 - i, y: -1 - i };
                    edgeB = { x: Grid.SIZE + i, y: -1 - i };
                } else if (side === 1) { // Top-right edge
                    edgeA = { x: Grid.SIZE + i, y: -1 - i };
                    edgeB = { x: Grid.SIZE + i, y: Grid.SIZE + i };
                } else if (side === 2) { // Bottom-right edge
                    edgeA = { x: Grid.SIZE + i, y: Grid.SIZE + i };
                    edgeB = { x: -1 - i, y: Grid.SIZE + i };
                } else { // Bottom-left edge
                    edgeA = { x: -1 - i, y: Grid.SIZE + i };
                    edgeB = { x: -1 - i, y: -1 - i };
                }

                // Har edge tilesini chizish
                const steps = Grid.SIZE + 4;
                for (let s = 0; s < steps; s++) {
                    const tx = edgeA.x + (edgeB.x - edgeA.x) * s / steps;
                    const ty = edgeA.y + (edgeB.y - edgeA.y) * s / steps;
                    const iso = Camera.toIso(tx, ty);
                    const sc  = Camera.worldToScreen(iso.x, iso.y);
                    if (sc.x < -40 || sc.x > W + 40 || sc.y < -40 || sc.y > H + 40) continue;

                    const hw = Grid.TILE_W * z / 2;
                    const hh = Grid.TILE_H * z / 2;
                    const depth = i / LAYERS;
                    const r = Math.round(20 + depth * 40);
                    const gv = Math.round(80 + depth * 50);
                    const bv = Math.round(150 + depth * 50);

                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = `rgba(${r},${gv},${bv},1)`;
                    ctx.beginPath();
                    ctx.moveTo(sc.x,      sc.y - hh + waveOff);
                    ctx.lineTo(sc.x + hw, sc.y      + waveOff);
                    ctx.lineTo(sc.x,      sc.y + hh + waveOff);
                    ctx.lineTo(sc.x - hw, sc.y      + waveOff);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        // ── To'lqin chiziqlar (shimmer) — xarita atrofida ────────────────────────
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = 'rgba(120,200,255,1)';
        ctx.lineWidth   = 1 * z;
        for (let si = 0; si < 4; si++) {
            const wave2 = Math.sin(time * 0.8 + si * 2.1) * 4 * z;
            // Shimoliy chiziq
            const startIso = Camera.toIso(-2, -2 - si);
            const startSc  = Camera.worldToScreen(startIso.x, startIso.y + wave2);
            const endIso   = Camera.toIso(Grid.SIZE + 2, -2 - si);
            const endSc    = Camera.worldToScreen(endIso.x, endIso.y + wave2);
            if (startSc.y > -20 && startSc.y < H + 20) {
                ctx.beginPath();
                ctx.moveTo(startSc.x, startSc.y);
                ctx.lineTo(endSc.x, endSc.y);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    },

    _blendColor(c1, c2, factor) {
        // Oddiy blend — faqat HSL stringlar uchun
        // factor = 0 means c1, factor = 1 means c2
        return factor > 0.5 ? c2 : c1;
    }
};
