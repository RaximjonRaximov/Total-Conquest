// ============================================
// RESOURCE FLY ANIMATION — Resurs HUD ga uchish
// Resurs yig'ilganda oltin/oziq HUD ga uchadi
// ============================================

const ResourceFlyAnim = {
    _particles: [],

    play(startX, startY, type, amount) {
        const icon  = type === 'gold' ? '🪙' : type === 'food' ? '🍎' : type === 'diamond' ? '💎' : '🍏';
        const color = type === 'gold' ? '#ffd700' : type === 'food' ? '#76c442' : type === 'diamond' ? '#7ecef2' : '#4caf50';
        const hudEl = type === 'gold'    ? document.getElementById('res-gold-box')
                    : type === 'food'    ? document.getElementById('res-food-box')
                    : type === 'diamond' ? document.getElementById('res-diamond-box')
                    : null;

        // Target pozitsiyasi
        let tx = window.innerWidth / 2;
        let ty = 20;
        if (hudEl) {
            const rect = hudEl.getBoundingClientRect();
            tx = rect.left + rect.width / 2;
            ty = rect.top  + rect.height / 2;
        }

        // Bir necha uchuvchi zarracha (max 5)
        const count = Math.min(5, Math.max(1, Math.floor(Math.log10(amount + 1)) + 1));
        for (let i = 0; i < count; i++) {
            const delay = i * 80;
            setTimeout(() => {
                this._spawnParticle(
                    startX + (Math.random() - 0.5) * 20,
                    startY + (Math.random() - 0.5) * 10,
                    tx, ty, icon, color
                );
            }, delay);
        }

        // Kichik amount badge
        this._showAmountBadge(startX, startY, amount, color);
    },

    _spawnParticle(sx, sy, tx, ty, icon, color) {
        const p = document.createElement('div');
        p.style.cssText = `
            position:fixed;
            left:${sx}px;top:${sy}px;
            font-size:16px;
            pointer-events:none;
            z-index:15000;
            transition:none;
            transform:translate(-50%,-50%);
        `;
        p.textContent = icon;
        document.body.appendChild(p);

        const duration = 600 + Math.random() * 200;
        const startTime = performance.now();

        // Bezier-like arc path
        const cp1x = sx + (tx - sx) * 0.2 + (Math.random() - 0.5) * 60;
        const cp1y = sy - 60 - Math.random() * 40;
        const cp2x = tx + (Math.random() - 0.5) * 30;
        const cp2y = ty + 20;

        const animate = (now) => {
            const t = Math.min(1, (now - startTime) / duration);
            // Cubic bezier approx
            const mt  = 1 - t;
            const t2  = t * t;
            const mt2 = mt * mt;
            const x = mt2 * mt * sx + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t2 * t * tx;
            const y = mt2 * mt * sy + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t2 * t * ty;

            const scale = t < 0.5 ? 1 + t * 0.3 : 1.3 - (t - 0.5) * 0.8;
            const alpha = t > 0.8 ? 1 - (t - 0.8) * 5 : 1;

            p.style.left = x + 'px';
            p.style.top  = y + 'px';
            p.style.transform = `translate(-50%,-50%) scale(${scale})`;
            p.style.opacity = alpha;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                p.remove();
                // HUD pulse effekti
                this._pulseHUD(color);
            }
        };
        requestAnimationFrame(animate);
    },

    _showAmountBadge(x, y, amount, color) {
        const badge = document.createElement('div');
        badge.style.cssText = `
            position:fixed;
            left:${x}px;top:${y - 10}px;
            transform:translate(-50%,-100%);
            font-size:12px;font-weight:700;
            color:${color};
            text-shadow:0 1px 4px rgba(0,0,0,0.8);
            pointer-events:none;
            z-index:15001;
            animation:resourceBadgeFly 0.8s ease-out forwards;
        `;
        badge.textContent = `+${Helpers.formatNumber(amount)}`;
        document.body.appendChild(badge);
        setTimeout(() => badge.remove(), 850);
    },

    _pulseHUD(color) {
        // Briefly flash the HUD resource display
        const boxes = document.querySelectorAll('.res-box');
        boxes.forEach(box => {
            const orig = box.style.boxShadow;
            box.style.transition = 'box-shadow 0.15s';
            box.style.boxShadow = `0 0 12px ${color}`;
            setTimeout(() => {
                box.style.boxShadow = orig || '';
            }, 300);
        });
    }
};
