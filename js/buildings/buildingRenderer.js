// ============================================
// BINO RENDERER - Katakchalarni TO'LIQ qoplaydi
// ============================================

const BuildingRenderer = {
    imageCache: {},

    loadImage(src) {
        if (this.imageCache[src] !== undefined) return this.imageCache[src];
        const img = new Image();
        img.src = src;
        this.imageCache[src] = null;
        img.onload = () => { this.imageCache[src] = img; };
        return null;
    },

    getBuildingImage(type, level) {
        // 1) AssetManager: subdirectory format
        const sub = AssetManager.load(`assets/buildings/${type}/lvl${level}.png`);
        if (sub) return sub;
        // 2) Legacy flat format: cityHall_1.png ... cityHall_4.png
        const flat = this.loadImage(`assets/buildings/${type}_${level}.png`);
        if (flat) return flat;
        // 3) cityHall levels 5-10: townHall_X.png.png (disk naming)
        if (type === 'cityHall' && level >= 5) {
            return this.loadImage(`assets/buildings/townHall_${level}.png.png`);
        }
        return null;
    },

    // TO'G'RI footprint — tile chegaralarini aniq hisoblash
    getScreenFootprint(bx, by, w, h) {
        const z = Camera.zoom;
        const hw = Grid.TILE_W * z / 2;
        const hh = Grid.TILE_H * z / 2;

        // Har bir burchak tile ning markazi
        const iTop = Camera.toIso(bx, by);
        const iRight = Camera.toIso(bx + w - 1, by);
        const iBottom = Camera.toIso(bx + w - 1, by + h - 1);
        const iLeft = Camera.toIso(bx, by + h - 1);
        const tTop = Camera.worldToScreen(iTop.x, iTop.y);
        const tRight = Camera.worldToScreen(iRight.x, iRight.y);
        const tBottom = Camera.worldToScreen(iBottom.x, iBottom.y);
        const tLeft = Camera.worldToScreen(iLeft.x, iLeft.y);

        return {
            top:    { x: tTop.x,         y: tTop.y - hh },
            right:  { x: tRight.x + hw,  y: tRight.y },
            bottom: { x: tBottom.x,      y: tBottom.y + hh },
            left:   { x: tLeft.x - hw,   y: tLeft.y },
            cx: (tTop.x + tBottom.x) / 2,
            cy: (tTop.y - hh + tBottom.y + hh) / 2
        };
    },

    renderAll(ctx) {
        const sorted = Object.values(BuildingManager.buildings).sort((a, b) => (a.x + a.y) - (b.x + b.y));
        for (const b of sorted) {
            if (BuildingManager.dragging && b.id === BuildingManager.dragBuildingId) continue;
            this.drawBuilding(ctx, b);
        }
        this._drawWallConnectors(ctx);
        // ── Selected building range ring — CoC-style (mudofaa binosi tanlananda) ──
        if (typeof InfoPanel !== 'undefined' && InfoPanel.currentBuilding
            && typeof Game !== 'undefined' && Game.mode === 'home') {
            this._drawRangeRing(ctx, InfoPanel.currentBuilding);
        }
    },

    // Mudofaa binosi tanlanganda uning hujum radiusini ko'rsatish
    _drawRangeRing(ctx, b) {
        if (!b || b.building) return;
        const bd = BUILDING_DATA[b.type];
        if (!bd || bd.category !== 'mudofaa') return;
        const lv = bd.levels[b.level];
        if (!lv || !lv.range) return;

        const z = Camera.zoom;
        const rangeTiles = lv.range;

        // Izometrik proeksiyada aylana = ellips
        // cx, cy = bino markazining izoscreen koordinatasi
        const bCx = b.x + bd.size[0] / 2;
        const bCy = b.y + bd.size[1] / 2;
        const isoCenter = Camera.toIso(bCx, bCy);
        const sc = Camera.worldToScreen(isoCenter.x, isoCenter.y);

        // Radiusni tile → screen ga o'girish (izometrik)
        const rX = rangeTiles * Grid.TILE_W * z;       // gorizontal radius
        const rY = rangeTiles * Grid.TILE_H * z * 0.5; // vertikal radius (izometrik squash)

        const now = Date.now();
        const pulse = 0.55 + 0.25 * Math.sin(now * 0.003);

        ctx.save();

        // Tashqi dolg'a (filled semi-transparent)
        ctx.globalAlpha = 0.07 * pulse;
        ctx.fillStyle = 'rgba(100,181,246,1)';
        ctx.beginPath();
        ctx.ellipse(sc.x, sc.y, rX, rY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kontur chizig'i
        ctx.globalAlpha = 0.45 + 0.2 * pulse;
        ctx.strokeStyle = 'rgba(100,181,246,0.9)';
        ctx.lineWidth = Math.max(1, 1.5 * z);
        ctx.setLineDash([5 * z, 4 * z]);
        ctx.lineDashOffset = -(now * 0.03 % (18 * z));
        ctx.beginPath();
        ctx.ellipse(sc.x, sc.y, rX, rY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Range matn — nishon masofasi
        if (z > 0.5) {
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = '#90caf9';
            ctx.font = `bold ${Math.max(8, 9 * z)}px Inter,sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`⚡ ${rangeTiles}`, sc.x, sc.y + rY + 10 * z);
        }

        ctx.restore();
    },

    _drawWallConnectors(ctx) {
        const walls = Object.values(BuildingManager.buildings).filter(b => b.type === 'wall' || b.type === 'gate');
        if (walls.length < 2) return;

        const wallSet = new Map();
        for (const w of walls) wallSet.set(`${w.x},${w.y}`, w);

        const z   = Camera.zoom;
        const hw  = Grid.TILE_W * z / 2;
        const hh  = Grid.TILE_H * z / 2;
        const hasMultiple = walls.length >= 2;

        // Level-based colors (1–10)
        const WALL_COLORS = [
            { top:'#aaaaaa', side:'#7a7a7a', shadow:'#404040' },  // lv1
            { top:'#909090', side:'#636363', shadow:'#383838' },  // lv2
            { top:'#a8906e', side:'#7d6a4f', shadow:'#5a4a35' },  // lv3
            { top:'#c09a5a', side:'#9a7d3a', shadow:'#7a5d20' },  // lv4
            { top:'#ccaa52', side:'#aa8832', shadow:'#8a6812' },  // lv5
            { top:'#d8b460', side:'#b89040', shadow:'#907020' },  // lv6
            { top:'#ecc870', side:'#c89c40', shadow:'#a07c20' },  // lv7
            { top:'#94da4e', side:'#68b020', shadow:'#4a8010' },  // lv8
            { top:'#44c8ec', side:'#1aa4c8', shadow:'#1080a0' },  // lv9
            { top:'#e444ff', side:'#b000d0', shadow:'#7a0090' },  // lv10
        ];

        // ── Helper: draw merlons (battlements) on a connector front edge ───────
        const _drawMerlons = (cx, cy, mx, my, cnx, cny, dx, dy, perp, wallH, c) => {
            if (z < 0.35) return;
            const lv = c._lv || 1;
            if (lv < 2) return;
            const mH  = Math.min(5.5, (1.5 + lv * 0.38)) * z;
            const mW  = (1.8 + lv * 0.07) * z;
            const udx = dx / perp, udy = dy / perp;
            // Inward direction (from front to back edge) = (-cnx, -cny) normalized
            const inDX = -cnx * 0.6;   // depth toward back of wall (0.6 of half-width)
            const inDY = -cny * 0.6;
            const mCount = Math.max(1, Math.min(3, Math.round(perp / (15 * z))));
            for (let mi = 0; mi < mCount; mi++) {
                const u  = (mi + 0.5) / mCount;
                const bx = cx + dx * u + cnx;
                const by = cy + dy * u + cny - wallH;
                // Front face of merlon
                ctx.fillStyle = c.side;
                ctx.beginPath();
                ctx.moveTo(bx - udx*mW, by - udy*mW);
                ctx.lineTo(bx + udx*mW, by + udy*mW);
                ctx.lineTo(bx + udx*mW, by + udy*mW - mH);
                ctx.lineTo(bx - udx*mW, by - udy*mW - mH);
                ctx.closePath();
                ctx.fill();
                // Top cap of merlon (visible depth)
                ctx.fillStyle = c.top;
                ctx.beginPath();
                ctx.moveTo(bx - udx*mW,          by - udy*mW - mH);
                ctx.lineTo(bx + udx*mW,          by + udy*mW - mH);
                ctx.lineTo(bx + udx*mW + inDX,   by + udy*mW + inDY - mH);
                ctx.lineTo(bx - udx*mW + inDX,   by - udy*mW + inDY - mH);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = c.shadow;
                ctx.lineWidth   = 0.4 * z;
                ctx.stroke();
            }
        };

        ctx.save();

        // ─── Pass 1: connector bridges (faqat >=2 devor bo'lsa) ──────────────
        if (!hasMultiple) {
            // Yolg'iz devor: faqat node blok va qayt
            for (const [, w] of wallSet) {
                const lv = w.level || 1;
                const c  = WALL_COLORS[Math.min(lv - 1, WALL_COLORS.length - 1)] || WALL_COLORS[0];
                const fp = this.getScreenFootprint(w.x, w.y, 1, 1);
                const cx = fp.cx, cy = fp.cy;
                const wallH = (8 + Math.min(lv, 10) * 3) * z;
                const nodeH = wallH + (lv >= 3 ? 3 : 1.5) * z;
                const nhw = hw * 0.48, nhh = hh * 0.48;
                ctx.fillStyle = c.shadow;
                ctx.beginPath();
                ctx.moveTo(cx-nhw,cy-nodeH); ctx.lineTo(cx,cy-nhh-nodeH); ctx.lineTo(cx,cy-nhh); ctx.lineTo(cx-nhw,cy); ctx.closePath(); ctx.fill();
                ctx.fillStyle = c.side;
                ctx.beginPath();
                ctx.moveTo(cx,cy-nhh-nodeH); ctx.lineTo(cx+nhw,cy-nodeH); ctx.lineTo(cx+nhw,cy); ctx.lineTo(cx,cy-nhh); ctx.closePath(); ctx.fill();
                ctx.fillStyle = c.top;
                ctx.beginPath();
                ctx.moveTo(cx,cy-nhh-nodeH); ctx.lineTo(cx+nhw,cy-nodeH); ctx.lineTo(cx,cy+nhh-nodeH); ctx.lineTo(cx-nhw,cy-nodeH); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
            return;
        }

        for (const [, w] of wallSet) {
            const lv = w.level || 1;
            const c  = { ...WALL_COLORS[Math.min(lv - 1, WALL_COLORS.length - 1)] || WALL_COLORS[0], _lv: lv };

            const fp  = this.getScreenFootprint(w.x, w.y, 1, 1);
            const cx  = fp.cx, cy = fp.cy;
            const wallH = (8 + Math.min(lv, 10) * 3) * z;

            const hasNW = wallSet.has(`${w.x-1},${w.y}`);
            const hasNE = wallSet.has(`${w.x},${w.y-1}`);

            // NW bridge (half, from cx toward NW midpoint)
            if (hasNW) {
                const nfp = this.getScreenFootprint(w.x - 1, w.y, 1, 1);
                const mx = (cx + nfp.cx) / 2, my = (cy + nfp.cy) / 2;
                const dx = nfp.cx - cx, dy = nfp.cy - cy;
                const perp = Math.sqrt(dx*dx + dy*dy);
                const cnx = -dy / perp * (3 * z);
                const cny =  dx / perp * (3 * z);

                // Top face
                ctx.beginPath();
                ctx.moveTo(cx+cnx, cy+cny-wallH); ctx.lineTo(mx+cnx, my+cny-wallH);
                ctx.lineTo(mx-cnx, my-cny-wallH); ctx.lineTo(cx-cnx, cy-cny-wallH);
                ctx.closePath();
                ctx.fillStyle = c.top;
                ctx.fill();

                // Front side face
                ctx.beginPath();
                ctx.moveTo(cx+cnx, cy+cny-wallH); ctx.lineTo(mx+cnx, my+cny-wallH);
                ctx.lineTo(mx+cnx, my+cny);       ctx.lineTo(cx+cnx, cy+cny);
                ctx.closePath();
                ctx.fillStyle = c.side;
                ctx.fill();
                ctx.strokeStyle = c.shadow; ctx.lineWidth = 0.6 * z; ctx.stroke();

                // Merlons on NW front edge
                _drawMerlons(cx, cy, mx, my, cnx, cny, dx, dy, perp, wallH, c);
            }

            // NE bridge (half, from cx toward NE midpoint)
            if (hasNE) {
                const nfp = this.getScreenFootprint(w.x, w.y - 1, 1, 1);
                const mx = (cx + nfp.cx) / 2, my = (cy + nfp.cy) / 2;
                const dx = nfp.cx - cx, dy = nfp.cy - cy;
                const perp = Math.sqrt(dx*dx + dy*dy);
                const cnx = -dy / perp * (3 * z);
                const cny =  dx / perp * (3 * z);

                // Top face
                ctx.beginPath();
                ctx.moveTo(cx+cnx, cy+cny-wallH); ctx.lineTo(mx+cnx, my+cny-wallH);
                ctx.lineTo(mx-cnx, my-cny-wallH); ctx.lineTo(cx-cnx, cy-cny-wallH);
                ctx.closePath();
                ctx.fillStyle = c.top;
                ctx.fill();

                // Shadow side face (NE facing = -cnx side)
                ctx.beginPath();
                ctx.moveTo(cx-cnx, cy-cny-wallH); ctx.lineTo(mx-cnx, my-cny-wallH);
                ctx.lineTo(mx-cnx, my-cny);       ctx.lineTo(cx-cnx, cy-cny);
                ctx.closePath();
                ctx.fillStyle = c.shadow;
                ctx.fill();
                ctx.strokeStyle = c.shadow; ctx.lineWidth = 0.6 * z; ctx.stroke();

                // Merlons on NE shadow edge (inward = +cnx direction)
                if (lv >= 2 && z > 0.35) {
                    const mH  = Math.min(5.5, (1.5 + lv * 0.38)) * z;
                    const mW  = (1.8 + lv * 0.07) * z;
                    const udx = dx / perp, udy = dy / perp;
                    const inDX = cnx * 0.6, inDY = cny * 0.6;  // NE: inward = +cnx
                    const mCount = Math.max(1, Math.min(3, Math.round(perp / (15 * z))));
                    for (let mi = 0; mi < mCount; mi++) {
                        const u  = (mi + 0.5) / mCount;
                        const bx = cx + dx*u - cnx;
                        const by = cy + dy*u - cny - wallH;
                        ctx.fillStyle = c.shadow;
                        ctx.beginPath();
                        ctx.moveTo(bx-udx*mW, by-udy*mW); ctx.lineTo(bx+udx*mW, by+udy*mW);
                        ctx.lineTo(bx+udx*mW, by+udy*mW-mH); ctx.lineTo(bx-udx*mW, by-udy*mW-mH);
                        ctx.closePath(); ctx.fill();
                        ctx.fillStyle = c.top;
                        ctx.beginPath();
                        ctx.moveTo(bx-udx*mW, by-udy*mW-mH); ctx.lineTo(bx+udx*mW, by+udy*mW-mH);
                        ctx.lineTo(bx+udx*mW+inDX, by+udy*mW+inDY-mH); ctx.lineTo(bx-udx*mW+inDX, by-udy*mW+inDY-mH);
                        ctx.closePath(); ctx.fill();
                        ctx.strokeStyle = c.shadow; ctx.lineWidth = 0.4*z; ctx.stroke();
                    }
                }
            }
        }

        // ─── Pass 2: wall node blocks (cover cx area, drawn over connectors) ─
        for (const [, w] of wallSet) {
            const lv  = w.level || 1;
            const c   = WALL_COLORS[Math.min(lv - 1, WALL_COLORS.length - 1)] || WALL_COLORS[0];
            const fp  = this.getScreenFootprint(w.x, w.y, 1, 1);
            const cx  = fp.cx, cy = fp.cy;
            const wallH  = (8 + Math.min(lv, 10) * 3) * z;
            const nodeH  = wallH + (lv >= 3 ? 3 : 1.5) * z;  // node slightly taller
            const nhw = hw * 0.48;   // node half-width
            const nhh = hh * 0.48;   // node half-height

            // Left (SW-facing) face — shadow
            ctx.fillStyle = c.shadow;
            ctx.beginPath();
            ctx.moveTo(cx - nhw, cy       - nodeH);
            ctx.lineTo(cx,       cy - nhh - nodeH);
            ctx.lineTo(cx,       cy - nhh);
            ctx.lineTo(cx - nhw, cy);
            ctx.closePath();
            ctx.fill();

            // Right (SE-facing) face — lit
            ctx.fillStyle = c.side;
            ctx.beginPath();
            ctx.moveTo(cx,       cy - nhh - nodeH);
            ctx.lineTo(cx + nhw, cy       - nodeH);
            ctx.lineTo(cx + nhw, cy);
            ctx.lineTo(cx,       cy - nhh);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.shadow; ctx.lineWidth = 0.7 * z; ctx.stroke();

            // Top face — diamond
            ctx.fillStyle = c.top;
            ctx.beginPath();
            ctx.moveTo(cx,       cy - nhh - nodeH);
            ctx.lineTo(cx + nhw, cy       - nodeH);
            ctx.lineTo(cx,       cy + nhh - nodeH);
            ctx.lineTo(cx - nhw, cy       - nodeH);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.shadow; ctx.lineWidth = 0.5 * z; ctx.stroke();

            // ── Corner merlons on node top (lv >= 3) ──────────────────────────
            if (lv >= 3 && z > 0.4) {
                const mH = Math.min(5, (1.5 + lv * 0.28)) * z;
                const mS = nhw * 0.32;  // merlon block size

                // Draw a small raised block at each of 4 diamond corners
                const nodeCorners = [
                    { x: cx,       y: cy - nhh - nodeH, sideCol: c.side,   topFaceSide: 'ne' }, // top vertex
                    { x: cx + nhw, y: cy       - nodeH, sideCol: c.side,   topFaceSide: 'se' }, // right vertex
                    { x: cx,       y: cy + nhh - nodeH, sideCol: c.side,   topFaceSide: 'sw' }, // bottom vertex
                    { x: cx - nhw, y: cy       - nodeH, sideCol: c.shadow, topFaceSide: 'nw' }, // left vertex
                ];

                for (const corner of nodeCorners) {
                    const px = corner.x, py = corner.y;

                    // SE-facing front face of corner merlon
                    ctx.fillStyle = corner.sideCol;
                    ctx.beginPath();
                    ctx.moveTo(px - mS, py + mS * 0.5);
                    ctx.lineTo(px + mS, py - mS * 0.5);
                    ctx.lineTo(px + mS, py - mS * 0.5 - mH);
                    ctx.lineTo(px - mS, py + mS * 0.5 - mH);
                    ctx.closePath();
                    ctx.fill();

                    // Top cap
                    ctx.fillStyle = c.top;
                    ctx.beginPath();
                    ctx.moveTo(px - mS, py + mS * 0.5 - mH);
                    ctx.lineTo(px + mS, py - mS * 0.5 - mH);
                    ctx.lineTo(px,      py - mS         - mH);
                    ctx.lineTo(px - mS * 2, py - mH);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = c.shadow; ctx.lineWidth = 0.4 * z; ctx.stroke();
                }
            }
        }

        // ── Pass 3: Wall damage cracks — battle rejimida low HP de vorlar ────────
        if (typeof Game !== 'undefined' && Game.mode === 'attack') {
            for (const [, w] of wallSet) {
                if (!w.maxHp || w.hp >= w.maxHp) continue;
                const hpRatio = w.hp / w.maxHp;
                if (hpRatio >= 0.75) continue;

                const fp  = this.getScreenFootprint(w.x, w.y, 1, 1);
                const lv  = w.level || 1;
                const nodeH = (8 + Math.min(lv, 10) * 3 + (lv >= 3 ? 3 : 1.5)) * z;

                // Crack overlay (devor ustiga)
                const crackAlpha = Math.min(1, (0.75 - hpRatio) / 0.5) * 0.85;
                const seed2 = w.x * 31 + w.y * 17;
                const rng2 = (n) => {
                    let s = seed2 * 1664525 + n * 1013904223;
                    return ((s & 0xfffff) / 0xfffff);
                };

                ctx.save();
                ctx.globalAlpha = crackAlpha;
                ctx.strokeStyle = 'rgba(30,10,5,0.8)';
                ctx.lineWidth = 0.8 * z;
                ctx.lineCap = 'round';

                // 2 ta devor yorig'i
                for (let ci = 0; ci < 2; ci++) {
                    const sx = fp.cx + (rng2(ci * 5) - 0.5) * hw * 0.6;
                    const sy = fp.cy - nodeH * (0.2 + rng2(ci * 5 + 1) * 0.6);
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + (rng2(ci * 5 + 2) - 0.5) * hw * 0.5,
                               sy + rng2(ci * 5 + 3) * nodeH * 0.4);
                    ctx.stroke();
                }

                // 25% HP da qizil olov uchqunlari
                if (hpRatio < 0.25) {
                    const sparkPhase = (Date.now() * 0.002 + seed2 * 0.5) % 1;
                    ctx.globalAlpha = (1 - sparkPhase) * 0.7;
                    ctx.fillStyle = '#ff6d00';
                    ctx.beginPath();
                    ctx.arc(fp.cx, fp.cy - nodeH * (0.3 + sparkPhase * 0.5), 1.5 * z, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        ctx.restore();
    },

    drawBuilding(ctx, b) {
        const bd = BUILDING_DATA[b.type];
        const fp = this.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
        const z = Camera.zoom;
        const bH = (14 + b.level * 4) * z;

        // Radius + selection highlight (Selected bo'lsa)
        const isSelected = InfoPanel.currentBuilding && InfoPanel.currentBuilding.id === b.id;
        if (isSelected) {
            const lv = bd.levels[b.level];

            // Selection glow — marching dashes around diamond
            const pulse = (Math.sin(Date.now() * 0.006) + 1) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(fp.top.x, fp.top.y - bH);
            ctx.lineTo(fp.right.x, fp.right.y - bH);
            ctx.lineTo(fp.right.x, fp.right.y);
            ctx.lineTo(fp.bottom.x, fp.bottom.y);
            ctx.lineTo(fp.left.x, fp.left.y);
            ctx.lineTo(fp.left.x, fp.left.y - bH);
            ctx.closePath();
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + pulse * 0.4})`;
            ctx.lineWidth = 1.5 * z;
            ctx.setLineDash([4 * z, 3 * z]);
            ctx.lineDashOffset = -Date.now() * 0.02 % (14 * z);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            if (lv && lv.range) {
                const rangePx = lv.range * Grid.TILE_W * z;
                ctx.beginPath();
                ctx.ellipse(fp.cx, fp.cy, rangePx, rangePx * (Grid.TILE_H / Grid.TILE_W), 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
                ctx.fill();
                ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + pulse * 0.2})`;
                ctx.lineWidth = 1 * z;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // ── Hover glow — CoC uslubida bino ustiga sichqon kelganida ────────────
        if (!isSelected && !BuildingManager.dragging && !BuildMenu.placing
            && typeof Game !== 'undefined' && Game.mode === 'home'
            && Input.mouse.tileX >= b.x && Input.mouse.tileX < b.x + bd.size[0]
            && Input.mouse.tileY >= b.y && Input.mouse.tileY < b.y + bd.size[1]) {
            const hp2 = (Math.sin(Date.now() * 0.005) + 1) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(fp.top.x, fp.top.y - bH);
            ctx.lineTo(fp.right.x, fp.right.y - bH);
            ctx.lineTo(fp.right.x, fp.right.y);
            ctx.lineTo(fp.bottom.x, fp.bottom.y);
            ctx.lineTo(fp.left.x, fp.left.y);
            ctx.lineTo(fp.left.x, fp.left.y - bH);
            ctx.closePath();
            // Outer glow (blur effect via shadow)
            ctx.shadowColor = 'rgba(255,255,255,0.8)';
            ctx.shadowBlur  = 10 * z;
            ctx.strokeStyle = `rgba(255,255,255,${0.5 + hp2 * 0.35})`;
            ctx.lineWidth = 2.2 * z;
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Soft inner fill
            ctx.fillStyle = `rgba(255,255,255,${0.035 + hp2 * 0.025})`;
            ctx.fill();
            ctx.restore();
        }

        // Upgrade complete glow (2 soniya yashil pulsing glow)
        if (b._upgradeGlow && Date.now() < b._upgradeGlow) {
            const t = (b._upgradeGlow - Date.now()) / 2000; // 1→0
            const glowAlpha = t * 0.6;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(fp.top.x, fp.top.y);
            ctx.lineTo(fp.right.x, fp.right.y);
            ctx.lineTo(fp.bottom.x, fp.bottom.y);
            ctx.lineTo(fp.left.x, fp.left.y);
            ctx.closePath();
            ctx.fillStyle = `rgba(76, 255, 128, ${glowAlpha})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(76, 255, 128, ${glowAlpha + 0.3})`;
            ctx.lineWidth = 2 * z;
            ctx.stroke();
            ctx.restore();
        } else if (b._upgradeGlow) {
            delete b._upgradeGlow; // cleanup
        }

        // Ekrandan tashqarida
        if (fp.cx < -120 || fp.cx > MapRenderer.canvas.width + 120 ||
            fp.cy < -120 || fp.cy > MapRenderer.canvas.height + 120) return;

        // ── Bino yer soyasi — CoC-uslubida isometrik shadow ──────────────────────
        if (!b.building) {
            const bd2 = BUILDING_DATA[b.type];
            const sw  = (fp.right.x - fp.left.x) * 0.72;  // Soya kengligi
            const sh  = sw * 0.28;                          // Soya balandligi (yassi ellips)
            const sx  = fp.cx - sw * 0.08;                  // Chap tomonga ofset (yorug'lik simulyatsiya)
            const sy  = fp.bottom.y + sh * 0.1;
            ctx.save();
            ctx.globalAlpha = b.building ? 0.0 : 0.18;
            const shadowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sw * 0.5);
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
            shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0.35)');
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.ellipse(sx, sy, sw * 0.5, sh * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Qurilish skafold — bino yarmi tayyorida yog'och to'siq
        if (b.building) {
            this._drawScaffold(ctx, fp, z, b.timerId ? timerManager.getProgress(b.timerId) : 0);
        }

        const img = this.getBuildingImage(b.type, b.level);
        ctx.globalAlpha = b.building ? 0.55 : 1.0;

        // ── Hit shudder — zarar olganida larzaga tushish ────────────────────────
        let shudderX = 0, shudderY = 0;
        if (b._hitTime && typeof Game !== 'undefined' && Game.mode === 'attack') {
            const hitAge = Date.now() - b._hitTime;
            const SHUD_DUR = 160;
            if (hitAge < SHUD_DUR) {
                // Tez-tez titrash: 4 ta yarim davrli sin
                const st = hitAge / SHUD_DUR;
                const amp = (1 - st) * 2.5 * z;
                shudderX = Math.sin(st * Math.PI * 4) * amp;
                shudderY = Math.sin(st * Math.PI * 3 + 0.5) * amp * 0.5;
            }
        }
        if (shudderX !== 0 || shudderY !== 0) {
            ctx.save();
            ctx.translate(shudderX, shudderY);
        }

        // Tap "pop" scale (CoC-style bounce on click)
        let tapScale = 1;
        if (b._tapTime) {
            const age = Date.now() - b._tapTime;
            if (age < 320) {
                // Elastic bounce: 1→1.15→1 over 320ms
                const t = age / 320;
                tapScale = 1 + 0.15 * Math.sin(t * Math.PI) * Math.exp(-t * 3);
            } else {
                delete b._tapTime;
            }
        }

        // ── Construction complete bounce — qurilish tugaganda CoC-style sakrash ──
        // Bino birinchi marta yoki upgrade tugaganda: pastdan 18px tushib, tepaga 8px
        // sakrab, so'ng normal holatga keladi (600ms, elastic)
        let bounceOffsetY = 0;
        if (b._placeBounce) {
            const ba = Date.now() - b._placeBounce;
            const BD = 600; // ms
            if (ba < BD) {
                const bt = ba / BD;
                // Phase 1 (0–0.35): pastga tushish (bino "yerga tushadi")
                // Phase 2 (0.35–1.0): tepaga sakrab keyin damf-spring
                if (bt < 0.35) {
                    bounceOffsetY = Math.sin(bt / 0.35 * Math.PI) * 14 * z;
                } else {
                    const bt2 = (bt - 0.35) / 0.65;
                    bounceOffsetY = -Math.sin(bt2 * Math.PI) * 8 * z * Math.exp(-bt2 * 3);
                }
                // Hafif squash-stretch: pastga tushganda kengayib, sakraganida torayadi
                const squash = bt < 0.35
                    ? 1 + Math.sin(bt / 0.35 * Math.PI) * 0.08
                    : 1 - Math.sin(((bt-0.35)/0.65) * Math.PI) * 0.05;
                if (Math.abs(squash - 1) > 0.001) tapScale = tapScale * squash;
            } else {
                delete b._placeBounce;
            }
        }

        // ── Tap reveal ring — CoC-style kengayuvchi halqa ──────────────────────
        if (b._tapTime || (isSelected && !b._tapRevealDone)) {
            const tapAgeRing = b._tapTime ? Date.now() - b._tapTime : 0;
            if (tapAgeRing < 450) {
                const rt = tapAgeRing / 450;
                const rRx = (fp.right.x - fp.left.x) * (0.5 + rt * 0.8);
                const rRy = (fp.bottom.y - fp.top.y) * (0.28 + rt * 0.45);
                const rAlpha = (1 - rt) * 0.55;
                ctx.save();
                ctx.globalAlpha = rAlpha;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth   = (3 - rt * 2.5) * z;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur  = 8 * z * (1 - rt);
                ctx.beginPath();
                ctx.ellipse(fp.cx, fp.cy, rRx, rRy, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        const drawCx = fp.cx;
        const drawBy = fp.bottom.y;

        if (img) {
            const scale   = (bd.imageScale || 1.4) * tapScale;
            const offsetY = bd.imageOffsetY || 10;
            const baseW   = fp.right.x - fp.left.x;
            const iw      = baseW * scale;
            const ih      = iw * (img.height / img.width);
            const oy      = offsetY * z;
            ctx.drawImage(img, drawCx - iw/2, drawBy - ih + oy + bounceOffsetY, iw, ih);
        } else {
            const cachedCanvas = this._getCachedProcedural(b.type, z, bH, b.level || 1);
            if (cachedCanvas) {
                if (tapScale !== 1 || bounceOffsetY !== 0) {
                    // Scale + bounce around bottom center
                    ctx.save();
                    ctx.translate(drawCx, drawBy + bounceOffsetY);
                    ctx.scale(tapScale, tapScale);
                    ctx.drawImage(cachedCanvas, -cachedCanvas.width/2, -cachedCanvas.height);
                    ctx.restore();
                } else {
                    ctx.drawImage(cachedCanvas, drawCx - cachedCanvas.width/2, drawBy - cachedCanvas.height);
                }
            }
        }
        ctx.globalAlpha = 1;

        // ── Idle animations — uy rejimida jonli ko'rinish (CoC-style) ──────────
        if (!b.building && typeof Game !== 'undefined' && Game.mode === 'home' && z > 0.4) {
            this._drawIdleAnimation(ctx, b, fp, z, bH);
        }

        // ── Damage state — zarar darajasiga qarab tutun/olov (CoC-style) ──────
        if (!b.building && b.hp > 0 && b.hp < b.maxHp
            && typeof Game !== 'undefined' && Game.mode === 'attack') {
            this._drawDamageState(ctx, b, fp, z, bH);
        }

        // ── Bino hit flash — zarar olganida qizil chaqnash (CoC-style) ─────────
        if (b._hitTime && typeof Game !== 'undefined' && Game.mode === 'attack') {
            const hitAge = Date.now() - b._hitTime;
            const HIT_DUR = 200;
            if (hitAge < HIT_DUR) {
                const fa = (1 - hitAge / HIT_DUR) * 0.55;
                ctx.save();
                ctx.globalAlpha = fa;
                ctx.fillStyle = '#ff1744';
                // Bino ustini to'ldirish (footprint diamond)
                ctx.beginPath();
                ctx.moveTo(fp.top.x, fp.top.y - bH);
                ctx.lineTo(fp.right.x, fp.right.y - bH);
                ctx.lineTo(fp.bottom.x, fp.bottom.y - bH);
                ctx.lineTo(fp.left.x, fp.left.y - bH);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (hitAge >= HIT_DUR) {
                delete b._hitTime;
            }
        }

        // ── Mudofaa barrel rotation — jang paytida nishonga burilish (CoC-style) ─
        if (bd.category === 'mudofaa' && !b.building && b.hp > 0
            && typeof Game !== 'undefined' && Game.mode === 'attack'
            && !['spikeTrap','alchemicalTrap','poisonTrap','militia','praetorium',
                 'magicTower','infernoColumn',
                 'legatusStatue','aquiliferStatue','praetoranStatue','imperatriceStatue'].includes(b.type)) {
            this._drawDefenseBarrel(ctx, b, bd, fp, z);
        }

        // ── Night ambient glow — kechasi binolar issiq yorug'lik chiqaradi (CoC-style) ──
        if (!b.building && typeof MapRenderer !== 'undefined'
            && typeof Game !== 'undefined' && Game.mode === 'home' && z > 0.35) {
            const sky = MapRenderer.getSkyAlpha?.();
            if (sky && (sky.phase === 'night' || sky.phase === 'eve') && sky.dark > 0.25) {
                const t = Date.now() * 0.0008;
                const pulse = 0.85 + Math.sin(t + (b.x * 3.7 + b.y * 2.1)) * 0.15;
                const lightAlpha = sky.dark * 0.22 * pulse;
                const isRes = ['villa','farm','treeOfLife','goldStorage','foodStorage',
                               'goldenAppleStorage','gemMine','builderHut'].includes(b.type);
                const isBarracks = ['barracks','archerTower','musterGround','spellFactory'].includes(b.type);
                let r, g, bl;
                if (isRes)      { r = 255; g = 190; bl = 60; }
                else if (isBarracks) { r = 100; g = 180; bl = 255; }
                else             { r = 220; g = 160; bl = 80; }
                const glowR = (fp.right.x - fp.left.x) * 0.9;
                const cx2 = fp.cx, cy2 = fp.cy - bH * 0.25;
                const grd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, glowR);
                grd.addColorStop(0, `rgba(${r},${g},${bl},${lightAlpha})`);
                grd.addColorStop(0.5, `rgba(${r},${g},${bl},${lightAlpha * 0.4})`);
                grd.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath();
                ctx.ellipse(cx2, cy2, glowR, glowR * 0.52, 0, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();
                ctx.restore();
            }
        }

        // ── Storage overflow shimmer — omborlar to'lganda ogohlantirish (CoC-style) ──
        if (!b.building && typeof Game !== 'undefined' && Game.mode === 'home'
            && typeof Resources !== 'undefined') {
            let overflowType = null;
            if (b.type === 'goldStorage') overflowType = 'gold';
            else if (b.type === 'foodStorage') overflowType = 'food';
            else if (b.type === 'goldenAppleStorage') overflowType = 'goldenApple';

            if (overflowType) {
                const cap   = Resources.getCapacity(overflowType);
                const cur   = Resources.get(overflowType);
                const ratio = cap > 0 ? cur / cap : 0;

                if (ratio >= 0.85) {
                    const now3  = Date.now();
                    const isFull = ratio >= 1.0;
                    // Pulse hızı: to'la bo'lsa tezroq
                    const pFreq  = isFull ? 0.012 : 0.006;
                    const pulse3 = (Math.sin(now3 * pFreq) + 1) / 2;
                    // Intensity: 85%→90% qizg'ish, 90%→100% to'q qizil
                    const intensity = Math.min(1, (ratio - 0.85) / 0.15);
                    const r3 = isFull ? 244 : Math.round(255 - intensity * 30);
                    const g3 = isFull ? 67  : Math.round(180 - intensity * 130);
                    const b3 = isFull ? 54  : 20;
                    const baseAlpha = 0.12 + intensity * 0.18 + pulse3 * (isFull ? 0.22 : 0.12);

                    ctx.save();
                    // Tashqi shimmer halo
                    const glowW = (fp.right.x - fp.left.x) * 0.82;
                    const glowH = (fp.bottom.y - fp.top.y) * 0.45 + bH * 0.3;
                    const ovGrd = ctx.createRadialGradient(fp.cx, fp.cy - bH*0.2, 0,
                                                           fp.cx, fp.cy - bH*0.2, glowW * 0.7);
                    ovGrd.addColorStop(0,   `rgba(${r3},${g3},${b3},${baseAlpha})`);
                    ovGrd.addColorStop(0.5, `rgba(${r3},${g3},${b3},${baseAlpha * 0.45})`);
                    ovGrd.addColorStop(1,   `rgba(${r3},${g3},${b3},0)`);
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = ovGrd;
                    ctx.beginPath();
                    ctx.ellipse(fp.cx, fp.cy - bH*0.2, glowW*0.7, glowH*0.55, 0, 0, Math.PI*2);
                    ctx.fill();

                    // Tashqi kontur — "yanayotgan" qizil aylana
                    if (isFull) {
                        ctx.strokeStyle = `rgba(${r3},${g3},${b3},${0.55 + pulse3*0.35})`;
                        ctx.lineWidth   = 1.8 * z;
                        ctx.setLineDash([4*z, 3*z]);
                        ctx.lineDashOffset = -now3 * 0.025 % (14*z);
                        ctx.beginPath();
                        ctx.moveTo(fp.top.x,    fp.top.y - bH * 0.5);
                        ctx.lineTo(fp.right.x,  fp.right.y - bH * 0.5);
                        ctx.lineTo(fp.bottom.x, fp.bottom.y - bH * 0.5);
                        ctx.lineTo(fp.left.x,   fp.left.y - bH * 0.5);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }

                    // Kichik "FULL" yoki "85%" yozuvi yuqorida
                    if (z > 0.45) {
                        const label = isFull ? '⚠ FULL' : `⚠ ${Math.round(ratio*100)}%`;
                        const lx = fp.cx;
                        const ly = fp.top.y - bH - 14 * z;
                        const lAlpha = 0.65 + pulse3 * 0.3;
                        ctx.globalAlpha = lAlpha;
                        ctx.font        = `bold ${Math.max(7, 8.5*z)}px Inter,sans-serif`;
                        ctx.textAlign    = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle   = isFull ? `rgb(${r3},${g3},${b3})` : '#ff9800';
                        ctx.shadowColor  = isFull ? 'rgba(244,67,54,0.7)' : 'rgba(255,150,0,0.6)';
                        ctx.shadowBlur   = 4 * z;
                        ctx.fillText(label, lx, ly);
                        ctx.shadowBlur   = 0;
                    }
                    ctx.restore();
                }
            }
        }

        // ── Storage fill bar — goldStorage/foodStorage uchun CoC-style fill % ──
        // Har doim home modeda ko'rsatiladi (overflow yoki yo'q farqi yo'q)
        if (!b.building && typeof Game !== 'undefined' && Game.mode === 'home'
            && typeof Resources !== 'undefined' && z > 0.42) {
            let storeFillType = null;
            let barColor1, barColor2;
            if (b.type === 'goldStorage') {
                storeFillType = 'gold'; barColor1 = '#d4af37'; barColor2 = '#ffd700';
            } else if (b.type === 'foodStorage') {
                storeFillType = 'food'; barColor1 = '#43a047'; barColor2 = '#76c442';
            } else if (b.type === 'goldenAppleStorage') {
                storeFillType = 'goldenApple'; barColor1 = '#2e7d32'; barColor2 = '#4caf50';
            }
            if (storeFillType) {
                const cap  = Resources.getCapacity(storeFillType);
                const cur  = Resources.get(storeFillType);
                const pct  = cap > 0 ? Math.min(1, cur / cap) : 0;
                const bw   = (fp.right.x - fp.left.x) * 0.72;
                const bx0  = fp.cx - bw / 2;
                const by0  = fp.bottom.y + 3 * z; // Below building base
                const barH = Math.max(3, 3.5 * z);
                const rr   = barH / 2;

                // Background track
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(bx0, by0, bw, barH, rr) : ctx.rect(bx0, by0, bw, barH);
                ctx.fill();

                // Fill
                if (pct > 0) {
                    const grd = ctx.createLinearGradient(bx0, 0, bx0 + bw, 0);
                    grd.addColorStop(0, barColor1);
                    grd.addColorStop(1, barColor2);
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.roundRect ? ctx.roundRect(bx0, by0, bw * pct, barH, rr) : ctx.rect(bx0, by0, bw * pct, barH);
                    ctx.fill();
                }

                // Percentage text (only when zoom is big enough)
                if (z > 0.65) {
                    ctx.fillStyle = pct >= 0.95 ? '#f44336' : pct >= 0.8 ? '#ff9800' : '#ccc';
                    ctx.font        = `bold ${Math.max(6, 7*z)}px Inter,sans-serif`;
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${Math.round(pct * 100)}%`, fp.cx, by0 + barH + 5 * z);
                }
            }
        }

        // ── Praetorium stored troops badge — CoC Clan Castle uslubida ──────────
        if (!b.building && b.type === 'praetorium'
            && typeof Game !== 'undefined' && Game.mode === 'home' && z > 0.42) {
            const praeLvData = (typeof BUILDING_DATA !== 'undefined' && BUILDING_DATA.praetorium?.levels)
                ? (BUILDING_DATA.praetorium.levels[b.level] || {}) : {};
            const praeCap    = praeLvData.capacity || 10;
            const praeStored = b._storedTroops || 0;
            const praePct    = praeCap > 0 ? praeStored / praeCap : 0;

            // Badge fon rengi — to'liq:oltin, qisman:yashil, bo'sh:kulrang
            let bgCol, fgCol;
            if (praeStored === 0) {
                bgCol = 'rgba(55,65,81,0.88)'; fgCol = '#9e9e9e';
            } else if (praePct >= 1) {
                bgCol = 'rgba(255,160,0,0.92)'; fgCol = '#fff';
            } else {
                bgCol = 'rgba(30,100,50,0.90)';  fgCol = '#a5d6a7';
            }

            const label   = praeStored === 0 ? '⚔ —' : `⚔ ${praeStored}/${praeCap}`;
            const fSize   = Math.max(7, 8 * z);
            ctx.font      = `bold ${fSize}px Inter,sans-serif`;
            const tw      = ctx.measureText(label).width;
            const padX    = 4 * z;
            const padY    = 2.5 * z;
            const bw      = tw + padX * 2;
            const bh      = fSize + padY * 2;
            const bx0     = fp.cx - bw / 2;
            const by0     = fp.top.y - bH - bh - 4 * z;
            const rr      = bh / 2;

            ctx.save();
            // Pill fon
            ctx.fillStyle = bgCol;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(bx0, by0, bw, bh, rr)
                          : ctx.rect(bx0, by0, bw, bh);
            ctx.fill();

            // Shimmer border agar to'liq bo'lsa
            if (praePct >= 1) {
                const pulse = (Math.sin(Date.now() * 0.006) + 1) / 2;
                ctx.strokeStyle = `rgba(255,220,50,${0.5 + pulse * 0.5})`;
                ctx.lineWidth   = 1.2 * z;
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(bx0, by0, bw, bh, rr)
                              : ctx.rect(bx0, by0, bw, bh);
                ctx.stroke();
            }

            // Matn
            ctx.fillStyle    = fgCol;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, fp.cx, by0 + bh / 2);
            ctx.restore();
        }

        // HP bar (bino zararlanganda ko'rsatish) — CoC style
        if (!b.building && b.hp < b.maxHp) {
            const hpRatio = Math.max(0, b.hp / b.maxHp);
            const bw  = (fp.right.x - fp.left.x) * 0.75;
            const bx0 = fp.cx - bw / 2;
            const by0 = fp.top.y - bH - 9 * z;
            const barH = Math.max(3, 4 * z);
            const rr   = barH / 2;

            // Shadow border
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.beginPath();
            ctx.roundRect?.(bx0 - 0.5, by0 - 0.5, bw + 1, barH + 1, rr + 0.5) ||
                ctx.rect(bx0 - 0.5, by0 - 0.5, bw + 1, barH + 1);
            ctx.fill();

            // Track
            ctx.fillStyle = '#263238';
            ctx.beginPath();
            ctx.roundRect?.(bx0, by0, bw, barH, rr) || ctx.rect(bx0, by0, bw, barH);
            ctx.fill();

            // Fill
            let hpCol;
            if (hpRatio > 0.6)      hpCol = '#4caf50';
            else if (hpRatio > 0.3) hpCol = '#ff9800';
            else {
                const pulse = (Math.sin(Date.now() * 0.012) + 1) / 2;
                hpCol = `rgb(${Math.round(200 + pulse*55)}, 30, 30)`;
            }
            ctx.fillStyle = hpCol;
            const fillW = Math.max(0, bw * hpRatio);
            if (fillW > 0) {
                ctx.beginPath();
                ctx.roundRect?.(bx0, by0, fillW, barH, rr) || ctx.rect(bx0, by0, fillW, barH);
                ctx.fill();
                // Shine
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(bx0 + rr, by0, Math.max(0, fillW - rr*2), barH * 0.4);
            }

            // Crack overlay — damage show
            if (hpRatio < 0.65) {
                this._drawCracks(ctx, fp, hpRatio, b.id);
            }

            // Critical HP — qizil miltillash effekti
            if (hpRatio < 0.25) {
                const flash = (Math.sin(Date.now() * 0.008) + 1) / 2 * 0.35;
                ctx.fillStyle = `rgba(244,67,54,${flash})`;
                ctx.beginPath();
                ctx.moveTo(fp.top.x, fp.top.y);
                ctx.lineTo(fp.right.x, fp.right.y);
                ctx.lineTo(fp.bottom.x, fp.bottom.y);
                ctx.lineTo(fp.left.x, fp.left.y);
                ctx.closePath();
                ctx.fill();
            }
        }

        // ── Level badge — CoC-style (rang daraja boyicha) ─────────────────────
        // Devorlar uchun level badge ko'rsatmaymiz — ular to'siq, binoda emas
        if (!b.building && z > 0.38 && b.type !== 'wall' && b.type !== 'gate') {
            const isMaxLevel = !bd.levels[b.level + 1];
            const lv2    = b.level || 1;
            const bx2    = fp.right.x - 5 * z;
            const by2    = fp.right.y - bH + 2 * z;
            const br2    = Math.max(5, 7.5 * z);

            ctx.save();

            // Soya (depth effect)
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath();
            ctx.arc(bx2 + 0.8 * z, by2 + 0.8 * z, br2, 0, Math.PI * 2);
            ctx.fill();

            // Fon rangi — daraja boyicha
            let badgeColor1, badgeColor2;
            if (isMaxLevel) {
                badgeColor1 = '#d4a017'; badgeColor2 = '#8b6914';  // Oltin (max level)
            } else if (lv2 >= 9) {
                badgeColor1 = '#9c27b0'; badgeColor2 = '#5a0080';  // Binafsha (ultra high)
            } else if (lv2 >= 7) {
                badgeColor1 = '#1565c0'; badgeColor2 = '#0a3d7a';  // Ko'k (high)
            } else if (lv2 >= 5) {
                badgeColor1 = '#1b5e20'; badgeColor2 = '#0a3010';  // Yashil (mid)
            } else if (lv2 >= 3) {
                badgeColor1 = '#4e342e'; badgeColor2 = '#2e1a0e';  // Jigarrang (low)
            } else {
                badgeColor1 = '#263238'; badgeColor2 = '#1a2326';  // Kulrang (1-2)
            }

            // Radial gradient badge fon
            const bg = ctx.createRadialGradient(bx2 - br2*0.25, by2 - br2*0.2, 0, bx2, by2, br2);
            bg.addColorStop(0, badgeColor1 + 'ee');
            bg.addColorStop(1, badgeColor2 + 'ee');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(bx2, by2, br2, 0, Math.PI * 2);
            ctx.fill();

            // Chegarasi
            ctx.strokeStyle = isMaxLevel ? 'rgba(255,220,80,0.85)' : 'rgba(255,255,255,0.35)';
            ctx.lineWidth   = 0.9 * z;
            ctx.stroke();

            // Shine (yuqori-chap)
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.arc(bx2 - br2*0.22, by2 - br2*0.22, br2 * 0.55, 0, Math.PI * 2);
            ctx.fill();

            // Matn — daraja yoki yulduz
            ctx.fillStyle = isMaxLevel ? '#ffe082' : '#ffffff';
            if (isMaxLevel) {
                ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 4 * z;
            }
            ctx.font = `bold ${Math.max(6, 8 * z)}px Inter,sans-serif`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isMaxLevel ? '★' : String(lv2), bx2, by2 + 0.4 * z);
            ctx.shadowBlur = 0;

            ctx.restore();
        }

        // ── Spell Factory — binafsha mana aura + aylanuvchi runlar ────────────
        if (b.type === 'spellFactory' && !b.building) {
            const now = Date.now();
            const sp2 = (Math.sin(now * 0.0045) + 1) / 2;
            ctx.save();
            // Pulsing binafsha halo
            ctx.globalAlpha = 0.35 + sp2 * 0.2;
            const sfHaloGrad = ctx.createRadialGradient(fp.cx, fp.cy, 0, fp.cx, fp.cy, (fp.right.x - fp.left.x) * 0.7);
            sfHaloGrad.addColorStop(0,   `rgba(150,0,255,${0.25 + sp2*0.15})`);
            sfHaloGrad.addColorStop(0.5, `rgba(100,0,200,${0.12 + sp2*0.08})`);
            sfHaloGrad.addColorStop(1,   'rgba(80,0,180,0)');
            ctx.fillStyle   = sfHaloGrad;
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.cy, (fp.right.x - fp.left.x) * 0.7, (fp.bottom.y - fp.top.y) * 0.42, 0, 0, Math.PI * 2);
            ctx.fill();
            // 4 ta aylanuvchi runa zarrachasi
            if (z > 0.5) {
                const runeSymbols = ['✦','✧','⋆','✴'];
                for (let ri = 0; ri < 4; ri++) {
                    const ra = (ri / 4) * Math.PI * 2 + now * 0.0022;
                    const rrx = (fp.right.x - fp.left.x) * 0.52;
                    const rry = (fp.bottom.y - fp.top.y) * 0.30;
                    const rpx = fp.cx + Math.cos(ra) * rrx;
                    const rpy = fp.cy + Math.sin(ra) * rry;
                    ctx.globalAlpha = (0.5 + sp2 * 0.35) * 0.85;
                    ctx.fillStyle = `rgba(${180 + ri*15},0,255,0.9)`;
                    ctx.font = `${Math.max(7, 8*z)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(runeSymbols[ri], rpx, rpy);
                }
            }
            ctx.restore();
        }

        // ── Blacksmith (Temirchi) — to'q sariq olov uchqunlari ────────────────
        if (b.type === 'blacksmith' && !b.building && Math.random() < 0.04) {
            const sfx = fp.cx + (Math.random() - 0.5) * (fp.right.x - fp.left.x) * 0.5;
            const sfy = fp.top.y - bH - (4 + Math.random() * 8) * z;
            ctx.save();
            ctx.globalAlpha = 0.7 + Math.random() * 0.25;
            ctx.fillStyle = Math.random() > 0.3 ? '#ffca28' : '#ff8f00';
            ctx.shadowColor = '#ffca28';
            ctx.shadowBlur  = 4 * z;
            ctx.beginPath();
            ctx.arc(sfx, sfy, (1 + Math.random() * 1.5) * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Legion Forum — ko'k energiya aura ─────────────────────────────────
        if (b.type === 'legionForum' && !b.building) {
            const now = Date.now();
            const lp  = (Math.sin(now * 0.003) + 1) / 2;
            ctx.save();
            ctx.globalAlpha = 0.2 + lp * 0.12;
            const lfGrad = ctx.createRadialGradient(fp.cx, fp.cy, 0, fp.cx, fp.cy, (fp.right.x - fp.left.x) * 0.6);
            lfGrad.addColorStop(0,   `rgba(63,81,181,${0.3 + lp*0.2})`);
            lfGrad.addColorStop(0.7, `rgba(63,81,181,${0.1 + lp*0.08})`);
            lfGrad.addColorStop(1,   'rgba(63,81,181,0)');
            ctx.fillStyle = lfGrad;
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.cy, (fp.right.x - fp.left.x) * 0.6, (fp.bottom.y - fp.top.y) * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Magic Tower — sehrli energiya aura
        if (b.type === 'magicTower' && !b.building && b.hp > 0 && typeof Game !== 'undefined' && Game.mode === 'attack') {
            const now = Date.now();
            const mp = (Math.sin(now * 0.006) + 1) / 2;
            ctx.save();
            // Binafsha energiya halqasi
            ctx.strokeStyle = `rgba(180,0,255,${0.3 + mp * 0.25})`;
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.cy, (fp.right.x - fp.left.x) * 0.6, (fp.bottom.y - fp.top.y) * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Aylanuvchi sehrli zarrachalar
            if (z > 0.6) {
                for (let mi = 0; mi < 3; mi++) {
                    const ang = (mi / 3) * Math.PI * 2 + now * 0.004;
                    const rx = (fp.right.x - fp.left.x) * 0.55;
                    const ry = (fp.bottom.y - fp.top.y) * 0.32;
                    const px = fp.cx + Math.cos(ang) * rx;
                    const py = fp.cy + Math.sin(ang) * ry;
                    ctx.fillStyle = `rgba(${180 + mi * 20},0,255,${0.7 + mp * 0.2})`;
                    ctx.beginPath();
                    ctx.arc(px, py, (1.5 + mp) * z, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // ── Battle: mudofaa bino "armed" base glow — aktiv qo'riqlash ────────────
        if (bd.category === 'mudofaa' && !b.building && b.hp > 0
            && typeof Game !== 'undefined' && Game.mode === 'attack'
            && b.type !== 'magicTower') { // magicTower o'z animatsiyasiga ega
            const now = Date.now();
            const dp  = (Math.sin(now * 0.003) + 1) / 2;
            const defColor = b.type === 'flamingCitadel' ? 'rgba(255,80,0,'
                           : b.type === 'tormenta'       ? 'rgba(80,160,255,'
                           : b.type === 'scorpio'         ? 'rgba(255,220,50,'
                           : b.type === 'infernoColumn'   ? 'rgba(255,120,0,'
                           :                               'rgba(100,180,255,';
            ctx.save();
            // Tashqi aura halqa
            ctx.strokeStyle = `${defColor}${0.2 + dp * 0.18})`;
            ctx.lineWidth   = 1.5 * z;
            ctx.shadowColor = `${defColor}0.6)`;
            ctx.shadowBlur  = 8 * z;
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.cy,
                        (fp.right.x - fp.left.x) * 0.55,
                        (fp.bottom.y - fp.top.y) * 0.32,
                        0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // infernoColumn — aktiv olov
        if (b.type === 'infernoColumn' && !b.building && b.hp > 0 && typeof Game !== 'undefined' && Game.mode === 'attack') {
            const now = Date.now();
            const ip = (Math.sin(now * 0.012) + 1) / 2;
            const charge = b._infernoCharge || 1.0;
            const cr = Math.min(1, (charge - 1) / 3);
            ctx.save();
            ctx.globalAlpha = 0.4 + ip * 0.25;
            const r3 = Math.round(255);
            const g4 = Math.round(180 - cr * 150);
            ctx.fillStyle = `rgb(${r3},${g4},30)`;
            ctx.font = `${Math.max(8, 10 * z)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌋', fp.cx, fp.top.y - bH - 6 * z + ip * 2 * z - ip * 2 * z);
            ctx.restore();
        }

        // Damage smoke — HP < 50% va > 0
        if (!b.building && b.hp > 0 && b.hp < b.maxHp * 0.5) {
            this._drawDamageSmoke(ctx, fp, b.hp / b.maxHp, b.id);
        }

        // Qurilish progress va Quruvchi (Architect)
        if (b.building && b.timerId) {
            this._drawArchitect(ctx, fp, z);
            this._drawConstructionSparkles(ctx, fp, z);

            const prog = timerManager.getProgress(b.timerId);
            const rem = timerManager.getRemaining(b.timerId);
            const bw = (fp.right.x - fp.left.x) * 0.6;
            const by2 = fp.bottom.y + 4*z;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(fp.cx - bw/2, by2, bw, 4*z);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(fp.cx - bw/2, by2, bw*prog, 4*z);
            ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(8,10*z)}px Inter,sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(Helpers.formatTime(rem), fp.cx, by2 + 14*z);
        }

        // GemMine bubble — storedDiamond >= 1 bo'lganda ko'rsatiladi
        if (b.type === 'gemMine' && !b.building && (b.storedDiamond || 0) >= 1) {
            const gemStored = Math.floor(b.storedDiamond);
            const gemLv = BUILDING_DATA.gemMine.levels[b.level] || {};
            const isFull = gemStored >= (gemLv.capacity || 12);
            const ry = fp.top.y - bH - 22*z + Math.sin(Date.now()*0.004)*4*z;
            const bw = 32*z;
            // Pulsing ring when full
            if (isFull) {
                const pulse = 0.5 + Math.abs(Math.sin(Date.now() * 0.003)) * 0.5;
                ctx.save();
                ctx.strokeStyle = `rgba(126,206,242,${pulse})`;
                ctx.lineWidth = 2.5*z;
                ctx.beginPath();
                ctx.arc(fp.cx, ry, bw/2 + 5*z, 0, Math.PI*2);
                ctx.stroke();
                ctx.restore();
            }
            ctx.fillStyle = isFull ? 'rgba(126,206,242,0.95)' : 'rgba(255,255,255,0.88)';
            ctx.beginPath();
            ctx.arc(fp.cx, ry, bw/2, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = isFull ? '#7ecef2' : 'rgba(126,206,242,0.5)';
            ctx.lineWidth = 2*z;
            ctx.stroke();
            ctx.font = `${Math.max(14,18*z)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💎', fp.cx, ry);
            if (gemStored > 1) {
                ctx.fillStyle = '#003';
                ctx.font = `bold ${Math.max(7,8*z)}px Inter,sans-serif`;
                ctx.fillText(gemStored, fp.cx + 9*z, ry - 9*z);
            }
        }

        // Resurs ko'rsatkichi (Bubble style) — CoC uslubida
        if (!b.building && b.type !== 'gemMine' && b.storedResource >= 5) {
            let ri = b.type === 'villa' ? '🪙' : b.type === 'farm' ? '🍎' : b.type === 'treeOfLife' ? '🍏' : '';
            if (ri) {
                const lv = BUILDING_DATA[b.type]?.levels[b.level];
                const cap = lv?.capacity || 99999;
                const stored = Math.floor(b.storedResource);
                const isFull = stored >= cap;
                const time = Date.now();
                const float = Math.sin(time * 0.005) * 4 * z;
                const ry = fp.top.y - bH - 22*z + float;
                const bw = isFull ? 34*z : 30*z;

                // Pulsing glow when full
                if (isFull) {
                    const pulse = 0.4 + Math.abs(Math.sin(time * 0.004)) * 0.4;
                    ctx.save();
                    ctx.shadowColor = '#ffd700';
                    ctx.shadowBlur  = 8 * z;
                    ctx.strokeStyle = `rgba(255,215,0,${pulse})`;
                    ctx.lineWidth = 3*z;
                    ctx.beginPath();
                    ctx.arc(fp.cx, ry, bw/2 + 5*z, 0, Math.PI*2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.restore();

                    // Tanga zarrachalari — 5 ta kichik tanga floating up
                    const coinCount = 5;
                    for (let ci = 0; ci < coinCount; ci++) {
                        const seed  = (b.x * 7 + b.y * 13 + ci * 997) & 0xffff;
                        const rng2  = (n) => { const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return v - Math.floor(v); };
                        const phase = rng2(0) * Math.PI * 2;                // har tanga uchun boshlang'ich
                        const spd   = 0.0018 + rng2(1) * 0.0012;            // yuqoriga tezlik
                        const ox    = (rng2(2) - 0.5) * 18 * z;             // gorizontal ofset
                        const cycle = ((time * spd + phase) % (Math.PI * 2));
                        const yOff  = -Math.sin(cycle) * 18 * z;
                        const alpha = Math.max(0, Math.sin(cycle)) * 0.9;
                        if (alpha < 0.05) continue;
                        ctx.save();
                        ctx.globalAlpha = alpha;
                        const coinSize = (2 + rng2(3) * 1.5) * z;
                        ctx.fillStyle = b.type === 'farm' ? '#a5d6a7' : '#ffd700';
                        ctx.strokeStyle = b.type === 'farm' ? '#388e3c' : '#f9a825';
                        ctx.lineWidth = 0.6 * z;
                        ctx.beginPath();
                        ctx.ellipse(fp.cx + ox, ry - bw/2 + yOff - 4*z, coinSize, coinSize * 0.7, 0, 0, Math.PI*2);
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    }
                }

                // Pufakcha (Bubble)
                ctx.fillStyle = isFull ? 'rgba(255,245,157,0.97)' : 'rgba(255,255,255,0.9)';
                ctx.beginPath();
                ctx.arc(fp.cx, ry, bw/2, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = isFull ? '#ffd700' : 'rgba(255,215,0,0.5)';
                ctx.lineWidth = isFull ? 2.5*z : 2*z;
                ctx.stroke();

                // Ikonka
                ctx.font = `${Math.max(14, isFull ? 18*z : 16*z)}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(ri, fp.cx, ry - (isFull ? 3*z : 0));

                // "COLLECT!" yoki +qiymat
                if (isFull) {
                    ctx.fillStyle = '#e65100';
                    ctx.font = `bold ${Math.max(6, 7*z)}px Inter,sans-serif`;
                    ctx.fillText('COLLECT!', fp.cx, ry + 9*z);
                } else {
                    ctx.fillStyle = '#000';
                    ctx.font = `bold ${Math.max(7,8*z)}px Inter,sans-serif`;
                    ctx.fillText(`+${Helpers.formatNumber(stored)}`, fp.cx, ry + 10*z);
                }
            }
        }
        // ── Goldmine / Villa faol mining zarrachalari ─────────────────────────
        if (!b.building && (b.type === 'villa' || b.type === 'farm' || b.type === 'treeOfLife') && z > 0.55) {
            const lv3 = BUILDING_DATA[b.type]?.levels[b.level];
            const cap3 = lv3?.capacity || 99999;
            if ((b.storedResource || 0) < cap3 * 0.98 && Math.random() < 0.04) {
                const mOx = (Math.random() - 0.5) * (fp.right.x - fp.left.x) * 0.55;
                const mOy = (Math.random() - 0.5) * (fp.bottom.y - fp.top.y) * 0.3;
                const mX  = fp.cx + mOx;
                const mY  = fp.top.y - bH * 0.5 + mOy - Math.random() * 6 * z;
                const isGold = b.type === 'villa';
                ctx.save();
                ctx.globalAlpha = 0.45 + Math.random() * 0.35;
                ctx.fillStyle = isGold ? '#ffd700' : '#a5d6a7';
                ctx.shadowColor = isGold ? '#ffd700' : '#4caf50';
                ctx.shadowBlur  = 3 * z;
                ctx.beginPath();
                ctx.arc(mX, mY, (0.8 + Math.random() * 0.8) * z, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        // ⚡ Boost indikatori — qolgan vaqt bilan (CoC-style)
        if (!b.building && b._boostUntil && b._boostUntil > Date.now()) {
            const remMs  = b._boostUntil - Date.now();
            const remMin = Math.ceil(remMs / 60000);
            const bx = fp.cx + (fp.right.x - fp.cx) * 0.42;
            const by2 = fp.top.y - bH - 12 * z;
            const pulse = 0.82 + Math.sin(Date.now() * 0.006) * 0.18;
            ctx.save();
            ctx.globalAlpha = pulse;
            // Xira tagligi
            const bpW = (remMin >= 10 ? 28 : 22) * z;
            const bpH = 12 * z;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(bx - bpW / 2, by2 - bpH / 2, bpW, bpH, bpH / 2);
            else ctx.rect(bx - bpW / 2, by2 - bpH / 2, bpW, bpH);
            ctx.fill();
            // Glow border
            ctx.strokeStyle = `rgba(255,220,0,${0.55 + pulse * 0.35})`;
            ctx.lineWidth = 0.8 * z;
            ctx.stroke();
            // Emoji + timer matn
            ctx.font = `${Math.max(7, 8.5 * z)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffe57f';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur  = 5 * z;
            const timerStr = remMin >= 60
                ? `⚡${Math.ceil(remMin/60)}s`  // soat
                : `⚡${remMin}m`;
            ctx.fillText(timerStr, bx, by2 + 0.3 * z);
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ⬆ Upgrade mumkin badge (CoC-style pulsing green arrow)
        if (!b.building && Game.mode === 'home') {
            this._drawUpgradeBadge(ctx, b, fp, z, bH, bd);
        }

        // ── Hero statue sleeping zzz (CoC-style) ────────────────────────────
        if (!b.building && Game.mode === 'home'
            && ['legatusStatue','aquiliferStatue','praetoranStatue','imperatriceStatue'].includes(b.type)
            && z > 0.45) {
            const heroKey = { legatusStatue:'legatus', aquiliferStatue:'aquilifer',
                              praetoranStatue:'praetorian_guard', imperatriceStatue:'imperatrix' }[b.type];
            const hero = typeof HeroSystem !== 'undefined' && HeroSystem.commanders?.[heroKey];
            const sleeping = hero && (hero.sleeping || (hero.sleepUntil && hero.sleepUntil > Date.now()));
            if (sleeping) {
                this._drawHeroSleepingZzz(ctx, fp, z, bH);
            } else if (hero) {
                // Active hero — faint golden aura
                const gp2 = (Math.sin(Date.now() * 0.002) + 1) * 0.5;
                const aG = ctx.createRadialGradient(fp.cx, fp.cy - bH*0.3, 0, fp.cx, fp.cy, (fp.right.x-fp.left.x)*0.7);
                aG.addColorStop(0, `rgba(255,220,80,${0.06 + gp2*0.05})`);
                aG.addColorStop(1, 'rgba(255,200,0,0)');
                ctx.save();
                ctx.fillStyle = aG;
                ctx.beginPath();
                ctx.ellipse(fp.cx, fp.cy, (fp.right.x-fp.left.x)*0.7, (fp.bottom.y-fp.top.y)*0.45, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Askar ko'rsatkichi (Muster Ground)
        if (b.type === 'musterGround' && !b.building) {
            this._drawTroopsInCamp(ctx, b, fp);
        }

        // Kazarma trening progress ring
        if (b.type === 'barracks' && !b.building) {
            this._drawBarracksTraining(ctx, b, fp, z, bH);
        }

        // ── CityHall / Praetorium maxsus ambient glow ─────────────────────────
        if ((b.type === 'cityHall' || b.type === 'praetorium') && !b.building) {
            const now = Date.now();
            const gp  = (Math.sin(now * 0.0035) + 1) / 2;
            const isCH = b.type === 'cityHall';
            ctx.save();
            // Outer halo — keng, xira
            const haloRx = (fp.right.x - fp.left.x) * 0.65;
            const haloRy = (fp.bottom.y - fp.top.y) * 0.38;
            const haloGrad = ctx.createRadialGradient(fp.cx, fp.cy, 0, fp.cx, fp.cy, haloRx);
            if (isCH) {
                haloGrad.addColorStop(0, `rgba(255,215,0,${0.06 + gp * 0.05})`);
                haloGrad.addColorStop(0.6, `rgba(255,165,0,${0.03 + gp * 0.03})`);
                haloGrad.addColorStop(1, 'rgba(255,215,0,0)');
            } else {
                haloGrad.addColorStop(0, `rgba(176,196,222,${0.07 + gp * 0.04})`);
                haloGrad.addColorStop(0.6, `rgba(100,149,237,${0.03 + gp * 0.03})`);
                haloGrad.addColorStop(1, 'rgba(176,196,222,0)');
            }
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.cy, haloRx * 1.4, haloRy * 1.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Rotating light spots (2 ta)
            if (z > 0.55) {
                for (let li = 0; li < 2; li++) {
                    const ang = (li / 2) * Math.PI * 2 + now * 0.0015;
                    const lx  = fp.cx + Math.cos(ang) * haloRx * 0.65;
                    const ly  = fp.cy + Math.sin(ang) * haloRy * 0.65;
                    const lr  = (2 + gp * 1.2) * z;
                    ctx.fillStyle = isCH ? `rgba(255,235,150,${0.5 + gp * 0.3})` : `rgba(200,220,255,${0.45 + gp * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // ── Defense tower "armed" sweep — home modeda minora sekin aylanadi ────
        if (bd.category === 'mudofaa' && !b.building && b.hp > 0
            && typeof Game !== 'undefined' && Game.mode === 'home') {
            const lv2   = bd.levels[b.level];
            if (lv2 && lv2.range) {
                const now3  = Date.now();
                const sweep = now3 * 0.00045;                           // sekin aylanish
                const sweepW = 0.55;                                    // yoy kengligi (radian)
                const rangePx = lv2.range * Grid.TILE_W * z;
                const rScaleY = Grid.TILE_H / Grid.TILE_W;
                ctx.save();
                ctx.globalAlpha = 0.12;

                // Sweeping filled arc
                ctx.beginPath();
                ctx.moveTo(fp.cx, fp.cy);
                // Isometrik ellips uchun transform
                ctx.save();
                ctx.translate(fp.cx, fp.cy);
                ctx.scale(1, rScaleY);
                ctx.translate(-fp.cx, -fp.cy);
                ctx.moveTo(fp.cx, fp.cy);
                ctx.arc(fp.cx, fp.cy, rangePx * 0.88, sweep - sweepW / 2, sweep + sweepW / 2);
                ctx.closePath();

                const sweepGrad = ctx.createRadialGradient(fp.cx, fp.cy, 0, fp.cx, fp.cy, rangePx * 0.88);
                const towerColor = b.type === 'flamingCitadel' ? 'rgba(255,120,0,'
                                 : b.type === 'magicTower'     ? 'rgba(180,0,255,'
                                 : b.type === 'tormenta'       ? 'rgba(80,180,255,'
                                 :                               'rgba(255,220,80,';
                sweepGrad.addColorStop(0,   `${towerColor}0.0)`);
                sweepGrad.addColorStop(0.55, `${towerColor}0.25)`);
                sweepGrad.addColorStop(1,   `${towerColor}0.0)`);
                ctx.fillStyle = sweepGrad;
                ctx.fill();
                ctx.restore();

                // Leading edge line
                ctx.save();
                ctx.globalAlpha = 0.28;
                ctx.translate(fp.cx, fp.cy);
                ctx.scale(1, rScaleY);
                ctx.translate(-fp.cx, -fp.cy);
                ctx.beginPath();
                ctx.moveTo(fp.cx, fp.cy);
                const edgeX = fp.cx + Math.cos(sweep) * rangePx * 0.88;
                const edgeY = fp.cy + Math.sin(sweep) * rangePx * 0.88;
                ctx.lineTo(edgeX, edgeY);
                ctx.strokeStyle = `${towerColor}0.9)`;
                ctx.lineWidth = 1.2 * z;
                ctx.stroke();
                ctx.restore();

                ctx.restore();
            }
        }

        // Shudder translate ni yopish
        if (shudderX !== 0 || shudderY !== 0) {
            ctx.restore();
        }
    },

    // ── Upgrade badge (yashil ↑ belgisi) ───────────────────────────────────
    _drawUpgradeBadge(ctx, b, fp, z, bH, bd) {
        const nextLv = bd.levels[b.level + 1];
        if (!nextLv || !nextLv.cost) return;

        // Resurslar yetarliligini tekshirish (faqat primary currency)
        let canAfford = true;
        for (const [res, amt] of Object.entries(nextLv.cost)) {
            if ((Resources[res] || 0) < amt) { canAfford = false; break; }
        }
        if (!canAfford) return;

        // Builder mavjudligini tekshirish
        if (!BuilderSystem.hasFreeBuilder()) return;

        const time = Date.now();
        const pulse = 0.7 + Math.sin(time * 0.005) * 0.3;
        const bx = fp.cx + (fp.right.x - fp.cx) * 0.55;
        const by = fp.top.y - bH - 6 * z;
        const r  = Math.max(8, 9 * z);

        ctx.save();
        ctx.globalAlpha = pulse;

        // Outer glow ring
        const grd = ctx.createRadialGradient(bx, by, r * 0.3, bx, by, r * 1.6);
        grd.addColorStop(0, 'rgba(105,240,174,0.5)');
        grd.addColorStop(1, 'rgba(105,240,174,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(bx, by, r * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Badge circle
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#69f0ae';
        ctx.lineWidth = 1.5 * z;
        ctx.stroke();

        // Arrow ↑
        ctx.fillStyle = '#69f0ae';
        ctx.font = `bold ${Math.max(9, 11 * z)}px Inter,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↑', bx, by + 0.5 * z);

        ctx.restore();
    },

    // Kazarma ustida trening doirasi (CoC kabi)
    _drawBarracksTraining(ctx, b, fp, z, bH) {
        if (typeof TroopManager === 'undefined') return;
        const queue = TroopManager.getQueue(b.id);
        if (!queue || queue.length === 0) return;

        const item = queue[0]; // Hozir tayyorlanayotgan
        const td   = TROOP_DATA[item.type];
        if (!td) return;

        // Progress hisoblash
        const prog = item.timerId ? timerManager.getProgress(item.timerId) : 1;
        const now  = Date.now();

        // Ring markaz — bino ustida
        const cx = fp.cx;
        const cy = fp.top.y - bH - 14 * z;
        const R  = Math.max(10, 12 * z);

        ctx.save();

        // Tashqi orqa doira
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1 * z;
        ctx.stroke();

        // Progress arc
        const startAng = -Math.PI / 2;
        const endAng   = startAng + Math.PI * 2 * prog;
        ctx.beginPath();
        ctx.arc(cx, cy, R - 1.5 * z, startAng, endAng);
        ctx.strokeStyle = prog > 0.7 ? '#69f0ae' : prog > 0.35 ? '#ffd700' : '#ff9800';
        ctx.lineWidth = 2.5 * z;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Troop icon inside ring
        ctx.font = `${Math.max(10, R * 0.85)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(td.icon, cx, cy);

        // Queue count badge (agar 1 dan ko'p bo'lsa)
        if (queue.length > 1) {
            const bx2 = cx + R * 0.65;
            const by2 = cy - R * 0.65;
            const br2 = Math.max(5, 6 * z);
            ctx.fillStyle = '#f44336';
            ctx.beginPath();
            ctx.arc(bx2, by2, br2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.max(7, 8 * z)}px Inter,sans-serif`;
            ctx.fillText(queue.length, bx2, by2);
        }

        ctx.restore();
    },

    // QURUVCHI (Architect) Vizualizatsiyasi
    _drawArchitect(ctx, fp, z) {
        const time = Date.now() * 0.005;
        const hammerSwing = Math.sin(time * 2) * 0.5 + 0.5; // 0 to 1
        
        // Quruvchi bino chetida turadi
        const ax = fp.left.x + 5*z;
        const ay = fp.bottom.y - 5*z;
        
        // Soya
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(ax, ay, 4*z, 2*z, 0, 0, Math.PI*2);
        ctx.fill();

        // Tana (O'ziga xos jigarrang kiyimda)
        ctx.fillStyle = '#795548';
        ctx.beginPath();
        ctx.roundRect(ax - 3*z, ay - 10*z, 6*z, 8*z, 2*z);
        ctx.fill();

        // Bosh
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(ax, ay - 11*z, 3*z, 0, Math.PI*2);
        ctx.fill();

        // Sariq kaska (Dubulg'a)
        ctx.fillStyle = '#fbc02d';
        ctx.beginPath();
        ctx.arc(ax, ay - 12*z, 3.2*z, Math.PI, Math.PI * 2);
        ctx.fill();

        // Bolg'a (Hammer)
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 1.5 * z;
        ctx.beginPath();
        const hx = ax + 3*z;
        const hy = ay - 6*z - hammerSwing * 6 * z;
        ctx.moveTo(ax + 2*z, ay - 6*z);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        // Bolg'a boshi
        ctx.fillStyle = '#616161';
        ctx.fillRect(hx - 2*z, hy - 2*z, 4*z, 3*z);

        // Bolg'a urish effekti (uchqun)
        if (hammerSwing > 0.8) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(hx, hy, 1.5*z, 0, Math.PI*2);
            ctx.fill();
        }
    },

    // ── Qurilishdagi yulduzcha sparkle effekti ────────────────────────────────
    _drawConstructionSparkles(ctx, fp, z) {
        if (z < 0.5) return;  // Kichik zoom da skip
        const now = Date.now();

        // 3 ta aylanuvchi yulduz/uchqun bino atrofida
        const SPARK_COUNT = 3;
        for (let i = 0; i < SPARK_COUNT; i++) {
            // Har yulduz boshqa fazada aylanadi va vertikal boblanadi
            const phase = (i / SPARK_COUNT) * Math.PI * 2;
            const angSpeed = 0.002 + i * 0.0004;
            const ang = now * angSpeed + phase;

            const rx = (fp.right.x - fp.left.x) * 0.55;
            const ry = (fp.bottom.y - fp.top.y) * 0.30;

            const px = fp.cx + Math.cos(ang) * rx;
            const py = fp.cy + Math.sin(ang) * ry - 10 * z + Math.sin(now * 0.008 + phase) * 4 * z;

            // Yulduz yaltirar rangi: oltin, yashil, oq
            const colors = ['#ffd700', '#76c442', '#ffffff'];
            const col = colors[i % colors.length];
            const alpha = 0.6 + Math.sin(now * 0.01 + phase * 2) * 0.3;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = col;
            ctx.shadowBlur = 6 * z;
            ctx.shadowColor = col;

            // 4-burchakli yulduz shakli
            ctx.translate(px, py);
            ctx.rotate(now * 0.003 + phase);
            const sr = (2 + Math.sin(now * 0.012 + phase) * 0.8) * z;
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
                const a = k * Math.PI / 4;
                const r = k % 2 === 0 ? sr * 2 : sr;
                k === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                        : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Vaqti-vaqti bilan uchuvchi uchqun (random, 15% chance per frame)
        if (Math.random() < 0.15) {
            const randAng = Math.random() * Math.PI * 2;
            const rx2 = (fp.right.x - fp.left.x) * (0.2 + Math.random() * 0.4);
            const ry2 = (fp.bottom.y - fp.top.y) * (0.1 + Math.random() * 0.3);
            const sx = fp.cx + Math.cos(randAng) * rx2;
            const sy = fp.cy + Math.sin(randAng) * ry2;
            ctx.save();
            ctx.globalAlpha = 0.7 + Math.random() * 0.25;
            ctx.fillStyle = Math.random() < 0.5 ? '#ffd700' : '#fff';
            ctx.shadowBlur = 4 * z;
            ctx.shadowColor = '#ffd700';
            ctx.beginPath();
            ctx.arc(sx, sy - 8*z, (1 + Math.random()) * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    // Bino zararlanish crack effekti
    _drawCracks(ctx, fp, hpRatio, buildingId) {
        // Seeded pseudo-random from building id for stable cracks
        let seed = 0;
        const idStr = String(buildingId);
        for (let i = 0; i < idStr.length; i++) seed = (seed * 31 + idStr.charCodeAt(i)) & 0xfffff;
        const rng = (n) => { seed = (seed * 1664525 + 1013904223) & 0xfffff; return (seed / 0xfffff) * n; };

        // Clip to diamond shape
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(fp.top.x, fp.top.y);
        ctx.lineTo(fp.right.x, fp.right.y);
        ctx.lineTo(fp.bottom.x, fp.bottom.y);
        ctx.lineTo(fp.left.x, fp.left.y);
        ctx.closePath();
        ctx.clip();

        const intensity = hpRatio < 0.3 ? 1.0 : (0.65 - hpRatio) / 0.35;
        const crackCount = hpRatio < 0.3 ? 6 : 3;
        const alpha = 0.3 + intensity * 0.45;

        ctx.strokeStyle = `rgba(40,20,10,${alpha})`;
        ctx.lineWidth = 1 + intensity;

        const w = fp.right.x - fp.left.x;
        const h = fp.bottom.y - fp.top.y;
        const ox = fp.left.x;
        const oy = fp.top.y;

        for (let c = 0; c < crackCount; c++) {
            const sx = ox + rng(w);
            const sy = oy + rng(h);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            let cx2 = sx, cy2 = sy;
            const steps = 3 + Math.floor(rng(3));
            for (let s = 0; s < steps; s++) {
                cx2 += (rng(20) - 10) * intensity;
                cy2 += (rng(16) - 4);
                ctx.lineTo(cx2, cy2);
            }
            ctx.stroke();
        }

        ctx.restore();
    },

    // Zarar tutuni — HP < 50% da animatsiyali tutun chiqadi
    _smokeState: {},  // buildingId → { particles: [] }
    _drawDamageSmoke(ctx, fp, hpRatio, buildingId) {
        const now = Date.now();
        if (!this._smokeState[buildingId]) {
            this._smokeState[buildingId] = { particles: [], lastSpawn: 0 };
        }
        const state = this._smokeState[buildingId];

        // Yangi tutun zarrachasi hosil qilish (HP qanchalik past — shunchalik ko'p)
        const spawnRate = hpRatio < 0.25 ? 200 : 400; // ms
        if (now - state.lastSpawn > spawnRate) {
            state.lastSpawn = now;
            const count = hpRatio < 0.25 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                state.particles.push({
                    x:     fp.cx + (Math.random() - 0.5) * (fp.right.x - fp.left.x) * 0.4,
                    y:     fp.top.y - 4,
                    vx:    (Math.random() - 0.5) * 0.4,
                    vy:    -(0.5 + Math.random() * 0.8),
                    life:  1.0,
                    size:  4 + Math.random() * 6,
                    gray:  140 + Math.floor(Math.random() * 80),
                    born:  now,
                    dur:   800 + Math.random() * 600,
                });
            }
        }

        // Tutun zarrachalarini yangilash va chizish
        const z = Camera.zoom;
        ctx.save();
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            const age = (now - p.born) / p.dur;
            if (age >= 1) { state.particles.splice(i, 1); continue; }
            p.x += p.vx;
            p.y += p.vy;
            const alpha = (1 - age) * (hpRatio < 0.25 ? 0.52 : 0.32);
            const r = p.size * z * (0.5 + age * 0.85);
            ctx.save();
            ctx.globalAlpha = alpha;
            // Yumshoq radial gradient tutun
            const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            const bv = p.gray;
            sg.addColorStop(0,   `rgba(${bv},${bv},${bv},0.7)`);
            sg.addColorStop(0.55,`rgba(${bv},${bv},${bv},0.35)`);
            sg.addColorStop(1,   `rgba(${bv},${bv},${bv},0)`);
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Critical — qizil olov uchqunlari (HP < 25%)
        if (hpRatio < 0.25) {
            const fireX = fp.cx + (Math.random() - 0.5) * 8;
            const fireY = fp.top.y + (Math.random() * 4);
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.random() * 0.4;
            ctx.fillStyle = Math.random() > 0.5 ? '#ff5722' : '#ffa000';
            ctx.font = `${8 + Math.random() * 6}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🔥', fireX, fireY);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    },

    // Qurilishdagi skafold chizish (CoC uslubi)
    _drawScaffold(ctx, fp, z, progress) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - progress * 1.4); // Qurilish tugashga yaqin yo'qoladi

        const L = fp.left, R = fp.right, T = fp.top, Bot = fp.bottom;
        const h = Bot.y - T.y;
        const w = R.x - L.x;
        const mid = fp.cx;

        // Tik yogʻoch ustunlar (4 ta burchak)
        const poleColor = '#6d4c41';
        const crossColor = '#8d6e63';

        ctx.strokeStyle = poleColor;
        ctx.lineWidth = 2.5 * z;

        // Chap old ustun
        ctx.beginPath(); ctx.moveTo(L.x + 2*z, Bot.y); ctx.lineTo(L.x + 2*z, T.y - 8*z); ctx.stroke();
        // O'ng old ustun
        ctx.beginPath(); ctx.moveTo(R.x - 2*z, Bot.y); ctx.lineTo(R.x - 2*z, T.y - 8*z); ctx.stroke();
        // Chap orqa ustun (tepa tomonda)
        ctx.beginPath(); ctx.moveTo(T.x - w*0.15, Bot.y + h*0.2); ctx.lineTo(T.x - w*0.15, T.y - 10*z); ctx.stroke();
        // O'ng orqa ustun
        ctx.beginPath(); ctx.moveTo(T.x + w*0.15, Bot.y + h*0.2); ctx.lineTo(T.x + w*0.15, T.y - 10*z); ctx.stroke();

        // Gorizontal tayanch taxtalar
        ctx.strokeStyle = crossColor;
        ctx.lineWidth = 1.5 * z;

        const levels = 3;
        for (let i = 0; i <= levels; i++) {
            const fy = Bot.y - (Bot.y - T.y) * (i / levels) * 0.85;
            ctx.beginPath(); ctx.moveTo(L.x + 1*z, fy); ctx.lineTo(R.x - 1*z, fy); ctx.stroke();
        }

        // Diagonal ko'ndalang taxtalar (X)
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 1 * z;
        ctx.setLineDash([3*z, 3*z]);
        ctx.beginPath(); ctx.moveTo(L.x + 2*z, Bot.y); ctx.lineTo(R.x - 2*z, T.y - 6*z); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(R.x - 2*z, Bot.y); ctx.lineTo(L.x + 2*z, T.y - 6*z); ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    },

    // Yig'ilish maydonidagi askarlarni chizish
    _drawTroopsInCamp(ctx, b, fp) {
        const total = TroopManager.getTotal();
        if (total === 0) return;

        const z = Camera.zoom;
        const bd = BUILDING_DATA[b.type];
        
        // Askarlar sonini chegaralash (grafika uchun)
        const displayCount = Math.min(10, Math.ceil(total / 2));
        
        // Tasodifiy joylashuv (har bir bino uchun o'zgarmas urug' (seed) bilan)
        const seed = b.id * 1000;
        
        for (let i = 0; i < displayCount; i++) {
            // "Tasodifiy" lekin doimiy koordinatalar
            const rx = ((Math.sin(seed + i * 543.21) + 1) / 2) * 0.6 + 0.2;
            const ry = ((Math.cos(seed + i * 123.45) + 1) / 2) * 0.6 + 0.2;
            
            // Izometrik ekrandagi koordinata
            const tx = b.x + rx * bd.size[0];
            const ty = b.y + ry * bd.size[1];
            const iso = Camera.toIso(tx, ty);
            const screen = Camera.worldToScreen(iso.x, iso.y);
            
            // Askar belgisi
            ctx.font = `${Math.max(10, 14 * z)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            
            // Qaysi turdagi askarni chizish? (Army dan tasodifiy)
            ctx.fillText('🏃', screen.x, screen.y);
        }
    },

    // Ghost bino (joylashtirish)
    // locked = true bo'lsa — bino qotib turibdi, ✅/❌ ko'rinadi
    drawGhost(ctx, type, gx, gy, canPlace, locked) {
        const bd = BUILDING_DATA[type];
        const fp = this.getScreenFootprint(gx, gy, bd.size[0], bd.size[1]);
        const z = Camera.zoom;
        const bH = 18 * z;
        const c = this._getColor(type);

        // Per-cell grid snap indicator
        ctx.globalAlpha = 0.18;
        const fillColor = canPlace ? '#4caf50' : '#f44336';
        const strokeColor = canPlace ? '#81c784' : '#ef9a9a';
        for (let dy = 0; dy < bd.size[1]; dy++) {
            for (let dx = 0; dx < bd.size[0]; dx++) {
                const cx = gx + dx, cy = gy + dy;
                const cellFp = this.getScreenFootprint(cx, cy, 1, 1);
                ctx.beginPath();
                ctx.moveTo(cellFp.top.x, cellFp.top.y);
                ctx.lineTo(cellFp.right.x, cellFp.right.y);
                ctx.lineTo(cellFp.bottom.x, cellFp.bottom.y);
                ctx.lineTo(cellFp.left.x, cellFp.left.y);
                ctx.closePath();
                ctx.fillStyle = fillColor; ctx.fill();
            }
        }
        // Outer footprint border
        ctx.globalAlpha = locked ? 0.7 : 0.5;
        ctx.beginPath();
        ctx.moveTo(fp.top.x, fp.top.y); ctx.lineTo(fp.right.x, fp.right.y);
        ctx.lineTo(fp.bottom.x, fp.bottom.y); ctx.lineTo(fp.left.x, fp.left.y);
        ctx.closePath();
        ctx.strokeStyle = strokeColor; ctx.lineWidth = 2.5*z; ctx.stroke();
        // Inner cell grid lines
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1*z;
        for (let dy = 0; dy < bd.size[1]; dy++) {
            for (let dx = 0; dx < bd.size[0]; dx++) {
                const cx = gx + dx, cy = gy + dy;
                const cellFp = this.getScreenFootprint(cx, cy, 1, 1);
                ctx.beginPath();
                ctx.moveTo(cellFp.top.x, cellFp.top.y);
                ctx.lineTo(cellFp.right.x, cellFp.right.y);
                ctx.lineTo(cellFp.bottom.x, cellFp.bottom.y);
                ctx.lineTo(cellFp.left.x, cellFp.left.y);
                ctx.closePath();
                ctx.strokeStyle = strokeColor; ctx.stroke();
            }
        }

        // Bino ghost —         ctx.globalAlpha = locked ? 0.75 : 0.45;
        const img = this.getBuildingImage(type, 1);
        if (img) {
            const scale = bd.imageScale || 1.0;
            const offsetY = bd.imageOffsetY || 0;
            const baseW = fp.right.x - fp.left.x;
            const iw = baseW * scale;
            const ih = iw * (img.height / img.width);
            const oy = offsetY * z;
            ctx.drawImage(img, fp.cx - iw/2, fp.bottom.y - ih + oy, iw, ih);
        } else {
            const leftGrad = ctx.createLinearGradient(fp.left.x, fp.left.y, fp.cx, fp.bottom.y);
            leftGrad.addColorStop(0, c.left); leftGrad.addColorStop(1, c.outline);
            const rightGrad = ctx.createLinearGradient(fp.cx, fp.bottom.y, fp.right.x, fp.right.y);
            rightGrad.addColorStop(0, c.right); rightGrad.addColorStop(1, c.outline);
            const topGrad = ctx.createRadialGradient(fp.cx, fp.cy - bH, 0, fp.cx, fp.cy - bH, (fp.right.x - fp.left.x)/2);
            topGrad.addColorStop(0, '#ffffff33'); topGrad.addColorStop(1, c.top);

            ctx.beginPath();
            ctx.moveTo(fp.top.x, fp.top.y - bH); ctx.lineTo(fp.right.x, fp.right.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y - bH); ctx.lineTo(fp.left.x, fp.left.y - bH);
            ctx.closePath(); ctx.fillStyle = topGrad; ctx.fill();
            ctx.strokeStyle = c.outline; ctx.lineWidth = 1; ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(fp.left.x, fp.left.y - bH); ctx.lineTo(fp.bottom.x, fp.bottom.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y); ctx.lineTo(fp.left.x, fp.left.y);
            ctx.closePath(); ctx.fillStyle = leftGrad; ctx.fill(); ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(fp.right.x, fp.right.y - bH); ctx.lineTo(fp.bottom.x, fp.bottom.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y); ctx.lineTo(fp.right.x, fp.right.y);
            ctx.closePath(); ctx.fillStyle = rightGrad; ctx.fill(); ctx.stroke();

            // Ikonka
            ctx.globalAlpha = locked ? 0.9 : 0.6;
            const isz = Math.max(14, 18*z);
            ctx.beginPath(); ctx.arc(fp.cx, fp.cy - bH + 2*z, isz*0.8, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = `${isz}px sans-serif`; 
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(bd.icon, fp.cx, fp.cy - bH + 2*z);
        }
        ctx.globalAlpha = 1;

        // ✅ ❌ tugmalar — faqat LOCKED bo'lganda ko'rinadi
        if (locked) {
            const btnY = fp.top.y - bH - 32*z;
            const btnR = Math.max(14, 18*z);
            const btnGap = Math.max(26, 30*z);

            // ✅ — yashil doira (faqat qo'ysa bo'lganda)
            if (canPlace) {
                // Yashil fon
                ctx.fillStyle = 'rgba(46,125,50,0.95)';
                ctx.beginPath(); ctx.arc(fp.cx - btnGap, btnY, btnR, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
                // Belgi
                ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(14, btnR)}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('✓', fp.cx - btnGap, btnY + 1);
            }

            // ❌ — qizil doira (doimo ko'rinadi)
            ctx.fillStyle = 'rgba(198,40,40,0.95)';
            ctx.beginPath(); ctx.arc(fp.cx + btnGap, btnY, btnR, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(14, btnR)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('✕', fp.cx + btnGap, btnY + 1);

            // Tugma pozitsiyalarini saqlash
            BuildMenu._confirmBtn = canPlace ? { x: fp.cx - btnGap, y: btnY, r: btnR } : null;
            BuildMenu._cancelBtn = { x: fp.cx + btnGap, y: btnY, r: btnR };
        } else {
            // Locked emas — tugmalar yo'q
            BuildMenu._confirmBtn = null;
            BuildMenu._cancelBtn = null;

            // "Click qiling" ko'rsatkichi
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.font = `bold ${Math.max(10, 11*z)}px Inter,sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('👆 Joyni tanlang', fp.cx, fp.top.y - bH - 18*z);
        }
    },

    // Drag qilinayotgan binoni chizish
    drawDragGhost(ctx) {
        if (!BuildingManager.dragging) return;

        const b = BuildingManager.buildings[BuildingManager.dragBuildingId];
        if (!b) return;

        const bd = BUILDING_DATA[b.type];
        const gx = BuildingManager.dragCurrentX;
        const gy = BuildingManager.dragCurrentY;
        const w = bd.size[0];
        const h = bd.size[1];
        const canPlace = BuildingManager.canPlaceDrag();

        const fp = this.getScreenFootprint(gx, gy, w, h);
        const z = Camera.zoom;
        const bH = (14 + b.level * 4) * z;
        const c = this._getColor(b.type);

        // Tag highlight (yashil/qizil)
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(fp.top.x, fp.top.y); ctx.lineTo(fp.right.x, fp.right.y);
        ctx.lineTo(fp.bottom.x, fp.bottom.y); ctx.lineTo(fp.left.x, fp.left.y);
        ctx.closePath();
        ctx.fillStyle = canPlace ? '#4caf50' : '#f44336'; ctx.fill();
        ctx.strokeStyle = canPlace ? '#2e7d32' : '#c62828'; ctx.lineWidth = 2.5 * z; ctx.stroke();
        ctx.globalAlpha = 1;

        // Bino ghost
        ctx.globalAlpha = 0.65;
        const img = this.getBuildingImage(b.type, b.level);
        if (img) {
            const scale = bd.imageScale || 1.0;
            const offsetY = bd.imageOffsetY || 0;
            const baseW = fp.right.x - fp.left.x;
            const iw = baseW * scale;
            const ih = iw * (img.height / img.width);
            const oy = offsetY * z;
            ctx.drawImage(img, fp.cx - iw/2, fp.bottom.y - ih + oy, iw, ih);
        } else {
            const leftGrad = ctx.createLinearGradient(fp.left.x, fp.left.y, fp.cx, fp.bottom.y);
            leftGrad.addColorStop(0, c.left); leftGrad.addColorStop(1, c.outline);
            const rightGrad = ctx.createLinearGradient(fp.cx, fp.bottom.y, fp.right.x, fp.right.y);
            rightGrad.addColorStop(0, c.right); rightGrad.addColorStop(1, c.outline);
            const topGrad = ctx.createRadialGradient(fp.cx, fp.cy - bH, 0, fp.cx, fp.cy - bH, (fp.right.x - fp.left.x)/2);
            topGrad.addColorStop(0, '#ffffff33'); topGrad.addColorStop(1, c.top);

            ctx.beginPath();
            ctx.moveTo(fp.top.x, fp.top.y - bH); ctx.lineTo(fp.right.x, fp.right.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y - bH); ctx.lineTo(fp.left.x, fp.left.y - bH);
            ctx.closePath(); ctx.fillStyle = topGrad; ctx.fill();
            ctx.strokeStyle = c.outline; ctx.lineWidth = 1; ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(fp.left.x, fp.left.y - bH); ctx.lineTo(fp.bottom.x, fp.bottom.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y); ctx.lineTo(fp.left.x, fp.left.y);
            ctx.closePath(); ctx.fillStyle = leftGrad; ctx.fill(); ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(fp.right.x, fp.right.y - bH); ctx.lineTo(fp.bottom.x, fp.bottom.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y); ctx.lineTo(fp.right.x, fp.right.y);
            ctx.closePath(); ctx.fillStyle = rightGrad; ctx.fill(); ctx.stroke();

            // Ikonka
            ctx.globalAlpha = 0.8;
            const isz = Math.max(14, 18*z);
            ctx.beginPath(); ctx.arc(fp.cx, fp.cy - bH + 2*z, isz*0.8, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = `${isz}px sans-serif`; 
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(bd.icon, fp.cx, fp.cy - bH + 2*z);
        }
        ctx.globalAlpha = 1;

        // Level badge
        const br = Math.max(6, 8 * z);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath(); ctx.arc(fp.right.x - 6*z, fp.right.y - bH, br, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${Math.max(8,10*z)}px Inter,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.level, fp.right.x - 6*z, fp.right.y - bH);

        // Ko'chirish ko'rsatkichi — "📍 Ko'chirish" tekst
        ctx.fillStyle = canPlace ? 'rgba(46,125,50,0.85)' : 'rgba(198,40,40,0.85)';
        const labelY = fp.top.y - bH - 20 * z;
        ctx.font = `bold ${Math.max(10, 12*z)}px Inter,sans-serif`;
        ctx.fillText(canPlace ? '📍 Qo\'yish' : '⛔ Joylash mumkin emas', fp.cx, labelY);

        // Eski pozitsiya ko'rsatkichi (dim)
        const origFp = this.getScreenFootprint(BuildingManager.dragOrigX, BuildingManager.dragOrigY, w, h);
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.moveTo(origFp.top.x, origFp.top.y); ctx.lineTo(origFp.right.x, origFp.right.y);
        ctx.lineTo(origFp.bottom.x, origFp.bottom.y); ctx.lineTo(origFp.left.x, origFp.left.y);
        ctx.closePath();
        ctx.fillStyle = '#888'; ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
    },

    // ── Defense building barrel rotation — nishonga qurol yo'naltirish ─────────
    // Isometrik ekranda barrel angle = atan2 of iso-projected direction
    _drawDefenseBarrel(ctx, b, bd, fp, z) {
        // Nishon mavjudmi?
        const tgt = b._lastFiredTarget;
        if (tgt) {
            const bcx = b.x + bd.size[0] / 2;
            const bcy = b.y + bd.size[1] / 2;
            const dx = tgt.x - bcx;
            const dy = tgt.y - bcy;
            // Izometrik projeksiyadagi yo'nalish
            const sdx = (dx - dy) * (Grid.TILE_W / 2);
            const sdy = (dx + dy) * (Grid.TILE_H / 2);
            const targetAngle = Math.atan2(sdy, sdx);

            if (b._aimAngle === undefined) {
                b._aimAngle = targetAngle;
            } else {
                // Eng qisqa yo'l orqali aylantirish (2π wrap)
                let diff = targetAngle - b._aimAngle;
                while (diff >  Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                b._aimAngle += diff * 0.22; // Silliq lekin tez burilish
            }
        }

        if (b._aimAngle === undefined) return;

        const angle = b._aimAngle;
        // Barrel chizish markazi — bino tepasi ustida (fp.cx, fp.cy dan bir oz yuqorida)
        const pivotY = fp.cy - (6 + b.level * 1.5) * z;
        const cx = fp.cx;
        const cy = pivotY;

        // Barrel o'lchamlari (daraja bilan ozgina o'sadi)
        const bLen = (10 + Math.min(b.level, 8) * 1.2) * z;
        const bW   = Math.max(2.5, (2.5 + Math.min(b.level, 6) * 0.25) * z);

        // Bino turiga qarab rang
        const barrelBase = b.type === 'flamingCitadel' ? '#b03010'
                         : b.type === 'scorpio'         ? '#9a7020'
                         : b.type === 'cloudBuster'     ? '#2850b0'
                         : b.type === 'boltTower'       ? '#c02860'
                         : b.type === 'tormenta'        ? '#3070b0'
                         : '#4a5e70';  // archerTower va boshqalar

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Soya
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        const _rr = (x, y, w, h, r) => {
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
            else { ctx.beginPath(); ctx.rect(x, y, w, h); }
        };
        _rr(1.5 * z, -bW / 2 + z, bLen, bW, bW / 2);
        ctx.fill();

        // Barrel gövdesi — gradient
        const g = ctx.createLinearGradient(0, -bW / 2, 0, bW / 2);
        g.addColorStop(0,   '#889aaa');
        g.addColorStop(0.4, barrelBase);
        g.addColorStop(1,   '#22333f');
        ctx.fillStyle = g;
        _rr(0, -bW / 2, bLen, bW, bW / 2);
        ctx.fill();

        // Shine (yorug'lik)
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        _rr(2 * z, -bW / 2 + 0.4 * z, bLen * 0.78, bW * 0.38, bW * 0.18);
        ctx.fill();

        // Muzzle halqasi
        ctx.strokeStyle = '#aabbcc';
        ctx.lineWidth = bW * 0.28;
        ctx.beginPath();
        ctx.arc(bLen - bW / 2, 0, bW / 2 + 0.8 * z, 0, Math.PI * 2);
        ctx.stroke();

        // Yelka halqasi (o'rta)
        ctx.strokeStyle = 'rgba(80,100,120,0.7)';
        ctx.lineWidth = bW * 0.18;
        ctx.beginPath();
        ctx.arc(bLen * 0.55, 0, bW / 2 + 0.4 * z, 0, Math.PI * 2);
        ctx.stroke();

        // Pivot tugmasi (markazda)
        ctx.fillStyle = '#3a4e5e';
        ctx.beginPath();
        ctx.arc(0, 0, bW * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a7080';
        ctx.beginPath();
        ctx.arc(0, 0, bW * 0.48, 0, Math.PI * 2);
        ctx.fill();

        // Ateş effekti — so'nggi o'q otilgandan beri qisqa vaqt
        if (b._lastFiredAt) {
            const age = Date.now() - b._lastFiredAt;
            if (age < 80) {
                const ft = age / 80;
                const flashR = (2 + (1 - ft) * 3) * z;
                ctx.save();
                ctx.globalAlpha = (1 - ft) * 0.85;
                ctx.shadowColor = barrelBase;
                ctx.shadowBlur  = 6 * z;
                ctx.fillStyle   = '#ffffff';
                ctx.beginPath();
                ctx.arc(bLen, 0, flashR, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = barrelBase;
                ctx.beginPath();
                ctx.arc(bLen, 0, flashR * 0.55, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.restore();
    },

    // ── Damage State — 25% HP dan pastda olov effekti (tutun _drawDamageSmoke da) ─
    _drawDamageState(ctx, b, fp, z, bH) {
        const hpRatio = b.hp / b.maxHp;
        // Faqat 25% dan past HP da yaxshilangan olov qo'shamiz
        // (_drawDamageSmoke & _drawCracks allaqachon tutun va yoriqliqni chizadi)
        if (hpRatio >= 0.25) return;

        const now      = Date.now();
        const cx       = fp.cx;
        const cy       = fp.bottom.y - bH * 0.5;
        const smokeSeed = parseInt(String(b.id).replace(/\D/g,'')) || 1;

        ctx.save();

        // ── Alanga tongillari — 3 ta sinusoidal olov ──────────────────────────
        const fireCount = 3;
        for (let i = 0; i < fireCount; i++) {
            const fPhase = (now * 0.0015 + i * 0.7 + smokeSeed * 0.4) % 1;
            const fX = cx + (i - 1) * 6 * z + Math.sin(fPhase * Math.PI * 2) * 2 * z;
            const fY = cy - fPhase * 18 * z - 3 * z;
            const fR = (2.5 + fPhase * 2) * z;
            const fA = (1 - fPhase) * 0.9;

            const fireGrad = ctx.createRadialGradient(fX, fY, 0, fX, fY, fR * 1.6);
            fireGrad.addColorStop(0,   `rgba(255,255,180,${fA})`);
            fireGrad.addColorStop(0.45,`rgba(255,140,20,${fA})`);
            fireGrad.addColorStop(1,   `rgba(200,60,0,0)`);
            ctx.beginPath();
            ctx.arc(fX, fY, fR * 1.6, 0, Math.PI * 2);
            ctx.fillStyle = fireGrad;
            ctx.fill();
        }

        // ── Qizil olov tutun ──────────────────────────────────────────────────
        for (let i = 0; i < 2; i++) {
            const dPhase = (now * 0.0006 + i * 1.8 + smokeSeed) % 1;
            const dY = cy - dPhase * 20 * z - bH * 0.35;
            const dR = (4 + dPhase * 5) * z;
            const dA = (1 - dPhase) * 0.38;
            ctx.beginPath();
            ctx.arc(cx + (i * 2 - 1) * 4 * z, dY, dR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(90,25,0,${dA})`;
            ctx.fill();
        }

        ctx.restore();
    },

    // ── Loot Cart — hujum bo'lgandan keyin TH yonida paydo bo'ladi (CoC-style) ──
    drawLootCart(ctx) {
        if (typeof Matchmaking === 'undefined' || !Matchmaking.hasLootCart()) return;
        const pos = Matchmaking.getLootCartScreenPos();
        if (!pos) return;

        const { x, y, z } = pos;
        const now = Date.now();
        const cart = Matchmaking._lootCart;

        // Bob animatsiyasi — yuqoriga-pastga 2px
        const bob = Math.sin(now * 0.003) * 2 * z;
        const cx = x;
        const cy = y + bob;

        ctx.save();

        // ── Soya ─────────────────────────────────────────────────────────────
        ctx.beginPath();
        ctx.ellipse(cx, cy + 8 * z, 14 * z, 5 * z, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fill();

        // ── Arava tanasi (yog'och quti) ───────────────────────────────────────
        const bw = 24 * z, bh = 16 * z;
        const bx = cx - bw / 2, by = cy - bh - 4 * z;

        // Yog'och ranglar
        const bodyGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        bodyGrad.addColorStop(0, '#c8922a');
        bodyGrad.addColorStop(0.5, '#a87020');
        bodyGrad.addColorStop(1, '#8a5810');
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 3 * z);
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.strokeStyle = '#6a4008';
        ctx.lineWidth = 1.2 * z;
        ctx.stroke();

        // Yog'och taxtalar (gorizontal chiziqlar)
        ctx.strokeStyle = 'rgba(100,60,0,0.35)';
        ctx.lineWidth = 0.8 * z;
        for (let i = 1; i < 3; i++) {
            const ly = by + (bh / 3) * i;
            ctx.beginPath(); ctx.moveTo(bx + 2 * z, ly); ctx.lineTo(bx + bw - 2 * z, ly); ctx.stroke();
        }

        // ── Altın tangalar (qutidan to'kilib turgan) ─────────────────────────
        const coinColors = ['#ffd700', '#e8c220', '#ffec60'];
        const coinR = 3.5 * z;
        const coinOffsets = [
            { dx: -7, dy: -2 }, { dx: -3, dy: -4 }, { dx: 2, dy: -3 },
            { dx: 6, dy: -1 }, { dx: -1, dy: -6 }, { dx: 4, dy: -5 }
        ];
        for (let i = 0; i < coinOffsets.length; i++) {
            const co = coinOffsets[i];
            const coinX = cx + co.dx * z;
            const coinY = by + co.dy * z;
            // Har tanga uchun aylana (oldin soya)
            ctx.beginPath();
            ctx.ellipse(coinX + 0.5 * z, coinY + 0.5 * z, coinR, coinR * 0.55, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fill();
            // Tanga
            ctx.beginPath();
            ctx.ellipse(coinX, coinY, coinR, coinR * 0.55, 0, 0, Math.PI * 2);
            ctx.fillStyle = coinColors[i % coinColors.length];
            ctx.fill();
            ctx.strokeStyle = '#b8920a';
            ctx.lineWidth = 0.7 * z;
            ctx.stroke();
        }

        // ── G'ildiraklar ───────────────────────────────────────────────────────
        const wheelR = 7 * z;
        const wheelY = by + bh;
        const wheelPositions = [bx + 5 * z, bx + bw - 5 * z];
        for (const wx of wheelPositions) {
            // Soya
            ctx.beginPath();
            ctx.ellipse(wx + 0.5 * z, wheelY + wheelR + 0.5 * z, wheelR * 0.7, wheelR * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fill();
            // G'ildirak halqa
            ctx.beginPath();
            ctx.arc(wx, wheelY + wheelR, wheelR, 0, Math.PI * 2);
            ctx.fillStyle = '#4a3010';
            ctx.fill();
            ctx.strokeStyle = '#2a1a00';
            ctx.lineWidth = 1.5 * z;
            ctx.stroke();
            // Temir halqa (tashqi)
            ctx.beginPath();
            ctx.arc(wx, wheelY + wheelR, wheelR - 1.5 * z, 0, Math.PI * 2);
            ctx.strokeStyle = '#666a70';
            ctx.lineWidth = 2 * z;
            ctx.stroke();
            // Spitsalar
            ctx.strokeStyle = '#6a4808';
            ctx.lineWidth = 1 * z;
            for (let a = 0; a < 4; a++) {
                const ang = (a / 4) * Math.PI * 2 + now * 0.0005;
                ctx.beginPath();
                ctx.moveTo(wx, wheelY + wheelR);
                ctx.lineTo(wx + Math.cos(ang) * (wheelR - 2 * z), wheelY + wheelR + Math.sin(ang) * (wheelR - 2 * z));
                ctx.stroke();
            }
            // Markaziy bolt
            ctx.beginPath();
            ctx.arc(wx, wheelY + wheelR, 2.5 * z, 0, Math.PI * 2);
            ctx.fillStyle = '#888a90';
            ctx.fill();
        }

        // ── Bayroqcha — sariq banner ───────────────────────────────────────────
        if (z > 0.4) {
            const flagX = cx + 10 * z;
            const flagBaseY = by - 2 * z;
            // Ustun
            ctx.beginPath();
            ctx.moveTo(flagX, flagBaseY);
            ctx.lineTo(flagX, flagBaseY - 14 * z);
            ctx.strokeStyle = '#8a6020';
            ctx.lineWidth = 1.2 * z;
            ctx.stroke();
            // Bayroq to'rtburchagi
            const fw = 9 * z, fh = 6 * z;
            const waveX = Math.sin(now * 0.005) * 1.5 * z;
            ctx.beginPath();
            ctx.moveTo(flagX, flagBaseY - 14 * z);
            ctx.lineTo(flagX + fw + waveX, flagBaseY - 14 * z + fh * 0.2);
            ctx.lineTo(flagX + fw, flagBaseY - 14 * z + fh);
            ctx.lineTo(flagX, flagBaseY - 14 * z + fh);
            ctx.closePath();
            ctx.fillStyle = '#ffd700';
            ctx.fill();
            ctx.strokeStyle = '#c8a000';
            ctx.lineWidth = 0.8 * z;
            ctx.stroke();
        }

        // ── Resurs label (yig'ilishi mumkin miqdor) ───────────────────────────
        if (z > 0.5) {
            ctx.font = `bold ${Math.round(8 * z)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            const labelY = by - 4 * z;
            if (cart.gold > 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fillText(`🪙${Helpers.formatNumber(cart.gold)}`, cx - 1, labelY - 1);
                ctx.fillStyle = '#ffe566';
                ctx.fillText(`🪙${Helpers.formatNumber(cart.gold)}`, cx, labelY);
            }
            if (cart.food > 0) {
                const labelY2 = by - 4 * z - (cart.gold > 0 ? 11 * z : 0);
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fillText(`🍎${Helpers.formatNumber(cart.food)}`, cx - 1, labelY2 - 1);
                ctx.fillStyle = '#ff8a80';
                ctx.fillText(`🍎${Helpers.formatNumber(cart.food)}`, cx, labelY2);
            }
        }

        // ── "Tap to collect" puls effekti ─────────────────────────────────────
        if (z > 0.35) {
            const pulse = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.004));
            const rippleR = (18 + pulse * 8) * z;
            ctx.beginPath();
            ctx.arc(cx, cy - bh / 2, rippleR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,215,0,${0.35 * pulse})`;
            ctx.lineWidth = 1.5 * z;
            ctx.stroke();
        }

        ctx.restore();
    },

    // ── Building-tipga xos procedural detallar ────────────────────────────────
    _addProceduralDetails(ctx, type, fp, bH, z, c, level, pushY, w, h) {
        const topCy = pushY(fp.cy) - bH;        // top face center Y
        const topPk = pushY(fp.top.y) - bH;     // top vertex Y
        const btmY  = pushY(fp.bottom.y) - bH;  // bottom of top face

        // ── Farm — paxsa devor, somon rangli tom ─────────────────────────────
        if (type === 'farm' || type === 'treeOfLife') {
            // Somon/o't tomi — qo'shimcha uchburchak shakl ustiga
            const ridgeH = bH * 0.45;
            ctx.save();
            ctx.fillStyle = type === 'farm' ? '#c8a855' : '#4a8a30';
            ctx.strokeStyle = type === 'farm' ? '#a07830' : '#2a6020';
            ctx.lineWidth = 0.8 * z;
            // Tom yon qirg'og'i (isometrik cho'qqi)
            ctx.beginPath();
            ctx.moveTo(fp.top.x, topPk - ridgeH);
            ctx.lineTo(fp.right.x, pushY(fp.right.y) - bH);
            ctx.lineTo(fp.bottom.x, btmY);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(fp.top.x, topPk - ridgeH);
            ctx.lineTo(fp.left.x, pushY(fp.left.y) - bH);
            ctx.lineTo(fp.bottom.x, btmY);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Ridge line
            ctx.strokeStyle = type === 'farm' ? '#e0c070' : '#80c050';
            ctx.lineWidth = 1.2 * z;
            ctx.beginPath();
            ctx.moveTo(fp.top.x, topPk - ridgeH);
            ctx.lineTo(fp.bottom.x, btmY);
            ctx.stroke();
            ctx.restore();
        }

        // ── Villa — tuproq g'isht, yon deraza ────────────────────────────────
        else if (type === 'villa') {
            // Derazalar (2 ta) — old tomonda
            if (bH > 8 * z) {
                ctx.save();
                // Chap tomonida deraza
                const wx1 = fp.left.x + 5*z;
                const wy1 = pushY(fp.left.y) - bH * 0.6;
                ctx.fillStyle = '#1a2a3a';
                ctx.beginPath();
                ctx.moveTo(wx1,      wy1);
                ctx.lineTo(wx1+5*z,  wy1+2.5*z);
                ctx.lineTo(wx1+5*z,  wy1+8*z);
                ctx.lineTo(wx1,      wy1+5.5*z);
                ctx.fill();
                ctx.fillStyle = 'rgba(180,220,255,0.25)';
                ctx.fill();
                // O'ng tomoni deraza
                const wx2 = fp.bottom.x + 5*z;
                const wy2 = pushY(fp.bottom.y) - bH * 0.65;
                ctx.fillStyle = '#1a2a3a';
                ctx.beginPath();
                ctx.moveTo(wx2,      wy2);
                ctx.lineTo(wx2+5*z,  wy2-2.5*z);
                ctx.lineTo(wx2+5*z,  wy2+3*z);
                ctx.lineTo(wx2,      wy2+5.5*z);
                ctx.fill();
                // Eshik
                ctx.fillStyle = '#5a3a1a';
                ctx.beginPath();
                ctx.moveTo(fp.cx - 3*z, btmY + 2*z);
                ctx.lineTo(fp.cx + 3*z, btmY);
                ctx.lineTo(fp.cx + 3*z, btmY + 7*z);
                ctx.lineTo(fp.cx - 3*z, btmY + 9*z);
                ctx.fill();
                ctx.restore();
            }
        }

        // ── Barracks — qizil brikcha, qo'riqchi nuqtalar ────────────────────
        else if (type === 'barracks') {
            if (bH > 8 * z) {
                ctx.save();
                // Bayroq ustuni
                const flagX = fp.top.x;
                const flagY = topPk - 8 * z;
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 0.8 * z;
                ctx.beginPath();
                ctx.moveTo(flagX, flagY);
                ctx.lineTo(flagX, flagY - 12 * z);
                ctx.stroke();
                // Bayroq
                ctx.fillStyle = level >= 5 ? '#ffd700' : '#ef5350';
                ctx.beginPath();
                ctx.moveTo(flagX, flagY - 12 * z);
                ctx.lineTo(flagX + 7 * z, flagY - 9 * z);
                ctx.lineTo(flagX, flagY - 6 * z);
                ctx.fill();
                // Emblem
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.beginPath();
                ctx.arc(fp.cx, topCy, 4 * z, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // ── ArcherTower — burchak minorasi shakli ───────────────────────────
        else if (type === 'archerTower') {
            // Battlements (merlon) — 4 ta tish
            ctx.save();
            const battleH = 4 * z;
            const battleW = 3 * z;
            ctx.fillStyle = c.top;
            ctx.strokeStyle = c.outline;
            ctx.lineWidth = 0.6 * z;
            const positions = [
                { x: fp.top.x - battleW, y: topPk - battleH },
                { x: fp.top.x + battleW, y: topPk - battleH },
                { x: fp.right.x - battleW*1.5, y: pushY(fp.right.y) - bH - battleH * 0.5 },
                { x: fp.left.x + battleW*1.5, y: pushY(fp.left.y) - bH - battleH * 0.5 },
            ];
            for (const p of positions) {
                ctx.beginPath();
                ctx.rect(p.x - battleW * 0.5, p.y, battleW, battleH);
                ctx.fill();
                ctx.stroke();
            }
            // Archer slit
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.rect(fp.cx - 1.5 * z, pushY(fp.bottom.y) - bH * 0.7, 3 * z, 5 * z);
            ctx.fill();
            ctx.restore();
        }

        // ── GoldStorage — altın çemberli büyük kutu ───────────────────────
        else if (type === 'goldStorage') {
            ctx.save();
            // Metalik band çizgileri
            const bands = [0.35, 0.65];
            for (const bf of bands) {
                const by = pushY(fp.bottom.y) - bH * bf;
                ctx.strokeStyle = '#c8901a';
                ctx.lineWidth = 1.5 * z;
                ctx.beginPath();
                ctx.moveTo(fp.left.x, by - bH * bf * 0.1);
                ctx.lineTo(fp.bottom.x, by);
                ctx.lineTo(fp.right.x, by - bH * bf * 0.1);
                ctx.stroke();
            }
            // Kilit
            ctx.fillStyle = '#a07010';
            ctx.beginPath();
            ctx.arc(fp.bottom.x + 4*z, pushY(fp.bottom.y) - bH * 0.5, 3 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── FoodStorage — katta bochka ────────────────────────────────────
        else if (type === 'foodStorage') {
            ctx.save();
            // Bochka halqalari
            const bochkaColors = ['#c03820', '#e04830'];
            for (let i = 0; i < 3; i++) {
                const ringY = pushY(fp.bottom.y) - bH * (0.25 + i * 0.25);
                ctx.strokeStyle = bochkaColors[i % 2];
                ctx.lineWidth = 1.2 * z;
                ctx.beginPath();
                ctx.ellipse(fp.cx, ringY, (fp.right.x - fp.left.x) * 0.45, bH * 0.06, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── Mudofaa qurollari — uchli parta ───────────────────────────────
        else if (['scorpio','tormenta','flamingCitadel'].includes(type)) {
            ctx.save();
            // Yon panjaraviy (buttress) lines
            ctx.strokeStyle = c.outline;
            ctx.lineWidth = 0.7 * z;
            for (let i = 1; i < 3; i++) {
                const lx = fp.left.x + (fp.bottom.x - fp.left.x) * (i / 3);
                const ly = pushY(fp.left.y) + (pushY(fp.bottom.y) - pushY(fp.left.y)) * (i / 3) - bH;
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.lineTo(lx, ly + bH * 0.6);
                ctx.stroke();
            }
            // Flameburst nozzle — tormenta yoki flamingCitadel uchun
            if (type === 'flamingCitadel') {
                ctx.fillStyle = '#ff6d00';
                ctx.beginPath();
                ctx.arc(fp.cx, topCy - bH * 0.1, 3 * z, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ff3d00';
                ctx.lineWidth = 0.8 * z;
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── MagicTower — binafsha aura, kristall ustun ───────────────────
        else if (type === 'magicTower') {
            ctx.save();
            // Markaziy kristall ustun
            const crystalH = bH * 0.55;
            const crystalW = 5 * z;
            // Ustun tanasi
            ctx.fillStyle = '#7b1fa2';
            ctx.beginPath();
            ctx.moveTo(fp.cx - crystalW, topCy + crystalH * 0.3);
            ctx.lineTo(fp.cx, topCy - crystalH);
            ctx.lineTo(fp.cx + crystalW, topCy + crystalH * 0.3);
            ctx.closePath();
            ctx.fill();
            // Kristall glow
            ctx.fillStyle = 'rgba(206,147,216,0.55)';
            ctx.beginPath();
            ctx.arc(fp.cx, topCy, crystalW * 1.4, 0, Math.PI * 2);
            ctx.fill();
            // Burchak rune toshlar (4 ta kichik)
            const runeR = 2.5 * z;
            const runePositions = [
                { x: fp.cx - 9*z, y: topCy + 3*z },
                { x: fp.cx + 9*z, y: topCy + 3*z },
                { x: fp.cx - 6*z, y: topCy + 8*z },
                { x: fp.cx + 6*z, y: topCy + 8*z },
            ];
            ctx.fillStyle = '#ce93d8';
            for (const rp of runePositions) {
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, runeR, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── InfernoColumn — olov ustuni ──────────────────────────────────
        else if (type === 'infernoColumn') {
            ctx.save();
            // Ustun bazasi — 2 qavatli pog'ona
            const stepH = bH * 0.15;
            ctx.fillStyle = '#b71c1c';
            ctx.beginPath();
            ctx.moveTo(fp.left.x + 4*z, topCy + stepH);
            ctx.lineTo(fp.bottom.x,     topCy + stepH * 2);
            ctx.lineTo(fp.right.x - 4*z, topCy + stepH);
            ctx.lineTo(fp.top.x,        topCy);
            ctx.closePath();
            ctx.fill();
            // Markaziy olov halqasi
            ctx.strokeStyle = '#ff6d00';
            ctx.lineWidth = 2 * z;
            ctx.beginPath();
            ctx.arc(fp.cx, topCy + 2*z, 5 * z, 0, Math.PI * 2);
            ctx.stroke();
            // Olov nuri
            ctx.fillStyle = '#ff3d00';
            ctx.beginPath();
            ctx.arc(fp.cx, topCy - bH * 0.05, 3 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff6d00';
            ctx.lineWidth = 1 * z;
            ctx.stroke();
            ctx.restore();
        }

        // ── BoltTower — metall qadam minorasi ──────────────────────────
        else if (type === 'boltTower') {
            ctx.save();
            // Panjara to'siqlar
            const barCount = 3;
            ctx.strokeStyle = '#ad1457';
            ctx.lineWidth = 1.5 * z;
            for (let bi = 0; bi < barCount; bi++) {
                const t2 = (bi + 0.5) / barCount;
                const bx2 = fp.left.x + (fp.top.x - fp.left.x) * t2;
                const by2 = pushY(fp.left.y) + (pushY(fp.top.y) - pushY(fp.left.y)) * t2 - bH * 0.8;
                ctx.beginPath();
                ctx.moveTo(bx2, by2);
                ctx.lineTo(bx2, by2 + bH * 0.5);
                ctx.stroke();
            }
            // Elektr halqa
            ctx.strokeStyle = '#f03278';
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            ctx.ellipse(fp.cx, topCy + 3*z, 6*z, 3*z, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Markaziy silindr
            ctx.fillStyle = '#880e4f';
            ctx.beginPath();
            ctx.arc(fp.cx, topCy, 3.5 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── LegionForum — tadqiqot binosi, kitob va minora ───────────────
        else if (type === 'legionForum') {
            ctx.save();
            // Markaziy kolonna
            ctx.strokeStyle = '#3f51b5';
            ctx.lineWidth = 2 * z;
            ctx.beginPath();
            ctx.moveTo(fp.cx, topCy);
            ctx.lineTo(fp.cx, topCy - bH * 0.5);
            ctx.stroke();
            // Kapitel (ustun boshi)
            ctx.fillStyle = '#5c6bc0';
            ctx.beginPath();
            ctx.moveTo(fp.cx - 5*z, topCy - bH * 0.5);
            ctx.lineTo(fp.cx + 5*z, topCy - bH * 0.5 - 2*z);
            ctx.lineTo(fp.cx + 5*z, topCy - bH * 0.5 + 2*z);
            ctx.lineTo(fp.cx - 5*z, topCy - bH * 0.5 + 4*z);
            ctx.closePath();
            ctx.fill();
            // 3 ta old ustun
            ctx.strokeStyle = '#7986cb';
            ctx.lineWidth = 1.2 * z;
            for (let ci = 0; ci < 3; ci++) {
                const cx2 = fp.cx + (ci - 1) * 6 * z;
                ctx.beginPath();
                ctx.moveTo(cx2, topCy + 4*z);
                ctx.lineTo(cx2, topCy - bH * 0.35);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── Blacksmith — do'kon, mixcha va eshik ─────────────────────────
        else if (type === 'blacksmith') {
            ctx.save();
            // Baca — tutun chiquvchi
            const chimneyX = fp.top.x - 4*z;
            const chimneyY = topPk - bH * 0.4;
            ctx.fillStyle = '#4e342e';
            ctx.beginPath();
            ctx.moveTo(chimneyX - 2*z, chimneyY);
            ctx.lineTo(chimneyX + 2*z, chimneyY - 1*z);
            ctx.lineTo(chimneyX + 2*z, chimneyY - 8*z);
            ctx.lineTo(chimneyX - 2*z, chimneyY - 7*z);
            ctx.closePath();
            ctx.fill();
            // Baca og'zi
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 0.8 * z;
            ctx.beginPath();
            ctx.moveTo(chimneyX - 3*z, chimneyY - 8*z);
            ctx.lineTo(chimneyX + 3*z, chimneyY - 9*z);
            ctx.stroke();
            // Eshik yoy (arched door)
            ctx.fillStyle = '#1a0f00';
            const dox = fp.cx;
            const doy = pushY(fp.bottom.y) - bH * 0.25;
            ctx.beginPath();
            ctx.moveTo(dox - 3*z, doy + 4*z);
            ctx.lineTo(dox - 3*z, doy);
            ctx.arc(dox, doy, 3*z, Math.PI, 0);
            ctx.lineTo(dox + 3*z, doy + 4*z);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // ── MusterGround — harbiy lager, chodirlar ────────────────────────
        else if (type === 'musterGround') {
            ctx.save();
            // Bayroq ustuni
            const fmx = fp.cx + 4*z;
            const fmy = topCy - 2*z;
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 0.8 * z;
            ctx.beginPath();
            ctx.moveTo(fmx, fmy);
            ctx.lineTo(fmx, fmy - 14*z);
            ctx.stroke();
            ctx.fillStyle = level >= 4 ? '#ffd700' : '#9c27b0';
            ctx.beginPath();
            ctx.moveTo(fmx, fmy - 14*z);
            ctx.lineTo(fmx + 8*z, fmy - 11*z);
            ctx.lineTo(fmx, fmy - 8*z);
            ctx.fill();
            // Kichik chodir shakl
            ctx.fillStyle = '#6a1b9a';
            ctx.beginPath();
            ctx.moveTo(fp.cx - 8*z, topCy + 2*z);
            ctx.lineTo(fp.cx,       topCy - 3*z);
            ctx.lineTo(fp.cx + 8*z, topCy + 2*z);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#4a0a7a';
            ctx.lineWidth = 0.8 * z;
            ctx.stroke();
            ctx.restore();
        }

        // ── SpellFactory — alxemiya qozon ─────────────────────────────────────
        else if (type === 'spellFactory') {
            ctx.save();
            // Qozon — alxemiya qozon
            ctx.fillStyle = '#00695c';
            ctx.beginPath();
            ctx.ellipse(fp.cx, topCy + 2*z, 7*z, 4*z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#004d40';
            ctx.lineWidth = 1 * z;
            ctx.stroke();
            // Qaynash pufakchalari
            ctx.fillStyle = '#26a69a';
            for (let bi2 = 0; bi2 < 3; bi2++) {
                ctx.beginPath();
                ctx.arc(fp.cx + (bi2 - 1) * 4*z, topCy - 2*z, 2*z, 0, Math.PI * 2);
                ctx.fill();
            }
            // Stol ustidagi shisha (flask)
            ctx.fillStyle = '#4dd0e1';
            ctx.beginPath();
            ctx.ellipse(fp.cx - 8*z, topCy + 1*z, 2.5*z, 1.5*z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Academy — kutubxona ustunlari, gumbaz ──────────────────────────────
        else if (type === 'academy') {
            ctx.save();
            // 3 ta ustun (front facade)
            ctx.strokeStyle = '#5b8ec4';
            ctx.lineWidth = 1.8 * z;
            for (let ci = 0; ci < 3; ci++) {
                const cx3 = fp.cx + (ci - 1) * 7 * z;
                ctx.beginPath();
                ctx.moveTo(cx3, btmY + 1*z);
                ctx.lineTo(cx3, topCy - bH * 0.25);
                ctx.stroke();
            }
            // Ustun boshi (kapitel friiz)
            ctx.strokeStyle = '#7ab8e8';
            ctx.lineWidth = 1.2 * z;
            ctx.beginPath();
            ctx.moveTo(fp.cx - 10*z, topCy - bH * 0.25 - 1*z);
            ctx.lineTo(fp.cx + 10*z, topCy - bH * 0.25 - 3*z);
            ctx.stroke();
            // Markaziy gumbaz
            const domeR = 5 * z;
            ctx.fillStyle = '#2c5a88';
            ctx.beginPath();
            ctx.ellipse(fp.cx, topCy - bH * 0.3 - domeR, domeR * 1.4, domeR, -0.2, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = '#3d7ab5';
            ctx.lineWidth = 0.8 * z;
            ctx.stroke();
            // Kitob belgisi (top face)
            ctx.fillStyle = '#d4e8ff';
            ctx.font = `${Math.max(7, 9*z)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('📖', fp.cx, topCy + 1*z);
            ctx.restore();
        }

        // ── CloudBuster — havo minorasi, uch barrel ──────────────────────────
        else if (type === 'cloudBuster') {
            ctx.save();
            // Markaziy ustun/baril
            ctx.fillStyle = '#5e35b1';
            ctx.beginPath();
            ctx.moveTo(fp.cx - 3*z, topCy + 2*z);
            ctx.lineTo(fp.cx + 3*z, topCy);
            ctx.lineTo(fp.cx + 3*z, topCy - bH * 0.7);
            ctx.lineTo(fp.cx - 3*z, topCy - bH * 0.7 + 2*z);
            ctx.closePath();
            ctx.fill();
            // Uchki nozul (barrel end)
            ctx.fillStyle = '#9c27b0';
            ctx.beginPath();
            ctx.ellipse(fp.cx, topCy - bH * 0.7, 4*z, 2*z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#7c4dff';
            ctx.lineWidth = 0.8 * z;
            ctx.stroke();
            // 2 ta yon tayanch (struts)
            ctx.strokeStyle = '#4a148c';
            ctx.lineWidth = 1.2 * z;
            for (let si = -1; si <= 1; si += 2) {
                ctx.beginPath();
                ctx.moveTo(fp.cx + si * 8*z, topCy + 4*z);
                ctx.lineTo(fp.cx + si * 3*z, topCy - bH * 0.5);
                ctx.stroke();
            }
            // Elektr halqa
            ctx.strokeStyle = 'rgba(179,136,255,0.7)';
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            ctx.ellipse(fp.cx, topCy - bH * 0.2, 7*z, 3.5*z, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // ── Praetorium — Roman shtab binosi, ustunlar, bayroq ────────────────
        else if (type === 'praetorium') {
            ctx.save();
            // Frontispiece — 2 ta ustun
            ctx.strokeStyle = '#c8a460';
            ctx.lineWidth = 2 * z;
            for (let ci = 0; ci < 2; ci++) {
                const cx4 = fp.cx + (ci === 0 ? -6*z : 6*z);
                ctx.beginPath();
                ctx.moveTo(cx4, btmY + 2*z);
                ctx.lineTo(cx4, topCy - bH * 0.2);
                ctx.stroke();
            }
            // Pediment (uchburchak fasad)
            ctx.fillStyle = '#a07030';
            ctx.strokeStyle = '#785010';
            ctx.lineWidth = 0.8 * z;
            ctx.beginPath();
            ctx.moveTo(fp.cx - 9*z, topCy - bH * 0.2 + 1*z);
            ctx.lineTo(fp.cx,       topCy - bH * 0.45);
            ctx.lineTo(fp.cx + 9*z, topCy - bH * 0.2 - 1*z);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Bayroq
            const fmx2 = fp.cx + 2*z;
            const fmy2 = topCy - bH * 0.45 - 1*z;
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 0.8 * z;
            ctx.beginPath();
            ctx.moveTo(fmx2, fmy2);
            ctx.lineTo(fmx2, fmy2 - 10*z);
            ctx.stroke();
            ctx.fillStyle = level >= 5 ? '#ffd700' : '#c62828';
            ctx.beginPath();
            ctx.moveTo(fmx2, fmy2 - 10*z);
            ctx.lineTo(fmx2 + 6*z, fmy2 - 8*z);
            ctx.lineTo(fmx2, fmy2 - 6*z);
            ctx.fill();
            ctx.restore();
        }

        // ── Militia — qo'riqchi post, nayzalar ────────────────────────────────
        else if (type === 'militia') {
            ctx.save();
            // 2 ta nayza / palisad
            ctx.strokeStyle = '#7b5e3a';
            ctx.lineWidth = 1.5 * z;
            for (let ni = -1; ni <= 1; ni += 2) {
                const nx = fp.cx + ni * 7*z;
                const ny = topCy + 3*z;
                ctx.beginPath();
                ctx.moveTo(nx, ny + 4*z);
                ctx.lineTo(nx, ny - bH * 0.5);
                ctx.stroke();
                // Uchi
                ctx.fillStyle = '#b0b0b0';
                ctx.beginPath();
                ctx.moveTo(nx - 1.5*z, ny - bH * 0.5);
                ctx.lineTo(nx,         ny - bH * 0.5 - 5*z);
                ctx.lineTo(nx + 1.5*z, ny - bH * 0.5);
                ctx.fill();
            }
            // Kichik qalqon (front face)
            ctx.fillStyle = '#4a0a7a';
            ctx.strokeStyle = '#7b1fa2';
            ctx.lineWidth = 0.8 * z;
            ctx.beginPath();
            ctx.ellipse(fp.cx + 4*z, topCy - bH * 0.1, 3.5*z, 4.5*z, 0.3, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            // Qalqon markazi (emblem)
            ctx.fillStyle = '#e040fb';
            ctx.beginPath();
            ctx.arc(fp.cx + 4*z, topCy - bH * 0.1, 1.5*z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── CityHall — buyuk manzil, oltin gumbaz + ustunlar ─────────────────
        else if (type === 'cityHall') {
            ctx.save();
            // 4 ta massiv ustun
            ctx.strokeStyle = '#e0c060';
            ctx.lineWidth = 2.5 * z;
            for (let ci = 0; ci < 4; ci++) {
                const cx5 = fp.cx + (ci - 1.5) * 6 * z;
                ctx.beginPath();
                ctx.moveTo(cx5, btmY);
                ctx.lineTo(cx5, topCy - bH * 0.25);
                ctx.stroke();
            }
            // Entablatur
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2 * z;
            ctx.beginPath();
            ctx.moveTo(fp.cx - 14*z, topCy - bH * 0.25);
            ctx.lineTo(fp.cx + 14*z, topCy - bH * 0.29);
            ctx.stroke();
            // Gumbaz
            const gR = 7 * z;
            const gY = topCy - bH * 0.5;
            const goldGrd = ctx.createRadialGradient(fp.cx - gR*0.3, gY - gR*0.3, 0, fp.cx, gY, gR);
            goldGrd.addColorStop(0, '#fff176');
            goldGrd.addColorStop(0.6, '#ffd700');
            goldGrd.addColorStop(1, '#f9a825');
            ctx.fillStyle = goldGrd;
            ctx.beginPath();
            ctx.ellipse(fp.cx, gY, gR * 1.2, gR, -0.2, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = '#f57f17';
            ctx.lineWidth = 1 * z;
            ctx.stroke();
            // Gumbaz tepasida xoch/yulduz
            ctx.fillStyle = '#ffd700';
            ctx.font = `${Math.max(8, 10*z)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('★', fp.cx, gY - gR - 3*z);
            ctx.restore();
        }

        // ── GemMine — kristall nuqtalar, qazish ────────────────────────────────
        else if (type === 'gemMine') {
            ctx.save();
            // 3 ta turli o'lchamdagi kristall
            const crystals = [
                { ox: -5*z, h: bH * 0.45, w: 3.5*z, col: '#40e0d0' },
                { ox:  2*z, h: bH * 0.6,  w: 4*z,   col: '#80ffea' },
                { ox:  9*z, h: bH * 0.35, w: 2.5*z, col: '#00bcd4' },
            ];
            for (const cr of crystals) {
                const cx6 = fp.cx + cr.ox;
                const cy6 = topCy + 2*z;
                ctx.fillStyle = cr.col;
                ctx.strokeStyle = '#006064';
                ctx.lineWidth = 0.6 * z;
                ctx.beginPath();
                ctx.moveTo(cx6 - cr.w, cy6);
                ctx.lineTo(cx6,        cy6 - cr.h);
                ctx.lineTo(cx6 + cr.w, cy6);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Kristall parrak (highlight)
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.moveTo(cx6, cy6 - cr.h);
                ctx.lineTo(cx6 + cr.w * 0.4, cy6 - cr.h * 0.4);
                ctx.lineTo(cx6 + cr.w * 0.7, cy6 - cr.h * 0.1);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // ── Statue types — poydevor + silhouet ────────────────────────────────
        else if (['legatusStatue','aquiliferStatue','praetoranStatue','imperatriceStatue'].includes(type)) {
            ctx.save();
            // Poydevor (pedestal)
            const pedW = 8 * z, pedH = bH * 0.25;
            ctx.fillStyle = c.left;
            ctx.strokeStyle = c.outline;
            ctx.lineWidth = 0.8 * z;
            ctx.beginPath();
            ctx.moveTo(fp.cx - pedW, topCy + pedH);
            ctx.lineTo(fp.bottom.x,  topCy + pedH * 1.5);
            ctx.lineTo(fp.cx + pedW, topCy + pedH);
            ctx.lineTo(fp.top.x,     topCy);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Shaxs (stilize vertikal shakl)
            const figH = bH * 0.65;
            const figW = 4 * z;
            ctx.fillStyle = c.top;
            ctx.beginPath();
            // Gavda
            ctx.moveTo(fp.cx - figW * 0.5, topCy);
            ctx.lineTo(fp.cx + figW * 0.5, topCy - 1*z);
            ctx.lineTo(fp.cx + figW * 0.5, topCy - figH * 0.6);
            ctx.lineTo(fp.cx - figW * 0.5, topCy - figH * 0.6 + 1*z);
            ctx.closePath();
            ctx.fill();
            // Bosh (doira)
            ctx.beginPath();
            ctx.arc(fp.cx, topCy - figH * 0.7, figW * 0.6, 0, Math.PI * 2);
            ctx.fill();
            // Imperiya belgisi (tur bo'yicha rang)
            const emblemColor = {
                legatusStatue: '#ffd700',
                aquiliferStatue: '#c8a060',
                praetoranStatue: '#e0e8f0',
                imperatriceStatue: '#f48fb1',
            }[type] || '#fff';
            ctx.fillStyle = emblemColor;
            ctx.font = `${Math.max(6, 8*z)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const emblemIcon = { legatusStatue:'⚔️', aquiliferStatue:'🦅', praetoranStatue:'🛡️', imperatriceStatue:'👑' }[type];
            ctx.fillText(emblemIcon, fp.cx, topCy - figH * 0.35);
            ctx.restore();
        }

        // ── Tuzoqlar — kichik detallar ────────────────────────────────────
        else if (type === 'spikeTrap') {
            ctx.save();
            // 5 ta tikan
            ctx.fillStyle = '#757575';
            ctx.strokeStyle = '#424242';
            ctx.lineWidth = 0.5 * z;
            for (let si = 0; si < 5; si++) {
                const sx2 = fp.cx + (si - 2) * 5*z;
                const sy2 = topCy + 2*z;
                ctx.beginPath();
                ctx.moveTo(sx2 - 2*z, sy2 + 4*z);
                ctx.lineTo(sx2,       sy2 - 4*z);
                ctx.lineTo(sx2 + 2*z, sy2 + 4*z);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
            }
            ctx.restore();
        }

        else if (type === 'poisonTrap') {
            ctx.save();
            // Kichik qozon
            ctx.fillStyle = '#388e3c';
            ctx.beginPath();
            ctx.ellipse(fp.cx, topCy + 2*z, 6*z, 3.5*z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1b5e20';
            ctx.lineWidth = 0.8 * z;
            ctx.stroke();
            // Zahar belgi
            ctx.fillStyle = '#69f0ae';
            ctx.font = `${Math.max(8, 9*z)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☠', fp.cx, topCy + 2*z);
            ctx.restore();
        }

        else if (type === 'alchemicalTrap') {
            ctx.save();
            // Qo'ng'iroq shakl
            ctx.fillStyle = '#00838f';
            ctx.beginPath();
            ctx.ellipse(fp.cx, topCy + 2*z, 5.5*z, 3*z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#006064';
            ctx.lineWidth = 0.8 * z;
            ctx.stroke();
            // Spiral chiziq
            ctx.strokeStyle = '#4dd0e1';
            ctx.lineWidth = 1 * z;
            ctx.beginPath();
            ctx.arc(fp.cx, topCy + 1*z, 3*z, 0, Math.PI);
            ctx.stroke();
            ctx.restore();
        }

        // ── BuilderHut — yog'och tom, kichik eshik, panjara ────────────────
        else if (type === 'builderHut') {
            if (bH > 6 * z) {
                ctx.save();
                // Yog'och tom — uchburchak qoya
                const ridgeH = bH * 0.55;
                ctx.fillStyle = '#8a5820';
                ctx.strokeStyle = '#5a3410';
                ctx.lineWidth = 0.9 * z;
                // Tom old yarmi (o'ng)
                ctx.beginPath();
                ctx.moveTo(fp.cx, topPk - ridgeH);
                ctx.lineTo(fp.right.x, pushY(fp.right.y) - bH);
                ctx.lineTo(fp.bottom.x, btmY);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Tom orqa yarmi (chap)
                ctx.fillStyle = '#6a4010';
                ctx.beginPath();
                ctx.moveTo(fp.cx, topPk - ridgeH);
                ctx.lineTo(fp.left.x, pushY(fp.left.y) - bH);
                ctx.lineTo(fp.bottom.x, btmY);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Ridge (tep chizig'i)
                ctx.strokeStyle = '#c8803a';
                ctx.lineWidth = 1.4 * z;
                ctx.beginPath();
                ctx.moveTo(fp.cx, topPk - ridgeH);
                ctx.lineTo(fp.bottom.x, btmY);
                ctx.stroke();
                // Yog'och taxtalar (tom chiziqlari)
                ctx.strokeStyle = 'rgba(90,50,20,0.35)';
                ctx.lineWidth = 0.7 * z;
                for (let i = 1; i < 3; i++) {
                    const ty2 = pushY(fp.right.y) - bH + (btmY - (pushY(fp.right.y) - bH)) * i / 3;
                    const ty3 = pushY(fp.left.y)  - bH + (btmY - (pushY(fp.left.y) - bH))  * i / 3;
                    const tx2 = fp.right.x + (fp.bottom.x - fp.right.x) * i / 3;
                    const tx3 = fp.left.x  + (fp.bottom.x - fp.left.x)  * i / 3;
                    const topX = fp.cx + (fp.bottom.x - fp.cx) * i / 3;
                    const topY = (topPk - ridgeH) + (btmY - (topPk - ridgeH)) * i / 3;
                    ctx.beginPath();
                    ctx.moveTo(topX, topY); ctx.lineTo(tx2, ty2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(topX, topY); ctx.lineTo(tx3, ty3);
                    ctx.stroke();
                }
                // Kichik eshik
                const dw = 4 * z, dh = 7 * z;
                const dx = fp.cx - dw * 0.5;
                const dy = btmY - dh * 0.15;
                ctx.fillStyle = '#4a2e10';
                ctx.beginPath();
                ctx.moveTo(dx,      dy + dh * 0.1);
                ctx.lineTo(dx + dw, dy - dh * 0.1);
                ctx.lineTo(dx + dw, dy + dh);
                ctx.lineTo(dx,      dy + dh * 1.2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#2a1a06';
                ctx.lineWidth = 0.6 * z;
                ctx.stroke();
                // Eshik topshirig'i
                ctx.beginPath();
                ctx.arc(dx + dw * 0.75, dy + dh * 0.6, 1.2 * z, 0, Math.PI * 2);
                ctx.fillStyle = '#ffd700';
                ctx.fill();
                ctx.restore();
            }
        }

        // ── Default — deraza va eshik ──────────────────────────────────────
        else if (bH > 10 * z) {
            ctx.fillStyle = '#111';
            // Chap deraza
            ctx.beginPath();
            ctx.moveTo(fp.left.x + 8*z, pushY(fp.left.y) - bH/2 + 2*z);
            ctx.lineTo(fp.left.x + 14*z, pushY(fp.left.y) - bH/2 + 5*z);
            ctx.lineTo(fp.left.x + 14*z, pushY(fp.left.y) - bH/2 + 10*z);
            ctx.lineTo(fp.left.x + 8*z, pushY(fp.left.y) - bH/2 + 7*z);
            ctx.fill();
            // Eshik
            ctx.beginPath();
            ctx.moveTo(fp.bottom.x + 8*z, pushY(fp.bottom.y) - 12*z);
            ctx.lineTo(fp.bottom.x + 16*z, pushY(fp.bottom.y) - 16*z);
            ctx.lineTo(fp.bottom.x + 16*z, pushY(fp.bottom.y) - 4*z);
            ctx.lineTo(fp.bottom.x + 8*z, pushY(fp.bottom.y) - 0*z);
            ctx.fill();
        }
    },

    _getColor(type) {
        const s = {
            cityHall:{top:'#e8c840',left:'#c4a030',right:'#a08020',outline:'#806010'},
            villa:{top:'#f0d080',left:'#d0b060',right:'#b09040',outline:'#907030'},
            goldStorage:{top:'#e8b020',left:'#c89818',right:'#a87810',outline:'#886010'},
            farm:{top:'#90c850',left:'#70a838',right:'#508820',outline:'#406818'},
            foodStorage:{top:'#e06040',left:'#c04830',right:'#a03020',outline:'#802018'},
            treeOfLife:{top:'#50b850',left:'#389838',right:'#207820',outline:'#186018'},
            goldenAppleStorage:{top:'#c8d830',left:'#a8b820',right:'#889810',outline:'#687808'},
            barracks:{top:'#c05050',left:'#a03838',right:'#802828',outline:'#601818'},
            musterGround:{top:'#9060b0',left:'#704890',right:'#503070',outline:'#402060'},
            blacksmith:{top:'#8d6e63',left:'#6d4e43',right:'#4d3e33',outline:'#3d2e23'},
            legionForum:{top:'#5060b0',left:'#384890',right:'#283070',outline:'#182060'},
            academy:{top:'#3d7ab5',left:'#2c5a88',right:'#1c3a5a',outline:'#0d2038'},
            wall:{top:'#a0a0a0',left:'#808080',right:'#606060',outline:'#404040'},
            gate:{top:'#8090a0',left:'#607080',right:'#405060',outline:'#304050'},
            archerTower:{top:'#c07040',left:'#a05828',right:'#804018',outline:'#603010'},
            scorpio:{top:'#d09030',left:'#b07020',right:'#905010',outline:'#704008'},
            tormenta:{top:'#4080c0',left:'#3060a0',right:'#204080',outline:'#183060'},
            flamingCitadel:{top:'#e04020',left:'#c03010',right:'#a02008',outline:'#801008'},
            spikeTrap:{top:'#707070',left:'#505050',right:'#383838',outline:'#282828'},
            militia:{top:'#7050a0',left:'#503880',right:'#382860',outline:'#281850'},
            magicTower:{top:'#c060e0',left:'#9040c0',right:'#6820a0',outline:'#501880'},
            poisonTrap:{top:'#60b860',left:'#408840',right:'#286828',outline:'#184818'},
            alchemicalTrap:{top:'#40b8b8',left:'#208898',right:'#106878',outline:'#084858'},
            praetorium:{top:'#8b6914',left:'#6b4e0a',right:'#4b3606',outline:'#2b1e03'},
            infernoColumn:{top:'#ef5350',left:'#c62828',right:'#b71c1c',outline:'#7f0000'},
            boltTower:{top:'#e91e63',left:'#c2185b',right:'#880e4f',outline:'#560027'},
            cloudBuster:{top:'#7c4dff',left:'#6200ea',right:'#4a00c4',outline:'#2a0080'},
            spellFactory:{top:'#26a69a',left:'#00796b',right:'#004d40',outline:'#003329'},
            builderHut:{top:'#d4a454',left:'#a87834',right:'#7a5220',outline:'#4a2e0e'},
            gemMine:{top:'#40e0d0',left:'#20b0a0',right:'#108080',outline:'#085858'},
            legatusStatue:{top:'#ffd700',left:'#d4a017',right:'#a07800',outline:'#785800'},
            aquiliferStatue:{top:'#c8a060',left:'#a07840',right:'#785030',outline:'#503020'},
            praetoranStatue:{top:'#c0c8d0',left:'#9098a8',right:'#607080',outline:'#404860'},
            imperatriceStatue:{top:'#d070c8',left:'#a040a0',right:'#782080',outline:'#501060'}
        };
        return s[type] || s.wall;
    },

    _proceduralCache: {},

    _getCachedProcedural(type, z, bH, level = 1) {
        const bd = BUILDING_DATA[type];
        if (!bd) return null; // noma'lum bino turi — null qaytarish
        // zoom va bH ni yaxlitlash — float keylar tufayli cheksiz o'sib ketmaslik uchun
        const zKey  = Math.round(z * 20) / 20;   // 0.05 qadam (20 daraja)
        const bHKey = Math.round(bH);
        const key = `${type}_${zKey}_${bHKey}_lv${level}`;
        if (this._proceduralCache[key]) return this._proceduralCache[key];
        // Cache hajmi cheklov — eski entry'larni tozalash (>400 bo'lsa yarmi o'chiriladi)
        const cacheKeys = Object.keys(this._proceduralCache);
        if (cacheKeys.length > 400) {
            for (let i = 0; i < 200; i++) delete this._proceduralCache[cacheKeys[i]];
        }

        const w = bd.size[0];
        const h = bd.size[1];
        
        // Asosiy o'lchamlar
        const hw = Grid.TILE_W * z / 2;
        const hh = Grid.TILE_H * z / 2;
        
        // Footprint (0,0 dan boshlab)
        const fp = {
            top: { x: hw * (w + h)/2, y: hh * Math.abs(w - h)/2 },
            right: { x: hw * (w + h), y: hh * h },
            bottom: { x: hw * (w + h)/2, y: hh * (w + h) },
            left: { x: 0, y: hh * w },
            cx: hw * (w + h)/2,
            cy: hh * (w + h)/2
        };

        const canvas = document.createElement('canvas');
        canvas.width = fp.right.x + 4;
        // offsetY = bH + max(10*z, 20); canvas.height must equal fp.bottom.y + offsetY so
        // building base aligns exactly with fp.bottom.y when drawn via drawImage
        const offsetY = bH + Math.max(10*z, 20);
        canvas.height = fp.bottom.y + offsetY + 2;
        const ctx = canvas.getContext('2d');
        const pushY = (y) => y + offsetY;

        const c = this._getColor(type);

        // Chap yon (Gradients bilan)
        const leftGrad = ctx.createLinearGradient(fp.left.x, pushY(fp.left.y), fp.cx, pushY(fp.bottom.y));
        leftGrad.addColorStop(0, c.left); leftGrad.addColorStop(1, c.outline);
        ctx.beginPath();
        ctx.moveTo(fp.left.x, pushY(fp.left.y) - bH);
        ctx.lineTo(fp.bottom.x, pushY(fp.bottom.y) - bH);
        ctx.lineTo(fp.bottom.x, pushY(fp.bottom.y));
        ctx.lineTo(fp.left.x, pushY(fp.left.y));
        ctx.closePath();
        ctx.fillStyle = leftGrad; ctx.fill(); 
        ctx.strokeStyle = c.outline; ctx.lineWidth = 1; ctx.stroke();

        // O'ng yon (Gradients bilan)
        const rightGrad = ctx.createLinearGradient(fp.cx, pushY(fp.bottom.y), fp.right.x, pushY(fp.right.y));
        rightGrad.addColorStop(0, c.right); rightGrad.addColorStop(1, c.outline);
        ctx.beginPath();
        ctx.moveTo(fp.right.x, pushY(fp.right.y) - bH);
        ctx.lineTo(fp.bottom.x, pushY(fp.bottom.y) - bH);
        ctx.lineTo(fp.bottom.x, pushY(fp.bottom.y));
        ctx.lineTo(fp.right.x, pushY(fp.right.y));
        ctx.closePath();
        ctx.fillStyle = rightGrad; ctx.fill(); ctx.stroke();

        // Yuqori yuz (Tom)
        const topGrad = ctx.createRadialGradient(fp.cx, pushY(fp.cy) - bH, 0, fp.cx, pushY(fp.cy) - bH, (fp.right.x - fp.left.x)/2);
        topGrad.addColorStop(0, '#ffffff33'); topGrad.addColorStop(1, c.top);
        ctx.beginPath();
        ctx.moveTo(fp.top.x, pushY(fp.top.y) - bH);
        ctx.lineTo(fp.right.x, pushY(fp.right.y) - bH);
        ctx.lineTo(fp.bottom.x, pushY(fp.bottom.y) - bH);
        ctx.lineTo(fp.left.x, pushY(fp.left.y) - bH);
        ctx.closePath();
        ctx.fillStyle = topGrad; ctx.fill();
        ctx.strokeStyle = c.outline; ctx.lineWidth = 1.5; ctx.stroke();

        // ── Building-tipga xos detallar ──────────────────────────────────────
        this._addProceduralDetails(ctx, type, fp, bH, z, c, level, pushY, w, h);

        // Ikonka (Pufakcha ichida chiroyli)
        ctx.globalAlpha = 1;
        const isz = Math.max(14, 18 * z);
        ctx.beginPath();
        ctx.arc(fp.cx, pushY(fp.cy) - bH + 2*z, isz*0.8, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `${isz}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(bd.icon, fp.cx, pushY(fp.cy) - bH + 2*z);

        // Level-based qatlamcha overlay — yuqori daraja = yiltiroqroq
        if (level >= 5) {
            // Lv5+ — oltin yog'du
            const glowColors = {
                5:'rgba(255,215,0,0.08)', 6:'rgba(255,215,0,0.12)',
                7:'rgba(255,165,0,0.14)', 8:'rgba(0,200,255,0.10)',
                9:'rgba(0,150,255,0.14)', 10:'rgba(180,0,255,0.12)'
            };
            const gc = glowColors[Math.min(level, 10)] || 'rgba(255,215,0,0.08)';
            // Top face overlay
            ctx.beginPath();
            ctx.moveTo(fp.top.x, pushY(fp.top.y) - bH);
            ctx.lineTo(fp.right.x, pushY(fp.right.y) - bH);
            ctx.lineTo(fp.bottom.x, pushY(fp.bottom.y) - bH);
            ctx.lineTo(fp.left.x, pushY(fp.left.y) - bH);
            ctx.closePath();
            ctx.fillStyle = gc;
            ctx.fill();
        }

        this._proceduralCache[key] = canvas;
        return canvas;
    },

    // ── Idle animations — CoC-style jonli ko'rinish ──────────────────────────────
    // Farm/treeOfLife: windmill blades
    // ── Hero uyqusi ZZZ animatsiya ────────────────────────────────────────────
    _drawHeroSleepingZzz(ctx, fp, z, bH) {
        const t = Date.now();
        // 3 ta Z harfi staggered floating up
        const letters = ['z', 'z', 'Z'];
        for (let i = 0; i < 3; i++) {
            const phase  = (i / 3);
            const cycle  = ((t * 0.0007 + phase) % 1.0);
            if (cycle < 0.08) continue;
            const alpha  = Math.sin(cycle * Math.PI) * 0.85;
            const rise   = cycle * 28 * z;
            const ox     = (i - 1) * 7 * z;
            const sz     = (8 + i * 3) * z;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font         = `bold ${sz}px Inter,sans-serif`;
            ctx.fillStyle    = '#81d4fa';
            ctx.strokeStyle  = 'rgba(1,87,155,0.4)';
            ctx.lineWidth    = 1 * z;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            const tx = fp.cx + ox + (fp.right.x - fp.cx) * 0.45;
            const ty = fp.top.y - bH - 10 * z - rise;
            ctx.strokeText(letters[i], tx, ty);
            ctx.fillText(letters[i], tx, ty);
            ctx.restore();
        }
    },

    // Villa/cityHall: chimney smoke rings
    // GoldStorage/FoodStorage: sparkle halo when producing
    // Barracks/musterGround: torch flicker
    _drawIdleAnimation(ctx, b, fp, z, bH) {
        const t    = Date.now();
        const type = b.type;

        // ── Windmill blades (Farm, treeOfLife) ───────────────────────────────
        if (type === 'farm' || type === 'treeOfLife') {
            const speed  = 0.0008 + (b.level || 1) * 0.00005;
            const angle  = t * speed;
            const bladeCount = 4;
            const bx = fp.cx;
            const by = fp.top.y - bH * 0.1;     // windmill hub near top of building
            const hubR   = 3 * z;
            const armLen = (8 + (b.level || 1) * 1.5) * z;
            const bladeW = 3 * z;

            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(angle);

            for (let i = 0; i < bladeCount; i++) {
                const ba = (i / bladeCount) * Math.PI * 2;
                const tipX = Math.cos(ba) * armLen;
                const tipY = Math.sin(ba) * armLen * 0.55;  // isometric flatten
                // Blade body
                const perp = ba + Math.PI * 0.5;
                const px = Math.cos(perp) * bladeW;
                const py = Math.sin(perp) * bladeW * 0.55;
                ctx.beginPath();
                ctx.moveTo(px * 0.3, py * 0.3);
                ctx.lineTo(tipX + px * 0.5, tipY + py * 0.5);
                ctx.lineTo(tipX - px * 0.5, tipY - py * 0.5);
                ctx.lineTo(-px * 0.3, -py * 0.3);
                ctx.closePath();
                const bladeAlpha = 0.72 + Math.sin(ba + angle) * 0.14;
                ctx.fillStyle = type === 'farm'
                    ? `rgba(180,120,60,${bladeAlpha})`
                    : `rgba(80,160,60,${bladeAlpha})`;
                ctx.fill();
                ctx.strokeStyle = 'rgba(60,40,20,0.5)';
                ctx.lineWidth = 0.6 * z;
                ctx.stroke();
            }
            // Hub center
            ctx.beginPath();
            ctx.arc(0, 0, hubR, 0, Math.PI * 2);
            ctx.fillStyle = '#8d5524';
            ctx.fill();
            ctx.strokeStyle = '#4e2d0e';
            ctx.lineWidth = 1 * z;
            ctx.stroke();
            ctx.restore();
        }

        // ── Chimney smoke (Villa, cityHall, praetorium, goldStorage) ─────────
        if (['villa','cityHall','praetorium'].includes(type)) {
            // Smoke puff — 3 ta doira floating up
            const chimneyX = fp.cx + (fp.right.x - fp.cx) * 0.25;
            const chimneyY = fp.top.y - bH * 0.85;
            const puffCount = 3;
            for (let pi = 0; pi < puffCount; pi++) {
                const phase   = (pi / puffCount);
                const cycle   = ((t * 0.00065 + phase) % 1.0);
                if (cycle < 0.05) continue;          // just spawned, invisible
                const ageAlpha = Math.sin(cycle * Math.PI) * 0.35;
                const rise     = cycle * 22 * z;
                const spread   = (cycle * cycle) * 10 * z;
                const r        = (2 + cycle * 6) * z;
                const ox       = Math.sin(cycle * Math.PI * 2 + pi * 2.1) * spread;
                ctx.save();
                ctx.globalAlpha = ageAlpha;
                ctx.fillStyle = 'rgba(220,215,210,1)';
                ctx.beginPath();
                ctx.arc(chimneyX + ox, chimneyY - rise, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // ── Torch flicker (barracks, archerTower, wall, gate) ────────────────
        if (['barracks','musterGround','archerTower'].includes(type) && z > 0.55) {
            const torchX = fp.cx + (fp.right.x - fp.cx) * 0.55;
            const torchY = fp.top.y - bH * 1.05;
            const flicker = 0.7 + Math.sin(t * 0.012 + b.x * 5.3) * 0.15
                              + Math.sin(t * 0.031 + b.y * 3.7) * 0.1;
            const fR = 4 * z * flicker;

            ctx.save();
            // Outer warm glow
            const tGrd = ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, fR * 3);
            tGrd.addColorStop(0, `rgba(255,200,60,${0.28 * flicker})`);
            tGrd.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = tGrd;
            ctx.beginPath();
            ctx.arc(torchX, torchY, fR * 3, 0, Math.PI * 2);
            ctx.fill();
            // Flame core
            ctx.fillStyle = `rgba(255,230,80,${0.85 * flicker})`;
            ctx.beginPath();
            ctx.arc(torchX, torchY, fR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── BuilderHut — bolg'a animatsiyasi (quruvchi band bo'lganda) ─────────
        if (type === 'builderHut' && z > 0.45
            && typeof BuilderSystem !== 'undefined' && BuilderSystem.busyBuilders > 0) {
            // Bolg'a tepaga-pastga chiqib tushadi (quruvchi ishlayotgani belgisi)
            const hammerCycle = (t * 0.0022) % (Math.PI * 2);
            const hammerY = fp.top.y - bH * 1.0 - Math.abs(Math.sin(hammerCycle)) * 6 * z;
            const hammerX = fp.cx + (fp.right.x - fp.cx) * 0.3;
            const hammerAlpha = 0.75 + Math.sin(hammerCycle * 2) * 0.2;
            ctx.save();
            ctx.globalAlpha = hammerAlpha;
            ctx.font = `${Math.max(10, 13 * z)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔨', hammerX, hammerY);
            ctx.restore();
        }

        // ── MagicTower — aylanuvchi runa orbitasi ────────────────────────────
        if (type === 'magicTower' && z > 0.45) {
            const orbitR  = 11 * z;
            const orbitRY = orbitR * 0.45; // isometric flatten
            const orbitSpd = t * 0.0015;
            const runeCount = 3;
            ctx.save();
            for (let ri = 0; ri < runeCount; ri++) {
                const ra = orbitSpd + (ri / runeCount) * Math.PI * 2;
                const rx = fp.cx + Math.cos(ra) * orbitR;
                const ry = fp.top.y - bH * 0.95 + Math.sin(ra) * orbitRY;
                const pulse = 0.6 + Math.sin(ra * 2 + t * 0.003) * 0.35;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = '#ce93d8';
                ctx.beginPath();
                ctx.arc(rx, ry, 2.5 * z, 0, Math.PI * 2);
                ctx.fill();
                // Trail glow
                ctx.fillStyle = 'rgba(206,147,216,0.2)';
                ctx.beginPath();
                ctx.arc(rx, ry, 5 * z, 0, Math.PI * 2);
                ctx.fill();
            }
            // Markaziy pulsing aura
            const auraPulse = 0.12 + Math.sin(t * 0.0028) * 0.06;
            ctx.globalAlpha = auraPulse;
            ctx.fillStyle = '#ab47bc';
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.top.y - bH * 0.8, 14*z, 7*z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── InfernoColumn — ko'tariluvchi cho'g'lar ─────────────────────────
        if (type === 'infernoColumn' && z > 0.4) {
            const emberCount = 4;
            ctx.save();
            for (let ei = 0; ei < emberCount; ei++) {
                const phase  = (ei / emberCount);
                const cycle3 = ((t * 0.0008 + phase) % 1.0);
                if (cycle3 < 0.04) continue;
                const alpha3 = Math.sin(cycle3 * Math.PI) * 0.8;
                const rise3  = cycle3 * 20 * z;
                const drift  = Math.sin(cycle3 * Math.PI * 3 + ei * 2.4) * 5 * z;
                const r3     = (1.5 + cycle3 * 2) * z;
                const ox3    = (ei % 2 === 0 ? 1 : -1) * 4 * z + drift;
                ctx.globalAlpha = alpha3;
                ctx.fillStyle = cycle3 < 0.4 ? '#ff6d00' : '#ff3d00';
                ctx.beginPath();
                ctx.arc(fp.cx + ox3, fp.top.y - bH - rise3, r3, 0, Math.PI * 2);
                ctx.fill();
            }
            // Olov yadro glow
            const fireGlow = 0.25 + Math.sin(t * 0.005) * 0.12;
            ctx.globalAlpha = fireGlow;
            const fGrd = ctx.createRadialGradient(fp.cx, fp.top.y - bH, 0, fp.cx, fp.top.y - bH, 10*z);
            fGrd.addColorStop(0, '#ff6d00');
            fGrd.addColorStop(1, 'rgba(255,61,0,0)');
            ctx.fillStyle = fGrd;
            ctx.beginPath();
            ctx.arc(fp.cx, fp.top.y - bH, 10*z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── BoltTower — elektr chaqnash ──────────────────────────────────────
        if (type === 'boltTower' && z > 0.45) {
            const arcPhase = (t * 0.0035) % 1.0;
            // Arc faqat 0.2-0.35 oraliqda ko'rinadi (qisqa chaqnash)
            if (arcPhase > 0.15 && arcPhase < 0.35) {
                const arcAlpha = Math.sin((arcPhase - 0.15) / 0.2 * Math.PI) * 0.9;
                ctx.save();
                ctx.globalAlpha = arcAlpha;
                ctx.strokeStyle = '#f3e5f5';
                ctx.lineWidth = 1.5 * z;
                ctx.shadowColor = '#e91e63';
                ctx.shadowBlur = 8 * z;
                // Zigzag arc from top
                const ax = fp.cx + (fp.right.x - fp.cx) * 0.2;
                const ay = fp.top.y - bH * 1.1;
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                for (let si2 = 1; si2 <= 4; si2++) {
                    const seg = si2 / 4;
                    const sx3 = ax + (si2 % 2 === 0 ? 5 : -5) * z;
                    const sy3 = ay + seg * 12 * z;
                    ctx.lineTo(sx3, sy3);
                }
                ctx.stroke();
                ctx.restore();
            }
            // Daimi elektr halqa
            const hPulse = 0.35 + Math.sin(t * 0.008) * 0.15;
            ctx.save();
            ctx.globalAlpha = hPulse;
            ctx.strokeStyle = '#f48fb1';
            ctx.lineWidth = 1 * z;
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.top.y - bH * 0.85, 8*z, 4*z, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // ── SpellFactory — qaynayotgan pufaklar ──────────────────────────────
        if (type === 'spellFactory' && z > 0.4) {
            const bubCount = 3;
            ctx.save();
            for (let bi3 = 0; bi3 < bubCount; bi3++) {
                const phase3  = (bi3 / bubCount);
                const cycle4  = ((t * 0.001 + phase3) % 1.0);
                if (cycle4 < 0.08) continue;
                const alpha4  = Math.sin(cycle4 * Math.PI) * 0.55;
                const rise4   = cycle4 * 14 * z;
                const r4      = (1.5 + cycle4 * 3) * z;
                const ox4     = (bi3 - 1) * 5 * z;
                ctx.globalAlpha = alpha4;
                ctx.strokeStyle = '#80cbc4';
                ctx.lineWidth = 0.8 * z;
                ctx.beginPath();
                ctx.arc(fp.cx + ox4, fp.top.y - bH * 0.75 - rise4, r4, 0, Math.PI * 2);
                ctx.stroke();
                // Highlight
                ctx.fillStyle = 'rgba(178,235,242,0.4)';
                ctx.beginPath();
                ctx.arc(fp.cx + ox4 - r4 * 0.3, fp.top.y - bH * 0.75 - rise4 - r4 * 0.3, r4 * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── Blacksmith — baca tutuni ──────────────────────────────────────────
        if (type === 'blacksmith' && z > 0.4) {
            const smokeCount = 2;
            const chimneyX2 = fp.cx + (fp.top.x - fp.cx) * 0.4;
            const chimneyY2 = fp.top.y - bH * 1.15;
            ctx.save();
            for (let si3 = 0; si3 < smokeCount; si3++) {
                const phase4   = si3 / smokeCount;
                const cycle5   = ((t * 0.0007 + phase4) % 1.0);
                if (cycle5 < 0.06) continue;
                const alpha5   = Math.sin(cycle5 * Math.PI) * 0.3;
                const rise5    = cycle5 * 16 * z;
                const r5       = (2 + cycle5 * 5) * z;
                const ox5      = Math.sin(cycle5 * Math.PI * 2 + si3) * 4 * z;
                ctx.globalAlpha = alpha5;
                ctx.fillStyle = 'rgba(120,100,80,1)';
                ctx.beginPath();
                ctx.arc(chimneyX2 + ox5, chimneyY2 - rise5, r5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── Mining sparkles (goldMine, elixirCollector, gemMine) ─────────────
        if (['goldMine','elixirCollector','gemMine'].includes(type) && z > 0.5) {
            const lv = BUILDING_DATA[type]?.levels[b.level];
            const cap = lv?.capacity || 99999;
            const stored = b.storedResource || b.storedDiamond || 0;
            if (stored < cap * 0.98) {
                // Animated pick sparkle every 1.2s
                const cycle2 = (t * 0.00075) % 1.0;
                const alpha2 = Math.max(0, Math.sin(cycle2 * Math.PI) * 0.8);
                if (alpha2 > 0.1) {
                    const sx2 = fp.cx + (Math.sin(cycle2 * 6.28 + b.x) * 0.3) * (fp.right.x - fp.left.x) * 0.35;
                    const sy2 = fp.cy - bH * 0.4 - cycle2 * 8 * z;
                    const col = type === 'gemMine' ? '100,220,255'
                              : type === 'goldMine' ? '255,215,80' : '180,80,255';
                    ctx.save();
                    ctx.globalAlpha = alpha2;
                    ctx.fillStyle = `rgba(${col},1)`;
                    ctx.beginPath();
                    ctx.arc(sx2, sy2, 2.5 * z, 0, Math.PI * 2);
                    ctx.fill();
                    // Cross sparkle
                    ctx.strokeStyle = `rgba(${col},0.6)`;
                    ctx.lineWidth = 1 * z;
                    ctx.beginPath();
                    ctx.moveTo(sx2 - 4*z, sy2); ctx.lineTo(sx2 + 4*z, sy2);
                    ctx.moveTo(sx2, sy2 - 4*z); ctx.lineTo(sx2, sy2 + 4*z);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    },
};
