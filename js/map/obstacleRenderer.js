// ============================================
// TO'SIQ RENDERER - Daraxt, tosh chizish
// ============================================

function _darkenColor2(hex, amount) {
    try {
        const num = parseInt(hex.replace('#',''), 16);
        const r = Math.max(0, ((num >> 16) & 255) * (1 - amount) | 0);
        const g = Math.max(0, ((num >>  8) & 255) * (1 - amount) | 0);
        const b = Math.max(0, ((num      ) & 255) * (1 - amount) | 0);
        return `rgb(${r},${g},${b})`;
    } catch(e) { return hex; }
}

const ObstacleRenderer = {
    renderAll(ctx) {
        const sorted = Object.values(ObstacleManager.obstacles).sort(
            (a, b) => (a.x + a.y) - (b.x + b.y)
        );
        for (const obs of sorted) {
            this.drawObstacle(ctx, obs);
        }
    },

    drawObstacle(ctx, obs) {
        const od = OBSTACLE_DATA[obs.type];
        if (!od) return;

        const fp = BuildingRenderer.getScreenFootprint(obs.x, obs.y, od.size[0], od.size[1]);
        const z = Camera.zoom;

        // Ekrandan tashqarida
        if (fp.cx < -80 || fp.cx > MapRenderer.canvas.width + 80 ||
            fp.cy < -80 || fp.cy > MapRenderer.canvas.height + 80) return;

        // Removing holati
        if (obs.removing) {
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.15;
        }

        // Wobble animatsiya (daraxt/gul uchun)
        let wobble = 0;
        if (obs.type.startsWith('tree') || obs.type === 'bush' || obs.type === 'flower') {
            wobble = Math.sin(Date.now() * 0.001 + obs.id * 1.7) * 1.2 * z;
        }

        const cx = fp.cx + wobble;
        const baseY = fp.bottom.y + 2 * z;

        // ── Procedural rendering ─────────────────────────────────────────────────
        if (obs.type.startsWith('tree') && z > 0.4) {
            this._drawTree(ctx, obs, cx, baseY, z, od);
        } else if (obs.type.startsWith('rock') && z > 0.4) {
            this._drawRock(ctx, obs, cx, baseY, z, od);
        } else if (obs.type === 'bush' && z > 0.4) {
            this._drawBush(ctx, obs, cx, baseY, z);
        } else {
            // Emoji fallback (kichik zoom yoki maxsus turlar)
            const iconSize = Math.max(16, 26 * z * Math.max(od.size[0], od.size[1]));
            ctx.font = `${iconSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(od.icon, cx, baseY);
        }

        ctx.globalAlpha = 1;

        // Removing progress
        if (obs.removing && obs.timerId) {
            const prog = timerManager.getProgress(obs.timerId);
            const rem = timerManager.getRemaining(obs.timerId);
            const bw = 30 * z;
            const by = fp.bottom.y + 4*z;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(fp.cx - bw/2, by, bw, 3*z);
            ctx.fillStyle = '#ffa726';
            ctx.fillRect(fp.cx - bw/2, by, bw * prog, 3*z);
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.max(7, 8*z)}px Inter,sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(Helpers.formatTime(rem), fp.cx, by + 5*z);
        }
    },

    // ── Daraxt — tanasi + barglari ───────────────────────────────────────────────
    _drawTree(ctx, obs, cx, baseY, z, od) {
        const isLarge = obs.type === 'tree1';
        const trunkH  = (isLarge ? 14 : 9) * z;
        const trunkW  = (isLarge ? 3  : 2) * z;
        const canopyR = (isLarge ? 11 : 7) * z;
        const canopyY = baseY - trunkH - canopyR * 0.6;

        // Tana soyasi
        ctx.save();
        ctx.globalAlpha *= 0.25;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(cx + 2*z, baseY, trunkW * 1.8, trunkW * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha /= 0.25;

        // Tanasi (trunk)
        const trunkGrad = ctx.createLinearGradient(cx - trunkW, 0, cx + trunkW, 0);
        trunkGrad.addColorStop(0, '#4e342e');
        trunkGrad.addColorStop(0.4, '#6d4c41');
        trunkGrad.addColorStop(1, '#4e342e');
        ctx.fillStyle = trunkGrad;
        ctx.fillRect(cx - trunkW / 2, baseY - trunkH, trunkW, trunkH);

        // Barglari (3 qatlam)
        const leafColor = isLarge ? '#2e7d32' : '#1b5e20';
        const leafHigh  = isLarge ? '#43a047' : '#388e3c';
        for (let li = 2; li >= 0; li--) {
            const lr  = canopyR * (1 - li * 0.18);
            const ly  = canopyY - li * canopyR * 0.28;
            const lx  = cx + (li === 1 ? -1*z : li === 2 ? 1*z : 0);

            // Barg soyasi
            ctx.globalAlpha *= 0.3;
            ctx.fillStyle = 'rgba(0,50,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(lx + 1.5*z, ly + 2*z, lr * 0.85, lr * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha /= 0.3;

            // Asosiy barg doirasi
            const lGrad = ctx.createRadialGradient(lx - lr*0.3, ly - lr*0.2, 0, lx, ly, lr);
            lGrad.addColorStop(0,   leafHigh);
            lGrad.addColorStop(0.5, leafColor);
            lGrad.addColorStop(1,   _darkenColor2(leafColor, 0.3));
            ctx.fillStyle = lGrad;
            ctx.beginPath();
            ctx.ellipse(lx, ly, lr, lr * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    },

    // ── Tosh — 2x2 yoki 1x1 ─────────────────────────────────────────────────────
    _drawRock(ctx, obs, cx, baseY, z, od) {
        const isLarge = od.size[0] >= 2;
        ctx.save();

        // Seeded random
        const seed = obs.id * 1337;
        const rng = (n) => { const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5; return v - Math.floor(v); };

        const baseR = (isLarge ? 20 : 11) * z;
        const rockCount = isLarge ? 3 : 2;

        for (let ri = 0; ri < rockCount; ri++) {
            const ox = (rng(ri) - 0.5) * baseR * (isLarge ? 0.9 : 0.5);
            const oy = (rng(ri + 3) - 0.5) * baseR * 0.3;
            const rr = baseR * (0.6 + rng(ri + 6) * 0.5);
            const gray1 = Math.round(100 + rng(ri + 9) * 70);
            const gray2 = Math.round(gray1 * 0.65);

            // Tosh soyasi
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.ellipse(cx + ox + 2*z, baseY + oy, rr * 0.9, rr * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Tosh tanasi
            const rGrad = ctx.createRadialGradient(
                cx + ox - rr*0.2, baseY + oy - rr*0.4, 0,
                cx + ox, baseY + oy, rr
            );
            rGrad.addColorStop(0,   `rgb(${gray1},${gray1},${gray1})`);
            rGrad.addColorStop(0.6, `rgb(${gray2},${gray2},${gray2 - 5})`);
            rGrad.addColorStop(1,   `rgb(${gray2 - 10},${gray2 - 10},${gray2 - 15})`);
            ctx.fillStyle = rGrad;
            ctx.beginPath();
            // 7 ta burchakli tabiiy tosh silueti
            const sides = 6 + (ri % 2);
            ctx.moveTo(cx + ox + rr, baseY + oy);
            for (let s = 1; s < sides; s++) {
                const ang = (s / sides) * Math.PI * 2;
                const rad = rr * (0.82 + rng(ri * 10 + s) * 0.22);
                ctx.lineTo(cx + ox + Math.cos(ang) * rad, baseY + oy + Math.sin(ang) * rad * 0.6);
            }
            ctx.closePath();
            ctx.fill();

            // Tosh ustidagi chiziq (crack / texture)
            ctx.strokeStyle = `rgba(${gray2 - 20},${gray2 - 20},${gray2 - 20},0.35)`;
            ctx.lineWidth = 0.7 * z;
            ctx.beginPath();
            ctx.moveTo(cx + ox - rr * 0.3, baseY + oy - rr * 0.25);
            ctx.lineTo(cx + ox + rr * 0.2, baseY + oy + rr * 0.1);
            ctx.stroke();
        }
        ctx.restore();
    },

    // ── Buta ─────────────────────────────────────────────────────────────────────
    _drawBush(ctx, obs, cx, baseY, z) {
        ctx.save();
        const r = 7 * z;
        const colors = ['#2e7d32','#388e3c','#43a047'];
        for (let bi = 0; bi < 3; bi++) {
            const bx = cx + (bi - 1) * r * 0.6;
            const by = baseY - r * (0.5 + bi * 0.15);
            const br = r * (0.65 + bi * 0.1);
            ctx.fillStyle = colors[bi];
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.fill();
        }
        // Yuqori highlight
        ctx.fillStyle = 'rgba(100,200,80,0.2)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.2, baseY - r * 0.7, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    _darken(color, factor) {
        // Simple darken for hex colors
        if (color.startsWith('#')) {
            const num = parseInt(color.slice(1), 16);
            const r = Math.floor(((num >> 16) & 255) * factor);
            const g = Math.floor(((num >> 8) & 255) * factor);
            const b = Math.floor((num & 255) * factor);
            return `rgb(${r},${g},${b})`;
        }
        return color;
    }
};
