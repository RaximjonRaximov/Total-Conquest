// ============================================
// BATTLE RENDERER - Askarlar va O'qlarni chizish
// ============================================

const BattleRenderer = {
    renderAll(ctx) {
        if (!BattleManager.active) return;

        // Qizil zonani chizish (Deploy mumkin bo'lmagan joylar)
        this._renderRedZone(ctx);

        // Askarlarni chizish
        // Y o'qi bo'yicha saralash (3D effekt)
        const sortedTroops = [...BattleManager.troops].sort((a, b) => a.y - b.y);
        for (const t of sortedTroops) {
            this._drawTroop(ctx, t);
        }

        // Snaryadlarni chizish
        for (const p of BattleManager.projectiles) {
            this._drawProjectile(ctx, p);
        }

        // Bino HP barlarini chizish
        this._drawBuildingHP(ctx);
    },

    _renderRedZone(ctx) {
        if (!DeployPanel.selectedTroop) return; // Faqat askar tanlanganda
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
        for (const b of Object.values(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            // Radius taxminan 2 tile atrofida
            const rx = b.x - 1;
            const ry = b.y - 1;
            const rw = bd.size[0] + 2;
            const rh = bd.size[1] + 2;
            
            // Poligonni izometrik chizish
            ctx.beginPath();
            const p1 = Camera.worldToScreen(Camera.toIso(rx, ry).x, Camera.toIso(rx, ry).y);
            const p2 = Camera.worldToScreen(Camera.toIso(rx + rw, ry).x, Camera.toIso(rx + rw, ry).y);
            const p3 = Camera.worldToScreen(Camera.toIso(rx + rw, ry + rh).x, Camera.toIso(rx + rw, ry + rh).y);
            const p4 = Camera.worldToScreen(Camera.toIso(rx, ry + rh).x, Camera.toIso(rx, ry + rh).y);
            
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();
            ctx.fill();
        }
    },

    _drawTroop(ctx, t) {
        const iso = Camera.toIso(t.x, t.y);
        const screen = Camera.worldToScreen(iso.x, iso.y);
        const z = Camera.zoom;
        const data = TROOP_DATA[t.type];

        // Ekrandan tashqarida
        if (screen.x < -20 || screen.x > ctx.canvas.width + 20 ||
            screen.y < -20 || screen.y > ctx.canvas.height + 20) return;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y, 6*z, 3*z, 0, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.font = `${14 * z}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        let wobble = 0;
        if (t.state === 'moving') {
            wobble = Math.sin(Date.now() * 0.015) * 3 * z;
        } else if (t.state === 'attacking') {
            wobble = Math.sin(Date.now() * 0.03) * 2 * z;
        }
        
        ctx.fillText(data.icon, screen.x, screen.y - 2*z + wobble);

        // HP bar
        const hpPerc = t.hp / t.maxHp;
        if (hpPerc < 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(screen.x - 8*z, screen.y - 18*z, 16*z, 3*z);
            ctx.fillStyle = hpPerc > 0.5 ? '#4caf50' : hpPerc > 0.2 ? '#ff9800' : '#f44336';
            ctx.fillRect(screen.x - 8*z, screen.y - 18*z, 16*z * hpPerc, 3*z);
        }

        // Shifobaxsh effekti - yashil aura
        if (data.stats.type === 'healer' && t.state === 'attacking') {
            const pulse = (Math.sin(Date.now() * 0.008) + 1) / 2;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 5*z, (12 + pulse * 8) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(76, 175, 80, ${0.1 + pulse * 0.15})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(76, 175, 80, ${0.3 + pulse * 0.3})`;
            ctx.lineWidth = 1.5 * z;
            ctx.stroke();

            // "+" belgisi
            ctx.fillStyle = '#4caf50';
            ctx.font = `bold ${10*z}px sans-serif`;
            ctx.fillText('+', screen.x, screen.y - 22*z + Math.sin(Date.now() * 0.01) * 3 * z);
        }
    },

    _drawProjectile(ctx, p) {
        const iso = Camera.toIso(p.x, p.y);
        // Havoda uchish yoyi
        const flightHeight = 20; 
        const screen = Camera.worldToScreen(iso.x, iso.y - flightHeight);
        const z = Camera.zoom;

        ctx.fillStyle = p.type === 'defense' ? '#ff9800' : '#d4af37';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 2.5 * z, 0, Math.PI * 2);
        ctx.fill();
        
        // Dum effekti
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(screen.x - 2*z, screen.y + 2*z, 1.5 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    },

    _drawBuildingHP(ctx) {
        const z = Camera.zoom;
        for (const [id, b] of Object.entries(BuildingManager.buildings)) {
            if (b.hp >= b.maxHp) continue; // Faqat zarar ko'rgan binolar

            const bd = BUILDING_DATA[b.type];
            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
            
            const perc = b.hp / b.maxHp;
            const bw = 30 * z;
            const by = fp.cy - 10 * z;

            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(fp.cx - bw/2, by, bw, 4*z);
            ctx.fillStyle = perc > 0.5 ? '#8bc34a' : perc > 0.25 ? '#ffeb3b' : '#f44336';
            ctx.fillRect(fp.cx - bw/2, by, bw * perc, 4*z);
        }
    }
};
