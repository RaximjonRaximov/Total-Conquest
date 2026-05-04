// ============================================
// TOTAL CONQUEST - Asosiy O'yin Fayli
// 44x44 Izometrik Tekis Xarita
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

// --- O'yin sozlamalari ---
const GRID = 44;
const TILE_W = 64;
const TILE_H = 32;

// --- Resurslar ---
const resources = {
    gold: 1000,
    food: 500,
    diamond: 50,
    goldenApple: 0
};

let townHallLevel = 1;

// --- Kamera ---
const cam = { x: 0, y: 0, zoom: 1, minZ: 0.25, maxZ: 2.5 };

// --- Drag ---
const drag = { on: false, sx: 0, sy: 0, cx: 0, cy: 0 };

// --- Mouse ---
const mouse = { x: 0, y: 0, tx: -1, ty: -1 };

// --- Xarita (hammasi 0 = tekis o'tloq) ---
const map = [];
for (let y = 0; y < GRID; y++) {
    map[y] = [];
    for (let x = 0; x < GRID; x++) {
        map[y][x] = 0;
    }
}

// --- Rang palitrasi ---
// Har bir katakka biroz boshqacha yashil rang beramiz (tabiiy ko'rinish)
function getTileColor(x, y) {
    const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    const v = (seed - Math.floor(seed));
    const base = 76 + v * 12; // 76-88 oralig'ida
    const sat = 55 + v * 15;
    const light = 38 + v * 8;
    return {
        top: `hsl(${base}, ${sat}%, ${light}%)`,
        left: `hsl(${base}, ${sat}%, ${light - 8}%)`,
        right: `hsl(${base}, ${sat}%, ${light - 14}%)`
    };
}

// ============================================
// IZOMETRIK FUNKSIYALAR
// ============================================
function toIso(gx, gy) {
    return {
        x: (gx - gy) * (TILE_W / 2),
        y: (gx + gy) * (TILE_H / 2)
    };
}

function toGrid(sx, sy) {
    const wx = (sx - canvas.width / 2) / cam.zoom + cam.x;
    const wy = (sy - canvas.height / 2) / cam.zoom + cam.y;
    const gx = Math.floor(wx / TILE_W + wy / TILE_H);
    const gy = Math.floor(wy / TILE_H - wx / TILE_W);
    return { x: gx, y: gy };
}

// ============================================
// TILE CHIZISH
// ============================================
function drawTile(x, y, hover) {
    const iso = toIso(x, y);
    const px = (iso.x - cam.x) * cam.zoom + canvas.width / 2;
    const py = (iso.y - cam.y) * cam.zoom + canvas.height / 2;

    const hw = TILE_W * cam.zoom / 2;
    const hh = TILE_H * cam.zoom / 2;
    const d = 5 * cam.zoom;

    // Ekrandan tashqaridagilarni o'tkazish
    if (px + hw < -10 || px - hw > canvas.width + 10 ||
        py + hh < -10 || py - hh > canvas.height + 50) return;

    const c = getTileColor(x, y);

    // Yuqori yuz
    ctx.beginPath();
    ctx.moveTo(px, py - hh);
    ctx.lineTo(px + hw, py);
    ctx.lineTo(px, py + hh);
    ctx.lineTo(px - hw, py);
    ctx.closePath();
    ctx.fillStyle = c.top;
    ctx.fill();

    // Chap yon
    ctx.beginPath();
    ctx.moveTo(px - hw, py);
    ctx.lineTo(px, py + hh);
    ctx.lineTo(px, py + hh + d);
    ctx.lineTo(px - hw, py + d);
    ctx.closePath();
    ctx.fillStyle = c.left;
    ctx.fill();

    // O'ng yon
    ctx.beginPath();
    ctx.moveTo(px + hw, py);
    ctx.lineTo(px, py + hh);
    ctx.lineTo(px, py + hh + d);
    ctx.lineTo(px + hw, py + d);
    ctx.closePath();
    ctx.fillStyle = c.right;
    ctx.fill();

    // Grid chiziq
    ctx.beginPath();
    ctx.moveTo(px, py - hh);
    ctx.lineTo(px + hw, py);
    ctx.lineTo(px, py + hh);
    ctx.lineTo(px - hw, py);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Hover
    if (hover) {
        ctx.beginPath();
        ctx.moveTo(px, py - hh);
        ctx.lineTo(px + hw, py);
        ctx.lineTo(px, py + hh);
        ctx.lineTo(px - hw, py);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(212,175,55,0.9)';
        ctx.lineWidth = 2 * cam.zoom;
        ctx.stroke();
    }
}

