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

// ─── A* Pathfinding ───────────────────────────────────────────────────────────
const Pathfinding = {
    // Diagonal + cardinal yo'nalishlari
    _DIRS: [
        [0,1,1],[0,-1,1],[1,0,1],[-1,0,1],
        [1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]
    ],

    findPath(startX, startY, endX, endY) {
        const sx = startX | 0, sy = startY | 0;
        const ex = endX   | 0, ey = endY   | 0;
        if (sx === ex && sy === ey) return [];

        const S = Grid.SIZE;
        // Flat arrays — objects create bo'lmaydi, index = y*SIZE+x
        const gScore = new Float32Array(S * S).fill(Infinity);
        const fScore = new Float32Array(S * S).fill(Infinity);
        const cameFromX = new Int16Array(S * S).fill(-1);
        const cameFromY = new Int16Array(S * S).fill(-1);
        const inOpen    = new Uint8Array(S * S);

        const si = sy * S + sx;
        const ei = ey * S + ex;
        gScore[si] = 0;
        fScore[si] = this._h(sx, sy, ex, ey);

        const heap = new _MinHeap();
        heap.push({ x: sx, y: sy, f: fScore[si] });
        inOpen[si] = 1;

        let iter = 0;
        const MAX = 600;

        while (heap.size > 0 && iter++ < MAX) {
            const cur = heap.pop();
            const ci  = cur.y * S + cur.x;

            if (cur.x === ex && cur.y === ey) {
                return this._reconstruct(cameFromX, cameFromY, ex, ey, S);
            }

            for (const [dx, dy, cost] of this._DIRS) {
                const nx = cur.x + dx, ny = cur.y + dy;
                if (nx < 0 || nx >= S || ny < 0 || ny >= S) continue;

                const ni = ny * S + nx;
                const w  = this._weight(nx, ny);
                const tg = gScore[ci] + cost * w;

                if (tg < gScore[ni]) {
                    cameFromX[ni] = cur.x;
                    cameFromY[ni] = cur.y;
                    gScore[ni] = tg;
                    fScore[ni] = tg + this._h(nx, ny, ex, ey);
                    if (!inOpen[ni]) {
                        inOpen[ni] = 1;
                        heap.push({ x: nx, y: ny, f: fScore[ni] });
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
        return b.type === 'wall' ? 50 : 200;
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
