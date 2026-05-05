// ============================================
// ALLIANCE SYSTEM - Ittifoq (Klan) Tizimi
// ============================================

const ALLIANCES = [
    { id: 'a1', name: 'SPQR', level: 10, members: 49, minTrophies: 1000, description: 'Senatus Populusque Romanus' },
    { id: 'a2', name: 'Legion IX', level: 8, members: 35, minTrophies: 500, description: 'Sodiq legionerlar uchun' },
    { id: 'a3', name: 'Gladiators', level: 5, members: 20, minTrophies: 0, description: 'Yangi boshlaganlar xush kelibsiz' },
    { id: 'a4', name: 'Caesar\'s Guard', level: 15, members: 50, minTrophies: 2000, description: 'Eng kuchli rimliklar bu yerda' }
];

const AllianceSystem = {
    currentAlliance: null,
    lastRequestTime: 0,
    requestCooldown: 300 * 1000, // 5 minut
    
    // Save/Load uchun
    serialize() {
        return {
            currentAlliance: this.currentAlliance,
            lastRequestTime: this.lastRequestTime
        };
    },
    
    deserialize(data) {
        if (!data) return;
        this.currentAlliance = data.currentAlliance;
        this.lastRequestTime = data.lastRequestTime;
    },

    join(allianceId) {
        if (this.currentAlliance) {
            Toast.show("Siz allaqachon ittifoqdasiz!", "error");
            return false;
        }

        const alliance = ALLIANCES.find(a => a.id === allianceId);
        if (!alliance) return false;

        if (BattleSystem.trophies < alliance.minTrophies) {
            Toast.show(`Sizga ${alliance.minTrophies} kubok kerak!`, "warning");
            return false;
        }

        if (alliance.members >= 50) {
            Toast.show("Bu ittifoq to'la!", "error");
            return false;
        }

        this.currentAlliance = allianceId;
        Toast.show(`🤝 ${alliance.name} ittifoqiga qo'shildingiz!`, "success");
        AudioManager.playClick();
        return true;
    },

    leave() {
        if (!this.currentAlliance) return;
        const ans = confirm("Haqiqatan ham ittifoqni tark etmoqchimisiz?");
        if (ans) {
            this.currentAlliance = null;
            Toast.show("Ittifoqdan chiqdingiz.", "warning");
            AudioManager.playClick();
            return true;
        }
        return false;
    },

    requestTroops() {
        if (!this.currentAlliance) {
            Toast.show("Avval ittifoqqa qo'shiling!", "warning");
            return false;
        }

        // Ittifoq binosini tekshirish (Legion Forum)
        const forumExists = Object.values(BuildingManager.buildings).some(b => b.type === 'legionForum');
        if (!forumExists) {
            Toast.show("Askarlarni saqlash uchun Legion Forum binosini quring!", "warning");
            return false;
        }

        const now = Date.now();
        if (now - this.lastRequestTime < this.requestCooldown) {
            const rem = Math.ceil((this.requestCooldown - (now - this.lastRequestTime)) / 1000);
            Toast.show(`Kuting: ${Helpers.formatTime(rem)}`, "warning");
            return false;
        }

        this.lastRequestTime = now;
        Toast.show("🛡️ Askarlar so'raldi! Ular tez orada yetib keladi...", "info");
        AudioManager.playClick();

        // 5 soniyadan keyin "dostlar" askar beradi
        setTimeout(() => {
            if (!this.currentAlliance) return; // agar chiqib ketgan bo'lsa
            const troopTypes = ['legionnaire', 'archer', 'praetorian'];
            const randomType = troopTypes[Math.floor(Math.random() * troopTypes.length)];
            const amount = Math.floor(Math.random() * 5) + 3; // 3-7 askar
            
            // Askar qo'shish (sig'im tekshiruvisiz do'stona yordam sifatida)
            TroopManager.army[randomType] = (TroopManager.army[randomType] || 0) + amount;
            TroopManager.totalTroops = TroopManager.getTotal();
            
            const td = TROOP_DATA[randomType];
            Toast.show(`🎁 Ittifoqdoshlar sizga ${amount} ta ${td.name} yubordi!`, "success");
            AudioManager.playCoin();
        }, 5000);

        return true;
    },

    getCurrentData() {
        if (!this.currentAlliance) return null;
        return ALLIANCES.find(a => a.id === this.currentAlliance);
    }
};
