// ============================================
// 44x44 GRID TIZIMI
// ============================================

const Grid = {
    SIZE: 44,
    TILE_W: 64,
    TILE_H: 32,

    // Xarita ma'lumotlari (0 = bo'sh o'tloq)
    tiles: [],

    init() {
        this.tiles = [];
        for (let y = 0; y < this.SIZE; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.SIZE; x++) {
                this.tiles[y][x] = { type: 0, buildingId: null };
            }
        }
    },

    // Tile rang (tabiiy yashil variatsia)
    getTileColor(x, y) {
        const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        const v = seed - Math.floor(seed);
        const hue = 76 + v * 12;
        const sat = 55 + v * 15;
        const light = 38 + v * 8;
        return {
            top: `hsl(${hue}, ${sat}%, ${light}%)`,
            left: `hsl(${hue}, ${sat}%, ${light - 8}%)`,
            right: `hsl(${hue}, ${sat}%, ${light - 14}%)`
        };
    },

    // Tile bo'shmi?
    isFree(x, y, w, h) {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx < 0 || tx >= this.SIZE || ty < 0 || ty >= this.SIZE) return false;
                if (this.tiles[ty][tx].buildingId !== null) return false;
            }
        }
        return true;
    },

    // Tilega bino joylashtirish
    occupy(x, y, w, h, buildingId) {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                this.tiles[y + dy][x + dx].buildingId = buildingId;
            }
        }
    },

    // Tileni bo'shatish
    free(x, y, w, h) {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                if (y + dy < this.SIZE && x + dx < this.SIZE) {
                    this.tiles[y + dy][x + dx].buildingId = null;
                }
            }
        }
    }
};
