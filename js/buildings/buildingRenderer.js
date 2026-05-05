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
        return this.loadImage(`assets/buildings/${type}_${level}.png`);
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
            // Drag qilinayotgan binoni asosiy joyda chizmaymiz
            if (BuildingManager.dragging && b.id === BuildingManager.dragBuildingId) continue;
            this.drawBuilding(ctx, b);
        }
    },

    drawBuilding(ctx, b) {
        const bd = BUILDING_DATA[b.type];
        const fp = this.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
        const z = Camera.zoom;
        const bH = (14 + b.level * 4) * z;

        // Radius ko'rsatish (Selected bo'lsa va mudofaa bo'lsa)
        if (InfoPanel.currentBuilding && InfoPanel.currentBuilding.id === b.id) {
            const lv = bd.levels[b.level];
            if (lv.range) {
                const rangePx = lv.range * Grid.TILE_W * z;
                ctx.beginPath();
                ctx.ellipse(fp.cx, fp.cy, rangePx, rangePx * (Grid.TILE_H / Grid.TILE_W), 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Ekrandan tashqarida
        if (fp.cx < -120 || fp.cx > MapRenderer.canvas.width + 120 ||
            fp.cy < -120 || fp.cy > MapRenderer.canvas.height + 120) return;

        const img = this.getBuildingImage(b.type, b.level);
        ctx.globalAlpha = b.building ? 0.55 : 1.0;

        if (img) {
            // Rasm ob'ektni to'liq qoplashi uchun masshtab va siljish
            const scale = bd.imageScale || 1.4; 
            const offsetY = bd.imageOffsetY || 10; 
            
            const baseW = fp.right.x - fp.left.x;
            const iw = baseW * scale;
            const ih = iw * (img.height / img.width);
            const oy = offsetY * z;

            ctx.drawImage(img, fp.cx - iw/2, fp.bottom.y - ih + oy, iw, ih);
        } else {
            // OPTIMIZATSIYA: Procedural 3D grafikalarni keshdan olish
            const cachedCanvas = this._getCachedProcedural(b.type, z, bH);
            
            // Soxta soya (Keshlanmagan, chunki u polga tushadi)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.bottom.y - 4*z, (fp.right.x - fp.left.x)/2 * 0.9, (fp.bottom.y - fp.cy) * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Keshdagi binoni chizish
            if (cachedCanvas) {
                // Kesh canvasini markazdan to'g'ri joylashtirish
                ctx.drawImage(cachedCanvas, fp.cx - cachedCanvas.width/2, fp.bottom.y - cachedCanvas.height);
            }
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

        // Qurilish progress va Quruvchi (Architect)
        if (b.building && b.timerId) {
            this._drawArchitect(ctx, fp, z);

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

        // Resurs ko'rsatkichi (Bubble style)
        if (!b.building && b.storedResource >= 5) {
            let ri = b.type === 'villa' ? '🪙' : b.type === 'farm' ? '🍎' : b.type === 'treeOfLife' ? '🍏' : '';
            if (ri) {
                const ry = fp.top.y - bH - 22*z + Math.sin(Date.now()*0.005)*5*z; // Suzib turish effekti
                
                // Pufakcha (Bubble)
                const bw = 30*z, bh = 30*z;
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.beginPath();
                ctx.arc(fp.cx, ry, bw/2, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2*z;
                ctx.stroke();

                // Ikonka
                ctx.font = `${Math.max(16,20*z)}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(ri, fp.cx, ry);
                
                // +Qiymat (faqat yaqinroq ko'rinishi uchun kichikroq)
                ctx.fillStyle = '#000';
                ctx.font = `bold ${Math.max(8,9*z)}px Inter,sans-serif`;
                ctx.fillText('+', fp.cx + 8*z, ry - 8*z);
            }
        }
        // Askar ko'rsatkichi (Muster Ground)
        if (b.type === 'musterGround' && !b.building) {
            this._drawTroopsInCamp(ctx, b, fp);
        }
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

        // Tag highlight
        ctx.globalAlpha = locked ? 0.5 : 0.3;
        ctx.beginPath();
        ctx.moveTo(fp.top.x, fp.top.y); ctx.lineTo(fp.right.x, fp.right.y);
        ctx.lineTo(fp.bottom.x, fp.bottom.y); ctx.lineTo(fp.left.x, fp.left.y);
        ctx.closePath();
        ctx.fillStyle = canPlace ? '#4caf50' : '#f44336'; ctx.fill();
        ctx.strokeStyle = canPlace ? '#2e7d32' : '#c62828'; ctx.lineWidth = 2*z; ctx.stroke();

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
            wall:{top:'#a0a0a0',left:'#808080',right:'#606060',outline:'#404040'},
            gate:{top:'#8090a0',left:'#607080',right:'#405060',outline:'#304050'},
            archerTower:{top:'#c07040',left:'#a05828',right:'#804018',outline:'#603010'},
            scorpio:{top:'#d09030',left:'#b07020',right:'#905010',outline:'#704008'},
            tormenta:{top:'#4080c0',left:'#3060a0',right:'#204080',outline:'#183060'},
            flamingCitadel:{top:'#e04020',left:'#c03010',right:'#a02008',outline:'#801008'},
            spikeTrap:{top:'#707070',left:'#505050',right:'#383838',outline:'#282828'},
            militia:{top:'#7050a0',left:'#503880',right:'#382860',outline:'#281850'}
        };
        return s[type] || s.wall;
    },

    _proceduralCache: {},

    _getCachedProcedural(type, z, bH) {
        const bd = BUILDING_DATA[type];
        const key = `${type}_${z}_${bH}`;
        if (this._proceduralCache[key]) return this._proceduralCache[key];

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
        canvas.height = fp.bottom.y + bH + Math.max(20*z, 30); // bH (balandlik) va ikonka uchun joy
        const ctx = canvas.getContext('2d');
        
        // Y siljishi (canvas ichida sig'ishi uchun pastga suramiz)
        const offsetY = bH + Math.max(10*z, 20); 
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

        // Derazalar va detallar qo'shish
        if (bH > 10*z) {
            ctx.fillStyle = '#111';
            // Deraza chap taraf
            ctx.beginPath();
            ctx.moveTo(fp.left.x + 8*z, pushY(fp.left.y) - bH/2 + 2*z);
            ctx.lineTo(fp.left.x + 14*z, pushY(fp.left.y) - bH/2 + 5*z);
            ctx.lineTo(fp.left.x + 14*z, pushY(fp.left.y) - bH/2 + 10*z);
            ctx.lineTo(fp.left.x + 8*z, pushY(fp.left.y) - bH/2 + 7*z);
            ctx.fill();

            // Eshik o'ng taraf
            ctx.beginPath();
            ctx.moveTo(fp.bottom.x + 8*z, pushY(fp.bottom.y) - 12*z);
            ctx.lineTo(fp.bottom.x + 16*z, pushY(fp.bottom.y) - 16*z);
            ctx.lineTo(fp.bottom.x + 16*z, pushY(fp.bottom.y) - 4*z);
            ctx.lineTo(fp.bottom.x + 8*z, pushY(fp.bottom.y) - 0*z);
            ctx.fill();
        }

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

        this._proceduralCache[key] = canvas;
        return canvas;
    }
};
