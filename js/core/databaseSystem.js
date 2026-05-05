// ============================================
// DATABASE SYSTEM - "Online" bazalar va avtorizatsiya
// ============================================

const DatabaseSystem = {
    GLOBAL_KEY: 'totalConquest_global_db',
    CURRENT_USER_KEY: 'totalConquest_currentUser',
    
    users: {}, // id -> { id, name, age, trophies, level, baseLayout }
    currentUser: null,

    init() {
        this._loadDB();
        
        // Agar baza bo'sh bo'lsa, NPC "online" o'yinchilarni yaratish
        if (Object.keys(this.users).length === 0) {
            this._generateFakePlayers(50);
        }
    },

    _loadDB() {
        try {
            const raw = localStorage.getItem(this.GLOBAL_KEY);
            if (raw) {
                this.users = JSON.parse(raw);
            }
        } catch (e) {
            console.error("DB yuklashda xato:", e);
        }
    },

    _saveDB() {
        localStorage.setItem(this.GLOBAL_KEY, JSON.stringify(this.users));
    },

    // Joriy o'yinchini DB ga sinxronizatsiya qilish (SaveSystem chaqiradi)
    syncCurrentUser(baseData) {
        if (!this.currentUser) return;
        
        this.users[this.currentUser.id] = {
            id: this.currentUser.id,
            name: this.currentUser.name,
            age: this.currentUser.age,
            trophies: BattleSystem.trophies || 0,
            level: XPSystem.level || 1,
            baseLayout: baseData // Binolar va to'siqlar
        };
        this._saveDB();
    },

    // Ro'yxatdan o'tish
    register(age, name) {
        if (!age || isNaN(age) || age < 5) {
            return { success: false, msg: "Yoshni to'g'ri kiriting!" };
        }

        // Ism yo'q bo'lsa Askar001, Askar002 ...
        let finalName = name ? name.trim() : '';
        if (!finalName) {
            const count = Object.keys(this.users).length;
            finalName = 'Askar' + String(count + 1).padStart(3, '0');
        }

        const id = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        this.currentUser = { id, name: finalName, age };
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(this.currentUser));
        
        // Yangi o'yinchi uchun boshlang'ich ma'lumot
        this.users[id] = {
            id, name: finalName, age, trophies: 0, level: 1, baseLayout: null
        };
        this._saveDB();

        // SaveSystem ni yangi ID ga o'tkazish
        SaveSystem.setPlayerId(id);
        
        return { success: true };
    },

    // Tizimga kirish
    checkLogin() {
        const raw = localStorage.getItem(this.CURRENT_USER_KEY);
        if (raw) {
            this.currentUser = JSON.parse(raw);
            SaveSystem.setPlayerId(this.currentUser.id);
            return true;
        }
        return false;
    },

    logout(noReload) {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        this.currentUser = null;
        if (!noReload) location.reload();
    },

    // Multiplayer jang uchun mos dushmanni topish
    findMatch(myTrophies) {
        const ids = Object.keys(this.users).filter(id => id !== this.currentUser.id);
        if (ids.length === 0) return null;

        // Kubok bo'yicha eng yaqinlarini saralash
        ids.sort((a, b) => {
            const diffA = Math.abs(this.users[a].trophies - myTrophies);
            const diffB = Math.abs(this.users[b].trophies - myTrophies);
            return diffA - diffB;
        });

        // Top 5 tadan bittasini tasodifiy tanlash
        const candidates = ids.slice(0, 5);
        const selectedId = candidates[Math.floor(Math.random() * candidates.length)];
        
        return this.users[selectedId];
    },

    // Soxta "Online" o'yinchilarni yaratish
    _generateFakePlayers(count) {
        const prefixes = ['Qora', 'Buyuk', 'Temir', 'Yovvoyi', 'Sokin', 'Olovli'];
        const suffixes = ['Qilich', 'Qalqon', 'Bo\'ri', 'Burgut', 'Arslon', 'Legion'];
        
        for (let i = 0; i < count; i++) {
            const name = prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' + 
                         suffixes[Math.floor(Math.random() * suffixes.length)];
            const id = 'npc_' + i;
            const level = Math.floor(Math.random() * 10) + 1;
            const trophies = Math.floor(Math.random() * 2000);
            
            // Soxta baza yaratish (TH level ga mos)
            const baseLayout = this._createFakeBaseLayout(level);

            this.users[id] = {
                id, name, age: Math.floor(Math.random()*20)+10, trophies, level, baseLayout
            };
        }
        this._saveDB();
    },

    _createFakeBaseLayout(level) {
        // Bu metod faqat bino ma'lumotlarini (x,y,type,level) generatsiya qiladi.
        // Haqiqiy bazalar kabi mukammal bo'lmasa-da, jang qilishga yetarli.
        const buildings = [];
        const center = Math.floor(44 / 2); // Grid.SIZE = 44
        
        // Town Hall
        buildings.push({ type: 'cityHall', x: center-1, y: center-1, level: Math.min(10, level) });
        
        // Omborlar va iqtisod (atrofida)
        buildings.push({ type: 'goldStorage', x: center-3, y: center, level: Math.max(1, level-2) });
        buildings.push({ type: 'foodStorage', x: center+2, y: center, level: Math.max(1, level-2) });
        
        // Mudofaa
        const defCount = Math.min(10, level + 2);
        for(let i=0; i<defCount; i++) {
            const types = ['archerTower', 'scorpio', 'tormenta'];
            const t = types[Math.floor(Math.random() * Math.min(types.length, level))];
            
            const radius = 4 + Math.random() * 6;
            const angle = Math.random() * Math.PI * 2;
            const tx = Math.floor(center + Math.cos(angle) * radius);
            const ty = Math.floor(center + Math.sin(angle) * radius);
            
            buildings.push({ type: t, x: tx, y: ty, level: Math.max(1, level-3) });
        }
        
        // Devorlar (Town Hall atrofida)
        if (level >= 3) {
            for(let dx = -3; dx <= 3; dx++) {
                for(let dy = -3; dy <= 3; dy++) {
                    if (Math.abs(dx) === 3 || Math.abs(dy) === 3) {
                        buildings.push({ type: 'wall', x: center + dx, y: center + dy, level: Math.max(1, level-2) });
                    }
                }
            }
        }

        return JSON.stringify(buildings);
    }
};
