// ============================================
// BATTLE RENDERER - Askarlar va O'qlarni chizish
// ============================================

// ─── Rang yordamchi funksiyalar ───────────────────────────────────────────────
function _lightenColor(hex, amount) {
    // Hex yoki rgb string ni yorqinlashtiradi
    try {
        const num = parseInt(hex.replace('#',''), 16);
        const r = Math.min(255, ((num >> 16) & 255) + (255 * amount) | 0);
        const g = Math.min(255, ((num >>  8) & 255) + (255 * amount) | 0);
        const b = Math.min(255, ((num      ) & 255) + (255 * amount) | 0);
        return `rgb(${r},${g},${b})`;
    } catch(e) { return hex; }
}
function _darkenColor(hex, amount) {
    try {
        const num = parseInt(hex.replace('#',''), 16);
        const r = Math.max(0, ((num >> 16) & 255) * (1 - amount) | 0);
        const g = Math.max(0, ((num >>  8) & 255) * (1 - amount) | 0);
        const b = Math.max(0, ((num      ) & 255) * (1 - amount) | 0);
        return `rgb(${r},${g},${b})`;
    } catch(e) { return hex; }
}

// ─── Particle Object Pool — new {} allocation yo'q ────────────────────────────
const _PARTICLE_POOL_SIZE = 600;
const _particlePool = [];
for (let _i = 0; _i < _PARTICLE_POOL_SIZE; _i++) {
    _particlePool.push({ x:0,y:0,vx:0,vy:0,life:0,decay:0,color:'#fff',size:2,active:false,shape:'circle',rot:0,rotSpd:0 });
}

function _acquireParticle() {
    for (let i = 0; i < _particlePool.length; i++) {
        if (!_particlePool[i].active) return _particlePool[i];
    }
    // Pool to'la bo'lsa, yangi ob'ekt (xavfsiz fallback)
    return { x:0,y:0,vx:0,vy:0,life:0,decay:0,color:'#fff',size:2,active:false };
}
// ──────────────────────────────────────────────────────────────────────────────

