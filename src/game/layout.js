// Kingdom prop placements. Buildings are hand-placed around a central plaza;
// nature (trees/rocks/bushes) is scattered deterministically on open grass.
import { TILE, GRASS } from "./tiles.js";

// hand-placed structures (tile coords, anchored at bottom-center)
const STRUCTURES = [
  ["tower", 20, 11],
  ["well", 20, 20],
  ["house_blue", 14, 14],
  ["house_red", 26, 14],
  ["house_green", 14, 26],
  ["house_yellow", 26, 26],
  ["stall_fruit", 17, 25],
  ["stall_bread", 20, 25],
  ["stall_potion", 23, 25],
  ["notice_board", 25, 18],
  ["sign_post", 16, 17],
  ["campfire", 22, 22],
  ["tent_big", 30, 19],
  ["tent_small", 31, 22],
  ["barrel", 18, 19],
  ["lamp", 16, 19],
  ["lamp", 24, 22],
];

const TREES = ["tree_oak", "tree_oak2", "tree_pine", "tree_pine2", "tree_pine3"];
const SMALL = ["bush", "bush_white", "bush_pink", "bush_red", "bush_blue",
  "rock", "rock_small", "rocks", "stump", "log", "grass_tuft"];

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function buildProps(world, w, h) {
  const { ground, center } = world;
  const out = [];
  for (const [name, tx, ty] of STRUCTURES) out.push({ name, tx, ty });

  const occupied = new Set(STRUCTURES.map(([, tx, ty]) => `${tx},${ty}`));
  const nearPlaza = (x, y) =>
    Math.abs(x - center.x) < 7 && Math.abs(y - center.y) < 7;

  const r = rng(99173);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (occupied.has(`${x},${y}`)) continue;
      if (!GRASS.includes(ground[y][x])) continue;
      if (nearPlaza(x, y)) continue;
      const edge = x < 6 || x > w - 6 || y < 6 || y > h - 6;
      const p = r();
      if ((edge && p < 0.28) || (!edge && p < 0.05)) {
        out.push({ name: TREES[Math.floor(r() * TREES.length)], tx: x, ty: y });
        occupied.add(`${x},${y}`);
      } else if (p > 0.93) {
        out.push({ name: SMALL[Math.floor(r() * SMALL.length)], tx: x, ty: y });
      }
    }
  }
  return out.map((p) => ({
    name: p.name,
    x: p.tx * TILE + TILE / 2,
    y: p.ty * TILE + TILE,
  }));
}
