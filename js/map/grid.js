// ============================================
// 44x44 GRID TIZIMI
// ============================================

const Grid = {
    SIZE: 44,
    TILE_W: 64,
    TILE_H: 32,
    UNBUILDABLE_BORDER: 4, // 4 katak chekkasi

    // Xarita ma'lumotlari (0 = bo'sh o'tloq)
    tiles: [],

    init() {
        this.tiles = [];
        for (let y = 0; y < this.SIZE; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.SIZE; x++) {
                // Chegara kataklarini belgilash (type = 1 yoki dark green area)
                const isBorder = x < this.UNBUILDABLE_BORDER || x >= this.SIZE - this.UNBUILDABLE_BORDER || 
                                 y < this.UNBUILDABLE_BORDER || y >= this.SIZE - this.UNBUILDABLE_BORDER;
                
                this.tiles[y][x] = { type: isBorder ? 1 : 0, buildingId: null };
            }
        }
    },

    // Tile rang (tabiiy yashil variatsia)
    getTileColor(x, y) {
        // To'q yashil chegara
        if (x < this.UNBUILDABLE_BORDER || x >= this.SIZE - this.UNBUILDABLE_BORDER || 
            y < this.UNBUILDABLE_BORDER || y >= this.SIZE - this.UNBUILDABLE_BORDER) {
            return {
                top: `hsl(120, 40%, 25%)`,
                left: `hsl(120, 40%, 20%)`,
                right: `hsl(120, 40%, 15%)`
            };
        }

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

    // Tile bo'shmi va qurish mumkinmi?
    isFree(x, y, w, h) {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                // Xarita tashqarisida
                if (tx < 0 || tx >= this.SIZE || ty < 0 || ty >= this.SIZE) return false;
                
                // Qurish taqiqlangan to'q yashil hudud
                if (tx < this.UNBUILDABLE_BORDER || tx >= this.SIZE - this.UNBUILDABLE_BORDER || 
                    ty < this.UNBUILDABLE_BORDER || ty >= this.SIZE - this.UNBUILDABLE_BORDER) {
                    return false;
                }

                // Bino bormi?
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
