import { query, transaction } from '../config/db.js';
import { redis, KEY, TTL } from '../config/redis.js';
import { v4 as uuid } from 'uuid';

// ─── 1. MATCHMAKING (CoC 3-pass uslubi) ─────────────────────────────────────
export async function findOpponent(attackerId) {
    const { rows: [attacker] } = await query(
        `SELECT p.trophies, p.th_level, m.alliance_id
         FROM player_profiles p
         LEFT JOIN alliance_members m ON m.user_id = p.user_id
         WHERE p.user_id = ?`,
        [attackerId]
    );
    if (!attacker) throw new Error('PLAYER_NOT_FOUND');

    const t = attacker.trophies;
    const recentIds = await redis.smembers(KEY.recentDefenders(attackerId));

    // Alliance a'zolari seti (ular bilan jang qilinmaydi)
    let allianceSet = new Set();
    if (attacker.alliance_id) {
        const { rows: ams } = await query(
            'SELECT user_id FROM alliance_members WHERE alliance_id = ?',
            [attacker.alliance_id]
        );
        allianceSet = new Set(ams.map(r => r.user_id));
    }

    // 3-bosqichli qidiruv (CoC uslubi)
    const passes = [
        // 1-pass: yaqin trophy, yangi dushmanlar (recent yo'q)
        { spread: t < 400 ? 200 : 300, skipRecent: true },
        // 2-pass: keng trophy, yangi dushmanlar
        { spread: t < 400 ? 500 : 700, skipRecent: true },
        // 3-pass: keng trophy, recent ham bo'lsa ham
        { spread: 1500,                skipRecent: false },
    ];

    let opponent = null;
    for (const pass of passes) {
        const min = Math.max(0, t - pass.spread);
        const max = t + pass.spread;
        const { rows: candidates } = await query(
            `SELECT u.id, v.map_data, v.resources, p.trophies, p.display_name, p.th_level
             FROM player_profiles p
             JOIN users u ON u.id = p.user_id
             JOIN villages v ON v.user_id = u.id
             WHERE p.trophies BETWEEN ? AND ?
               AND u.id != ?
               AND u.is_banned = 0
               AND (u.shield_until IS NULL OR u.shield_until < datetime('now'))
               AND NOT EXISTS (
                   SELECT 1 FROM battle_locks bl
                   WHERE bl.defender_id = u.id
                     AND bl.expires_at > datetime('now')
               )
             ORDER BY ABS(p.trophies - ?) ASC, RANDOM()
             LIMIT 30`,
            [min, max, attackerId, t]
        );

        const filtered = candidates.filter(c => {
            if (allianceSet.has(c.id)) return false;
            if (pass.skipRecent && recentIds.includes(c.id)) return false;
            return true;
        });

        opponent = filtered[0] ?? null;
        if (opponent) break;
    }

    // Hech kim topilmasa — bot
    if (!opponent) {
        const bot = _generateBotVillage(attacker.trophies, attacker.th_level);
        return {
            opponent_id:  bot.id,
            is_bot:       true,
            display_name: bot.display_name,
            trophies:     bot.trophies,
            village:      { map_data: bot.map_data, resource_hint: bot.resource_hint },
        };
    }

    // Battle lock (3 daqiqa)
    await query(
        `INSERT INTO battle_locks (defender_id, attacker_id, expires_at)
         VALUES (?,?,datetime('now','+3 minutes'))
         ON CONFLICT(defender_id) DO UPDATE SET attacker_id=excluded.attacker_id, expires_at=excluded.expires_at`,
        [opponent.id, attackerId]
    );

    await redis.sadd(KEY.recentDefenders(attackerId), opponent.id);
    await redis.expire(KEY.recentDefenders(attackerId), TTL.recentDefender);

    const res = typeof opponent.resources === 'string'
        ? JSON.parse(opponent.resources) : (opponent.resources || {});

    return {
        opponent_id:  opponent.id,
        is_bot:       false,
        display_name: opponent.display_name,
        trophies:     opponent.trophies,
        village: {
            map_data:      opponent.map_data,
            resource_hint: {
                gold: Math.round((res?.gold || 0) / 500) * 500,
                food: Math.round((res?.food || 0) / 500) * 500,
            }
        },
    };
}

