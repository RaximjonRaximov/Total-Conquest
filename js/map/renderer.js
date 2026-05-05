// ============================================
// IZOMETRIK RENDERER - Yaxshilangan xarita
// Xarita chegaralarida suv, teranga variatsia
// ============================================

const MapRenderer = {
    canvas: null,
    ctx: null,
    imageCache: {},

    loadImage(src) {
        if (this.imageCache[src] !== undefined) return this.imageCache[src];
        const img = new Image();
        img.src = src;
        this.imageCache[src] = null;
        img.onload = () => { this.imageCache[src] = img; };
        return null;
    },

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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

                // O't-o'lan dekoratsiyasi (ba'zi tilearda)
                if (distFromEdge > 3) {
                    const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
                    const v = seed - Math.floor(seed);
                    if (v > 0.88) {
                        // Kichik o't
                        this.ctx.globalAlpha = 0.35;
                        this.ctx.fillStyle = `hsl(${90 + v * 30}, 60%, ${35 + v * 15}%)`;
                        const gx = px + (v - 0.5) * hw * 0.5;
                        const gy = py + (v - 0.5) * hh * 0.3;
                        this.ctx.beginPath();
                        this.ctx.arc(gx, gy, 1.5 * Camera.zoom, 0, Math.PI * 2);
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

    // Butun xaritani chizish
    renderMap() {
        const bgImg = this.loadImage('assets/map/bg.png');
        
        if (bgImg) {
            // Background image scroll va zoom bilan birga harakatlanadi
            const centerIso = Camera.toIso(Grid.SIZE / 2, Grid.SIZE / 2);
            const screen = Camera.worldToScreen(centerIso.x, centerIso.y);
            const z = Camera.zoom;
            
            // Rasmni o'yin markaziga joylashtiramiz
            const iw = bgImg.width * z;
            const ih = bgImg.height * z;
            
            // Rasmning markazini grid markazi bilan ustma-ust tushiramiz
            // Eslatma: Foydalanuvchi rasmini tile o'lchamiga moslab (Grid.TILE_W=64) yasagan bo'lishi kerak
            this.ctx.drawImage(bgImg, screen.x - iw/2, screen.y - ih/2, iw, ih);
        } else {
            // Fonni chizish — quyuqroq ko'k (suv effekti)
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 0,
                this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 1.5
            );
            gradient.addColorStop(0, '#1a2840');
            gradient.addColorStop(0.6, '#122035');
            gradient.addColorStop(1, '#0a1525');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Suv animatsiyasi (xarita tashqarisida)
            this._drawWaterEffect();
        }

        const mx = Input.mouse.tileX;
        const my = Input.mouse.tileY;

        for (let y = 0; y < Grid.SIZE; y++) {
            for (let x = 0; x < Grid.SIZE; x++) {
                const isHover = (x === mx && y === my);
                // Agar bgImg bo'lsa, drawTile ga "faqat chiziqlar (transparent)" deb belgi beramiz
                this.drawTile(x, y, isHover, !!bgImg);
            }
        }
    },

    _drawWaterEffect() {
        const z = Camera.zoom;
        const time = Date.now() * 0.001;

        // Xaritaning 4 burchagida to'lqin chiziqlar
        const corners = [
            { gx: -1, gy: -1 },
            { gx: Grid.SIZE, gy: -1 },
            { gx: -1, gy: Grid.SIZE },
            { gx: Grid.SIZE, gy: Grid.SIZE }
        ];

        this.ctx.globalAlpha = 0.15;
        for (let i = 0; i < 8; i++) {
            const wave = Math.sin(time + i * 0.8) * 3 * z;
            const edgeY = -2 - i;
            for (let x = -3; x < Grid.SIZE + 3; x++) {
                const iso = Camera.toIso(x, edgeY);
                const screen = Camera.worldToScreen(iso.x, iso.y + wave);
                if (screen.x > -50 && screen.x < this.canvas.width + 50) {
                    const hw = Grid.TILE_W * z / 2;
                    this.ctx.fillStyle = `rgba(60, 130, 200, ${0.1 - i * 0.01})`;
                    this.ctx.fillRect(screen.x - hw/2, screen.y, hw, 2 * z);
                }
            }
        }
        this.ctx.globalAlpha = 1;
    },

    _blendColor(c1, c2, factor) {
        // Oddiy blend — faqat HSL stringlar uchun
        // factor = 0 means c1, factor = 1 means c2
        return factor > 0.5 ? c2 : c1;
    }
};
