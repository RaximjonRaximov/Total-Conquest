// ============================================
// RESURS TIZIMI
// 4 ta resurs: Oltin, Olma, Olmos, Olma Oltin
// ============================================

const Resources = {
    gold: 1000,
    food: 500,
    diamond: 50,
    goldenApple: 0,

    // Resurs qo'shish
    add(type, amount) {
        this[type] = Math.max(0, (this[type] || 0) + amount);
        this.updateDisplay();
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

    // HUD ni yangilash
    updateDisplay() {
        const goldEl = document.getElementById('res-gold');
        const foodEl = document.getElementById('res-food');
        const diamondEl = document.getElementById('res-diamond');
        const gaEl = document.getElementById('res-golden-apple');

        if (goldEl) goldEl.textContent = Helpers.formatNumber(this.gold);
        if (foodEl) foodEl.textContent = Helpers.formatNumber(this.food);
        if (diamondEl) diamondEl.textContent = Helpers.formatNumber(this.diamond);
        if (gaEl) gaEl.textContent = Helpers.formatNumber(this.goldenApple);

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
