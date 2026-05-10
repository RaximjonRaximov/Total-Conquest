import { query } from '../config/db.js';

export async function getVillage(userId) {
    const { rows: [row] } = await query(
        `SELECT v.id, v.map_data, v.army_data, v.resources, v.research, v.updated_at,
                v.loot_cart,
                p.display_name, p.trophies, p.league_id, p.xp, p.level,
                p.gems, p.th_level, p.attack_won, p.attack_lost,
                p.defence_won, p.defence_lost,
                u.shield_until, u.is_banned,
                m.alliance_id
         FROM villages v
         JOIN player_profiles p ON p.user_id = v.user_id
         JOIN users u ON u.id = v.user_id
         LEFT JOIN alliance_members m ON m.user_id = v.user_id
         WHERE v.user_id = ?`,
        [userId]
    );
    if (!row) throw new Error('VILLAGE_NOT_FOUND');

    const shieldUntil = row.shield_until ? new Date(row.shield_until) : null;
    const lootCart = row.loot_cart ? JSON.parse(row.loot_cart) : null;
    return {
        ...row,
        shield_active: shieldUntil && shieldUntil > new Date(),
        shield_until:  row.shield_until,
        loot_cart:     (lootCart?.gold > 0 || lootCart?.food > 0) ? lootCart : null,
    };
}

export async function saveVillage(userId, { map_data, army_data, resources, research }) {
    // JSON safe parse/stringify — injection yo'q
    const clean = {
        map_data:  JSON.parse(JSON.stringify(map_data  || {})),
        army_data: JSON.parse(JSON.stringify(army_data || {})),
        resources: JSON.parse(JSON.stringify(resources || {})),
        research:  JSON.parse(JSON.stringify(research  || {})),
    };

    clean.resources.gold    = Math.max(0, Math.min(clean.resources.gold    || 0, 10_000_000));
    clean.resources.food    = Math.max(0, Math.min(clean.resources.food    || 0, 10_000_000));
    clean.resources.diamond = Math.max(0, Math.min(clean.resources.diamond || 0,    100_000));

    await query(
        `UPDATE villages
         SET map_data = ?, army_data = ?, resources = ?, research = ?, updated_at = datetime('now')
         WHERE user_id = ?`,
        [clean.map_data, clean.army_data, clean.resources, clean.research, userId]
    );
    return { saved_at: new Date().toISOString() };
}

export async function updateTHLevel(userId, thLevel) {
    if (thLevel < 1 || thLevel > 20) throw new Error('INVALID_TH_LEVEL');
    await query(
        'UPDATE player_profiles SET th_level = ? WHERE user_id = ? AND th_level < ?',
        [thLevel, userId, thLevel]
    );
}

// Resurs sinxronizatsiya — conflict resolution (max merge)
export async function syncResources(userId, clientResources, lastSyncAt) {
    const { rows: [row] } = await query(
        `SELECT resources, updated_at FROM villages WHERE user_id = ?`,
        [userId]
    );
    if (!row) throw new Error('VILLAGE_NOT_FOUND');

    const server = typeof row.resources === 'string'
        ? JSON.parse(row.resources) : (row.resources || {});

    const clientTs = lastSyncAt ? new Date(lastSyncAt).getTime() : 0;
    const serverTs = row.updated_at ? new Date(row.updated_at).getTime() : 0;

    let merged;
    if (clientTs >= serverTs) {
        // Client is up-to-date — accept client values directly
        merged = {
            gold:    Math.max(0, Math.min(clientResources.gold    ?? server.gold    ?? 0, 10_000_000)),
            food:    Math.max(0, Math.min(clientResources.food    ?? server.food    ?? 0, 10_000_000)),
            diamond: Math.max(0, Math.min(clientResources.diamond ?? server.diamond ?? 0,    100_000)),
        };
    } else {
        // Conflict: server was updated after last client sync (e.g. battle loot)
        // Strategy: take maximum of each resource to avoid losing any legitimately earned amount
        merged = {
            gold:    Math.max(0, Math.min(Math.max(server.gold    ?? 0, clientResources.gold    ?? 0), 10_000_000)),
            food:    Math.max(0, Math.min(Math.max(server.food    ?? 0, clientResources.food    ?? 0), 10_000_000)),
            // Diamonds: server wins (prevents client-side inflation) unless client has strictly more
            diamond: Math.max(0, Math.min(Math.max(server.diamond ?? 0, clientResources.diamond ?? 0),    100_000)),
        };
    }

    await query(
        `UPDATE villages SET resources = ?, updated_at = datetime('now') WHERE user_id = ?`,
        [JSON.stringify(merged), userId]
    );
    return { resources: merged, conflict: clientTs < serverTs };
}

export async function collectLootCart(userId) {
    const { rows: [row] } = await query(
        'SELECT resources, loot_cart FROM villages WHERE user_id = ?', [userId]
    );
    if (!row) throw new Error('VILLAGE_NOT_FOUND');

    const cart = row.loot_cart ? JSON.parse(row.loot_cart) : null;
    if (!cart || (cart.gold <= 0 && cart.food <= 0)) return { gold: 0, food: 0 };

    const res = typeof row.resources === 'string' ? JSON.parse(row.resources) : (row.resources || {});
    const collected = { gold: cart.gold || 0, food: cart.food || 0 };

    res.gold = Math.min(10_000_000, (res.gold || 0) + collected.gold);
    res.food = Math.min(10_000_000, (res.food || 0) + collected.food);

    await query(
        'UPDATE villages SET resources = ?, loot_cart = NULL WHERE user_id = ?',
        [JSON.stringify(res), userId]
    );
    return collected;
}

export async function getOpponentVillage(targetUserId) {
    const { rows: [row] } = await query(
        `SELECT v.map_data, p.display_name, p.trophies, p.league_id
         FROM villages v JOIN player_profiles p ON p.user_id = v.user_id
         WHERE v.user_id = ?`,
        [targetUserId]
    );
    if (!row) throw new Error('VILLAGE_NOT_FOUND');
    return { map_data: row.map_data, display_name: row.display_name, trophies: row.trophies };
}
