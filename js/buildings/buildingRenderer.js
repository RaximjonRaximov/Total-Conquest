// ============================================
// BINO RENDERER - Binolarni Canvas'da chizish
// Binolar katakchalarni TO'LIQ qoplaydi
// ============================================

const BuildingRenderer = {
    // Rasmlar keshi
    imageCache: {},

    // Rasmni yuklash
    loadImage(src) {
        if (this.imageCache[src]) return this.imageCache[src];
        const img = new Image();
        img.src = src;
        img.onload = () => { this.imageCache[src] = img; };
        this.imageCache[src] = null; // yuklanmoqda
        return null;
    },

    // Bino rasmini olish
    getBuildingImage(type, level) {
        const src = `assets/buildings/${type}_${level}.png`;
        return this.loadImage(src);
    },

    // Barcha binolarni chizish
    renderAll(ctx) {
        const sorted = Object.values(BuildingManager.buildings).sort((a, b) => {
            return (a.x + a.y) - (b.x + b.y);
        });
        for (const b of sorted) {
            this.drawBuilding(ctx, b);
        }
    },

    // Bino uchun izometrik diamond (tile footprint) hisoblash
    getFootprint(bx, by, w, h) {
        // 4 burchak: yuqori, o'ng, pastki, chap
        const top = Camera.toIso(bx, by);
        const right = Camera.toIso(bx + w, by);
        const bottom = Camera.toIso(bx + w, by + h);
        const left = Camera.toIso(bx, by + h);
        return { top, right, bottom, left };
    },

    drawBuilding(ctx, b) {
        const bd = BUILDING_DATA[b.type];
        const w = bd.size[0];
        const h = bd.size[1];
        const fp = this.getFootprint(b.x, b.y, w, h);
        const z = Camera.zoom;

        // Ekran koordinatalari
        const sTop = Camera.worldToScreen(fp.top.x, fp.top.y);
        const sRight = Camera.worldToScreen(fp.right.x, fp.right.y);
        const sBottom = Camera.worldToScreen(fp.bottom.x, fp.bottom.y);
        const sLeft = Camera.worldToScreen(fp.left.x, fp.left.y);

        // Markaz
        const cx = (sTop.x + sBottom.x) / 2;
        const cy = (sTop.y + sBottom.y) / 2;

        // Ekrandan tashqarida — o'tkazish
        const margin = 100;
        if (cx < -margin || cx > MapRenderer.canvas.width + margin ||
            cy < -margin || cy > MapRenderer.canvas.height + margin) return;

        const alpha = b.building ? 0.6 : 1.0;
        ctx.globalAlpha = alpha;

        // Bino balandligi (piksellarda)
        const buildingH = (16 + b.level * 5) * z;

        // Rasmni tekshirish
        const img = this.getBuildingImage(b.type, b.level);

        if (img) {
            // RASM BILAN CHIZISH
            const imgW = (sRight.x - sLeft.x);
            const imgH = imgW * (img.height / img.width);
            ctx.drawImage(img, cx - imgW / 2, cy - imgH + (sBottom.y - cy), imgW, imgH);
        } else {
            // GEOMETRIK SHAKL BILAN CHIZISH (rasm yuklanmaguncha)
            const colors = this._getColor(b.type, b.level);

            // Yuqori yuz (bino tepasi) — tile shaplini to'liq qoplaydi
            ctx.beginPath();
            ctx.moveTo(sTop.x, sTop.y - buildingH);
            ctx.lineTo(sRight.x, sRight.y - buildingH);
            ctx.lineTo(sBottom.x, sBottom.y - buildingH);
            ctx.lineTo(sLeft.x, sLeft.y - buildingH);
            ctx.closePath();
            ctx.fillStyle = colors.top;
            ctx.fill();
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Chap yon yuz
            ctx.beginPath();
            ctx.moveTo(sLeft.x, sLeft.y - buildingH);
            ctx.lineTo(sBottom.x, sBottom.y - buildingH);
            ctx.lineTo(sBottom.x, sBottom.y);
            ctx.lineTo(sLeft.x, sLeft.y);
            ctx.closePath();
            ctx.fillStyle = colors.left;
            ctx.fill();
            ctx.strokeStyle = colors.outline;
            ctx.stroke();

            // O'ng yon yuz
            ctx.beginPath();
            ctx.moveTo(sRight.x, sRight.y - buildingH);
            ctx.lineTo(sBottom.x, sBottom.y - buildingH);
            ctx.lineTo(sBottom.x, sBottom.y);
            ctx.lineTo(sRight.x, sRight.y);
            ctx.closePath();
            ctx.fillStyle = colors.right;
            ctx.fill();
            ctx.strokeStyle = colors.outline;
            ctx.stroke();
        }

        // EMOJI IKONKA (rasm bo'lmasa)
        if (!img) {
            ctx.globalAlpha = 1.0;
            const iconSize = Math.max(14, Math.min(32, 20 * z * Math.max(w, h) / 2));
            ctx.font = `${iconSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bd.icon, cx, cy - buildingH / 2);
        }

        ctx.globalAlpha = 1.0;

        // LEVEL BADGE
        const badgeX = sRight.x - 4 * z;
        const badgeY = sRight.y - buildingH - 2 * z;
        const badgeR = Math.max(6, 8 * z);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${Math.max(8, 10 * z)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.level, badgeX, badgeY);

        // QURILISH PROGRESS BAR
        if (b.building && b.timerId) {
            const prog = timerManager.getProgress(b.timerId);
            const rem = timerManager.getRemaining(b.timerId);
            const barW = (sRight.x - sLeft.x) * 0.7;
            const barH = 4 * z;
            const barX = cx - barW / 2;
            const barY = sBottom.y + 4 * z;

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(barX, barY, barW * prog, barH);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.fillStyle = '#fff';
            ctx.font = `${Math.max(8, 9 * z)}px Inter, sans-serif`;
            ctx.fillText(Helpers.formatTime(rem), cx, barY + barH + 8 * z);
        }

        // RESURS YIG'ISH KO'RSATKICHI
        if (!b.building && b.storedResource >= 5) {
            const iconY = sTop.y - buildingH - 16 * z;
            const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
            ctx.globalAlpha = pulse;

            let resIcon = '';
            if (b.type === 'villa') resIcon = '🪙';
            else if (b.type === 'farm') resIcon = '🍎';
            else if (b.type === 'treeOfLife') resIcon = '🍏';

            if (resIcon) {
                const sz = Math.max(14, 18 * z);
                ctx.font = `${sz}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(resIcon, cx, iconY);
                ctx.font = `bold ${Math.max(9, 11 * z)}px Inter, sans-serif`;
                ctx.fillStyle = '#fff';
                ctx.fillText('+' + Math.floor(b.storedResource), cx, iconY + 16 * z);
            }
            ctx.globalAlpha = 1.0;
        }
    },

    // Ghost bino chizish (joylashtirish rejimida)
    drawGhost(ctx, type, gx, gy, canPlace) {
        const bd = BUILDING_DATA[type];
        const w = bd.size[0];
        const h = bd.size[1];
        const fp = this.getFootprint(gx, gy, w, h);
        const z = Camera.zoom;

        const sTop = Camera.worldToScreen(fp.top.x, fp.top.y);
        const sRight = Camera.worldToScreen(fp.right.x, fp.right.y);
        const sBottom = Camera.worldToScreen(fp.bottom.x, fp.bottom.y);
        const sLeft = Camera.worldToScreen(fp.left.x, fp.left.y);
        const cx = (sTop.x + sBottom.x) / 2;
        const cy = (sTop.y + sBottom.y) / 2;

        // Tag yuz — yashil yoki qizil
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(sTop.x, sTop.y);
        ctx.lineTo(sRight.x, sRight.y);
        ctx.lineTo(sBottom.x, sBottom.y);
        ctx.lineTo(sLeft.x, sLeft.y);
        ctx.closePath();
        ctx.fillStyle = canPlace ? '#4caf50' : '#f44336';
        ctx.fill();
        ctx.strokeStyle = canPlace ? '#2e7d32' : '#c62828';
        ctx.lineWidth = 2 * z;
        ctx.stroke();

        // Ghost bino shakli
        const buildingH = 20 * z;
        const colors = this._getColor(type, 1);
        ctx.globalAlpha = 0.5;

        // Yuqori yuz
        ctx.beginPath();
        ctx.moveTo(sTop.x, sTop.y - buildingH);
        ctx.lineTo(sRight.x, sRight.y - buildingH);
        ctx.lineTo(sBottom.x, sBottom.y - buildingH);
        ctx.lineTo(sLeft.x, sLeft.y - buildingH);
        ctx.closePath();
        ctx.fillStyle = colors.top;
        ctx.fill();

        // Chap yon
        ctx.beginPath();
        ctx.moveTo(sLeft.x, sLeft.y - buildingH);
        ctx.lineTo(sBottom.x, sBottom.y - buildingH);
        ctx.lineTo(sBottom.x, sBottom.y);
        ctx.lineTo(sLeft.x, sLeft.y);
        ctx.closePath();
        ctx.fillStyle = colors.left;
        ctx.fill();

        // O'ng yon
        ctx.beginPath();
        ctx.moveTo(sRight.x, sRight.y - buildingH);
        ctx.lineTo(sBottom.x, sBottom.y - buildingH);
        ctx.lineTo(sBottom.x, sBottom.y);
        ctx.lineTo(sRight.x, sRight.y);
        ctx.closePath();
        ctx.fillStyle = colors.right;
        ctx.fill();

        // Ikonka
        ctx.globalAlpha = 0.7;
        const iconSize = Math.max(16, 22 * z * Math.max(w, h) / 2);
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bd.icon, cx, cy - buildingH / 2);

        ctx.globalAlpha = 1.0;

        // ✅ va ❌ tugmalar
        const btnY = sTop.y - buildingH - 30 * z;
        const btnSize = Math.max(18, 24 * z);

        // Tasdiqlash (yashil)
        if (canPlace) {
            ctx.fillStyle = 'rgba(46,125,50,0.9)';
            ctx.beginPath();
            ctx.arc(cx - 20 * z, btnY, btnSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.font = `${btnSize * 0.6}px sans-serif`;
            ctx.fillStyle = '#fff';
            ctx.fillText('✓', cx - 20 * z, btnY + 1);
        }

        // Bekor qilish (qizil)
        ctx.fillStyle = 'rgba(198,40,40,0.9)';
        ctx.beginPath();
        ctx.arc(cx + 20 * z, btnY, btnSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = `${btnSize * 0.6}px sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.fillText('✕', cx + 20 * z, btnY + 1);

        // Tugma pozitsiyalarini saqlash (click uchun)
        BuildMenu._confirmBtnPos = { x: cx - 20 * z, y: btnY, r: btnSize / 2 };
        BuildMenu._cancelBtnPos = { x: cx + 20 * z, y: btnY, r: btnSize / 2 };
    },

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
