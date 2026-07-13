import { TILE, WATER, COBBLE, DIRT, SAND } from "./tiles.js";

const MM_SCALE = 3;
const PADDING = 12;
const BORDER = 3;

const TILE_COLORS = {
  grass: 0x3a6b2a,
  water: 0x2266aa,
  cobble: 0x888888,
  dirt: 0x8b6c42,
  sand: 0xd4b96a,
};

export class Minimap {
  constructor(scene, mapW, mapH, groundData) {
    this.scene = scene;
    this.mapW = mapW;
    this.mapH = mapH;
    this.groundData = groundData;
    this.mmW = mapW * MM_SCALE;
    this.mmH = mapH * MM_SCALE;

    this.terrain = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(30000)
      .setAlpha(0.9);
    this.markers = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(30001);

    this.reposition();
    scene.scale.on("resize", () => this.reposition());
  }

  reposition() {
    this.baseX = PADDING;
    this.baseY = PADDING;
    this.drawTerrain();
  }

  drawTerrain() {
    this.terrain.clear();
    this.terrain.fillStyle(0x000000, 0.75);
    this.terrain.fillRoundedRect(
      this.baseX - BORDER,
      this.baseY - BORDER,
      this.mmW + BORDER * 2,
      this.mmH + BORDER * 2,
      6
    );
    this.terrain.lineStyle(2, 0xf4c94b, 0.9);
    this.terrain.strokeRoundedRect(
      this.baseX - BORDER,
      this.baseY - BORDER,
      this.mmW + BORDER * 2,
      this.mmH + BORDER * 2,
      6
    );

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const t = this.groundData[y][x];
        let color = TILE_COLORS.grass;
        if (t === WATER) color = TILE_COLORS.water;
        else if (t === COBBLE) color = TILE_COLORS.cobble;
        else if (t === DIRT) color = TILE_COLORS.dirt;
        else if (t === SAND) color = TILE_COLORS.sand;
        this.terrain.fillStyle(color, 1);
        this.terrain.fillRect(
          this.baseX + x * MM_SCALE,
          this.baseY + y * MM_SCALE,
          MM_SCALE,
          MM_SCALE
        );
      }
    }
  }

  update(player, enemies) {
    this.markers.clear();

    if (enemies) {
      this.markers.fillStyle(0xff3333, 1);
      for (const e of enemies.getChildren()) {
        if (!e.active) continue;
        const ex = Math.floor((e.x / (this.mapW * TILE)) * this.mmW);
        const ey = Math.floor((e.y / (this.mapH * TILE)) * this.mmH);
        this.markers.fillCircle(this.baseX + ex, this.baseY + ey, 2.5);
      }
    }

    const px = Math.floor((player.x / (this.mapW * TILE)) * this.mmW);
    const py = Math.floor((player.y / (this.mapH * TILE)) * this.mmH);
    this.markers.fillStyle(0xffdd33, 1);
    this.markers.fillCircle(this.baseX + px, this.baseY + py, 4);
    this.markers.lineStyle(1, 0x000000, 1);
    this.markers.strokeCircle(this.baseX + px, this.baseY + py, 4);
  }
}
