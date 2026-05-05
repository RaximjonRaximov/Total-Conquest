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

        // Sig'im tekshirish (jami armiya + barcha navbatlar)
        if (this.getTotal() + this.getQueueTotal() >= this.maxTroops) {
            Toast.show("Armiya sig'imi to'lgan!", "warning");
            return false;
        }

        // Narx tekshirish
        if (!Resources.canAfford(data.cost)) {
            const missingDiamonds = Resources.getMissingCostInDiamonds(data.cost);
            if (Resources.diamond >= missingDiamonds) {
                Resources.spendMissingWithDiamonds(data.cost, missingDiamonds);
                Toast.show(`💎 ${missingDiamonds} olmos ishlatildi`, 'info');
            } else {
                Toast.show("Resurs va olmos yetarli emas!", "error");
                return false;
            }
        } else {
            Resources.spendMultiple(data.cost);
        }

        // Navbatga qo'shish
        if (!this.queues[barracksId]) this.queues[barracksId] = [];
        
        const isQueueEmpty = this.queues[barracksId].length === 0;

        const newItem = {
            type: type,
            timerId: null,
            startTime: Date.now(),
            duration: data.time
        };

        this.queues[barracksId].push(newItem);

        // Agar navbat bo'sh bo'lgan bo'lsa, darhol boshlaymiz
        if (isQueueEmpty) {
            this._startTraining(barracksId, 0);
        }

        return true;
    },

    // Navbatdagi ma'lum bir askarni tayyorlashni boshlash
    _startTraining(barracksId, index) {
        const queue = this.queues[barracksId];
        if (!queue || !queue[index]) return;

        const item = queue[index];
        const data = TROOP_DATA[item.type];

        item.timerId = timerManager.add(
            data.time,
            () => {
                // Askar tayyor
                this.army[item.type] = (this.army[item.type] || 0) + 1;
                this.totalTroops = this.getTotal();
                Toast.show(`${data.icon} ${data.name} tayyor!`, 'success');

                // Navbatdan o'chirish (birinchi elementni)
                queue.shift();

                // Keyingisini boshlash
                if (queue.length > 0) {
                    this._startTraining(barracksId, 0);
                }
            },
            null,
            { troopType: item.type, barracksId: barracksId }
        );
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

        // Oxirgi qo'shilgan askarni topamiz
        const lastIdx = queue.length - 1;
        const item = queue[lastIdx];
        const data = TROOP_DATA[item.type];

        // Agar bu birinchi (hozir o'zi o'qiyotgan) bo'lsa
        if (lastIdx === 0 && item.timerId !== null) {
            timerManager.cancel(item.timerId);
            queue.shift();
            // Keyingisini boshlash (agar bo'lsa)
            if (queue.length > 0) {
                this._startTraining(barracksId, 0);
            }
        } else {
            // Agar u shunchaki navbatda turgan bo'lsa
            queue.splice(lastIdx, 1);
        }

        // Narxni qaytarish (100% qaytarish yaxshiroq foydalanuvchi uchun)
        if (data.cost) {
            for (const [res, amt] of Object.entries(data.cost)) {
                Resources.add(res, amt);
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
