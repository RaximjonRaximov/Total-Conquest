// Infinite Tower — entry point
// Step 1: loading screen with banner + animated 0 -> 100 progress bar.

import { runLoadingScreen } from "./loading.js";

window.addEventListener("DOMContentLoaded", () => {
  runLoadingScreen({
    onComplete: () => {
      // Next steps (menu / game) will be wired here later.
      console.log("[Infinite Tower] loading complete — ready to start");
    },
  });
});
