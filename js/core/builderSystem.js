// ============================================
// QURUVCHI TIZIMI (Builder System)
// CoC dek — cheklangan quruvchilar
// ============================================

const BuilderSystem = {
    totalBuilders: 1,    // Bepul 1 ta
    busyBuilders: 0,     // Band quruvchilar

    // 2-quruvchi narxi: 250 olmos, 3-quruvchi: 500 va hokazo
    builderCosts: [0, 0, 250, 500, 1000, 2000],

    init() {
        // localStorage-dan faqat SaveSystem yuklagan qiymatdan KAM bo'lganda ishlatamiz
        // (SaveSystem.load() init() DAN OLDIN ishlaydi — so'ngi to'g'ri qiymatni saqlaymiz)
        try {
            const saved = parseInt(localStorage.getItem('tc_builders'));
            if (saved >= 1 && saved <= 5 && saved > this.totalBuilders) {
                // Faqat recovery holati: SaveSystem saveni yuklamadi lekin localStorage bor
                this.totalBuilders = saved;
            }
        } catch {}
        this.updateDisplay();
    },

    hasFreeBuilder() {
        return this.busyBuilders < this.totalBuilders;
    },

    assignBuilder() {
        if (this.busyBuilders < this.totalBuilders) {
            this.busyBuilders++;
            this.updateDisplay();
            return true;
        }
        return false;
    },

    freeBuilder() {
        if (this.busyBuilders > 0) {
            this.busyBuilders--;
            this.updateDisplay();
        }
    },

    // Yangi quruvchi sotib olish
    buyBuilder() {
        const nextIdx = this.totalBuilders;
        if (nextIdx >= this.builderCosts.length) {
            Toast.show("Maksimal quruvchi soni!", "warning");
            return false;
        }

        const cost = this.builderCosts[nextIdx];
        if (!Resources.spend('diamond', cost)) {
            Toast.show("Olmos yetarli emas!", "error");
            return false;
        }

        this.totalBuilders++;
        try { localStorage.setItem('tc_builders', this.totalBuilders); } catch {}
        Toast.show(`👷 Yangi quruvchi sotib olindi! (${this.totalBuilders} ta)`, 'reward');
        if (typeof NotificationSystem !== 'undefined') {
            NotificationSystem.add('builder', 'Yangi quruvchi!', `Endi ${this.totalBuilders} ta quruvchingiz bor.`, '👷');
        }
        this.updateDisplay();
        return true;
    },

    getNextBuilderCost() {
        const nextIdx = this.totalBuilders;
        if (nextIdx >= this.builderCosts.length) return null;
        return this.builderCosts[nextIdx];
    },

    updateDisplay() {
        const el = document.getElementById('builder-display');
        if (el) {
            const free = this.totalBuilders - this.busyBuilders;
            el.innerHTML = `👷 ${free}/${this.totalBuilders}`;
            el.className = 'builder-display' + (free === 0 ? ' busy' : '');
            if (!el._clickBound) {
                el._clickBound = true;
                el.addEventListener('click', () => BuilderSystem.showPopup());
            }
        }
    },

    // ── Builder purchase popup — CoC-style ───────────────────────────────────
    showPopup() {
        // Eski popup yo'q qilish
        const old = document.getElementById('builder-popup');
        if (old) { old.remove(); return; }

        const popup = document.createElement('div');
        popup.id = 'builder-popup';
        popup.style.cssText = `
            position:fixed;z-index:8500;
            top:70px;left:50%;transform:translateX(-50%);
            background:linear-gradient(160deg,#1a2236,#0d1220);
            border:1px solid rgba(212,175,55,0.4);
            border-radius:16px;padding:16px 20px;min-width:240px;
            box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.05);
            animation:popInCentered 0.2s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
            font-family:'Inter',sans-serif;
        `;

        // CSS animation (bir marta)
        if (!document.getElementById('builder-popup-style')) {
            const s = document.createElement('style');
            s.id = 'builder-popup-style';
            s.textContent = `@keyframes popInCentered {from{opacity:0;transform:translateX(-50%) scale(0.85)}to{opacity:1;transform:translateX(-50%) scale(1)}}`;
            document.head.appendChild(s);
        }

        const nextCost = this.getNextBuilderCost();
        const isMax = nextCost === null;
        const canAfford = !isMax && (typeof Resources !== 'undefined' && Resources.diamond >= nextCost);
        // Xaritadagi hut soni
        const hutsOnMap = typeof BuildingManager !== 'undefined' ? BuildingManager.countType('builderHut') : 0;

        // Builder slots — ikonlar bilan
        const slots = [];
        for (let i = 0; i < 5; i++) {
            const isOwned = i < this.totalBuilders;
            const isBusy  = isOwned && (i >= (this.totalBuilders - this.busyBuilders));
            const label   = isOwned ? (isBusy ? '🔨' : '👷') : '🔒';
            const col     = isOwned ? (isBusy ? '#ff9800' : '#69f0ae') : '#555';
            slots.push(`<div style="text-align:center;padding:6px;background:rgba(255,255,255,0.04);
                                    border:1px solid ${isOwned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'};
                                    border-radius:10px;font-size:20px;min-width:42px;
                                    color:${col};">${label}</div>`);
        }

        popup.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:0.3px;">👷 Quruvchilar</div>
                <div style="font-size:10px;color:#888;cursor:pointer;padding:2px 6px;
                            background:rgba(255,255,255,0.05);border-radius:6px;"
                     onclick="document.getElementById('builder-popup')?.remove()">✖</div>
            </div>
            <div style="display:flex;gap:6px;justify-content:center;margin-bottom:14px;">
                ${slots.join('')}
            </div>
            <div style="font-size:11px;color:#aaa;text-align:center;margin-bottom:12px;line-height:1.4;">
                ${this.busyBuilders} ta band · ${this.totalBuilders - this.busyBuilders} ta bo'sh
                <br><span style="color:#666;font-size:10px;">Quruvchi har bir qurilish/yangilash uchun kerak</span>
            </div>
            ${isMax
                ? `<div style="text-align:center;color:#69f0ae;font-size:12px;font-weight:700;
                               padding:8px;background:rgba(76,175,80,0.1);border-radius:8px;">
                       ✅ Maksimal quruvchi soni (5/5)
                   </div>`
                : `<button onclick="BuilderSystem._buyFromPopup()"
                           style="width:100%;padding:9px 0;font-size:12px;font-weight:800;cursor:pointer;
                                  background:${canAfford ? 'linear-gradient(135deg,rgba(212,175,55,0.3),rgba(180,130,20,0.15))' : 'rgba(255,255,255,0.05)'};
                                  border:1px solid ${canAfford ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.1)'};
                                  border-radius:10px;color:${canAfford ? '#ffd700' : '#555'};letter-spacing:0.3px;">
                       💎 ${nextCost} — ${this.totalBuilders + 1}-quruvchi sotib olish
                   </button>
                   ${hutsOnMap < this.totalBuilders ? `
                   <div style="text-align:center;font-size:9px;color:#666;margin-top:6px;">
                       🛖 Xaritada ${this.totalBuilders - hutsOnMap} ta quruvchi uyni joylashtirmadingiz
                       <br><span style="color:#80cbc4;cursor:pointer;" onclick="document.getElementById('builder-popup')?.remove();BuildMenu.toggle()">
                           → Qurilish menyusida qo'shing
                       </span>
                   </div>` : ''}
                `
            }
        `;

        document.body.appendChild(popup);

        // Tashqariga klik qilganda yopish
        setTimeout(() => {
            const close = (e) => {
                if (!popup.contains(e.target) && e.target.id !== 'builder-display') {
                    popup.remove();
                    document.removeEventListener('click', close);
                }
            };
            document.addEventListener('click', close);
        }, 100);
    },

    _buyFromPopup() {
        const ok = this.buyBuilder();
        const popup = document.getElementById('builder-popup');
        if (popup) popup.remove();
        if (ok) setTimeout(() => this.showPopup(), 150);
    }
};
