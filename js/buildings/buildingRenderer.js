// ============================================
// BINO RENDERER - Binolarni Canvas'da chizish
// ============================================

const BuildingRenderer = {
    // Barcha binolarni chizish
    renderAll(ctx) {
        // Izometrik tartibda chizish (orqadagilar birinchi)
        const sorted = Object.values(BuildingManager.buildings).sort((a, b) => {
            return (a.x + a.y) - (b.x + b.y);
        });

        for (const b of sorted) {
            this.drawBuilding(ctx, b);
        }
    },

    drawBuilding(ctx, b) {
        const bd = BUILDING_DATA[b.type];
        const w = bd.size[0];
        const h = bd.size[1];

        // Bino markazini hisoblash
        const centerX = b.x + w / 2;
        const centerY = b.y + h / 2;
        const iso = Camera.toIso(centerX, centerY);
        const screen = Camera.worldToScreen(iso.x, iso.y);
        const px = screen.x;
        const py = screen.y;

        const z = Camera.zoom;
        const bw = w * Grid.TILE_W * z / 2;
        const bh = h * Grid.TILE_H * z / 2;

        // Ekrandan tashqarida bo'lsa — o'tkazish
        if (px + bw < -50 || px - bw > MapRenderer.canvas.width + 50 ||
            py + bh < -50 || py - bh > MapRenderer.canvas.height + 100) return;

        // Qurilmoqda bo'lsa — shaffofroq
        const alpha = b.building ? 0.6 : 1.0;
        ctx.globalAlpha = alpha;

        // Bino shakli (izometrik kuboid)
        const baseH = (12 + b.level * 4) * z;
        const hw = bw * 0.8;
        const hh = bh * 0.8;

        this._drawIsoBox(ctx, px, py, hw, hh, baseH, this._getColor(b.type, b.level));

        // Emoji ikonka
        ctx.globalAlpha = 1.0;
        const iconSize = Math.max(14, Math.min(28, 18 * z));
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bd.icon, px, py - baseH / 2 - 4 * z);

        // Level badge
        if (b.level > 1 || !b.building) {
            const badgeSize = 8 * z;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.arc(px + hw * 0.7, py - 2 * z, badgeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.font = `bold ${Math.max(7, 9 * z)}px Inter, sans-serif`;
            ctx.fillText(b.level, px + hw * 0.7, py - 1.5 * z);
        }

        // Qurilish progress bar
        if (b.building && b.timerId) {
            const prog = timerManager.getProgress(b.timerId);
            const barW = hw * 1.4;
            const barH = 4 * z;
            const barY = py + hh * 0.6;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(px - barW / 2, barY, barW, barH);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(px - barW / 2, barY, barW * prog, barH);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px - barW / 2, barY, barW, barH);

            // Qolgan vaqt
            const rem = timerManager.getRemaining(b.timerId);
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.max(7, 8 * z)}px Inter, sans-serif`;
            ctx.fillText(Helpers.formatTime(rem), px, barY + barH + 8 * z);
        }

        // Resurs yig'ish ko'rsatkichi
        if (!b.building && b.storedResource >= 5) {
            const coinY = py - baseH - 10 * z;
            const pulse = 0.8 + Math.sin(Date.now() * 0.004) * 0.2;
            ctx.globalAlpha = pulse;

            let resIcon = '';
            if (b.type === 'villa') resIcon = '🪙';
            else if (b.type === 'farm') resIcon = '🍎';
            else if (b.type === 'treeOfLife') resIcon = '🍏';

            if (resIcon) {
                ctx.font = `${Math.max(12, 16 * z)}px sans-serif`;
                ctx.fillText(resIcon, px, coinY);
                ctx.font = `bold ${Math.max(8, 10 * z)}px Inter, sans-serif`;
                ctx.fillStyle = '#fff';
                ctx.fillText('+' + Math.floor(b.storedResource), px, coinY + 14 * z);
            }
            ctx.globalAlpha = 1.0;
        }

        ctx.globalAlpha = 1.0;
    },

    // Izometrik kuboid chizish
    _drawIsoBox(ctx, px, py, hw, hh, height, colors) {
        // Yuqori yuz
        ctx.beginPath();
        ctx.moveTo(px, py - hh - height);
        ctx.lineTo(px + hw, py - height);
        ctx.lineTo(px, py + hh - height);
        ctx.lineTo(px - hw, py - height);
        ctx.closePath();
        ctx.fillStyle = colors.top;
        ctx.fill();
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Chap yon
        ctx.beginPath();
        ctx.moveTo(px - hw, py - height);
        ctx.lineTo(px, py + hh - height);
        ctx.lineTo(px, py + hh);
        ctx.lineTo(px - hw, py);
        ctx.closePath();
        ctx.fillStyle = colors.left;
        ctx.fill();
        ctx.stroke();

        // O'ng yon
        ctx.beginPath();
        ctx.moveTo(px + hw, py - height);
        ctx.lineTo(px, py + hh - height);
        ctx.lineTo(px, py + hh);
        ctx.lineTo(px + hw, py);
        ctx.closePath();
        ctx.fillStyle = colors.right;
        ctx.fill();
        ctx.stroke();
    },

    // Bino turi bo'yicha rang
    _getColor(type, level) {
        const schemes = {
            cityHall:    { top: '#e8c840', left: '#c4a030', right: '#a08020', outline: '#806010' },
            villa:       { top: '#f0d080', left: '#d0b060', right: '#b09040', outline: '#907030' },
            goldStorage: { top: '#e8b020', left: '#c89818', right: '#a87810', outline: '#886010' },
            farm:        { top: '#90c850', left: '#70a838', right: '#508820', outline: '#406818' },
            foodStorage: { top: '#e06040', left: '#c04830', right: '#a03020', outline: '#802018' },
            treeOfLife:  { top: '#50b850', left: '#389838', right: '#207820', outline: '#186018' },
            goldenAppleStorage: { top: '#c8d830', left: '#a8b820', right: '#889810', outline: '#687808' },
            barracks:    { top: '#c05050', left: '#a03838', right: '#802828', outline: '#601818' },
            musterGround:{ top: '#9060b0', left: '#704890', right: '#503070', outline: '#402060' },
            blacksmith:  { top: '#8d6e63', left: '#6d4e43', right: '#4d3e33', outline: '#3d2e23' },
            legionForum: { top: '#5060b0', left: '#384890', right: '#283070', outline: '#182060' },
            wall:        { top: '#a0a0a0', left: '#808080', right: '#606060', outline: '#404040' },
            gate:        { top: '#8090a0', left: '#607080', right: '#405060', outline: '#304050' },
            archerTower: { top: '#c07040', left: '#a05828', right: '#804018', outline: '#603010' },
            scorpio:     { top: '#d09030', left: '#b07020', right: '#905010', outline: '#704008' },
            tormenta:    { top: '#4080c0', left: '#3060a0', right: '#204080', outline: '#183060' },
            flamingCitadel:{top: '#e04020', left: '#c03010', right: '#a02008', outline: '#801008' },
            spikeTrap:   { top: '#707070', left: '#505050', right: '#383838', outline: '#282828' },
            militia:     { top: '#7050a0', left: '#503880', right: '#382860', outline: '#281850' }
        };
        return schemes[type] || schemes.wall;
    }
};
