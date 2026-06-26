// Loading screen: a knight runs along a pixel progress bar from 0 -> 100
// while real assets preload, then the start button appears.

const TIPS = [
  "Yuklanmoqda...",
  "Dunyo yaratilmoqda...",
  "Qahramon jangga shaylanmoqda...",
  "Minora qavatlari ochilmoqda...",
  "Deyarli tayyor...",
];

// Real assets to preload. Each finished asset bumps the progress target.
const ASSETS = [
  "/assets/img/bg.png",
  "/assets/img/banner.png",
  "/assets/img/knight_sheet.png",
];

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
  const knight = document.getElementById("knight");
  const startBtn = document.getElementById("start-btn");

  let displayed = 0; // value shown on screen (0..100)
  let target = 0; // value we ease toward as assets finish
  let assetsDone = false;

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

  function render(pct) {
    fill.style.width = pct + "%";
    percentEl.textContent = pct + "%";
    knight.style.left = pct + "%";
    const i = Math.min(TIPS.length - 1, Math.floor((pct / 100) * TIPS.length));
    if (tipEl.textContent !== TIPS[i]) tipEl.textContent = TIPS[i];
  }

  function tick() {
    // Bar creeps forward so it never looks stuck, but can't pass `target`
    // until the real work is done.
    const ceiling = assetsDone ? 100 : Math.max(target, displayed + 0.3);
    if (displayed < ceiling) {
      const speed = displayed < 80 ? 0.8 : 0.4;
      displayed = Math.min(ceiling, displayed + speed);
    }

    render(Math.round(displayed));

    if (displayed >= 100) {
      finish();
      return;
    }
    requestAnimationFrame(tick);
  }

  function finish() {
    render(100);
    tipEl.textContent = "Tayyor!";
    knight.style.animationPlayState = "paused";
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
