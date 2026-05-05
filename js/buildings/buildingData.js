// ============================================
// BINOLAR MA'LUMOTLARI
// Har bir bino turi: narx, vaqt, o'lcham, TH talabi
// ============================================

const BUILDING_DATA = {
    // ===== MARKAZ =====
    cityHall: {
        name: 'Shahar Markazi',
        icon: '🏛️',
        category: 'markaz',
        size: [3, 3],
        maxCount: 1,
        minimapColor: '#ffd700',
        imageScale: 1.0,
        imageOffsetY: 0,
        levels: {
            1: { cost: {}, time: 0, hp: 500 },
            2: { cost: { gold: 1000 }, time: 300, hp: 800 },
            3: { cost: { gold: 10000 }, time: 3600, hp: 1200 },
            4: { cost: { gold: 75000 }, time: 28800, hp: 1800 },
            5: { cost: { gold: 250000 }, time: 86400, hp: 2500 },
            6: { cost: { gold: 500000 }, time: 172800, hp: 3500 },
            7: { cost: { gold: 1200000 }, time: 259200, hp: 5000 },
            8: { cost: { gold: 3000000 }, time: 432000, hp: 7000 },
            9: { cost: { gold: 5000000 }, time: 518400, hp: 9000 },
            10: { cost: { gold: 8000000 }, time: 691200, hp: 12000 }
        },
        description: 'Shaharning markazi. Darajasi oshganda yangi binolar ochiladi.'
    },

    // ===== IQTISOD =====
    villa: {
        name: 'Villa',
        icon: '🏠',
        category: 'iqtisod',
        size: [2, 2],
        maxCount: 7,
        minimapColor: '#ffc107',
        thRequired: 1,
        levels: {
            1: { cost: { food: 100 }, time: 30, hp: 200, production: 5, capacity: 250 },
            2: { cost: { food: 300 }, time: 120, hp: 300, production: 10, capacity: 600 },
            3: { cost: { food: 800 }, time: 600, hp: 450, production: 18, capacity: 1500 },
            4: { cost: { food: 2000 }, time: 1800, hp: 600, production: 30, capacity: 3000 },
            5: { cost: { food: 5000 }, time: 3600, hp: 800, production: 50, capacity: 6000 }
        },
        description: 'Oltin ishlab chiqaradi.'
    },

    goldStorage: {
        name: 'Oltin Ombori',
        icon: '🏦',
        category: 'iqtisod',
        size: [2, 2],
        maxCount: 4,
        minimapColor: '#ff9800',
        thRequired: 1,
        levels: {
            1: { cost: { food: 200 }, time: 60, hp: 300, capacity: 5000 },
            2: { cost: { food: 500 }, time: 300, hp: 450, capacity: 12000 },
            3: { cost: { food: 1500 }, time: 900, hp: 600, capacity: 30000 },
            4: { cost: { food: 4000 }, time: 3600, hp: 800, capacity: 75000 },
            5: { cost: { food: 10000 }, time: 7200, hp: 1000, capacity: 150000 }
        },
        description: 'Oltin saqlaydi. Sig\'imi oshadi.'
    },

    farm: {
        name: 'Ferma',
        icon: '🌾',
        category: 'iqtisod',
        size: [2, 2],
        maxCount: 7,
        minimapColor: '#8bc34a',
        thRequired: 1,
        levels: {
            1: { cost: { gold: 100 }, time: 30, hp: 200, production: 5, capacity: 250 },
            2: { cost: { gold: 300 }, time: 120, hp: 300, production: 10, capacity: 600 },
            3: { cost: { gold: 800 }, time: 600, hp: 450, production: 18, capacity: 1500 },
            4: { cost: { gold: 2000 }, time: 1800, hp: 600, production: 30, capacity: 3000 },
            5: { cost: { gold: 5000 }, time: 3600, hp: 800, production: 50, capacity: 6000 }
        },
        description: 'Olma (oziq-ovqat) ishlab chiqaradi.'
    },

    foodStorage: {
        name: 'Olma Ombori',
        icon: '🍎',
        category: 'iqtisod',
        size: [2, 2],
        maxCount: 4,
        minimapColor: '#f44336',
        thRequired: 1,
        levels: {
            1: { cost: { gold: 200 }, time: 60, hp: 300, capacity: 5000 },
            2: { cost: { gold: 500 }, time: 300, hp: 450, capacity: 12000 },
            3: { cost: { gold: 1500 }, time: 900, hp: 600, capacity: 30000 },
            4: { cost: { gold: 4000 }, time: 3600, hp: 800, capacity: 75000 },
            5: { cost: { gold: 10000 }, time: 7200, hp: 1000, capacity: 150000 }
        },
        description: 'Olmalarni saqlaydi.'
    },

    treeOfLife: {
        name: 'Hayot Daraxti',
        icon: '🌳',
        category: 'iqtisod',
        size: [2, 2],
        maxCount: 3,
        minimapColor: '#4caf50',
        thRequired: 7,
        levels: {
            1: { cost: { gold: 500000 }, time: 7200, hp: 400, production: 2, capacity: 100 },
            2: { cost: { gold: 1000000 }, time: 14400, hp: 600, production: 4, capacity: 300 },
            3: { cost: { gold: 2000000 }, time: 28800, hp: 800, production: 7, capacity: 600 }
        },
        description: 'Olma Oltin ishlab chiqaradi. TH7 da ochiladi.'
    },

    goldenAppleStorage: {
        name: 'Olma Oltin Ombori',
        icon: '🍏',
        category: 'iqtisod',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#cddc39',
        thRequired: 7,
        levels: {
            1: { cost: { gold: 300000 }, time: 3600, hp: 400, capacity: 500 },
            2: { cost: { gold: 800000 }, time: 7200, hp: 600, capacity: 1500 },
            3: { cost: { gold: 1500000 }, time: 14400, hp: 800, capacity: 5000 }
        },
        description: 'Olma Oltinni saqlaydi. TH7 da ochiladi.'
    },

    // ===== HARBIY =====
    barracks: {
        name: 'Kazarma',
        icon: '⚔️',
        category: 'harbiy',
        size: [3, 3],
        maxCount: 3,
        minimapColor: '#e91e63',
        thRequired: 1,
        levels: {
            1: { cost: { gold: 500 }, time: 60, hp: 350 },
            2: { cost: { gold: 2000 }, time: 600, hp: 500 },
            3: { cost: { gold: 8000 }, time: 3600, hp: 700 },
            4: { cost: { gold: 30000 }, time: 14400, hp: 950 },
            5: { cost: { gold: 100000 }, time: 43200, hp: 1200 }
        },
        description: 'Askarlar yaratiladi.'
    },

    musterGround: {
        name: 'Yig\'ilish Maydoni',
        icon: '🏕️',
        category: 'harbiy',
        size: [3, 3],
        maxCount: 1,
        minimapColor: '#9c27b0',
        thRequired: 2,
        levels: {
            1: { cost: { gold: 800 }, time: 120, hp: 300, capacity: 20 },
            2: { cost: { gold: 3000 }, time: 900, hp: 450, capacity: 35 },
            3: { cost: { gold: 12000 }, time: 3600, hp: 650, capacity: 50 },
            4: { cost: { gold: 50000 }, time: 14400, hp: 900, capacity: 75 },
            5: { cost: { gold: 200000 }, time: 43200, hp: 1200, capacity: 100 }
        },
        description: 'Askarlarni saqlaydi va jangga yuboradi.'
    },

    blacksmith: {
        name: 'Temirchi',
        icon: '🔨',
        category: 'harbiy',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#795548',
        thRequired: 5,
        levels: {
            1: { cost: { gold: 50000 }, time: 3600, hp: 400 },
            2: { cost: { gold: 150000 }, time: 14400, hp: 600 },
            3: { cost: { gold: 500000 }, time: 43200, hp: 800 }
        },
        description: 'Askarlarni kuchaytirish ilmlarini o\'rganadi.'
    },

    legionForum: {
        name: 'Legion Forumi',
        icon: '🏟️',
        category: 'harbiy',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#3f51b5',
        thRequired: 4,
        levels: {
            1: { cost: { gold: 20000 }, time: 1800, hp: 350 },
            2: { cost: { gold: 80000 }, time: 7200, hp: 500 },
            3: { cost: { gold: 250000 }, time: 28800, hp: 700 }
        },
        description: 'Ittifoqga qo\'shilish va yordam so\'rash.'
    },

    // ===== MUDOFAA =====
    wall: {
        name: 'Devor',
        icon: '🧱',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 100,
        minimapColor: '#9e9e9e',
        thRequired: 3,
        levels: {
            1: { cost: { gold: 200 }, time: 10, hp: 500 },
            2: { cost: { gold: 1000 }, time: 30, hp: 1000 },
            3: { cost: { gold: 5000 }, time: 120, hp: 2000 },
            4: { cost: { gold: 20000 }, time: 600, hp: 4000 },
            5: { cost: { gold: 80000 }, time: 1800, hp: 7000 }
        },
        description: 'Dushman yo\'lini to\'sadi.'
    },

    gate: {
        name: 'Darvoza',
        icon: '🚪',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 8,
        minimapColor: '#607d8b',
        thRequired: 3,
        levels: {
            1: { cost: { gold: 500 }, time: 15, hp: 600 },
            2: { cost: { gold: 2000 }, time: 60, hp: 1200 },
            3: { cost: { gold: 8000 }, time: 300, hp: 2500 }
        },
        description: 'O\'z askarlaring o\'tadi, dushmanga to\'siq.'
    },

    archerTower: {
        name: 'Kamonchi Minorasi',
        icon: '🏹',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 6,
        minimapColor: '#ff5722',
        thRequired: 3,
        levels: {
            1: { cost: { gold: 1000 }, time: 60, hp: 300, damage: 10, range: 5 },
            2: { cost: { gold: 4000 }, time: 300, hp: 450, damage: 18, range: 5 },
            3: { cost: { gold: 15000 }, time: 1800, hp: 650, damage: 30, range: 6 },
            4: { cost: { gold: 50000 }, time: 7200, hp: 900, damage: 48, range: 6 },
            5: { cost: { gold: 150000 }, time: 28800, hp: 1200, damage: 70, range: 7 }
        },
        description: 'Dushmanga o\'q otadi.'
    },

    scorpio: {
        name: 'Scorpio',
        icon: '🦂',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 4,
        minimapColor: '#ff9800',
        thRequired: 4,
        levels: {
            1: { cost: { gold: 5000 }, time: 300, hp: 400, damage: 25, range: 6 },
            2: { cost: { gold: 20000 }, time: 1800, hp: 600, damage: 45, range: 6 },
            3: { cost: { gold: 80000 }, time: 7200, hp: 850, damage: 70, range: 7 },
            4: { cost: { gold: 300000 }, time: 28800, hp: 1100, damage: 100, range: 7 }
        },
        description: 'Kuchli mudofaa qurilmasi.'
    },

    tormenta: {
        name: 'Tormenta',
        icon: '💨',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#2196f3',
        thRequired: 6,
        levels: {
            1: { cost: { gold: 200000 }, time: 14400, hp: 700, damage: 50, range: 8 },
            2: { cost: { gold: 600000 }, time: 43200, hp: 1000, damage: 85, range: 8 },
            3: { cost: { gold: 1500000 }, time: 86400, hp: 1400, damage: 130, range: 9 }
        },
        description: 'Keng radiusli kuchli mudofaa.'
    },

    flamingCitadel: {
        name: 'Olovli Qal\'a',
        icon: '🔥',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#f44336',
        thRequired: 8,
        levels: {
            1: { cost: { gold: 1000000 }, time: 43200, hp: 1000, damage: 80, range: 7 },
            2: { cost: { gold: 3000000 }, time: 86400, hp: 1500, damage: 130, range: 8 },
            3: { cost: { gold: 6000000 }, time: 172800, hp: 2000, damage: 200, range: 9 }
        },
        description: 'Eng kuchli mudofaa qurilmasi. Olov bilan yoqadi.'
    },

    spikeTrap: {
        name: 'Nayzali Tuzoq',
        icon: '📌',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 10,
        minimapColor: '#757575',
        thRequired: 4,
        levels: {
            1: { cost: { gold: 1000 }, time: 30, hp: 50, damage: 50 },
            2: { cost: { gold: 5000 }, time: 120, hp: 50, damage: 100 },
            3: { cost: { gold: 20000 }, time: 600, hp: 50, damage: 200 }
        },
        description: 'Yashirin tuzoq. Dushman bosib o\'tganda zarba beradi.'
    },

    militia: {
        name: 'Militsiya',
        icon: '🛡️',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#673ab7',
        thRequired: 3,
        levels: {
            1: { cost: { gold: 3000 }, time: 300, hp: 400, capacity: 5 },
            2: { cost: { gold: 15000 }, time: 1800, hp: 600, capacity: 10 },
            3: { cost: { gold: 60000 }, time: 7200, hp: 850, capacity: 15 }
        },
        description: 'Dushman kelganda askarlarni avtomatik chiqaradi.'
    }
};

// Kategoriya nomlari
const CATEGORY_NAMES = {
    markaz: 'Markaz',
    iqtisod: 'Iqtisod',
    harbiy: 'Harbiy',
    mudofaa: 'Mudofaa'
};
