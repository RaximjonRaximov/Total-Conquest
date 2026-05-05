// ============================================
// ASKAR MA'LUMOTLARI
// Har bir askar turi: narx, vaqt, kuch, tezlik
// ============================================

const TROOP_DATA = {
    // ===== PIYODA =====
    legionary: {
        name: 'Legioner',
        icon: '⚔️',
        category: 'piyoda',
        tier: 1,
        unlockBarracks: 1,
        cost: { food: 50 },
        time: 15,
        stats: {
            hp: 100,
            damage: 12,
            speed: 1.0,
            range: 1,
            type: 'melee'
        },
        description: 'Asosiy piyoda askari. Arzon va tez yaratiladi.'
    },

    centurion: {
        name: 'Senturion',
        icon: '🛡️',
        category: 'piyoda',
        tier: 2,
        unlockBarracks: 2,
        cost: { food: 120, gold: 50 },
        time: 30,
        stats: {
            hp: 200,
            damage: 18,
            speed: 0.8,
            range: 1,
            type: 'melee'
        },
        description: 'Kuchli piyoda. Yuqori HP, lekin sekin.'
    },

    praetorian: {
        name: 'Pretorianets',
        icon: '🗡️',
        category: 'piyoda',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 250, gold: 150 },
        time: 60,
        stats: {
            hp: 350,
            damage: 30,
            speed: 0.9,
            range: 1,
            type: 'melee'
        },
        description: 'Elit piyoda qo\'riqchisi.'
    },

    gladiator: {
        name: 'Gladiator',
        icon: '⚜️',
        category: 'piyoda',
        tier: 4,
        unlockBarracks: 4,
        cost: { food: 500, gold: 300 },
        time: 120,
        stats: {
            hp: 500,
            damage: 50,
            speed: 1.1,
            range: 1,
            type: 'melee'
        },
        description: 'Eng kuchli yakkama-yakka jangchi.'
    },

    // ===== KAMONCHI =====
    archer: {
        name: 'Kamonchi',
        icon: '🏹',
        category: 'otishma',
        tier: 1,
        unlockBarracks: 1,
        cost: { food: 80, gold: 30 },
        time: 20,
        stats: {
            hp: 60,
            damage: 15,
            speed: 1.0,
            range: 5,
            type: 'ranged'
        },
        description: 'Uzoqdan o\'q otadi, lekin zaif.'
    },

    crossbowman: {
        name: 'Arbaletchi',
        icon: '🎯',
        category: 'otishma',
        tier: 2,
        unlockBarracks: 2,
        cost: { food: 150, gold: 80 },
        time: 35,
        stats: {
            hp: 80,
            damage: 25,
            speed: 0.9,
            range: 6,
            type: 'ranged'
        },
        description: 'Kuchli uzoq masofali otishma askari.'
    },

    scorpioOperator: {
        name: 'Scorpio operatori',
        icon: '🦂',
        category: 'otishma',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 300, gold: 200 },
        time: 75,
        stats: {
            hp: 100,
            damage: 45,
            speed: 0.6,
            range: 8,
            type: 'ranged'
        },
        description: 'Juda kuchli uzoq masofali qurilma.'
    },

    // ===== OTLIQ =====
    cavalry: {
        name: 'Otliq askar',
        icon: '🐴',
        category: 'otliq',
        tier: 2,
        unlockBarracks: 2,
        cost: { food: 200, gold: 100 },
        time: 45,
        stats: {
            hp: 180,
            damage: 22,
            speed: 1.8,
            range: 1,
            type: 'melee'
        },
        description: 'Tez harakat qiladi. Dushman orqasiga hujum uchun.'
    },

    cataphract: {
        name: 'Katafakt',
        icon: '🏇',
        category: 'otliq',
        tier: 3,
        unlockBarracks: 4,
        cost: { food: 400, gold: 250 },
        time: 90,
        stats: {
            hp: 400,
            damage: 35,
            speed: 1.5,
            range: 1,
            type: 'melee'
        },
        description: 'Og\'ir otliq askar. Kuchli va chidamli.'
    },

    // ===== MAXSUS =====
    battering_ram: {
        name: 'Devor buzar',
        icon: '🪵',
        category: 'maxsus',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 500, gold: 400 },
        time: 120,
        stats: {
            hp: 800,
            damage: 100,
            speed: 0.4,
            range: 1,
            type: 'siege',
            bonusVsBuildings: 5
        },
        description: 'Devorlar va binolarga katta zarar beradi.'
    },

    war_elephant: {
        name: 'Jang fili',
        icon: '🐘',
        category: 'maxsus',
        tier: 4,
        unlockBarracks: 5,
        cost: { food: 1000, gold: 800 },
        time: 180,
        stats: {
            hp: 1500,
            damage: 60,
            speed: 0.5,
            range: 1,
            type: 'melee',
            splashDamage: true
        },
        description: 'Juda kuchli. Atrofdagilarga splash zarar beradi.'
    },

    // ===== QOʻLLAB-QUVVATLASH =====
    healer: {
        name: 'Shifobaxsh',
        icon: '💚',
        category: 'maxsus',
        tier: 3,
        unlockBarracks: 4,
        cost: { food: 600, gold: 400 },
        time: 90,
        stats: {
            hp: 80,
            damage: 0,
            healRate: 15, // har sekundda qancha HP tiklaydi
            speed: 0.9,
            range: 4,
            type: 'healer'
        },
        description: 'Askarlaringizni davolaydi. Binolarga hujum qilmaydi.'
    },

    fire_thrower: {
        name: 'Olov otuvchi',
        icon: '🔥',
        category: 'maxsus',
        tier: 4,
        unlockBarracks: 5,
        cost: { food: 800, gold: 600 },
        time: 150,
        stats: {
            hp: 300,
            damage: 40,
            speed: 0.7,
            range: 3,
            type: 'ranged',
            splashDamage: true,
            splashRadius: 2
        },
        description: 'Olov bilan hujum qiladi. Keng maydon zarari bor.'
    }
};

const TROOP_CATEGORIES = {
    piyoda: '⚔️ Piyoda',
    otishma: '🏹 Otishma',
    otliq: '🐴 Otliq',
    maxsus: '🛠️ Maxsus'
};
