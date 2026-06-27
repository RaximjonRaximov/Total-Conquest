// Terrain tile indices into tiles.png (13 columns per row -> index = row*13 + col).
const COLS = 13;
const T = (row, col) => row * COLS + col;

export const TILE = 48;

export const GRASS = [T(0, 0), T(0, 1), T(0, 2)];
export const GRASS_FLOWERS = [T(0, 4), T(0, 5), T(0, 7), T(1, 0), T(1, 1)];
export const DIRT = T(2, 0);
export const COBBLE = T(3, 0);
export const WATER = T(4, 0);
export const SAND = T(5, 0);

// deterministic pseudo-random so the map looks the same every run
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

export function buildKingdom(w, h) {
  const r = rng(20240627);
  const ground = [];
  const decor = [];
  for (let y = 0; y < h; y++) {
    const grow = [];
    const drow = [];
    for (let x = 0; x < w; x++) {
      grow.push(pick(GRASS, r));
      drow.push(-1);
    }
    ground.push(grow);
    decor.push(drow);
  }

  const inRect = (x, y, rx, ry, rw, rh) =>
    x >= rx && x < rx + rw && y >= ry && y < ry + rh;

  // central cobblestone plaza
  const px = Math.floor(w / 2) - 4;
  const py = Math.floor(h / 2) - 4;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (inRect(x, y, px, py, 8, 8)) ground[y][x] = COBBLE;

  // dirt roads (cross through the plaza)
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let x = 2; x < w - 2; x++) {
    if (ground[cy][x] !== COBBLE) ground[cy][x] = DIRT;
    if (ground[cy - 1] && ground[cy - 1][x] !== COBBLE && r() < 0.5) ground[cy - 1][x] = DIRT;
  }
  for (let y = 2; y < h - 2; y++) {
    if (ground[y][cx] !== COBBLE) ground[y][cx] = DIRT;
  }

  // a pond in the lower-left, ringed with sand
  const pondX = 6, pondY = h - 10, pw = 6, ph = 5;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (inRect(x, y, pondX, pondY, pw, ph)) ground[y][x] = WATER;
      else if (inRect(x, y, pondX - 1, pondY - 1, pw + 2, ph + 2)) ground[y][x] = SAND;
    }

  // scatter flowers on plain grass
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (GRASS.includes(ground[y][x]) && r() < 0.06)
        decor[y][x] = pick(GRASS_FLOWERS, r);

  return { ground, decor, plaza: { x: px, y: py }, center: { x: cx, y: cy } };
}
