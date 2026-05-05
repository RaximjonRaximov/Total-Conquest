// ============================================================
// ASKAR MA'LUMOTLARI — Total Conquest (Gameloft) uslubida
// 14 ta askar, har biri o'ziga xos rol, ustunlik va kamchilik
// ============================================================

// targetPriority qiymatlari:
//   'nearest'  — eng yaqin nishon
//   'defense'  — mudofaa binolarni avval nishonga oladi
//   'resource' — oltin/oziq-ovqat omborlarini nishonga oladi
//   'militia'  — Militsiya binolarini avval yo'q qiladi
//   'wall'     — Devorlarni avval buzadi
//   'troop'    — Dushman askarlarni avval nishonga oladi

const TROOP_DATA = {

    // ════════════════════════════════════════════════
    // PIYODA — Ground melee units
    // ════════════════════════════════════════════════

    legionary: {
        name: 'Legioner',
        icon: '⚔️',
        category: 'piyoda',
        tier: 1,
        unlockBarracks: 1,
        cost: { food: 50 },
        time: 15,
        flying: false,
        avoidTraps: false,
        targetPriority: 'nearest',      // Yaqindagisini uradi
        attackStyle: 'melee',
        stats: {
            hp: 120,
            damage: 12,
            speed: 1.0,
            range: 1.0,
            type: 'melee',
            capacity: 1,
        },
        strengths:    ['Arzon', 'Ko\'p sonli', 'Tez yaratiladi'],
        weaknesses:   ['Zaif HP', 'Splash zarariga chidamsiz'],
        counters:     ['archer_lookout'],   // bu askarni qaysi bino yaxshi uradi
        counteredBy:  [],
        description: 'Rim imperiyasining asosiy piyodasi. Arzon va tez yaratiladi. Ko\'p sonli hujumda kuchli.',
    },

    praetorian: {
        name: 'Pretorianets',
        icon: '🛡️',
        category: 'piyoda',
        tier: 2,
        unlockBarracks: 2,
        cost: { food: 200, gold: 100 },
        time: 45,
        flying: false,
        avoidTraps: false,
        targetPriority: 'defense',      // Mudofaa binolarni birinchi nishon oladi
        attackStyle: 'melee',
        stats: {
            hp: 400,
            damage: 28,
            speed: 0.85,
            range: 1.0,
            type: 'melee',
            capacity: 2,
            bonusVsDefense: 1.5,        // Mudofaa binolarga +50% zarar
        },
        strengths:    ['Mudofaa binolarga qarshi kuchli', 'Yuqori HP'],
        weaknesses:   ['Otishmalarga zaif', 'Sekin harakat'],
        counters:     ['scorpio', 'tormenta'],
        counteredBy:  ['archer_lookout'],
        description: 'Mudofaa binolarni birinchi nishonga oladi. Minora va Scorpiolarga qarshi juda kuchli.',
    },

    gladiator: {
        name: 'Gladiator',
        icon: '⚜️',
        category: 'piyoda',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 400, gold: 250 },
        time: 80,
        flying: false,
        avoidTraps: false,
        targetPriority: 'militia',      // Militsiyani birinchi nishon oladi
        attackStyle: 'melee',
        stats: {
            hp: 550,
            damage: 55,
            speed: 1.1,
            range: 1.0,
            type: 'melee',
            capacity: 2,
            bonusVsMilitia: 3.0,        // Militsiya binoga 3x zarar
        },
        strengths:    ['Militsiyaga qarshi o\'lim', 'Tez harakat', 'Yuqori zarar'],
        weaknesses:   ['Siege qurollarga zaif', 'Qimmat'],
        counters:     ['militia'],
        counteredBy:  ['flamingCitadel', 'cloudBuster'],
        description: 'Qon to\'kuvchi Gladiator. Militsiya binolarini birinchi nishonga oladi va 3x zarar beradi.',
    },

    speculator: {
        name: 'Speculator',
        icon: '🕵️',
        category: 'piyoda',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 350, gold: 200 },
        time: 70,
        flying: false,
        avoidTraps: true,               // TUZOQLARNI FAOLLASHTIRMAYDI!
        targetPriority: 'resource',     // Resurs binolarini birinchi nishon
        attackStyle: 'melee',
        stats: {
            hp: 250,
            damage: 35,
            speed: 1.3,
            range: 1.0,
            type: 'melee',
            capacity: 2,
        },
        strengths:    ['Tuzoqlardan o\'tadi', 'Resurs o\'g\'irlashda kuchli', 'Tez'],
        weaknesses:   ['O\'rta HP', 'Mudofaa binolarga zaif'],
        counters:     ['spikeTrap', 'alchemicalTrap'],
        counteredBy:  ['archer_lookout', 'scorpio'],
        description: 'Ayg\'oqchi. Tuzoqlardan sezmay o\'tadi. Resurs omborlarini birinchi nishonga oladi.',
    },

    // ════════════════════════════════════════════════
    // OTISHMA — Ground ranged units
    // ════════════════════════════════════════════════

    sagittarius: {
        name: 'Sagittarius',
        icon: '🏹',
        category: 'otishma',
        tier: 1,
        unlockBarracks: 1,
        cost: { food: 80, gold: 40 },
        time: 20,
        flying: false,
        avoidTraps: false,
        targetPriority: 'nearest',      // Yaqindagisiga o'q otadi
        attackStyle: 'ranged',
        stats: {
            hp: 65,
            damage: 16,
            speed: 0.95,
            range: 5.5,
            type: 'ranged',
            capacity: 1,
        },
        strengths:    ['Uzoq range', 'Devor ortidan uradi', 'Arzon'],
        weaknesses:   ['Juda zaif HP', 'Yaqin jangda o\'ladi'],
        counters:     ['militia'],
        counteredBy:  ['tormenta'],
        description: 'Uzoqdan o\'q otadi. Devorlar ortidan ham uradi. Lekin yaqinga kelganida juda zaif.',
    },

    ballistae: {
        name: 'Ballista',
        icon: '🎯',
        category: 'otishma',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 500, gold: 350 },
        time: 100,
        flying: false,
        avoidTraps: false,
        targetPriority: 'defense',      // Mudofaa binolarni nishonga oladi
        attackStyle: 'ranged',
        stats: {
            hp: 120,
            damage: 70,
            speed: 0.5,
            range: 8.0,
            type: 'ranged',
            capacity: 3,
            piercing: true,             // O'qi bir nechta askarni teshib o'tadi
        },
        strengths:    ['Eng uzoq range', 'Teshib o\'tuvchi o\'q', 'Mudofaa binolarga kuchli'],
        weaknesses:   ['Sekin', 'Kichik HP', 'Qimmat'],
        counters:     ['archerTower', 'scorpio', 'tormenta'],
        counteredBy:  ['militia', 'flamingCitadel'],
        description: 'Kuchli ballista. O\'qi bir nechta askarni teshib o\'tadi. Juda uzoq masofadan uradi.',
    },

    // ════════════════════════════════════════════════
    // OTLIQ — Cavalry units
    // ════════════════════════════════════════════════

    centaur: {
        name: 'Kentavr',
        icon: '🐴',
        category: 'otliq',
        tier: 2,
        unlockBarracks: 2,
        cost: { food: 250, gold: 150 },
        time: 50,
        flying: false,
        avoidTraps: false,
        targetPriority: 'resource',     // Resurs binolariga yuguradi
        attackStyle: 'melee',
        stats: {
            hp: 220,
            damage: 25,
            speed: 2.0,                 // ENG TEZ ground unit
            range: 1.0,
            type: 'melee',
            capacity: 2,
        },
        strengths:    ['Eng tez harakat', 'Resurs o\'g\'irlashda ideal', 'Devorlarni aylanib o\'tadi'],
        weaknesses:   ['O\'rta HP', 'Og\'ir mudofaaga zaif'],
        counters:     ['goldStorage', 'foodStorage', 'villa'],
        counteredBy:  ['tormenta', 'spikeTrap'],
        description: 'Eng tezkor askar. Resurs binolariga to\'g\'ri yuguradi. Kirib-chiqib loot oladi.',
    },

    cataphract: {
        name: 'Katafakt',
        icon: '🏇',
        category: 'otliq',
        tier: 4,
        unlockBarracks: 4,
        cost: { food: 600, gold: 400 },
        time: 110,
        flying: false,
        avoidTraps: false,
        targetPriority: 'nearest',
        attackStyle: 'melee',
        stats: {
            hp: 700,
            damage: 45,
            speed: 1.4,
            range: 1.0,
            type: 'melee',
            capacity: 3,
            damageReduction: 0.25,      // 25% zarar kamayadi (zirhli)
        },
        strengths:    ['Yuqori HP', '25% zirhli', 'Tez va kuchli'],
        weaknesses:   ['Qimmat', 'Siege qurollarga zaif'],
        counters:     ['archerTower', 'scorpio'],
        counteredBy:  ['onager', 'flamingCitadel'],
        description: 'Og\'ir zirhli otliq. 25% zararni kamaytiradi. Kuchli va chidamli.',
    },

    // ════════════════════════════════════════════════
    // QAMAL — Siege units
    // ════════════════════════════════════════════════

    aries: {
        name: 'Aries (Qo\'chqor)',
        icon: '🪵',
        category: 'qamal',
        tier: 2,
        unlockBarracks: 2,
        cost: { food: 400, gold: 300 },
        time: 90,
        flying: false,
        avoidTraps: false,
        targetPriority: 'wall',         // Devorlarni birinchi buzadi
        attackStyle: 'siege',
        stats: {
            hp: 900,
            damage: 120,
            speed: 0.45,
            range: 1.0,
            type: 'siege',
            capacity: 4,
            bonusVsWall: 6.0,           // Devorga 6x zarar
            bonusVsBuilding: 2.5,
        },
        strengths:    ['Devorga 6x zarar', 'Juda baland HP', 'Barcha binolara kuchli'],
        weaknesses:   ['Juda sekin', 'Qimmat', 'Ko\'p joy egallaydi'],
        counters:     ['wall', 'gate'],
        counteredBy:  ['scorpio', 'tormenta'],
        description: 'Devor buzar Aries. Devorgа 6x bonus zarar beradi. Yo\'l ochib beradi.',
    },

    onager: {
        name: 'Onager (Katapulta)',
        icon: '💥',
        category: 'qamal',
        tier: 4,
        unlockBarracks: 4,
        cost: { food: 800, gold: 600 },
        time: 150,
        flying: false,
        avoidTraps: false,
        targetPriority: 'defense',      // Mudofaa binolarni nishonga oladi
        attackStyle: 'siege_ranged',
        stats: {
            hp: 600,
            damage: 90,
            speed: 0.35,
            range: 7.0,
            type: 'siege',
            capacity: 5,
            splashDamage: true,
            splashRadius: 2.5,          // Katta splash
            bonusVsBuilding: 2.0,
        },
        strengths:    ['Katta splash zarar', 'Uzoq masofadan uradi', 'Guruh askarlarni yo\'q qiladi'],
        weaknesses:   ['Juda sekin', 'Eng qimmat', 'Yaqin jangda ojiz'],
        counters:     ['archerTower', 'scorpio', 'tormenta'],
        counteredBy:  ['militia', 'centaur'],
        description: 'Og\'ir katapulta. Katta maydon zarari bilan guruh askarlarni yo\'q qiladi.',
    },

    // ════════════════════════════════════════════════
    // MAXSUS — Special units
    // ════════════════════════════════════════════════

    minotaur: {
        name: 'Minotavr',
        icon: '🐂',
        category: 'maxsus',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 700, gold: 500 },
        time: 120,
        flying: false,
        avoidTraps: false,
        targetPriority: 'nearest',
        attackStyle: 'melee',
        stats: {
            hp: 1200,
            damage: 70,
            speed: 0.7,
            range: 1.5,
            type: 'melee',
            capacity: 5,
            splashDamage: true,
            splashRadius: 1.5,          // Atrofdagilarga zarar
            stunChance: 0.15,           // 15% ehtimol bilan raqibni qotiradi
        },
        strengths:    ['Eng baland HP', 'Splash zarar', '15% stun', 'Tank sifatida'],
        weaknesses:   ['Sekin', 'Qimmat', 'Ko\'p sig\'im egallaydi'],
        counters:     ['militia', 'legionary'],
        counteredBy:  ['onager', 'ballistae'],
        description: 'Dev kuchli Minotavr. Atrofdagilarga splash zarar, 15% stun. Tank roli.',
    },

    medicus: {
        name: 'Medicus',
        icon: '💚',
        category: 'maxsus',
        tier: 2,
        unlockBarracks: 2,
        cost: { food: 450, gold: 300 },
        time: 75,
        flying: false,
        avoidTraps: false,
        targetPriority: 'troop',        // Do'st askarlarni kuzatadi
        attackStyle: 'heal',
        stats: {
            hp: 90,
            damage: 0,
            healRate: 20,
            healRadius: 3.5,            // Atrofdagi askarlarni davolaydi (AOE heal)
            speed: 0.9,
            range: 3.5,
            type: 'healer',
            capacity: 2,
        },
        strengths:    ['AOE davolash', 'Batafsil taktik qiymat'],
        weaknesses:   ['Juda zaif HP', 'O\'zi hujum qilmaydi', 'Qimmat'],
        counters:     [],
        counteredBy:  ['archerTower', 'cloudBuster'],
        description: 'Tabib askar. Atrofdagi do\'st askarlarni AOE (radius) bilan davolaydi.',
    },

    cyclops: {
        name: 'Tsiklop',
        icon: '👁️',
        category: 'maxsus',
        tier: 4,
        unlockBarracks: 5,
        cost: { food: 1200, gold: 900 },
        time: 200,
        flying: false,
        avoidTraps: false,
        targetPriority: 'defense',
        attackStyle: 'melee',
        stats: {
            hp: 2000,
            damage: 100,
            speed: 0.6,
            range: 2.0,
            type: 'melee',
            capacity: 6,
            splashDamage: true,
            splashRadius: 2.0,
            rockThrow: true,            // Uzoqdan ham tosh otishi mumkin
            rockRange: 5.0,
            rockDamage: 60,
        },
        strengths:    ['Eng kuchli askar', 'Tosh otadi (5 tile)', 'Katta splash', 'Dev HP'],
        weaknesses:   ['Eng qimmat', 'Sekin', 'Ko\'p sig\'im'],
        counters:     ['archerTower', 'scorpio', 'tormenta', 'flamingCitadel'],
        counteredBy:  ['cloudBuster'],
        description: 'Dev Tsiklop. Tosh otadi (5 tile range) VA yaqin jangda splash zarar beradi.',
    },

    // ════════════════════════════════════════════════
    // UCHUVCHI — Flying units (faqat Cloud Buster ura oladi)
    // ════════════════════════════════════════════════

    harpy: {
        name: 'Harpy',
        icon: '🦅',
        category: 'uchuvchi',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 600, gold: 450 },
        time: 100,
        flying: true,                   // UCHUVCHI! Devorda qolmaydi, faqat CloudBuster ura oladi
        avoidTraps: true,               // Tuzoqlar ham ta'sir qilmaydi
        targetPriority: 'resource',     // Resurs binolariga uchadi
        attackStyle: 'ranged',
        flyHeight: 3.0,                 // Render balandligi (tile)
        stats: {
            hp: 180,
            damage: 40,
            speed: 1.7,
            range: 3.0,
            type: 'ranged',
            capacity: 2,
            bonusVsResource: 2.0,       // Resurs binolarga 2x zarar
        },
        strengths:    ['Devorda to\'xtamaydi', 'Tuzoqdan o\'tadi', 'Tez', 'Resurs binolarga 2x'],
        weaknesses:   ['CloudBuster FAQAT buni uradi', 'O\'rta HP', 'Qimmat'],
        counters:     ['villa', 'farm', 'goldStorage', 'foodStorage'],
        counteredBy:  ['cloudBuster'],
        description: 'Uchuvchi Harpy. Devor va tuzoqlardan o\'tadi. FAQAT Cloud Buster ura oladi.',
    },
};

// Kategoriya nomlari (UI uchun)
const TROOP_CATEGORIES = {
    piyoda:    '⚔️ Piyoda',
    otishma:   '🏹 Otishma',
    otliq:     '🐴 Otliq',
    qamal:     '🏰 Qamal',
    maxsus:    '⭐ Maxsus',
    uchuvchi:  '🦅 Uchuvchi',
};
