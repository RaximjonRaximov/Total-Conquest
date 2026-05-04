// ============================================
// ASKAR BOSHQARUVCHISI
// Kazarmada yaratish, armiya boshqarish
// ============================================

const TroopManager = {
    // O'yinchi armiyasi
    army: {},        // type -> count
    totalTroops: 0,
    maxTroops: 20,   // Yig'ilish Maydoni sig'imiga bog'liq

    // Kazarma navbatlari: { buildingId -> [ {type, timerId} ] }
    queues: {},

    // Armiyani yangilash (Yig'ilish Maydoni sig'imi)
    updateCapacity() {
        let cap = 20; // default
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'musterGround' && !b.building) {
                const bd = BUILDING_DATA.musterGround;
                const lv = bd.levels[b.level];
                if (lv && lv.capacity) cap = lv.capacity;
            }
        }
        this.maxTroops = cap;
    },

    // Jami askarlar soni
    getTotal() {
        let total = 0;
        for (const count of Object.values(this.army)) {
            total += count;
        }
        return total;
    },

    // Kazarma darajasiga qarab qaysi askarlar ochilgan
    getAvailableTroops(barracksLevel) {
        const available = [];
        for (const [type, data] of Object.entries(TROOP_DATA)) {
            if (data.unlockBarracks <= barracksLevel) {
                available.push({ type, ...data });
            }
        }
        return available;
    },

    // Eng yuqori kazarma darajasini topish
    getMaxBarracksLevel() {
        let max = 0;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'barracks' && !b.building && b.level > max) {
                max = b.level;
            }
        }
        return max;
    },

    // Askar yaratishni boshlash
    train(type, barracksId) {
        const data = TROOP_DATA[type];
        if (!data) return false;

        const b = BuildingManager.buildings[barracksId];
        if (!b || b.type !== 'barracks' || b.building) return false;

        // Kazarma darajasi yetarlimi?
        if (b.level < data.unlockBarracks) return false;

        // Sig'im tekshirish
        if (this.getTotal() + this.getQueueTotal() >= this.maxTroops) return false;

        // Narx tekshirish
        if (!Resources.canAfford(data.cost)) return false;
        Resources.spendMultiple(data.cost);

        // Navbatga qo'shish
        if (!this.queues[barracksId]) this.queues[barracksId] = [];

        const timerId = timerManager.add(
            data.time,
            () => {
                // Askar tayyor
                this.army[type] = (this.army[type] || 0) + 1;
                this.totalTroops = this.getTotal();

                // Navbatdan olib tashlash
                const queue = this.queues[barracksId];
                if (queue) {
                    const idx = queue.findIndex(q => q.timerId === timerId);
                    if (idx !== -1) queue.splice(idx, 1);
                }

                // Toast xabar
                Toast.show(`${data.icon} ${data.name} tayyor!`, 'success');
            },
            null,
            { troopType: type, barracksId: barracksId }
        );

        this.queues[barracksId].push({
            type: type,
            timerId: timerId
        });

        return true;
    },

    // Navbatdagi jami askarlar
    getQueueTotal() {
        let total = 0;
        for (const queue of Object.values(this.queues)) {
            total += queue.length;
        }
        return total;
    },

    // Kazarma navbatini olish
    getQueue(barracksId) {
        return this.queues[barracksId] || [];
    },

    // Navbatdagi askarni bekor qilish (oxirgisini)
    cancelLast(barracksId) {
        const queue = this.queues[barracksId];
        if (!queue || queue.length === 0) return false;

        const last = queue[queue.length - 1];
        const data = TROOP_DATA[last.type];

        // Timerdan o'chirish
        timerManager.cancel(last.timerId);
        queue.pop();

        // Narxning 50% ini qaytarish
        if (data.cost) {
            for (const [res, amt] of Object.entries(data.cost)) {
                Resources.add(res, Math.floor(amt * 0.5));
            }
        }

        return true;
    },

    // Askarni yo'qotish (jangda)
    loseTroop(type, count) {
        if (!this.army[type] || this.army[type] < count) return false;
        this.army[type] -= count;
        if (this.army[type] <= 0) delete this.army[type];
        this.totalTroops = this.getTotal();
        return true;
    }
};
