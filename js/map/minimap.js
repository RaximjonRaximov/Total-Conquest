// ============================================
// MINIMAP
// ============================================

const Minimap = {
    canvas: null,
    ctx: null,

    init() {
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this._initClickNav();
    },

    _initClickNav() {
        this.canvas.style.cursor = 'crosshair';
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) / rect.width;
            const my = (e.clientY - rect.top)  / rect.height;

            // Minimap koordinatlarini grid tile koordinatlariga o'girish
            // minimap x/y → isoX/isoY grid indekslari
            const gridX = my * Grid.SIZE + mx * Grid.SIZE - Grid.SIZE / 2;
            const gridY = my * Grid.SIZE - mx * Grid.SIZE + Grid.SIZE / 2;

            // Grid tile → world koordinatlar
            const worldX = (gridX - gridY) * (Grid.TILE_W / 2);
            const worldY = (gridX + gridY) * (Grid.TILE_H / 2);

            // Kamerani o'sha nuqtaga o'tkazish
            const gameCanvas = document.getElementById('gameCanvas');
            Camera.x = worldX - (gameCanvas.width  / Camera.zoom) / 2;
            Camera.y = worldY - (gameCanvas.height / Camera.zoom) / 2;
        });
    },

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    },

    render() {
        const mw = this.canvas.width;
        const mh = this.canvas.height;
        const tw = mw / Grid.SIZE;
        const th = mh / Grid.SIZE;

        this.ctx.fillStyle = '#0a0e17';
        this.ctx.fillRect(0, 0, mw, mh);

        // Tilelarni chizish
        for (let y = 0; y < Grid.SIZE; y++) {
            for (let x = 0; x < Grid.SIZE; x++) {
                const tile = Grid.tiles[y][x];
                if (tile.buildingId !== null) {
                    if (typeof tile.buildingId === 'string' && tile.buildingId.startsWith('obs_')) {
                        // To'siq
                        const obsId = parseInt(tile.buildingId.replace('obs_', ''));
                        const obs = ObstacleManager.obstacles[obsId];
                        if (obs) {
                            const od = OBSTACLE_DATA[obs.type];
                            this.ctx.fillStyle = od.color || '#3a6b3a';
                        } else {
                            this.ctx.fillStyle = this._grassColor(x, y);
                        }
                    } else {
                        const b = BuildingManager.buildings[tile.buildingId];
                        if (b) {
                            this.ctx.fillStyle = this._buildingColor(b);
                        } else {
                            this.ctx.fillStyle = this._grassColor(x, y);
                        }
                    }
                } else {
                    this.ctx.fillStyle = this._grassColor(x, y);
                }
                this.ctx.fillRect(x * tw, y * th, tw + 0.5, th + 0.5);
            }
        }

        // ── Jangdagi askarlarni minimapda ko'rsatish ──────────────────────
        if (typeof Game !== 'undefined' && Game.mode === 'attack' &&
            typeof BattleManager !== 'undefined' && BattleManager.active) {
            const now = Date.now();
            for (const t of BattleManager.troops) {
                if (t.hp <= 0) continue;
                const td = TROOP_DATA?.[t.type];
                // Minimap koordinatasi: grid x,y → minimap piksel
                // mx = (x / SIZE) * mw,  my = (y / SIZE) * mh  (oddiy grid uchun)
                const mx2 = (t.x / Grid.SIZE) * mw;
                const my2 = (t.y / Grid.SIZE) * mh;
                const r2 = Math.max(2, tw * 1.2);
                const isHero = td?.category === 'qahramon';
                const pulse = 0.7 + Math.sin(now * 0.01) * 0.3;
                this.ctx.fillStyle = isHero
                    ? `rgba(255,215,0,${pulse})`
                    : (td?.flying ? 'rgba(100,180,255,0.9)' : 'rgba(76,255,128,0.85)');
                this.ctx.beginPath();
                this.ctx.arc(mx2, my2, isHero ? r2 * 1.6 : r2, 0, Math.PI * 2);
                this.ctx.fill();
                if (isHero) {
                    this.ctx.strokeStyle = '#ffd700';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }

        // Kamera ramkasi
        const gameCanvas = document.getElementById('gameCanvas');
        const vw = gameCanvas.width / Camera.zoom;
        const vh = gameCanvas.height / Camera.zoom;

        const cgx = Camera.x / Grid.TILE_W + Camera.y / Grid.TILE_H;
        const cgy = Camera.y / Grid.TILE_H - Camera.x / Grid.TILE_W;

        const viewTilesW = vw / Grid.TILE_W;
        const viewTilesH = vh / Grid.TILE_H;

        const rx = ((cgy + Grid.SIZE / 2) / Grid.SIZE) * mw - (viewTilesW / Grid.SIZE) * mw / 2;
        const ry = ((cgx + Grid.SIZE / 2) / Grid.SIZE) * mh - (viewTilesH / Grid.SIZE) * mh / 2;
        const rw = (viewTilesW / Grid.SIZE) * mw;
        const rh = (viewTilesH / Grid.SIZE) * mh;

        this.ctx.strokeStyle = 'rgba(212,175,55,0.8)';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(rx, ry, rw, rh);
    },

    _buildingColor(b) {
        const bd = BUILDING_DATA[b.type];
        // Qurilayotgan — kulrang
        if (b.building) return 'rgba(150,150,150,0.7)';

        // Kategoriyaga qarab asosiy rang
        const CAT_COLORS = {
            markaz:          '#ffd700',
            iqtisod:         '#ffc107',
            mudofaa:         '#f44336',
            harbiy:          '#7c4dff',
            askar:           '#7c4dff',
            devorvadarvoza:  '#78909c',
        };
        let base = bd.minimapColor || CAT_COLORS[bd.category] || '#888';

        // HP zarariga qarab rangni xiralashtirish
        if (b.hp < b.maxHp) {
            const ratio = b.hp / b.maxHp;
            // ratio 1 → to'liq rang, 0 → qora
            return this._blendWithBlack(base, ratio);
        }

        return base;
    },

    _blendWithBlack(hex, ratio) {
        // hex yoki rgb string → r,g,b ni ajratib olish
        let r = 136, g = 136, b = 136;
        const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (m) { r = parseInt(m[1], 16); g = parseInt(m[2], 16); b = parseInt(m[3], 16); }
        r = Math.round(r * ratio);
        g = Math.round(g * ratio);
        b = Math.round(b * ratio);
        return `rgb(${r},${g},${b})`;
    },

    _grassColor(x, y) {
        const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        const v = seed - Math.floor(seed);
        const g = Math.floor(100 + v * 50);
        return `rgb(60, ${g}, 50)`;
    }
};
