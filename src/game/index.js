import Phaser from "phaser";
import KingdomScene from "./KingdomScene.js";

let game = null;

export function startGame() {
  if (game) return game;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#1d2b1a",
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [KingdomScene],
  });
  return game;
}
