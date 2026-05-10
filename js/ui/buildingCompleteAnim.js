// ============================================
// BUILDING COMPLETE ANIMATION
// Bino qurilishi tugaganda vizual effekt
// ============================================

const BuildingCompleteAnim = {

    /**
     * Binoning grid koordinatasida qurilish tugadi animatsiyasini ko'rsatish.
     * @param {number} gridX  - bino x (grid)
     * @param {number} gridY  - bino y (grid)
     * @param {string} icon   - bino emoji icon
     * @param {string} name   - bino nomi
     * @param {number} level  - yangi level
     * @param {number} xp     - XP mukofoti
     */
    play(gridX, gridY, icon, name, level, xp) {
        // Grid tile markazi → isometrik → ekran koordinatalari
        // Building center in grid units (approximate from gridX,gridY)
        const cx = gridX + 0.5;
        const cy = gridY + 0.5;
        const iso    = Camera.toIso(cx, cy);
        const screen = Camera.worldToScreen(iso.x, iso.y);

        const sx = Math.round(screen.x);
        const sy = Math.round(screen.y);

        this._showBanner(sx, sy, icon, name, level, xp);
        this._burstConfetti(sx, sy);
        this._flashGlow(sx, sy);
        this._ringPulse(sx, sy);
        // Canvas-side gold particle burst
        if (typeof BattleRenderer === 'undefined' && typeof MapRenderer !== 'undefined') {
            // Home mode: add brief gold sparkle via MapRenderer (if available)
        }
    },

    _showBanner(sx, sy, icon, name, level, xp) {
        const div = document.createElement('div');
        div.style.cssText = `
            position:fixed;
            left:${sx}px; top:${sy}px;
            transform:translate(-50%,-150%) scale(0.5);
            z-index:8800;
            background:linear-gradient(135deg,#1a2a0a,#0d1f00);
            border:2px solid #76c442;
            border-radius:14px;
            padding:10px 16px;
            text-align:center;
            pointer-events:none;
            white-space:nowrap;
            box-shadow:0 0 20px rgba(118,196,66,0.5),0 4px 20px rgba(0,0,0,0.6);
            animation:buildCompleteIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
        `;
        div.innerHTML = `
            <div style="font-size:26px;margin-bottom:3px;filter:drop-shadow(0 0 6px #76c44288);">${icon}</div>
            <div style="font-size:12px;font-weight:800;color:#a5d6a7;font-family:'Cinzel',serif;">✅ TAYYOR!</div>
            <div style="font-size:11px;color:#fff;font-weight:700;margin-top:1px;">${name} <span style="color:#ffd700;">Lvl ${level}</span></div>
            ${xp > 0 ? `<div style="font-size:10px;color:#ce93d8;margin-top:2px;">+${xp} XP</div>` : ''}
        `;
        document.body.appendChild(div);

        // Float up and fade out
        setTimeout(() => {
            div.style.animation = 'buildCompleteOut 0.6s ease-in forwards';
            setTimeout(() => div.remove(), 620);
        }, 1600);
    },

    _burstConfetti(sx, sy) {
        const colors = ['#76c442','#ffd700','#4caf50','#a5d6a7','#ffb74d','#81d4fa','#ff8a65','#ce93d8'];
        const COUNT = 26;  // ko'proq zarracha

        for (let i = 0; i < COUNT; i++) {
            const div = document.createElement('div');
            // CoC uslubi: asosan yuqoriga otiladi, keyin gravitatsiya
            const spreadAng = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const speed     = 48 + Math.random() * 70;
            const size      = 4 + Math.random() * 7;
            const color     = colors[Math.floor(Math.random() * colors.length)];
            // Gravitatsiyali: yuqoriga va yon tomonga
            const vx        = Math.cos(spreadAng) * speed * 0.9;
            const vy        = -Math.abs(Math.sin(spreadAng)) * speed - 25 + (Math.random() - 0.5) * 20;
            const dur       = 700 + Math.random() * 500;
            const gravity   = 280 + Math.random() * 120;  // px/s² (CSS animatsiya uchun)
            // Shakl: aylanali yoki kvadrat confetti
            const rotate    = Math.floor(Math.random() * 360);
            const shape     = Math.random() > 0.4 ? '50%' : (Math.random() > 0.5 ? '2px' : '0');

            div.style.cssText = `
                position:fixed;
                left:${sx}px; top:${sy}px;
                width:${size}px; height:${size}px;
                background:${color};
                border-radius:${shape};
                pointer-events:none;
                z-index:8799;
                transform:translate(-50%,-50%) rotate(${rotate}deg);
                animation:buildConfettiPiece ${dur}ms ease-in forwards;
                --vx:${vx}px; --vy:${vy}px; --gravity:${gravity}px;
            `;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), dur + 80);
        }

        // Altın yıldız parçacıkları (CoC'daki gibi)
        for (let si = 0; si < 5; si++) {
            const star = document.createElement('div');
            const sa   = (si / 5) * Math.PI * 2 + Math.random() * 0.4;
            const ss   = 60 + Math.random() * 50;
            star.style.cssText = `
                position:fixed;
                left:${sx}px; top:${sy}px;
                font-size:${10 + Math.random() * 8}px;
                pointer-events:none;
                z-index:8800;
                transform:translate(-50%,-50%);
                animation:buildConfettiPiece ${500 + Math.random() * 400}ms ease-out forwards;
                --vx:${Math.cos(sa) * ss * 0.7}px;
                --vy:${-Math.abs(Math.sin(sa)) * ss - 15}px;
                --gravity:350px;
            `;
            star.textContent = ['⭐','✨','🌟','💫'][si % 4];
            document.body.appendChild(star);
            setTimeout(() => star.remove(), 950);
        }
    },

    _flashGlow(sx, sy) {
        const ring = document.createElement('div');
        ring.style.cssText = `
            position:fixed;
            left:${sx}px; top:${sy}px;
            width:6px; height:6px;
            border-radius:50%;
            pointer-events:none;
            z-index:8798;
            transform:translate(-50%,-50%);
            background:rgba(118,196,66,0.6);
            box-shadow:0 0 0 0 rgba(118,196,66,0.7);
            animation:buildGlowRing 0.7s ease-out forwards;
        `;
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 750);
    },

    // CoC uslubida kengayuvchi halqa pulslar (2 ta staggered)
    _ringPulse(sx, sy) {
        const RINGS = [
            { delay: 0,   color: 'rgba(118,196,66,', size: 10,  dur: 700 },
            { delay: 130, color: 'rgba(165,214,167,', size: 14,  dur: 600 },
            { delay: 260, color: 'rgba(255,215,0,',   size: 8,   dur: 550 },
        ];
        for (const cfg of RINGS) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.style.cssText = `
                    position:fixed;
                    left:${sx}px; top:${sy}px;
                    width:${cfg.size}px; height:${cfg.size}px;
                    border-radius:50%;
                    pointer-events:none;
                    z-index:8797;
                    transform:translate(-50%,-50%) scale(1);
                    border:3px solid ${cfg.color}0.85);
                    box-shadow:0 0 12px ${cfg.color}0.5);
                    animation:buildRingExpand ${cfg.dur}ms cubic-bezier(0.1,0.5,0.4,1) forwards;
                `;
                document.body.appendChild(el);
                setTimeout(() => el.remove(), cfg.dur + 50);
            }, cfg.delay);
        }
    },
};
