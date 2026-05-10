// ============================================
// KAMPANIYA MA'LUMOTLARI — Single Player
// 15 ta oldindan belgilangan daraja (CoC uslubi)
// ============================================

// Har bir daraja: TH markazi = (CX, CY) = (20, 20)
// Binolar CX/CY ga nisbatan dx/dy offset bilan joylashtiriladi

const CAMPAIGN_LEVELS = [
    // ── DARA 1: Kichik qishloq (TH1) ─────────────────────────────────────────
    {
        id: 1,
        name: 'Qadimgi Qishloq',
        description: 'Kichik mudofaasiz qishloq. Boshlang\'ich hujum mashqi.',
        region: 'Gallia',
        regionIcon: '🌲',
        difficulty: 1,
        thLevel: 1,
        loot: { gold: [800, 1200], food: [600, 900] },
        xpReward: 30,
        trophyReward: 8,
        buildings: [
            // TH markazi
            { type: 'cityHall',   dx:  0, dy:  0, lv: 1 },
            // Resurslar
            { type: 'villa',      dx: -4, dy:  2, lv: 1 },
            { type: 'farm',       dx:  3, dy: -3, lv: 1 },
            { type: 'goldStorage',dx:  4, dy:  3, lv: 1 },
        ]
    },

    // ── DARA 2: Asosiy mudofaa (TH1) ─────────────────────────────────────────
    {
        id: 2,
        name: 'Rim Chegara Postlari',
        description: 'Bitta archer minorasi bor. Ehtiyot bo\'ling.',
        region: 'Gallia',
        regionIcon: '🌲',
        difficulty: 1,
        thLevel: 1,
        loot: { gold: [1200, 1800], food: [900, 1400] },
        xpReward: 45,
        trophyReward: 10,
        buildings: [
            { type: 'cityHall',    dx:  0, dy:  0, lv: 1 },
            { type: 'archerTower', dx:  3, dy: -2, lv: 1 },
            { type: 'villa',       dx: -4, dy:  1, lv: 1 },
            { type: 'farm',        dx:  4, dy:  2, lv: 1 },
            { type: 'goldStorage', dx: -3, dy: -3, lv: 1 },
            { type: 'foodStorage', dx:  5, dy: -2, lv: 1 },
        ]
    },

    // ── DARA 3: Devorli qal'a (TH2) ──────────────────────────────────────────
    {
        id: 3,
        name: 'Mudofaa Devori',
        description: 'Birinchi devorlar. Yo\'l topishingiz kerak!',
        region: 'Italia',
        regionIcon: '⛰️',
        difficulty: 2,
        thLevel: 2,
        loot: { gold: [2000, 3000], food: [1500, 2200] },
        xpReward: 65,
        trophyReward: 12,
        buildings: [
            { type: 'cityHall',    dx:  0, dy:  0, lv: 2 },
            // R=4 to'liq devor halqasi (32 ta) — AVVAL joylashtiriladi
            {type:'wall',dx:-4,dy:-4,lv:1},{type:'wall',dx:-3,dy:-4,lv:1},{type:'wall',dx:-2,dy:-4,lv:1},
            {type:'wall',dx:-1,dy:-4,lv:1},{type:'wall',dx: 0,dy:-4,lv:1},{type:'wall',dx: 1,dy:-4,lv:1},
            {type:'wall',dx: 2,dy:-4,lv:1},{type:'wall',dx: 3,dy:-4,lv:1},{type:'wall',dx: 4,dy:-4,lv:1},
            {type:'wall',dx:-4,dy: 4,lv:1},{type:'wall',dx:-3,dy: 4,lv:1},{type:'wall',dx:-2,dy: 4,lv:1},
            {type:'wall',dx:-1,dy: 4,lv:1},{type:'gate',dx: 0,dy: 4,lv:1},{type:'wall',dx: 1,dy: 4,lv:1},
            {type:'wall',dx: 2,dy: 4,lv:1},{type:'wall',dx: 3,dy: 4,lv:1},{type:'wall',dx: 4,dy: 4,lv:1},
            {type:'wall',dx:-4,dy:-3,lv:1},{type:'wall',dx:-4,dy:-2,lv:1},{type:'wall',dx:-4,dy:-1,lv:1},
            {type:'wall',dx:-4,dy: 0,lv:1},{type:'wall',dx:-4,dy: 1,lv:1},{type:'wall',dx:-4,dy: 2,lv:1},
            {type:'wall',dx:-4,dy: 3,lv:1},
            {type:'wall',dx: 4,dy:-3,lv:1},{type:'wall',dx: 4,dy:-2,lv:1},{type:'wall',dx: 4,dy:-1,lv:1},
            {type:'wall',dx: 4,dy: 0,lv:1},{type:'wall',dx: 4,dy: 1,lv:1},{type:'wall',dx: 4,dy: 2,lv:1},
            {type:'wall',dx: 4,dy: 3,lv:1},
            // Mudofaa DEVOR ICHIDA (burchaklarda)
            { type: 'archerTower', dx:  3, dy: -2, lv: 1 },  // NE ichki burchak
            { type: 'archerTower', dx: -2, dy:  3, lv: 1 },  // SW ichki burchak
            // Resurslar TASHQARIDA
            { type: 'villa',       dx: -6, dy:  3, lv: 1 },
            { type: 'farm',        dx:  6, dy: -2, lv: 1 },
            { type: 'goldStorage', dx:  0, dy: -6, lv: 1 },
        ]
    },

    // ── DARA 4: Ikki qavat mudofaa (TH3) ─────────────────────────────────────
    {
        id: 4,
        name: 'Legio Qal\'asi',
        description: 'Ikki qavatli devor va uchta archer minorasi.',
        region: 'Italia',
        regionIcon: '⛰️',
        difficulty: 2,
        thLevel: 3,
        loot: { gold: [4000, 6000], food: [3000, 4500] },
        xpReward: 90,
        trophyReward: 15,
        buildings: [
            { type: 'cityHall',    dx:  0, dy:  0, lv: 3 },
            // R=4 to'liq devor halqasi (32 ta)
            {type:'wall',dx:-4,dy:-4,lv:2},{type:'wall',dx:-3,dy:-4,lv:2},{type:'wall',dx:-2,dy:-4,lv:2},
            {type:'wall',dx:-1,dy:-4,lv:2},{type:'wall',dx: 0,dy:-4,lv:2},{type:'wall',dx: 1,dy:-4,lv:2},
            {type:'wall',dx: 2,dy:-4,lv:2},{type:'wall',dx: 3,dy:-4,lv:2},{type:'wall',dx: 4,dy:-4,lv:2},
            {type:'wall',dx:-4,dy: 4,lv:2},{type:'wall',dx:-3,dy: 4,lv:2},{type:'wall',dx:-2,dy: 4,lv:2},
            {type:'wall',dx:-1,dy: 4,lv:2},{type:'gate',dx: 0,dy: 4,lv:2},{type:'wall',dx: 1,dy: 4,lv:2},
            {type:'wall',dx: 2,dy: 4,lv:2},{type:'wall',dx: 3,dy: 4,lv:2},{type:'wall',dx: 4,dy: 4,lv:2},
            {type:'wall',dx:-4,dy:-3,lv:2},{type:'wall',dx:-4,dy:-2,lv:2},{type:'wall',dx:-4,dy:-1,lv:2},
            {type:'wall',dx:-4,dy: 0,lv:2},{type:'wall',dx:-4,dy: 1,lv:2},{type:'wall',dx:-4,dy: 2,lv:2},
            {type:'wall',dx:-4,dy: 3,lv:2},
            {type:'wall',dx: 4,dy:-3,lv:2},{type:'wall',dx: 4,dy:-2,lv:2},{type:'wall',dx: 4,dy:-1,lv:2},
            {type:'wall',dx: 4,dy: 0,lv:2},{type:'wall',dx: 4,dy: 1,lv:2},{type:'wall',dx: 4,dy: 2,lv:2},
            {type:'wall',dx: 4,dy: 3,lv:2},
            // Mudofaa DEVOR ICHIDA — 3 AT + 1 scorpio
            { type: 'archerTower', dx: -2, dy: -2, lv: 2 },  // NW
            { type: 'archerTower', dx:  3, dy: -2, lv: 2 },  // NE
            { type: 'archerTower', dx:  3, dy:  3, lv: 2 },  // SE
            { type: 'scorpio',     dx: -2, dy:  3, lv: 1 },  // SW
            // Resurslar TASHQARIDA
            { type: 'villa',       dx: -7, dy:  0, lv: 2 },
            { type: 'villa',       dx:  7, dy:  0, lv: 2 },
            { type: 'farm',        dx:  0, dy: -6, lv: 2 },
            { type: 'goldStorage', dx: -5, dy:  5, lv: 2 },
        ]
    },

    // ── DARA 5: Scorpio mudofaasi (TH4) ──────────────────────────────────────
    {
        id: 5,
        name: 'Rim Markazi',
        description: 'Kuchli scorpiolar. Taktikani o\'ylang.',
        region: 'Roma',
        regionIcon: '🏛️',
        difficulty: 3,
        thLevel: 4,
        loot: { gold: [8000, 12000], food: [6000, 9000] },
        xpReward: 130,
        trophyReward: 20,
        buildings: [
            { type: 'cityHall',    dx:  0, dy:  0, lv: 4 },
            // R=4 to'liq devor halqasi (32 ta)
            {type:'wall',dx:-4,dy:-4,lv:3},{type:'wall',dx:-3,dy:-4,lv:3},{type:'wall',dx:-2,dy:-4,lv:3},
            {type:'wall',dx:-1,dy:-4,lv:3},{type:'wall',dx: 0,dy:-4,lv:3},{type:'wall',dx: 1,dy:-4,lv:3},
            {type:'wall',dx: 2,dy:-4,lv:3},{type:'wall',dx: 3,dy:-4,lv:3},{type:'wall',dx: 4,dy:-4,lv:3},
            {type:'wall',dx:-4,dy: 4,lv:3},{type:'wall',dx:-3,dy: 4,lv:3},{type:'wall',dx:-2,dy: 4,lv:3},
            {type:'wall',dx:-1,dy: 4,lv:3},{type:'gate',dx: 0,dy: 4,lv:3},{type:'wall',dx: 1,dy: 4,lv:3},
            {type:'wall',dx: 2,dy: 4,lv:3},{type:'wall',dx: 3,dy: 4,lv:3},{type:'wall',dx: 4,dy: 4,lv:3},
            {type:'wall',dx:-4,dy:-3,lv:3},{type:'wall',dx:-4,dy:-2,lv:3},{type:'wall',dx:-4,dy:-1,lv:3},
            {type:'wall',dx:-4,dy: 0,lv:3},{type:'wall',dx:-4,dy: 1,lv:3},{type:'wall',dx:-4,dy: 2,lv:3},
            {type:'wall',dx:-4,dy: 3,lv:3},
            {type:'wall',dx: 4,dy:-3,lv:3},{type:'wall',dx: 4,dy:-2,lv:3},{type:'wall',dx: 4,dy:-1,lv:3},
            {type:'wall',dx: 4,dy: 0,lv:3},{type:'wall',dx: 4,dy: 1,lv:3},{type:'wall',dx: 4,dy: 2,lv:3},
            {type:'wall',dx: 4,dy: 3,lv:3},
            // Mudofaa DEVOR ICHIDA — 4 AT + 2 scorpio (to'la to'ldirilgan burchaklar)
            { type: 'archerTower', dx: -2, dy: -2, lv: 3 },  // NW
            { type: 'archerTower', dx:  3, dy: -2, lv: 3 },  // NE
            { type: 'archerTower', dx: -2, dy:  3, lv: 3 },  // SW
            { type: 'archerTower', dx:  3, dy:  3, lv: 3 },  // SE
            { type: 'scorpio',     dx: -2, dy:  0, lv: 2 },  // G'arb
            { type: 'scorpio',     dx:  3, dy:  0, lv: 2 },  // Sharq
            // Resurslar TASHQARIDA
            { type: 'villa',       dx: -7, dy:  0, lv: 3 },
            { type: 'farm',        dx:  7, dy:  0, lv: 3 },
            { type: 'goldStorage', dx:  0, dy:  7, lv: 3 },
            { type: 'foodStorage', dx:  0, dy: -7, lv: 3 },
        ]
    },

    // ── DARA 6: Mortarlar (TH5) ───────────────────────────────────────────────
    {
        id: 6,
        name: 'Senator\'ning Qal\'asi',
        description: 'Birinchi tormenta bilan tanishing. Tez kiring!',
        region: 'Roma',
        regionIcon: '🏛️',
        difficulty: 3,
        thLevel: 5,
        loot: { gold: [15000, 22000], food: [12000, 18000] },
        xpReward: 180,
        trophyReward: 25,
        buildings: [
            { type: 'cityHall',    dx:  0, dy:  0, lv: 5 },
            // R=4 TO'LIQ devor halqasi (32 ta)
            {type:'wall',dx:-4,dy:-4,lv:4},{type:'wall',dx:-3,dy:-4,lv:4},{type:'wall',dx:-2,dy:-4,lv:4},
            {type:'wall',dx:-1,dy:-4,lv:4},{type:'wall',dx: 0,dy:-4,lv:4},{type:'wall',dx: 1,dy:-4,lv:4},
            {type:'wall',dx: 2,dy:-4,lv:4},{type:'wall',dx: 3,dy:-4,lv:4},{type:'wall',dx: 4,dy:-4,lv:4},
            {type:'wall',dx:-4,dy: 4,lv:4},{type:'wall',dx:-3,dy: 4,lv:4},{type:'wall',dx:-2,dy: 4,lv:4},
            {type:'wall',dx:-1,dy: 4,lv:4},{type:'gate',dx: 0,dy: 4,lv:4},{type:'wall',dx: 1,dy: 4,lv:4},
            {type:'wall',dx: 2,dy: 4,lv:4},{type:'wall',dx: 3,dy: 4,lv:4},{type:'wall',dx: 4,dy: 4,lv:4},
            {type:'wall',dx:-4,dy:-3,lv:4},{type:'wall',dx:-4,dy:-2,lv:4},{type:'wall',dx:-4,dy:-1,lv:4},
            {type:'wall',dx:-4,dy: 0,lv:4},{type:'wall',dx:-4,dy: 1,lv:4},{type:'wall',dx:-4,dy: 2,lv:4},
            {type:'wall',dx:-4,dy: 3,lv:4},
            {type:'wall',dx: 4,dy:-3,lv:4},{type:'wall',dx: 4,dy:-2,lv:4},{type:'wall',dx: 4,dy:-1,lv:4},
            {type:'wall',dx: 4,dy: 0,lv:4},{type:'wall',dx: 4,dy: 1,lv:4},{type:'wall',dx: 4,dy: 2,lv:4},
            {type:'wall',dx: 4,dy: 3,lv:4},
            // Mudofaa DEVOR ICHIDA — 8 pozitsiya to'liq (4 AT + 2 tormenta + 1 scorpio + 1 archerTower)
            { type: 'archerTower', dx: -2, dy: -2, lv: 4 },  // NW
            { type: 'archerTower', dx:  3, dy: -2, lv: 4 },  // NE
            { type: 'archerTower', dx: -2, dy:  3, lv: 4 },  // SW
            { type: 'archerTower', dx:  3, dy:  3, lv: 4 },  // SE
            { type: 'tormenta',      dx:  0, dy: -2, lv: 2 },  // Shimol
            { type: 'tormenta',      dx:  0, dy:  3, lv: 2 },  // Janub
            { type: 'scorpio',     dx: -2, dy:  0, lv: 3 },  // G'arb
            { type: 'archerTower',      dx:  3, dy:  0, lv: 2 },  // Sharq
            // Resurslar TASHQARIDA
            { type: 'villa',       dx: -7, dy:  3, lv: 4 },
            { type: 'villa',       dx:  7, dy:  3, lv: 4 },
            { type: 'farm',        dx: -7, dy: -3, lv: 4 },
            { type: 'farm',        dx:  7, dy: -3, lv: 4 },
            { type: 'goldStorage', dx: -6, dy:  0, lv: 4 },
            { type: 'foodStorage', dx:  6, dy:  0, lv: 4 },
        ]
    },

    // ── DARA 7: Murakkab mudofaa (TH6) ───────────────────────────────────────
    {
        id: 7,
        name: 'Prokonsul\'ning Imperiyasi',
        description: 'Ko\'p qatlamli mudofaa. Eng zaif tomonni toping.',
        region: 'Carthago',
        regionIcon: '🏜️',
        difficulty: 4,
        thLevel: 6,
        loot: { gold: [30000, 45000], food: [25000, 38000] },
        xpReward: 250,
        trophyReward: 30,
        buildings: [
            { type: 'cityHall',    dx:  0, dy:  0, lv: 6 },
            // R=5 TO'LIQ devor halqasi (40 ta) — ikki qatlamli ko'rinish
            {type:'wall',dx:-5,dy:-5,lv:5},{type:'wall',dx:-4,dy:-5,lv:5},{type:'wall',dx:-3,dy:-5,lv:5},
            {type:'wall',dx:-2,dy:-5,lv:5},{type:'wall',dx:-1,dy:-5,lv:5},{type:'wall',dx: 0,dy:-5,lv:5},
            {type:'wall',dx: 1,dy:-5,lv:5},{type:'wall',dx: 2,dy:-5,lv:5},{type:'wall',dx: 3,dy:-5,lv:5},
            {type:'wall',dx: 4,dy:-5,lv:5},{type:'wall',dx: 5,dy:-5,lv:5},
            {type:'wall',dx:-5,dy: 5,lv:5},{type:'wall',dx:-4,dy: 5,lv:5},{type:'wall',dx:-3,dy: 5,lv:5},
            {type:'wall',dx:-2,dy: 5,lv:5},{type:'wall',dx:-1,dy: 5,lv:5},{type:'gate',dx: 0,dy: 5,lv:5},
            {type:'wall',dx: 1,dy: 5,lv:5},{type:'wall',dx: 2,dy: 5,lv:5},{type:'wall',dx: 3,dy: 5,lv:5},
            {type:'wall',dx: 4,dy: 5,lv:5},{type:'wall',dx: 5,dy: 5,lv:5},
            {type:'wall',dx:-5,dy:-4,lv:5},{type:'wall',dx:-5,dy:-3,lv:5},{type:'wall',dx:-5,dy:-2,lv:5},
            {type:'wall',dx:-5,dy:-1,lv:5},{type:'wall',dx:-5,dy: 0,lv:5},{type:'wall',dx:-5,dy: 1,lv:5},
            {type:'wall',dx:-5,dy: 2,lv:5},{type:'wall',dx:-5,dy: 3,lv:5},{type:'wall',dx:-5,dy: 4,lv:5},
            {type:'wall',dx: 5,dy:-4,lv:5},{type:'wall',dx: 5,dy:-3,lv:5},{type:'wall',dx: 5,dy:-2,lv:5},
            {type:'wall',dx: 5,dy:-1,lv:5},{type:'wall',dx: 5,dy: 0,lv:5},{type:'wall',dx: 5,dy: 1,lv:5},
            {type:'wall',dx: 5,dy: 2,lv:5},{type:'wall',dx: 5,dy: 3,lv:5},{type:'wall',dx: 5,dy: 4,lv:5},
            // Mudofaa DEVOR ICHIDA — 8 qurol (4 AT + 2 tormenta + 1 scorpio + 1 archerTower)
            { type: 'archerTower', dx: -3, dy: -3, lv: 5 },  // NW ichki burchak
            { type: 'archerTower', dx:  4, dy: -3, lv: 5 },  // NE ichki burchak
            { type: 'archerTower', dx: -3, dy:  4, lv: 5 },  // SW ichki burchak
            { type: 'archerTower', dx:  4, dy:  4, lv: 5 },  // SE ichki burchak
            { type: 'tormenta',      dx:  0, dy: -3, lv: 3 },  // Shimol
            { type: 'tormenta',      dx:  4, dy:  0, lv: 3 },  // Sharq-o'rta
            { type: 'scorpio',     dx: -3, dy:  0, lv: 4 },  // G'arb-o'rta
            { type: 'archerTower',      dx:  2, dy: -3, lv: 3 },  // Shimol-sharq
            // Resurslar TASHQARIDA
            { type: 'villa',       dx: -8, dy:  5, lv: 5 },
            { type: 'villa',       dx:  8, dy: -5, lv: 5 },
            { type: 'villa',       dx:  8, dy:  5, lv: 5 },
            { type: 'farm',        dx: -8, dy: -5, lv: 5 },
            { type: 'goldStorage', dx: -7, dy:  1, lv: 5 },
            { type: 'foodStorage', dx:  7, dy:  1, lv: 5 },
        ]
    },

    // ── DARA 8: Inferno Ustasi (TH7) ─────────────────────────────────────────
    {
        id: 8,
        name: 'Alangali Qal\'a',
        description: 'Olov minorasi bilan birinchi uchrashuvingiz!',
        region: 'Carthago',
        regionIcon: '🏜️',
        difficulty: 4,
        thLevel: 7,
        loot: { gold: [60000, 90000], food: [50000, 75000] },
        xpReward: 350,
        trophyReward: 38,
        buildings: [
            { type: 'cityHall',      dx:  0, dy:  0, lv: 7 },
            // R=5 TO'LIQ devor halqasi (40 ta)
            {type:'wall',dx:-5,dy:-5,lv:6},{type:'wall',dx:-4,dy:-5,lv:6},{type:'wall',dx:-3,dy:-5,lv:6},
            {type:'wall',dx:-2,dy:-5,lv:6},{type:'wall',dx:-1,dy:-5,lv:6},{type:'wall',dx: 0,dy:-5,lv:6},
            {type:'wall',dx: 1,dy:-5,lv:6},{type:'wall',dx: 2,dy:-5,lv:6},{type:'wall',dx: 3,dy:-5,lv:6},
            {type:'wall',dx: 4,dy:-5,lv:6},{type:'wall',dx: 5,dy:-5,lv:6},
            {type:'wall',dx:-5,dy: 5,lv:6},{type:'wall',dx:-4,dy: 5,lv:6},{type:'wall',dx:-3,dy: 5,lv:6},
            {type:'wall',dx:-2,dy: 5,lv:6},{type:'wall',dx:-1,dy: 5,lv:6},{type:'gate',dx: 0,dy: 5,lv:6},
            {type:'wall',dx: 1,dy: 5,lv:6},{type:'wall',dx: 2,dy: 5,lv:6},{type:'wall',dx: 3,dy: 5,lv:6},
            {type:'wall',dx: 4,dy: 5,lv:6},{type:'wall',dx: 5,dy: 5,lv:6},
            {type:'wall',dx:-5,dy:-4,lv:6},{type:'wall',dx:-5,dy:-3,lv:6},{type:'wall',dx:-5,dy:-2,lv:6},
            {type:'wall',dx:-5,dy:-1,lv:6},{type:'wall',dx:-5,dy: 0,lv:6},{type:'wall',dx:-5,dy: 1,lv:6},
            {type:'wall',dx:-5,dy: 2,lv:6},{type:'wall',dx:-5,dy: 3,lv:6},{type:'wall',dx:-5,dy: 4,lv:6},
            {type:'wall',dx: 5,dy:-4,lv:6},{type:'wall',dx: 5,dy:-3,lv:6},{type:'wall',dx: 5,dy:-2,lv:6},
            {type:'wall',dx: 5,dy:-1,lv:6},{type:'wall',dx: 5,dy: 0,lv:6},{type:'wall',dx: 5,dy: 1,lv:6},
            {type:'wall',dx: 5,dy: 2,lv:6},{type:'wall',dx: 5,dy: 3,lv:6},{type:'wall',dx: 5,dy: 4,lv:6},
            // Mudofaa DEVOR ICHIDA — 4 AT + 2 flamingCitadel + 1 mortar + 1 scorpio
            { type: 'archerTower',    dx: -3, dy: -3, lv: 6 },
            { type: 'archerTower',    dx:  4, dy: -3, lv: 6 },
            { type: 'archerTower',    dx: -3, dy:  4, lv: 6 },
            { type: 'archerTower',    dx:  4, dy:  4, lv: 6 },
            { type: 'flamingCitadel', dx: -3, dy:  2, lv: 2 },
            { type: 'flamingCitadel', dx:  2, dy: -3, lv: 2 },
            { type: 'tormenta',         dx:  4, dy:  0, lv: 4 },
            { type: 'scorpio',        dx: -3, dy:  0, lv: 5 },
            // Resurslar TASHQARIDA
            { type: 'villa',       dx: -8, dy:  4, lv: 6 },
            { type: 'villa',       dx:  8, dy: -4, lv: 6 },
            { type: 'farm',        dx: -8, dy: -4, lv: 6 },
            { type: 'goldStorage', dx:  8, dy:  4, lv: 6 },
        ]
    },

    // ── DARA 9: Sehrli Mudofaa (TH7) ─────────────────────────────────────────
    {
        id: 9,
        name: 'Sehrgarlar Qal\'asi',
        description: 'Sehrli minoralarga qarshi kurash. Kuchli himoya!',
        region: 'Graecia',
        regionIcon: '🌊',
        difficulty: 5,
        thLevel: 7,
        loot: { gold: [100000, 150000], food: [80000, 120000] },
        xpReward: 480,
        trophyReward: 45,
        buildings: [
            { type: 'cityHall',    dx:  0, dy:  0, lv: 7 },
            // R=5 TO'LIQ devor halqasi (40 ta)
            {type:'wall',dx:-5,dy:-5,lv:7},{type:'wall',dx:-4,dy:-5,lv:7},{type:'wall',dx:-3,dy:-5,lv:7},
            {type:'wall',dx:-2,dy:-5,lv:7},{type:'wall',dx:-1,dy:-5,lv:7},{type:'wall',dx: 0,dy:-5,lv:7},
            {type:'wall',dx: 1,dy:-5,lv:7},{type:'wall',dx: 2,dy:-5,lv:7},{type:'wall',dx: 3,dy:-5,lv:7},
            {type:'wall',dx: 4,dy:-5,lv:7},{type:'wall',dx: 5,dy:-5,lv:7},
            {type:'wall',dx:-5,dy: 5,lv:7},{type:'wall',dx:-4,dy: 5,lv:7},{type:'wall',dx:-3,dy: 5,lv:7},
            {type:'wall',dx:-2,dy: 5,lv:7},{type:'wall',dx:-1,dy: 5,lv:7},{type:'gate',dx: 0,dy: 5,lv:7},
            {type:'wall',dx: 1,dy: 5,lv:7},{type:'wall',dx: 2,dy: 5,lv:7},{type:'wall',dx: 3,dy: 5,lv:7},
            {type:'wall',dx: 4,dy: 5,lv:7},{type:'wall',dx: 5,dy: 5,lv:7},
            {type:'wall',dx:-5,dy:-4,lv:7},{type:'wall',dx:-5,dy:-3,lv:7},{type:'wall',dx:-5,dy:-2,lv:7},
            {type:'wall',dx:-5,dy:-1,lv:7},{type:'wall',dx:-5,dy: 0,lv:7},{type:'wall',dx:-5,dy: 1,lv:7},
            {type:'wall',dx:-5,dy: 2,lv:7},{type:'wall',dx:-5,dy: 3,lv:7},{type:'wall',dx:-5,dy: 4,lv:7},
            {type:'wall',dx: 5,dy:-4,lv:7},{type:'wall',dx: 5,dy:-3,lv:7},{type:'wall',dx: 5,dy:-2,lv:7},
            {type:'wall',dx: 5,dy:-1,lv:7},{type:'wall',dx: 5,dy: 0,lv:7},{type:'wall',dx: 5,dy: 1,lv:7},
            {type:'wall',dx: 5,dy: 2,lv:7},{type:'wall',dx: 5,dy: 3,lv:7},{type:'wall',dx: 5,dy: 4,lv:7},
            // Mudofaa DEVOR ICHIDA — 3 AT + 2 magicTower + 2 mortar + 1 scorpio
            { type: 'archerTower', dx: -3, dy: -3, lv: 7 },
            { type: 'archerTower', dx:  4, dy:  4, lv: 7 },
            { type: 'archerTower', dx:  0, dy: -3, lv: 7 },
            { type: 'magicTower',  dx:  4, dy: -3, lv: 2 },
            { type: 'magicTower',  dx: -3, dy:  4, lv: 2 },
            { type: 'tormenta',      dx: -3, dy:  0, lv: 5 },
            { type: 'tormenta',      dx:  4, dy:  0, lv: 5 },
            { type: 'scorpio',     dx:  0, dy:  4, lv: 5 },
            // Resurslar TASHQARIDA
            { type: 'villa',       dx: -8, dy:  5, lv: 7 },
            { type: 'villa',       dx:  8, dy: -5, lv: 7 },
            { type: 'farm',        dx:  8, dy:  5, lv: 7 },
            { type: 'goldStorage', dx: -8, dy: -5, lv: 7 },
        ]
    },

    // ── DARA 10: Ultimatum (TH8) ─────────────────────────────────────────────
    {
        id: 10,
        name: 'Praefect\'ning Buyuk Qal\'asi',
        description: 'Eng kuchli mudofaa. Barcha turlar birga!',
        region: 'Graecia',
        regionIcon: '🌊',
        difficulty: 5,
        thLevel: 8,
        loot: { gold: [200000, 300000], food: [160000, 240000] },
        xpReward: 650,
        trophyReward: 55,
        buildings: [
            { type: 'cityHall',      dx:  0, dy:  0, lv: 8 },
            // ── Ichki R=3 halqa (24 ta) ──
            {type:'wall',dx:-3,dy:-3,lv:8},{type:'wall',dx:-2,dy:-3,lv:8},{type:'wall',dx:-1,dy:-3,lv:8},
            {type:'wall',dx: 0,dy:-3,lv:8},{type:'wall',dx: 1,dy:-3,lv:8},{type:'wall',dx: 2,dy:-3,lv:8},
            {type:'wall',dx: 3,dy:-3,lv:8},
            {type:'wall',dx:-3,dy: 3,lv:8},{type:'wall',dx:-2,dy: 3,lv:8},{type:'wall',dx:-1,dy: 3,lv:8},
            {type:'gate',dx: 0,dy: 3,lv:8},{type:'wall',dx: 1,dy: 3,lv:8},{type:'wall',dx: 2,dy: 3,lv:8},
            {type:'wall',dx: 3,dy: 3,lv:8},
            {type:'wall',dx:-3,dy:-2,lv:8},{type:'wall',dx:-3,dy:-1,lv:8},{type:'wall',dx:-3,dy: 0,lv:8},
            {type:'wall',dx:-3,dy: 1,lv:8},{type:'wall',dx:-3,dy: 2,lv:8},
            {type:'wall',dx: 3,dy:-2,lv:8},{type:'wall',dx: 3,dy:-1,lv:8},{type:'wall',dx: 3,dy: 0,lv:8},
            {type:'wall',dx: 3,dy: 1,lv:8},{type:'wall',dx: 3,dy: 2,lv:8},
            // ── Tashqi R=6 halqa (48 ta) ──
            {type:'wall',dx:-6,dy:-6,lv:8},{type:'wall',dx:-5,dy:-6,lv:8},{type:'wall',dx:-4,dy:-6,lv:8},
            {type:'wall',dx:-3,dy:-6,lv:8},{type:'wall',dx:-2,dy:-6,lv:8},{type:'wall',dx:-1,dy:-6,lv:8},
            {type:'wall',dx: 0,dy:-6,lv:8},{type:'wall',dx: 1,dy:-6,lv:8},{type:'wall',dx: 2,dy:-6,lv:8},
            {type:'wall',dx: 3,dy:-6,lv:8},{type:'wall',dx: 4,dy:-6,lv:8},{type:'wall',dx: 5,dy:-6,lv:8},
            {type:'wall',dx: 6,dy:-6,lv:8},
            {type:'wall',dx:-6,dy: 6,lv:8},{type:'wall',dx:-5,dy: 6,lv:8},{type:'wall',dx:-4,dy: 6,lv:8},
            {type:'wall',dx:-3,dy: 6,lv:8},{type:'wall',dx:-2,dy: 6,lv:8},{type:'wall',dx:-1,dy: 6,lv:8},
            {type:'gate',dx: 0,dy: 6,lv:8},{type:'wall',dx: 1,dy: 6,lv:8},{type:'wall',dx: 2,dy: 6,lv:8},
            {type:'wall',dx: 3,dy: 6,lv:8},{type:'wall',dx: 4,dy: 6,lv:8},{type:'wall',dx: 5,dy: 6,lv:8},
            {type:'wall',dx: 6,dy: 6,lv:8},
            {type:'wall',dx:-6,dy:-5,lv:8},{type:'wall',dx:-6,dy:-4,lv:8},{type:'wall',dx:-6,dy:-3,lv:8},
            {type:'wall',dx:-6,dy:-2,lv:8},{type:'wall',dx:-6,dy:-1,lv:8},{type:'wall',dx:-6,dy: 0,lv:8},
            {type:'wall',dx:-6,dy: 1,lv:8},{type:'wall',dx:-6,dy: 2,lv:8},{type:'wall',dx:-6,dy: 3,lv:8},
            {type:'wall',dx:-6,dy: 4,lv:8},{type:'wall',dx:-6,dy: 5,lv:8},
            {type:'wall',dx: 6,dy:-5,lv:8},{type:'wall',dx: 6,dy:-4,lv:8},{type:'wall',dx: 6,dy:-3,lv:8},
            {type:'wall',dx: 6,dy:-2,lv:8},{type:'wall',dx: 6,dy:-1,lv:8},{type:'wall',dx: 6,dy: 0,lv:8},
            {type:'wall',dx: 6,dy: 1,lv:8},{type:'wall',dx: 6,dy: 2,lv:8},{type:'wall',dx: 6,dy: 3,lv:8},
            {type:'wall',dx: 6,dy: 4,lv:8},{type:'wall',dx: 6,dy: 5,lv:8},
            // ── Mudofaa HALQALAR ORASIDA — 11 ta qurol ──
            { type: 'archerTower',    dx: -4, dy: -4, lv: 8 },
            { type: 'archerTower',    dx:  5, dy: -4, lv: 8 },
            { type: 'archerTower',    dx: -4, dy:  5, lv: 8 },
            { type: 'archerTower',    dx:  5, dy:  5, lv: 8 },
            { type: 'flamingCitadel', dx:  5, dy: -2, lv: 4 },
            { type: 'flamingCitadel', dx: -4, dy: -2, lv: 4 },
            { type: 'magicTower',     dx: -4, dy:  0, lv: 3 },
            { type: 'tormenta',         dx:  0, dy: -4, lv: 6 },
            { type: 'tormenta',         dx:  0, dy:  5, lv: 6 },
            { type: 'scorpio',        dx:  5, dy:  0, lv: 6 },
            { type: 'archerTower',         dx:  5, dy:  2, lv: 5 },
            // ── Resurslar TASHQARIDA ──
            { type: 'villa',       dx: -9, dy: -6, lv: 8 },
            { type: 'villa',       dx:  9, dy: -6, lv: 8 },
            { type: 'villa',       dx: -9, dy:  6, lv: 8 },
            { type: 'farm',        dx:  9, dy:  6, lv: 8 },
            { type: 'goldStorage', dx:  0, dy: -9, lv: 8 },
            { type: 'foodStorage', dx:  0, dy:  9, lv: 8 },
        ]
    },

    // ── DARA 11: Qo'sh Inferno (TH8) ─────────────────────────────────────────
    {
        id: 11,
        name: 'Infernal Qal\'a',
        description: 'To\'rtta olov minorasi. Tez askarlar kerak!',
        region: 'Aegyptus',
        regionIcon: '🌅',
        difficulty: 6,
        thLevel: 8,
        loot: { gold: [350000, 500000], food: [280000, 400000] },
        xpReward: 850,
        trophyReward: 65,
        buildings: [
            { type: 'cityHall',      dx:  0, dy:  0, lv: 8 },
            // ── Ichki R=3 halqa (24 ta) ──
            {type:'wall',dx:-3,dy:-3,lv:8},{type:'wall',dx:-2,dy:-3,lv:8},{type:'wall',dx:-1,dy:-3,lv:8},
            {type:'wall',dx: 0,dy:-3,lv:8},{type:'wall',dx: 1,dy:-3,lv:8},{type:'wall',dx: 2,dy:-3,lv:8},
            {type:'wall',dx: 3,dy:-3,lv:8},
            {type:'wall',dx:-3,dy: 3,lv:8},{type:'wall',dx:-2,dy: 3,lv:8},{type:'wall',dx:-1,dy: 3,lv:8},
            {type:'gate',dx: 0,dy: 3,lv:8},{type:'wall',dx: 1,dy: 3,lv:8},{type:'wall',dx: 2,dy: 3,lv:8},
            {type:'wall',dx: 3,dy: 3,lv:8},
            {type:'wall',dx:-3,dy:-2,lv:8},{type:'wall',dx:-3,dy:-1,lv:8},{type:'wall',dx:-3,dy: 0,lv:8},
            {type:'wall',dx:-3,dy: 1,lv:8},{type:'wall',dx:-3,dy: 2,lv:8},
            {type:'wall',dx: 3,dy:-2,lv:8},{type:'wall',dx: 3,dy:-1,lv:8},{type:'wall',dx: 3,dy: 0,lv:8},
            {type:'wall',dx: 3,dy: 1,lv:8},{type:'wall',dx: 3,dy: 2,lv:8},
            // ── Tashqi R=6 halqa (48 ta) ──
            {type:'wall',dx:-6,dy:-6,lv:8},{type:'wall',dx:-5,dy:-6,lv:8},{type:'wall',dx:-4,dy:-6,lv:8},
            {type:'wall',dx:-3,dy:-6,lv:8},{type:'wall',dx:-2,dy:-6,lv:8},{type:'wall',dx:-1,dy:-6,lv:8},
            {type:'wall',dx: 0,dy:-6,lv:8},{type:'wall',dx: 1,dy:-6,lv:8},{type:'wall',dx: 2,dy:-6,lv:8},
            {type:'wall',dx: 3,dy:-6,lv:8},{type:'wall',dx: 4,dy:-6,lv:8},{type:'wall',dx: 5,dy:-6,lv:8},
            {type:'wall',dx: 6,dy:-6,lv:8},
            {type:'wall',dx:-6,dy: 6,lv:8},{type:'wall',dx:-5,dy: 6,lv:8},{type:'wall',dx:-4,dy: 6,lv:8},
            {type:'wall',dx:-3,dy: 6,lv:8},{type:'wall',dx:-2,dy: 6,lv:8},{type:'wall',dx:-1,dy: 6,lv:8},
            {type:'gate',dx: 0,dy: 6,lv:8},{type:'wall',dx: 1,dy: 6,lv:8},{type:'wall',dx: 2,dy: 6,lv:8},
            {type:'wall',dx: 3,dy: 6,lv:8},{type:'wall',dx: 4,dy: 6,lv:8},{type:'wall',dx: 5,dy: 6,lv:8},
            {type:'wall',dx: 6,dy: 6,lv:8},
            {type:'wall',dx:-6,dy:-5,lv:8},{type:'wall',dx:-6,dy:-4,lv:8},{type:'wall',dx:-6,dy:-3,lv:8},
            {type:'wall',dx:-6,dy:-2,lv:8},{type:'wall',dx:-6,dy:-1,lv:8},{type:'wall',dx:-6,dy: 0,lv:8},
            {type:'wall',dx:-6,dy: 1,lv:8},{type:'wall',dx:-6,dy: 2,lv:8},{type:'wall',dx:-6,dy: 3,lv:8},
            {type:'wall',dx:-6,dy: 4,lv:8},{type:'wall',dx:-6,dy: 5,lv:8},
            {type:'wall',dx: 6,dy:-5,lv:8},{type:'wall',dx: 6,dy:-4,lv:8},{type:'wall',dx: 6,dy:-3,lv:8},
            {type:'wall',dx: 6,dy:-2,lv:8},{type:'wall',dx: 6,dy:-1,lv:8},{type:'wall',dx: 6,dy: 0,lv:8},
            {type:'wall',dx: 6,dy: 1,lv:8},{type:'wall',dx: 6,dy: 2,lv:8},{type:'wall',dx: 6,dy: 3,lv:8},
            {type:'wall',dx: 6,dy: 4,lv:8},{type:'wall',dx: 6,dy: 5,lv:8},
            // ── Mudofaa HALQALAR ORASIDA — 4 AT + 4 flamingCitadel + 2 mortar + 2 scorpio ──
            { type: 'archerTower',    dx: -4, dy: -4, lv: 8 },
            { type: 'archerTower',    dx:  5, dy: -4, lv: 8 },
            { type: 'archerTower',    dx: -4, dy:  5, lv: 8 },
            { type: 'archerTower',    dx:  5, dy:  5, lv: 8 },
            { type: 'flamingCitadel', dx: -4, dy:  0, lv: 5 },
            { type: 'flamingCitadel', dx:  5, dy:  0, lv: 5 },
            { type: 'flamingCitadel', dx: -4, dy: -2, lv: 5 },
            { type: 'flamingCitadel', dx:  5, dy: -2, lv: 5 },
            { type: 'tormenta',         dx:  0, dy: -4, lv: 6 },
            { type: 'tormenta',         dx:  0, dy:  5, lv: 6 },
            { type: 'scorpio',        dx: -4, dy:  2, lv: 6 },
            { type: 'scorpio',        dx:  5, dy:  2, lv: 6 },
            // ── Resurslar TASHQARIDA ──
            { type: 'villa',       dx: -9, dy: -7, lv: 8 },
            { type: 'villa',       dx:  9, dy:  7, lv: 8 },
            { type: 'farm',        dx:  9, dy: -7, lv: 8 },
            { type: 'goldStorage', dx: -9, dy:  7, lv: 8 },
        ]
    },

    // ── DARA 12: TH9 Imperia (TH9) ───────────────────────────────────────────
    {
        id: 12,
        name: 'Imperator\'ning Shahri',
        description: 'TH9 kuchli baza. Juda kuchli mudofaa!',
        region: 'Aegyptus',
        regionIcon: '🌅',
        difficulty: 7,
        thLevel: 9,
        loot: { gold: [600000, 900000], food: [500000, 750000] },
        xpReward: 1100,
        trophyReward: 75,
        buildings: [
            { type: 'cityHall',      dx:  0, dy:  0, lv: 9 },
            // ── Ichki R=3 halqa (24 ta) ──
            {type:'wall',dx:-3,dy:-3,lv:9},{type:'wall',dx:-2,dy:-3,lv:9},{type:'wall',dx:-1,dy:-3,lv:9},
            {type:'wall',dx: 0,dy:-3,lv:9},{type:'wall',dx: 1,dy:-3,lv:9},{type:'wall',dx: 2,dy:-3,lv:9},
            {type:'wall',dx: 3,dy:-3,lv:9},
            {type:'wall',dx:-3,dy: 3,lv:9},{type:'wall',dx:-2,dy: 3,lv:9},{type:'wall',dx:-1,dy: 3,lv:9},
            {type:'gate',dx: 0,dy: 3,lv:9},{type:'wall',dx: 1,dy: 3,lv:9},{type:'wall',dx: 2,dy: 3,lv:9},
            {type:'wall',dx: 3,dy: 3,lv:9},
            {type:'wall',dx:-3,dy:-2,lv:9},{type:'wall',dx:-3,dy:-1,lv:9},{type:'wall',dx:-3,dy: 0,lv:9},
            {type:'wall',dx:-3,dy: 1,lv:9},{type:'wall',dx:-3,dy: 2,lv:9},
            {type:'wall',dx: 3,dy:-2,lv:9},{type:'wall',dx: 3,dy:-1,lv:9},{type:'wall',dx: 3,dy: 0,lv:9},
            {type:'wall',dx: 3,dy: 1,lv:9},{type:'wall',dx: 3,dy: 2,lv:9},
            // ── Tashqi R=6 halqa (48 ta) ──
            {type:'wall',dx:-6,dy:-6,lv:9},{type:'wall',dx:-5,dy:-6,lv:9},{type:'wall',dx:-4,dy:-6,lv:9},
            {type:'wall',dx:-3,dy:-6,lv:9},{type:'wall',dx:-2,dy:-6,lv:9},{type:'wall',dx:-1,dy:-6,lv:9},
            {type:'wall',dx: 0,dy:-6,lv:9},{type:'wall',dx: 1,dy:-6,lv:9},{type:'wall',dx: 2,dy:-6,lv:9},
            {type:'wall',dx: 3,dy:-6,lv:9},{type:'wall',dx: 4,dy:-6,lv:9},{type:'wall',dx: 5,dy:-6,lv:9},
            {type:'wall',dx: 6,dy:-6,lv:9},
            {type:'wall',dx:-6,dy: 6,lv:9},{type:'wall',dx:-5,dy: 6,lv:9},{type:'wall',dx:-4,dy: 6,lv:9},
            {type:'wall',dx:-3,dy: 6,lv:9},{type:'wall',dx:-2,dy: 6,lv:9},{type:'wall',dx:-1,dy: 6,lv:9},
            {type:'gate',dx: 0,dy: 6,lv:9},{type:'wall',dx: 1,dy: 6,lv:9},{type:'wall',dx: 2,dy: 6,lv:9},
            {type:'wall',dx: 3,dy: 6,lv:9},{type:'wall',dx: 4,dy: 6,lv:9},{type:'wall',dx: 5,dy: 6,lv:9},
            {type:'wall',dx: 6,dy: 6,lv:9},
            {type:'wall',dx:-6,dy:-5,lv:9},{type:'wall',dx:-6,dy:-4,lv:9},{type:'wall',dx:-6,dy:-3,lv:9},
            {type:'wall',dx:-6,dy:-2,lv:9},{type:'wall',dx:-6,dy:-1,lv:9},{type:'wall',dx:-6,dy: 0,lv:9},
            {type:'wall',dx:-6,dy: 1,lv:9},{type:'wall',dx:-6,dy: 2,lv:9},{type:'wall',dx:-6,dy: 3,lv:9},
            {type:'wall',dx:-6,dy: 4,lv:9},{type:'wall',dx:-6,dy: 5,lv:9},
            {type:'wall',dx: 6,dy:-5,lv:9},{type:'wall',dx: 6,dy:-4,lv:9},{type:'wall',dx: 6,dy:-3,lv:9},
            {type:'wall',dx: 6,dy:-2,lv:9},{type:'wall',dx: 6,dy:-1,lv:9},{type:'wall',dx: 6,dy: 0,lv:9},
            {type:'wall',dx: 6,dy: 1,lv:9},{type:'wall',dx: 6,dy: 2,lv:9},{type:'wall',dx: 6,dy: 3,lv:9},
            {type:'wall',dx: 6,dy: 4,lv:9},{type:'wall',dx: 6,dy: 5,lv:9},
            // ── Mudofaa HALQALAR ORASIDA — 13 ta qurol ──
            { type: 'archerTower',    dx: -4, dy: -4, lv: 9 },
            { type: 'archerTower',    dx:  5, dy: -4, lv: 9 },
            { type: 'archerTower',    dx: -4, dy:  5, lv: 9 },
            { type: 'archerTower',    dx:  5, dy:  5, lv: 9 },
            { type: 'magicTower',     dx:  5, dy: -2, lv: 5 },
            { type: 'magicTower',     dx: -4, dy:  2, lv: 5 },
            { type: 'flamingCitadel', dx: -4, dy: -2, lv: 6 },
            { type: 'flamingCitadel', dx:  5, dy:  2, lv: 6 },
            { type: 'tormenta',         dx:  0, dy: -4, lv: 7 },
            { type: 'tormenta',         dx:  0, dy:  5, lv: 7 },
            { type: 'scorpio',        dx:  5, dy:  0, lv: 7 },
            { type: 'scorpio',        dx: -4, dy:  0, lv: 7 },
            { type: 'archerTower',         dx:  5, dy: -4, lv: 6 },
            // ── Resurslar TASHQARIDA ──
            { type: 'villa',       dx: -9, dy: -6, lv: 9 },
            { type: 'villa',       dx:  9, dy:  6, lv: 9 },
            { type: 'farm',        dx:  9, dy: -6, lv: 9 },
            { type: 'goldStorage', dx: -9, dy:  6, lv: 9 },
            { type: 'foodStorage', dx:  0, dy: -9, lv: 9 },
        ]
    },

    // ── DARA 13: Maxfiy Baza (TH9) ───────────────────────────────────────────
    {
        id: 13,
        name: 'Rim Harbiy Qal\'asi',
        description: 'Yashirin mudofaa tizimi bilan mustahkam qal\'a!',
        region: 'Persia',
        regionIcon: '🌙',
        difficulty: 8,
        thLevel: 9,
        loot: { gold: [900000, 1350000], food: [720000, 1080000] },
        xpReward: 1400,
        trophyReward: 85,
        buildings: [
            { type: 'cityHall',      dx:  0, dy:  0, lv: 9 },
            // ── Ichki R=3 halqa (24 ta) ──
            {type:'wall',dx:-3,dy:-3,lv:9},{type:'wall',dx:-2,dy:-3,lv:9},{type:'wall',dx:-1,dy:-3,lv:9},
            {type:'wall',dx: 0,dy:-3,lv:9},{type:'wall',dx: 1,dy:-3,lv:9},{type:'wall',dx: 2,dy:-3,lv:9},
            {type:'wall',dx: 3,dy:-3,lv:9},
            {type:'wall',dx:-3,dy: 3,lv:9},{type:'wall',dx:-2,dy: 3,lv:9},{type:'wall',dx:-1,dy: 3,lv:9},
            {type:'gate',dx: 0,dy: 3,lv:9},{type:'wall',dx: 1,dy: 3,lv:9},{type:'wall',dx: 2,dy: 3,lv:9},
            {type:'wall',dx: 3,dy: 3,lv:9},
            {type:'wall',dx:-3,dy:-2,lv:9},{type:'wall',dx:-3,dy:-1,lv:9},{type:'wall',dx:-3,dy: 0,lv:9},
            {type:'wall',dx:-3,dy: 1,lv:9},{type:'wall',dx:-3,dy: 2,lv:9},
            {type:'wall',dx: 3,dy:-2,lv:9},{type:'wall',dx: 3,dy:-1,lv:9},{type:'wall',dx: 3,dy: 0,lv:9},
            {type:'wall',dx: 3,dy: 1,lv:9},{type:'wall',dx: 3,dy: 2,lv:9},
            // ── Tashqi R=6 halqa (48 ta) ──
            {type:'wall',dx:-6,dy:-6,lv:9},{type:'wall',dx:-5,dy:-6,lv:9},{type:'wall',dx:-4,dy:-6,lv:9},
            {type:'wall',dx:-3,dy:-6,lv:9},{type:'wall',dx:-2,dy:-6,lv:9},{type:'wall',dx:-1,dy:-6,lv:9},
            {type:'wall',dx: 0,dy:-6,lv:9},{type:'wall',dx: 1,dy:-6,lv:9},{type:'wall',dx: 2,dy:-6,lv:9},
            {type:'wall',dx: 3,dy:-6,lv:9},{type:'wall',dx: 4,dy:-6,lv:9},{type:'wall',dx: 5,dy:-6,lv:9},
            {type:'wall',dx: 6,dy:-6,lv:9},
            {type:'wall',dx:-6,dy: 6,lv:9},{type:'wall',dx:-5,dy: 6,lv:9},{type:'wall',dx:-4,dy: 6,lv:9},
            {type:'wall',dx:-3,dy: 6,lv:9},{type:'wall',dx:-2,dy: 6,lv:9},{type:'wall',dx:-1,dy: 6,lv:9},
            {type:'gate',dx: 0,dy: 6,lv:9},{type:'wall',dx: 1,dy: 6,lv:9},{type:'wall',dx: 2,dy: 6,lv:9},
            {type:'wall',dx: 3,dy: 6,lv:9},{type:'wall',dx: 4,dy: 6,lv:9},{type:'wall',dx: 5,dy: 6,lv:9},
            {type:'wall',dx: 6,dy: 6,lv:9},
            {type:'wall',dx:-6,dy:-5,lv:9},{type:'wall',dx:-6,dy:-4,lv:9},{type:'wall',dx:-6,dy:-3,lv:9},
            {type:'wall',dx:-6,dy:-2,lv:9},{type:'wall',dx:-6,dy:-1,lv:9},{type:'wall',dx:-6,dy: 0,lv:9},
            {type:'wall',dx:-6,dy: 1,lv:9},{type:'wall',dx:-6,dy: 2,lv:9},{type:'wall',dx:-6,dy: 3,lv:9},
            {type:'wall',dx:-6,dy: 4,lv:9},{type:'wall',dx:-6,dy: 5,lv:9},
            {type:'wall',dx: 6,dy:-5,lv:9},{type:'wall',dx: 6,dy:-4,lv:9},{type:'wall',dx: 6,dy:-3,lv:9},
            {type:'wall',dx: 6,dy:-2,lv:9},{type:'wall',dx: 6,dy:-1,lv:9},{type:'wall',dx: 6,dy: 0,lv:9},
            {type:'wall',dx: 6,dy: 1,lv:9},{type:'wall',dx: 6,dy: 2,lv:9},{type:'wall',dx: 6,dy: 3,lv:9},
            {type:'wall',dx: 6,dy: 4,lv:9},{type:'wall',dx: 6,dy: 5,lv:9},
            // ── Mudofaa HALQALAR ORASIDA — 14 ta qurol ──
            { type: 'archerTower',    dx: -4, dy: -4, lv: 9 },
            { type: 'archerTower',    dx:  5, dy: -4, lv: 9 },
            { type: 'archerTower',    dx: -4, dy:  5, lv: 9 },
            { type: 'archerTower',    dx:  5, dy:  5, lv: 9 },
            { type: 'flamingCitadel', dx: -4, dy: -2, lv: 7 },
            { type: 'flamingCitadel', dx:  5, dy: -2, lv: 7 },
            { type: 'flamingCitadel', dx: -4, dy:  2, lv: 6 },
            { type: 'flamingCitadel', dx:  5, dy:  2, lv: 6 },
            { type: 'magicTower',     dx: -4, dy:  0, lv: 6 },
            { type: 'magicTower',     dx:  5, dy:  0, lv: 6 },
            { type: 'tormenta',         dx:  0, dy: -4, lv: 8 },
            { type: 'tormenta',         dx:  0, dy:  5, lv: 8 },
            { type: 'scorpio',        dx: -5, dy: -4, lv: 8 },
            { type: 'archerTower',         dx:  6, dy: -4, lv: 7 },
            // ── Resurslar TASHQARIDA ──
            { type: 'villa',       dx: -9, dy: -7, lv: 9 },
            { type: 'villa',       dx:  9, dy:  7, lv: 9 },
            { type: 'farm',        dx:  9, dy: -7, lv: 9 },
            { type: 'goldStorage', dx: -9, dy:  7, lv: 9 },
        ]
    },

    // ── DARA 14: Maxima Qal'a (TH10) ─────────────────────────────────────────
    {
        id: 14,
        name: 'Buyuk Rim Imperiyasi',
        description: 'Eng kuchli mudofaa! Maxsus taktika kerak.',
        region: 'Persia',
        regionIcon: '🌙',
        difficulty: 9,
        thLevel: 10,
        loot: { gold: [1500000, 2000000], food: [1200000, 1600000] },
        xpReward: 2000,
        trophyReward: 100,
        buildings: [
            { type: 'cityHall',      dx:  0, dy:  0, lv: 10 },
            // ── Ichki R=3 halqa (24 ta) ──
            {type:'wall',dx:-3,dy:-3,lv:10},{type:'wall',dx:-2,dy:-3,lv:10},{type:'wall',dx:-1,dy:-3,lv:10},
            {type:'wall',dx: 0,dy:-3,lv:10},{type:'wall',dx: 1,dy:-3,lv:10},{type:'wall',dx: 2,dy:-3,lv:10},
            {type:'wall',dx: 3,dy:-3,lv:10},
            {type:'wall',dx:-3,dy: 3,lv:10},{type:'wall',dx:-2,dy: 3,lv:10},{type:'wall',dx:-1,dy: 3,lv:10},
            {type:'gate',dx: 0,dy: 3,lv:10},{type:'wall',dx: 1,dy: 3,lv:10},{type:'wall',dx: 2,dy: 3,lv:10},
            {type:'wall',dx: 3,dy: 3,lv:10},
            {type:'wall',dx:-3,dy:-2,lv:10},{type:'wall',dx:-3,dy:-1,lv:10},{type:'wall',dx:-3,dy: 0,lv:10},
            {type:'wall',dx:-3,dy: 1,lv:10},{type:'wall',dx:-3,dy: 2,lv:10},
            {type:'wall',dx: 3,dy:-2,lv:10},{type:'wall',dx: 3,dy:-1,lv:10},{type:'wall',dx: 3,dy: 0,lv:10},
            {type:'wall',dx: 3,dy: 1,lv:10},{type:'wall',dx: 3,dy: 2,lv:10},
            // ── Tashqi R=7 halqa (56 ta) ──
            {type:'wall',dx:-7,dy:-7,lv:10},{type:'wall',dx:-6,dy:-7,lv:10},{type:'wall',dx:-5,dy:-7,lv:10},
            {type:'wall',dx:-4,dy:-7,lv:10},{type:'wall',dx:-3,dy:-7,lv:10},{type:'wall',dx:-2,dy:-7,lv:10},
            {type:'wall',dx:-1,dy:-7,lv:10},{type:'wall',dx: 0,dy:-7,lv:10},{type:'wall',dx: 1,dy:-7,lv:10},
            {type:'wall',dx: 2,dy:-7,lv:10},{type:'wall',dx: 3,dy:-7,lv:10},{type:'wall',dx: 4,dy:-7,lv:10},
            {type:'wall',dx: 5,dy:-7,lv:10},{type:'wall',dx: 6,dy:-7,lv:10},{type:'wall',dx: 7,dy:-7,lv:10},
            {type:'wall',dx:-7,dy: 7,lv:10},{type:'wall',dx:-6,dy: 7,lv:10},{type:'wall',dx:-5,dy: 7,lv:10},
            {type:'wall',dx:-4,dy: 7,lv:10},{type:'wall',dx:-3,dy: 7,lv:10},{type:'wall',dx:-2,dy: 7,lv:10},
            {type:'wall',dx:-1,dy: 7,lv:10},{type:'gate',dx: 0,dy: 7,lv:10},{type:'wall',dx: 1,dy: 7,lv:10},
            {type:'wall',dx: 2,dy: 7,lv:10},{type:'wall',dx: 3,dy: 7,lv:10},{type:'wall',dx: 4,dy: 7,lv:10},
            {type:'wall',dx: 5,dy: 7,lv:10},{type:'wall',dx: 6,dy: 7,lv:10},{type:'wall',dx: 7,dy: 7,lv:10},
            {type:'wall',dx:-7,dy:-6,lv:10},{type:'wall',dx:-7,dy:-5,lv:10},{type:'wall',dx:-7,dy:-4,lv:10},
            {type:'wall',dx:-7,dy:-3,lv:10},{type:'wall',dx:-7,dy:-2,lv:10},{type:'wall',dx:-7,dy:-1,lv:10},
            {type:'wall',dx:-7,dy: 0,lv:10},{type:'wall',dx:-7,dy: 1,lv:10},{type:'wall',dx:-7,dy: 2,lv:10},
            {type:'wall',dx:-7,dy: 3,lv:10},{type:'wall',dx:-7,dy: 4,lv:10},{type:'wall',dx:-7,dy: 5,lv:10},
            {type:'wall',dx:-7,dy: 6,lv:10},
            {type:'wall',dx: 7,dy:-6,lv:10},{type:'wall',dx: 7,dy:-5,lv:10},{type:'wall',dx: 7,dy:-4,lv:10},
            {type:'wall',dx: 7,dy:-3,lv:10},{type:'wall',dx: 7,dy:-2,lv:10},{type:'wall',dx: 7,dy:-1,lv:10},
            {type:'wall',dx: 7,dy: 0,lv:10},{type:'wall',dx: 7,dy: 1,lv:10},{type:'wall',dx: 7,dy: 2,lv:10},
            {type:'wall',dx: 7,dy: 3,lv:10},{type:'wall',dx: 7,dy: 4,lv:10},{type:'wall',dx: 7,dy: 5,lv:10},
            {type:'wall',dx: 7,dy: 6,lv:10},
            // ── Mudofaa HALQALAR ORASIDA — 16 ta qurol ──
            { type: 'archerTower',    dx: -4, dy: -4, lv: 10 },
            { type: 'archerTower',    dx:  5, dy: -4, lv: 10 },
            { type: 'archerTower',    dx: -4, dy:  5, lv: 10 },
            { type: 'archerTower',    dx:  5, dy:  5, lv: 10 },
            { type: 'archerTower',    dx: -4, dy: -2, lv:  9 },  // G'arb-shimol flank
            { type: 'archerTower',    dx:  5, dy: -2, lv:  9 },  // Sharq-shimol flank
            { type: 'flamingCitadel', dx: -5, dy: -5, lv:  8 },  // Tashqi burchaklar
            { type: 'flamingCitadel', dx:  6, dy: -5, lv:  8 },
            { type: 'magicTower',     dx: -4, dy:  0, lv:  8 },
            { type: 'magicTower',     dx:  5, dy:  0, lv:  8 },
            { type: 'tormenta',         dx:  0, dy: -4, lv:  9 },
            { type: 'tormenta',         dx:  0, dy:  5, lv:  9 },
            { type: 'scorpio',        dx: -4, dy:  2, lv:  9 },
            { type: 'scorpio',        dx:  5, dy:  2, lv:  9 },
            { type: 'archerTower',         dx: -5, dy:  0, lv:  8 },  // Tashqi g'arb
            { type: 'archerTower',         dx:  6, dy:  0, lv:  8 },  // Tashqi sharq
            // ── Resurslar TASHQARIDA (R=7 dan tashqarida) ──
            { type: 'villa',       dx: -10, dy: -8, lv: 10 },
            { type: 'villa',       dx:  10, dy:  8, lv: 10 },
            { type: 'villa',       dx:  10, dy: -8, lv: 10 },
            { type: 'farm',        dx: -10, dy:  8, lv: 10 },
            { type: 'goldStorage', dx:   0, dy: -10, lv: 10 },
            { type: 'foodStorage', dx:   0, dy:  10, lv: 10 },
        ]
    },

    // ── DARA 15: So'nggi Boss (TH10) — MAXFIY ─────────────────────────────────
    {
        id: 15,
        name: '⚡ IMPERATOR\'NIN TAXT ZALI',
        description: 'Eng so\'nggi va eng qiyin daraja. Barcha kuchingizni ishlating!',
        region: '🏛️ Caput Mundi',
        regionIcon: '⚡',
        difficulty: 10,
        thLevel: 10,
        loot: { gold: [2500000, 3000000], food: [2000000, 2500000] },
        xpReward: 3500,
        trophyReward: 150,
        isBoss: true,
        buildings: [
            { type: 'cityHall', dx: 0, dy: 0, lv: 10 },

            // ── ICHKI DEVOR R=3 (24 tile) ──────────────────────────────────────
            // Yuqori qator (dy=-3): 7 wall
            { type:'wall', dx:-3, dy:-3, lv:10 }, { type:'wall', dx:-2, dy:-3, lv:10 },
            { type:'wall', dx:-1, dy:-3, lv:10 }, { type:'wall', dx: 0, dy:-3, lv:10 },
            { type:'wall', dx: 1, dy:-3, lv:10 }, { type:'wall', dx: 2, dy:-3, lv:10 },
            { type:'wall', dx: 3, dy:-3, lv:10 },
            // Chap ustun (dx=-3): 5 wall
            { type:'wall', dx:-3, dy:-2, lv:10 }, { type:'wall', dx:-3, dy:-1, lv:10 },
            { type:'wall', dx:-3, dy: 0, lv:10 }, { type:'wall', dx:-3, dy: 1, lv:10 },
            { type:'wall', dx:-3, dy: 2, lv:10 },
            // O'ng ustun (dx=3): 5 wall
            { type:'wall', dx: 3, dy:-2, lv:10 }, { type:'wall', dx: 3, dy:-1, lv:10 },
            { type:'wall', dx: 3, dy: 0, lv:10 }, { type:'wall', dx: 3, dy: 1, lv:10 },
            { type:'wall', dx: 3, dy: 2, lv:10 },
            // Pastki qator (dy=3): 6 wall + 1 gate
            { type:'wall', dx:-3, dy: 3, lv:10 }, { type:'wall', dx:-2, dy: 3, lv:10 },
            { type:'wall', dx:-1, dy: 3, lv:10 }, { type:'gate', dx: 0, dy: 3, lv:10 },
            { type:'wall', dx: 1, dy: 3, lv:10 }, { type:'wall', dx: 2, dy: 3, lv:10 },
            { type:'wall', dx: 3, dy: 3, lv:10 },

            // ── TASHQI DEVOR R=8 (64 tile) ─────────────────────────────────────
            // Yuqori qator (dy=-8): 17 wall
            { type:'wall', dx:-8, dy:-8, lv:10 }, { type:'wall', dx:-7, dy:-8, lv:10 },
            { type:'wall', dx:-6, dy:-8, lv:10 }, { type:'wall', dx:-5, dy:-8, lv:10 },
            { type:'wall', dx:-4, dy:-8, lv:10 }, { type:'wall', dx:-3, dy:-8, lv:10 },
            { type:'wall', dx:-2, dy:-8, lv:10 }, { type:'wall', dx:-1, dy:-8, lv:10 },
            { type:'wall', dx: 0, dy:-8, lv:10 }, { type:'wall', dx: 1, dy:-8, lv:10 },
            { type:'wall', dx: 2, dy:-8, lv:10 }, { type:'wall', dx: 3, dy:-8, lv:10 },
            { type:'wall', dx: 4, dy:-8, lv:10 }, { type:'wall', dx: 5, dy:-8, lv:10 },
            { type:'wall', dx: 6, dy:-8, lv:10 }, { type:'wall', dx: 7, dy:-8, lv:10 },
            { type:'wall', dx: 8, dy:-8, lv:10 },
            // Chap ustun (dx=-8): 15 wall
            { type:'wall', dx:-8, dy:-7, lv:10 }, { type:'wall', dx:-8, dy:-6, lv:10 },
            { type:'wall', dx:-8, dy:-5, lv:10 }, { type:'wall', dx:-8, dy:-4, lv:10 },
            { type:'wall', dx:-8, dy:-3, lv:10 }, { type:'wall', dx:-8, dy:-2, lv:10 },
            { type:'wall', dx:-8, dy:-1, lv:10 }, { type:'wall', dx:-8, dy: 0, lv:10 },
            { type:'wall', dx:-8, dy: 1, lv:10 }, { type:'wall', dx:-8, dy: 2, lv:10 },
            { type:'wall', dx:-8, dy: 3, lv:10 }, { type:'wall', dx:-8, dy: 4, lv:10 },
            { type:'wall', dx:-8, dy: 5, lv:10 }, { type:'wall', dx:-8, dy: 6, lv:10 },
            { type:'wall', dx:-8, dy: 7, lv:10 },
            // O'ng ustun (dx=8): 15 wall
            { type:'wall', dx: 8, dy:-7, lv:10 }, { type:'wall', dx: 8, dy:-6, lv:10 },
            { type:'wall', dx: 8, dy:-5, lv:10 }, { type:'wall', dx: 8, dy:-4, lv:10 },
            { type:'wall', dx: 8, dy:-3, lv:10 }, { type:'wall', dx: 8, dy:-2, lv:10 },
            { type:'wall', dx: 8, dy:-1, lv:10 }, { type:'wall', dx: 8, dy: 0, lv:10 },
            { type:'wall', dx: 8, dy: 1, lv:10 }, { type:'wall', dx: 8, dy: 2, lv:10 },
            { type:'wall', dx: 8, dy: 3, lv:10 }, { type:'wall', dx: 8, dy: 4, lv:10 },
            { type:'wall', dx: 8, dy: 5, lv:10 }, { type:'wall', dx: 8, dy: 6, lv:10 },
            { type:'wall', dx: 8, dy: 7, lv:10 },
            // Pastki qator (dy=8): 16 wall + 1 gate
            { type:'wall', dx:-8, dy: 8, lv:10 }, { type:'wall', dx:-7, dy: 8, lv:10 },
            { type:'wall', dx:-6, dy: 8, lv:10 }, { type:'wall', dx:-5, dy: 8, lv:10 },
            { type:'wall', dx:-4, dy: 8, lv:10 }, { type:'wall', dx:-3, dy: 8, lv:10 },
            { type:'wall', dx:-2, dy: 8, lv:10 }, { type:'wall', dx:-1, dy: 8, lv:10 },
            { type:'gate', dx: 0, dy: 8, lv:10 },
            { type:'wall', dx: 1, dy: 8, lv:10 }, { type:'wall', dx: 2, dy: 8, lv:10 },
            { type:'wall', dx: 3, dy: 8, lv:10 }, { type:'wall', dx: 4, dy: 8, lv:10 },
            { type:'wall', dx: 5, dy: 8, lv:10 }, { type:'wall', dx: 6, dy: 8, lv:10 },
            { type:'wall', dx: 7, dy: 8, lv:10 }, { type:'wall', dx: 8, dy: 8, lv:10 },

            // ── MUDOFAA BINOLARI (halqalar orasida, 22 ta) ─────────────────────
            // Ichki burchaklar (R=3 dan tashqarida, R=8 dan ichkarida)
            { type: 'archerTower',    dx: -4, dy: -4, lv: 10 },  // SG'-Sh
            { type: 'archerTower',    dx:  5, dy: -4, lv: 10 },  // Sh-Sh
            { type: 'archerTower',    dx: -4, dy:  5, lv: 10 },  // SG'-J
            { type: 'archerTower',    dx:  5, dy:  5, lv: 10 },  // Sh-J
            // Shimol va janub flanklar
            { type: 'archerTower',    dx: -4, dy: -2, lv: 10 },  // G'-Sh flank
            { type: 'archerTower',    dx:  5, dy: -2, lv: 10 },  // O'-Sh flank
            // Tashqi burchaklar (R=8 ga yaqin)
            { type: 'flamingCitadel', dx: -6, dy: -6, lv: 10 },  // SG' tashqi
            { type: 'flamingCitadel', dx:  7, dy: -6, lv: 10 },  // Sh tashqi
            { type: 'flamingCitadel', dx: -6, dy:  7, lv: 10 },  // J-SG' tashqi
            { type: 'flamingCitadel', dx:  7, dy:  7, lv: 10 },  // J-Sh tashqi
            // Magic towerlar — yon o'rtalar
            { type: 'magicTower',     dx: -4, dy:  0, lv: 10 },  // G' o'rta (ichki)
            { type: 'magicTower',     dx:  5, dy:  0, lv: 10 },  // O' o'rta (ichki)
            { type: 'magicTower',     dx: -6, dy:  0, lv: 10 },  // G' o'rta (tashqi)
            { type: 'magicTower',     dx:  7, dy:  0, lv: 10 },  // O' o'rta (tashqi)
            // Mortarlar — shimol-janub o'rtalari
            { type: 'tormenta',         dx:  0, dy: -4, lv: 10 },  // Sh o'rta (ichki)
            { type: 'tormenta',         dx:  0, dy:  5, lv: 10 },  // J o'rta (ichki)
            // BoltTower — diagonal o'rta
            { type: 'boltTower',      dx: -5, dy: -5, lv: 10 },  // SG' diagonal
            { type: 'boltTower',      dx:  6, dy: -5, lv: 10 },  // Sh diagonal
            // Scorpio — yon flanklarida
            { type: 'scorpio',        dx:  0, dy: -6, lv: 10 },  // Sh tashqi o'rta
            { type: 'scorpio',        dx:  0, dy:  7, lv: 10 },  // J tashqi o'rta
            // Cannon — quyi flanklarida
            { type: 'archerTower',         dx: -4, dy:  2, lv: 10 },  // G'-J flank
            { type: 'archerTower',         dx:  5, dy:  2, lv: 10 },  // O'-J flank

            // ── RESURSLAR (R=8 tashqarisida) ───────────────────────────────────
            { type: 'villa',       dx: -10, dy: -8, lv: 10 },
            { type: 'villa',       dx:  10, dy: -8, lv: 10 },
            { type: 'villa',       dx: -10, dy:  8, lv: 10 },
            { type: 'villa',       dx:  10, dy:  8, lv: 10 },
            { type: 'farm',        dx:   0, dy:-10, lv: 10 },
            { type: 'farm',        dx:   0, dy: 10, lv: 10 },
            { type: 'goldStorage', dx: -10, dy:  0, lv: 10 },
            { type: 'foodStorage', dx:  10, dy:  0, lv: 10 },
        ]
    },
];

