// ============================================
// PATHFINDING (A*) — Binary Min-Heap versiya
// Oldingi: O(n²) linear scan
// Hozir:  O(n log n) binary heap
// ============================================

// ─── Binary Min-Heap (f-score bo'yicha) ───────────────────────────────────────
class _MinHeap {
    constructor() { this._d = []; }

    push(node) {
        this._d.push(node);
        this._up(this._d.length - 1);
    }

    pop() {
        const top  = this._d[0];
        const last = this._d.pop();
        if (this._d.length > 0) {
            this._d[0] = last;
            this._down(0);
        }
        return top;
    }

    get size() { return this._d.length; }

    _up(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this._d[p].f <= this._d[i].f) break;
            const tmp = this._d[p]; this._d[p] = this._d[i]; this._d[i] = tmp;
            i = p;
        }
    }

    _down(i) {
        const n = this._d.length;
        while (true) {
            let m = i;
            const l = 2*i+1, r = 2*i+2;
            if (l < n && this._d[l].f < this._d[m].f) m = l;
            if (r < n && this._d[r].f < this._d[m].f) m = r;
            if (m === i) break;
            const tmp = this._d[m]; this._d[m] = this._d[i]; this._d[i] = tmp;
            i = m;
        }
    }
}

// ─── Pre-allocated buffers — har call da new allocation yo'q (GC pressure = 0) ──
// Grid.SIZE = 44 → 44*44 = 1936 cells
const _PF_N    = 44 * 44;
const _gScore  = new Float32Array(_PF_N);
const _fScore  = new Float32Array(_PF_N);
const _cFromX  = new Int16Array(_PF_N);
const _cFromY  = new Int16Array(_PF_N);
const _inOpen  = new Uint8Array(_PF_N);
const _PF_INF  = 1e9;

// ─── A* Pathfinding ───────────────────────────────────────────────────────────
const Pathfinding = {
    // Diagonal + cardinal yo'nalishlari
    _DIRS: [
        [0,1,1],[0,-1,1],[1,0,1],[-1,0,1],
        [1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]
    ],

    // Har frame da nechta A* hisoblash ruxsat etiladi (spike oldini olish)
    _pathBudget: 8,
    _pathThisFrame: 0,
    resetFrameBudget() { this._pathThisFrame = 0; },

    // Jump spell aktiv hududdagi askar uchun devor weightini o'zgartirish
    _jumpZoneActive: false,
    setJumpContext(active) { this._jumpZoneActive = active; },

    findPath(startX, startY, endX, endY) {
        // Frame budget tekshiruvi — bir frameda ortiqcha A* hisoblashni cheklash
        if (this._pathThisFrame >= this._pathBudget) return null; // null = "keyingi frameda"
        this._pathThisFrame++;

        const sx = startX | 0, sy = startY | 0;
        const ex = endX   | 0, ey = endY   | 0;
        if (sx === ex && sy === ey) return [];

        const S = Grid.SIZE;

        // Pre-allocated bufferlarni "reset" — fill() allocationdan tezroq
        _gScore.fill(_PF_INF);
        _fScore.fill(_PF_INF);
        _cFromX.fill(-1);
        _cFromY.fill(-1);
        _inOpen.fill(0);

        const si = sy * S + sx;
        const ei = ey * S + ex;
        _gScore[si] = 0;
        _fScore[si] = this._h(sx, sy, ex, ey);

        const heap = new _MinHeap();
        heap.push({ x: sx, y: sy, f: _fScore[si] });
        _inOpen[si] = 1;

        let iter = 0;
        const MAX = 600;

        while (heap.size > 0 && iter++ < MAX) {
            const cur = heap.pop();
            const ci  = cur.y * S + cur.x;

            if (cur.x === ex && cur.y === ey) {
                return this._reconstruct(_cFromX, _cFromY, ex, ey, S);
            }

            for (const [dx, dy, cost] of this._DIRS) {
                const nx = cur.x + dx, ny = cur.y + dy;
                if (nx < 0 || nx >= S || ny < 0 || ny >= S) continue;

                const ni = ny * S + nx;
                const w  = this._weight(nx, ny);
                const tg = _gScore[ci] + cost * w;

                if (tg < _gScore[ni]) {
                    _cFromX[ni] = cur.x;
                    _cFromY[ni] = cur.y;
                    _gScore[ni] = tg;
                    _fScore[ni] = tg + this._h(nx, ny, ex, ey);
                    if (!_inOpen[ni]) {
                        _inOpen[ni] = 1;
                        heap.push({ x: nx, y: ny, f: _fScore[ni] });
                    }
                }
            }
        }
        return [];
    },

    _h(x, y, ex, ey) {
        // Octile heuristic — 8-yo'nalishli harakat uchun optimal
        const dx = Math.abs(x - ex), dy = Math.abs(y - ey);
        return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
    },

    _weight(x, y) {
        const tid = Grid.tiles[y][x].buildingId;
        if (tid === null) return 1;
        const b = BuildingManager.buildings[tid];
        if (!b) return 1;
        if (b.type === 'gate') {
            // Darvoza: jump yoki normal — har doim qulay o'tish nuqtasi (CoC: askarlar darvozadan kiradi)
            if (this._jumpZoneActive) return 1;
            return 8;   // Devordan (50) ancha kam → askarlar darvozani afzal ko'radi
        }
        if (b.type === 'wall') {
            // Jump spell aktiv bo'lsa — devor orqali o'tish mumkin
            if (this._jumpZoneActive) return 1;
            return 50;
        }
        return 200;
    },

    _reconstruct(fromX, fromY, ex, ey, S) {
        const path = [];
        let cx = ex, cy = ey;
        while (fromX[cy * S + cx] >= 0) {
            path.push({ x: cx, y: cy });
            const px = fromX[cy * S + cx];
            const py = fromY[cy * S + cx];
            cx = px; cy = py;
        }
        return path.reverse();
    }
};
