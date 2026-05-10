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

    // Oldingi jang armiyasi (Retrain Last Army uchun snapshot)
    _lastBattleArmy: {},

    // Sevimli armiya tarkiblari (max 3 slot)
    savedCompositions: [null, null, null],  // each: { name, troops: {type->count} } | null

    saveComposition(slot) {
        if (slot < 0 || slot > 2) return;
        const total = this.getTotal();
        if (total < 1) { if (typeof Toast !== 'undefined') Toast.show('Armiya bo\'sh!', 'warn'); return; }
        const name = `Tarkib ${slot + 1}`;
        this.savedCompositions[slot] = { name, troops: { ...this.army }, savedAt: Date.now() };
        if (typeof Toast !== 'undefined') Toast.show(`💾 ${name} saqlandi!`, 'success');
        if (typeof ArmyPanel !== 'undefined') ArmyPanel.render();
    },

    loadComposition(slot) {
        const comp = this.savedCompositions[slot];
        if (!comp) { if (typeof Toast !== 'undefined') Toast.show('Bu slot bo\'sh!', 'warn'); return; }
        // Train all troops from composition (add to queue)
        let queued = 0;
        for (const [type, count] of Object.entries(comp.troops)) {
            for (let i = 0; i < count; i++) {
                const barracks = Object.values(BuildingManager.buildings)
                    .find(b => b.type === 'barracks' && !b.building);
                if (!barracks) break;
                if (this.train(type, barracks.id, 1, true)) queued++;
            }
        }
        if (queued > 0) {
            if (typeof Toast !== 'undefined') Toast.show(`⚔️ ${comp.name}: ${queued} askar navbatga qo'shildi!`, 'success');
        } else {
            if (typeof Toast !== 'undefined') Toast.show('Kazarma yo\'q yoki sig\'im to\'lgan!', 'warn');
        }
    },

    // Armiyani yangilash (Yig'ilish Maydoni sig'imi)
    updateCapacity() {
        let cap = 20; // default
        let academyBonus = 0;
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'musterGround' && !b.building) {
                const bd = BUILDING_DATA.musterGround;
                const lv = bd.levels[b.level];
                if (lv && lv.capacity) cap = lv.capacity;
            }
            if (b.type === 'academy' && !b.building) {
                const bd = BUILDING_DATA.academy;
                const lv = bd.levels[b.level];
                if (lv?.troopCapacityBonus) academyBonus += lv.troopCapacityBonus;
            }
        }
        const prestigeBonus = typeof PrestigeSystem !== 'undefined' ? PrestigeSystem.getTroopCapBonus() : 0;
        this.maxTroops = cap + academyBonus + prestigeBonus;
    },

    // Jami ishlatilgan uy sig'imi (CoC-style: capacity hisobga olinadi)
    getTotal() {
        let total = 0;
        for (const [type, count] of Object.entries(this.army)) {
            const td = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[type] : null;
            const cap = td?.stats?.capacity || 1;
            total += count * cap;
        }
        return total;
    },

    // Faqat askar soni (capacity hisobsiz)
    getTroopCount() {
        let total = 0;
        for (const count of Object.values(this.army)) {
            total += count;
        }
        return total;
    },

    // Kazarma darajasiga qarab qaysi askarlar ochilgan
    // isHero=true bo'lgan askarlar kazarmada yaratilmaydi (haykal orqali ochiladi)
    getAvailableTroops(barracksLevel) {
        const available = [];
        for (const [type, data] of Object.entries(TROOP_DATA)) {
            if (data.isHero) continue; // Qahramonlar haykal orqali ochiladi
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

    // Kazarma slot sig'imini hisoblash (barracksLevel ga qarab)
    getBarracksSlots(barracksId) {
        const b = BuildingManager.buildings[barracksId];
        if (!b) return 5;
        const bd = BUILDING_DATA.barracks;
        const lv = bd?.levels[b.level];
        return lv?.troopSlots || b.level || 5;
    },

    // Askar yaratishni boshlash — BEPUL (faqat food/gold, olmossiz)
    // count: nechta askar navbatga qo'shilsin (default 1)
    // silent=true: toast xabarlarini ko'rsatmaslik (retrainLast spam oldini olish uchun)
    train(type, barracksId, count, silent) {
        count = count || 1;
        const data = TROOP_DATA[type];
        if (!data) return false;

        // Qahramonlar kazarmada yaratilmaydi — haykal orqali ochiladi
        if (data.isHero) {
            if (!silent) Toast.show('Qahramonlar kazarmada yaratilmaydi!', 'warning');
            return false;
        }

        const b = BuildingManager.buildings[barracksId];
        if (!b || b.type !== 'barracks' || b.building) return false;

        // Kazarma darajasi yetarlimi?
        if (b.level < data.unlockBarracks) return false;

        // Kazarma slot sig'imi
        const maxSlots = this.getBarracksSlots(barracksId);
        if (!this.queues[barracksId]) this.queues[barracksId] = [];
        if (this.queues[barracksId].length >= maxSlots) {
            if (!silent) Toast.show(`Kazarma navbati to'lgan! (max ${maxSlots} slot)`, 'warning');
            return false;
        }

        // Armiya sig'im tekshirish (capacity-weighted)
        const troopCap = data.stats?.capacity || 1;
        if (this.getTotal() + this.getQueueTotal() + troopCap > this.maxTroops) {
            if (!silent) Toast.show(`Armiya sig'imi to'lgan! (${this.getTotal() + this.getQueueTotal()}/${this.maxTroops})`, "warning");
            return false;
        }

        // Narx tekshirish — FAQAT food/gold, olmossiz
        if (!Resources.canAfford(data.cost)) {
            if (!silent) {
                const missing = [];
                for (const [res, amt] of Object.entries(data.cost)) {
                    const have = Resources[res] || 0;
                    if (have < amt) {
                        const icons = { gold: '🪙', food: '🍎' };
                        missing.push(`${icons[res] || res}${amt - have}`);
                    }
                }
                Toast.show(`Resurs yetarli emas: ${missing.join(', ')}`, 'error');
            }
            return false;
        }

        Resources.spendMultiple(data.cost);

        // Navbatga qo'shish
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

    // Ommaviy askar yaratish — bir martada bir nechta navbatga qo'shish
    trainBulk(type, barracksId, count) {
        let trained = 0;
        for (let i = 0; i < count; i++) {
            // i>0 da silent=true: faqat birinchi muvaffaqiyatsizlikda toast ko'rsatiladi
            if (this.train(type, barracksId, 1, i > 0)) {
                trained++;
            } else {
                break;
            }
        }
        return trained;
    },

    // Olmoslar bilan navbatdagi barcha askarlarni darhol tayyor qilish
    instantTrain(barracksId, count) {
        const queue = this.queues[barracksId];
        if (!queue || queue.length === 0) {
            Toast.show('Navbatda askar yo\'q!', 'warning');
            return false;
        }

        const toInstant = count ? Math.min(count, queue.length) : queue.length;

        // Olmoslar narxini hisoblash (har navbatdagi askar uchun)
        let totalGemCost = 0;
        for (let i = 0; i < toInstant; i++) {
            const rem = i === 0
                ? (timerManager.getRemaining(queue[i].timerId) || queue[i].duration || 0)
                : (queue[i].duration || 0);
            totalGemCost += Helpers.calcGemCost(rem);
        }

        if (totalGemCost < 1) totalGemCost = 1;

        if (typeof GemConfirm !== 'undefined') {
            GemConfirm.show({
                gemCost: totalGemCost,
                title: `${toInstant} askarni darhol tayyorlash`,
                icon: TROOP_DATA[queue[0].type]?.icon || '⚔️',
                timeLabel: `${toInstant} askar darhol tayyor bo'ladi`,
                onConfirm: () => {
                    if (!Resources.spend('diamond', totalGemCost)) {
                        Toast.show('Olmos yetarli emas!', 'error');
                        return;
                    }
                    this._finishInstant(barracksId, toInstant);
                    Toast.show(`💎 ${toInstant} askar darhol tayyor!`, 'success');
                    if (typeof ArmyPanel !== 'undefined') ArmyPanel.render();
                }
            });
        } else {
            if (!Resources.spend('diamond', totalGemCost)) {
                Toast.show('Olmos yetarli emas!', 'error');
                return false;
            }
            this._finishInstant(barracksId, toInstant);
            Toast.show(`💎 ${toInstant} askar darhol tayyor!`, 'success');
            if (typeof ArmyPanel !== 'undefined') ArmyPanel.render();
        }
        return true;
    },

    // Navbatdagi N ta askarni darhol armiyaga qo'shish (instant logikasi)
    _finishInstant(barracksId, count) {
        const queue = this.queues[barracksId];
        if (!queue) return;
        const toFinish = Math.min(count, queue.length);
        for (let i = 0; i < toFinish; i++) {
            const item = queue[0];
            if (!item) break;
            const data = TROOP_DATA[item.type];
            if (item.timerId !== null) {
                timerManager.cancel(item.timerId);
            }
            this.army[item.type] = (this.army[item.type] || 0) + 1;
            this.totalTroops = this.getTotal();
            queue.shift();
            if (typeof DailyMissions !== 'undefined') DailyMissions.track('train', 1);
            if (typeof AchievementSystem !== 'undefined') AchievementSystem.track('troopsTotal');
        }
        this.totalTroops = this.getTotal();
        // Navbatda qolganlar bo'lsa, davom ettirish
        if (queue.length > 0) {
            this._startTraining(barracksId, 0);
        }
    },

    // Navbatdagi ma'lum bir askarni tayyorlashni boshlash
    _startTraining(barracksId, index) {
        const queue = this.queues[barracksId];
        if (!queue || !queue[index]) return;

        const item = queue[index];
        const data = TROOP_DATA[item.type];

        // Agar offline restore uchun override vaqt berilgan bo'lsa — shu vaqtni ishlatamiz
        let trainTime;
        if (item._overrideTime) {
            trainTime = item._overrideTime;
            delete item._overrideTime; // bir marta ishlatiladi
        } else {
            trainTime = data.time;
            // Academy training speed bonus
            let academySpeedBonus = 0;
            for (const b of Object.values(BuildingManager.buildings)) {
                if (b.type === 'academy' && !b.building) {
                    const bd = BUILDING_DATA.academy;
                    const lv = bd.levels[b.level];
                    if (lv?.trainingSpeedBonus) academySpeedBonus += lv.trainingSpeedBonus;
                }
            }
            if (academySpeedBonus > 0) {
                trainTime = Math.max(5, Math.floor(trainTime * (1 - Math.min(academySpeedBonus, 0.5))));
            }

            // Research train time bonus (e.g. -10% from research)
            if (typeof ResearchSystem !== 'undefined') {
                const rb = ResearchSystem.getTroopBonus(item.type);
                if (rb.trainTime < 0) {
                    trainTime = Math.max(5, Math.floor(trainTime * (1 + rb.trainTime)));
                }
            }

            // Shop training speed boost (2x)
            if (TroopManager._boostUntil && TroopManager._boostUntil > Date.now()) {
                trainTime = Math.max(3, Math.floor(trainTime / 2));
            } else if (TroopManager._boostUntil && TroopManager._boostUntil <= Date.now()) {
                TroopManager._boostUntil = 0;
            }
            // Magic Item: Training Potion (10x tezlashuv)
            if (typeof MagicItems !== 'undefined' && MagicItems.isTrainingPotionActive()) {
                trainTime = Math.max(1, Math.floor(trainTime / 10));
            }
        }

        item.timerId = timerManager.add(
            trainTime,
            () => {
                // Askar tayyor
                this.army[item.type] = (this.army[item.type] || 0) + 1;
                this.totalTroops = this.getTotal();
                Toast.show(`${data.icon} ${data.name} tayyor!`, 'success');
                if (typeof DailyMissions !== 'undefined') DailyMissions.track('train', 1);
                if (typeof AchievementSystem !== 'undefined') {
                    AchievementSystem.track('troopsTotal');
                }

                // Kazarma ustida "Tayyor!" animatsiyasi
                this._showTroopReadyPop(barracksId, data);

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

    // Kazarma ustida tayyor animatsiya (DOM)
    _showTroopReadyPop(barracksId, troopData) {
        try {
            const b = BuildingManager.buildings[barracksId];
            if (!b || typeof BuildingRenderer === 'undefined' || typeof Camera === 'undefined') return;
            const bd = BUILDING_DATA[b.type];
            if (!bd) return;
            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);

            const pop = document.createElement('div');
            pop.style.cssText = `
                position:fixed;
                left:${fp.cx}px; top:${fp.top.y - 20}px;
                transform:translate(-50%,-50%);
                font-size:20px;
                pointer-events:none;
                z-index:9000;
                animation:troopReadyPop 1.4s ease-out forwards;
                text-shadow:0 2px 8px rgba(0,0,0,0.8);
            `;
            pop.textContent = troopData.icon + ' ✓';
            document.body.appendChild(pop);
            setTimeout(() => pop.remove(), 1500);
        } catch (e) { /* silent */ }
    },

    // Navbatdagi jami askarlar
    // Navbatdagi askarlarning uy sig'imi (CoC-style)
    getQueueTotal() {
        let total = 0;
        for (const queue of Object.values(this.queues)) {
            for (const item of queue) {
                const td = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[item.type] : null;
                total += td?.stats?.capacity || 1;
            }
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
        return this.cancelAt(barracksId, queue.length - 1);
    },

    // Navbatdagi muayyan indeksdagi askarni bekor qilish
    cancelAt(barracksId, index) {
        const queue = this.queues[barracksId];
        if (!queue || index < 0 || index >= queue.length) return false;

        const item = queue[index];
        const data = TROOP_DATA[item.type];

        if (index === 0 && item.timerId !== null) {
            timerManager.cancel(item.timerId);
            queue.shift();
            if (queue.length > 0) this._startTraining(barracksId, 0);
        } else {
            queue.splice(index, 1);
        }

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
    },

    // ── Retrain Last Army — CoC-style bir klik bilan qayta o'qitish ───────────
    // Oldingi jangda olib ketilgan tarkibni kazarmaga navbatga qo'shadi.
    // Kazarma sig'mi yetarli bo'lmasa — imkoni boricha qo'shadi.
    retrainLast() {
        const army = this._lastBattleArmy;
        if (!army || Object.keys(army).length === 0) {
            if (typeof Toast !== 'undefined') Toast.show('O\'tgan jang armiyasi yo\'q!', 'warn');
            return 0;
        }

        const barracks = Object.values(BuildingManager.buildings)
            .filter(b => b.type === 'barracks' && !b.building);
        if (barracks.length === 0) {
            if (typeof Toast !== 'undefined') Toast.show('Faol kazarma yo\'q!', 'error');
            return 0;
        }

        let queued = 0;
        let bIdx   = 0; // round-robin distribution across barracks
        for (const [type, count] of Object.entries(army)) {
            if (type.startsWith('_') || count <= 0) continue;
            const data = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[type] : null;
            if (!data || data.isHero) continue;
            for (let i = 0; i < count; i++) {
                // Round-robin: teng taqsimlash
                const b = barracks[bIdx % barracks.length];
                bIdx++;
                if (this.train(type, b.id, 1, true)) {
                    queued++;
                } else {
                    // Sig'im to'ldi — navbat qo'shishni to'xtatamiz
                    break;
                }
            }
        }

        if (queued > 0) {
            if (typeof Toast !== 'undefined') Toast.show(`⚡ ${queued} askar qayta o'qitmoqda!`, 'success');
            if (typeof ArmyPanel !== 'undefined' && ArmyPanel.visible) ArmyPanel.render();
        } else {
            if (typeof Toast !== 'undefined') Toast.show('Kazarma sig\'im to\'lgan yoki noma\'lum xato!', 'warn');
        }
        return queued;
    },

    // Training navbatlarini saqlash uchun serialize (offline restart)
    serializeQueues() {
        const result = {};
        for (const [barracksId, queue] of Object.entries(this.queues)) {
            if (!queue || queue.length === 0) continue;
            const saved = [];
            for (let i = 0; i < queue.length; i++) {
                const item = queue[i];
                const remaining = (i === 0 && item.timerId)
                    ? timerManager.getRemaining(item.timerId) : item.duration;
                saved.push({
                    type: item.type,
                    duration: item.duration,
                    remaining: remaining // faqat birinchi element uchun actual remaining
                });
            }
            result[barracksId] = saved;
        }
        return result;
    },

    // Training navbatlarini yuklash (offline restart)
    // Offline da tugagan askarlar darhol army ga qo'shiladi,
    // hali tugamagan birinchi askar uchun _overrideTime ishlatiladi
    restoreQueues(savedQueues, offlineSec) {
        if (!savedQueues) return;
        for (const [barracksId, savedQueue] of Object.entries(savedQueues)) {
            const b = BuildingManager.buildings[barracksId];
            if (!b || b.type !== 'barracks' || b.building) continue;
            if (!savedQueue || savedQueue.length === 0) continue;

            this.queues[barracksId] = [];
            let remainingOffline = offlineSec; // sarflanmagan offline vaqt
            let queueStarted    = false;

            for (let i = 0; i < savedQueue.length; i++) {
                const saved = savedQueue[i];
                const data  = TROOP_DATA[saved.type];
                if (!data || data.isHero) continue;

                // i===0 uchun actual remaining, boshqalar uchun to'liq duration
                const itemTime = (i === 0)
                    ? (saved.remaining != null ? saved.remaining : saved.duration)
                    : (saved.duration || data.time);

                if (remainingOffline >= itemTime) {
                    // Bu askar offline da tugagan — darhol army ga qo'sh
                    remainingOffline -= itemTime;
                    this.army[saved.type] = (this.army[saved.type] || 0) + 1;
                    this.totalTroops = this.getTotal();
                    if (typeof Toast !== 'undefined') {
                        Toast.show(`${data.icon} ${data.name} offline tayyor!`, 'info', 1500);
                    }
                } else {
                    // Bu askar hali tayyor emas
                    const actualRemaining = Math.max(5, itemTime - remainingOffline);
                    remainingOffline = 0;

                    const newItem = {
                        type: saved.type,
                        timerId: null,
                        startTime: Date.now(),
                        duration: saved.duration || data.time,
                        _overrideTime: actualRemaining // _startTraining shu vaqtni ishlatadi
                    };
                    this.queues[barracksId].push(newItem);
                    if (!queueStarted) {
                        queueStarted = true;
                        this._startTraining(barracksId, 0);
                    }
                    // Qolgan elementlarni oddiy qo'sh (full duration)
                    for (let j = i + 1; j < savedQueue.length; j++) {
                        const sv2  = savedQueue[j];
                        const dt2  = TROOP_DATA[sv2.type];
                        if (!dt2 || dt2.isHero) continue;
                        this.queues[barracksId].push({
                            type: sv2.type,
                            timerId: null,
                            startTime: Date.now(),
                            duration: sv2.duration || dt2.time
                        });
                    }
                    break;
                }
            }
        }
    }
};
