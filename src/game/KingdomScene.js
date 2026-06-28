import Phaser from "phaser";
import { TILE, buildKingdom } from "./tiles.js";
import { buildProps } from "./layout.js";
import { Joystick } from "./joystick.js";
import { Minimap } from "./minimap.js";
import {
  spawnEnemies,
  updateEnemies,
  handlePlayerEnemyOverlap,
  damageEnemy,
} from "./enemies.js";
import atlas from "../world/atlas.json";

const MAP_W = 40;
const MAP_H = 40;
const SPEED = 170;
const KNIGHT_SCALE = 0.46;
const INTERACTIVE_PROPS = new Set([
  "tower",
  "notice_board",
  "house_blue",
  "house_red",
  "house_green",
  "house_yellow",
  "well",
  "campfire",
]);
const INTERACTION_MESSAGES = {
  tower: "Entering the Infinite Tower... (Phase 2)",
  notice_board: "No quests available yet.",
  campfire: "You feel warmer.",
  well: "The water is clear.",
  house_blue: "The door is locked.",
  house_red: "The door is locked.",
  house_green: "The door is locked.",
  house_yellow: "The door is locked.",
};
const getInteractionTrigger = (frame) => {
  const width = Phaser.Math.Clamp(frame.w * 0.75 + 44, 96, 190);
  const height = Phaser.Math.Clamp(frame.h * 0.35 + 36, 72, 112);
  return { width, height, y: -height * 0.35 };
};

export default class KingdomScene extends Phaser.Scene {
  constructor() {
    super("Kingdom");
  }

  preload() {
    this.load.image("tiles", "/assets/img/tiles.png");
    this.load.atlas("props", "/assets/img/props.png", "/assets/img/props.json");
    this.load.spritesheet("knight", "/assets/img/knight.png", {
      frameWidth: 101,
      frameHeight: 160,
    });
  }

