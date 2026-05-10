// ============================================
// MINI MAP — CoC uslubida kichik xarita
// ============================================

const MiniMap = {
    canvas: null,
    ctx: null,
    SIZE: 110,      // px (CSS: 110x110)
    _lastDraw: 0,
    _REDRAW_INTERVAL: 800,  // ms — statik asosni qayta chizish davri
    _visible: true,
    _dragging: false,

    init() {
        // Create container
        const wrap = document.createElement('div');
        wrap.id = 'minimap-wrap';
        wrap.style.cssText = `
            position:fixed;
            bottom:76px;
            right:8px;
            width:${this.SIZE}px;
            height:${this.SIZE}px;
            z-index:400;
            border-radius:10px;
            overflow:hidden;
            border:1.5px solid rgba(255,255,255,0.12);
            box-shadow:0 4px 20px rgba(0,0,0,0.7),inset 0 0 0 1px rgba(255,255,255,0.04);
            background:#060c0e;
            cursor:crosshair;
            user-select:none;
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.width  = this.SIZE;
        this.canvas.height = this.SIZE;
        this.canvas.style.cssText = 'display:block;width:100%;height:100%;';
        this.ctx = this.canvas.getContext('2d');

        // Toggle button (top-right corner of minimap)
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'minimap-toggle';
        toggleBtn.style.cssText = `
            position:absolute;top:3px;right:4px;
            font-size:9px;color:rgba(255,255,255,0.4);
            cursor:pointer;line-height:1;padding:2px 4px;
            background:rgba(0,0,0,0.4);border-radius:3px;
            z-index:1;
        `;
        toggleBtn.textContent = '✕';
        toggleBtn.onclick = (e) => { e.stopPropagation(); this.toggleVisibility(); };

        wrap.appendChild(this.canvas);
        wrap.appendChild(toggleBtn);
        document.body.appendChild(wrap);

        // Click/drag to move camera
        wrap.addEventListener('mousedown', e => { this._dragging = true; this._handleClick(e, wrap); });
        wrap.addEventListener('mousemove', e => { if (this._dragging) this._handleClick(e, wrap); });
        wrap.addEventListener('mouseup',   () => { this._dragging = false; });
        wrap.addEventListener('touchstart', e => { this._dragging = true; this._handleTouch(e, wrap); }, { passive: true });
        wrap.addEventListener('touchmove',  e => { if (this._dragging) this._handleTouch(e, wrap); }, { passive: true });
        wrap.addEventListener('touchend',   () => { this._dragging = false; });

        // Show/hide with game mode
        this._checkVisibility();

        // Render loop: 30 fps for viewport rect, 1 fps for base redraw
        requestAnimationFrame(() => this._loop());
    },

    _checkVisibility() {
        const wrap = document.getElementById('minimap-wrap');
        if (!wrap) return;
        const show = this._visible && typeof Game !== 'undefined' && Game.mode === 'home';
        wrap.style.display = show ? 'block' : 'none';
    },

    toggleVisibility() {
        this._visible = !this._visible;
        // Minimized state — show a small button instead
        const wrap = document.getElementById('minimap-wrap');
        if (!wrap) return;
        if (!this._visible) {
            wrap.style.width  = '32px';
            wrap.style.height = '32px';
            this.canvas.style.display = 'none';
            wrap.style.cursor = 'pointer';
            wrap.style.background = 'rgba(0,0,0,0.6)';
            wrap.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;" onclick="MiniMap.toggleVisibility()">🗺️</div>`;
        } else {
            wrap.style.width  = `${this.SIZE}px`;
            wrap.style.height = `${this.SIZE}px`;
            wrap.style.cursor = 'crosshair';
            wrap.style.background = '#060c0e';
            wrap.innerHTML = '';
            wrap.appendChild(this.canvas);
            const toggleBtn = document.createElement('div');
            toggleBtn.style.cssText = `position:absolute;top:3px;right:4px;font-size:9px;color:rgba(255,255,255,0.4);cursor:pointer;line-height:1;padding:2px 4px;background:rgba(0,0,0,0.4);border-radius:3px;z-index:1;`;
            toggleBtn.textContent = '✕';
            toggleBtn.onclick = (e) => { e.stopPropagation(); this.toggleVisibility(); };
            wrap.appendChild(toggleBtn);
            wrap.addEventListener('mousedown', e => { this._dragging = true; this._handleClick(e, wrap); });
            wrap.addEventListener('mousemove', e => { if (this._dragging) this._handleClick(e, wrap); });
            wrap.addEventListener('mouseup',   () => { this._dragging = false; });
            this.canvas.style.display = 'block';
            this._lastDraw = 0; // force redraw
        }
    },

    _handleClick(e, wrap) {
        const rect = wrap.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this._jumpCamera(mx / this.SIZE, my / this.SIZE);
    },

    _handleTouch(e, wrap) {
        if (!e.touches[0]) return;
        const rect = wrap.getBoundingClientRect();
        const mx = e.touches[0].clientX - rect.left;
        const my = e.touches[0].clientY - rect.top;
        this._jumpCamera(mx / this.SIZE, my / this.SIZE);
    },

    _jumpCamera(fx, fy) {
        if (typeof Camera === 'undefined' || typeof Grid === 'undefined') return;
        const GRID = Grid.SIZE;
        const tileW = Grid.TILE_W;
        const tileH = Grid.TILE_H;

        // Isometric minimap mapping (teskari):
        // mx = (wx - wy + GRID) / (2*GRID) * S → wx - wy = (2*fx - 1) * GRID
        // my = (wx + wy) / (2*GRID) * S        → wx + wy = 2*fy * GRID
        const xMinusY = (2 * fx - 1) * GRID;
        const xPlusY  = fy * 2 * GRID;

        // Isometric world coordinates — Camera.centerOn() bilan bir xil mantiq
        const ix = xMinusY * (tileW / 2);
        const iy = xPlusY  * (tileH / 2);

        // Camera.x/y = world markaz koordinatalari (Camera.centerOn() uslubida)
        Camera.x = ix;
        Camera.y = iy;
    },

    _loop() {
        requestAnimationFrame(() => this._loop());
        if (!this._visible) return;
        this._checkVisibility();

        const now = Date.now();
        const shouldRedrawBase = (now - this._lastDraw) > this._REDRAW_INTERVAL;

        if (shouldRedrawBase) {
            this._drawBase();
            this._lastDraw = now;
        }
        this._drawViewport();
    },

    _drawBase() {
        const ctx = this.ctx;
        const S   = this.SIZE;
        const GRID = typeof Grid !== 'undefined' ? Grid.SIZE : 30;

        ctx.clearRect(0, 0, S, S);

        // Background gradient
        const bg = ctx.createLinearGradient(0, 0, S, S);
        bg.addColorStop(0, '#0d1a10');
        bg.addColorStop(1, '#081008');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, S, S);

        // Izometrik o'yin maydonining chegarasi (diamond outline)
        const S2Gbg = S / (2 * GRID);
        ctx.beginPath();
        ctx.moveTo(GRID * S2Gbg,     0);           // top   = (0,0) → (x-y+G)/(2G)*S, (x+y)/(2G)*S
        ctx.lineTo(S,                S / 2);        // right = (G,0)
        ctx.lineTo(GRID * S2Gbg,     S);            // bottom= (G,G)
        ctx.lineTo(0,                S / 2);        // left  = (0,G)
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Diamond clip so buildings outside don't render past diamond edge
        ctx.save();
        ctx.clip();

        if (typeof BuildingManager === 'undefined') { ctx.restore(); return; }

        // Building type → color (category-grouped)
        const TYPE_COLORS = {
            // ── Town Center ──────────────────────────────
            townHall:        '#ffd700',
            // ── Defense ─────────────────────────────────
            archerTower:     '#80cbc4',
            scorpio:         '#ffb300',
            tormenta:        '#42a5f5',
            flamingCitadel:  '#ff5722',
            magicTower:      '#ce93d8',
            ballistaTower:   '#ef5350',
            // ── Walls / Barriers ─────────────────────────
            wall:            '#546e7a',
            gate:            '#78909c',
            // ── Military ────────────────────────────────
            barracks:        '#ef5350',
            musterGround:    '#ab47bc',
            militia:         '#7e57c2',
            heroAltar:       '#ffa726',
            // ── Resources ───────────────────────────────
            goldmine:        '#fdd835',
            villa:           '#ffee58',
            farm:            '#a5d6a7',
            goldStorage:     '#fbc02d',
            foodStorage:     '#ef9a9a',
            goldenAppleFarm: '#aed581',
            goldenAppleStorage:'#dce775',
            // ── Tech / Special ───────────────────────────
            laboratory:      '#ce93d8',
            spellFactory:    '#9c27b0',
            treeOfLife:      '#66bb6a',
            blacksmith:      '#bf360c',
            legionForum:     '#5c6bc0',
            allianceCastle:  '#1e88e5',
            // ── Traps ───────────────────────────────────
            spikeTrap:       '#757575',
            poisonTrap:      '#66bb6a',
            alchemicalTrap:  '#26c6da',
            springTrap:      '#ff8f00',
        };

        // Category fallback colors
        const CAT_FALLBACK = {
            mudofaa: '#78909c', resurs: '#fdd835', qurish: '#ef5350',
            texnologiya: '#9c27b0', devorlar: '#546e7a',
        };

        // Isometric minimap: grid (gx, gy) → minimap (mx, my)
        // mx = (gx - gy + GRID) / (2*GRID) * S  →  range [0, S], top=(S/2,0) right=(S,S/2) bottom=(S/2,S) left=(0,S/2)
        // my = (gx + gy) / (2*GRID) * S
        const S2G = S / (2 * GRID); // scale factor
        const toMini = (gx, gy) => ({
            x: (gx - gy + GRID) * S2G,
            y: (gx + gy) * S2G,
        });

        // Draw buildings as proper isometric parallelograms
        const sorted = Object.values(BuildingManager.buildings).sort((a, b) => (a.x + a.y) - (b.x + b.y));
        for (const b of sorted) {
            const bd = typeof BUILDING_DATA !== 'undefined' ? BUILDING_DATA[b.type] : null;
            if (!bd) continue;

            const bw = bd.size[0];
            const bh = bd.size[1];

            // 4 corners of building footprint in isometric minimap space
            const ptTop    = toMini(b.x,      b.y);
            const ptRight  = toMini(b.x + bw, b.y);
            const ptBottom = toMini(b.x + bw, b.y + bh);
            const ptLeft   = toMini(b.x,      b.y + bh);

            const col  = TYPE_COLORS[b.type] || (bd ? CAT_FALLBACK[bd.category] : null) || '#607d8b';
            const hpRatio = (b.maxHp > 0 && b.hp != null) ? b.hp / b.maxHp : 1;
            const isDefense = bd?.category === 'mudofaa';
            const isUnderConstruction = !!b.building;

            // Izometrik parallelogram chizish
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(ptTop.x,    ptTop.y);
            ctx.lineTo(ptRight.x,  ptRight.y);
            ctx.lineTo(ptBottom.x, ptBottom.y);
            ctx.lineTo(ptLeft.x,   ptLeft.y);
            ctx.closePath();

            // Color by state
            if (isUnderConstruction) {
                const pulse = 0.45 + 0.35 * Math.sin(Date.now() / 400);
                ctx.fillStyle = col + Math.max(0x20, Math.round(pulse * 0x88)).toString(16).padStart(2, '0');
            } else if (hpRatio < 0.5 && hpRatio > 0) {
                ctx.fillStyle = 'rgba(220,50,50,0.85)';
            } else {
                ctx.fillStyle = col + 'cc';
            }
            ctx.fill();

            // Defense buildings: subtle border
            if (isDefense && !isUnderConstruction) {
                ctx.strokeStyle = col + 'aa';
                ctx.lineWidth   = 0.7;
                ctx.stroke();
            }

            // Town Hall: gold glow + border
            if (b.type === 'townHall') {
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur  = 8;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth   = 1.5;
                ctx.stroke();
                ctx.shadowBlur  = 0;
            }

            // Under-construction: dashed border
            if (isUnderConstruction) {
                ctx.setLineDash([2, 2]);
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth   = 0.7;
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }

        ctx.restore(); // diamond clip restore

        // Decorative border (inner rounded)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
    },

    _drawViewport() {
        if (typeof Camera === 'undefined' || typeof Grid === 'undefined') return;
        const ctx = this.ctx;
        const S   = this.SIZE;
        const GRID = Grid.SIZE;
        // gameCanvas — to'g'ri ID
        const mainCanvas = document.getElementById('gameCanvas');
        if (!mainCanvas) return;

        const tileW = Grid.TILE_W;
        const tileH = Grid.TILE_H;
        const z     = Camera.zoom;
        const W     = mainCanvas.width;
        const H     = mainCanvas.height;
        const S2G   = S / (2 * GRID); // izometrik minimap scale
        // Camera center offset
        const cw2   = Camera._cw / 2 || W / 2;
        const ch2   = Camera._ch / 2 || H / 2;

        // Screen → grid tile space (Camera.worldToScreen() inversesi)
        const screenToTile = (sx, sy) => {
            // World izoscreen koordinata
            const iwx = (sx - cw2) / z + Camera.x;
            const iwy = (sy - ch2) / z + Camera.y;
            // Grid koordinata (float, floor yo'q)
            const gx = iwx / tileW + iwy / tileH;
            const gy = iwy / tileH - iwx / tileW;
            return { wx: gx, wy: gy };
        };

        // Tile → isometric minimap
        const tileToMini = (wx, wy) => ({
            x: (wx - wy + GRID) * S2G,
            y: (wx + wy) * S2G,
        });

        const screenCorners = [
            screenToTile(0, 0), screenToTile(W, 0),
            screenToTile(W, H), screenToTile(0, H),
        ];

        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < screenCorners.length; i++) {
            const { x, y } = tileToMini(screenCorners[i].wx, screenCorners[i].wy);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fill();

        const pulse = (Math.sin(Date.now() * 0.003) + 1) / 2;
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.2})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // "You are here" center dot
        const center = screenToTile(W / 2, H / 2);
        const { x: cx, y: cy } = tileToMini(center.wx, center.wy);
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${0.6 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },
};
