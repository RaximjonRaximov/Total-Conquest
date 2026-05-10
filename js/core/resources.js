// ============================================
// RESURS TIZIMI
// 4 ta resurs: Oltin, Olma, Olmos, Olma Oltin
// ============================================

const Resources = {
    gold: 1000,
    food: 500,
    diamond: 999999,
    goldenApple: 0,

    // Smooth HUD counter — hozirgi ko'rsatilayotgan qiymat
    _disp: { gold: 0, food: 0, diamond: 0, goldenApple: 0 },
    _animRaf: null,

    // HUD ni smooth animatsiya bilan yangilash
    _animateDisplay() {
        if (this._animRaf) return; // Allaqachon ishlamoqda
        const tick = () => {
            let anyDiff = false;
            for (const key of ['gold', 'food', 'diamond', 'goldenApple']) {
                const target = this[key] || 0;
                const cur    = this._disp[key] || 0;
                const diff   = target - cur;
                if (Math.abs(diff) < 1) {
                    this._disp[key] = target;
                } else {
                    // Tezlik: katta farq bo'lsa tez, kichik bo'lsa sekin
                    const step = diff * 0.18 + Math.sign(diff) * 0.5;
                    this._disp[key] = cur + step;
                    anyDiff = true;
                }
            }
            this._updateDisplayDOM();
            if (anyDiff) {
                this._animRaf = requestAnimationFrame(tick);
            } else {
                this._animRaf = null;
            }
        };
        this._animRaf = requestAnimationFrame(tick);
    },

    getCapacity(type) {
        if (type === 'diamond') return Infinity;
        let capacity = 0;
        
        // Town Hall o'zining sig'imi
        if (type === 'gold' || type === 'food') {
            capacity += 2000 * (Game.townHallLevel || 1); // har levelga 2000
        }
        
        // Omborlarni tekshirish
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.building) continue; // Qurilayotgan bo'lsa hisoblanmaydi
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const lv = bd.levels[b.level];
            if (!lv || !lv.capacity) continue;
            
            if (type === 'gold' && b.type === 'goldStorage') capacity += lv.capacity;
            if (type === 'food' && b.type === 'foodStorage') capacity += lv.capacity;
            if (type === 'goldenApple' && b.type === 'goldenAppleStorage') capacity += lv.capacity;
        }
        return capacity;
    },

    // Resurs qo'shish
    add(type, amount) {
        if (amount <= 0) { this.updateDisplay(); return; }
        const capacity = this.getCapacity(type);
        const before   = this[type] || 0;
        this[type] = Math.min(capacity, Math.max(0, before + amount));
        const after = this[type];
        this.updateDisplay();

        // Pulse animation on resource gain
        const boxId = type === 'gold' ? 'res-gold-box'
                    : type === 'food' ? 'res-food-box'
                    : type === 'diamond' ? 'res-diamond-box'
                    : type === 'goldenApple' ? 'res-golden-apple-box' : null;
        if (boxId) this._pulseBox(boxId, type, after >= capacity);
    },

    _pulseBox(boxId, type, isFull) {
        const box = document.getElementById(boxId);
        if (!box) return;
        const color = isFull
            ? '#f44336'
            : type === 'gold'    ? '#ffd700'
            : type === 'food'    ? '#a5d6a7'
            : type === 'diamond' ? '#90caf9'
            : '#dce775';
        // Remove existing animation class
        box.classList.remove('res-gain-pulse');
        void box.offsetWidth; // reflow
        box.style.setProperty('--pulse-color', color);
        box.classList.add('res-gain-pulse');
        setTimeout(() => box.classList.remove('res-gain-pulse'), 700);
    },

    promptFill(type) {
        if (type === 'diamond') return;
        const capacity = this.getCapacity(type);
        const current = this[type] || 0;
        const missing = capacity - current;
        if (missing <= 0) {
            Toast.show("Omboringiz to'la!", "info");
            return;
        }
        
        let diamondCost = 0;
        if (type === 'goldenApple') diamondCost = Math.ceil(missing / 10);
        else diamondCost = Math.ceil(missing / 100);
        
        if (this.diamond >= diamondCost) {
            this.diamond -= diamondCost;
            this[type] = capacity;
            this.updateDisplay();
            const typeNames = { gold: "Oltin", food: "Olma", goldenApple: "Olma Oltin" };
            Toast.show(`💎 ${typeNames[type]} ombori to'ldirildi! (-${diamondCost} olmos)`, 'success');
            AudioManager.playCoin();
        } else {
            Toast.show("Olmos yetarli emas!", "error");
        }
    },

    // Resursni olish (getter metodi)
    get(type) {
        return this[type] ?? 0;
    },

    // Resurs ayirish
    spend(type, amount) {
        if (this[type] >= amount) {
            this[type] -= amount;
            this.updateDisplay();
            return true;
        }
        return false;
    },

    // Yetarli resurs bormi?
    canAfford(costs) {
        for (const [type, amount] of Object.entries(costs)) {
            if ((this[type] || 0) < amount) return false;
        }
        return true;
    },

    // Bir nechta resursni birdan sarflash
    spendMultiple(costs) {
        if (!this.canAfford(costs)) return false;
        for (const [type, amount] of Object.entries(costs)) {
            this[type] -= amount;
        }
        this.updateDisplay();
        return true;
    },

    getMissingCostInDiamonds(costs) {
        let missingDiamonds = 0;
        for (const [type, amount] of Object.entries(costs)) {
            if (type === 'diamond') {
                if ((this[type] || 0) < amount) missingDiamonds += (amount - (this[type] || 0));
            } else {
                if ((this[type] || 0) < amount) {
                    const missing = amount - (this[type] || 0);
                    if (type === 'goldenApple') missingDiamonds += Math.ceil(missing / 10);
                    else missingDiamonds += Math.ceil(missing / 100); // 1 diamond for 100 gold/food
                }
            }
        }
        return missingDiamonds;
    },

    spendMissingWithDiamonds(costs, diamondCost) {
        for (const [type, amount] of Object.entries(costs)) {
            if (type !== 'diamond') {
                if (this[type] < amount) {
                    this[type] = 0;
                } else {
                    this[type] -= amount;
                }
            }
        }
        this.diamond -= diamondCost;
        this.updateDisplay();
        return true;
    },

    // HUD ni yangilash (smooth animation boshlaydi)
    updateDisplay(snap = false) {
        // Birinchi chaqiruvda yoki snap=true bo'lsa — hozirgi qiymatga snap
        if (snap || !this._dispInited) {
            this._dispInited = true;
            for (const k of ['gold', 'food', 'diamond', 'goldenApple']) {
                this._disp[k] = this[k] || 0;
            }
            this._updateDisplayDOM();
        }
        // Fill bars va overflow — hoziroq (raqamlar emas)
        this._updateFillBar('gold',        'res-gold-box',         '#d4af37', '#ffd700');
        this._updateFillBar('food',        'res-food-box',         '#43a047', '#76c442');
        this._updateFillBar('goldenApple', 'res-golden-apple-box', '#2e7d32', '#4caf50');
        this._updateOverflowWarning('gold', 'res-gold-box');
        this._updateOverflowWarning('food', 'res-food-box');

        // Olma Oltin qulfi
        const gaBox = document.getElementById('res-golden-apple-box');
        if (gaBox) {
            if (Game && Game.townHallLevel >= 7) {
                gaBox.classList.remove('res-locked');
                gaBox.title = 'Olma Oltin';
            } else {
                gaBox.classList.add('res-locked');
                gaBox.title = 'Town Hall 7da ochiladi';
            }
        }

        // Kubok
        const trophyEl = document.getElementById('trophy-count');
        if (trophyEl && typeof BattleSystem !== 'undefined') {
            trophyEl.textContent = BattleSystem.trophies;
        }

        // Smooth counter animatsiyasi
        this._animateDisplay();
    },

    // DOM ga hozirgi _disp qiymatlarini yozish
    _updateDisplayDOM() {
        const d = this._disp;
        const goldEl    = document.getElementById('res-gold');
        const foodEl    = document.getElementById('res-food');
        const diamondEl = document.getElementById('res-diamond');
        const gaEl      = document.getElementById('res-golden-apple');

        if (goldEl)    goldEl.textContent    = Helpers.formatNumber(Math.round(d.gold))    + ' / ' + Helpers.formatNumber(this.getCapacity('gold'));
        if (foodEl)    foodEl.textContent    = Helpers.formatNumber(Math.round(d.food))    + ' / ' + Helpers.formatNumber(this.getCapacity('food'));
        if (diamondEl) diamondEl.textContent = Helpers.formatNumber(Math.round(d.diamond));
        if (gaEl)      gaEl.textContent      = Helpers.formatNumber(Math.round(d.goldenApple)) + ' / ' + Helpers.formatNumber(this.getCapacity('goldenApple'));
    },

    _updateFillBar(type, boxId, color1, color2) {
        const box = document.getElementById(boxId);
        if (!box) return;
        const cap = this.getCapacity(type);
        const cur = this[type] || 0;
        const pct = cap > 0 ? Math.min(100, Math.round(cur / cap * 100)) : 0;

        let bar = box.querySelector('.res-fill-bar-inner');
        if (!bar) {
            // Create the bar wrapper + fill div on first call
            box.style.position = 'relative';
            box.style.overflow = 'hidden';
            const wrap = document.createElement('div');
            wrap.className = 'res-fill-bar';
            wrap.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:2px;background:rgba(255,255,255,0.06);';
            bar = document.createElement('div');
            bar.className = 'res-fill-bar-inner';
            bar.style.cssText = `height:100%;border-radius:0 1px 0 1px;transition:width 0.6s ease,background 0.4s;`;
            wrap.appendChild(bar);
            box.appendChild(wrap);
        }
        bar.style.width = pct + '%';
        const fillColor = pct >= 100 ? '#f44336' : pct >= 90 ? '#ff9800' : `linear-gradient(90deg,${color1},${color2})`;
        bar.style.background = fillColor;
    },

    _updateOverflowWarning(type, boxId) {
        const box = document.getElementById(boxId);
        if (!box) return;
        const cap = this.getCapacity(type);
        const cur = this[type] || 0;
        const ratio = cap > 0 ? cur / cap : 0;

        // Remove existing overflow indicators
        box.classList.remove('res-overflow-warn', 'res-overflow-full');
        const badge = box.querySelector('.res-overflow-badge');
        if (badge) badge.remove();

        if (ratio >= 1.0) {
            box.classList.add('res-overflow-full');
            // Add "FULL" badge
            const b = document.createElement('div');
            b.className = 'res-overflow-badge';
            b.textContent = 'FULL';
            b.style.cssText = `
                position:absolute;top:-5px;right:-5px;
                background:#f44336;color:#fff;font-size:7px;font-weight:900;
                padding:1px 4px;border-radius:3px;pointer-events:none;
                animation:res-pulse-badge 0.8s ease-in-out infinite alternate;
                letter-spacing:0.5px;z-index:10;
            `;
            box.style.position = 'relative';
            box.appendChild(b);
            // Toast (rate-limited per type)
            const now = Date.now();
            if (!this[`_fullToast_${type}`] || now - this[`_fullToast_${type}`] > 30000) {
                this[`_fullToast_${type}`] = now;
                const names = { gold: 'Oltin', food: 'Oziq-ovqat' };
                if (typeof Toast !== 'undefined') {
                    Toast.show(`💰 ${names[type] || type} ombori TO'LA! Askar yarating yoki hujum qiling.`, 'warn', 4000);
                }
            }
        } else if (ratio >= 0.9) {
            box.classList.add('res-overflow-warn');
        }
    },
};
