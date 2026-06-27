// Lightweight on-screen virtual joystick for touch (also works with mouse).
// Appears wherever the player first touches the left half of the screen.
import Phaser from "phaser";

const RADIUS = 70;

export class Joystick {
  constructor(scene) {
    this.scene = scene;
    this.vector = new Phaser.Math.Vector2(0, 0);
    this.pointerId = null;
    this.base = new Phaser.Math.Vector2();

    this.g = scene.add.graphics().setScrollFactor(0).setDepth(10000).setVisible(false);

    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);
  }

  onDown(p) {
    if (this.pointerId !== null) return;
    if (p.x > this.scene.scale.width * 0.6) return; // right side reserved
    this.pointerId = p.id;
    this.base.set(p.x, p.y);
    this.draw(p.x, p.y);
    this.g.setVisible(true);
  }

  onMove(p) {
    if (p.id !== this.pointerId) return;
    const dx = p.x - this.base.x;
    const dy = p.y - this.base.y;
    const v = new Phaser.Math.Vector2(dx, dy);
    if (v.length() > RADIUS) v.setLength(RADIUS);
    this.vector.set(v.x / RADIUS, v.y / RADIUS);
    this.draw(this.base.x + v.x, this.base.y + v.y);
  }

  onUp(p) {
    if (p.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector.set(0, 0);
    this.g.setVisible(false);
  }

  draw(tx, ty) {
    this.g.clear();
    this.g.fillStyle(0x000000, 0.25).fillCircle(this.base.x, this.base.y, RADIUS);
    this.g.lineStyle(3, 0xf4c94b, 0.7).strokeCircle(this.base.x, this.base.y, RADIUS);
    this.g.fillStyle(0xf4c94b, 0.85).fillCircle(tx, ty, 28);
  }
}
