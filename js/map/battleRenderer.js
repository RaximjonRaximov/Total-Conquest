// ============================================
// BATTLE RENDERER - Askarlar va O'qlarni chizish
// ============================================

const BattleRenderer = {
    imageCache: {},
    particles: [],
    shakeIntensity: 0,
    shakeDuration: 0,

    loadImage(src) {
        if (this.imageCache[src] !== undefined) return this.imageCache[src];
        const img = new Image();
        img.src = src;
        this.imageCache[src] = null;
        img.onload = () => { this.imageCache[src] = img; };
        return null;
    },

    triggerShake(intensity = 10, duration = 300) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    },

    addExplosion(x, y, color = '#ff5722', count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                color: color,
                size: 2 + Math.random() * 4
            });
        }
    },

    renderAll(ctx) {
        if (!BattleManager.active) return;

        ctx.save();

        // Screen Shake
        if (this.shakeDuration > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity;
            const sy = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(sx, sy);
            this.shakeDuration -= 16; // 60fps
        }

        // Qizil zonani chizish (Deploy mumkin bo'lmagan joylar)
        this._renderRedZone(ctx);

        // Askarlarni chizish
        const sortedTroops = [...BattleManager.troops].sort((a, b) => a.y - b.y);
        for (const t of sortedTroops) {
            this._drawTroop(ctx, t);
        }

        // Snaryadlarni chizish
        for (const p of BattleManager.projectiles) {
            this._drawProjectile(ctx, p);
        }

        // Effektlar (Portlashlar)
        this._drawParticles(ctx);

        // Bino HP barlarini chizish
        this._drawBuildingHP(ctx);

        ctx.restore(); // Har doim save ni yopamiz
    },

    _drawParticles(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravitatsiya
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            const iso = Camera.toIso(p.x, p.y);
            const s = Camera.worldToScreen(iso.x, iso.y);
            
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, p.size * Camera.zoom, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    _renderRedZone(ctx) {
        if (!DeployPanel.selectedTroop) return; // Faqat askar tanlanganda ko'rinadi
        
        const z = Camera.zoom;
        const pulse = (Math.sin(Date.now() * 0.005) * 0.2 + 0.3); // 0.1 to 0.5 opacity
        
        ctx.save();
        
        // 1. Binolar atrofidagi qizil zona
        for (const b of Object.values(BuildingManager.buildings)) {
            const bd = BUILDING_DATA[b.type];
            // BattleManager._canDeployAt logiciga mos (dist < maxSide + 2)
            const margin = 2;
            const rx = b.x - margin;
            const ry = b.y - margin;
            const rw = bd.size[0] + margin * 2;
            const rh = bd.size[1] + margin * 2;
            
            this._drawIsoRect(ctx, rx, ry, rw, rh, `rgba(255, 50, 50, ${pulse * 0.4})`, `rgba(255, 0, 0, ${pulse + 0.2})`);
        }

        // 2. Xarita tashqarisidagi "Deploy" mumkin bo'lgan joy (Grid.UNBUILDABLE_BORDER)
        // Eslatma: Biz aslida hamma joyga tashlashimiz mumkin, faqat binolar yaqiniga emas.
        // Lekin professional o'yinlarda "Border" qizil bo'lmaydi, faqat binolar atrofi qizil bo'ladi.
        
        ctx.restore();
    },

    _drawIsoRect(ctx, rx, ry, rw, rh, fillColor, strokeColor) {
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
        
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2 * Camera.zoom;
            ctx.setLineDash([5 * Camera.zoom, 5 * Camera.zoom]); // Uzun-qisqa chiziqlar
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },

    _drawTroop(ctx, t) {
        const iso = Camera.toIso(t.x, t.y);
        const screen = Camera.worldToScreen(iso.x, iso.y);
        const z = Camera.zoom;
        const data = TROOP_DATA[t.type];

        if (screen.x < -20 || screen.x > ctx.canvas.width + 20 ||
            screen.y < -20 || screen.y > ctx.canvas.height + 20) return;

        // Tana rangi va quroli
        let bodyColor = '#d32f2f'; // default red
        let weapon = null;
        if (data.category === 'piyoda') { bodyColor = '#c62828'; weapon = 'sword'; }
        if (data.category === 'otishma') { bodyColor = '#2e7d32'; weapon = 'bow'; }
        if (data.stats.type === 'healer') { bodyColor = '#fbc02d'; weapon = 'staff'; }
        if (data.stats.type === 'siege') { bodyColor = '#5d4037'; weapon = 'ram'; }

        let wobble = 0;
        let walkCycle = 0;
        if (t.state === 'moving') {
            wobble = Math.sin(Date.now() * 0.015) * 3 * z;
            walkCycle = Math.sin(Date.now() * 0.015);
        } else if (t.state === 'attacking') {
            wobble = Math.sin(Date.now() * 0.03) * 2 * z;
            walkCycle = Math.sin(Date.now() * 0.04);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y, 6*z, 3*z, 0, 0, Math.PI * 2);
        ctx.fill();

        const by = screen.y - 4*z + wobble;

        const img = this.loadImage(`assets/troops/${t.type}.png`);
        
        if (img) {
            // Yuklangan rasmni chizish
            const iw = 20 * z;
            const ih = iw * (img.height / img.width);
            ctx.drawImage(img, screen.x - iw/2, by - ih + 4*z, iw, ih);
        } else {
            if (data.stats.type === 'siege') {
                // Qamal quroli (Yog'och kunda)
                ctx.fillStyle = '#6d4c41';
                ctx.fillRect(screen.x - 10*z, by - 8*z, 20*z, 6*z);
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(screen.x - 10*z, by - 8*z, 20*z, 2*z); // highlight
                // Temir uchi
                ctx.fillStyle = '#9e9e9e';
                ctx.beginPath();
                ctx.moveTo(screen.x + 10*z, by - 8*z);
                ctx.lineTo(screen.x + 15*z + (t.state==='attacking'?walkCycle*4*z:0), by - 5*z);
                ctx.lineTo(screen.x + 10*z, by - 2*z);
                ctx.fill();
            } else {
                // Odamcha (3D capsule)
                // Tana
                ctx.fillStyle = bodyColor;
                ctx.beginPath();
                ctx.roundRect(screen.x - 4*z, by - 12*z, 8*z, 10*z, 4*z);
                ctx.fill();
                
                // Bosh
                ctx.fillStyle = '#ffcc80';
                ctx.beginPath();
                ctx.arc(screen.x, by - 14*z, 3.5*z, 0, Math.PI*2);
                ctx.fill();
                
                // Dubulg'a yoki soch
                if (data.tier > 1) {
                    ctx.fillStyle = '#757575';
                    ctx.beginPath();
                    ctx.arc(screen.x, by - 15*z, 3.8*z, Math.PI, Math.PI*2);
                    ctx.fill();
                    if (data.tier >= 3) { // Qizil toj
                        ctx.fillStyle = '#d32f2f';
                        ctx.fillRect(screen.x - 1*z, by - 19*z, 2*z, 4*z);
                    }
                }

                // Qurol
                if (weapon === 'sword') {
                    ctx.strokeStyle = '#bdbdbd';
                    ctx.lineWidth = 1.5 * z;
                    ctx.beginPath();
                    const attackOffset = t.state === 'attacking' ? walkCycle * 8 * z : 0;
                    ctx.moveTo(screen.x + 4*z, by - 8*z);
                    ctx.lineTo(screen.x + 10*z + attackOffset, by - 12*z + attackOffset/2);
                    ctx.stroke();
                } else if (weapon === 'bow') {
                    ctx.strokeStyle = '#5d4037';
                    ctx.lineWidth = 1.5 * z;
                    ctx.beginPath();
                    ctx.arc(screen.x + 5*z, by - 8*z, 4*z, -Math.PI/2, Math.PI/2);
                    ctx.stroke();
                } else if (weapon === 'staff') {
                    ctx.strokeStyle = '#795548';
                    ctx.lineWidth = 1.5 * z;
                    ctx.beginPath();
                    ctx.moveTo(screen.x + 4*z, by - 2*z);
                    ctx.lineTo(screen.x + 4*z, by - 16*z + (t.state === 'attacking' ? walkCycle*3*z : 0));
                    ctx.stroke();
                }
            }
        }

        // HP bar
        const hpPerc = t.hp / t.maxHp;
        if (hpPerc < 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(screen.x - 8*z, screen.y - 24*z, 16*z, 2.5*z);
            ctx.fillStyle = hpPerc > 0.5 ? '#4caf50' : hpPerc > 0.2 ? '#ff9800' : '#f44336';
            ctx.fillRect(screen.x - 8*z, screen.y - 24*z, 16*z * hpPerc, 2.5*z);
        }

        // Shifobaxsh effekti
        if (data.stats.type === 'healer' && t.state === 'attacking') {
            const pulse = (Math.sin(Date.now() * 0.008) + 1) / 2;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 5*z, (12 + pulse * 8) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(76, 175, 80, ${0.1 + pulse * 0.1})`;
            ctx.fill();
        }
    },

    _drawProjectile(ctx, p) {
        let tx, ty;
        if (p.type === 'defense') {
            const tr = BattleManager.troops.find(t => t.id === p.targetId);
            if (tr) { tx = tr.x; ty = tr.y; }
        } else {
            const b = BuildingManager.buildings[p.targetId];
            if (b) {
                const bd = BUILDING_DATA[b.type];
                tx = b.x + bd.size[0]/2; ty = b.y + bd.size[1]/2;
            }
        }

        let flightHeight = 0;
        if (tx !== undefined && ty !== undefined && p.startX !== undefined) {
            const totalDist = Helpers.distance(p.startX, p.startY, tx, ty);
            const currentDist = Helpers.distance(p.startX, p.startY, p.x, p.y);
            let progress = currentDist / (totalDist || 1);
            if (progress > 1) progress = 1;
            
            // Parabola balandligi
            const maxH = Math.min(totalDist * 15, 120) * Camera.zoom; 
            flightHeight = 4 * maxH * progress * (1 - progress);
        } else {
            flightHeight = 10 * Camera.zoom;
        }

        const iso = Camera.toIso(p.x, p.y);
        const screen = Camera.worldToScreen(iso.x, iso.y - flightHeight / Camera.zoom); // Z-axis balandlik
        const z = Camera.zoom;

        const isArrow = p.type === 'defense'; // Minoralar o'q otadi (arrow)
        
        if (isArrow) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            const angle = Math.atan2(ty - p.startY, tx - p.startX);
            // O'qning uchi pastga (parabolaga mos) qarab qiyalashadi
            const pitch = (0.5 - (flightHeight / (Camera.zoom * 60))) * Math.PI; 
            ctx.moveTo(screen.x, screen.y);
            ctx.lineTo(screen.x - Math.cos(angle)*4*z, screen.y - Math.sin(angle)*4*z + pitch);
            ctx.stroke();
        } else {
            // Askar snaryadlari (masalan otishma)
            ctx.fillStyle = '#ffb300';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, 2.5 * z, 0, Math.PI * 2);
            ctx.fill();
            // Dum
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(screen.x - 2*z, screen.y + 2*z, 1.5 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
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
