// ============================================
// BATTLE INTRO — Jang boshlanishi countdown
// CoC uslubida "3-2-1-HUJUM!" overlay
// ============================================

const BattleIntro = {
    _steps: ['3', '2', '1', '⚔️'],
    _labels: ['', '', '', 'HUJUM!'],

    play() {
        // Old overlay bo'lsa o'chirish
        const old = document.getElementById('battle-intro-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'battle-intro-overlay';
        overlay.style.cssText = `
            position:fixed;inset:0;
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            z-index:25000;pointer-events:none;
            background:rgba(0,0,0,0.0);
        `;
        document.body.appendChild(overlay);

        let step = 0;
        const showStep = () => {
            overlay.innerHTML = '';
            if (step >= this._steps.length) {
                overlay.remove();
                return;
            }

            const isLast = step === this._steps.length - 1;
            const icon   = this._steps[step];
            const label  = this._labels[step];

            // Main number
            const num = document.createElement('div');
            num.style.cssText = `
                font-family:'Cinzel',serif;
                font-size:${isLast ? 56 : 96}px;
                font-weight:900;
                color:${isLast ? '#ff5722' : '#ffd700'};
                text-shadow:
                    0 0 30px ${isLast ? 'rgba(255,87,34,0.8)' : 'rgba(255,215,0,0.9)'},
                    0 4px 0 rgba(0,0,0,0.6);
                letter-spacing:${isLast ? '4px' : '0'};
                animation:battleCountAnim 0.7s cubic-bezier(0.175,0.885,0.32,1.275) both;
                line-height:1;
            `;
            num.textContent = icon;
            overlay.appendChild(num);

            if (label) {
                const lbl = document.createElement('div');
                lbl.style.cssText = `
                    font-family:'Cinzel',serif;
                    font-size:22px;
                    font-weight:700;
                    color:#ff8a65;
                    letter-spacing:6px;
                    text-shadow:0 0 20px rgba(255,87,34,0.7);
                    margin-top:8px;
                    animation:battleCountAnim 0.7s cubic-bezier(0.175,0.885,0.32,1.275) both;
                `;
                lbl.textContent = label;
                overlay.appendChild(lbl);
            }

            // Ring burst
            if (!isLast) {
                const ring = document.createElement('div');
                ring.style.cssText = `
                    position:absolute;
                    width:150px;height:150px;
                    border-radius:50%;
                    border:3px solid ${step === 0 ? '#ff5722' : step === 1 ? '#ff9800' : '#4caf50'};
                    animation:battleRingBurst 0.65s ease-out forwards;
                    pointer-events:none;
                `;
                overlay.appendChild(ring);
            }

            // Screen flash on "HUJUM"
            if (isLast) {
                overlay.style.background = 'rgba(255,87,34,0.15)';
                setTimeout(() => { overlay.style.background = 'rgba(0,0,0,0)'; }, 200);
            }

            step++;
            const delay = isLast ? 800 : 700;
            setTimeout(showStep, delay);
        };

        // Kichik kechikish bilan boshlash (UI yuklanishini kutish)
        setTimeout(showStep, 200);
    }
};