// ─── 2. JANG NATIJASINI SUBMIT ────────────────────────────────────────────────
export async function reportBattle(attackerId, payload) {
    const { opponent_id, is_bot, stars, destruction_pct, troops_used, replay_data } = payload;

    if (stars < 0 || stars > 3)               throw new Error('INVALID_STARS');
    if (destruction_pct < 0 || destruction_pct > 100) throw new Error('INVALID_DESTRUCTION');

    // Attacker trofey
    const { rows: [att] } = await query(
        'SELECT trophies FROM player_profiles WHERE user_id = ?', [attackerId]
    );
    const attackerTrophies = att?.trophies ?? 0;

    let defResources   = { gold: 0, food: 0 };
    let defenderTrophies = 0;

    if (!is_bot) {
        // Battle lock tekshirish
        const { rows: [lock] } = await query(
            `SELECT expires_at FROM battle_locks
             WHERE defender_id = ? AND attacker_id = ? AND expires_at > datetime('now')`,
            [opponent_id, attackerId]
        );
        if (!lock) throw new Error('BATTLE_EXPIRED');

        const { rows: [def] } = await query(
            `SELECT v.resources, p.trophies
             FROM villages v JOIN player_profiles p ON p.user_id = v.user_id
             WHERE v.user_id = ?`,
            [opponent_id]
        );
        if (def) {
            defResources     = typeof def.resources === 'string' ? JSON.parse(def.resources) : def.resources;
            defenderTrophies = def.trophies;
        }
    } else {
        defResources     = { gold: 1000 + attackerTrophies * 5, food: 800 + attackerTrophies * 4 };
        defenderTrophies = attackerTrophies;
    }

    // Anti-cheat — troops_used DB armiyasidan ko'p emas
    if (!await _validateArmy(attackerId, troops_used)) throw new Error('CHEAT_DETECTED');

    const loot   = _calcLoot(defResources, stars, destruction_pct);
    const trophy = _calcTrophyChange(attackerTrophies, defenderTrophies, stars);

    return transaction(async (client) => {
        // 1. Attacker resurs + trofey
        const { rows: [attVillage] } = await client.query(
            'SELECT resources FROM villages WHERE user_id = ?', [attackerId]
        );
        const attRes = typeof attVillage?.resources === 'string'
            ? JSON.parse(attVillage.resources) : (attVillage?.resources || {});
        attRes.gold = Math.max(0, (attRes.gold || 0) + loot.gold);
        attRes.food = Math.max(0, (attRes.food || 0) + loot.food);
        await client.query(
            'UPDATE villages SET resources = ? WHERE user_id = ?',
            [JSON.stringify(attRes), attackerId]
        );
        await client.query(
            `UPDATE player_profiles SET
                trophies     = MAX(0, trophies + ?),
                attack_won   = attack_won  + ?,
                attack_lost  = attack_lost + ?
             WHERE user_id = ?`,
            [trophy.attacker, stars >= 1 ? 1 : 0, stars === 0 ? 1 : 0, attackerId]
        );

        // 2. Defender
        if (!is_bot) {
            const { rows: [defVillage] } = await client.query(
                'SELECT resources FROM villages WHERE user_id = ?', [opponent_id]
            );
            const defRes = typeof defVillage?.resources === 'string'
                ? JSON.parse(defVillage.resources) : (defVillage?.resources || {});
            defRes.gold = Math.max(0, (defRes.gold || 0) - loot.gold);
            defRes.food = Math.max(0, (defRes.food || 0) - loot.food);
            await client.query(
                'UPDATE villages SET resources = ? WHERE user_id = ?',
                [JSON.stringify(defRes), opponent_id]
            );
            await client.query(
                `UPDATE player_profiles SET
                    trophies     = MAX(0, trophies + ?),
                    defence_lost = defence_lost + 1
                 WHERE user_id = ?`,
                [trophy.defender, opponent_id]
            );

            // Shield qo'llash
            const shieldHours = _calcShield(destruction_pct, stars);
            if (shieldHours > 0) {
                await client.query(
                    `UPDATE users SET shield_until = datetime('now','+${shieldHours} hours') WHERE id = ?`,
                    [opponent_id]
                );
            }

            // Loot Cart — o'g'irlangan resursning 20% ni qaytarish uchun arava
            if (loot.gold > 0 || loot.food > 0) {
                const cartGold = Math.floor(loot.gold * 0.2);
                const cartFood = Math.floor(loot.food * 0.2);
                const existingCart = await client.query(
                    'SELECT loot_cart FROM villages WHERE user_id = ?', [opponent_id]
                );
                const prevCart = existingCart.rows[0]?.loot_cart
                    ? JSON.parse(existingCart.rows[0].loot_cart) : { gold: 0, food: 0 };
                const newCart = {
                    gold: (prevCart.gold || 0) + cartGold,
                    food: (prevCart.food || 0) + cartFood,
                };
                await client.query(
                    'UPDATE villages SET loot_cart = ? WHERE user_id = ?',
                    [JSON.stringify(newCart), opponent_id]
                );
            }

            // Lock o'chirish
            await client.query('DELETE FROM battle_locks WHERE defender_id = ?', [opponent_id]);
        }

        // 3. Battle log
        const attName = (await client.query(
            'SELECT display_name FROM player_profiles WHERE user_id = ?', [attackerId]
        )).rows[0]?.display_name ?? 'Noma\'lum';
        const defName = is_bot ? 'Bot' : (await client.query(
            'SELECT display_name FROM player_profiles WHERE user_id = ?', [opponent_id]
        )).rows[0]?.display_name ?? 'Noma\'lum';

        const logId = uuid();
        await client.query(
            `INSERT INTO battle_logs
             (id,attacker_id,defender_id,attacker_name,defender_name,stars,destruction,loot_gold,loot_food,trophy_change,replay_data)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [
                logId, attackerId, is_bot ? null : opponent_id,
                attName, defName, stars, destruction_pct,
                loot.gold, loot.food, trophy.attacker,
                replay_data ? JSON.stringify(replay_data) : null,
            ]
        );

        // 4. Leaderboard yangilash
        const { rows: [upd] } = await client.query(
            'SELECT trophies FROM player_profiles WHERE user_id = ?', [attackerId]
        );
        await redis.zadd(KEY.leaderboard(), upd?.trophies ?? 0, attackerId);

        return {
            battle_id:    logId,
            loot,
            trophy_change: trophy.attacker,
            shield_hours:  is_bot ? 0 : _calcShield(destruction_pct, stars),
        };
    });
}

// ─── 3. LEADERBOARD ───────────────────────────────────────────────────────────
export async function getLeaderboard(limit = 100) {
    // DB dan top o'yinchilar (Redis bootstrap qo'llab-quvvatlash uchun)
    const { rows } = await query(
        `SELECT p.user_id, p.display_name, p.trophies, p.th_level, p.league_id
         FROM player_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE u.is_banned = 0
         ORDER BY p.trophies DESC
         LIMIT ?`,
        [limit]
    );
    return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

// ─── FORMULALAR ───────────────────────────────────────────────────────────────
function _trophyRange(t) {
    const spread = t < 1000 ? 400 : t < 3000 ? 300 : 200;
    return { min: Math.max(0, t - spread), max: t + spread };
}

function _calcLoot(res, stars, dest) {
    const rate = 0.20 + stars * 0.05;
    const bonus = 1 + dest / 200;
    return {
        gold: Math.floor((res.gold || 0) * rate * bonus),
        food: Math.floor((res.food || 0) * rate * bonus),
    };
}

function _calcTrophyChange(attT, defT, stars) {
    const diff  = defT - attT;
    const base  = stars >= 1 ? 20 : -10;
    const scale = Math.max(0.5, Math.min(2.0, 1 + diff / 1000));
    const att   = Math.round(base * scale);
    const def   = stars >= 1 ? -Math.round(Math.abs(att) * 0.8) : Math.round(Math.abs(att) * 0.5);
    return { attacker: att, defender: def };
}

function _calcShield(dest, stars) {
    if (stars === 3 || dest >= 90) return 16;
    if (dest >= 40)                return 12;
    if (dest >= 30)                return 8;
    return 0;
}

async function _validateArmy(attackerId, troopsUsed) {
    if (!troopsUsed) return true;
    const { rows: [v] } = await query(
        'SELECT army_data FROM villages WHERE user_id = ?', [attackerId]
    );
    if (!v) return false;
    const army = typeof v.army_data === 'string' ? JSON.parse(v.army_data) : (v.army_data || {});
    for (const [type, count] of Object.entries(troopsUsed)) {
        if ((count || 0) > (army[type] || 0)) return false;
    }
    return true;
}

// Bot ism generatori
const BOT_NAMES = [
    'Legioner','Aquila','Centurion','Gladiator','Praetor',
    'Tribune','Consul','Legate','Prefect','Optio',
    'Sigifer','Hastati','Principes','Triarii','Velites',
    'Decanus','Evocatus','Speculatore','Frumentarius','Explorator'
];
function _botName() {
    const n = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    return `${n}_${Math.floor(Math.random() * 9999)}`;
}

// TH levelga mos bot baza sxemalari
// Har bino: { type, level, x, y }  — 44x44 grid, markaz ~20,20
const BOT_LAYOUTS = {
    1: [ // TH1 — faqat asosiy binolar
        { type:'cityHall',    lv:1, x:20, y:20 },
        { type:'goldStorage', lv:1, x:17, y:20 },
        { type:'archerTower', lv:1, x:22, y:17 },
        { type:'militia',     lv:1, x:18, y:23 },
        { type:'villa',       lv:1, x:23, y:22 },
    ],
    2: [
        { type:'cityHall',    lv:2, x:20, y:20 },
        { type:'goldStorage', lv:1, x:16, y:20 },
        { type:'foodStorage', lv:1, x:24, y:20 },
        { type:'archerTower', lv:1, x:20, y:16 },
        { type:'archerTower', lv:1, x:22, y:24 },
        { type:'militia',     lv:1, x:17, y:24 },
        { type:'villa',       lv:1, x:23, y:17 },
        { type:'farm',        lv:1, x:25, y:23 },
    ],
    3: [
        { type:'cityHall',    lv:3, x:20, y:20 },
        { type:'goldStorage', lv:2, x:16, y:19 },
        { type:'foodStorage', lv:2, x:24, y:19 },
        { type:'archerTower', lv:2, x:19, y:15 },
        { type:'archerTower', lv:1, x:23, y:15 },
        { type:'scorpio',     lv:1, x:15, y:22 },
        { type:'militia',     lv:2, x:25, y:22 },
        { type:'villa',       lv:1, x:17, y:25 },
        { type:'villa',       lv:1, x:23, y:25 },
        { type:'farm',        lv:1, x:26, y:17 },
        { type:'barracks',    lv:1, x:14, y:17 },
    ],
    4: [
        { type:'cityHall',    lv:4, x:20, y:20 },
        { type:'goldStorage', lv:3, x:16, y:18 },
        { type:'foodStorage', lv:2, x:24, y:18 },
        { type:'archerTower', lv:3, x:19, y:14 },
        { type:'archerTower', lv:2, x:23, y:14 },
        { type:'scorpio',     lv:2, x:15, y:21 },
        { type:'scorpio',     lv:1, x:25, y:21 },
        { type:'militia',     lv:2, x:26, y:23 },
        { type:'spikeTrap',   lv:1, x:18, y:26 },
        { type:'villa',       lv:2, x:14, y:15 },
        { type:'villa',       lv:2, x:26, y:15 },
        { type:'farm',        lv:2, x:15, y:25 },
        { type:'barracks',    lv:2, x:22, y:26 },
    ],
    5: [
        { type:'cityHall',    lv:5, x:20, y:20 },
        { type:'goldStorage', lv:4, x:15, y:18 },
        { type:'foodStorage', lv:3, x:25, y:18 },
        { type:'archerTower', lv:4, x:18, y:13 },
        { type:'archerTower', lv:3, x:23, y:13 },
        { type:'archerTower', lv:2, x:14, y:20 },
        { type:'scorpio',     lv:3, x:26, y:20 },
        { type:'scorpio',     lv:2, x:14, y:24 },
        { type:'tormenta',    lv:1, x:26, y:24 },
        { type:'militia',     lv:3, x:20, y:27 },
        { type:'spikeTrap',   lv:2, x:17, y:27 },
        { type:'spikeTrap',   lv:1, x:23, y:27 },
        { type:'villa',       lv:2, x:12, y:15 },
        { type:'villa',       lv:2, x:28, y:15 },
        { type:'barracks',    lv:3, x:17, y:30 },
        { type:'blacksmith',  lv:1, x:23, y:30 },
    ],
    6: [
        { type:'cityHall',    lv:6, x:20, y:20 },
        { type:'goldStorage', lv:5, x:14, y:18 },
        { type:'foodStorage', lv:4, x:26, y:18 },
        { type:'archerTower', lv:5, x:17, y:12 },
        { type:'archerTower', lv:4, x:23, y:12 },
        { type:'archerTower', lv:3, x:13, y:19 },
        { type:'archerTower', lv:3, x:27, y:19 },
        { type:'scorpio',     lv:4, x:13, y:24 },
        { type:'scorpio',     lv:3, x:27, y:24 },
        { type:'tormenta',    lv:2, x:17, y:28 },
        { type:'tormenta',    lv:1, x:23, y:28 },
        { type:'militia',     lv:4, x:20, y:28 },
        { type:'spikeTrap',   lv:2, x:15, y:26 },
        { type:'spikeTrap',   lv:2, x:25, y:26 },
        { type:'alchemicalTrap', lv:1, x:20, y:14 },
        { type:'villa',       lv:3, x:11, y:14 },
        { type:'villa',       lv:3, x:29, y:14 },
        { type:'barracks',    lv:3, x:16, y:32 },
        { type:'blacksmith',  lv:2, x:24, y:32 },
    ],
    7: [
        { type:'cityHall',    lv:7, x:20, y:20 },
        { type:'goldStorage', lv:5, x:14, y:17 },
        { type:'foodStorage', lv:4, x:26, y:17 },
        { type:'archerTower', lv:6, x:16, y:11 },
        { type:'archerTower', lv:6, x:24, y:11 },
        { type:'archerTower', lv:5, x:12, y:18 },
        { type:'archerTower', lv:4, x:28, y:18 },
        { type:'scorpio',     lv:5, x:12, y:24 },
        { type:'scorpio',     lv:4, x:28, y:24 },
        { type:'tormenta',    lv:3, x:15, y:28 },
        { type:'tormenta',    lv:3, x:25, y:28 },
        { type:'cloudBuster', lv:1, x:20, y:28 },
        { type:'militia',     lv:5, x:20, y:13 },
        { type:'spikeTrap',   lv:3, x:14, y:26 },
        { type:'spikeTrap',   lv:3, x:26, y:26 },
        { type:'alchemicalTrap', lv:2, x:20, y:30 },
        { type:'alchemicalTrap', lv:1, x:17, y:14 },
        { type:'villa',       lv:3, x:10, y:14 },
        { type:'villa',       lv:3, x:30, y:14 },
        { type:'barracks',    lv:4, x:15, y:33 },
        { type:'blacksmith',  lv:3, x:25, y:33 },
        { type:'legionForum', lv:1, x:20, y:33 },
    ],
    8: [
        { type:'cityHall',    lv:8, x:20, y:20 },
        { type:'goldStorage', lv:5, x:13, y:17 },
        { type:'foodStorage', lv:5, x:27, y:17 },
        { type:'archerTower', lv:7, x:15, y:10 },
        { type:'archerTower', lv:7, x:25, y:10 },
        { type:'archerTower', lv:6, x:11, y:18 },
        { type:'archerTower', lv:5, x:29, y:18 },
        { type:'scorpio',     lv:6, x:11, y:24 },
        { type:'scorpio',     lv:5, x:29, y:24 },
        { type:'scorpio',     lv:4, x:20, y:30 },
        { type:'tormenta',    lv:4, x:14, y:27 },
        { type:'tormenta',    lv:4, x:26, y:27 },
        { type:'cloudBuster', lv:2, x:17, y:29 },
        { type:'cloudBuster', lv:1, x:23, y:29 },
        { type:'flamingCitadel', lv:1, x:20, y:13 },
        { type:'militia',     lv:6, x:15, y:24 },
        { type:'spikeTrap',   lv:3, x:13, y:28 },
        { type:'spikeTrap',   lv:3, x:27, y:28 },
        { type:'alchemicalTrap', lv:2, x:18, y:31 },
        { type:'alchemicalTrap', lv:2, x:22, y:31 },
        { type:'villa',       lv:4, x:9,  y:13 },
        { type:'villa',       lv:4, x:31, y:13 },
        { type:'barracks',    lv:4, x:14, y:34 },
        { type:'blacksmith',  lv:3, x:26, y:34 },
        { type:'legionForum', lv:2, x:20, y:34 },
    ],
    9: [
        { type:'cityHall',    lv:9, x:20, y:20 },
        { type:'goldStorage', lv:5, x:12, y:16 },
        { type:'foodStorage', lv:5, x:28, y:16 },
        { type:'archerTower', lv:8, x:14, y:9 },
        { type:'archerTower', lv:8, x:26, y:9 },
        { type:'archerTower', lv:7, x:10, y:17 },
        { type:'archerTower', lv:7, x:30, y:17 },
        { type:'archerTower', lv:6, x:10, y:23 },
        { type:'scorpio',     lv:6, x:30, y:23 },
        { type:'scorpio',     lv:6, x:14, y:30 },
        { type:'scorpio',     lv:5, x:26, y:30 },
        { type:'tormenta',    lv:5, x:13, y:26 },
        { type:'tormenta',    lv:5, x:27, y:26 },
        { type:'cloudBuster', lv:3, x:17, y:29 },
        { type:'cloudBuster', lv:2, x:23, y:29 },
        { type:'flamingCitadel', lv:2, x:17, y:13 },
        { type:'flamingCitadel', lv:1, x:23, y:13 },
        { type:'militia',     lv:7, x:20, y:32 },
        { type:'spikeTrap',   lv:4, x:12, y:29 },
        { type:'spikeTrap',   lv:4, x:28, y:29 },
        { type:'alchemicalTrap', lv:3, x:17, y:32 },
        { type:'alchemicalTrap', lv:3, x:23, y:32 },
        { type:'villa',       lv:5, x:8,  y:13 },
        { type:'villa',       lv:5, x:32, y:13 },
        { type:'barracks',    lv:4, x:13, y:35 },
        { type:'blacksmith',  lv:4, x:27, y:35 },
        { type:'legionForum', lv:3, x:20, y:35 },
    ],
    10: [
        { type:'cityHall',    lv:10, x:20, y:20 },
        { type:'goldStorage', lv:5, x:12, y:15 },
        { type:'foodStorage', lv:5, x:28, y:15 },
        { type:'archerTower', lv:8, x:13, y:8 },
        { type:'archerTower', lv:8, x:27, y:8 },
        { type:'archerTower', lv:8, x:9,  y:16 },
        { type:'archerTower', lv:8, x:31, y:16 },
        { type:'archerTower', lv:7, x:9,  y:22 },
        { type:'scorpio',     lv:6, x:31, y:22 },
        { type:'scorpio',     lv:6, x:13, y:31 },
        { type:'scorpio',     lv:6, x:27, y:31 },
        { type:'tormenta',    lv:6, x:12, y:26 },
        { type:'tormenta',    lv:6, x:28, y:26 },
        { type:'cloudBuster', lv:4, x:16, y:29 },
        { type:'cloudBuster', lv:4, x:24, y:29 },
        { type:'flamingCitadel', lv:3, x:16, y:12 },
        { type:'flamingCitadel', lv:3, x:24, y:12 },
        { type:'militia',     lv:8, x:20, y:33 },
        { type:'spikeTrap',   lv:4, x:11, y:29 },
        { type:'spikeTrap',   lv:4, x:29, y:29 },
        { type:'alchemicalTrap', lv:3, x:16, y:33 },
        { type:'alchemicalTrap', lv:3, x:24, y:33 },
        { type:'villa',       lv:5, x:7,  y:12 },
        { type:'villa',       lv:5, x:33, y:12 },
        { type:'barracks',    lv:5, x:12, y:36 },
        { type:'blacksmith',  lv:4, x:28, y:36 },
        { type:'legionForum', lv:3, x:20, y:36 },
        { type:'musterGround',lv:2, x:16, y:36 },
        { type:'musterGround',lv:2, x:24, y:36 },
    ],
};

function _generateBotVillage(trophies, attackerTH = 1) {
    // Attacker TH level ±1 oralig'ida bot TH tanlash
    const thLv = Math.min(10, Math.max(1,
        attackerTH + (Math.random() < 0.4 ? -1 : Math.random() < 0.7 ? 0 : 1)
    ));
    const layout = BOT_LAYOUTS[thLv] || BOT_LAYOUTS[1];

    // TH level ga mos bino max levelini chiqarish
    const maxBldLv = Math.min(10, thLv + 1);

    let bid = 1;
    const buildings = layout.map(b => ({
        id: `b${bid++}`,
        type: b.type,
        level: Math.min(maxBldLv, b.lv),
        x: b.x,
        y: b.y,
    }));

    const botTrophies = Math.max(0, trophies + Math.floor((Math.random() - 0.5) * 200));

    return {
        id: `bot_${uuid()}`,
        display_name: _botName(),
        trophies: botTrophies,
        map_data: { buildings, obstacles: [] },
        resource_hint: {
            gold: Math.round((300 + trophies * 6) / 500) * 500,
            food: Math.round((200 + trophies * 5) / 500) * 500,
        },
    };
}
