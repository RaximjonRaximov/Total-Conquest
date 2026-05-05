// ============================================
// TO'SIQ RENDERER - Daraxt, tosh chizish
// ============================================

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

        // Shadow
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.ellipse(fp.cx, fp.bottom.y - 2*z, 12*z * od.size[0], 5*z * od.size[1], 0, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.globalAlpha = 1;

        // Removing holati
        if (obs.removing) {
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.15;
        }

        // Tur bo'yicha chizish
        const iconSize = Math.max(18, 28 * z * Math.max(od.size[0], od.size[1]) / 1.5);
        
        // 3D effekt uchun pastki rang
        const baseH = 6 * z * od.size[0];
        ctx.fillStyle = this._darken(od.color, 0.5);
        ctx.beginPath();
        ctx.ellipse(fp.cx, fp.bottom.y, 10*z * od.size[0], 4*z * od.size[1], 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ikonka
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Wobble animatsiya daraxtlar uchun
        let wobble = 0;
        if (obs.type.startsWith('tree') || obs.type === 'bush' || obs.type === 'flower') {
            wobble = Math.sin(Date.now() * 0.001 + obs.id * 1.7) * 1.5 * z;
        }
        
        ctx.fillText(od.icon, fp.cx + wobble, fp.bottom.y - baseH + 4*z);

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
