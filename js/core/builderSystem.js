// ============================================
// QURUVCHI TIZIMI (Builder System)
// CoC dek — cheklangan quruvchilar
// ============================================

const BuilderSystem = {
    totalBuilders: 1,    // Bepul 1 ta
    busyBuilders: 0,     // Band quruvchilar

    // 2-quruvchi narxi: 250 olmos, 3-quruvchi: 500 va hokazo
    builderCosts: [0, 0, 250, 500, 1000, 2000],

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
        Toast.show(`👷 Yangi quruvchi sotib olindi! (${this.totalBuilders} ta)`, 'reward');
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
        }
    }
};