// Kampaniya progress (localStorage)
const CampaignProgress = {
    _key: 'tc_campaign_v1',

    load() {
        try {
            return JSON.parse(localStorage.getItem(this._key) || '{}');
        } catch { return {}; }
    },

    save(data) {
        localStorage.setItem(this._key, JSON.stringify(data));
    },

    getCompleted(levelId) {
        return this.load()[levelId] || null; // null = locked, {stars, time} = completed
    },

    setCompleted(levelId, stars, timeMs) {
        // CoC: kamida 1 yulduz kerak — 0 yulduz bilan daraja "bajarilmagan" deb hisoblanadi
        if (stars <= 0) return;
        const data = this.load();
        const existing = data[levelId];
        // Faqat yaxshiroq natijani saqlash
        if (!existing || stars > existing.stars || (stars === existing.stars && timeMs < existing.time)) {
            data[levelId] = { stars, time: timeMs, date: Date.now() };
            this.save(data);
        }
    },

    isUnlocked(levelId) {
        if (levelId === 1) return true;
        // Oldingi daraja kamida 1 yulduz bilan bajarilgan bo'lsa ochiladi
        const prev = this.load()[levelId - 1];
        return !!(prev && prev.stars >= 1);
    },

    getTotalStars() {
        const data = this.load();
        return Object.values(data).reduce((sum, v) => sum + (v.stars || 0), 0);
    },

    // Barcha 15 ta daraja kamida 1 yulduz bilan bajarilganmi?
    isAllComplete() {
        if (typeof CAMPAIGN_LEVELS === 'undefined') return false;
        const data = this.load();
        return CAMPAIGN_LEVELS.every(l => {
            const d = data[l.id];
            return d && d.stars >= 1;
        });
    }
};
