// Loading screen logic: animate progress 0 -> 100 while "loading" assets,
// then reveal the start button.

const TIPS = [
  "Yuklanmoqda...",
  "Minora qavatlari tayyorlanmoqda...",
  "Qahramonlar chaqirilmoqda...",
  "Xaritalar yuklanmoqda...",
  "Deyarli tayyor...",
];

// Assets the game will preload. For step 1 we only have the banner;
// more (sprites, audio) get added here as the game grows.
const ASSETS = ["/assets/img/banner.svg"];

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

export function runLoadingScreen({ onComplete } = {}) {
  const fill = document.getElementById("progress-fill");
  const percentEl = document.getElementById("loading-percent");
  const tipEl = document.getElementById("loading-tip");
  const startBtn = document.getElementById("start-btn");

  let displayed = 0; // value shown on screen (0..100)
  let target = 0; // value we are easing toward
  let assetsDone = false;

  // Kick off real asset preloading; each finished asset bumps the target.
  const step = 100 / (ASSETS.length + 1); // +1 reserved for "finalize"
  Promise.all(
    ASSETS.map((src) =>
      preloadImage(src).then(() => {
        target = Math.min(100, target + step);
      })
    )
  ).then(() => {
    assetsDone = true;
  });

  // Smoothly animate the bar. The bar creeps forward on its own so it never
  // looks stuck, but it can't pass `target` until real work is done.
  function tick() {
    // Let the bar drift up to near the current target.
    const ceiling = assetsDone ? 100 : Math.max(target, displayed + 0.4);
    if (displayed < ceiling) {
      const speed = displayed < 80 ? 0.9 : 0.45;
      displayed = Math.min(ceiling, displayed + speed);
    }

    const pct = Math.round(displayed);
    fill.style.width = pct + "%";
    percentEl.textContent = pct + "%";

    const tipIndex = Math.min(TIPS.length - 1, Math.floor((displayed / 100) * TIPS.length));
    if (tipEl.textContent !== TIPS[tipIndex]) tipEl.textContent = TIPS[tipIndex];

    if (displayed >= 100) {
      finish();
      return;
    }
    requestAnimationFrame(tick);
  }

  function finish() {
    fill.style.width = "100%";
    percentEl.textContent = "100%";
    tipEl.textContent = "Tayyor!";
    startBtn.hidden = false;
    startBtn.addEventListener(
      "click",
      () => {
        startBtn.disabled = true;
        if (typeof onComplete === "function") onComplete();
      },
      { once: true }
    );
  }

  requestAnimationFrame(tick);
}
