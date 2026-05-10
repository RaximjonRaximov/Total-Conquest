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
            1: { cost: { food: 100 },   time: 30,    hp: 200,  production: 5,  capacity: 250 },
            2: { cost: { food: 300 },   time: 120,   hp: 300,  production: 10, capacity: 600 },
            3: { cost: { food: 800 },   time: 600,   hp: 450,  production: 18, capacity: 1500 },
            4: { cost: { food: 2000 },  time: 1800,  hp: 600,  production: 30, capacity: 3000 },
            5: { cost: { food: 5000 },  time: 3600,  hp: 800,  production: 50, capacity: 6000 },
            6: { cost: { food: 9000 },  time: 7200,  hp: 1120, production: 70, capacity: 12000, thRequired: 6 },
            7: { cost: { food: 18000 }, time: 14400, hp: 1570, production: 95, capacity: 22000, thRequired: 7 },
            8: { cost: { food: 45000 }, time: 43200, hp: 2200, production: 130,capacity: 40000, thRequired: 8 },
            9: { cost: { food: 135000},time: 86400,  hp: 3300, production: 175,capacity: 70000, thRequired: 9 },
           10: { cost: { food: 540000},time: 432000, hp: 4950, production: 240,capacity: 120000,thRequired: 10 }
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
            1: { cost: { food: 200 },   time: 60,    hp: 300,  capacity: 5000 },
            2: { cost: { food: 500 },   time: 300,   hp: 450,  capacity: 12000 },
            3: { cost: { food: 1500 },  time: 900,   hp: 600,  capacity: 30000 },
            4: { cost: { food: 4000 },  time: 3600,  hp: 800,  capacity: 75000 },
            5: { cost: { food: 10000 }, time: 7200,  hp: 1000, capacity: 150000 },
            6: { cost: { food: 18000 }, time: 14400, hp: 1400, capacity: 300000,  thRequired: 6 },
            7: { cost: { food: 36000 }, time: 28800, hp: 1960, capacity: 550000,  thRequired: 7 },
            8: { cost: { food: 90000 }, time: 86400, hp: 2745, capacity: 1000000, thRequired: 8 },
            9: { cost: { food: 270000},time: 172800, hp: 4120, capacity: 1800000, thRequired: 9 },
           10: { cost: { food: 1080000},time:432000, hp: 6180, capacity: 3000000, thRequired: 10 }
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
            1: { cost: { gold: 100 },   time: 30,    hp: 200,  production: 5,  capacity: 250 },
            2: { cost: { gold: 300 },   time: 120,   hp: 300,  production: 10, capacity: 600 },
            3: { cost: { gold: 800 },   time: 600,   hp: 450,  production: 18, capacity: 1500 },
            4: { cost: { gold: 2000 },  time: 1800,  hp: 600,  production: 30, capacity: 3000 },
            5: { cost: { gold: 5000 },  time: 3600,  hp: 800,  production: 50, capacity: 6000 },
            6: { cost: { gold: 9000 },  time: 7200,  hp: 1120, production: 70, capacity: 12000, thRequired: 6 },
            7: { cost: { gold: 18000 }, time: 14400, hp: 1570, production: 95, capacity: 22000, thRequired: 7 },
            8: { cost: { gold: 45000 }, time: 43200, hp: 2200, production: 130,capacity: 40000, thRequired: 8 },
            9: { cost: { gold: 135000},time: 86400,  hp: 3300, production: 175,capacity: 70000, thRequired: 9 },
           10: { cost: { gold: 540000},time: 432000, hp: 4950, production: 240,capacity: 120000,thRequired: 10 }
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
            1: { cost: { gold: 200 },   time: 60,    hp: 300,  capacity: 5000 },
            2: { cost: { gold: 500 },   time: 300,   hp: 450,  capacity: 12000 },
            3: { cost: { gold: 1500 },  time: 900,   hp: 600,  capacity: 30000 },
            4: { cost: { gold: 4000 },  time: 3600,  hp: 800,  capacity: 75000 },
            5: { cost: { gold: 10000 }, time: 7200,  hp: 1000, capacity: 150000 },
            6: { cost: { gold: 18000 }, time: 14400, hp: 1400, capacity: 300000,  thRequired: 6 },
            7: { cost: { gold: 36000 }, time: 28800, hp: 1960, capacity: 550000,  thRequired: 7 },
            8: { cost: { gold: 90000 }, time: 86400, hp: 2745, capacity: 1000000, thRequired: 8 },
            9: { cost: { gold: 270000},time: 172800, hp: 4120, capacity: 1800000, thRequired: 9 },
           10: { cost: { gold: 1080000},time:432000, hp: 6180, capacity: 3000000, thRequired: 10 }
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

    gemMine: {
        name: 'Olmos Koni',
        icon: '💎',
        category: 'iqtisod',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#7ecef2',
        thRequired: 3,
        levels: {
            1: { cost: { gold: 25000 }, time: 3600, hp: 300,
                 diamondPerHour: 0.5,  capacity: 12,  desc: '0.5 💎/soat' },
            2: { cost: { gold: 100000 }, time: 14400, hp: 480,
                 diamondPerHour: 1,    capacity: 30,  desc: '1 💎/soat' },
            3: { cost: { gold: 400000 }, time: 43200, hp: 700,
                 diamondPerHour: 2,    capacity: 75,  desc: '2 💎/soat' },
            4: { cost: { gold: 1200000 }, time: 86400, hp: 1000,
                 diamondPerHour: 4,    capacity: 150, desc: '4 💎/soat' }
        },
        description: 'Olmoslarni sekin-asta qazib chiqaradi. Har kuni yig\'ib turing!'
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

    // ===== QURUVCHI UYI =====
    builderHut: {
        name: 'Quruvchi Uyi',
        icon: '🛖',
        category: 'harbiy',
        size: [2, 2],
        maxCount: 5,
        minimapColor: '#8d6e63',
        thRequired: 1,
        isBuilderHut: true,     // BuilderSystem ga bog'langan
        noUpgrade: true,        // Upgrade yo'q — narx BuilderSystem.builderCosts'dan
        levels: {
            1: { cost: {}, time: 0, hp: 400 },  // Narx BuilderSystem.builderCosts dan olinadi
        },
        description: 'Quruvchi uyi. Har bir uy yangi quruvchini beradi. Bir vaqtda ko\'proq bino qurish mumkin.'
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
            1: { cost: { gold: 500 },    time: 60,    hp: 350,  troopSlots: 1 },
            2: { cost: { gold: 2000 },   time: 600,   hp: 500,  troopSlots: 2 },
            3: { cost: { gold: 8000 },   time: 3600,  hp: 700,  troopSlots: 3 },
            4: { cost: { gold: 30000 },  time: 14400, hp: 950,  troopSlots: 4 },
            5: { cost: { gold: 100000 }, time: 43200, hp: 1200, troopSlots: 5 },
            6: { cost: { gold: 180000 }, time: 86400, hp: 1680, troopSlots: 6, thRequired: 6 },
            7: { cost: { gold: 360000 }, time: 172800,hp: 2350, troopSlots: 7, thRequired: 7 },
            8: { cost: { gold: 900000 }, time: 259200,hp: 3290, troopSlots: 8, thRequired: 8 },
            9: { cost: { gold: 2700000},time: 432000, hp: 4940, troopSlots: 9, thRequired: 9 },
           10: { cost: { gold: 10800000},time:604800, hp: 7410, troopSlots:10, thRequired: 10 }
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
            1: { cost: { gold: 800 },    time: 120,   hp: 300,  capacity: 20 },
            2: { cost: { gold: 3000 },   time: 900,   hp: 450,  capacity: 35 },
            3: { cost: { gold: 12000 },  time: 3600,  hp: 650,  capacity: 50 },
            4: { cost: { gold: 50000 },  time: 14400, hp: 900,  capacity: 75 },
            5: { cost: { gold: 200000 }, time: 43200, hp: 1200, capacity: 100 },
            6: { cost: { gold: 360000 }, time: 86400, hp: 1680, capacity: 130, thRequired: 6 },
            7: { cost: { gold: 720000 }, time: 172800,hp: 2350, capacity: 160, thRequired: 7 },
            8: { cost: { gold: 1800000},time: 259200, hp: 3290, capacity: 200, thRequired: 8 },
            9: { cost: { gold: 5400000},time: 432000, hp: 4940, capacity: 240, thRequired: 9 },
           10: { cost: { gold: 21600000},time:604800, hp: 7410, capacity: 300, thRequired: 10 }
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
            1: { cost: { gold: 50000 },   time: 3600,   hp: 400 },
            2: { cost: { gold: 150000 },  time: 14400,  hp: 600 },
            3: { cost: { gold: 500000 },  time: 43200,  hp: 800 },
            4: { cost: { gold: 900000 },  time: 86400,  hp: 1120, thRequired: 6 },
            5: { cost: { gold: 1800000 }, time: 172800, hp: 1570, thRequired: 7 },
            6: { cost: { gold: 4500000 }, time: 259200, hp: 2195, thRequired: 8 },
            7: { cost: { gold: 13500000},time: 345600,  hp: 3075, thRequired: 9 },
            8: { cost: { gold: 54000000},time: 518400,  hp: 4310, thRequired: 10 }
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
            1: { cost: { gold: 20000 },  time: 1800,   hp: 350 },
            2: { cost: { gold: 80000 },  time: 7200,   hp: 500 },
            3: { cost: { gold: 250000 }, time: 28800,  hp: 700 },
            4: { cost: { gold: 450000 }, time: 57600,  hp: 980,  thRequired: 6 },
            5: { cost: { gold: 900000 }, time: 86400,  hp: 1370, thRequired: 7 },
            6: { cost: { gold: 2250000},time: 172800,  hp: 1920, thRequired: 8 },
            7: { cost: { gold: 6750000},time: 259200,  hp: 2685, thRequired: 9 },
            8: { cost: { gold: 27000000},time:432000,  hp: 3760, thRequired: 10 }
        },
        description: 'Ittifoqga qo\'shilish va yordam so\'rash.'
    },

    spellFactory: {
        name: 'Sehr Fabrikasi',
        icon: '⚗️',
        category: 'harbiy',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#7b1fa2',
        thRequired: 5,
        levels: {
            1: { cost: { gold: 80000 },   time: 7200,   hp: 400,  spellSlots: 1 },
            2: { cost: { gold: 300000 },  time: 28800,  hp: 600,  spellSlots: 2 },
            3: { cost: { gold: 800000 },  time: 86400,  hp: 800,  spellSlots: 3 },
            4: { cost: { gold: 1440000 }, time: 172800, hp: 1120, spellSlots: 4, thRequired: 7 },
            5: { cost: { gold: 2880000 }, time: 259200, hp: 1570, spellSlots: 5, thRequired: 8 },
            6: { cost: { gold: 7200000 }, time: 345600, hp: 2195, spellSlots: 6, thRequired: 9 },
            7: { cost: { gold: 21600000},time: 432000,  hp: 3075, spellSlots: 7, thRequired: 10 }
        },
        description: 'Jang paytida ishlatiladigan sehrlar tayyorlaydi.'
    },

    // ===== MUDOFAA =====
    wall: {
        name: 'Devor',
        icon: '🧱',
        category: 'devor',
        isBarrier: true,    // Hujum qilinmaydi, shunchaki to'siq
        size: [1, 1],
        maxCount: 100,
        minimapColor: '#9e9e9e',
        thRequired: 3,
        levels: {
            1: { cost: { gold: 200 },    time: 10,    hp: 500 },
            2: { cost: { gold: 1000 },   time: 30,    hp: 1000 },
            3: { cost: { gold: 5000 },   time: 120,   hp: 2000 },
            4: { cost: { gold: 20000 },  time: 600,   hp: 4000 },
            5: { cost: { gold: 80000 },  time: 1800,  hp: 7000 },
            6: { cost: { gold: 144000 }, time: 3600,  hp: 11200, thRequired: 6 },
            7: { cost: { gold: 288000 }, time: 7200,  hp: 17900, thRequired: 7 },
            8: { cost: { gold: 720000 }, time: 21600, hp: 28640, thRequired: 8 },
            9: { cost: { gold: 2160000},time: 43200,  hp: 42960, thRequired: 9 },
           10: { cost: { gold: 8640000},time: 86400,  hp: 64440, thRequired: 10 }
        },
        description: 'Dushman yo\'lini to\'sadi.'
    },

    gate: {
        name: 'Darvoza',
        icon: '🚪',
        category: 'devor',
        isBarrier: true,    // Devor bilan bir xil — to'siq, o'z askarlaring o'tadi
        size: [1, 1],
        maxCount: 8,
        minimapColor: '#607d8b',
        thRequired: 3,
        levels: {
            1: { cost: { gold: 500 },    time: 15,    hp: 600 },
            2: { cost: { gold: 2000 },   time: 60,    hp: 1200 },
            3: { cost: { gold: 8000 },   time: 300,   hp: 2500 },
            4: { cost: { gold: 14400 },  time: 1200,  hp: 4250, thRequired: 5 },
            5: { cost: { gold: 28800 },  time: 3600,  hp: 7000, thRequired: 6 },
            6: { cost: { gold: 72000 },  time: 7200,  hp: 11200,thRequired: 7 },
            7: { cost: { gold: 216000 }, time: 14400, hp: 17920,thRequired: 8 },
            8: { cost: { gold: 648000 }, time: 28800, hp: 26880,thRequired: 9 },
            9: { cost: { gold: 1944000},time: 86400,  hp: 40320,thRequired: 9 },
           10: { cost: { gold: 3888000},time: 172800, hp: 60480,thRequired: 10 }
        },
        description: 'O\'z askarlaring o\'tadi, dushmanga to\'siq.'
    },

    // ── KAMONCHI MINORASI — ground troops ──────────────────────────────────────
    archerTower: {
        name: 'Kamonchi Minorasi',
        icon: '🏹',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 6,
        minimapColor: '#ff5722',
        thRequired: 3,
        targetType: 'ground',           // Faqat yerda yuruvchi askarlarni uradi
        attackType: 'single',
        attackSpeed: 1200,
        levels: {
            1: { cost: { gold: 1000 },   time: 60,    hp: 300,  damage: 10, range: 5 },
            2: { cost: { gold: 4000 },   time: 300,   hp: 450,  damage: 18, range: 5 },
            3: { cost: { gold: 15000 },  time: 1800,  hp: 650,  damage: 30, range: 6 },
            4: { cost: { gold: 50000 },  time: 7200,  hp: 900,  damage: 48, range: 6 },
            5: { cost: { gold: 150000 }, time: 28800, hp: 1200, damage: 70, range: 7 },
            6: { cost: { gold: 270000 }, time: 57600, hp: 1680, damage: 91, range: 7, thRequired: 6 },
            7: { cost: { gold: 540000 }, time: 86400, hp: 2350, damage: 118,range: 7, thRequired: 7 },
            8: { cost: { gold: 1350000},time: 172800, hp: 3290, damage: 153,range: 8, thRequired: 8 },
            9: { cost: { gold: 4050000},time: 345600, hp: 4940, damage: 199,range: 8, thRequired: 9 },
           10: { cost: { gold: 16200000},time:604800, hp: 7410, damage: 260,range: 9, thRequired: 10 },
        },
        description: '🏹 Yerda yuruvchi askarlarga o\'q otadi. Uchuvchilarga ta\'sir qilmaydi.',
    },

    // ── SCORPIO — piercing bolt, ground only ───────────────────────────────────
    scorpio: {
        name: 'Scorpio',
        icon: '🦂',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 4,
        minimapColor: '#ff9800',
        thRequired: 4,
        targetType: 'ground',
        attackType: 'piercing',         // O'qi bir nechta askarni teshib o'tadi
        attackSpeed: 2000,
        levels: {
            1: { cost: { gold: 5000 },   time: 300,    hp: 400,  damage: 35,  range: 7 },
            2: { cost: { gold: 20000 },  time: 1800,   hp: 600,  damage: 60,  range: 7 },
            3: { cost: { gold: 80000 },  time: 7200,   hp: 850,  damage: 90,  range: 8 },
            4: { cost: { gold: 300000 }, time: 28800,  hp: 1100, damage: 130, range: 8 },
            5: { cost: { gold: 540000 }, time: 57600,  hp: 1540, damage: 169, range: 8, thRequired: 5 },
            6: { cost: { gold: 972000 }, time: 86400,  hp: 2155, damage: 220, range: 9, thRequired: 6 },
            7: { cost: { gold: 1944000},time: 172800,  hp: 3020, damage: 286, range: 9, thRequired: 7 },
            8: { cost: { gold: 4860000},time: 259200,  hp: 4225, damage: 372, range: 9, thRequired: 8 },
            9: { cost: { gold: 14580000},time:432000,  hp: 6340, damage: 483, range: 10,thRequired: 9 },
           10: { cost: { gold: 58320000},time:604800,  hp: 9510, damage: 629, range: 10,thRequired: 10 },
        },
        description: '🦂 Teshib o\'tuvchi bolt. Bir qatorda turgan askarlarning hammasiga zarar.',
    },

    // ── TORMENTA — splash AoE, ground only ─────────────────────────────────────
    tormenta: {
        name: 'Tormenta',
        icon: '🌀',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#2196f3',
        thRequired: 6,
        targetType: 'ground',
        attackType: 'splash',           // AoE zarar
        splashRadius: 2.0,
        attackSpeed: 2500,
        levels: {
            1: { cost: { gold: 200000 },  time: 14400,  hp: 700,  damage: 55,  range: 8 },
            2: { cost: { gold: 600000 },  time: 43200,  hp: 1000, damage: 90,  range: 8 },
            3: { cost: { gold: 1500000 }, time: 86400,  hp: 1400, damage: 140, range: 9 },
            4: { cost: { gold: 2700000 }, time: 172800, hp: 1960, damage: 182, range: 9, thRequired: 7 },
            5: { cost: { gold: 5400000 }, time: 259200, hp: 2745, damage: 237, range: 9, thRequired: 8 },
            6: { cost: { gold: 13500000},time: 345600,  hp: 3840, damage: 308, range: 10,thRequired: 9 },
            7: { cost: { gold: 40500000},time: 432000,  hp: 5375, damage: 400, range: 10,thRequired: 9 },
            8: { cost: { gold: 81000000},time: 518400,  hp: 7525, damage: 520, range: 10,thRequired: 10 },
        },
        description: '🌀 Katta maydon zarari. Guruh askarlarni yo\'q qiladi. Uchuvchilarga ta\'sir qilmaydi.',
    },

    // ── FLAMING CITADEL — fire damage, splash, ground only ─────────────────────
    flamingCitadel: {
        name: 'Olovli Qal\'a',
        icon: '🔥',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#f44336',
        thRequired: 8,
        targetType: 'ground',
        attackType: 'fire_splash',      // Olov + splash — dotsni qo'yadi
        splashRadius: 1.5,
        burnDamage: 8,                  // Har sekundda qo'shimcha olov zarari
        burnDuration: 3000,             // 3 sekund yonadi
        attackSpeed: 2000,
        levels: {
            1: { cost: { gold: 1000000 },  time: 43200,  hp: 1000, damage: 90,  range: 7 },
            2: { cost: { gold: 3000000 },  time: 86400,  hp: 1500, damage: 150, range: 8 },
            3: { cost: { gold: 6000000 },  time: 172800, hp: 2000, damage: 220, range: 9 },
            4: { cost: { gold: 10800000 }, time: 259200, hp: 2800, damage: 286, range: 9, thRequired: 9 },
            5: { cost: { gold: 18000000 }, time: 432000, hp: 3920, damage: 372, range: 10,thRequired: 9 },
            6: { cost: { gold: 27000000 }, time: 518400, hp: 5490, damage: 484, range: 10,thRequired: 10 },
            7: { cost: { gold: 40500000 }, time: 604800, hp: 7685, damage: 629, range: 10,thRequired: 10 },
        },
        description: '🔥 Olov zarar + 3 sekund yonish effekti. Eng kuchli mudofaa.',
    },

    // ── CLOUD BUSTER — FAQAT UCHUVCHILARGA qarshi! ──────────────────────────────
    cloudBuster: {
        name: 'Cloud Buster',
        icon: '⚡',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#9c27b0',
        thRequired: 5,
        targetType: 'air',              // FAQAT uchuvchi askarlarni uradi
        attackType: 'anti_air',
        minRange: 1.5,                  // Minimum range (juda yaqindagilarni ura olmaydi)
        attackSpeed: 1000,              // Tez otadi
        levels: {
            1: { cost: { gold: 50000 },   time: 7200,   hp: 500,  damage: 80,  range: 8 },
            2: { cost: { gold: 150000 },  time: 21600,  hp: 750,  damage: 130, range: 9 },
            3: { cost: { gold: 400000 },  time: 43200,  hp: 1050, damage: 200, range: 10 },
            4: { cost: { gold: 720000 },  time: 86400,  hp: 1470, damage: 260, range: 10, thRequired: 6 },
            5: { cost: { gold: 1440000 }, time: 172800, hp: 2060, damage: 338, range: 11, thRequired: 7 },
            6: { cost: { gold: 3600000 }, time: 259200, hp: 2880, damage: 439, range: 11, thRequired: 8 },
            7: { cost: { gold: 10800000},time: 432000,  hp: 4030, damage: 571, range: 12, thRequired: 9 },
            8: { cost: { gold: 43200000},time: 604800,  hp: 5645, damage: 742, range: 12, thRequired: 10 },
        },
        description: '⚡ FAQAT uchuvchi askarlarga (Harpy) qarshi! Yer askarlarga ta\'sir qilmaydi. Minimum range bor.',
    },

    // ── SPIKE TRAP — ground trigger, speculator avoids ─────────────────────────
    spikeTrap: {
        name: 'Nayzali Tuzoq',
        icon: '📌',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 10,
        minimapColor: '#757575',
        thRequired: 4,
        targetType: 'ground',
        attackType: 'trap',             // Ustidan yurilganda ishga tushadi
        trapTriggerRadius: 0.8,
        hidden: true,                   // Jangda ko'rinmaydi (Speculator ularni ko'radi)
        levels: {
            1: { cost: { gold: 1000 },   time: 30,   hp: 50, damage: 60 },
            2: { cost: { gold: 5000 },   time: 120,  hp: 50, damage: 120 },
            3: { cost: { gold: 20000 },  time: 600,  hp: 50, damage: 250 },
            4: { cost: { gold: 36000 },  time: 1800, hp: 50, damage: 400, thRequired: 5 },
            5: { cost: { gold: 72000 },  time: 3600, hp: 50, damage: 620, thRequired: 6 },
            6: { cost: { gold: 180000 }, time: 7200, hp: 50, damage: 930, thRequired: 7 },
            7: { cost: { gold: 540000 }, time: 14400,hp: 50, damage: 1395,thRequired: 8 },
            8: { cost: { gold: 1620000},time: 28800, hp: 50, damage: 2095,thRequired: 9 },
            9: { cost: { gold: 4860000},time: 43200, hp: 50, damage: 3140,thRequired: 9 },
           10: { cost: { gold: 9720000},time: 86400, hp: 50, damage: 4710,thRequired: 10 },
        },
        description: '📌 Yashirin tuzoq. Askar ustidan o\'tganda portlaydi. Speculator ko\'rib o\'tadi.',
    },

    // ── ALCHEMICAL TRAP — massive explosion, speculator avoids ─────────────────
    alchemicalTrap: {
        name: 'Kimyoviy Tuzoq',
        icon: '🧪',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 4,
        minimapColor: '#00bcd4',
        thRequired: 6,
        targetType: 'ground',
        attackType: 'trap',
        trapTriggerRadius: 1.0,
        splashRadius: 2.5,              // Katta portlash radiusi
        hidden: true,
        oneTimeUse: true,               // Bir marta ishlatiladi
        levels: {
            1: { cost: { gold: 50000 },   time: 3600,  hp: 50, damage: 400 },
            2: { cost: { gold: 150000 },  time: 7200,  hp: 50, damage: 700 },
            3: { cost: { gold: 400000 },  time: 14400, hp: 50, damage: 1200 },
            4: { cost: { gold: 720000 },  time: 28800, hp: 50, damage: 1920, thRequired: 7 },
            5: { cost: { gold: 1440000 }, time: 43200, hp: 50, damage: 3000, thRequired: 8 },
            6: { cost: { gold: 3600000 }, time: 86400, hp: 50, damage: 4500, thRequired: 9 },
            7: { cost: { gold: 10800000},time: 172800, hp: 50, damage: 6750, thRequired: 10 },
        },
        description: '🧪 Katta kimyoviy portlash. Radius ichidagi hammaga ulkan zarar. Speculator ko\'rib o\'tadi.',
    },

    // ── MILITIA — spawns guard troops ──────────────────────────────────────────
    militia: {
        name: 'Militsiya',
        icon: '🛡️',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#673ab7',
        thRequired: 3,
        targetType: 'spawn',            // Askar chiqaradi (emas otadi)
        attackType: 'spawn_troops',
        attackSpeed: 30000,             // 30 sekundda bir marta yangilaydi
        levels: {
            1: { cost: { gold: 3000 },   time: 300,   hp: 400,  capacity: 5  },
            2: { cost: { gold: 15000 },  time: 1800,  hp: 600,  capacity: 10 },
            3: { cost: { gold: 60000 },  time: 7200,  hp: 850,  capacity: 15 },
            4: { cost: { gold: 108000 }, time: 14400, hp: 1190, capacity: 20, thRequired: 5 },
            5: { cost: { gold: 216000 }, time: 28800, hp: 1665, capacity: 25, thRequired: 6 },
            6: { cost: { gold: 540000 }, time: 57600, hp: 2330, capacity: 30, thRequired: 7 },
            7: { cost: { gold: 1620000},time: 86400,  hp: 3265, capacity: 38, thRequired: 8 },
            8: { cost: { gold: 4860000},time: 172800, hp: 4570, capacity: 47, thRequired: 9 },
            9: { cost: { gold: 9720000},time: 345600, hp: 6400, capacity: 57, thRequired: 10 },
        },
        description: '🛡️ Dushman kelganda qo\'riqchi askarlar chiqaradi. Gladiator buni birinchi nishon oladi.',
    },

    // ── PRAETORIUM — Klan qal'asi: askarlarni saqlaydi, hujumda va mudofaada yordam ─
    praetorium: {
        name: 'Praetorium',
        icon: '🏰',
        category: 'mudofaa',
        size: [3, 3],
        maxCount: 1,
        minimapColor: '#5c3d2e',
        thRequired: 5,
        attackType: 'spawn_troops',  // Hujum paytida askar chiqaradi
        attackSpeed: 20000,          // 20 sekundda bir marta (militia dan tezroq)
        levels: {
            1: { cost: { gold: 40000 },   time: 3600,   hp: 600,  capacity: 10, guardsCount: 2 },
            2: { cost: { gold: 100000 },  time: 10800,  hp: 900,  capacity: 15, guardsCount: 3 },
            3: { cost: { gold: 300000 },  time: 28800,  hp: 1300, capacity: 20, guardsCount: 4, thRequired: 6 },
            4: { cost: { gold: 700000 },  time: 57600,  hp: 1800, capacity: 25, guardsCount: 5, thRequired: 7 },
            5: { cost: { gold: 1500000 }, time: 86400,  hp: 2500, capacity: 30, guardsCount: 6, thRequired: 8 },
            6: { cost: { gold: 3000000 }, time: 172800, hp: 3500, capacity: 35, guardsCount: 8, thRequired: 9 },
            7: { cost: { gold: 6000000 }, time: 259200, hp: 5000, capacity: 40, guardsCount: 10, thRequired: 10 },
        },
        description: '🏰 Praetorium — klan qal\'asi. Ittifoq a\'zolari askar jo\'natishi mumkin. Hujum paytida ular mudofaa qiladi.',
    },

    // ── MAGIC TOWER — multi-target slow ──────────────────────────────────────────
    magicTower: {
        name: 'Sehrli Minora',
        icon: '🔮',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#9c27b0',
        thRequired: 5,
        targetType: 'both',
        attackType: 'slow_splash',
        attackSpeed: 2200,
        splashRadius: 2.0,
        slowEffect: 0.45,       // 45% tezlik kamaytirish
        slowDuration: 2500,     // ms
        levels: {
            1: { cost: { gold: 40000 },   time: 3600,   hp: 900,  damage: 40,  range: 7 },
            2: { cost: { gold: 120000 },  time: 10800,  hp: 1400, damage: 65,  range: 8 },
            3: { cost: { gold: 350000 },  time: 28800,  hp: 2000, damage: 90,  range: 9 },
            4: { cost: { gold: 630000 },  time: 57600,  hp: 2800, damage: 117, range: 9, thRequired: 6 },
            5: { cost: { gold: 1260000 }, time: 86400,  hp: 3920, damage: 152, range: 10,thRequired: 7 },
            6: { cost: { gold: 3150000 }, time: 172800, hp: 5490, damage: 198, range: 10,thRequired: 8 },
            7: { cost: { gold: 9450000 }, time: 259200, hp: 7685, damage: 257, range: 11,thRequired: 9 },
            8: { cost: { gold: 37800000},time: 432000,  hp: 10760,damage: 334, range: 11,thRequired: 10 },
        },
        description: '🔮 Atrofdagi barcha askarlarni sekinlashtiradi. Yer va havo nishonlarini uradi.',
    },

    // ── POISON TRAP — area denial DOT ─────────────────────────────────────────
    poisonTrap: {
        name: 'Zahar Tuzoq',
        icon: '☠️',
        category: 'mudofaa',
        size: [1, 1],
        maxCount: 5,
        minimapColor: '#4caf50',
        thRequired: 4,
        targetType: 'ground',
        attackType: 'trap',
        trapTriggerRadius: 1.2,
        splashRadius: 1.8,
        hidden: true,
        oneTimeUse: false,
        poisonDamage: 15,       // zarar/sekund
        poisonDuration: 5000,   // ms
        attackSpeed: 8000,      // 8s cooldown after trigger
        levels: {
            1: { cost: { gold: 8000 },   time: 900,   hp: 50, damage: 30,  range: 1.2 },
            2: { cost: { gold: 30000 },  time: 3600,  hp: 50, damage: 50,  range: 1.2 },
            3: { cost: { gold: 90000 },  time: 10800, hp: 50, damage: 80,  range: 1.2 },
            4: { cost: { gold: 162000 }, time: 21600, hp: 50, damage: 125, range: 1.4, thRequired: 5 },
            5: { cost: { gold: 324000 }, time: 43200, hp: 50, damage: 195, range: 1.6, thRequired: 6 },
            6: { cost: { gold: 810000 }, time: 86400, hp: 50, damage: 300, range: 1.8, thRequired: 7 },
            7: { cost: { gold: 2430000},time: 172800, hp: 50, damage: 465, range: 2.0, thRequired: 8 },
            8: { cost: { gold: 7290000},time: 259200, hp: 50, damage: 720, range: 2.0, thRequired: 9 },
            9: { cost: { gold: 14580000},time:432000, hp: 50, damage: 1080,range: 2.2, thRequired: 9 },
           10: { cost: { gold: 29160000},time:604800, hp: 50, damage: 1620,range: 2.2, thRequired: 10 },
        },
        description: '☠️ Yashirin zahar tuzoq. Askar ustiga bosganida zaharli bulut chiqaradi.',
    },

    // ── AKADEMIYA — troop capacity va training speed ─────────────────────────────
    academy: {
        name: 'Akademiya',
        icon: '🎓',
        category: 'harbiy',
        size: [3, 3],
        maxCount: 1,
        minimapColor: '#3f51b5',
        thRequired: 4,
        levels: {
            1: { cost: { gold: 20000,   food: 10000  }, time: 3600,   hp: 800,  troopCapacityBonus: 10, trainingSpeedBonus: 0.05 },
            2: { cost: { gold: 80000,   food: 30000  }, time: 14400,  hp: 1200, troopCapacityBonus: 20, trainingSpeedBonus: 0.10 },
            3: { cost: { gold: 250000,  food: 80000  }, time: 43200,  hp: 1600, troopCapacityBonus: 30, trainingSpeedBonus: 0.15 },
            4: { cost: { gold: 800000,  food: 200000 }, time: 86400,  hp: 2200, troopCapacityBonus: 40, trainingSpeedBonus: 0.20 },
            5: { cost: { gold: 1440000, food: 400000 }, time: 172800, hp: 3080, troopCapacityBonus: 50, trainingSpeedBonus: 0.25, thRequired: 6 },
            6: { cost: { gold: 2880000, food: 800000 }, time: 259200, hp: 4310, troopCapacityBonus: 60, trainingSpeedBonus: 0.30, thRequired: 7 },
            7: { cost: { gold: 7200000, food: 1600000}, time: 345600, hp: 6035, troopCapacityBonus: 75, trainingSpeedBonus: 0.35, thRequired: 8 },
            8: { cost: { gold: 21600000,food: 3200000}, time: 432000, hp: 8450, troopCapacityBonus: 90, trainingSpeedBonus: 0.40, thRequired: 9 },
            9: { cost: { gold: 43200000,food: 6400000}, time: 518400, hp:11830, troopCapacityBonus:110, trainingSpeedBonus: 0.45, thRequired: 10 },
        },
        description: '🎓 Askar sig\'imini va tayyorlash tezligini oshiradi. Qo\'shin kuchini oshiruvchi ilmiy markaz.',
    },

    // ── BOLT TOWER — X-Bow ekvivalenti, TH9+, ground+air ──────────────────────
    boltTower: {
        name: 'Bolt Minorasi',
        icon: '🎯',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#e91e63',
        thRequired: 9,
        targetType: 'both',             // Yer va havo
        attackType: 'rapid_single',     // Juda tez, bitta nishon
        attackSpeed: 500,               // 0.5s — juda tez
        reloadCost: { gold: 1000 },     // Har 50 o'qdan keyin qayta yuklash
        levels: {
            1: { cost: { gold: 3000000,  food: 500000  }, time: 259200, hp: 2500, damage: 55,  range: 11 },
            2: { cost: { gold: 6000000,  food: 1000000 }, time: 432000, hp: 3500, damage: 85,  range: 12 },
            3: { cost: { gold: 10000000, food: 2000000 }, time: 604800, hp: 5000, damage: 120, range: 14 },
        },
        description: '🎯 Juda tez otuvchi Bolt Minorasi (X-Bow). Yer va havo nishonlarini uradi. O\'q tamom bo\'lgach qayta yuklash kerak.',
    },

    // ── INFERNO COLUMN — Inferno Tower ekvivalenti, TH10+, single/multi mode ──
    infernoColumn: {
        name: 'Inferno Ustun',
        icon: '🌋',
        category: 'mudofaa',
        size: [2, 2],
        maxCount: 2,
        minimapColor: '#ff6d00',
        thRequired: 10,
        targetType: 'both',
        attackType: 'inferno',          // Oshib boruvchi zarar (charge mechanic)
        chargeRate: 50,                 // Har sekundda +50 damage (maks 4x)
        maxCharge: 4.0,                 // 4x zarar chekisi
        attackSpeed: 200,               // Juda tez (charge tick uchun)
        levels: {
            1: { cost: { gold: 5000000,  food: 1000000 }, time: 518400, hp: 3000, damage: 30,  range: 9  },
            2: { cost: { gold: 9000000,  food: 2000000 }, time: 691200, hp: 4500, damage: 55,  range: 10 },
            3: { cost: { gold: 15000000, food: 4000000 }, time: 864000, hp: 6000, damage: 80,  range: 11 },
        },
        description: '🌋 Inferno Ustun. Bitta nishonga uzluksiz olov otadi — zarar oshib boradi (maks 4x). Eng kuchli mudofaa.',
    },

    // ===== QAHRAMON HAYKALLAR =====
    // Hero haykali qurilganda o'sha qahramon jangda qatnashadi.
    // Har biridan faqat 1 ta quriladi; TH talabi heroType bilan mos keladi.

    legatusStatue: {
        name: 'Legatus Haykali',
        icon: '🗿',
        category: 'harbiy',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#b8860b',
        thRequired: 4,
        isHeroStatue: true,
        heroType: 'legatus',
        levels: {
            1: { cost: { gold: 200000, food: 50000  }, time: 86400,  hp: 1200 },
            2: { cost: { gold: 500000, food: 100000 }, time: 172800, hp: 1800 },
            3: { cost: { gold: 1200000,food: 250000 }, time: 259200, hp: 2600 },
        },
        description: 'Legatus Legionis haykali. Qurilsa Legatus jangda qatnashadi. TH4 da ochiladi.',
    },

    aquiliferStatue: {
        name: 'Aquila Ustuni',
        icon: '🦅',
        category: 'harbiy',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#78909c',
        thRequired: 6,
        isHeroStatue: true,
        heroType: 'aquilifer',
        levels: {
            1: { cost: { gold: 500000,  food: 150000  }, time: 172800, hp: 1500 },
            2: { cost: { gold: 1200000, food: 300000  }, time: 259200, hp: 2200 },
            3: { cost: { gold: 2500000, food: 600000  }, time: 432000, hp: 3200 },
        },
        description: 'Aquilifer (Burgut bayroqdori) ustuni. Qurilsa Aquilifer jangda qatnashadi. TH6 da ochiladi.',
    },

    praetoranStatue: {
        name: 'Praetorian Qasri',
        icon: '🛡️',
        category: 'harbiy',
        size: [2, 2],
        maxCount: 1,
        minimapColor: '#455a64',
        thRequired: 8,
        isHeroStatue: true,
        heroType: 'praetorian_guard',
        levels: {
            1: { cost: { gold: 1500000, food: 400000  }, time: 345600, hp: 2000 },
            2: { cost: { gold: 3500000, food: 900000  }, time: 518400, hp: 3000 },
            3: { cost: { gold: 7000000, food: 1800000 }, time: 691200, hp: 4200 },
        },
        description: 'Praetorian Guard qasri. Qurilsa Praetorian Guard jangda qatnashadi. TH8 da ochiladi.',
    },

    imperatriceStatue: {
        name: 'Imperator Taxt',
        icon: '👑',
        category: 'harbiy',
        size: [3, 3],
        maxCount: 1,
        minimapColor: '#ffd700',
        thRequired: 10,
        isHeroStatue: true,
        heroType: 'imperatrix',
        levels: {
            1: { cost: { gold: 5000000,  food: 1500000 }, time: 604800,  hp: 3500 },
            2: { cost: { gold: 10000000, food: 3000000 }, time: 864000,  hp: 5000 },
            3: { cost: { gold: 18000000, food: 6000000 }, time: 1036800, hp: 7000 },
        },
        description: 'Imperatrix taxt-haykali. Qurilsa Imperatrix jangda qatnashadi. TH10 da ochiladi.',
    },
};

// Kategoriya nomlari (tartib shu bo'ladi)
const CATEGORY_NAMES = {
    markaz:  'Markaz',
    iqtisod: 'Iqtisod',
    harbiy:  'Harbiy',
    mudofaa: 'Mudofaa',
    devor:   '🧱 Devorlar',
};