// ============================================
// MINIMAP
// ============================================
function drawMinimap() {
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;
    const tw = mw / GRID;
    const th = mh / GRID;

    minimapCtx.fillStyle = '#0a0e17';
    minimapCtx.fillRect(0, 0, mw, mh);

    for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
            const v = (seed - Math.floor(seed));
            const g = Math.floor(100 + v * 50);
            minimapCtx.fillStyle = `rgb(60, ${g}, 50)`;
            minimapCtx.fillRect(x * tw, y * th, tw + 0.5, th + 0.5);
        }
    }

    // Kamera ko'rinish ramkasi
    const vw = (canvas.width / cam.zoom);
    const vh = (canvas.height / cam.zoom);
    const cgx = cam.x / TILE_W + cam.y / TILE_H;
    const cgy = cam.y / TILE_H - cam.x / TILE_W;

    const rx = ((cgy + GRID / 2) / GRID) * mw - (vw / (TILE_W * GRID)) * mw / 2;
    const ry = ((cgx + GRID / 2) / GRID) * mh - (vh / (TILE_H * GRID)) * mh / 2;
    const rw = (vw / (TILE_W * GRID)) * mw;
    const rh = (vh / (TILE_H * GRID)) * mh;

    minimapCtx.strokeStyle = 'rgba(212,175,55,0.8)';
    minimapCtx.lineWidth = 1.5;
    minimapCtx.strokeRect(rx, ry, rw, rh);
}

// ============================================
// RESURSLARNI YANGILASH
// ============================================
function updateResourceDisplay() {
    document.getElementById('res-gold').textContent = resources.gold.toLocaleString();
    document.getElementById('res-food').textContent = resources.food.toLocaleString();
    document.getElementById('res-diamond').textContent = resources.diamond.toLocaleString();
    document.getElementById('res-golden-apple').textContent = resources.goldenApple.toLocaleString();

    const gaBox = document.getElementById('res-golden-apple-box');
    if (townHallLevel >= 7) {
        gaBox.classList.remove('res-locked');
        gaBox.title = 'Olma Oltin';
    } else {
        gaBox.classList.add('res-locked');
        gaBox.title = 'Town Hall 7da ochiladi';
    }

    document.getElementById('th-display').textContent = `Town Hall: Lvl ${townHallLevel}`;
}

// ============================================
// ASOSIY RENDER
// ============================================
function render() {
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            const hover = (x === mouse.tx && y === mouse.ty);
            drawTile(x, y, hover);
        }
    }

    drawMinimap();

    // Koordinata
    const coordEl = document.getElementById('coord-display');
    if (mouse.tx >= 0 && mouse.tx < GRID && mouse.ty >= 0 && mouse.ty < GRID) {
        coordEl.textContent = `Tile: (${mouse.tx}, ${mouse.ty})`;
    } else {
        coordEl.textContent = 'Tile: -';
    }

    requestAnimationFrame(render);
}

// ============================================
// EVENTLAR
// ============================================
function setupEvents() {
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        minimapCanvas.width = minimapCanvas.parentElement.clientWidth;
        minimapCanvas.height = minimapCanvas.parentElement.clientHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse drag
    canvas.addEventListener('mousedown', (e) => {
        drag.on = true;
        drag.sx = e.clientX;
        drag.sy = e.clientY;
        drag.cx = cam.x;
        drag.cy = cam.y;
        canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        const g = toGrid(e.clientX, e.clientY);
        mouse.tx = g.x;
        mouse.ty = g.y;

        if (drag.on) {
            cam.x = drag.cx - (e.clientX - drag.sx) / cam.zoom;
            cam.y = drag.cy - (e.clientY - drag.sy) / cam.zoom;
        }
    });

    window.addEventListener('mouseup', () => {
        drag.on = false;
        canvas.style.cursor = 'default';
    });

    // Zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const d = e.deltaY > 0 ? 0.9 : 1.1;
        cam.zoom = Math.max(cam.minZ, Math.min(cam.maxZ, cam.zoom * d));
    }, { passive: false });

    // Touch
    let lastDist = 0;
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            drag.on = true;
            drag.sx = e.touches[0].clientX;
            drag.sy = e.touches[0].clientY;
            drag.cx = cam.x;
            drag.cy = cam.y;
        } else if (e.touches.length === 2) {
            drag.on = false;
            lastDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && drag.on) {
            cam.x = drag.cx - (e.touches[0].clientX - drag.sx) / cam.zoom;
            cam.y = drag.cy - (e.touches[0].clientY - drag.sy) / cam.zoom;
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            cam.zoom = Math.max(cam.minZ, Math.min(cam.maxZ, cam.zoom * (dist / lastDist)));
            lastDist = dist;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => { drag.on = false; });
}

// ============================================
// LOADING VA ISHGA TUSHIRISH
// ============================================
function startGame() {
    const loadBar = document.getElementById('loading-bar');
    const loadText = document.getElementById('loading-text');
    const loadScreen = document.getElementById('loading-screen');

    let progress = 0;
    const msgs = [
        'Xarita yuklanmoqda...',
        'Er-yer tayyorlanmoqda...',
        'Rim legionlari yig\'ilmoqda...',
        'Imperiya tayyorlanmoqda...'
    ];

    const iv = setInterval(() => {
        progress += Math.random() * 20 + 8;
        if (progress > 100) progress = 100;

        loadBar.style.width = progress + '%';
        loadText.textContent = msgs[Math.min(Math.floor(progress / 28), msgs.length - 1)];

        if (progress >= 100) {
            clearInterval(iv);

            // Kamerani markazga
            const center = toIso(GRID / 2, GRID / 2);
            cam.x = center.x;
            cam.y = center.y;

            setupEvents();
            updateResourceDisplay();

            setTimeout(() => {
                loadScreen.classList.add('hidden');
                setTimeout(() => loadScreen.remove(), 800);
            }, 400);

            render();
        }
    }, 180);
}

window.addEventListener('DOMContentLoaded', startGame);