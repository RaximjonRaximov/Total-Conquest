import Phaser from "phaser";
import { TILE, GRASS } from "./tiles.js";

const ENEMY_TYPES = [
  { name: "slime", color: 0x44bb44, hp: 30, speed: 40, size: 20, damage: 5 },
  { name: "bat", color: 0x8844cc, hp: 20, speed: 70, size: 16, damage: 3 },
  { name: "skeleton", color: 0xcccccc, hp: 50, speed: 50, size: 18, damage: 8 },
];

const ENEMY_COUNT = 12;
const WANDER_INTERVAL = 2000;
const AGGRO_RANGE = 150;
const DEAGGRO_RANGE = 250;
const KNOCKBACK_FORCE = 200;
const HIT_COOLDOWN = 800;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function createEnemyAnims(scene) {
  // no spritesheet yet — enemies are colored circles with an HP bar
}

export function spawnEnemies(scene, groundData, mapW, mapH, solids) {
  const group = scene.physics.add.group();
  const r = rng(55781);

  let spawned = 0;
  const attempts = 800;
  for (let i = 0; i < attempts && spawned < ENEMY_COUNT; i++) {
    const tx = 2 + Math.floor(r() * (mapW - 4));
    const ty = 2 + Math.floor(r() * (mapH - 4));

    if (!GRASS.includes(groundData[ty][tx])) continue;

    const cx = Math.floor(mapW / 2);
    const cy = Math.floor(mapH / 2);
    if (Math.abs(tx - cx) < 8 && Math.abs(ty - cy) < 8) continue;

    const type = ENEMY_TYPES[Math.floor(r() * ENEMY_TYPES.length)];
    const wx = tx * TILE + TILE / 2;
    const wy = ty * TILE + TILE / 2;

    const enemy = scene.add.container(wx, wy);
    enemy.setSize(type.size * 2, type.size * 2);
    scene.physics.world.enable(enemy);
    enemy.body.setCollideWorldBounds(true);

    const shadow = scene.add.ellipse(0, type.size * 0.6, type.size * 1.6, type.size * 0.6, 0x000000, 0.3);
    const body = scene.add.circle(0, 0, type.size, type.color);
    const eyeL = scene.add.circle(-type.size * 0.3, -type.size * 0.2, 3, 0xffffff);
    const eyeR = scene.add.circle(type.size * 0.3, -type.size * 0.2, 3, 0xffffff);
    const pupilL = scene.add.circle(-type.size * 0.3, -type.size * 0.2, 1.5, 0x000000);
    const pupilR = scene.add.circle(type.size * 0.3, -type.size * 0.2, 1.5, 0x000000);

    const hpBarBg = scene.add.rectangle(0, -type.size - 8, type.size * 2.2, 5, 0x333333).setOrigin(0.5);
    const hpBar = scene.add.rectangle(0, -type.size - 8, type.size * 2.2, 5, 0xff3333).setOrigin(0.5);

    enemy.add([shadow, body, eyeL, eyeR, pupilL, pupilR, hpBarBg, hpBar]);

    enemy.setData("type", type);
    enemy.setData("hp", type.hp);
    enemy.setData("maxHp", type.hp);
    enemy.setData("hpBar", hpBar);
    enemy.setData("hpBarWidth", type.size * 2.2);
    enemy.setData("state", "wander");
    enemy.setData("wanderTimer", 0);
    enemy.setData("lastHitTime", 0);
    enemy.setData("spawnX", wx);
    enemy.setData("spawnY", wy);

    enemy.setDepth(wy);
    group.add(enemy);
    spawned++;
  }

  scene.physics.add.collider(group, solids);
  scene.physics.add.collider(group, group);

  return group;
}

export function updateEnemies(scene, enemies, player, time) {
  for (const enemy of enemies.getChildren()) {
    if (!enemy.active) continue;

    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
    const state = enemy.getData("state");
    const type = enemy.getData("type");

    if (state === "wander") {
      if (dist < AGGRO_RANGE) {
        enemy.setData("state", "chase");
      } else {
        if (time > enemy.getData("wanderTimer")) {
          const angle = Math.random() * Math.PI * 2;
          enemy.body.setVelocity(
            Math.cos(angle) * type.speed * 0.5,
            Math.sin(angle) * type.speed * 0.5
          );
          enemy.setData("wanderTimer", time + WANDER_INTERVAL + Math.random() * 1000);
        }
      }
    } else if (state === "chase") {
      if (dist > DEAGGRO_RANGE) {
        enemy.setData("state", "wander");
        enemy.body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        enemy.body.setVelocity(
          Math.cos(angle) * type.speed,
          Math.sin(angle) * type.speed
        );
      }
    } else if (state === "dead") {
      continue;
    }

    enemy.setDepth(enemy.y);
  }
}

export function handlePlayerEnemyOverlap(scene, player, enemy, time) {
  if (!enemy.active) return;
  const lastHit = enemy.getData("lastHitTime") || 0;
  if (time - lastHit < HIT_COOLDOWN) return;

  enemy.setData("lastHitTime", time);
  const type = enemy.getData("type");

  // knockback player
  const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
  player.body.setVelocity(
    Math.cos(angle) * KNOCKBACK_FORCE,
    Math.sin(angle) * KNOCKBACK_FORCE
  );

  // flash player red
  scene.cameras.main.shake(80, 0.005);
  player.setTint(0xff4444);
  scene.time.delayedCall(200, () => player.clearTint());

  // damage text
  const dmgText = scene.add.text(player.x, player.y - 50, `-${type.damage}`, {
    fontSize: "20px",
    color: "#ff4444",
    stroke: "#000",
    strokeThickness: 3,
    fontStyle: "bold",
  }).setOrigin(0.5).setDepth(20001);

  scene.tweens.add({
    targets: dmgText,
    y: dmgText.y - 30,
    alpha: 0,
    duration: 1000,
    onComplete: () => dmgText.destroy(),
  });
}

export function damageEnemy(scene, enemy, amount) {
  if (!enemy.active) return;
  let hp = enemy.getData("hp") - amount;
  enemy.setData("hp", hp);

  const hpBar = enemy.getData("hpBar");
  const maxHp = enemy.getData("maxHp");
  const fullWidth = enemy.getData("hpBarWidth");
  hpBar.width = Math.max(0, (hp / maxHp) * fullWidth);

  if (hp <= 0) {
    enemy.setData("state", "dead");
    enemy.body.setVelocity(0, 0);
    scene.tweens.add({
      targets: enemy,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 400,
      onComplete: () => {
        enemy.destroy();
      },
    });

    // spawn loot text
    const loot = Math.floor(Math.random() * 5) + 1;
    const lootText = scene.add.text(enemy.x, enemy.y - 30, `+${loot} Gold`, {
      fontSize: "16px",
      color: "#f4c94b",
      stroke: "#000",
      strokeThickness: 3,
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20001);

    scene.tweens.add({
      targets: lootText,
      y: lootText.y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => lootText.destroy(),
    });
  } else {
    // flash white
    const children = enemy.getAll();
    for (const c of children) {
      if (c.setTint) c.setTint(0xffffff);
    }
    scene.time.delayedCall(100, () => {
      for (const c of children) {
        if (c.clearTint) c.clearTint();
      }
    });
  }
}
