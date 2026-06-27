import Phaser from "phaser";
import { TILE, buildKingdom } from "./tiles.js";
import { buildProps } from "./layout.js";
import { Joystick } from "./joystick.js";
import atlas from "../world/atlas.json";

const MAP_W = 40;
const MAP_H = 40;
const SPEED = 170;
const KNIGHT_SCALE = 0.46;

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

    this.interactiveProps = this.physics.add.group();
    const props = buildProps(world, MAP_W, MAP_H);
    for (const p of props) {
      const frame = atlas.frames[p.name];
      if (!frame) continue;
      const spr = this.add.image(p.x, p.y, "props", p.name).setOrigin(0.5, 1);
      spr.setDepth(p.y);

      // interaction triggers
      if (['tower', 'notice_board', 'house_blue', 'well', 'campfire'].includes(p.name)) {
          const trigger = this.add.zone(p.x, p.y, frame.w + 40, frame.h + 20);
          this.physics.add.existing(trigger, true);
          trigger.setData('name', p.name);
          this.interactiveProps.add(trigger);
      }

      if (frame.solid) {
        // Adjust collision box to better fit the object's base
        let bw = frame.w * 0.8;
        let bh = frame.h * 0.4;
        
        if (p.name.startsWith('house') || p.name === 'tower') {
            bh = frame.h * 0.55; // Taller collision for buildings
        }
        
        if (p.name === 'campfire') {
            bw = 60;
            bh = 40;
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
  }

  handleInteract(name) {
      console.log("Interacting with:", name);
      // Basic placeholder feedback
      const msgs = {
          'tower': 'Entering the Infinite Tower... (Phase 2)',
          'notice_board': 'No quests available yet.',
          'campfire': 'You feel warmer.',
          'well': 'The water is clear.',
          'house_blue': 'The door is locked.'
      };
      const msg = msgs[name] || "Interacted.";
      
      const feedback = this.add.text(this.player.x, this.player.y - 60, msg, {
          fontSize: '18px', color: '#f4c94b', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(20001);
      
      this.tweens.add({
          targets: feedback,
          y: feedback.y - 40,
          alpha: 0,
          duration: 2000,
          onComplete: () => feedback.destroy()
      });
  }
}
