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
                            const bd = BUILDING_DATA[b.type];
                            this.ctx.fillStyle = bd.minimapColor || '#888';
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

    _grassColor(x, y) {
        const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        const v = seed - Math.floor(seed);
        const g = Math.floor(100 + v * 50);
        return `rgb(60, ${g}, 50)`;
    }
};
