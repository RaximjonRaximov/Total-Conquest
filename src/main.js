// Infinite Tower — entry point.
// Loading screen -> on START, launch the Phaser kingdom scene.

import { runLoadingScreen } from "./loading.js";
import { startGame } from "./game/index.js";

window.addEventListener("DOMContentLoaded", () => {
  runLoadingScreen({
    onComplete: () => {
      const loading = document.getElementById("loading-screen");
      const game = document.getElementById("game");
      if (loading) loading.style.display = "none";
      if (game) game.hidden = false;
      startGame();
    },
  });
});