  create() {
    const world = buildKingdom(MAP_W, MAP_H);

    const map = this.make.tilemap({
      data: world.ground,
      tileWidth: TILE,
      tileHeight: TILE,
    });
    const tileset = map.addTilesetImage("tiles");
    map.createLayer(0, tileset, 0, 0);

    const decorMap = this.make.tilemap({
      data: world.decor,
      tileWidth: TILE,
      tileHeight: TILE,
    });
    const decorTs = decorMap.addTilesetImage("tiles");
    decorMap.createLayer(0, decorTs, 0, 0);

    const worldW = MAP_W * TILE;
    const worldH = MAP_H * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // props (with collision bodies for solid ones)
    this.solids = this.physics.add.staticGroup();
    // Water collision: Add invisible solid blocks for water tiles
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tileIndex = world.ground[y][x];
        // 52 is WATER in tiles.js (4*13 + 0)
        if (tileIndex === 52) {
          const block = this.solids.create(x * TILE + TILE/2, y * TILE + TILE/2, null).setVisible(false);
          block.body.setSize(TILE, TILE);
          block.body.updateFromGameObject();
        }
      }
    }

    this.interactiveProps = this.physics.add.staticGroup();
    const props = buildProps(world, MAP_W, MAP_H);
    for (const p of props) {
      const frame = atlas.frames[p.name];
      if (!frame) continue;
      const spr = this.add.image(p.x, p.y, "props", p.name).setOrigin(0.5, 1);
      spr.setDepth(p.y);

      if (INTERACTIVE_PROPS.has(p.name)) {
        const triggerBox = getInteractionTrigger(frame);
        const trigger = this.add.zone(p.x, p.y + triggerBox.y, triggerBox.width, triggerBox.height);
        this.physics.add.existing(trigger, true);
        trigger.setData("name", p.name);
        this.interactiveProps.add(trigger);
      }

      if (frame.solid) {
        let bw = frame.w * 0.85;
        let bh = frame.h * 0.45;

        if (p.name.startsWith("house")) {
          bw = frame.w * 0.96;
          bh = frame.h * 0.88;
        } else if (p.name === "tower") {
          bw = frame.w * 0.9;
          bh = frame.h * 0.6;
        } else if (p.name === "campfire") {
          bw = 60;
          bh = 40;
        } else if (p.name.startsWith("tree")) {
          bw = Math.min(frame.w * 0.4, 36);
          bh = Math.min(frame.h * 0.25, 32);
        } else if (p.name.startsWith("rock") || p.name === "rocks") {
          bw = frame.w * 0.8;
          bh = frame.h * 0.65;
        } else if (p.name.startsWith("stump")) {
          bw = frame.w * 0.8;
          bh = frame.h * 0.65;
        } else if (p.name.startsWith("bush")) {
          bw = frame.w * 0.85;
          bh = frame.h * 0.6;
        } else if (p.name === "log" || p.name === "logs") {
          bw = frame.w * 0.9;
          bh = frame.h * 0.7;
        } else if (p.name.startsWith("stall")) {
          bw = frame.w * 0.9;
          bh = frame.h * 0.55;
        } else if (p.name.startsWith("tent")) {
          bw = frame.w * 0.8;
          bh = frame.h * 0.5;
        }

        const body = this.solids.create(p.x, p.y - bh / 2, null)
          .setVisible(false);
        body.body.setSize(bw, bh);
        body.body.updateFromGameObject();
      }
    }

    // player
    this.createAnims();
    const start = { x: world.center.x * TILE, y: (world.center.y + 4) * TILE };
    this.player = this.physics.add.sprite(start.x, start.y, "knight", 1)
      .setOrigin(0.5, 1)
      .setScale(KNIGHT_SCALE);
    this.player.body.setSize(36, 20).setOffset(32, 136);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);

    // UI: Interaction prompt (desktop: E key, mobile: tap the prompt)
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.prompt = this.add.container(0, 0).setDepth(20000).setVisible(false);
    const bg = this.add.rectangle(0, 0, 140, 36, 0x000000, 0.75).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xf4c94b);
    const txt = this.add.text(0, 0, "[E] INTERACT", { fontSize: '15px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    this.prompt.add([bg, txt]);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
        if (this.activeInteractable) {
            this.handleInteract(this.activeInteractable.getData('name'));
        }
    });
    this.activeInteractable = null;

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.joystick = new Joystick(this);
    this.facing = "down";

    // minimap
    this.minimap = new Minimap(this, MAP_W, MAP_H, world.ground);

    // enemies
    this.enemies = spawnEnemies(this, world.ground, MAP_W, MAP_H, this.solids);
    this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
      handlePlayerEnemyOverlap(this, player, enemy, this.time.now);
    });

    // attack key
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.lastAttackTime = 0;

    // attack button (mobile)
    this.attackBtn = this.add.container(0, 0).setScrollFactor(0).setDepth(20000);
    const atkCircle = this.add.circle(0, 0, 32, 0xcc3333, 0.7);
    atkCircle.setStrokeStyle(3, 0xff5555);
    const atkIcon = this.add.text(0, 0, "ATK", {
      fontSize: "16px",
      color: "#fff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.attackBtn.add([atkCircle, atkIcon]);
    atkCircle.setInteractive({ useHandCursor: true });
    atkCircle.on("pointerdown", () => this.performAttack());
    this.repositionAttackBtn();
    this.scale.on("resize", () => this.repositionAttackBtn());
  }

  repositionAttackBtn() {
    const cam = this.cameras.main;
    this.attackBtn.setPosition(cam.width - 60, cam.height - 60);
  }

  createAnims() {
    const a = this.anims;
    const mk = (key, frames) =>
      a.create({ key, frames: a.generateFrameNumbers("knight", { frames }), frameRate: 9, repeat: -1 });
    mk("walk-down", [0, 1, 2, 1]);
    mk("walk-up", [3, 4, 5, 4]);
    mk("walk-side", [6, 7, 8, 7]);
  }

  update() {
    const dir = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left.isDown || this.keys.A.isDown) dir.x -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dir.x += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dir.y -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dir.y += 1;
    dir.add(this.joystick.vector);
    if (dir.length() > 1) dir.normalize();

    this.player.setVelocity(dir.x * SPEED, dir.y * SPEED);
    this.player.setDepth(this.player.y);

    const moving = dir.length() > 0.1;
    if (moving) {
      if (Math.abs(dir.x) > Math.abs(dir.y)) {
        this.player.setFlipX(dir.x < 0);
        this.player.anims.play("walk-side", true);
        this.facing = dir.x < 0 ? "left" : "right";
      } else if (dir.y < 0) {
        this.player.setFlipX(false);
        this.player.anims.play("walk-up", true);
        this.facing = "up";
      } else {
        this.player.setFlipX(false);
        this.player.anims.play("walk-down", true);
        this.facing = "down";
      }
    } else {
      this.player.anims.stop();
      const idle = { down: 1, up: 4, left: 7, right: 7 }[this.facing];
      this.player.setFrame(idle);
    }

    // interaction check
    this.activeInteractable = null;
    this.physics.overlap(this.player, this.interactiveProps, (player, trigger) => {
        this.activeInteractable = trigger;
    });

    if (this.activeInteractable) {
        this.prompt.setPosition(this.player.x, this.player.y - 100);
        this.prompt.setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.handleInteract(this.activeInteractable.getData('name'));
        }
    } else {
        this.prompt.setVisible(false);
    }

    // attack
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.performAttack();
    }

    // enemies AI
    updateEnemies(this, this.enemies, this.player, this.time.now);

    // minimap
    this.minimap.update(this.player, this.enemies);
  }

  performAttack() {
    const now = this.time.now;
    if (now - this.lastAttackTime < 400) return;
    this.lastAttackTime = now;

    const range = 60;
    const dir = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.facing];
    const ax = this.player.x + dir[0] * range * 0.5;
    const ay = this.player.y - 40 + dir[1] * range * 0.5;

    // slash visual
    const slash = this.add.circle(ax, ay, 28, 0xf4c94b, 0.6).setDepth(20001);
    this.tweens.add({
      targets: slash,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 200,
      onComplete: () => slash.destroy(),
    });

    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.active) continue;
      const dist = Phaser.Math.Distance.Between(ax, ay, enemy.x, enemy.y);
      if (dist < range) {
        damageEnemy(this, enemy, 10);
      }
    }
  }

  isInteractPromptPointer(pointer) {
    if (!this.prompt?.visible) return false;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return Math.abs(point.x - this.prompt.x) <= 80 && Math.abs(point.y - this.prompt.y) <= 28;
  }

  handleInteract(name) {
    const msg = INTERACTION_MESSAGES[name] || "Interacted.";

    const feedback = this.add.text(this.player.x, this.player.y - 60, msg, {
      fontSize: "18px",
      color: "#f4c94b",
      stroke: "#000",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20001);

    this.tweens.add({
      targets: feedback,
      y: feedback.y - 40,
      alpha: 0,
      duration: 2000,
      onComplete: () => feedback.destroy(),
    });
  }
}
