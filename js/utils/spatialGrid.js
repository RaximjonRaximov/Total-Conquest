// ============================================
// SPATIAL GRID — O(1) range query uchun
// Defense targetlash: O(N×M) dan O(N+M×K) ga
// K = orta hisobda range ichidagi askarlar soni
// ============================================

const SpatialGrid = {
    CELL: 5,          // tiles per cell — 5×5 tile cell
    _cells: null,     // Int32 key → troop[] map

    // ── Init — battle boshida bir marta ──────────────────────────────────────
    init() {
        this._cells = new Map();
    },

    // ── Barcha askarlarni tozalab qayta joylash (har battle update da) ────────
    rebuild(troops) {
        // Map.clear() Map.set() dan tezroq — yangi map yaratish
        this._cells = new Map();
        for (let i = 0; i < troops.length; i++) {
            const t = troops[i];
            if (t.hp <= 0) continue;
            const k = this._key(t.x, t.y);
            let cell = this._cells.get(k);
            if (!cell) { cell = []; this._cells.set(k, cell); }
            cell.push(t);
        }
    },

    // ── Bit-packed integer key (column<<8|row) ───────────────────────────────
    _key(wx, wy) {
        const cx = (wx / this.CELL) | 0;
        const cy = (wy / this.CELL) | 0;
        return (cx << 10) | (cy & 0x3FF);  // 10-bit each — 1024 cells max
    },

    // ── Range ichidagi askarlarni topish (sqrt yo'q, distSq ishlatiladi) ─────
    // Returns first found troop within range (nearest = caller's job)
    queryNearest(x, y, range, filterFn) {
        if (!this._cells) return null;
        const C   = this.CELL;
        const r2  = range * range;
        const minCx = ((x - range) / C) | 0;
        const maxCx = ((x + range) / C) | 0;
        const minCy = ((y - range) / C) | 0;
        const maxCy = ((y + range) / C) | 0;

        let nearest  = null;
        let minDistSq = r2 + 0.001;  // strictly within range

        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const k    = (cx << 10) | (cy & 0x3FF);
                const cell = this._cells.get(k);
                if (!cell) continue;
                for (let i = 0; i < cell.length; i++) {
                    const t = cell[i];
                    if (t.hp <= 0) continue;
                    if (filterFn && !filterFn(t)) continue;
                    const dx = t.x - x, dy = t.y - y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < minDistSq) {
                        minDistSq = d2;
                        nearest   = t;
                    }
                }
            }
        }
        return nearest;
    },

    // ── AoE zarar uchun — range ichidagi barcha askarlar ─────────────────────
    queryAll(x, y, range, filterFn) {
        if (!this._cells) return [];
        const C   = this.CELL;
        const r2  = range * range;
        const minCx = ((x - range) / C) | 0;
        const maxCx = ((x + range) / C) | 0;
        const minCy = ((y - range) / C) | 0;
        const maxCy = ((y + range) / C) | 0;

        const result = [];
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const k    = (cx << 10) | (cy & 0x3FF);
                const cell = this._cells.get(k);
                if (!cell) continue;
                for (let i = 0; i < cell.length; i++) {
                    const t = cell[i];
                    if (t.hp <= 0) continue;
                    if (filterFn && !filterFn(t)) continue;
                    const dx = t.x - x, dy = t.y - y;
                    if (dx * dx + dy * dy <= r2) result.push(t);
                }
            }
        }
        return result;
    }
};
