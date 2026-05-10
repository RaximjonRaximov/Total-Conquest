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
        specialAbility: {
            id: 'testudo_passive',
            name: 'Birlik Kuchi',
            description: 'Yonida 3+ Legioner bo\'lsa +15% zarar va +10% himoya bonusi oladi.',
            passive: true,
            nearbyCount: 3,
            damageBuff: 0.15,
            defenseBonus: 0.10,
        },
        strengths:    ['Arzon', 'Ko\'p sonli', 'Tez yaratiladi', 'Guruhda kuchayadi'],
        weaknesses:   ['Zaif HP', 'Splash zarariga chidamsiz'],
        counters:     ['archer_lookout'],
        counteredBy:  [],
        description: 'Rim imperiyasining asosiy piyodasi. Arzon va tez yaratiladi. Guruhda +15% kuchayadi.',
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
        specialAbility: {
            id: 'shield_wall',
            name: 'Qalqon Devori',
            description: 'Mudofaa binolarga +50% zarar. Birinchi hujumda 2 soniya harakatsiz qolgan dushmanlar uchun +25% zarar.',
            passive: true,
            bonusVsDefense: 1.5,
            stunFollowupBonus: 0.25,
        },
        strengths:    ['Mudofaa binolarga +50% zarar', 'Yuqori HP', 'Stun bonusi'],
        weaknesses:   ['Otishmalarga zaif', 'Sekin harakat'],
        counters:     ['scorpio', 'tormenta'],
        counteredBy:  ['archer_lookout'],
        description: 'Mudofaa binolarni birinchi nishonga oladi. +50% zarar. Gangigan dushmanlarga qo\'shimcha zarar.',
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
        specialAbility: {
            id: 'blood_rage',
            name: 'Qon G\'azabi',
            description: 'HP 40% dan kam bo\'lganda avtomatik ravishda +40% zarar va +30% tezlik oladi (8 soniya).',
            passive: true,
            triggerThreshold: 0.40,
            damageBuff: 0.40,
            speedBuff: 0.30,
            buffDuration: 8000,
        },
        strengths:    ['Militsiyaga 3x zarar', 'HP kam bo\'lganda kuchayadi', 'Tez harakat'],
        weaknesses:   ['Siege qurollarga zaif', 'Qimmat'],
        counters:     ['militia'],
        counteredBy:  ['flamingCitadel', 'cloudBuster'],
        description: 'Qon to\'kuvchi Gladiator. Militsiyaga 3x zarar. HP 40% da avtomatik rage: +40% zarar, +30% tezlik.',
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
        specialAbility: {
            id: 'infiltrate',
            name: 'Infiltratsiya',
            description: 'Tuzoqlardan sezmay o\'tadi. Resurs binolarini birinchi nishonga oladi. Birinchi hujumda +80% zarar (ghost strike).',
            passive: true,
            avoidTraps: true,
            firstStrikeBonus: 0.80,
        },
        strengths:    ['Tuzoqlardan o\'tadi', 'Birinchi zarba +80%', 'Resurs o\'g\'irlashda ideal', 'Tez'],
        weaknesses:   ['O\'rta HP', 'Mudofaa binolarga zaif'],
        counters:     ['spikeTrap', 'alchemicalTrap'],
        counteredBy:  ['archer_lookout', 'scorpio'],
        description: 'Ayg\'oqchi. Tuzoqlardan o\'tadi. Birinchi ghost strike: +80% zarar.',
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
        specialAbility: null,           // Asosiy kamonchi — maxsus qobiliyat yo'q
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
        specialAbility: null,
        strengths:    ['Eng uzoq range', 'Teshib o\'tuvchi o\'q', 'Mudofaa binolarga kuchli'],
        weaknesses:   ['Sekin', 'Kichik HP', 'Qimmat'],
        counters:     ['archerTower', 'scorpio', 'tormenta'],
        counteredBy:  ['militia', 'flamingCitadel'],
        description: 'Kuchli ballista. O\'qi bir nechta askarni teshib o\'tadi. Juda uzoq masofadan uradi.',
    },

    // YANGI: Testudo — Rim toshbaqa formatsiyasi
    testudo: {
        name: 'Testudo',
        icon: '🐢',
        category: 'piyoda',
        tier: 3,
        unlockBarracks: 3,
        cost: { food: 600, gold: 400 },
        time: 90,
        flying: false,
        avoidTraps: false,
        targetPriority: 'defense',
        attackStyle: 'melee',
        tileSize: 2,                    // 2x tile egallaydi
        stats: {
            hp: 1400,                   // Juda baland HP
            damage: 20,
            speed: 0.5,                 // Sekin (formatsiya)
            range: 1.0,
            type: 'melee',
            capacity: 4,
            damageReduction: 0.55,      // 55% zarar kamaytiradi — splash armour
            splashArmour: true,
            movingDefenseBonus: 0.20,   // Harakatlanayotganda +20% qo'shimcha himoya
        },
        specialAbility: {
            id: 'testudo_formation',
            name: 'Testudo Formatsiyasi',
            description: 'Harakatlanayotganda barcha yo\'nalishdan kelgan zararni +20% kamaytiradi. Splash va o\'qdan himoyalanadi.',
            passive: true,              // Doimo ishlaydi
            trigger: 'moving',          // Faqat harakatlanayotganda
        },
        strengths:    ['55% zarar kamaytiradi', 'Splash himoya', 'Harakat paytida bonus himoya', 'Eng chidamli piyoda'],
        weaknesses:   ['Juda sekin', 'Zaif hujum', 'Qimmat', '2 tile egallaydi'],
        counters:     ['archerTower', 'scorpio', 'flamingCitadel'],
        counteredBy:  ['onager'],
        description: 'Rim toshbaqa formatsiyasi. 55% zararni kamaytiradi. Harakatlanayotganda qo\'shimcha himoya bonusi.',
    },

    // YANGI: Ballistarius — uzoq masofali ballista operator
    ballistarius: {
        name: 'Ballistarius',
        icon: '🏹',
        category: 'otishma',
        tier: 4,
        unlockBarracks: 4,
        cost: { food: 700, gold: 500 },
        time: 120,
        flying: false,
        avoidTraps: false,
        targetPriority: 'defense',      // Binolarga kuchli zarar
        attackStyle: 'ranged',
        stats: {
            hp: 150,
            damage: 110,
            speed: 0.45,
            range: 9.5,                 // Juda uzoq range
            type: 'ranged',
            capacity: 4,
            bonusVsBuilding: 2.0,       // Binolarga 2x zarar
            shockwave: true,            // Zarba binoni silkitadi
        },
        specialAbility: {
            id: 'shockwave_bolt',
            name: 'Silkitish Zarbi',
            description: 'Har 4-chi o\'q bino yonidagi askarlarni 0.8 soniya gangitadi (stun). Binolarga +100% zarar.',
            passive: false,
            cooldown: 0,                // Har 4-chi zarbda avtomatik
            triggerEvery: 4,            // 4-chi zarbda ishlaydi
            stunDuration: 800,          // ms
            stunRadius: 1.5,
        },
        strengths:    ['Juda uzoq range', 'Binolarga 2x zarar', '4-chi zarbda stun', 'Lechlarni silkitadi'],
        weaknesses:   ['Juda zaif HP', 'Juda sekin', 'Qimmat', 'Yaqinda ojiz'],
        counters:     ['archerTower', 'scorpio', 'tormenta', 'flamingCitadel'],
        counteredBy:  ['militia', 'centaur', 'gladiator'],
        description: 'Uzoq masofali ballista operatori. Binolarga 2x zarar, har 4-chi zarbda atrofdagilarni gangitadi.',
    },

    // YANGI: Retiarius — to'r otuvchi gladiator
    retiarius: {
        name: 'Retiarius',
        icon: '🕸️',
        category: 'piyoda',
        tier: 3,
        unlockBarracks: 4,
        cost: { food: 450, gold: 320 },
        time: 75,
        flying: false,
        avoidTraps: false,
        targetPriority: 'nearest',
        attackStyle: 'hybrid',          // Avval to'r, keyin yaqin hujum
        stats: {
            hp: 320,
            damage: 45,
            speed: 1.15,
            range: 3.0,                 // To'r uchun o'rta range
            type: 'melee',
            capacity: 2,
            netRange: 3.0,
        },
        specialAbility: {
            id: 'net_throw',
            name: 'To\'r Otish',
            description: 'Eng yaqin nishonga to\'r otadi. Nishon 3 soniya harakatsiz qoladi (CC). Keyin Retiarius yaqinlashib tig\'idan uradi (+50% zarar).',
            passive: false,
            cooldown: 8000,             // 8 sekund cooldown
            ccDuration: 3000,           // 3 soniya to'xtash
            followUpDamageBonus: 0.50,  // To'r keyin +50% zarar
        },
        strengths:    ['3 soniya CC (harakatsiz)', 'To\'r + tig\' kombinatsiyasi', 'O\'rta narx', 'Taktik qiymat'],
        weaknesses:   ['O\'rta HP', 'Cooldown uzoq', 'Ko\'p askardan zaif'],
        counters:     ['cataphract', 'cyclops', 'minotaur'],
        counteredBy:  ['archerTower', 'tormenta'],
        description: 'To\'r otuvchi gladiator. Nishonni 3 soniya to\'xtatadi, keyin yaqinlashib kuchli zarba beradi.',
    },

    // YANGI: Sagittarius Equites — otliq archer
    sagittarius_equites: {
        name: 'Sagittarius Equites',
        icon: '🏇',
        category: 'otliq',
        tier: 3,
        unlockBarracks: 4,
        cost: { food: 500, gold: 380 },
        time: 85,
        flying: false,
        avoidTraps: false,
        targetPriority: 'nearest',
        attackStyle: 'ranged',
        stats: {
            hp: 200,
            damage: 38,
            speed: 1.85,                // Tez harakat
            range: 4.5,
            type: 'ranged',
            capacity: 2,
            flyingLike: true,           // Devorda to'xtamaydi (harakat pattern)
            avoidWalls: true,           // Devorlarni chetlab o'tadi
        },
        specialAbility: {
            id: 'hit_and_run',
            name: 'Hujum va Qoch',
            description: 'Har zarbadan keyin 0.5 tile orqaga chekinadi. Yaqin jangga kirmasdan doimiy harakatda qoladi. Devor chetidan o\'tadi.',
            passive: true,
            retreatDistance: 0.5,       // tile
        },
        strengths:    ['Juda tez harakat', 'Devorda to\'xtamaydi', 'Devor chetidan o\'tadi', 'Hit-and-run'],
        weaknesses:   ['O\'rta HP', 'O\'rta zarar', 'Splash zararga zaif'],
        counters:     ['archerTower', 'scorpio', 'militia'],
        counteredBy:  ['tormenta', 'flamingCitadel'],
        description: 'Otliq archer. Har zarbadan keyin chekinadi. Devor chetidan o\'tadi. Uzoqdan o\'q otadi.',
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
        specialAbility: {
            id: 'swift_raid',
            name: 'Tezkor Bosqin',
            description: 'Harakat paytida dushmandan zarar olmaydi (0.5 soniya). Resurs binolariga yetib borganida birinchi zarba 2x.',
            passive: true,
            movingInvulnerabilityMs: 500,
            firstHitOnResourceBonus: 2.0,
        },
        strengths:    ['Eng tez harakat', 'Harakatda zarar olmaydi (0.5s)', 'Resurs binoda 2x birinchi zarba'],
        weaknesses:   ['O\'rta HP', 'Og\'ir mudofaaga zaif'],
        counters:     ['goldStorage', 'foodStorage', 'villa'],
        counteredBy:  ['tormenta', 'spikeTrap'],
        description: 'Eng tezkor askar. Harakat paytida 0.5s himoyalanadi. Resurs binoga birinchi zarba 2x.',
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
        specialAbility: {
            id: 'iron_charge',
            name: 'Temir Hujum',
            description: 'Janga kirishda 1.5 tile yugurish: yo\'lidagi dushmanlarga 2x zarar va 1.5 soniya sekinlashtiradi.',
            passive: false,
            cooldown: 12000,
            chargeRange: 1.5,
            chargeDamageMult: 2.0,
            chargeSlow: 0.50,
            chargeSlowDuration: 1500,
            activateOnDeploy: true,     // Joylashtirish paytida avtomatik ishga tushadi
        },
        strengths:    ['Yuqori HP', '25% zirhli', 'Tez va kuchli', 'Hujum paytida 2x zarar + sekinlashtirish'],
        weaknesses:   ['Qimmat', 'Siege qurollarga zaif'],
        counters:     ['archerTower', 'scorpio'],
        counteredBy:  ['onager', 'flamingCitadel'],
        description: 'Og\'ir zirhli otliq. 25% zirhli. Jangda boshlashda 2x charge zarar + 1.5s sekinlashtirish.',
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
        specialAbility: {
            id: 'breach',
            name: 'Devor Yorish',
            description: 'Devor yoki darvozani to\'liq buzganida atrofdagi 2 tile devorlarga ham 50% zarar beradi. Yo\'l ochadi.',
            passive: true,
            onDestroyWallSplash: 0.50,
            splashRadius: 2.0,
        },
        strengths:    ['Devorga 6x zarar', 'Juda baland HP', 'Devor yonidagilarga splash', 'Yo\'l ochadi'],
        weaknesses:   ['Juda sekin', 'Qimmat', 'Ko\'p joy egallaydi'],
        counters:     ['wall', 'gate'],
        counteredBy:  ['scorpio', 'tormenta'],
        description: 'Devor buzar Aries. Devorgа 6x zarar. Devor buzilganda atrofdagilarga ham zarar beradi.',
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
            splashRadius: 2.5,          // Katta splash radius
            bonusVsBuilding: 2.5,       // Binolarga +150% zarar (2.5x)
        },
        specialAbility: {
            id: 'devastate',
            name: 'Vayron Qilish',
            description: 'Binolarga +150% zarar beradi. Splash radius 2.5 tile. Har 3-chi zarb atrofdagi binolarni 1 soniya gangitadi.',
            passive: true,
            bonusVsBuilding: 2.5,       // 2.5x = +150%
            splashRadius: 2.5,
            stunEvery: 3,               // Har 3-chi zarbda
            stunDuration: 1000,
        },
        strengths:    ['Katta splash zarar (2.5 tile)', 'Binolarga +150% zarar', 'Guruh askarlarni yo\'q qiladi', 'Har 3-chi zarbda stun'],
        weaknesses:   ['Juda sekin', 'Eng qimmat', 'Yaqin jangda ojiz'],
        counters:     ['archerTower', 'scorpio', 'tormenta'],
        counteredBy:  ['militia', 'centaur'],
        description: 'Og\'ir katapulta. Katta splash (2.5 tile), binolarga +150% zarar. Har 3-chi zarbda stun.',
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
            splashRadius: 1.5,
            stunChance: 0.15,           // 15% ehtimol bilan raqibni qotiradi
        },
        specialAbility: {
            id: 'rampage',
            name: 'G\'azab Hujumi',
            description: 'Har 5-chi zarba kuchaytirilgan: 3x zarar va 2.5 tile splash. 15% har zarbada stun ehtimoli.',
            passive: true,
            rampageEvery: 5,
            rampageDamageMult: 3.0,
            rampageSplashRadius: 2.5,
            stunChance: 0.15,
        },
        strengths:    ['Eng baland HP', 'Splash zarar', '15% stun', 'Har 5-chi zarba 3x', 'Tank roli'],
        weaknesses:   ['Sekin', 'Qimmat', 'Ko\'p sig\'im'],
        counters:     ['militia', 'legionary'],
        counteredBy:  ['onager', 'ballistae'],
        description: 'Dev kuchli Minotavr. Har 5-chi zarba: 3x zarar + 2.5 tile splash. 15% stun.',
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
        targetPriority: 'troop',        // Do'st askarlarni kuzatadi (jangga kirmaydi)
        attackStyle: 'heal',
        noCombat: true,                 // Hujum qilmaydi — faqat davolaydi
        stats: {
            hp: 90,
            damage: 0,
            healRate: 20,               // HP/sekund
            healRadius: 3.5,            // AOE heal radiusi
            speed: 0.9,
            range: 3.5,
            type: 'healer',
            capacity: 2,
        },
        specialAbility: {
            id: 'emergency_care',
            name: 'Shoshilinch Davolash',
            description: 'HP 20% dan kam bo\'lgan yaqin askarga o\'z normal davolash tezligidan 3x tez davolaydi. Jangga kirmaydi.',
            passive: true,
            triggerThreshold: 0.20,     // HP 20% da ishlaydi
            emergencyHealMult: 3.0,
        },
        strengths:    ['AOE davolash', 'Shoshilinch 3x davolash', 'Taktik qiymat'],
        weaknesses:   ['Juda zaif HP', 'O\'zi hujum qilmaydi', 'Qimmat', 'Birinchi nishon bo\'ladi'],
        counters:     [],
        counteredBy:  ['archerTower', 'cloudBuster'],
        description: 'Tabib askar. Atrofdagi do\'st askarlarni davolaydi. HP 20% da 3x tez davolaydi. Jangga kirmaydi.',
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
        specialAbility: {
            id: 'earthquake_stomp',
            name: 'Yer Silkitish',
            description: 'Har 8 sekundda kuchli oyoq urib yer silkitadi: 3 tile radiusda 150 zarar va 2 soniya sekinlashtirish. Mudofaa binolar ham ta\'sirlanadi.',
            passive: false,
            cooldown: 8000,
            stompRadius: 3.0,
            stompDamage: 150,
            slowDuration: 2000,
            affectsBuildings: true,
        },
        strengths:    ['Eng kuchli askar', 'Tosh otadi (5 tile)', 'Katta splash', 'Dev HP', 'Yer silkitish (8s)'],
        weaknesses:   ['Eng qimmat', 'Sekin', 'Ko\'p sig\'im'],
        counters:     ['archerTower', 'scorpio', 'tormenta', 'flamingCitadel'],
        counteredBy:  ['cloudBuster'],
        description: 'Dev Tsiklop. Tosh otadi (5 tile). Har 8s yer silkitadi: 3 tile zarar + sekinlashtirish.',
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
        specialAbility: {
            id: 'dive_bomb',
            name: 'Sho\'ng\'in Hujumi',
            description: 'Har 10 sekundda sho\'ng\'in: nishonga 3x zarar va 1.5 tile splash (faqat resurslarga). Bir zumda uzoqdan nishonga yaqinlashadi.',
            passive: false,
            cooldown: 10000,
            diveDamageMult: 3.0,
            diveSplashRadius: 1.5,
            targetType: 'resource',
        },
        strengths:    ['Devorda to\'xtamaydi', 'Tuzoqdan o\'tadi', 'Tez', 'Resurs binolarga 2x', 'Sho\'ng\'in 3x (10s)'],
        weaknesses:   ['CloudBuster FAQAT buni uradi', 'O\'rta HP', 'Qimmat'],
        counters:     ['villa', 'farm', 'goldStorage', 'foodStorage'],
        counteredBy:  ['cloudBuster'],
        description: 'Uchuvchi Harpy. Resurs binolarga 2x. Har 10s sho\'ng\'in hujumi: 3x zarar + 1.5 tile splash.',
    },

    // ════════════════════════════════════════════════
    // QAHRAMON — Hero (bitta, kuchli, tiklanadi)
    // ════════════════════════════════════════════════

    commander: {
        name: 'Qo\'mondon',
        icon: '👑',
        category: 'qahramon',
        tier: 5,
        unlockBarracks: 8,
        isHero: true,
        heroRegenTime: 3600,
        cost: { gold: 5000 },
        time: 0,
        flying: false,
        avoidTraps: true,
        targetPriority: 'defense',
        attackStyle: 'melee',
        stats: {
            hp: 5000,
            damage: 200,
            speed: 1.2,
            range: 1.5,
            type: 'melee',
            capacity: 20,
            aura: true,
            auraRadius: 4,
            auraDamageBonus: 0.20,
        },
        specialAbility: {
            id: 'battle_cry',
            name: 'Jang Nidosi',
            description: '4 tile radius ichidagi askarlarga +60% zarar, +40% tezlik (3 soniya).',
            passive: false,
            cooldown: 45000,
            radius: 4,
            damageBuff: 0.60,
            speedBuff: 0.40,
            duration: 3000,
        },
        strengths:    ['Eng kuchli askar', 'Yaqin askarlar +20% kuch', 'Tuzoqdan o\'tadi', 'Tiklanadi'],
        weaknesses:   ['1 ta marta deploy', 'Tiklanishga vaqt kerak', 'Ko\'p sig\'im'],
        counters:     ['archerTower', 'flamingCitadel'],
        counteredBy:  [],
        description: 'Qo\'shin qo\'mondoni. Eng kuchli askar — faqat 1 deploy, tiklanadi. Jang Nidosi: 4 tile buff.',
    },

    sagittaria: {
        name: 'Sagittaria',
        icon: '🏹',
        category: 'qahramon',
        tier: 5,
        unlockBarracks: 10,  // TH 7+ kerak
        isHero: true,
        heroRegenTime: 2400,  // 40 daqiqa
        cost: { gold: 8000, food: 3000 },
        time: 0,
        flying: false,
        avoidTraps: true,
        targetPriority: 'defense',
        attackStyle: 'ranged',
        stats: {
            hp: 3500,
            damage: 300,
            speed: 1.0,
            range: 5.0,
            type: 'ranged',
            capacity: 20,
            aura: true,
            auraRadius: 5,
            auraRangeBonus: 0.25,
        },
        specialAbility: {
            id: 'arrow_rain',
            name: "O'q Yomg'iri",
            description: '5 tile radius ichidagi binolarga 8 zarba (100 zarar har biri) 4 soniya davomida.',
            passive: false,
            cooldown: 55000,
            radius: 5,
            shots: 8,
            damagePerShot: 100,
            duration: 4000,
        },
        strengths:    ['Uzoq masofadan hujum', 'Otishmalar +25% diapazon', 'Tez tiklanadi', 'Yuqori DMG'],
        weaknesses:   ['1 ta marta deploy', 'HP commanderdan kam', 'Ko\'p sig\'im'],
        counters:     ['catapult', 'archerTower'],
        counteredBy:  ['cavalry'],
        description: 'Kamon Ustasi. Uzoqdan otadi. Otishmalarga +25% range. O\'q Yomg\'iri: 8x100 zarar.',
    },

    // ════════════════════════════════════════════════
    // 4 TA YANGI QAHRAMON (haykal orqali ochiladi)
    // ════════════════════════════════════════════════

    legatus: {
        name: 'Legatus Legionis',
        icon: '🦁',
        category: 'qahramon',
        tier: 5,
        unlockBarracks: 0,              // Haykal orqali ochiladi (TH4)
        isHero: true,
        heroType: 'legatus',
        heroStatueType: 'legatusStatue',
        heroRegenTime: 2700,            // 45 daqiqa
        cost: { gold: 0 },              // Haykal qurilsa bepul deploy
        time: 0,
        flying: false,
        avoidTraps: true,
        targetPriority: 'defense',      // Mudofaa binolarni nishonga oladi
        attackStyle: 'melee',
        stats: {
            hp: 3000,
            damage: 150,
            speed: 1.3,
            range: 1.5,
            type: 'melee',
            capacity: 15,
            aura: true,
            auraRadius: 3.5,
            auraDamageBonus: 0.15,
        },
        specialAbility: {
            id: 'honor_cry',
            name: 'Shon-sharaf Nidosi',
            description: 'Barcha yaqin (3.5 tile) askarlarga +50% tezlik beradi (3 soniya).',
            passive: false,
            cooldown: 40000,
            radius: 3.5,
            speedBuff: 0.50,
            duration: 3000,
        },
        strengths:    ['TH4 dan ochiladi', 'Yaqin askarlar +50% tezlik', 'Mudofaa binolarga kuchli', 'Tiklanadi'],
        weaknesses:   ['1 ta deploy', 'Tiklanish vaqti', 'Haykal qurilishi kerak'],
        counters:     ['archerTower', 'scorpio', 'tormenta'],
        counteredBy:  ['flamingCitadel'],
        description: 'Rim generali. TH4 da ochiladi. Shon-sharaf Nidosi: 3.5 tile askarlarga +50% tezlik (3s).',
    },

    aquilifer: {
        name: 'Aquilifer',
        icon: '🦅',
        category: 'qahramon',
        tier: 5,
        unlockBarracks: 0,              // Haykal orqali ochiladi (TH6)
        isHero: true,
        heroType: 'aquilifer',
        heroStatueType: 'aquiliferStatue',
        heroRegenTime: 2400,            // 40 daqiqa
        cost: { gold: 0 },
        time: 0,
        flying: false,
        avoidTraps: true,
        targetPriority: 'resource',     // Oltin/oziq omborlarini nishon oladi
        attackStyle: 'ranged',
        stats: {
            hp: 2500,
            damage: 180,
            speed: 1.2,
            range: 4.5,
            type: 'ranged',
            capacity: 15,
            aura: true,
            auraRadius: 4.0,
            auraDamageBonus: 0.10,
        },
        specialAbility: {
            id: 'eagle_mark',
            name: 'Burgut Nishoni',
            description: '3 ta eng yaqin binoga 5 soniya davomida uchuvchi o\'q otadi (har biriga 80 zarar/s).',
            passive: false,
            cooldown: 50000,
            targetCount: 3,
            duration: 5000,
            damagePerSecond: 80,
        },
        strengths:    ['TH6 da ochiladi', '3 binoga bir vaqtda hujum', 'Resurs binolarga kuchli', 'Tez tiklanadi'],
        weaknesses:   ['1 ta deploy', 'HP legnatusdan kam', 'Haykal kerak'],
        counters:     ['goldStorage', 'foodStorage', 'villa', 'farm'],
        counteredBy:  ['archerTower', 'scorpio'],
        description: 'Rim bayroqdori. TH6 da ochiladi. Burgut Nishoni: 3 ta binoga 5s davomida hujum (80 zarar/s).',
    },

    praetorian_guard: {
        name: 'Praetorian Guard',
        icon: '🛡️',
        category: 'qahramon',
        tier: 5,
        unlockBarracks: 0,              // Haykal orqali ochiladi (TH8)
        isHero: true,
        heroType: 'praetorian_guard',
        heroStatueType: 'praetoranStatue',
        heroRegenTime: 3600,            // 60 daqiqa
        cost: { gold: 0 },
        time: 0,
        flying: false,
        avoidTraps: true,
        targetPriority: 'nearest',
        attackStyle: 'melee',
        stats: {
            hp: 6000,                   // Eng yuqori HP
            damage: 120,
            speed: 0.95,
            range: 1.5,
            type: 'melee',
            capacity: 20,
            damageReduction: 0.30,      // 30% zarar kamaytiradi
            splashDamage: true,
            splashRadius: 1.8,
        },
        specialAbility: {
            id: 'stone_shield',
            name: 'Tosh Qalqon',
            description: '4 soniya: 70% zararni kamaytiradi. Bu vaqtda har zarbada atrofdagi 1.8 tile splash zarar beradi.',
            passive: false,
            cooldown: 35000,
            duration: 4000,
            damageReduction: 0.70,      // 70% reduction (qobiliyat paytida)
            splashWhileActive: true,
            splashRadius: 1.8,
        },
        strengths:    ['TH8 da ochiladi', 'Eng yuqori HP', '70% zarar kamaytirish (4s)', 'Splash hujum', 'Tank'],
        weaknesses:   ['1 ta deploy', 'Sekin', 'Haykal kerak', 'Qimmat regen'],
        counters:     ['archerTower', 'tormenta', 'flamingCitadel'],
        counteredBy:  ['onager'],
        description: 'Imperator muhofazachisi. TH8 da ochiladi. Tosh Qalqon: 4s 70% himoya + splash hujum.',
    },

    imperatrix: {
        name: 'Imperatrix',
        icon: '⚜️',
        category: 'qahramon',
        tier: 5,
        unlockBarracks: 0,              // Haykal orqali ochiladi (TH10)
        isHero: true,
        heroType: 'imperatrix',
        heroStatueType: 'imperatriceStatue',
        heroRegenTime: 4800,            // 80 daqiqa
        cost: { gold: 0 },
        time: 0,
        flying: false,
        avoidTraps: true,
        targetPriority: 'defense',      // cityHall va mudofaa binolarni nishonga oladi
        attackStyle: 'melee',
        stats: {
            hp: 8000,                   // Eng kuchli qahramon
            damage: 280,
            speed: 1.1,
            range: 2.0,
            type: 'melee',
            capacity: 25,
            aura: true,
            auraRadius: 5.0,
            auraDamageBonus: 0.25,
            splashDamage: true,
            splashRadius: 2.0,
        },
        specialAbility: {
            id: 'imperium',
            name: 'Imperium G\'oyati',
            description: 'Barcha tirik askarlarga HP to\'liq tiklaydi. 8 soniya barcha askarlarga rage: +80% zarar, +50% tezlik.',
            passive: false,
            cooldown: 60000,
            healAllTroops: true,        // Barcha tirik askarlar to'liq tiklanadi
            rageDuration: 8000,
            rageDamageBuff: 0.80,
            rageSpeedBuff: 0.50,
        },
        strengths:    ['TH10 da ochiladi', 'Eng kuchli qahramon', 'Barcha askarlar HP to\'liq tiklanadi', '8s rage', 'Splash hujum'],
        weaknesses:   ['1 ta deploy', 'Juda uzoq tiklanish (80 min)', 'Haykal kerak (3x3)'],
        counters:     ['cityHall', 'archerTower', 'tormenta', 'flamingCitadel', 'infernoColumn'],
        counteredBy:  [],
        description: 'To\'liq imperiya kuchi. TH10 da ochiladi. Imperium: barcha HP tiklanadi + 8s rage (+80% zarar, +50% tezlik).',
    },

    // ════════════════════════════════════════════════
    // YANGI — New units
    // ════════════════════════════════════════════════

    thunderbird: {
        name: 'Momaqaldiroq Qush',
        icon: '⚡',
        category: 'uchuvchi',
        tier: 4,
        unlockBarracks: 5,
        cost: { food: 1200, gold: 900 },
        time: 180,
        flying: true,
        avoidTraps: true,
        targetPriority: 'defense',
        attackStyle: 'ranged',
        flyHeight: 3.5,
        stats: {
            hp: 350,
            damage: 80,
            speed: 1.4,
            range: 4.5,
            type: 'ranged',
            capacity: 4,
            chainLightning: true,
            chainCount: 3,
            chainDamageDecay: 0.6,
        },
        specialAbility: {
            id: 'thunderstorm',
            name: 'Momaqaldiroq',
            description: 'Har 12 sekundda 4 tile radius chaqmoq: atrofdagi 5 ta nishonga har biriga 120 zarar. Askarlar va binolarga ta\'sir qiladi.',
            passive: false,
            cooldown: 12000,
            stormRadius: 4.0,
            stormTargets: 5,
            stormDamage: 120,
        },
        strengths:    ['Zanjir chaqmoq (3 nishon)', 'Devorda to\'xtamaydi', 'Momaqaldiroq (12s)', '5 nishon'],
        weaknesses:   ['Zaif HP', 'Qimmat', 'CloudBuster uni uradi'],
        counters:     ['archerTower', 'scorpio'],
        counteredBy:  ['cloudBuster'],
        description: 'Uchuvchi momaqaldiroq qush. Zanjir chaqmoq (3 nishon). Har 12s momaqaldiroq: 5 nishon x120 zarar.',
    },

    veles: {
        name: 'Veles',
        icon: '🗡️',
        category: 'piyoda',
        tier: 3,
        unlockBarracks: 4,
        cost: { food: 350, gold: 200 },
        time: 60,
        flying: false,
        avoidTraps: false,
        targetPriority: 'nearest',
        attackStyle: 'melee',
        stats: {
            hp: 600,
            damage: 55,
            speed: 1.3,
            range: 1.2,
            type: 'melee',
            capacity: 2,
            evasion: 0.20,
        },
        specialAbility: {
            id: 'shadow_step',
            name: 'Soya Qadami',
            description: '20% ehtimol bilan zarardan qochadi. Qochgandan so\'ng keyingi zarba +35% kuchli bo\'ladi (counter-attack).',
            passive: true,
            evasionChance: 0.20,
            counterAttackBonus: 0.35,
        },
        strengths:    ['Tez harakat', 'O\'rtacha narx', '20% qochish', 'Qochgandan keyingi +35% counter'],
        weaknesses:   ['O\'rta HP', 'Splash zarariga chidamsiz'],
        counters:     ['archerTower', 'militia'],
        counteredBy:  ['onager', 'tormenta'],
        description: 'Yengil piyoda Veles. 20% zarardan qochadi. Qochgandan keyin +35% counter-attack zarba.',
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
    qahramon:  '👑 Qahramon',
};

// Renderer color map for troops (UI badge ranglar)
const TROOP_COLORS = {
    thunderbird:        '#ffeb3b',
    gladiator:          '#ef9a9a',
    commander:          '#ffd700',
    sagittaria:         '#69f0ae',
    // Yangi askarlar
    testudo:            '#90a4ae',
    ballistarius:       '#ff8a65',
    retiarius:          '#ce93d8',
    sagittarius_equites:'#80cbc4',
    // Yangi qahramonlar
    legatus:            '#ffca28',
    aquilifer:          '#78909c',
    praetorian_guard:   '#546e7a',
    imperatrix:         '#ffd700',
};
