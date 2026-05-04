// ============================================
// RESURS TIZIMI
// 4 ta resurs: Oltin, Olma, Olmos, Olma Oltin
// ============================================

const Resources = {
    gold: 1000,
    food: 500,
    diamond: 999999,
    goldenApple: 0,

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
        const capacity = this.getCapacity(type);
        this[type] = Math.min(capacity, Math.max(0, (this[type] || 0) + amount));
        this.updateDisplay();
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
        
        const typeNames = { gold: "Oltin", food: "Olma", goldenApple: "Olma Oltin" };
        const ans = confirm(`${typeNames[type]} omborini to'ldirish uchun ${diamondCost} olmos kerak. Sotib olasizmi?`);
        if (ans) {
            if (this.diamond >= diamondCost) {
                this.diamond -= diamondCost;
                this[type] = capacity;
                this.updateDisplay();
                Toast.show(`${typeNames[type]} ombori to'ldirildi!`, 'success');
            } else {
                Toast.show("Olmos yetarli emas!", "error");
            }
        }
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

    // HUD ni yangilash
    updateDisplay() {
        const goldEl = document.getElementById('res-gold');
        const foodEl = document.getElementById('res-food');
        const diamondEl = document.getElementById('res-diamond');
        const gaEl = document.getElementById('res-golden-apple');

        if (goldEl) goldEl.textContent = Helpers.formatNumber(this.gold) + ' / ' + Helpers.formatNumber(this.getCapacity('gold'));
        if (foodEl) foodEl.textContent = Helpers.formatNumber(this.food) + ' / ' + Helpers.formatNumber(this.getCapacity('food'));
        if (diamondEl) diamondEl.textContent = Helpers.formatNumber(this.diamond);
        if (gaEl) gaEl.textContent = Helpers.formatNumber(this.goldenApple) + ' / ' + Helpers.formatNumber(this.getCapacity('goldenApple'));

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
    }
};