const BattleRenderer = {
    imageCache: {},
    particles: [],          // Faqat active particlelar saqlanadi
    _floatingTexts: [],     // Suzuvchi raqamlar (zarar, shifo)
    _lightningArcs: [],     // Chaqmoq arc effektlari
    _smokeParticles: [],    // Bino tutun zarralari
    _deployRings: [],       // Deploy landing rings
    _groundRings: [],       // Hero ability ground ring effektlari
    _rubbles: [],           // Vayron bo'lgan binolar qoldiqlari
    _groundMarks: [],       // Portlash va kuyish izlari (scorch marks)
    _debrisChunks: [],      // Bino vayron bo'lganda uchuvchi katta bo'laklar
    _shockwaves: [],        // Portlash zarba to'lqinlari (shockwave rings)
    _ghostX: -1,            // Ghost troop preview tile X
    _ghostY: -1,            // Ghost troop preview tile Y
    shakeIntensity: 0,
    shakeDuration: 0,

    // Lightning arc — yuqoridan pastga zigzag
    addLightningArc(worldX, worldY) {
        this._lightningArcs.push({
            x: worldX, y: worldY,
            until: Date.now() + 500,
            seed: Math.random() * 1000,
        });
    },

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

    // Suzuvchi matn (zarar raqami, shifo, ...)
    addFloatingText(worldX, worldY, text, color = '#ff5252', size = 13) {
        // Yaqin joylarda bir-biridan farqlash uchun kichik gorizontal tasodif
        const xWobble = (Math.random() - 0.5) * 0.35;
        this._floatingTexts.push({
            x: worldX + xWobble, y: worldY,
            text, color, size,
            vy: -0.07,          // yuqoriga harakat
            life: 1.0,
            decay: 0.016,
            scale: 0.4,         // CoC pop: kichikdan kattaga
            scaleVel: 0.12,     // scale tezligi
        });
    },

    // Bino vayron bo'lganda qoldiq (rubble) qo'shish
    addRubble(cx, cy, size = 1, btype = null) {
        this._rubbles.push({
            x: cx, y: cy,
            size,
            btype,    // building type — rang uchun
            born: Date.now(),
            life: 2200 + Math.random() * 800,   // 2-3 soniya
            seed: Math.floor(Math.random() * 9999),
        });
    },

    // Qahramon qobiliyati yoqilganda — kengayuvchi yer halqasi
    addGroundRing(worldX, worldY, color = '#ffd700', maxRadius = 5, duration = 700) {
        this._groundRings.push({
            x: worldX, y: worldY,
            color,
            maxRadius,
            duration,
            born: Date.now(),
        });
    },

    // Portlash shockwave — splash bomb / mortar uchun kengayuvchi zarbiy to'lqin
    addShockwave(worldX, worldY, radius = 3.5, color = '#ff7043') {
        this._shockwaves.push({
            x: worldX, y: worldY,
            maxRad: radius,
            color,
            born: Date.now(),
            dur: 380,
        });
    },

    addDeployRing(x, y, color = '#ffd700') {
        this._deployRings.push({
            x, y, color,
            born: Date.now(),
            life: 550,       // ms
        });
    },

    // Portlash/kuyish izi — yerda qoladigan qoʻngʻir doira
    addGroundMark(worldX, worldY, size = 1.5, duration = 12000) {
        // Limit: 30 dan ko'p scorch mark bo'lmasin (eski izi ustiga yozilsin)
        if (this._groundMarks.length >= 30) this._groundMarks.splice(0, 1);
        this._groundMarks.push({
            x: worldX, y: worldY,
            size,
            born: Date.now(),
            duration,
            seed: Math.random() * 100,
        });
    },

    // Bino vayron bo'lganda uchuvchi katta bo'laklar (arc trajectory)
    addDebris(worldX, worldY, color = '#795548', count = 6) {
        if (this._debrisChunks.length >= 40) this._debrisChunks.splice(0, count);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 2.5;   // tiles/s
            this._debrisChunks.push({
                x: worldX, y: worldY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vz: 2.5 + Math.random() * 2.0,          // initial vertical speed
                z2: 0,                                   // current height
                rot: Math.random() * Math.PI * 2,
                rotSpd: (Math.random() - 0.5) * 0.15,
                size: 3 + Math.random() * 4,             // px (before zoom)
                color,
                born: Date.now(),
                life: 600 + Math.random() * 400,
                shape: Math.random() > 0.5 ? 'rect' : 'tri',
            });
        }
    },

    addExplosion(x, y, color = '#ff5722', count = 15) {
        // 1) Flash particle — tez yo'qoladigan katta oq doira
        const flash = _acquireParticle();
        flash.x = x; flash.y = y;
        flash.vx = 0; flash.vy = 0;
        flash.life  = 0.9;
        flash.decay = 0.14;
        flash.color = '#ffffff';
        flash.size  = 7 + Math.random() * 5;
        flash.shape = 'flash';
        flash.rot = 0; flash.rotSpd = 0;
        flash.active = true;
        this.particles.push(flash);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const p = _acquireParticle();
            p.x = x;   p.y = y;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life  = 1.0;
            p.decay = 0.018 + Math.random() * 0.028;
            p.color = color;

            // Shape variety: 55% circle, 28% spark, 17% diamond
            const rShape = Math.random();
            if (rShape < 0.55) {
                p.shape = 'circle';
                p.size  = 2 + Math.random() * 4;
                p.rot = 0; p.rotSpd = 0;
            } else if (rShape < 0.83) {
                p.shape = 'spark';
                p.size  = 1.2 + Math.random() * 2.5;
                p.rot = angle; // spark orientatsiyasi harakat yo'nalishida
                p.rotSpd = (Math.random() - 0.5) * 0.08;
            } else {
                p.shape = 'diamond';
                p.size  = 2.5 + Math.random() * 3;
                p.rot = Math.random() * Math.PI;
                p.rotSpd = (Math.random() - 0.5) * 0.12;
            }
            p.active = true;
            this.particles.push(p);
        }
    },

    // Canvas roundRect polyfill (Safari < 15.4 + safe fallback)
    _roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
        } else {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.lineTo(x + w, y + h - r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h);
            ctx.arcTo(x, y + h, x, y + h - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
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

        // Yer kuyish izlari (portlash scorch marks) — eng pastda
        this._drawGroundMarks(ctx);

        // Target lock lines — hujum qilayotgan askardan binoga yupqa chiziq
        this._drawTargetLines(ctx);

        // Askarlarni chizish (yer askarlari avval, uchuvchilar keyin)
        const sortedTroops = [...BattleManager.troops].sort((a, b) => {
            const aFlying = TROOP_DATA[a.type]?.flying || false;
            const bFlying = TROOP_DATA[b.type]?.flying || false;
            if (aFlying !== bFlying) return aFlying ? 1 : -1;
            return a.y - b.y;
        });
        for (const t of sortedTroops) {
            this._drawTroop(ctx, t);
        }

        // Qo'riqchi askarlarni chizish
        for (const g of BattleManager.guardTroops) {
            this._drawGuard(ctx, g);
        }

        // Snaryadlarni chizish
        for (const p of BattleManager.projectiles) {
            this._drawProjectile(ctx, p);
        }

        // Ghost troop drop preview
        this._drawGhostTroop(ctx);

        // Spell radius ghost preview (cursor ustida)
        this._drawSpellGhost(ctx);

        // Sehr effektlari (Rage, Freeze, Heal doiralari)
        this._drawSpellEffects(ctx);

        // Suzuvchi zarar raqamlari
        this._drawFloatingTexts(ctx);

        // Chaqmoq arc effektlari
        this._drawLightningArcs(ctx);

        // Effektlar (Portlashlar)
        this._drawParticles(ctx);

        // Hero ability ground rings
        this._drawGroundRings(ctx);

        // Splash portlash shockwave rings
        this._drawShockwaves(ctx);

        // Deploy landing rings
        this._drawDeployRings(ctx);

        // Vayron bo'lgan binolar qoldiqlari
        this._drawRubbles(ctx);

        // Uchuvchi bino bo'laklari (debris arcs)
        this._drawDebris(ctx);

        // Muzlatilgan binolar (freeze spell) — muz overlay
        this._drawFrozenBuildings(ctx);

        // Bino tutun va olov effektlari
        this._emitBuildingSmoke();
        this._drawSmoke(ctx);

        // Defense tower attack flash beams
        this._drawTowerBeams(ctx);

        // Bino HP barlarini chizish
        this._drawBuildingHP(ctx);

        // Loot badge (resource binolar ustida oltin/ovqat miqdori)
        this._drawLootBadges(ctx);

        // Praetorium / Militia trigger perimeter
        this._drawMilitiaTriggerRadius(ctx);

        // Defense tower attack rotation indicator
        this._drawTowerAttackIndicator(ctx);

        ctx.restore(); // Har doim save ni yopamiz
    },

    _drawFloatingTexts(ctx) {
        if (this._floatingTexts.length === 0) return;
        const z = Camera.zoom;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
            const ft = this._floatingTexts[i];
            // Harakat: yuqoriga tezlaşib to'xtatiladi (decelerate)
            ft.vy  *= 0.93;  // tormozlash
            ft.y   += ft.vy;
            ft.life -= ft.decay;

            // Scale pop animatsiyasi: 0.4 → 1.2 → 1.0
            if (ft.scale < 1.15) {
                ft.scale += ft.scaleVel;
                if (ft.scale > 1.15) { ft.scale = 1.15; ft.scaleVel = -0.04; }
            } else if (ft.scale > 1.0) {
                ft.scale += ft.scaleVel; // scaleVel < 0 (qisqaradi)
                if (ft.scale < 1.0) ft.scale = 1.0;
            }

            if (ft.life <= 0) {
                this._floatingTexts.splice(i, 1);
                continue;
            }

            const iso = Camera.toIso(ft.x, ft.y);
            const sc  = Camera.worldToScreen(iso.x, iso.y);

            // Alfa: dastlab to'liq, oxirida so'nadi
            const alpha = ft.life > 0.4 ? 1.0 : ft.life / 0.4;
            ctx.globalAlpha = alpha;

            const fontSize = Math.round(ft.size * z * ft.scale);
            ctx.font = `bold ${fontSize}px Inter,sans-serif`;

            // Stroke (qora chegara) — oson o'qilishi uchun
            ctx.lineWidth   = Math.max(2, fontSize * 0.22);
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.lineJoin    = 'round';
            ctx.strokeText(ft.text, sc.x, sc.y);

            // Asosiy rang
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, sc.x, sc.y);

            // Yorqin matnlar uchun glow (crit / shifo)
            if (ft.color === '#ffd700' || ft.color === '#fff200' ||
                ft.color === '#69f0ae' || ft.color === '#fff') {
                ctx.save();
                ctx.globalAlpha = alpha * 0.6;
                ctx.shadowColor = ft.color;
                ctx.shadowBlur  = fontSize * 0.5;
                ctx.fillStyle   = ft.color;
                ctx.fillText(ft.text, sc.x, sc.y);
                ctx.shadowBlur  = 0;
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // Defense tower attack beam flash (qisqacha yorqin chiziq)
    _drawTowerBeams(ctx) {
        const now = Date.now();
        const BEAM_DUR = 120; // ms

        ctx.save();
        for (const b of Object.values(BuildingManager.buildings)) {
            if (!b._lastFiredAt || !b._lastFiredTarget) continue;
            const age = now - b._lastFiredAt;
            if (age > BEAM_DUR) { delete b._lastFiredAt; continue; }

            const t = age / BEAM_DUR; // 0→1
            const alpha = (1 - t) * 0.55;

            const bd  = BUILDING_DATA[b.type];
            if (!bd) continue;
            const bcx = b.x + bd.size[0] / 2;
            const bcy = b.y + bd.size[1] / 2;

            const fromIso = Camera.toIso(bcx, bcy);
            const fromSc  = Camera.worldToScreen(fromIso.x, fromIso.y);
            const toIso   = Camera.toIso(b._lastFiredTarget.x, b._lastFiredTarget.y);
            const toSc    = Camera.worldToScreen(toIso.x, toIso.y);

            // Beam color per building type
            const infernoCharge = b._infernoCharge || 1.0;
            const infernoR = Math.round(255);
            const infernoG = Math.round(200 - Math.min(1,(infernoCharge-1)/3) * 150);
            const beamColor = b.type === 'infernoColumn'   ? `rgba(${infernoR},${infernoG},50,${alpha})`
                            : b.type === 'flamingCitadel' ? `rgba(255,100,0,${alpha})`
                            : b.type === 'magicTower'      ? `rgba(156,39,176,${alpha})`
                            : b.type === 'scorpio'         ? `rgba(255,235,59,${alpha})`
                            : b.type === 'boltTower'       ? `rgba(240,50,120,${alpha})`
                            : `rgba(255,255,255,${alpha})`;
            const beamColorSolid = b.type === 'infernoColumn'   ? `rgb(${infernoR},${infernoG},50)`
                            : b.type === 'flamingCitadel' ? '#ff6400'
                            : b.type === 'magicTower'      ? '#9c27b0'
                            : b.type === 'scorpio'         ? '#ffeb3b'
                            : b.type === 'boltTower'       ? '#f03278'
                            : '#ffffff';

            const z = Camera.zoom;
            ctx.strokeStyle = beamColor;
            ctx.lineWidth   = (2.5 - t * 2) * z;
            ctx.lineCap     = 'round';
            ctx.shadowColor  = beamColor;
            ctx.shadowBlur   = 8 * z * (1 - t);
            ctx.beginPath();
            ctx.moveTo(fromSc.x, fromSc.y);
            ctx.lineTo(toSc.x, toSc.y);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // ── Muzzle flash — o'q chiqqan joyda qisqacha chaqnash ───────────────
            if (t < 0.35) {
                const muzzleAlpha = (1 - t / 0.35) * 0.9;
                const muzzleR     = (4 + (1 - t / 0.35) * 4) * z;
                ctx.save();
                ctx.globalAlpha = muzzleAlpha;
                ctx.shadowColor = beamColorSolid;
                ctx.shadowBlur  = 10 * z;
                ctx.fillStyle   = '#ffffff';
                ctx.beginPath();
                ctx.arc(fromSc.x, fromSc.y - 4 * z, muzzleR, 0, Math.PI * 2);
                ctx.fill();
                // Colored core
                ctx.fillStyle = beamColorSolid;
                ctx.beginPath();
                ctx.arc(fromSc.x, fromSc.y - 4 * z, muzzleR * 0.55, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            }

            // ── Shot ring burst — tower otganda kengayuvchi halqa (CoC-style) ──────
            if (t < 0.55) {
                const ringT     = t / 0.55;          // 0→1 within ring lifetime
                const ringRx    = (6 + ringT * 22) * z;
                const ringRy    = ringRx * 0.45;     // isometric flatten
                const ringAlpha = (1 - ringT) * 0.65;
                ctx.save();
                ctx.globalAlpha  = ringAlpha;
                ctx.strokeStyle  = beamColorSolid;
                ctx.lineWidth    = (2.5 - ringT * 2) * z;
                ctx.shadowColor  = beamColorSolid;
                ctx.shadowBlur   = 6 * z * (1 - ringT);
                ctx.beginPath();
                ctx.ellipse(fromSc.x, fromSc.y - 2 * z, ringRx, ringRy, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }
        ctx.restore();
    },

    // ── Qahramon qobiliyati yer halqasi (expanding ground ring) ─────────────────
    _drawGroundRings(ctx) {
        if (this._groundRings.length === 0) return;
        const now = Date.now();
        const z   = Camera.zoom;
        ctx.save();

        this._groundRings = this._groundRings.filter(r => {
            const age = now - r.born;
            if (age > r.duration) return false;

            const t   = age / r.duration;   // 0 → 1
            const iso = Camera.toIso(r.x, r.y);
            const sc  = Camera.worldToScreen(iso.x, iso.y);

            // Birinchi halqa — tez kengayadi, tez so'nadi
            const rx1 = r.maxRadius * Grid.TILE_W * t * z;
            const ry1 = rx1 * 0.45;
            const a1  = (1 - t) * 0.85;
            ctx.beginPath();
            ctx.ellipse(sc.x, sc.y, rx1, ry1, 0, 0, Math.PI * 2);
            ctx.strokeStyle = r.color;
            ctx.lineWidth   = (4 - t * 3.5) * z;
            ctx.globalAlpha = a1;
            ctx.shadowBlur  = 14 * z;
            ctx.shadowColor = r.color;
            ctx.stroke();
            ctx.shadowBlur  = 0;

            // Ikkinchi halqa — lag bilan kengayadi
            const t2  = Math.max(0, t - 0.18) / 0.82;
            const rx2 = r.maxRadius * Grid.TILE_W * t2 * z;
            const ry2 = rx2 * 0.45;
            const a2  = (1 - t2) * 0.5;
            ctx.beginPath();
            ctx.ellipse(sc.x, sc.y, rx2, ry2, 0, 0, Math.PI * 2);
            ctx.strokeStyle = r.color;
            ctx.lineWidth   = (2.5 - t2 * 2) * z;
            ctx.globalAlpha = a2;
            ctx.stroke();

            // Ichki to'liq fill — dastlabki 25% da
            if (t < 0.25) {
                const fillT = t / 0.25;
                ctx.beginPath();
                ctx.ellipse(sc.x, sc.y, rx1 * 0.7, ry1 * 0.7, 0, 0, Math.PI * 2);
                ctx.fillStyle = r.color;
                ctx.globalAlpha = (1 - fillT) * 0.18;
                ctx.fill();
            }

            return true;
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // Yer kuyish izlari — portlash va bino vayronidan qoladigan scorch marks
    _drawGroundMarks(ctx) {
        if (this._groundMarks.length === 0) return;
        const now = Date.now();
        const z   = Camera.zoom;
        ctx.save();

        this._groundMarks = this._groundMarks.filter(m => {
            const age = now - m.born;
            if (age > m.duration) return false;

            const fadeOut = age > m.duration * 0.7
                ? 1 - (age - m.duration * 0.7) / (m.duration * 0.3)
                : 1;

            const iso = Camera.toIso(m.x, m.y);
            const sc  = Camera.worldToScreen(iso.x, iso.y);
            const rx  = m.size * 18 * z;
            const ry  = rx * 0.45;

            // Asosiy kuyish doirasi — qoʻngʻir-kulrang
            ctx.save();
            ctx.globalAlpha = 0.45 * fadeOut;
            const grad = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, rx);
            grad.addColorStop(0, 'rgba(20,10,5,0.85)');
            grad.addColorStop(0.5, 'rgba(50,30,10,0.5)');
            grad.addColorStop(1, 'rgba(60,40,20,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(sc.x, sc.y, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Yon tomonlardagi kichik zigzag qirralar (seeded)
            const rng = (i) => { const v = Math.sin(m.seed * 12.98 + i * 78.23) * 43758.5; return v - Math.floor(v); };
            ctx.save();
            ctx.globalAlpha = 0.25 * fadeOut;
            ctx.strokeStyle = 'rgba(30,15,5,0.7)';
            ctx.lineWidth   = 0.7 * z;
            for (let ci = 0; ci < 3; ci++) {
                const ang  = rng(ci) * Math.PI * 2;
                const dist = (0.4 + rng(ci + 3) * 0.4) * rx;
                const slen = (0.1 + rng(ci + 6) * 0.15) * rx;
                ctx.beginPath();
                ctx.moveTo(sc.x + Math.cos(ang) * dist, sc.y + Math.sin(ang) * ry / rx * dist);
                ctx.lineTo(sc.x + Math.cos(ang + 0.3) * (dist + slen),
                           sc.y + Math.sin(ang + 0.3) * ry / rx * (dist + slen));
                ctx.stroke();
            }
            ctx.restore();

            return true;
        });

        ctx.restore();
    },

    // Splash portlash shockwave rings
    _drawShockwaves(ctx) {
        if (this._shockwaves.length === 0) return;
        const now = Date.now();
        const z   = Camera.zoom;
        ctx.save();

        this._shockwaves = this._shockwaves.filter(sw => {
            const age = now - sw.born;
            if (age > sw.dur) return false;

            const t = age / sw.dur;
            const iso = Camera.toIso(sw.x, sw.y);
            const sc  = Camera.worldToScreen(iso.x, iso.y);

            // Asosiy to'lqin halqasi — kengayadi va so'nadi
            const rx = sw.maxRad * Grid.TILE_W * t * z;
            const ry = rx * 0.45;
            const alpha = (1 - t) * 0.75;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = sw.color;
            ctx.lineWidth   = (3.5 - t * 3) * z;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur  = 10 * z * (1 - t);
            ctx.beginPath();
            ctx.ellipse(sc.x, sc.y, Math.max(1, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();

            // Ikkinchi kichikroq halqa (lag bilan)
            if (t > 0.12) {
                const t2 = (t - 0.12) / 0.88;
                const rx2 = sw.maxRad * Grid.TILE_W * t2 * z * 0.65;
                const ry2 = rx2 * 0.45;
                ctx.save();
                ctx.globalAlpha = (1 - t2) * 0.38;
                ctx.strokeStyle = sw.color;
                ctx.lineWidth   = (2 - t2 * 1.8) * z;
                ctx.beginPath();
                ctx.ellipse(sc.x, sc.y, Math.max(1, rx2), Math.max(0.5, ry2), 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            return true;
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // Askar tushirilish ring animatsiyasi
    _drawDeployRings(ctx) {
        if (this._deployRings.length === 0) return;
        const now = Date.now();
        const z   = Camera.zoom;
        ctx.save();

        this._deployRings = this._deployRings.filter(r => {
            const age  = now - r.born;
            if (age > r.life) return false;

            const t    = age / r.life;         // 0→1
            const iso  = Camera.toIso(r.x, r.y);
            const sc   = Camera.worldToScreen(iso.x, iso.y);

            // 2 concentric expanding rings
            for (let i = 0; i < 2; i++) {
                const delay = i * 0.2;
                const tt    = Math.max(0, t - delay) / (1 - delay);
                if (tt <= 0) continue;

                const rx    = (16 + tt * 36) * z;
                const ry    = rx * 0.45;
                const alpha = (1 - tt) * (i === 0 ? 0.8 : 0.5);

                ctx.beginPath();
                ctx.ellipse(sc.x, sc.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.strokeStyle = r.color;
                ctx.lineWidth   = (3 - tt * 2.5) * z;
                ctx.globalAlpha = alpha;
                ctx.stroke();
            }
            return true;
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ── Sehr ghost preview — radius doirasi + icon ───────────────────────────
    _drawSpellGhost(ctx) {
        if (this._ghostX < 0 || this._ghostY < 0) return;
        if (typeof DeployPanel === 'undefined' || !DeployPanel.selectedTroop) return;
        const sel = DeployPanel.selectedTroop;
        if (!sel.startsWith('spell:')) return;

        const spellType = sel.slice(6);   // 'spell:freeze' → 'freeze'
        const sdef = typeof SPELL_DATA !== 'undefined' ? SPELL_DATA[spellType] : null;
        const eff   = sdef?.effect;
        if (!eff) return;

        const z = Camera.zoom;
        const now = Date.now();
        const pulse = (Math.sin(now * 0.005) + 1) / 2;

        const iso = Camera.toIso(this._ghostX, this._ghostY);
        const cx  = Camera.worldToScreen(iso.x, iso.y);

        // Radius doirasi
        const radius = (eff.radius || 3.5) * Grid.TILE_W * z;
        const ry     = radius * (Grid.TILE_H / Grid.TILE_W);

        // Spell rangi
        const SPELL_COLORS = {
            heal:       { fill: 'rgba(76,175,80,',   stroke: 'rgba(129,199,132,', icon: '💚' },
            rage:       { fill: 'rgba(255,100,0,',   stroke: 'rgba(255,152,0,',  icon: '🔥' },
            lightning:  { fill: 'rgba(255,193,7,',   stroke: 'rgba(255,235,59,', icon: '⚡' },
            freeze:     { fill: 'rgba(33,150,243,',  stroke: 'rgba(144,202,249,',icon: '❄️' },
            earthquake: { fill: 'rgba(139,90,43,',   stroke: 'rgba(205,133,63,', icon: '🌍' },
            haste:      { fill: 'rgba(0,229,255,',   stroke: 'rgba(128,240,255,',icon: '💨' },
            jump:       { fill: 'rgba(105,240,174,',  stroke: 'rgba(178,255,89,', icon: '🦘' },
            poison:     { fill: 'rgba(100,221,23,',  stroke: 'rgba(178,255,89,', icon: '☠️' },
            clone:      { fill: 'rgba(171,71,188,',  stroke: 'rgba(206,147,216,',icon: '🪞' },
        };
        const col = SPELL_COLORS[spellType] || { fill: 'rgba(255,255,255,', stroke: 'rgba(200,200,200,', icon: '✨' };

        ctx.save();

        // Dolga pulsing ellipse
        ctx.beginPath();
        ctx.ellipse(cx.x, cx.y, radius * (0.95 + pulse * 0.05), ry * (0.95 + pulse * 0.05), 0, 0, Math.PI * 2);
        ctx.fillStyle   = `${col.fill}${0.12 + pulse * 0.08})`;
        ctx.fill();
        ctx.strokeStyle = `${col.stroke}${0.7 + pulse * 0.2})`;
        ctx.lineWidth   = 2 * z;
        ctx.setLineDash([5 * z, 4 * z]);
        ctx.lineDashOffset = -now * 0.025 % (18 * z);
        ctx.stroke();
        ctx.setLineDash([]);

        // Outer glow ring (faint)
        ctx.beginPath();
        ctx.ellipse(cx.x, cx.y, radius * 1.08, ry * 1.08, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `${col.stroke}${0.25 + pulse * 0.1})`;
        ctx.lineWidth = 1 * z;
        ctx.stroke();

        // Earthquake: cracked ground lines radiating from center
        if (spellType === 'earthquake') {
            const crackAngles = [0, 45, 90, 135, 180, 225, 270, 315];
            ctx.strokeStyle = `rgba(205,133,63,${0.55 + pulse * 0.25})`;
            ctx.lineWidth = 1.5 * z;
            ctx.setLineDash([]);
            for (const deg of crackAngles) {
                const rad = (deg + now * 0.02) * Math.PI / 180;
                const len = radius * (0.55 + pulse * 0.15);
                const ex  = cx.x + Math.cos(rad) * len;
                const ey  = cx.y + Math.sin(rad) * len * (Grid.TILE_H / Grid.TILE_W);
                // Zigzag crack
                const midX = cx.x + Math.cos(rad) * len * 0.5 + Math.sin(rad) * 4 * z;
                const midY = cx.y + Math.sin(rad) * len * 0.5 * (Grid.TILE_H / Grid.TILE_W) - Math.cos(rad) * 4 * z;
                ctx.beginPath();
                ctx.moveTo(cx.x, cx.y);
                ctx.lineTo(midX, midY);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
        }

        // Haste: speed streaks rotating around perimeter
        if (spellType === 'haste') {
            const streakCount = 6;
            for (let i = 0; i < streakCount; i++) {
                const baseAng = (i / streakCount) * Math.PI * 2 + now * 0.003;
                const sx = cx.x + Math.cos(baseAng) * radius * 0.75;
                const sy = cx.y + Math.sin(baseAng) * ry * 0.75;
                const ex = cx.x + Math.cos(baseAng - 0.4) * radius * 0.45;
                const ey = cx.y + Math.sin(baseAng - 0.4) * ry * 0.45;
                const grad = ctx.createLinearGradient(ex, ey, sx, sy);
                grad.addColorStop(0, `rgba(0,229,255,0)`);
                grad.addColorStop(1, `rgba(0,229,255,${0.6 + pulse * 0.2})`);
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(sx, sy);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2 * z;
                ctx.setLineDash([]);
                ctx.stroke();
            }
        }

        // Spell icon — cursor ustida suzib
        const flyY = cx.y - radius * 0.5 - 18 * z - Math.sin(now * 0.005) * 4 * z;
        ctx.globalAlpha = 0.85 + pulse * 0.15;
        ctx.font = `${Math.max(16, 22 * z)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = col.stroke + '0.9)';
        ctx.shadowBlur  = 10 * z;
        ctx.fillText(col.icon, cx.x, flyY);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        ctx.restore();
    },

    // Ghost troop preview — sichqon xaritada turganida
    _drawGhostTroop(ctx) {
        if (this._ghostX < 0 || this._ghostY < 0) return;
        if (typeof DeployPanel === 'undefined' || !DeployPanel.selectedTroop) return;
        const type = DeployPanel.selectedTroop;
        if (type.startsWith('spell:')) return;

        const td = TROOP_DATA?.[type];
        if (!td) return;

        const z   = Camera.zoom;
        const now = Date.now();
        const iso = Camera.toIso(this._ghostX, this._ghostY);
        const sc  = Camera.worldToScreen(iso.x, iso.y);

        ctx.save();

        // Yer soyasi (ellipse)
        const pulse = (Math.sin(now * 0.008) + 1) / 2;
        const rx = Math.max(10, 14 * z);
        const ry = rx * 0.45;
        ctx.beginPath();
        ctx.ellipse(sc.x, sc.y, rx * (0.85 + pulse * 0.15), ry * (0.85 + pulse * 0.15), 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 220, 0, ${0.2 + pulse * 0.1})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 1.5 * z;
        ctx.stroke();

        // Ghost troop icon — semi-transparent, yuqorida suzib
        const flyOffset = 4 * z + Math.sin(now * 0.006) * 3 * z;
        ctx.globalAlpha = 0.65 + pulse * 0.2;
        ctx.font = `${Math.max(14, 18 * z)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255,215,0,0.8)';
        ctx.shadowBlur = 8 * z;
        ctx.fillText(td.icon, sc.x, sc.y - flyOffset - 8 * z);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        ctx.restore();
    },

    _drawSpellEffects(ctx) {
        if (typeof SpellSystem === 'undefined') return;
        const now = Date.now();
        const z   = Camera.zoom;

        for (const eff of SpellSystem._activeEffects) {
            if (now >= eff.endTime) continue;
            const remaining = (eff.endTime - now) / 1000;
            const totalDur  = eff.endTime - eff.startTime || 1;
            const progress  = 1 - (eff.endTime - now) / totalDur;
            const pulse     = (Math.sin(now * 0.006) + 1) / 2;

            const iso    = Camera.toIso(eff.x, eff.y);
            const center = Camera.worldToScreen(iso.x, iso.y);

            const rx = eff.radius * 32 * z;
            const ry = rx * 0.5;

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);

            let fillColor, strokeColor, label;
            if (eff.type === 'rage') {
                fillColor   = `rgba(255, 100, 0, ${0.08 + pulse * 0.10})`;
                strokeColor = `rgba(255, 60, 0, ${0.6 + pulse * 0.3})`;
                label = '🔥';
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2.5 * z;
                ctx.setLineDash([5 * z, 3 * z]);
                ctx.stroke();
                ctx.setLineDash([]);
                // ── Orbiting fire balls — 5 ta olov shari aylanadi ──────────────────
                const orbitCount = 5;
                for (let oi = 0; oi < orbitCount; oi++) {
                    const oAng  = (oi / orbitCount) * Math.PI * 2 + now * 0.003;
                    const oDist = 0.7 + Math.sin(now * 0.002 + oi * 1.3) * 0.12;
                    const obx   = center.x + Math.cos(oAng) * rx * oDist;
                    const oby   = center.y + Math.sin(oAng) * ry * oDist;
                    const oSize = (2.5 + Math.sin(now * 0.004 + oi * 0.8) * 0.8) * z;
                    // Trail (past position)
                    for (let ti = 1; ti <= 3; ti++) {
                        const tAng = oAng - ti * 0.18;
                        const tbx  = center.x + Math.cos(tAng) * rx * oDist;
                        const tby  = center.y + Math.sin(tAng) * ry * oDist;
                        ctx.save();
                        ctx.globalAlpha = (0.4 - ti * 0.12) * (0.6 + pulse * 0.4);
                        ctx.fillStyle = `rgba(255,${120 - ti * 30},0,1)`;
                        ctx.beginPath();
                        ctx.arc(tbx, tby, oSize * (1 - ti * 0.25), 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                    // Main fire ball — glow + core
                    ctx.save();
                    ctx.shadowColor = '#ff6d00';
                    ctx.shadowBlur  = 6 * z;
                    ctx.globalAlpha = 0.92;
                    const fGrad = ctx.createRadialGradient(obx, oby, 0, obx, oby, oSize * 1.8);
                    fGrad.addColorStop(0,   'rgba(255,240,120,1)');
                    fGrad.addColorStop(0.45,'rgba(255,120,0,0.9)');
                    fGrad.addColorStop(1,   'rgba(255,50,0,0)');
                    ctx.fillStyle = fGrad;
                    ctx.beginPath();
                    ctx.arc(obx, oby, oSize * 1.8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                // Rage sparks — har 4 frame
                if (Math.random() < 0.25) {
                    const angle = Math.random() * Math.PI * 2;
                    const sr = Math.random() * rx;
                    const sx = center.x + Math.cos(angle) * sr;
                    const sy = center.y + Math.sin(angle) * ry / rx * sr;
                    ctx.beginPath();
                    ctx.arc(sx, sy, (1 + Math.random() * 2) * z, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,${100 + Math.random()*80 | 0},0,0.9)`;
                    ctx.fill();
                }
            } else if (eff.type === 'freeze') {
                fillColor   = `rgba(40, 160, 255, ${0.07 + pulse * 0.08})`;
                strokeColor = `rgba(120, 220, 255, ${0.7 + pulse * 0.25})`;
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2 * z;
                ctx.setLineDash([6 * z, 4 * z]);
                ctx.stroke();
                ctx.setLineDash([]);
                // ── Yer muz patchi — seeded tasodifiy joylarda ─────────────────
                const patchCount = Math.min(10, Math.ceil(eff.radius * 3));
                for (let pi = 0; pi < patchCount; pi++) {
                    // Deterministik seed (eff pozitsiyasiga bog'liq)
                    const pseed  = (eff.x * 17 + eff.y * 31 + pi * 97) & 0xffff;
                    const prng   = (n) => { const v = Math.sin(pseed * 12.9898 + n * 78.233) * 43758.5453; return v - Math.floor(v); };
                    const pAngle = prng(0) * Math.PI * 2;
                    const pDist  = prng(1) * 0.82;    // radius nisbati
                    const pSize  = (prng(2) * 0.5 + 0.35) * z * 6;
                    const pAlpha = 0.25 + prng(3) * 0.25 + pulse * 0.15;
                    const px     = center.x + Math.cos(pAngle) * rx * pDist;
                    const py     = center.y + Math.sin(pAngle) * ry * pDist;
                    // Mini snowflake 4-spoke
                    ctx.save();
                    ctx.globalAlpha = pAlpha;
                    ctx.strokeStyle = `rgba(200,240,255,0.9)`;
                    ctx.lineWidth   = 0.8 * z;
                    ctx.translate(px, py);
                    ctx.rotate(prng(4) * Math.PI + now * 0.0003);
                    for (let si = 0; si < 4; si++) {
                        const sa = (si / 4) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(sa) * pSize, Math.sin(sa) * pSize);
                        ctx.stroke();
                    }
                    // Center dot
                    ctx.fillStyle = 'rgba(220,245,255,0.8)';
                    ctx.beginPath();
                    ctx.arc(0, 0, pSize * 0.18, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // Ice crystals — snowflake spikes (perimeter)
                ctx.strokeStyle = `rgba(180,240,255,${0.4 + pulse * 0.3})`;
                ctx.lineWidth = 1 * z;
                const spikes = 6;
                for (let k = 0; k < spikes; k++) {
                    const ang = (k / spikes) * Math.PI * 2 + now * 0.0008;
                    const endX = center.x + Math.cos(ang) * rx * 0.92;
                    const endY = center.y + Math.sin(ang) * ry * 0.92;
                    ctx.beginPath();
                    ctx.moveTo(center.x, center.y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                    // Cross bars
                    const midX = center.x + Math.cos(ang) * rx * 0.55;
                    const midY = center.y + Math.sin(ang) * ry * 0.55;
                    const perpX = Math.cos(ang + Math.PI / 2) * rx * 0.12;
                    const perpY = Math.sin(ang + Math.PI / 2) * ry * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(midX - perpX, midY - perpY);
                    ctx.lineTo(midX + perpX, midY + perpY);
                    ctx.stroke();
                }

                // Rising ice particles (occasional)
                if (Math.random() < 0.18) {
                    const ia  = Math.random() * Math.PI * 2;
                    const id  = Math.random() * rx * 0.9;
                    const ipx = center.x + Math.cos(ia) * id;
                    const ipy = center.y + Math.sin(ia) * ry / rx * id;
                    ctx.save();
                    ctx.globalAlpha = 0.55 + Math.random() * 0.3;
                    ctx.fillStyle = '#b3e5fc';
                    ctx.font = `${(6 + Math.random() * 4) * z}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('❄', ipx, ipy);
                    ctx.restore();
                }
            } else if (eff.type === 'heal') {
                fillColor   = `rgba(0, 220, 100, ${0.07 + pulse * 0.09})`;
                strokeColor = `rgba(0, 220, 80, ${0.5 + pulse * 0.3})`;
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2 * z;
                ctx.setLineDash([6 * z, 4 * z]);
                ctx.stroke();
                ctx.setLineDash([]);
                // ── Orbiting healing orbs — 4 ta yashil shar ────────────────────
                const healOrbCount = 4;
                for (let hi = 0; hi < healOrbCount; hi++) {
                    const hAng  = (hi / healOrbCount) * Math.PI * 2 + now * 0.0025;
                    const hDist = 0.62 + Math.sin(now * 0.002 + hi * 1.57) * 0.08;
                    const hbx   = center.x + Math.cos(hAng) * rx * hDist;
                    const hby   = center.y + Math.sin(hAng) * ry * hDist;
                    const hSize = (2.2 + Math.sin(now * 0.005 + hi * 0.9) * 0.6) * z;
                    // Trailing glow
                    ctx.save();
                    ctx.globalAlpha = 0.35 + pulse * 0.2;
                    ctx.shadowColor = '#00e676';
                    ctx.shadowBlur  = 6 * z;
                    const hGrad = ctx.createRadialGradient(hbx, hby, 0, hbx, hby, hSize * 2.2);
                    hGrad.addColorStop(0,   'rgba(200,255,220,1)');
                    hGrad.addColorStop(0.4, 'rgba(0,230,118,0.8)');
                    hGrad.addColorStop(1,   'rgba(0,150,80,0)');
                    ctx.fillStyle = hGrad;
                    ctx.beginPath();
                    ctx.arc(hbx, hby, hSize * 2.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // Rising heal cross particles
                if (Math.random() < 0.2) {
                    const ax = center.x + (Math.random() - 0.5) * rx * 1.6;
                    const ay = center.y + (Math.random() - 0.5) * ry * 1.6;
                    ctx.globalAlpha = 0.7;
                    ctx.font = `${10 * z}px sans-serif`;
                    ctx.fillStyle = '#69f0ae';
                    ctx.textAlign = 'center';
                    ctx.fillText('+', ax, ay);
                }
            } else if (eff.type === 'haste') {
                fillColor   = `rgba(0, 229, 255, ${0.06 + pulse * 0.08})`;
                strokeColor = `rgba(100, 240, 255, ${0.55 + pulse * 0.3})`;
                label = '💨';
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2 * z;
                ctx.setLineDash([4 * z, 6 * z]);
                ctx.stroke();
                ctx.setLineDash([]);
                // Speed streaks radiating outward
                if (Math.random() < 0.2) {
                    const ang = Math.random() * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(center.x, center.y);
                    ctx.lineTo(center.x + Math.cos(ang) * rx * 0.9, center.y + Math.sin(ang) * ry * 0.9);
                    ctx.strokeStyle = `rgba(0,229,255,${0.3 + Math.random()*0.4})`;
                    ctx.lineWidth = 1 * z;
                    ctx.stroke();
                }
            } else if (eff.type === 'jump') {
                fillColor   = `rgba(105, 240, 174, ${0.06 + pulse * 0.08})`;
                strokeColor = `rgba(150, 255, 200, ${0.6 + pulse * 0.3})`;
                label = '🦘';
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2 * z;
                ctx.setLineDash([8 * z, 3 * z]);
                ctx.stroke();
                ctx.setLineDash([]);
                // Bouncing arc particles
                if (Math.random() < 0.15) {
                    const ax = center.x + (Math.random() - 0.5) * rx * 1.4;
                    const ay = center.y + (Math.random() - 0.5) * ry * 1.4;
                    ctx.font = `${9 * z}px sans-serif`;
                    ctx.fillStyle = '#b2ff59';
                    ctx.textAlign = 'center';
                    ctx.fillText('↑', ax, ay);
                }
            } else if (eff.type === 'poison') {
                fillColor   = `rgba(100, 220, 30, ${0.07 + pulse * 0.10})`;
                strokeColor = `rgba(140, 255, 50, ${0.5 + pulse * 0.3})`;
                label = '☠️';
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2 * z;
                ctx.setLineDash([3 * z, 5 * z]);
                ctx.stroke();
                ctx.setLineDash([]);
                // Bubbling poison particles
                if (Math.random() < 0.25) {
                    const ax = center.x + (Math.random() - 0.5) * rx * 1.5;
                    const ay = center.y + (Math.random() - 0.5) * ry * 1.5;
                    ctx.beginPath();
                    ctx.arc(ax, ay, (1 + Math.random() * 3) * z, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(100,221,23,${0.5 + Math.random()*0.4})`;
                    ctx.fill();
                }
            } else {
                ctx.restore();
                continue;
            }

            // Vaqt qolmagan yozuvi
            ctx.globalAlpha = 0.85;
            ctx.font = `bold ${11 * z}px sans-serif`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(`${label} ${remaining.toFixed(1)}s`, center.x, center.y - ry - 6 * z);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    },

    // Chaqmoq arc effekti
    _drawLightningArcs(ctx) {
        if (this._lightningArcs.length === 0) return;
        const now = Date.now();
        const z   = Camera.zoom;

        ctx.save();
        for (let i = this._lightningArcs.length - 1; i >= 0; i--) {
            const arc = this._lightningArcs[i];
            const age = now - (arc.until - 500);
            const life = (arc.until - now) / 500;

            if (life <= 0) { this._lightningArcs.splice(i, 1); continue; }

            const iso    = Camera.toIso(arc.x, arc.y);
            const target = Camera.worldToScreen(iso.x, iso.y);
            const startY = target.y - 180 * z;

            // Zigzag path
            const segs = 8;
            let prng = arc.seed;
            const rnd = () => { prng = (prng * 1664525 + 1013904223) & 0xffffff; return prng / 0xffffff; };

            ctx.globalAlpha = life * 0.9;
            ctx.lineWidth = (3 - life * 2) * z;
            ctx.shadowBlur = 20 * z;
            ctx.shadowColor = '#ffeb3b';
            ctx.strokeStyle = `rgba(255,240,80,${life})`;

            for (let branch = 0; branch < 3; branch++) {
                let px = target.x, py = startY;
                ctx.beginPath();
                ctx.moveTo(px, py);
                for (let s = 0; s < segs; s++) {
                    const t2 = s / segs;
                    const nx = target.x + (rnd() - 0.5) * 30 * z * (1 - t2);
                    const ny = startY + (target.y - startY) * ((s + 1) / segs);
                    ctx.lineTo(nx, ny);
                    px = nx; py = ny;
                }
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    _drawParticles(ctx) {
        const z = Camera.zoom;
        ctx.save();
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x  += p.vx;
            p.y  += p.vy;
            p.vy += 0.1;
            p.life -= p.decay;
            if (p.rot !== undefined) p.rot += (p.rotSpd || 0);

            if (p.life <= 0) {
                p.active = false;
                this.particles.splice(i, 1);
                continue;
            }

            const iso = Camera.toIso(p.x, p.y);
            const s   = Camera.worldToScreen(iso.x, iso.y);
            const sz  = p.size * z;
            const alpha = Math.min(1, p.life);

            ctx.globalAlpha = alpha;

            const shape = p.shape || 'circle';

            // Yorqin ranglar uchun glow
            const isHot = (p.color === '#ffffff' || p.color === '#fff200' ||
                           p.color === '#ffeb3b' || p.color === '#ffe082' ||
                           shape === 'flash');
            if (isHot) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur  = sz * 2.2;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fillStyle = p.color;

            if (shape === 'flash') {
                // Katta oq doira — tez yo'qoladi, alpha kvadrat
                ctx.globalAlpha = alpha * alpha;
                ctx.beginPath();
                ctx.arc(s.x, s.y, sz * 2.5, 0, Math.PI * 2);
                ctx.fill();

            } else if (shape === 'circle') {
                ctx.beginPath();
                ctx.arc(s.x, s.y, sz, 0, Math.PI * 2);
                ctx.fill();

            } else if (shape === 'spark') {
                // Ingichka uzun chiziq — harakat yo'nalishida
                const rot = p.rot || 0;
                const len = sz * 3.5;
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(rot);
                ctx.fillRect(-len * 0.7, -sz * 0.4, len, sz * 0.8);
                ctx.restore();

            } else if (shape === 'diamond') {
                // Aylanadigan kvadrat (diamond)
                const rot = p.rot || 0;
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(rot + Math.PI / 4);
                ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
        ctx.restore();
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

        // 2. Yashil deploy border — xarita chegarasi bo'ylab (CoC uslubi)
        this._renderDeployBorder(ctx, pulse);

        ctx.restore();
    },

    // ── Yashil deploy chegarasi — troops tushirish mumkin bo'lgan joy ──────
    _renderDeployBorder(ctx, pulse) {
        const S = Grid.SIZE;
        const borderW = 2;   // 2 tile keng yashil chegara
        const time = Date.now();
        const greenPulse = 0.35 + Math.sin(time * 0.004) * 0.15;

        ctx.save();

        // Xarita chegarasidagi 4 ta kenar bo'ylab yashil zona
        const edges = [
            { x: 0,         y: 0,          w: S,      h: borderW }, // Shimol
            { x: 0,         y: S - borderW, w: S,      h: borderW }, // Janub
            { x: 0,         y: 0,          w: borderW, h: S      }, // G'arb
            { x: S - borderW, y: 0,        w: borderW, h: S      }, // Sharq
        ];

        for (const e of edges) {
            this._drawIsoRect(
                ctx,
                e.x, e.y, e.w, e.h,
                `rgba(76,255,128,${greenPulse * 0.25})`,
                `rgba(76,255,128,${greenPulse + 0.1})`
            );
        }

        // ── Border particle emitters — chegara bo'ylab yashil zarrachalar ────────
        if (DeployPanel.selectedTroop && Camera.zoom > 0.4) {
            const z3 = Camera.zoom;
            // Har frameda 30% ehtimol bilan border bo'ylab zarracha
            if (Math.random() < 0.3) {
                const borderTiles = [];
                // Shimol chegara
                for (let bx = 0; bx < S; bx += 3) { borderTiles.push({ x: bx, y: 0 }); }
                // Janub chegara
                for (let bx = 0; bx < S; bx += 3) { borderTiles.push({ x: bx, y: S - 1 }); }
                // G'arb chegara
                for (let by = 0; by < S; by += 3) { borderTiles.push({ x: 0, y: by }); }
                // Sharq chegara
                for (let by = 0; by < S; by += 3) { borderTiles.push({ x: S - 1, y: by }); }

                const pick = borderTiles[Math.floor(Math.random() * borderTiles.length)];
                if (pick) {
                    const isoP = Camera.toIso(pick.x + 0.5, pick.y + 0.5);
                    const scP  = Camera.worldToScreen(isoP.x, isoP.y);
                    if (scP.x > -10 && scP.x < ctx.canvas.width + 10 &&
                        scP.y > -10 && scP.y < ctx.canvas.height + 10) {
                        ctx.save();
                        ctx.globalAlpha = 0.5 + Math.random() * 0.4;
                        ctx.fillStyle = Math.random() > 0.3 ? '#69f0ae' : '#b2dfdb';
                        ctx.shadowColor = '#69f0ae';
                        ctx.shadowBlur  = 4 * z3;
                        ctx.beginPath();
                        ctx.arc(scP.x, scP.y - (2 + Math.random() * 8) * z3, (1 + Math.random() * 1.5) * z3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        ctx.restore();
                    }
                }
            }
        }

        // "Askar tashla" matnini xarita shimolida ko'rsat (bir marta)
        if (DeployPanel.selectedTroop) {
            const isoTop = Camera.toIso(S / 2, 0);
            const sTop   = Camera.worldToScreen(isoTop.x, isoTop.y);
            const alpha  = 0.55 + Math.sin(time * 0.004) * 0.2;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${Math.max(11, 13 * Camera.zoom)}px Inter,sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#69f0ae';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 5;
            ctx.fillText('👇 Shu yerga tashla', sTop.x, sTop.y - 12 * Camera.zoom);
            ctx.restore();
        }

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
        const data = TROOP_DATA[t.type];
        if (!data) return; // noma'lum askar turi — chiqib ketish

        // Deploy drop — yuqoridan pastga tushish animatsiyasi
        let deployDropOffset = 0;
        let deployDropAlpha = 1;
        if (t._deployDropUntil && Date.now() < t._deployDropUntil) {
            const dropProgress = 1 - (t._deployDropUntil - Date.now()) / 380; // 0→1
            // Cubic ease-in: hizlalanib tushadi
            const eased = dropProgress * dropProgress * dropProgress;
            deployDropOffset = (1 - eased) * 40 * Camera.zoom;  // 40px yuqorida boshlanadi
            deployDropAlpha  = 0.5 + eased * 0.5;
        } else if (t._deployDropUntil) {
            delete t._deployDropUntil;
        }

        // O'lish fade-out
        let deathAlpha = 1;
        let deathScale = 1;
        if (t._deathTime) {
            const age = Date.now() - t._deathTime;
            const progress = Math.min(1, age / 380);
            deathAlpha = 1 - progress;
            deathScale = 1 - progress * 0.5;
            if (deathAlpha <= 0) return;
        }

        // Dodge sidestep offset
        let drawX = t.x, drawY = t.y;
        if (t._dodgeOffset) {
            const now = Date.now();
            if (now < t._dodgeOffset.until) {
                const progress = 1 - (t._dodgeOffset.until - now) / 220;
                // Sinusoidal: jump out then come back
                const factor = Math.sin(progress * Math.PI);
                drawX += t._dodgeOffset.dx * factor;
                drawY += t._dodgeOffset.dy * factor;
            } else {
                delete t._dodgeOffset;
            }
        }

        const iso  = Camera.toIso(drawX, drawY);
        const z    = Camera.zoom;

        // Uchuvchi askarlar yuqoriga ko'tariladi (screen pixels)
        const flyOffset = data.flying ? (data.flyHeight || 3.0) * 10 * z : 0;
        const baseScreen = Camera.worldToScreen(iso.x, iso.y);
        const screen = { x: baseScreen.x, y: baseScreen.y - flyOffset - deployDropOffset };

        // Deploy drop alpha
        if (deployDropAlpha < 1 && deathAlpha >= 1) {
            ctx.globalAlpha = deployDropAlpha;
        }

        if (screen.x < -20 || screen.x > ctx.canvas.width + 20 ||
            screen.y < -20 || screen.y > ctx.canvas.height + 20) return;

        // ── Yer soyasi — yer askarlari uchun isometrik ellips shadow ───────────
        if (!data.flying && deathAlpha > 0.3) {
            const shadowAlpha = 0.18 * deathAlpha * (deployDropAlpha < 1 ? deployDropAlpha : 1);
            if (shadowAlpha > 0.02) {
                const gndSx = baseScreen.x + 2 * z;   // Yorug'lik yuqori-o'ng dan
                const gndSy = baseScreen.y + 1 * z;
                const srx   = (data.size || 1) * 7 * z;
                const sry   = srx * 0.35;
                ctx.save();
                ctx.globalAlpha = shadowAlpha;
                const sGrad = ctx.createRadialGradient(gndSx, gndSy, 0, gndSx, gndSy, srx);
                sGrad.addColorStop(0,   'rgba(0,0,0,0.75)');
                sGrad.addColorStop(0.55,'rgba(0,0,0,0.38)');
                sGrad.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = sGrad;
                ctx.beginPath();
                ctx.ellipse(gndSx, gndSy, srx, sry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Tana rangi va quroli
        let bodyColor = '#d32f2f';
        let weapon = null;
        if (data.category === 'piyoda')   { bodyColor = '#c62828'; weapon = 'sword'; }
        if (data.category === 'otishma')  { bodyColor = '#2e7d32'; weapon = 'bow'; }
        if (data.category === 'otliq')    { bodyColor = '#6a1b9a'; weapon = 'sword'; }
        if (data.category === 'qamal')    { bodyColor = '#4e342e'; weapon = 'ram'; }
        if (data.category === 'uchuvchi') { bodyColor = '#0277bd'; weapon = 'bow'; }
        if (data.stats.type === 'healer') { bodyColor = '#fbc02d'; weapon = 'staff'; }
        if (data.stats.type === 'siege')  { bodyColor = '#5d4037'; weapon = 'ram'; }

        let wobble = 0;
        let walkCycle = 0;
        if (t.state === 'moving') {
            wobble = Math.sin(Date.now() * 0.015) * 3 * z;
            walkCycle = Math.sin(Date.now() * 0.015);
            // ── Dust trail — harakatlangan yerda chang zarrachalari (CoC-style) ──
            if (!data.flying && Math.random() < 0.08) {
                const dustP = _acquireParticle();
                dustP.active  = true;
                dustP.x       = t.x + (Math.random() - 0.5) * 0.3;
                dustP.y       = t.y + (Math.random() - 0.5) * 0.3;
                dustP.vx      = (Math.random() - 0.5) * 0.015;
                dustP.vy      = (Math.random() - 0.5) * 0.01;
                dustP.life    = 0.55 + Math.random() * 0.3;
                dustP.decay   = 0.018 + Math.random() * 0.012;
                const g = Math.floor(150 + Math.random() * 60);
                dustP.color   = `rgb(${g},${g},${g - 10})`;
                dustP.size    = (1.5 + Math.random() * 1.5) * z;
                dustP.shape   = 'circle';
                this.particles.push(dustP);
            }
        } else if (t.state === 'attacking') {
            // ── CoC-style wind-up / strike / recovery animatsiya ─────────────
            // t.lastAttack — oxirgi zarba vaqti; t.attackSpeed — ms
            const atkSpd  = t.attackSpeed || 1200;
            const atkAge  = t.lastAttack ? (Date.now() - t.lastAttack) : atkSpd;
            const atkPhase = Math.min(1, atkAge / atkSpd); // 0→1 (bir to'liq sikl)
            const isMelee = data.stats?.type === 'melee' || data.stats?.type === 'siege';

            if (isMelee) {
                // Melee: orqaga tortilish (0-20%) → oldinga tashlash (20-45%) → qaytish (45-100%)
                if (atkPhase < 0.2) {
                    const bt = atkPhase / 0.2;
                    wobble = -Math.sin(bt * Math.PI * 0.5) * 4 * z;  // Orqaga tilt
                    walkCycle = -bt * 0.6;                             // Qurol orqaga
                } else if (atkPhase < 0.45) {
                    const bt = (atkPhase - 0.2) / 0.25;
                    wobble = -(1-bt) * 4 * z + Math.sin(bt * Math.PI) * 2 * z;
                    walkCycle = -0.6 + bt * 1.4;                       // Oldinga zarba
                } else {
                    const bt = (atkPhase - 0.45) / 0.55;
                    wobble = Math.sin((1-bt) * Math.PI * 0.5) * 1.5 * z * (1-bt);
                    walkCycle = 0.8 * (1 - bt);                        // Qaytish
                }
            } else {
                // Ranged: kamon tortish (0-35%) → o'q otish flash (35-50%) → dam (50-100%)
                if (atkPhase < 0.35) {
                    const bt = atkPhase / 0.35;
                    wobble = Math.sin(bt * Math.PI * 0.5) * 2 * z;    // Kamon tortish
                    walkCycle = bt * 0.9;
                } else if (atkPhase < 0.5) {
                    const bt = (atkPhase - 0.35) / 0.15;
                    wobble = (1-bt) * 2 * z;
                    walkCycle = 0.9 - bt * 0.9;
                } else {
                    wobble = Math.sin(Date.now() * 0.03) * 0.8 * z;   // Tebranish
                    walkCycle = 0;
                }
            }
        } else if (t.state === 'idle') {
            // Gentle idle bob — CoC uslubida askar turib tinmay qimirlab turadi
            const idleFreq = 0.003 + (t.id % 100) * 0.00001; // har askar boshqa freq
            wobble = Math.sin(Date.now() * idleFreq) * 1.2 * z;
            walkCycle = Math.sin(Date.now() * idleFreq * 0.5) * 0.3;
        }

        // O'lish animatsiyasi — scale transform
        if (deathScale !== 1) {
            ctx.save();
            ctx.translate(screen.x, screen.y);
            ctx.scale(deathScale, deathScale);
            ctx.translate(-screen.x, -screen.y);
            ctx.globalAlpha *= deathAlpha;
        }

        // ── Super troop / qahramon aura glow ────────────────────────────────────
        if ((t._isSuper || data.category === 'qahramon') && deathAlpha > 0.2) {
            const auraColor = t._superColor || (data.category === 'qahramon' ? '#ffd700' : '#ff6d00');
            const auraPulse = (Math.sin(Date.now() * 0.006 + t.id * 0.3) + 1) / 2;
            const auraR = (data.category === 'qahramon' ? 14 : 11) * z;
            ctx.save();
            ctx.globalAlpha = (0.25 + auraPulse * 0.2) * deathAlpha;
            const aGrad = ctx.createRadialGradient(screen.x, screen.y - 8*z, 0,
                                                    screen.x, screen.y - 8*z, auraR);
            aGrad.addColorStop(0,   auraColor + 'bb');
            aGrad.addColorStop(0.5, auraColor + '55');
            aGrad.addColorStop(1,   auraColor + '00');
            ctx.fillStyle = aGrad;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 8*z, auraR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Shadow — uchuvchilar uchun soya yerda (baseScreen.y)
        const groundY = baseScreen.y;
        ctx.fillStyle = data.flying ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(screen.x, groundY, data.flying ? 8*z : 6*z, data.flying ? 3*z : 3*z, 0, 0, Math.PI * 2);
        ctx.fill();

        // Uchuvchi — vertikal chiziq (balandlik ko'rsatgich)
        if (data.flying) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1 * z;
            ctx.setLineDash([2*z, 2*z]);
            ctx.beginPath();
            ctx.moveTo(screen.x, groundY - 3*z);
            ctx.lineTo(screen.x, screen.y + 14*z);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        const by = screen.y - 4*z + wobble;

        // ── Sprite yoki procedural render ────────────────────────────────────
        const animState = t.state === 'moving' ? 'walk' : t.state === 'attacking' ? 'attack' : 'idle';
        const frame = AssetManager.getFrame(t.type, animState);

        if (frame) {
            // Asset mavjud — animatsiya frame chizish
            const cfg  = AssetManager.TROOP_FRAME[t.type] || { w: 64, h: 96 };
            const scale = Math.max(0.5, z) * (18 / cfg.w); // Ekran o'lchamiga moslashtirish
            const dw   = cfg.w * scale;
            const dh   = cfg.h * scale;
            ctx.drawImage(frame.img, frame.sx, frame.sy, frame.sw, frame.sh,
                          screen.x - dw/2, by - dh + 4*z, dw, dh);
        } else {
            // Fallback — procedural (asset yuklanmaguncha yoki yo'q bo'lsa)
            if (data.stats.type === 'siege' || data.category === 'qamal') {
                ctx.fillStyle = '#6d4c41';
                ctx.fillRect(screen.x - 10*z, by - 8*z, 20*z, 6*z);
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(screen.x - 10*z, by - 8*z, 20*z, 2*z);
                ctx.fillStyle = '#9e9e9e';
                ctx.beginPath();
                ctx.moveTo(screen.x + 10*z, by - 8*z);
                ctx.lineTo(screen.x + 15*z + (t.state==='attacking'?walkCycle*4*z:0), by - 5*z);
                ctx.lineTo(screen.x + 10*z, by - 2*z);
                ctx.fill();
            } else {
                // ── Oyoqlar — 2 ta vertikal chiziq ────────────────────────────────
                const legOff = walkCycle * 1.8 * z;
                ctx.strokeStyle = bodyColor;
                ctx.lineWidth = 2 * z;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(screen.x - 2*z, by - 2*z);
                ctx.lineTo(screen.x - 2*z + legOff, by + 3*z);
                ctx.moveTo(screen.x + 2*z, by - 2*z);
                ctx.lineTo(screen.x + 2*z - legOff, by + 3*z);
                ctx.stroke();

                // ── Tana — yumshoq gradient ────────────────────────────────────────
                ctx.save();
                const bodyGrad = ctx.createLinearGradient(screen.x - 4*z, by - 12*z, screen.x + 4*z, by);
                bodyGrad.addColorStop(0, _lightenColor(bodyColor, 0.3));
                bodyGrad.addColorStop(0.5, bodyColor);
                bodyGrad.addColorStop(1, _darkenColor(bodyColor, 0.25));
                ctx.fillStyle = bodyGrad;
                ctx.beginPath();
                ctx.roundRect(screen.x - 4*z, by - 12*z, 8*z, 10*z, 4*z);
                ctx.fill();
                // Tana cho'qi (tana o'ng tomonida ingichka highlight)
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.beginPath();
                ctx.roundRect(screen.x - 3*z, by - 12*z, 3*z, 5*z, 2*z);
                ctx.fill();
                ctx.restore();

                // ── Qalqon — piyoda va otliq askarlar ────────────────────────────
                if (weapon === 'sword' && data.category !== 'qahramon') {
                    ctx.fillStyle = _darkenColor(bodyColor, 0.15);
                    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    ctx.lineWidth = 0.6 * z;
                    ctx.beginPath();
                    ctx.ellipse(screen.x - 7*z, by - 7*z, 2.2*z, 3*z, -0.3, 0, Math.PI*2);
                    ctx.fill();
                    ctx.stroke();
                }

                // ── Bosh ─────────────────────────────────────────────────────────
                // Yuz
                ctx.fillStyle = '#ffcc80';
                ctx.beginPath();
                ctx.arc(screen.x, by - 14*z, 3.5*z, 0, Math.PI*2);
                ctx.fill();
                // Yuz soyasi (pastki qismi)
                ctx.fillStyle = 'rgba(180,100,50,0.25)';
                ctx.beginPath();
                ctx.arc(screen.x, by - 13*z, 2.5*z, 0, Math.PI);
                ctx.fill();

                // ── Dubulg'a ─────────────────────────────────────────────────────
                if (data.tier > 1) {
                    const helmColor = data.category === 'uchuvchi'  ? '#0277bd'
                                    : data.category === 'qahramon'  ? '#b8860b'
                                    : data.tier >= 4                ? '#b71c1c'
                                    : data.tier >= 3                ? '#6a1b9a'
                                    :                                 '#757575';
                    ctx.fillStyle = helmColor;
                    ctx.beginPath();
                    ctx.arc(screen.x, by - 15*z, 3.8*z, Math.PI, Math.PI*2);
                    ctx.fill();
                    // Dubulg'a ustidagi yaltiroq chiziq
                    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                    ctx.lineWidth   = 0.8 * z;
                    ctx.beginPath();
                    ctx.arc(screen.x, by - 15*z, 3.2*z, Math.PI + 0.3, Math.PI*2 - 0.3);
                    ctx.stroke();

                    if (data.tier >= 3) {
                        // Toj/qanotcha
                        ctx.fillStyle = data.tier >= 4 ? '#ffd700' : '#d32f2f';
                        ctx.beginPath();
                        ctx.moveTo(screen.x, by - 19.5*z);
                        ctx.lineTo(screen.x - 1.2*z, by - 18.5*z);
                        ctx.lineTo(screen.x + 1.2*z, by - 18.5*z);
                        ctx.closePath();
                        ctx.fill();
                    }
                }

                // ── Qurol ─────────────────────────────────────────────────────────
                ctx.lineWidth = 1.5 * z;
                if (weapon === 'sword') {
                    // Qilich — asosiy metall + highlight
                    ctx.shadowColor = 'rgba(200,220,255,0.6)';
                    ctx.shadowBlur  = 3 * z;
                    ctx.strokeStyle = '#bdbdbd';
                    ctx.beginPath();
                    const ao = t.state === 'attacking' ? walkCycle * 8 * z : 0;
                    ctx.moveTo(screen.x + 4*z, by - 8*z);
                    ctx.lineTo(screen.x + 10*z + ao, by - 13*z + ao/2);
                    ctx.stroke();
                    // Qilich dastasi — qizil
                    ctx.strokeStyle = '#c62828';
                    ctx.lineWidth = 1.8 * z;
                    ctx.beginPath();
                    ctx.moveTo(screen.x + 3.5*z, by - 6.5*z);
                    ctx.lineTo(screen.x + 5.5*z, by - 7.5*z);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                } else if (weapon === 'bow') {
                    ctx.strokeStyle = '#5d4037';
                    ctx.lineWidth = 1.2 * z;
                    ctx.beginPath();
                    ctx.arc(screen.x + 5*z, by - 8*z, 4*z, -Math.PI/2, Math.PI/2);
                    ctx.stroke();
                    // O'q
                    ctx.strokeStyle = '#9e9e9e';
                    ctx.lineWidth = 0.8 * z;
                    ctx.beginPath();
                    ctx.moveTo(screen.x + 5*z, by - 8*z - 4*z);
                    ctx.lineTo(screen.x + 5*z, by - 8*z + 4*z);
                    ctx.stroke();
                } else if (weapon === 'staff') {
                    ctx.shadowColor = '#ce93d8';
                    ctx.shadowBlur  = 4 * z;
                    ctx.strokeStyle = '#7b1fa2';
                    ctx.lineWidth = 1.5 * z;
                    ctx.beginPath();
                    ctx.moveTo(screen.x + 4*z, by - 2*z);
                    ctx.lineTo(screen.x + 4*z, by - 16*z + (t.state === 'attacking' ? walkCycle*3*z : 0));
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    // Tayoq uchi — yashil/binafsha shara
                    ctx.fillStyle = data.stats.type === 'healer' ? '#4caf50' : '#ce93d8';
                    ctx.shadowColor = data.stats.type === 'healer' ? '#4caf50' : '#9c27b0';
                    ctx.shadowBlur = 5 * z;
                    ctx.beginPath();
                    ctx.arc(screen.x + 4*z, by - 16*z, 2.5*z, 0, Math.PI*2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }

        // ── Attack swing arc — hujum paytida qisqa yoy chaqnashi ────────────────
        if (t.state === 'attacking' && t.target && data.category !== 'otishma' && data.category !== 'uchuvchi') {
            const now5 = Date.now();
            const swingCycle = (now5 % 600) / 600;  // 0→1 har 600ms
            if (swingCycle < 0.4) {                  // Faqat hujum fazasida
                const swingAlpha = swingCycle < 0.2
                    ? swingCycle / 0.2           // 0→1 fade in
                    : 1 - (swingCycle - 0.2) / 0.2; // 1→0 fade out
                const swingR = (10 + swingCycle * 8) * z;
                ctx.save();
                ctx.globalAlpha = swingAlpha * 0.6 * deathAlpha;
                ctx.strokeStyle = data.category === 'qamal' ? '#ff7043' : '#ffcc02';
                ctx.lineWidth   = 2 * z;
                ctx.lineCap     = 'round';
                ctx.shadowColor = data.category === 'qamal' ? '#ff3d00' : '#ffd600';
                ctx.shadowBlur  = 6 * z;
                ctx.beginPath();
                // Target yo'nalishi — agar target mavjud bo'lsa unga qarab
                let swingAng = 0;
                const tgt = BattleManager._troopsById?.get?.(t.target) ||
                            BuildingManager?.buildings?.[t.target];
                if (tgt) {
                    const tgX = tgt.x ?? 0, tgY = tgt.y ?? 0;
                    swingAng = Math.atan2(tgY - t.y, tgX - t.x);
                }
                ctx.arc(screen.x, screen.y - 8 * z, swingR,
                    swingAng - 0.7, swingAng + 0.7);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        // HP bar (CoC-style: rounded, shadow, animated low-hp pulse)
        const hpPerc = Math.max(0, t.hp / t.maxHp);
        if (hpPerc < 1) {
            // Super yoki qahramon troops uchun kattaroq bar
            const barScale = data.category === 'qahramon' ? 1.5
                           : t._isSuper                   ? 1.25
                           : data.tier >= 4               ? 1.15
                           : 1.0;
            const bw = 18 * z * barScale;
            const bh = (3 + (barScale - 1) * 2) * z;
            const bx = screen.x - bw / 2;
            const bby = screen.y - (26 + (barScale - 1) * 4) * z;
            const r  = bh / 2;

            // Background shadow
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            this._roundRect(ctx, bx - 0.5, bby - 0.5, bw + 1, bh + 1, r + 0.5);
            ctx.fill();

            // Background track
            ctx.fillStyle = '#37474f';
            this._roundRect(ctx, bx, bby, bw, bh, r);
            ctx.fill();

            // HP fill — gradient based on health %
            let hpColTop, hpColBot;
            if (hpPerc > 0.6)      { hpColTop = '#81c784'; hpColBot = '#2e7d32'; }
            else if (hpPerc > 0.3) { hpColTop = '#ffcc80'; hpColBot = '#e65100'; }
            else {
                // Pulsing red at critical HP
                const pulse3 = (Math.sin(Date.now() * 0.012) + 1) / 2;
                hpColTop = `rgb(${Math.round(255)},${Math.round(80 + pulse3*60)},${Math.round(60 + pulse3*40)})`;
                hpColBot = `rgb(${Math.round(180 + pulse3*50)},0,0)`;
            }
            const fillW = bw * hpPerc;
            if (fillW > 0) {
                const hpGrad = ctx.createLinearGradient(0, bby, 0, bby + bh);
                hpGrad.addColorStop(0, hpColTop);
                hpGrad.addColorStop(1, hpColBot);
                ctx.fillStyle = hpGrad;
                this._roundRect(ctx, bx, bby, fillW, bh, r);
                ctx.fill();
                // Shine strip on top (brighter left third)
                const shGrad = ctx.createLinearGradient(bx, 0, bx + fillW, 0);
                shGrad.addColorStop(0,   'rgba(255,255,255,0.38)');
                shGrad.addColorStop(0.45,'rgba(255,255,255,0.18)');
                shGrad.addColorStop(1,   'rgba(255,255,255,0.05)');
                ctx.fillStyle = shGrad;
                ctx.fillRect(bx + r, bby, Math.max(0, fillW - r*2), bh * 0.42);
            }
        }

        // ── Troop type icon — HP bar chap tomonida kichik emoji ─────────────────
        if (z > 0.5 && data.icon && hpPerc < 1) {
            ctx.save();
            ctx.font = `${Math.max(7, 8 * z)}px sans-serif`;
            ctx.textAlign  = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.85 * deathAlpha;
            ctx.fillText(data.icon, screen.x - 13 * z, screen.y - 26 * z);
            ctx.restore();
        }

        // ── Troop level badge — CoC-uslubida haqiqiy research darajasi ─────────
        if (z > 0.45) {
            const isHeroType = data.category === 'qahramon';
            // Research darajasini olish (ResearchSystem mavjud bo'lsa)
            const troopLv = (typeof ResearchSystem !== 'undefined' && ResearchSystem.getTroopDisplayLevel)
                ? ResearchSystem.getTroopDisplayLevel(t.type)
                : (data.tier || 1);
            // Hero: HeroSystem dan hero level
            const heroLv = isHeroType && typeof HeroSystem !== 'undefined'
                ? (HeroSystem.commanders[t.type]?.level || 1)
                : null;
            const displayLv = heroLv ?? troopLv;

            const badgeX = screen.x + 9 * z;
            const badgeY = screen.y - 26 * z;
            const badgeR = Math.max(3.2, 3.8 * z);
            ctx.save();
            // Soya
            ctx.beginPath();
            ctx.arc(badgeX + 0.5, badgeY + 0.5, badgeR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fill();
            // Fon rang — level + hero/super bo'yicha
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
            const badgeBg = isHeroType        ? '#b8860b'
                          : t._isSuper        ? '#e65100'
                          : displayLv >= 10   ? '#b71c1c'
                          : displayLv >= 7    ? '#6a1b9a'
                          : displayLv >= 4    ? '#1565c0'
                          : displayLv >= 2    ? '#2e7d32'
                          :                     '#455a64';
            ctx.fillStyle = badgeBg;
            if (isHeroType || t._isSuper) {
                ctx.shadowBlur = 7 * z;
                ctx.shadowColor = isHeroType ? '#ffd700' : '#ff8c00';
            }
            ctx.fill();
            ctx.shadowBlur = 0;
            // Chegarasi — oltin qirrasi yuqori darajalar uchun
            const isHighLv = displayLv >= 7 || isHeroType || t._isSuper;
            ctx.strokeStyle = isHighLv ? '#ffd700' : 'rgba(255,255,255,0.65)';
            ctx.lineWidth = 0.7 * z;
            ctx.stroke();
            // Shine (pastki qismi)
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.beginPath();
            ctx.arc(badgeX - badgeR * 0.2, badgeY - badgeR * 0.2, badgeR * 0.55, Math.PI, Math.PI * 2);
            ctx.fill();
            // Belgi — daraja raqami yoki yulduz
            ctx.fillStyle = isHighLv ? '#ffe082' : '#ffffff';
            ctx.font = `bold ${Math.max(4, 5 * z)}px Inter,sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isHeroType ? `${displayLv}` : String(displayLv), badgeX, badgeY + 0.3 * z);
            ctx.restore();
        }

        // ── Troop hit flash — zarar olganida oq chaqnash ──────────────────
        if (t._hitTime) {
            const hitAge = Date.now() - t._hitTime;
            const HIT_DUR = 180;
            if (hitAge < HIT_DUR) {
                const fa = (1 - hitAge / HIT_DUR) * 0.7;
                ctx.save();
                ctx.globalAlpha = fa;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 8*z, 14 * z, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ff4444';
                ctx.shadowBlur = 10 * z;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            } else {
                delete t._hitTime;
            }
        }

        // Shifobaxsh effekti + beam
        if (data.stats.type === 'healer') {
            const pulse = (Math.sin(Date.now() * 0.008) + 1) / 2;
            // AOE glow
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 5*z, (12 + pulse * 8) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(76, 175, 80, ${0.1 + pulse * 0.1})`;
            ctx.fill();

            // Healer beam — targetga yashil nurli chiziq
            if (t._healTarget && t.state === 'attacking') {
                const tgt = BattleManager._troopsById.get(t._healTarget);
                if (tgt && tgt.hp > 0) {
                    const tgtIso = Camera.toIso(tgt.x, tgt.y);
                    const tgtSc  = Camera.worldToScreen(tgtIso.x, tgtIso.y);
                    const beamAlpha = 0.55 + pulse * 0.3;

                    // Gradient beam — healer dan target ga
                    const grad = ctx.createLinearGradient(screen.x, screen.y - 8*z, tgtSc.x, tgtSc.y - 8*z);
                    grad.addColorStop(0, `rgba(105,240,174,${beamAlpha})`);
                    grad.addColorStop(1, `rgba(76,175,80,${beamAlpha * 0.6})`);

                    ctx.save();
                    ctx.strokeStyle = grad;
                    ctx.lineWidth   = (1.5 + pulse) * z;
                    ctx.shadowColor = '#69f0ae';
                    ctx.shadowBlur  = 8 * z;
                    ctx.setLineDash([4 * z, 3 * z]);
                    ctx.lineDashOffset = -Date.now() * 0.04 % (14 * z);
                    ctx.beginPath();
                    ctx.moveTo(screen.x, screen.y - 8*z);
                    ctx.lineTo(tgtSc.x, tgtSc.y - 8*z);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.setLineDash([]);
                    // Target cross indicator
                    ctx.strokeStyle = `rgba(105,240,174,${0.7 + pulse * 0.2})`;
                    ctx.lineWidth = 1.2 * z;
                    const cr = 4 * z;
                    ctx.beginPath();
                    ctx.moveTo(tgtSc.x - cr, tgtSc.y - 8*z); ctx.lineTo(tgtSc.x + cr, tgtSc.y - 8*z);
                    ctx.moveTo(tgtSc.x, tgtSc.y - 8*z - cr); ctx.lineTo(tgtSc.x, tgtSc.y - 8*z + cr);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        // ── Troop movement dust — harakat paytida chang ─────────────────────────
        if (t.state === 'moving' && !data.flying) {
            const _HEAVY_TYPES = ['minotaur','cyclops','aries','cataphract','onager'];
            const isHeavy  = _HEAVY_TYPES.includes(t.type);
            const dustProb = isHeavy ? 0.07 : 0.02;  // Og'ir: 7%, oddiy: 2%
            if (Math.random() < dustProb) {
                this._smokeParticles.push({
                    wx: t.x + (Math.random() - 0.5) * 0.5,
                    wy: t.y + (Math.random() - 0.5) * 0.4,
                    vyWorld: -(0.008 + Math.random() * 0.008),
                    vxWorld: (Math.random() - 0.5) * 0.01,
                    life: 1.0,
                    decay: isHeavy ? 0.06 : 0.10,
                    size: isHeavy ? (2.5 + Math.random() * 3) : (1.2 + Math.random() * 1.8),
                    color: isHeavy ? '#c8a87a' : 'rgba(200,185,160,0.6)',
                    isCritical: false,
                });
            }
        }

        // ── Spell zone boost aura — rage/haste zonasidagi askar ─────────────────
        if (typeof SpellSystem !== 'undefined' && SpellSystem._activeEffects) {
            for (const eff of SpellSystem._activeEffects) {
                if (Date.now() >= eff.endTime) continue;
                const edx = t.x - eff.x, edy = t.y - eff.y;
                const er2 = eff.radius * eff.radius;
                if (edx * edx + edy * edy > er2) continue;

                if (eff.type === 'rage') {
                    const rp = (Math.sin(Date.now() * 0.02) + 1) / 2;
                    ctx.save();
                    ctx.globalAlpha *= (0.4 + rp * 0.25) * deathAlpha;
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y - 8 * z, (8 + rp * 4) * z, 0, Math.PI * 2);
                    ctx.strokeStyle = '#ff6d00';
                    ctx.lineWidth   = 2 * z;
                    ctx.shadowColor = '#ff6d00';
                    ctx.shadowBlur  = 8 * z;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.restore();
                } else if (eff.type === 'haste') {
                    const hp2 = (Math.sin(Date.now() * 0.018 + t.id * 0.2) + 1) / 2;
                    ctx.save();
                    ctx.globalAlpha *= (0.4 + hp2 * 0.25) * deathAlpha;
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y - 8 * z, (7 + hp2 * 3) * z, 0, Math.PI * 2);
                    ctx.strokeStyle = '#00e5ff';
                    ctx.lineWidth   = 1.8 * z;
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur  = 7 * z;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.restore();
                } else if (eff.type === 'heal') {
                    if (Math.random() < 0.04) {
                        // Shifo zarrachasi — yuqoriga qarab uchadi
                        const hpx = screen.x + (Math.random() - 0.5) * 12 * z;
                        const hpy = screen.y - 14 * z;
                        ctx.save();
                        ctx.globalAlpha = 0.7 * deathAlpha;
                        ctx.font = `${Math.max(8, 9 * z)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillStyle = '#69f0ae';
                        ctx.fillText('+', hpx, hpy);
                        ctx.restore();
                    }
                }
                break; // Bir spell yetarli
            }
        }

        // Burn effekti
        if (t.burning) {
            const bp = (Math.sin(Date.now() * 0.02) + 1) / 2;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, (6 + bp * 4) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${0.15 + bp * 0.2})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 50, 0, ${0.5 + bp * 0.3})`;
            ctx.lineWidth = 1.5 * z;
            ctx.stroke();
        }

        // ── HP critical red aura — CoC "almost dead" visual ─────────────────────
        if (hpPerc < 0.15 && hpPerc > 0) {
            const crp = (Math.sin(Date.now() * 0.025) + 1) / 2;
            ctx.save();
            ctx.globalAlpha = (0.3 + crp * 0.35) * deathAlpha;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 8*z, (6 + crp * 5) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 30, 30, ${0.12 + crp * 0.15})`;
            ctx.fill();
            ctx.strokeStyle = `rgb(${200 + (crp * 55) | 0},20,20)`;
            ctx.lineWidth   = 1.5 * z;
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur  = 8 * z;
            ctx.stroke();
            ctx.shadowBlur  = 0;
            ctx.restore();
        }

        // Super Troop — oltin-to'q sariq alanga aura
        if (t._isSuper) {
            const sp = (Math.sin(Date.now() * 0.008) + 1) / 2;
            // Outer aura
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, (10 + sp * 5) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 109, 0, ${0.08 + sp * 0.08})`;
            ctx.fill();
            // Inner ring
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, (8 + sp * 3) * z, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + sp * 0.3})`;
            ctx.lineWidth = 1.5 * z;
            ctx.stroke();
            // Floating flame icon above troop
            if (z > 0.5) {
                const flyUp = Math.sin(Date.now() * 0.006) * 2 * z;
                ctx.font = `${Math.max(8, 9*z)}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.globalAlpha *= (0.7 + sp * 0.3);
                ctx.fillText('🔥', screen.x + 8*z, screen.y - 22*z + flyUp);
                ctx.globalAlpha = deathAlpha;
            }
        }

        // Clone troop — binafsha mirror aura
        if (t._isClone) {
            const cp = (Math.sin(Date.now() * 0.012) + 1) / 2;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, (9 + cp * 4) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(171, 71, 188, ${0.07 + cp * 0.07})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, (7 + cp * 2) * z, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(206, 147, 216, ${0.45 + cp * 0.25})`;
            ctx.setLineDash([3*z, 3*z]);
            ctx.lineWidth = 1.2 * z;
            ctx.stroke();
            ctx.setLineDash([]);
            if (z > 0.5) {
                const fly = Math.sin(Date.now() * 0.007) * 2 * z;
                ctx.font = `${Math.max(7, 8*z)}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.globalAlpha *= (0.6 + cp * 0.3);
                ctx.fillText('🪞', screen.x - 8*z, screen.y - 20*z + fly);
                ctx.globalAlpha = deathAlpha;
            }
        }

        // Poison effekti — yashil aura
        if (t.poisoned) {
            const pp = (Math.sin(Date.now() * 0.015) + 1) / 2;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, (5 + pp * 3) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(60, 180, 60, ${0.12 + pp * 0.15})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(40, 180, 40, ${0.4 + pp * 0.3})`;
            ctx.lineWidth = 1.5 * z;
            ctx.stroke();
        }

        // Slow effekti — muzlagan kristall tishlar (CoC freeze visual)
        if (t.slowed) {
            const sp      = (Math.sin(Date.now() * 0.01) + 1) / 2;
            const iceTime = Date.now();
            ctx.save();
            // Ichki ko'k-oq muzli fill
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, (5 + sp * 2) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(120, 200, 255, ${0.13 + sp * 0.09})`;
            ctx.fill();
            // Aylanuvchi kristall tishlar (alternating uzun/qisqa)
            const spikeCount = 8;
            const baseR   = 6 * z;
            ctx.shadowColor = '#b3e5fc';
            ctx.shadowBlur  = 5 * z;
            for (let si = 0; si < spikeCount; si++) {
                const ang  = (si / spikeCount) * Math.PI * 2 + iceTime * 0.0008;
                const outerR = (si % 2 === 0 ? 12 : 8.5) * z + sp * 1.5 * z;
                const cx0 = screen.x + Math.cos(ang) * baseR;
                const cy0 = (screen.y - 6*z) + Math.sin(ang) * baseR;
                const cx1 = screen.x + Math.cos(ang) * outerR;
                const cy1 = (screen.y - 6*z) + Math.sin(ang) * outerR;
                ctx.strokeStyle = `rgba(180, 235, 255, ${0.55 + sp * 0.35})`;
                ctx.lineWidth   = (si % 2 === 0 ? 1.5 : 1.0) * z;
                ctx.beginPath();
                ctx.moveTo(cx0, cy0);
                ctx.lineTo(cx1, cy1);
                ctx.stroke();
                // Uzun tishlarda uch nuqta
                if (si % 2 === 0) {
                    ctx.fillStyle = `rgba(220, 245, 255, ${0.8 + sp * 0.15})`;
                    ctx.beginPath();
                    ctx.arc(cx1, cy1, 1.6 * z, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Tashqi halqa
            ctx.strokeStyle = `rgba(140, 200, 255, ${0.3 + sp * 0.2})`;
            ctx.lineWidth   = 1 * z;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, 12 * z, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ── Burn VFX — yonayotgan askar ustida olov particlelar ─────────────────
        if (t.burning && Math.random() < 0.55) {
            const bNow = Date.now();
            ctx.save();
            // Inner orange glow pulse
            const bp = (Math.sin(bNow * 0.018) + 1) / 2;
            ctx.globalAlpha = 0.3 + bp * 0.2;
            ctx.shadowColor = '#ff6d00';
            ctx.shadowBlur  = 8 * z;
            ctx.fillStyle   = `rgba(255,${100 + (bp*60)|0},0,0.4)`;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 6*z, (7 + bp * 3) * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Random flame licks
            const flameCount = 2 + Math.floor(Math.random() * 2);
            for (let fi = 0; fi < flameCount; fi++) {
                const fOx  = (Math.random() - 0.5) * 8 * z;
                const fOy  = -6 * z - Math.random() * 8 * z;
                const fSize = (2 + Math.random() * 2) * z;
                ctx.globalAlpha = 0.5 + Math.random() * 0.4;
                ctx.fillStyle = Math.random() > 0.4 ? `rgba(255,${80 + (Math.random()*100)|0},0,0.9)` : 'rgba(255,255,100,0.85)';
                ctx.beginPath();
                ctx.arc(screen.x + fOx, screen.y + fOy, fSize, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── Poison VFX — zaharlanish (yashil bulutcha) ───────────────────────────
        if (t.poisoned && Math.random() < 0.35) {
            ctx.save();
            const pp = (Math.sin(Date.now() * 0.009) + 1) / 2;
            ctx.globalAlpha = 0.22 + pp * 0.15;
            ctx.shadowColor = '#76ff03';
            ctx.shadowBlur  = 6 * z;
            ctx.fillStyle   = `rgba(100,240,80,0.5)`;
            ctx.beginPath();
            ctx.ellipse(screen.x, screen.y - 4 * z, (5 + pp * 3) * z, (3 + pp * 2) * z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Uchuvchi — ko'k glow (qo'shimcha ko'rinadigan)
        if (data.flying) {
            const fp = (Math.sin(Date.now() * 0.006) + 1) / 2;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 8*z, (5 + fp * 3) * z, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 180, 255, ${0.08 + fp * 0.08})`;
            ctx.fill();
        }

        // ── Commander ability buff — rang buff turiga qarab ──────────────────────
        if (t._abilityBuff && Date.now() < t._abilityBuff.until) {
            const now2 = Date.now();
            const ap = (Math.sin(now2 * 0.018) + 1) / 2;
            const remaining = t._abilityBuff.until - now2;
            const fadeOut = remaining < 500 ? remaining / 500 : 1;

            // Buff turiga qarab rang tanlash
            // spd-only = cyan (tezlik), dmg-only = orange (zarar), ikkalasi = qizil-oltin
            const hasDmg = !!t._abilityBuff.dmg;
            const hasSpd = !!t._abilityBuff.spd;
            const buffColor = hasDmg && hasSpd ? '#ff8c00'
                            : hasDmg           ? '#ff5722'
                            : hasSpd           ? '#00e5ff'
                            :                    '#ffd700';
            const buffFill  = hasDmg && hasSpd ? '#ffe082'
                            : hasDmg           ? '#ffccbc'
                            : hasSpd           ? '#b2ebf2'
                            :                    '#ffe082';

            // Tashqi glow halqa (pulsing)
            ctx.save();
            ctx.globalAlpha = (0.35 + ap * 0.3) * fadeOut;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 8*z, (14 + ap * 5) * z, 0, Math.PI * 2);
            ctx.strokeStyle = buffColor;
            ctx.lineWidth = 2.5 * z;
            ctx.shadowBlur = 18 * z;
            ctx.shadowColor = buffColor;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();

            // Ichki fill (subtle)
            ctx.save();
            ctx.globalAlpha = (0.07 + ap * 0.07) * fadeOut;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 8*z, (12 + ap * 4) * z, 0, Math.PI * 2);
            ctx.fillStyle = buffFill;
            ctx.fill();
            ctx.restore();

            // Aylanuvchi zarralar (rang asosida)
            const starCount = 4;
            const orbitR = (16 + ap * 3) * z;
            ctx.save();
            ctx.globalAlpha = (0.7 + ap * 0.25) * fadeOut;
            for (let s = 0; s < starCount; s++) {
                const ang = (s / starCount) * Math.PI * 2 + now2 * 0.004;
                const sbx = screen.x + Math.cos(ang) * orbitR;
                const sby = (screen.y - 8*z) + Math.sin(ang) * orbitR * 0.5;
                ctx.beginPath();
                ctx.arc(sbx, sby, 2 * z, 0, Math.PI * 2);
                ctx.fillStyle = s % 2 === 0 ? buffColor : buffFill;
                ctx.fill();
            }
            ctx.restore();
        }

        // ── Praetorian Stone Shield — tosh qalqon visual ─────────────────────────
        if (t._stoneShield?.active && t._stoneShield.until && Date.now() < t._stoneShield.until) {
            const now3 = Date.now();
            const remaining3 = t._stoneShield.until - now3;
            const fadeOut3 = remaining3 < 600 ? remaining3 / 600 : 1;
            const sp = (Math.sin(now3 * 0.005) + 1) / 2;

            // Tashqi tosh halqasi — qoʻng'ir-kulrang, aylanuvchi dashes
            ctx.save();
            ctx.translate(screen.x, screen.y - 8 * z);
            ctx.rotate(now3 * 0.0008);
            const shR = (16 + sp * 3) * z;
            ctx.beginPath();
            ctx.arc(0, 0, shR, 0, Math.PI * 2);
            ctx.strokeStyle = '#78909c';
            ctx.lineWidth   = 4 * z;
            ctx.globalAlpha = (0.7 + sp * 0.2) * fadeOut3;
            ctx.setLineDash([shR * 0.55, shR * 0.25]);
            ctx.shadowBlur  = 10 * z;
            ctx.shadowColor = '#90a4ae';
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur  = 0;
            ctx.restore();

            // Ichki yaltiroq fill
            ctx.save();
            ctx.globalAlpha = (0.12 + sp * 0.08) * fadeOut3;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 8 * z, (13 + sp * 3) * z, 0, Math.PI * 2);
            ctx.fillStyle = '#b0bec5';
            ctx.fill();
            ctx.restore();

            // 🛡️ belgisi yuqorida
            ctx.save();
            ctx.globalAlpha = (0.85 + sp * 0.1) * fadeOut3;
            ctx.font = `${9 * z}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛡️', screen.x, screen.y - 28 * z);
            ctx.restore();
        }

        // ── Heal spell shimmer — shifo doirasida bo'lgan askarda yashil glow ──────
        if (typeof SpellSystem !== 'undefined' && SpellSystem._activeEffects) {
            const inHeal = SpellSystem._activeEffects.some(eff => {
                if (eff.type !== 'heal' || Date.now() >= eff.endTime) return false;
                const dx = t.x - eff.x, dy = t.y - eff.y;
                return dx*dx + dy*dy <= eff.radius * eff.radius;
            });
            if (inHeal) {
                const hNow = Date.now();
                const hp3  = (Math.sin(hNow * 0.014) + 1) / 2;
                ctx.save();
                // Rising green sparkle
                if (Math.random() < 0.3) {
                    ctx.globalAlpha = 0.65 + Math.random() * 0.3;
                    ctx.fillStyle = '#69f0ae';
                    ctx.shadowColor = '#00e676';
                    ctx.shadowBlur = 4 * z;
                    const hsX = screen.x + (Math.random() - 0.5) * 8 * z;
                    const hsY = screen.y - 6 * z - Math.random() * 10 * z;
                    ctx.font = `${(6 + Math.random() * 4) * z}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('+', hsX, hsY);
                    ctx.shadowBlur = 0;
                }
                // Yashil outer ring
                ctx.globalAlpha = (0.2 + hp3 * 0.18) * deathAlpha;
                ctx.strokeStyle = `rgba(0,230,118,${0.5 + hp3 * 0.4})`;
                ctx.lineWidth   = 1.5 * z;
                ctx.shadowColor = '#00e676';
                ctx.shadowBlur  = 5 * z;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 8 * z, (10 + hp3 * 3) * z, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        // ── Rage spell aura — askar g'azab sihrida bo'lganda olov halo ────────────
        if (typeof SpellSystem !== 'undefined' && SpellSystem.getRageMult) {
            const rageMult2 = SpellSystem.getRageMult(t);
            if (rageMult2 > 1) {
                const rNow  = Date.now();
                const rp    = (Math.sin(rNow * 0.02) + 1) / 2;
                ctx.save();
                // Outer rage ring
                ctx.globalAlpha = 0.4 + rp * 0.25;
                ctx.shadowColor = '#ff6d00';
                ctx.shadowBlur  = 12 * z;
                ctx.strokeStyle = `rgba(255,${100 + (rp*80)|0},0,0.85)`;
                ctx.lineWidth   = 2 * z;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 8 * z, (11 + rp * 4) * z, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                // Inner warmth fill
                ctx.globalAlpha = 0.08 + rp * 0.06;
                ctx.fillStyle   = 'rgba(255,140,0,0.8)';
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 8 * z, (10 + rp * 3) * z, 0, Math.PI * 2);
                ctx.fill();
                // Orbiting fire dots (3)
                ctx.globalAlpha = 0.75 + rp * 0.2;
                for (let ri = 0; ri < 3; ri++) {
                    const ra = (ri / 3) * Math.PI * 2 + rNow * 0.006;
                    const rfx = screen.x + Math.cos(ra) * 10 * z;
                    const rfy = (screen.y - 8*z) + Math.sin(ra) * 10 * z;
                    ctx.fillStyle = ri === 0 ? 'rgba(255,230,50,0.9)' : 'rgba(255,100,0,0.9)';
                    ctx.beginPath();
                    ctx.arc(rfx, rfy, (1.2 + rp * 0.5) * z, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // ── Hero belgisi — barcha qahramon turlari ────────────────────────────────
        const _HERO_BADGE = {
            commander:        { icon: '👑', color: '#ffd700' },
            sagittaria:       { icon: '🏹', color: '#69f0ae' },
            legatus:          { icon: '🦁', color: '#ffca28' },
            aquilifer:        { icon: '🦅', color: '#78909c' },
            praetorian_guard: { icon: '🛡️', color: '#90a4ae' },
            imperatrix:       { icon: '⚜️', color: '#ffd700' },
        };
        const heroBadge = _HERO_BADGE[t.type];
        if (heroBadge) {
            const cp = (Math.sin(Date.now() * 0.007) + 1) / 2;

            // ── Hero ability READY indicator — oltin pulsing ring ───────────────
            const heroAbilityReady = typeof HeroSystem !== 'undefined' && HeroSystem.canUseAbility?.(t.type);
            if (heroAbilityReady) {
                const rp = (Math.sin(Date.now() * 0.012) + 1) / 2;
                ctx.save();
                // Double pulsing ring
                ctx.globalAlpha = 0.5 + rp * 0.35;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 8*z, (18 + rp * 5) * z, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth   = 2 * z;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur  = 12 * z;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.globalAlpha = 0.3 + rp * 0.2;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 8*z, (22 + rp * 6) * z, 0, Math.PI * 2);
                ctx.strokeStyle = '#fff176';
                ctx.lineWidth   = 1 * z;
                ctx.stroke();
                ctx.restore();

                // "!" badge yuqorida
                ctx.save();
                ctx.globalAlpha = 0.85 + rp * 0.12;
                ctx.font = `bold ${Math.max(8, 9*z)}px Inter,sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#000';
                ctx.shadowBlur  = 3 * z;
                ctx.fillText('!', screen.x + 14*z, screen.y - 22*z);
                ctx.shadowBlur = 0;
                ctx.restore();
            }

            ctx.save();
            ctx.globalAlpha = 0.7 + cp * 0.25;
            // Orqa-fon halo
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 24*z, 6 * z, 0, Math.PI * 2);
            ctx.fillStyle = heroBadge.color + '30';
            ctx.shadowBlur = 8 * z;
            ctx.shadowColor = heroBadge.color;
            ctx.fill();
            ctx.shadowBlur = 0;
            // Icon
            ctx.font = `${9 * z}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(heroBadge.icon, screen.x, screen.y - 24*z);
            ctx.restore();
        }

        // Deploy drop alpha qaytarish
        if (deployDropAlpha < 1 && deathAlpha >= 1) {
            ctx.globalAlpha = 1;
        }

        // O'lish transformini yopish
        if (deathScale !== 1) {
            ctx.restore();
        }
    },

    _drawGuard(ctx, g) {
        const iso    = Camera.toIso(g.x, g.y);
        const screen = Camera.worldToScreen(iso.x, iso.y);
        const z      = Camera.zoom;

        if (screen.x < -20 || screen.x > ctx.canvas.width + 20 ||
            screen.y < -20 || screen.y > ctx.canvas.height + 20) return;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y, 5*z, 2.5*z, 0, 0, Math.PI*2);
        ctx.fill();

        const by = screen.y - 4*z;

        // Praetorian guard — oltin rang, militia — qoramtir
        const isPraetorian = !!g._isPraetorianGuard;
        const bodyColor   = isPraetorian ? '#8b6914' : '#37474f';
        const helmetColor = isPraetorian ? '#cd853f' : '#546e7a';
        const skinColor   = isPraetorian ? '#f5cba7' : '#ffcc80';

        // Tana
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(screen.x - 4*z, by - 12*z, 8*z, 10*z, 3*z);
        ctx.fill();

        // Praetorian — qalqon effekti (kichik qizil qalqon)
        if (isPraetorian) {
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            ctx.roundRect(screen.x - 6*z, by - 10*z, 4*z, 7*z, 1*z);
            ctx.fill();
            ctx.strokeStyle = '#922b21';
            ctx.lineWidth = 0.5*z;
            ctx.stroke();
        }

        // Bosh
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(screen.x, by - 14*z, 3.5*z, 0, Math.PI*2);
        ctx.fill();

        // Dubulg'a
        ctx.fillStyle = helmetColor;
        ctx.beginPath();
        ctx.arc(screen.x, by - 15*z, 3.8*z, Math.PI, Math.PI*2);
        ctx.fill();

        // Praetorian — dubulg'a to'pi (crista)
        if (isPraetorian) {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.ellipse(screen.x, by - 19.5*z, 1.2*z, 5*z, 0, 0, Math.PI*2);
            ctx.fill();
        }

        // Stun effekti
        if (g.stunned) {
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 20*z, 5*z, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255, 235, 59, 0.6)';
            ctx.fill();
        }

        // HP bar — gradient (guard troop)
        const hpPerc = g.hp / g.maxHp;
        const gbx = screen.x - 7*z, gby = screen.y - 23*z, gbw = 14*z, gbh = 2.5*z;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(gbx - 0.5, gby - 0.5, gbw + 1, gbh + 1);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(gbx, gby, gbw, gbh);
        const gFillW = gbw * Math.max(0, hpPerc);
        if (gFillW > 0) {
            const ggGrad = ctx.createLinearGradient(0, gby, 0, gby + gbh);
            ggGrad.addColorStop(0, hpPerc > 0.5 ? '#81c784' : '#ef9a9a');
            ggGrad.addColorStop(1, hpPerc > 0.5 ? '#2e7d32' : '#b71c1c');
            ctx.fillStyle = ggGrad;
            ctx.fillRect(gbx, gby, gFillW, gbh);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(gbx, gby, gFillW, gbh * 0.4);
        }
    },

    _drawProjectile(ctx, p) {
        let tx, ty;
        const isDefenseShot = (p.type === 'defense' || p.type === 'defense_splash' || p.type === 'defense_inferno');
        if (isDefenseShot) {
            const tr = BattleManager._troopsById.get(p.targetId);
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
            const maxH = Math.min(totalDist * 15, 120) * Camera.zoom;
            flightHeight = 4 * maxH * progress * (1 - progress);
        } else {
            flightHeight = 10 * Camera.zoom;
        }

        const iso = Camera.toIso(p.x, p.y);
        const screen = Camera.worldToScreen(iso.x, iso.y - flightHeight / Camera.zoom);
        const z = Camera.zoom;
        // Ground-level screen pos (no height offset) — for shadow
        const groundSc = Camera.worldToScreen(iso.x, iso.y);

        const isArrow = isDefenseShot; // Minoralar o'q otadi
        const isInferno = p.type === 'defense_inferno';

        // ── Projectile ground shadow — baland uchganda pastda soya ─────────────
        if (flightHeight > 4 * z && !isInferno) {
            const heightRatio = Math.min(1, flightHeight / (80 * z));
            const shadowScale = 0.4 + heightRatio * 0.6;
            const shadowAlpha = (1 - heightRatio * 0.65) * 0.28;
            ctx.save();
            ctx.globalAlpha = shadowAlpha;
            ctx.fillStyle   = 'rgba(0,0,0,0.85)';
            ctx.beginPath();
            ctx.ellipse(groundSc.x + 2 * z, groundSc.y + 1 * z,
                        6 * z * shadowScale, 3 * z * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (isInferno) {
            // ── Inferno beam snaryad — issiqlik nuri ──────────────────────────
            const charge = Math.min(4.0, p.charge || 1.0);
            const chargeRatio = (charge - 1) / 3; // 0→1 kuchayib boradi
            // Renglar: sariq → to'q sariq → to'q qizil
            const r = Math.round(255);
            const g2 = Math.round(200 - chargeRatio * 150);
            const b2 = Math.round(50 - chargeRatio * 50);
            const beamW = (1.5 + chargeRatio * 3) * z;

            ctx.save();
            ctx.shadowColor = `rgb(${r},${g2},${b2})`;
            ctx.shadowBlur  = (6 + chargeRatio * 14) * z;

            // Tashqi glow (keng, xira)
            ctx.strokeStyle = `rgba(${r},${g2},${b2},0.4)`;
            ctx.lineWidth   = beamW * 2.5;
            ctx.lineCap     = 'round';
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y);
            if (tx !== undefined && ty !== undefined) {
                const tIso = Camera.toIso(tx, ty);
                const tSc  = Camera.worldToScreen(tIso.x, tIso.y);
                ctx.lineTo(tSc.x, tSc.y);
            }
            ctx.stroke();

            // Ichki yadro (ingichka, yorqin)
            ctx.strokeStyle = `rgb(${r},${Math.min(255,g2+60)},${b2+80})`;
            ctx.lineWidth   = beamW * 0.7;
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y);
            if (tx !== undefined && ty !== undefined) {
                const tIso = Camera.toIso(tx, ty);
                const tSc  = Camera.worldToScreen(tIso.x, tIso.y);
                ctx.lineTo(tSc.x, tSc.y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        } else if (isArrow) {
            const angle = Math.atan2(ty - p.startY, tx - p.startX);
            const pitch = (0.5 - (flightHeight / (Camera.zoom * 60))) * Math.PI;

            // Arrow trail — uzun gradient iz + glow
            const trailLen = 18 * z;
            const trailGrad = ctx.createLinearGradient(
                screen.x - Math.cos(angle) * trailLen, screen.y - Math.sin(angle) * trailLen + pitch * 0.5,
                screen.x, screen.y
            );
            trailGrad.addColorStop(0, 'rgba(255,255,255,0)');
            trailGrad.addColorStop(0.5, p.fire ? 'rgba(255,140,0,0.25)' : 'rgba(200,220,255,0.2)');
            trailGrad.addColorStop(1, p.fire ? 'rgba(255,80,0,0.85)' : 'rgba(255,255,255,0.75)');
            ctx.save();
            ctx.shadowColor = p.fire ? '#ff6d00' : '#c8e6ff';
            ctx.shadowBlur  = 5 * z;
            ctx.strokeStyle = trailGrad;
            ctx.lineWidth   = 2 * z;
            ctx.lineCap     = 'round';
            ctx.beginPath();
            ctx.moveTo(screen.x - Math.cos(angle) * trailLen, screen.y - Math.sin(angle) * trailLen + pitch * 0.5);
            ctx.lineTo(screen.x, screen.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();

            // Arrow tip — o'q uchi (V-shakl arrowhead + fletch)
            ctx.save();
            const tipColor  = p.fire ? '#ffca28' : '#e3f2fd';
            const glowColor = p.fire ? '#ff6d00' : '#90caf9';
            ctx.strokeStyle = tipColor;
            ctx.lineWidth   = 1.8 * z;
            ctx.lineCap     = 'round';
            ctx.shadowColor = glowColor;
            ctx.shadowBlur  = 6 * z;

            // V-shakl arrowhead (ikki qanot)
            const headLen  = 4.5 * z;
            const headAng  = 0.55;  // ~31° qanot oʻzgarish burchagi
            const pitchAdj = pitch * 0.4;
            ctx.beginPath();
            ctx.moveTo(
                screen.x - Math.cos(angle + headAng) * headLen,
                screen.y - Math.sin(angle + headAng) * headLen + pitchAdj
            );
            ctx.lineTo(screen.x, screen.y);
            ctx.lineTo(
                screen.x - Math.cos(angle - headAng) * headLen,
                screen.y - Math.sin(angle - headAng) * headLen + pitchAdj
            );
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Fletch (o'q dumi) — kichik qanotcha
            const fletchX = screen.x - Math.cos(angle) * (trailLen * 0.72);
            const fletchY = screen.y - Math.sin(angle) * (trailLen * 0.72) + pitch * 0.7;
            const fw = 2.5 * z;
            const fpx = Math.cos(angle + Math.PI / 2) * fw;
            const fpy = Math.sin(angle + Math.PI / 2) * fw;
            ctx.strokeStyle = p.fire ? 'rgba(255,140,0,0.65)' : 'rgba(180,220,255,0.55)';
            ctx.lineWidth   = 1 * z;
            ctx.shadowBlur  = 0;
            ctx.beginPath();
            ctx.moveTo(fletchX + fpx, fletchY + fpy);
            ctx.lineTo(fletchX - fpx, fletchY - fpy);
            ctx.stroke();

            ctx.restore();
        } else if (p.type === 'troop_splash') {
            // Onager boulder — katta tosh + iz + aylanuvchan
            const boulderAngle = Date.now() * 0.008;
            const boulderR = 4 * z;
            // Tosh izi (trail smoke)
            if (tx !== undefined && p.startX !== undefined) {
                const tAng = Math.atan2(ty - p.startY, tx - p.startX);
                for (let ti = 1; ti <= 3; ti++) {
                    const tAlpha = (0.25 - ti * 0.07);
                    const tDist  = ti * 7 * z;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, tAlpha);
                    ctx.fillStyle = '#a1887f';
                    ctx.beginPath();
                    ctx.arc(
                        screen.x - Math.cos(tAng) * tDist,
                        screen.y - Math.sin(tAng) * tDist,
                        (boulderR - ti * 0.8 * z),
                        0, Math.PI * 2
                    );
                    ctx.fill();
                    ctx.restore();
                }
            }
            // Asosiy tosh — jagged silhouette (ctx save/rotate)
            ctx.save();
            ctx.translate(screen.x, screen.y);
            ctx.rotate(boulderAngle);
            ctx.fillStyle = '#6d4c41';
            ctx.beginPath();
            const sides = 7;
            for (let si = 0; si < sides; si++) {
                const sAng = (si / sides) * Math.PI * 2;
                const sR = boulderR * (0.85 + Math.sin(si * 2.3 + 1.2) * 0.18);
                si === 0 ? ctx.moveTo(Math.cos(sAng) * sR, Math.sin(sAng) * sR)
                         : ctx.lineTo(Math.cos(sAng) * sR, Math.sin(sAng) * sR);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#4e342e';
            ctx.lineWidth = 0.8 * z;
            ctx.stroke();
            // Tosh yuzidagi chiziq (crack)
            ctx.strokeStyle = 'rgba(60,30,20,0.45)';
            ctx.lineWidth   = 0.6 * z;
            ctx.beginPath();
            ctx.moveTo(-1.5*z, -2*z); ctx.lineTo(1*z, 1.5*z);
            ctx.stroke();
            ctx.restore();
        } else {
            // Askar snaryadlari (otishma, Harpy) — kengaytirilgan trail + glow
            const tAngle = (tx !== undefined && p.startX !== undefined)
                ? Math.atan2(ty - p.startY, tx - p.startX) : 0;
            const tTrail = 12 * z;

            // Gradient trail — uzunroq, ikki qatlam
            const tg2 = ctx.createLinearGradient(
                screen.x - Math.cos(tAngle) * tTrail, screen.y - Math.sin(tAngle) * tTrail,
                screen.x, screen.y
            );
            tg2.addColorStop(0, 'rgba(255,179,0,0)');
            tg2.addColorStop(0.4, 'rgba(255,179,0,0.15)');
            tg2.addColorStop(1, 'rgba(255,179,0,0.8)');
            ctx.save();
            ctx.shadowColor = '#ff8f00';
            ctx.shadowBlur  = 5 * z;
            ctx.strokeStyle = tg2;
            ctx.lineWidth   = 2 * z;
            ctx.lineCap     = 'round';
            ctx.beginPath();
            ctx.moveTo(screen.x - Math.cos(tAngle) * tTrail, screen.y - Math.sin(tAngle) * tTrail);
            ctx.lineTo(screen.x, screen.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();

            // ── Tip — 3D sphere effekti (radial gradient + specular highlight) ──
            ctx.save();
            const sphR = 3.2 * z;
            // Radial gradient: ichki yorqin, tashqi to'q
            const sGrad = ctx.createRadialGradient(
                screen.x - sphR * 0.32, screen.y - sphR * 0.32, 0,
                screen.x,               screen.y,                sphR
            );
            sGrad.addColorStop(0,    '#fff9c4');  // center highlight
            sGrad.addColorStop(0.42, '#ffca28');  // mid
            sGrad.addColorStop(0.78, '#ff8f00');  // edge
            sGrad.addColorStop(1,    '#e65100');  // shadow edge
            ctx.shadowColor = '#ffb300';
            ctx.shadowBlur  = sphR * 2.8;
            ctx.fillStyle   = sGrad;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, sphR, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Specular highlight — kichik oq nuqta yuqori-chapda
            ctx.fillStyle = 'rgba(255,255,255,0.72)';
            ctx.beginPath();
            ctx.arc(screen.x - sphR*0.3, screen.y - sphR*0.32, sphR * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },

    _emitBuildingSmoke() {
        if (typeof BuildingManager === 'undefined') return;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.hp >= b.maxHp || !b.maxHp) continue;
            const hpRatio = b.hp / b.maxHp;
            if (hpRatio >= 0.5) continue;  // Faqat 50% dan kam HP da

            // Emit rate: qanchalik zarar ko'p bo'lsa shunchalik ko'p tutun
            const emitChance = hpRatio < 0.25 ? 0.6 : 0.25;
            if (Math.random() > emitChance) continue;

            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;

            // Bino markazini topish
            const cx = b.x + bd.size[0] * 0.5;
            const cy = b.y + bd.size[1] * 0.5;

            const isCritical = hpRatio < 0.25;
            const color = isCritical ? '#ff6600' : '#888888';
            const size  = isCritical ? (4 + Math.random() * 6) : (3 + Math.random() * 5);

            this._smokeParticles.push({
                wx: cx + (Math.random() - 0.5) * bd.size[0] * 0.6,
                wy: cy + (Math.random() - 0.5) * bd.size[1] * 0.6,
                vyWorld: -0.04 - Math.random() * 0.04,
                vxWorld: (Math.random() - 0.5) * 0.02,
                life: 1.0,
                decay: isCritical ? 0.012 : 0.016,
                size,
                color,
                isCritical,
            });
        }
    },

    _drawSmoke(ctx) {
        if (this._smokeParticles.length === 0) return;
        const z = Camera.zoom;
        ctx.save();
        for (let i = this._smokeParticles.length - 1; i >= 0; i--) {
            const p = this._smokeParticles[i];
            p.wy  += p.vyWorld;
            p.wx  += p.vxWorld;
            p.life -= p.decay;
            p.size += 0.06;  // expand as it drifts upward

            if (p.life <= 0) {
                this._smokeParticles.splice(i, 1);
                continue;
            }

            const iso = Camera.toIso(p.wx, p.wy);
            const sc  = Camera.worldToScreen(iso.x, iso.y);
            const sr  = p.size * z;

            if (p.isCritical) {
                // Olov zarrachasi — issiq gradient
                const lifeT = Math.min(1, p.life);
                const innerCol = lifeT > 0.6
                    ? `rgba(255,${Math.round(120 + lifeT * 80)},0,${lifeT * 0.9})`
                    : `rgba(255,${Math.round(40 + lifeT * 80)},0,${lifeT * 0.7})`;
                const outerCol = `rgba(80,20,0,0)`;
                ctx.save();
                ctx.globalAlpha = lifeT * 0.75;
                const fg = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, sr);
                fg.addColorStop(0,   innerCol);
                fg.addColorStop(0.5, `rgba(200,60,0,${lifeT * 0.35})`);
                fg.addColorStop(1,   outerCol);
                ctx.fillStyle = fg;
                ctx.beginPath();
                ctx.arc(sc.x, sc.y, sr, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // Tutun — yumshoq kulrang radial gradient
                const lifeT = Math.min(1, p.life);
                const bv = (typeof p.color === 'number') ? p.color
                         : (p.color === null || p.color === undefined) ? (140 + (Math.random() * 30 | 0))
                         : 140; // string color case — grey fallback
                ctx.save();
                ctx.globalAlpha = lifeT * 0.38;
                const sg = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, sr);
                sg.addColorStop(0,   `rgba(${bv},${bv},${bv},0.72)`);
                sg.addColorStop(0.5, `rgba(${bv},${bv},${bv},0.35)`);
                sg.addColorStop(1,   `rgba(${bv},${bv},${bv},0)`);
                ctx.fillStyle = sg;
                ctx.beginPath();
                ctx.arc(sc.x, sc.y, sr, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ── Loot Badges — resource binolarda saqlanayotgan loot ko'rsatish ──────
    _drawLootBadges(ctx) {
        const z = Camera.zoom;
        if (z < 0.55) return; // Juda kichik zoom da ko'rsatmay qo'yamiz

        const LOOT_TYPES = {
            goldStorage: 'gold', villa:       'gold',
            foodStorage: 'food', farm:        'food',
            cityHall:    'both',
        };

        for (const b of Object.values(BuildingManager.buildings)) {
            const lootType = LOOT_TYPES[b.type];
            if (!lootType) continue;

            const sl = b.storedLoot;
            if (!sl) continue;

            const goldAmt = sl.gold || 0;
            const foodAmt = sl.food || 0;
            if (goldAmt === 0 && foodAmt === 0) continue;

            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);

            // Badge yonida (HP bardan biroz pastroq)
            let by = fp.top.y - 18 * z;
            const cx = fp.cx;

            const drawBadge = (amt, icon, color) => {
                if (amt <= 0) return;
                const text = Helpers.formatNumber(amt);
                ctx.font = `bold ${Math.max(7, 9 * z)}px Inter,sans-serif`;
                const tw = ctx.measureText(text).width;
                const iw = 10 * z;
                const pw = 4 * z;
                const bw = tw + iw + pw * 2 + 2 * z;
                const bh = 11 * z;
                const bx = cx - bw / 2;

                // Background pill
                ctx.fillStyle = 'rgba(0,0,0,0.65)';
                ctx.beginPath();
                ctx.roundRect?.(bx - 1, by - 1, bw + 2, bh + 2, (bh + 2) / 2) ||
                    ctx.rect(bx - 1, by - 1, bw + 2, bh + 2);
                ctx.fill();

                ctx.fillStyle = color + '33';
                ctx.beginPath();
                ctx.roundRect?.(bx, by, bw, bh, bh / 2) || ctx.rect(bx, by, bw, bh);
                ctx.fill();

                // Icon + text
                ctx.font = `${Math.max(6, 8 * z)}px sans-serif`;
                ctx.textAlign    = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(icon, bx + pw, by + bh / 2);

                ctx.fillStyle = color;
                ctx.font = `bold ${Math.max(7, 9 * z)}px Inter,sans-serif`;
                ctx.fillText(text, bx + pw + iw, by + bh / 2);

                by -= (bh + 2 * z);
            };

            if (lootType === 'gold' || lootType === 'both') drawBadge(goldAmt, '🪙', '#ffd700');
            if (lootType === 'food' || lootType === 'both') drawBadge(foodAmt, '🍎', '#81c784');
        }
    },

    // ── Vayron bo'lgan bino qoldiqlari (rubble) ──────────────────────────────────
    _drawRubbles(ctx) {
        if (this._rubbles.length === 0) return;
        const now = Date.now();
        const z   = Camera.zoom;
        ctx.save();

        this._rubbles = this._rubbles.filter(r => {
            const age  = now - r.born;
            if (age >= r.life) return false;
            const t    = age / r.life;          // 0→1
            const alpha = (1 - t) * 0.75;

            const iso = Camera.toIso(r.x, r.y);
            const sc  = Camera.worldToScreen(iso.x, iso.y);

            // Seeded pseudo-random for stable stone positions
            let seed = r.seed;
            const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xfffff; return seed / 0xfffff; };

            // Building type ga qarab rang palitralari
            const _RUBBLE_PALETTES = {
                // Tosh/devori — kulrang
                wall:        [[80,80,80],[110,105,100],[55,52,50]],
                gate:        [[90,85,75],[120,112,100],[65,60,55]],
                // Oltin binolari — sariq-jigarrang
                goldStorage: [[140,110,40],[180,145,60],[100,75,25]],
                villa:       [[130,100,35],[165,130,50],[90,65,20]],
                // Oziq-ovqat binolari — yashil-jigarrang
                foodStorage: [[80,100,50],[110,130,70],[55,70,35]],
                farm:        [[90,115,55],[115,140,75],[60,80,40]],
                // Shahar markazi — oltin + kulrang
                cityHall:    [[160,130,50],[120,110,90],[90,75,30]],
                // Harb binolari — qoramtir kulrang
                barracks:    [[70,60,55],[100,88,80],[50,42,38]],
                // Mudofaa minoralari — metal + tosh
                bowTower:    [[75,80,85],[105,110,115],[50,55,60]],
                archerTower: [[65,65,70],[95,90,85],[45,44,48]],
                tormenta:    [[70,68,65],[100,95,90],[48,46,44]],
                inferno:     [[80,55,40],[110,75,55],[55,38,28]],
            };
            const defaultPalette = [[85,80,75],[115,108,100],[60,55,50]];
            const palette = _RUBBLE_PALETTES[r.btype] || defaultPalette;

            const stoneCount = 3 + Math.floor(r.size * 2);
            const spread = (r.size * 0.6 + 0.8) * 12 * z;

            ctx.globalAlpha = alpha;
            for (let i = 0; i < stoneCount; i++) {
                const ox = (rng() - 0.5) * spread * 2;
                const oy = (rng() - 0.5) * spread;
                const sr = (2 + rng() * 5) * z;

                // Rangli bo'laklar: asosiy + accent ranglar
                const palIdx = Math.floor(rng() * palette.length);
                const [pr, pg, pb] = palette[palIdx];
                // Seeded brightness variation
                const bv = 0.8 + rng() * 0.4;
                const fr = Math.min(255, (pr * bv) | 0);
                const fg = Math.min(255, (pg * bv) | 0);
                const fb = Math.min(255, (pb * bv) | 0);

                // Fragment soyasi (pastda yupqa shadow ellips)
                ctx.save();
                ctx.globalAlpha = alpha * 0.3;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.beginPath();
                ctx.ellipse(sc.x + ox + 1.5*z, sc.y + oy + 0.5*z, sr * 0.9, sr * 0.35, rng() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Asosiy fragment bo'lak — radial gradient (3D effekti)
                ctx.save();
                ctx.globalAlpha = alpha;
                const fGrad = ctx.createRadialGradient(
                    sc.x + ox - sr*0.25, sc.y + oy - sr*0.2, 0,
                    sc.x + ox,           sc.y + oy,            sr
                );
                fGrad.addColorStop(0,   `rgb(${Math.min(255,fr+40)},${Math.min(255,fg+35)},${Math.min(255,fb+30)})`);
                fGrad.addColorStop(0.55, `rgb(${fr},${fg},${fb})`);
                fGrad.addColorStop(1,   `rgb(${(fr*0.65)|0},${(fg*0.65)|0},${(fb*0.65)|0})`);
                ctx.fillStyle = fGrad;
                ctx.beginPath();
                ctx.ellipse(sc.x + ox, sc.y + oy, sr, sr * 0.55, rng() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Toz-tuproq (dust) — rang building turiga qarab
            const dustR = spread * (0.8 + t * 0.6);
            const [dr, dg, db] = palette[0];
            ctx.strokeStyle = `rgba(${(dr*0.85)|0},${(dg*0.75)|0},${(db*0.65)|0},${(1 - t) * 0.28})`;
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            ctx.ellipse(sc.x, sc.y, dustR, dustR * 0.45, 0, 0, Math.PI * 2);
            ctx.stroke();

            return true;
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ── Uchuvchi bino bo'laklari — arc trajectory debris ──────────────────────
    _drawDebris(ctx) {
        if (this._debrisChunks.length === 0) return;
        const now = Date.now();
        const z   = Camera.zoom;
        const G   = 5.5;  // Tortishish kuchi (tile/s² ekvivalent)
        ctx.save();

        this._debrisChunks = this._debrisChunks.filter(d => {
            const age     = now - d.born;
            if (age > d.life) return false;
            const dt      = age / 1000;
            const t       = age / d.life;

            // Arc trajectory — horizontal world movement + vertical Z (screen height)
            const wx = d.x + d.vx * dt;
            const wy = d.y + d.vy * dt;
            const wz = d.vz * dt - 0.5 * G * dt * dt;   // simulated height
            if (wz < 0 && dt > 0.15) return false;       // yerga tushdi

            const iso = Camera.toIso(wx, wy);
            const sc  = Camera.worldToScreen(iso.x, iso.y);
            const screenY = sc.y - Math.max(0, wz) * 28 * z;  // height → screen offset

            // Ground shadow proportional to height
            const h2 = Math.max(0, wz);
            if (h2 > 0.05) {
                const sAlpha = (1 - t) * 0.22 * Math.max(0, 1 - h2 * 0.4);
                ctx.save();
                ctx.globalAlpha = sAlpha;
                ctx.fillStyle   = 'rgba(0,0,0,0.7)';
                ctx.beginPath();
                ctx.ellipse(sc.x + 2*z, sc.y + 1*z, d.size * z * 0.8, d.size * z * 0.35, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            }

            const alpha = (1 - Math.max(0, t - 0.7) / 0.3) * Math.min(1, t / 0.1 * 3);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(sc.x, screenY);
            ctx.rotate(d.rot + d.rotSpd * age * 0.06);

            const sz = d.size * z;
            if (d.shape === 'rect') {
                // Rectanglar bo'lak
                ctx.fillStyle = d.color;
                ctx.fillRect(-sz, -sz * 0.5, sz * 2, sz);
                // Dark edge
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth   = 0.8 * z;
                ctx.strokeRect(-sz, -sz * 0.5, sz * 2, sz);
            } else {
                // Uchburchak bo'lak
                ctx.fillStyle = d.color;
                ctx.beginPath();
                ctx.moveTo(0, -sz * 1.1);
                ctx.lineTo(sz, sz * 0.7);
                ctx.lineTo(-sz, sz * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth   = 0.8 * z;
                ctx.stroke();
            }
            ctx.restore();
            return true;
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ── Muzlatilgan binolar (Freeze Spell) — muz overlay ──────────────────────
    _drawFrozenBuildings(ctx) {
        if (typeof SpellSystem === 'undefined') return;
        const z = Camera.zoom;
        const now = Date.now();
        ctx.save();

        for (const b of Object.values(BuildingManager.buildings)) {
            if (!SpellSystem.isFrozen(b)) continue;
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;

            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
            const bH = (14 + (b.level || 1) * 4) * z;
            const pulse = (Math.sin(now * 0.006) + 1) / 2;

            // Ko'k-opaq muz qatlami
            ctx.globalAlpha = 0.35 + pulse * 0.15;
            ctx.fillStyle = 'rgba(130,220,255,1)';
            ctx.beginPath();
            ctx.moveTo(fp.top.x, fp.top.y - bH);
            ctx.lineTo(fp.right.x, fp.right.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y - bH);
            ctx.lineTo(fp.left.x, fp.left.y - bH);
            ctx.closePath();
            ctx.fill();

            // Yon tomonlar
            ctx.globalAlpha = 0.25 + pulse * 0.1;
            ctx.beginPath();
            ctx.moveTo(fp.left.x, fp.left.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y - bH);
            ctx.lineTo(fp.bottom.x, fp.bottom.y);
            ctx.lineTo(fp.left.x, fp.left.y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(80,180,240,1)';
            ctx.fill();

            // Muz kristall chiziqlar (yuqori yuzda)
            ctx.globalAlpha = 0.5 + pulse * 0.2;
            ctx.strokeStyle = 'rgba(200,240,255,1)';
            ctx.lineWidth = 0.8 * z;
            const cx = fp.cx, cy = (fp.top.y + fp.bottom.y) / 2 - bH;
            const spikeLen = Math.min(fp.right.x - fp.left.x, fp.bottom.y - fp.top.y) * 0.45;
            for (let k = 0; k < 4; k++) {
                const ang = (k / 4) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(ang) * spikeLen, cy + Math.sin(ang) * spikeLen * 0.5);
                ctx.stroke();
            }

            // ❄️ icon
            ctx.globalAlpha = 0.7 + pulse * 0.2;
            ctx.font = `${Math.max(10, 14 * z)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('❄️', fp.cx, fp.top.y - bH - 12 * z);
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ── Target lock lines — hujum qilayotgan askardan nishon binoga chiziq ──────
    _drawTargetLines(ctx) {
        if (!BattleManager.troops || BattleManager.troops.length === 0) return;
        const z   = Camera.zoom;
        const now = Date.now();
        ctx.save();

        // ── Pass 1: marching ant dashed lines ─────────────────────────────────
        ctx.setLineDash([2.5 * z, 4.5 * z]);
        ctx.lineCap = 'round';

        for (const t of BattleManager.troops) {
            if (t.state !== 'attacking' || !t.target) continue;
            const b = BuildingManager.buildings[t.target];
            if (!b) continue;
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;

            const bWorldX = b.x + bd.size[0] / 2;
            const bWorldY = b.y + bd.size[1] / 2;
            const fromIso = Camera.toIso(t.x, t.y);
            const fromSc  = Camera.worldToScreen(fromIso.x, fromIso.y);
            const toIso   = Camera.toIso(bWorldX, bWorldY);
            const toSc    = Camera.worldToScreen(toIso.x, toIso.y);

            const pulsed = (Math.sin(now * 0.007 + t.id * 0.35) + 1) / 2;
            const alpha  = 0.13 + pulsed * 0.1;
            // Marching ants: dash offset time-based (direction: troop → target)
            const seg = (2.5 + 4.5) * z;
            ctx.lineDashOffset = -(now * 0.022) % seg;

            ctx.strokeStyle = `rgba(255,70,50,${alpha})`;
            ctx.lineWidth   = 1 * z;
            ctx.beginPath();
            ctx.moveTo(fromSc.x, fromSc.y - 8 * z);
            ctx.lineTo(toSc.x, toSc.y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // ── Pass 2: CoC-style targeting reticle on each attacked building ─────
        const targetSet = new Set();
        for (const t of BattleManager.troops) {
            if (t.state === 'attacking' && t.target) targetSet.add(t.target);
        }

        for (const bid of targetSet) {
            const b = BuildingManager.buildings[bid];
            if (!b) continue;
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;

            const fp    = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
            const pulse = (Math.sin(now * 0.01) + 1) / 2;
            const rx    = (fp.right.x - fp.left.x) * 0.52;
            const ry    = (fp.bottom.y - fp.top.y) * 0.52;
            const alpha = 0.28 + pulse * 0.22;
            const rot   = now * 0.0012;  // slowly rotating reticle

            ctx.save();
            ctx.translate(fp.cx, fp.cy);
            ctx.rotate(rot);

            // Outer rotating diamond (4 dashes)
            const dashLen = Math.PI * 0.35;
            for (let qi = 0; qi < 4; qi++) {
                const baseAng = (qi / 4) * Math.PI * 2 - dashLen / 2;
                ctx.strokeStyle = `rgba(255,55,40,${alpha})`;
                ctx.lineWidth   = 1.4 * z;
                ctx.shadowColor = 'rgba(255,60,30,0.4)';
                ctx.shadowBlur  = 4 * z;
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, ry, 0, baseAng, baseAng + dashLen);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // Inner crosshair lines (4 short radial lines from center)
            const crLen = Math.min(rx, ry) * 0.35;
            ctx.strokeStyle = `rgba(255,80,60,${alpha * 0.9})`;
            ctx.lineWidth   = 0.8 * z;
            for (let ci = 0; ci < 4; ci++) {
                const cAng = (ci / 4) * Math.PI * 2;
                const cx0  = Math.cos(cAng) * crLen * 0.25;
                const cy0  = Math.sin(cAng) * crLen * 0.25 * (ry / rx);
                const cx1  = Math.cos(cAng) * crLen;
                const cy1  = Math.sin(cAng) * crLen * (ry / rx);
                ctx.beginPath();
                ctx.moveTo(cx0, cy0);
                ctx.lineTo(cx1, cy1);
                ctx.stroke();
            }

            // Center dot — yorqin
            ctx.fillStyle = `rgba(255,80,60,${0.5 + pulse * 0.35})`;
            ctx.shadowColor = 'rgba(255,60,30,0.6)';
            ctx.shadowBlur  = 5 * z;
            ctx.beginPath();
            ctx.arc(0, 0, 2 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.restore();
        }

        ctx.restore();
    },

    // ── Praetorium / Militia: trigger radius doirasi ──────────────────────────
    _drawMilitiaTriggerRadius(ctx) {
        const z   = Camera.zoom;
        const now = Date.now();

        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type !== 'praetorium' && b.type !== 'militia') continue;
            if (b.hp <= 0) continue;
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;

            // Praetorium uchun storedTroops > 0 bo'lsa, militia uchun har doim
            const hasGuards = b.type === 'militia' || (b._storedTroops || 0) > 0;
            if (!hasGuards) continue;

            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);

            // Trigger radius ≈ 12 tiles (CoC CC trigger)
            const triggerTiles = b.type === 'praetorium' ? 12 : 8;
            const rx = triggerTiles * Grid.TILE_W * z;
            const ry = rx * (Grid.TILE_H / Grid.TILE_W);

            const pulse = (Math.sin(now * 0.003) + 1) / 2;
            ctx.save();
            ctx.globalAlpha = 0.08 + pulse * 0.04;
            ctx.strokeStyle = b.type === 'praetorium' ? '#cd853f' : '#78909c';
            ctx.lineWidth = 1.2 * z;
            ctx.setLineDash([5 * z, 6 * z]);
            ctx.beginPath();
            ctx.ellipse(fp.cx, fp.cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    },

    // ── Defense tower attack rotation indicator ────────────────────────────────
    _drawTowerAttackIndicator(ctx) {
        const z   = Camera.zoom;
        const now = Date.now();
        const ACTIVE_DUR = 700; // ms

        for (const b of Object.values(BuildingManager.buildings)) {
            if (!b._lastFiredAt || !b._lastFiredTarget) continue;
            const age = now - b._lastFiredAt;
            if (age > ACTIVE_DUR) continue;

            const bd = BUILDING_DATA[b.type];
            if (!bd || bd.category !== 'mudofaa') continue;

            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
            const t  = age / ACTIVE_DUR;  // 0→1

            const tgt = b._lastFiredTarget;
            const tgtIso = Camera.toIso(tgt.x, tgt.y);
            const tgtSc  = Camera.worldToScreen(tgtIso.x, tgtIso.y);
            const angle  = Math.atan2(tgtSc.y - fp.cy, tgtSc.x - fp.cx);
            const alpha  = (1 - t) * 0.65;

            const solidColor = b.type === 'flamingCitadel' ? '#ff6400'
                             : b.type === 'magicTower'      ? '#b400ff'
                             : b.type === 'scorpio'         ? '#ffeb3b'
                             : b.type === 'boltTower'       ? '#f03278'
                             : '#90caf9';
            const arrowColor = solidColor.replace('#', 'rgba(').replace(/(..)(..)(..)/, (m, r, g, bl) =>
                `${parseInt(r,16)},${parseInt(g,16)},${parseInt(bl,16)},${alpha}`) || `rgba(200,220,255,${alpha})`;

            ctx.save();

            // ── Sweep arc (target yo'nalishida keng yoy) ──
            if (t < 0.5) {
                const sweepAlpha = (1 - t / 0.5) * 0.3;
                const sweepR = (bd.levels?.[b.level || 1]?.range || 5) * 8 * z;
                ctx.globalAlpha = sweepAlpha;
                ctx.fillStyle   = solidColor;
                ctx.beginPath();
                ctx.moveTo(fp.cx, fp.cy);
                ctx.arc(fp.cx, fp.cy, sweepR * 0.4, angle - 0.5, angle + 0.5);
                ctx.closePath();
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
            ctx.lineWidth   = 1.5 * z;
            ctx.lineCap     = 'round';

            // Arrow
            const arrowLen = (5 + (1 - t) * 7) * z;
            const ax = fp.cx + Math.cos(angle) * 2 * z;
            const ay = fp.cy + Math.sin(angle) * 2 * z;
            const ex = fp.cx + Math.cos(angle) * arrowLen;
            const ey = fp.cy + Math.sin(angle) * arrowLen;
            ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            // Arrowhead
            const hLen = 3 * z;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - Math.cos(angle - 0.5) * hLen, ey - Math.sin(angle - 0.5) * hLen);
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - Math.cos(angle + 0.5) * hLen, ey - Math.sin(angle + 0.5) * hLen);
            ctx.stroke();

            ctx.restore();
        }
    },

    _drawBuildingHP(ctx) {
        const z   = Camera.zoom;
        const now = Date.now();

        for (const [id, b] of Object.entries(BuildingManager.buildings)) {
            if (b.hp >= b.maxHp) continue; // Faqat zarar ko'rgan binolar

            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);

            const perc = Math.max(0, b.hp / b.maxHp);
            const isWall = b.type === 'wall' || b.type === 'gate';

            // Wall HP: kichikroq, lekin ko'rinadigan
            const bw  = isWall ? 20 * z : 34 * z;
            const bh  = isWall ? 3  * z : 5  * z;
            const bx0 = fp.cx - bw / 2;
            const by0 = fp.top.y - (isWall ? 4 : 8) * z;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.beginPath();
            ctx.roundRect?.(bx0 - 0.5, by0 - 0.5, bw + 1, bh + 1, (bh + 1) / 2) ||
                ctx.rect(bx0 - 0.5, by0 - 0.5, bw + 1, bh + 1);
            ctx.fill();

            // Track
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.roundRect?.(bx0, by0, bw, bh, bh / 2) || ctx.rect(bx0, by0, bw, bh);
            ctx.fill();

            // Fill color — gradient (CoC-style 3D bar)
            let bhColTop, bhColBot;
            if (perc > 0.6)      { bhColTop = '#81c784'; bhColBot = '#2e7d32'; }
            else if (perc > 0.3) { bhColTop = '#ffe082'; bhColBot = '#e65100'; }
            else {
                const pulse4 = (Math.sin(now * 0.012) + 1) / 2;
                bhColTop = `rgb(255,${80 + (pulse4*60)|0},${60 + (pulse4*40)|0})`;
                bhColBot = `rgb(${(180 + pulse4*50)|0},0,0)`;
            }
            const fillW = Math.max(0, bw * perc);
            if (fillW > 0) {
                const bhGrad = ctx.createLinearGradient(0, by0, 0, by0 + bh);
                bhGrad.addColorStop(0, bhColTop);
                bhGrad.addColorStop(1, bhColBot);
                ctx.fillStyle = bhGrad;
                ctx.beginPath();
                ctx.roundRect?.(bx0, by0, fillW, bh, bh / 2) || ctx.rect(bx0, by0, fillW, bh);
                ctx.fill();
                // Shine strip — left-heavy horizontal gradient
                const bhShGrad = ctx.createLinearGradient(bx0, 0, bx0 + fillW, 0);
                bhShGrad.addColorStop(0,    'rgba(255,255,255,0.35)');
                bhShGrad.addColorStop(0.4,  'rgba(255,255,255,0.15)');
                bhShGrad.addColorStop(1,    'rgba(255,255,255,0.04)');
                ctx.fillStyle = bhShGrad;
                ctx.fillRect(bx0 + 1, by0, Math.max(0, fillW - 2), bh * 0.42);
            }

            // HP text (faqat katta binolar uchun)
            if (!isWall && z > 0.7) {
                const hpInt = Math.ceil(b.hp);
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${Math.max(7, 8 * z)}px Inter,sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(Helpers.formatNumber(hpInt), fp.cx, by0 + bh + 2 * z);
            }

            // ── Inferno Column charge indicator ─────────────────────────────
            if (b.type === 'infernoColumn' && b._infernoCharge) {
                const maxCharge = 4.0;
                const chargeRatio = Math.min(1, (b._infernoCharge - 1) / (maxCharge - 1));
                const chargeW = bw * chargeRatio;
                const chargeY = by0 - (bh + 3 * z);  // HP bardan bir oz yuqorida

                // Background
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.beginPath();
                ctx.roundRect?.(bx0, chargeY, bw, bh * 0.8, bh * 0.4) || ctx.rect(bx0, chargeY, bw, bh * 0.8);
                ctx.fill();

                // Charge fill — sariq dan qizilga
                if (chargeRatio > 0) {
                    const r2 = Math.round(255);
                    const g3 = Math.round(220 - chargeRatio * 180);
                    ctx.fillStyle = `rgb(${r2},${g3},30)`;
                    ctx.shadowColor = `rgb(${r2},${g3},30)`;
                    ctx.shadowBlur = 4 * z;
                    ctx.beginPath();
                    ctx.roundRect?.(bx0, chargeY, chargeW, bh * 0.8, bh * 0.4) || ctx.rect(bx0, chargeY, chargeW, bh * 0.8);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            // ── Bino zarar crack overlay (HP < 50%) ────────────────────────────
            if (perc < 0.5 && !isWall) {
                const pts = fp;
                const cx2 = fp.cx, cy2 = (pts.top.y + pts.bottom.y) / 2;
                const hw  = Math.abs(pts.right.x - pts.left.x) * 0.45;
                const hh  = Math.abs(pts.bottom.y - pts.top.y) * 0.45;

                // Qorongʻi overlay — bino "yonmoqda"
                const darkAlpha = perc < 0.25 ? 0.35 : 0.18;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(pts.top.x,    pts.top.y);
                ctx.lineTo(pts.right.x,  pts.right.y);
                ctx.lineTo(pts.bottom.x, pts.bottom.y);
                ctx.lineTo(pts.left.x,   pts.left.y);
                ctx.closePath();
                ctx.fillStyle = `rgba(20,0,0,${darkAlpha})`;
                ctx.fill();
                ctx.restore();

                // Yoriq chiziqlar — seeded pseudo-random (stable per building)
                const bSeed = (b.x * 31 + b.y * 17) & 0xffff;
                const rng = (i) => {
                    const v = Math.sin(bSeed * 12.9898 + i * 78.233) * 43758.5453;
                    return v - Math.floor(v);
                };
                const crackCount = perc < 0.25 ? 4 : 2;
                ctx.save();
                ctx.strokeStyle = perc < 0.25 ? 'rgba(10,0,0,0.85)' : 'rgba(30,10,0,0.6)';
                ctx.lineWidth = (perc < 0.25 ? 1.5 : 1.0) * z;
                for (let ci = 0; ci < crackCount; ci++) {
                    const ox  = (rng(ci * 5 + 0) - 0.5) * hw * 1.6;
                    const oy  = (rng(ci * 5 + 1) - 0.5) * hh * 1.6;
                    const ang = rng(ci * 5 + 2) * Math.PI * 2;
                    const len = (rng(ci * 5 + 3) * 0.3 + 0.15) * Math.min(hw, hh) * 2;
                    ctx.beginPath();
                    ctx.moveTo(cx2 + ox, cy2 + oy);
                    // Zigzag crack: 3 segmentlar
                    for (let seg = 0; seg < 3; seg++) {
                        const jitter = (rng(ci * 5 + seg + 10) - 0.5) * 0.4;
                        const segAng = ang + jitter;
                        ctx.lineTo(
                            cx2 + ox + Math.cos(segAng) * len * (seg + 1) / 3,
                            cy2 + oy + Math.sin(segAng) * len * (seg + 1) / 3
                        );
                    }
                    ctx.stroke();
                }
                ctx.restore();

                // Tutun pufakchasi — past HPda doimiy tutun (each frame 2% chance)
                if (perc < 0.25 && Math.random() < 0.02) {
                    this._smokeParticles.push({
                        wx: b.x + (Math.random() - 0.5) * bd.size[0] * 0.7,
                        wy: b.y - bd.size[1] * 0.3,
                        color: Math.random() < 0.4 ? '#ff5722' : '#666',
                        size: 0.4 + Math.random() * 0.4,
                        life: 0.7 + Math.random() * 0.4,
                        decay: 0.012 + Math.random() * 0.008,
                        vx: (Math.random() - 0.5) * 0.015,
                        vy: -(0.02 + Math.random() * 0.015),
                    });
                }
            }

            // ── Devor zarar holati — HP ga qarab qorayib/qizarib boradi ──────────
            if (isWall && perc < 0.75) {
                const pts = fp;
                // HP dan tint zichligi: 0.75→0.15α, 0.5→0.35α, 0.25→0.55α
                const darkAlpha = perc < 0.25 ? 0.55 : perc < 0.5 ? 0.35 : 0.15;
                const rC = perc < 0.25 ? 140 : 20;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(pts.top.x,    pts.top.y);
                ctx.lineTo(pts.right.x,  pts.right.y);
                ctx.lineTo(pts.bottom.x, pts.bottom.y);
                ctx.lineTo(pts.left.x,   pts.left.y);
                ctx.closePath();
                ctx.fillStyle = `rgba(${rC},0,0,${darkAlpha})`;
                ctx.fill();
                ctx.restore();

                // HP < 50%: kichik yoriq chiziqlar
                if (perc < 0.5) {
                    const cx2 = fp.cx, cy2 = (fp.top.y + fp.bottom.y) / 2;
                    const hw2 = Math.abs(fp.right.x - fp.left.x) * 0.4;
                    const hh2 = Math.abs(fp.bottom.y - fp.top.y) * 0.4;
                    const bSeed = (b.x * 31 + b.y * 17) & 0xffff;
                    const rngW = (i) => {
                        const v = Math.sin(bSeed * 9.1423 + i * 54.321) * 31415.9;
                        return v - Math.floor(v);
                    };
                    ctx.save();
                    ctx.strokeStyle = perc < 0.25 ? 'rgba(0,0,0,0.9)' : 'rgba(20,0,0,0.6)';
                    ctx.lineWidth = (perc < 0.25 ? 1.2 : 0.8) * z;
                    const crackCount = perc < 0.25 ? 3 : 1;
                    for (let ci = 0; ci < crackCount; ci++) {
                        const ox  = (rngW(ci * 4 + 0) - 0.5) * hw2;
                        const oy  = (rngW(ci * 4 + 1) - 0.5) * hh2;
                        const ang = rngW(ci * 4 + 2) * Math.PI * 2;
                        const len = (rngW(ci * 4 + 3) * 0.25 + 0.1) * hw2 * 2;
                        ctx.beginPath();
                        ctx.moveTo(cx2 + ox, cy2 + oy);
                        for (let seg = 0; seg < 2; seg++) {
                            const jit = (rngW(ci * 4 + seg + 8) - 0.5) * 0.35;
                            ctx.lineTo(
                                cx2 + ox + Math.cos(ang + jit) * len * (seg + 1) / 2,
                                cy2 + oy + Math.sin(ang + jit) * len * (seg + 1) / 2
                            );
                        }
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // ── Hit flash — bino zarar olganida oq chaqnash ─────────────────
            if (b._hitTime) {
                const age = now - b._hitTime;
                const HIT_DUR = 200;
                if (age < HIT_DUR) {
                    const flashAlpha = (1 - age / HIT_DUR) * 0.55;
                    // Bino footprint ustida oq overlay
                    const pts = fp;
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(pts.top.x,    pts.top.y);
                    ctx.lineTo(pts.right.x,  pts.right.y);
                    ctx.lineTo(pts.bottom.x, pts.bottom.y);
                    ctx.lineTo(pts.left.x,   pts.left.y);
                    ctx.closePath();
                    ctx.fillStyle   = `rgba(255,255,255,${flashAlpha})`;
                    ctx.shadowColor = 'rgba(255,80,80,0.8)';
                    ctx.shadowBlur  = 12 * z;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.restore();
                } else {
                    delete b._hitTime;
                }
            }
        }
    }
};
