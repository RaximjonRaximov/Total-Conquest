import { OAuth2Client } from 'google-auth-library';
import { v4 as uuid } from 'uuid';
import { query, transaction } from '../config/db.js';
import { redis, KEY, TTL } from '../config/redis.js';
import { env } from '../config/env.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
export async function loginWithGoogle(idToken) {
    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken, audience: env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
    } catch {
        throw new Error('INVALID_GOOGLE_TOKEN');
    }

    const { sub: googleId, email, name } = payload;

    return transaction(async (client) => {
        let { rows } = await client.query(
            'SELECT u.id, p.display_name FROM users u JOIN player_profiles p ON p.user_id = u.id WHERE u.google_id = ?',
            [googleId]
        );

        if (rows.length === 0) {
            const userId = uuid();
            const displayName = _sanitizeName(name || 'Jangchi');
            await client.query(
                'INSERT INTO users (id, google_id, email, created_at, last_login) VALUES (?,?,?,datetime(\'now\'),datetime(\'now\'))',
                [userId, googleId, email || null]
            );
            await client.query(
                'INSERT INTO player_profiles (user_id, display_name) VALUES (?,?)',
                [userId, displayName]
            );
            await client.query(
                'INSERT INTO villages (id, user_id, map_data, resources) VALUES (?,?,?,?)',
                [uuid(), userId, _starterVillage(), _starterResources()]
            );
            rows = [{ id: userId, display_name: displayName }];
        } else {
            await client.query(
                'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?',
                [rows[0].id]
            );
        }
        return rows[0];
    });
}

// ─── Google Access Token Login (popup flow) ──────────────────────────────────
export async function loginWithGoogleAccessToken(accessToken) {
    // Google userinfo endpoint orqali verify qilish
    let googleUser;
    try {
        const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
        if (!res.ok) throw new Error('bad_response');
        googleUser = await res.json();
        if (!googleUser.sub) throw new Error('no_sub');
    } catch {
        throw new Error('INVALID_GOOGLE_TOKEN');
    }

    const { sub: googleId, email, name } = googleUser;

    return transaction(async (client) => {
        let { rows } = await client.query(
            'SELECT u.id, p.display_name FROM users u JOIN player_profiles p ON p.user_id = u.id WHERE u.google_id = ?',
            [googleId]
        );

        if (rows.length === 0) {
            const userId = `${uuid()}`.replace(/-/g,'').slice(0,16);
            const displayName = _sanitizeName(name || 'Jangchi');
            await client.query(
                `INSERT INTO users (id, google_id, email, created_at, last_login) VALUES (?,?,?,datetime('now'),datetime('now'))`,
                [userId, googleId, email || null]
            );
            await client.query('INSERT INTO player_profiles (user_id, display_name) VALUES (?,?)', [userId, displayName]);
            await client.query('INSERT INTO villages (id, user_id, map_data, resources) VALUES (?,?,?,?)',
                [uuid(), userId, _starterVillage(), _starterResources()]);
            rows = [{ id: userId, display_name: displayName }];
        } else {
            await client.query(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [rows[0].id]);
        }
        return rows[0];
    });
}

// ─── Guest Login (device_id bilan recovery) ───────────────────────────────────
export async function loginAsGuest(deviceId = null) {
    // Agar device_id bor bo'lsa — mavjud akkauntni qaytarish
    if (deviceId) {
        const { rows: [existing] } = await query(
            `SELECT u.id FROM users u WHERE u.device_id = ?`, [deviceId]
        );
        if (existing) {
            await query(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [existing.id]);
            return { id: existing.id, is_guest: true, recovered: true, device_id: deviceId };
        }
    }

    // Yangi guest yaratish
    const guestId = `g_${uuid().replace(/-/g,'').slice(0,16)}`;
    const finalDeviceId = deviceId || `auto_${uuid().replace(/-/g,'').slice(0,12)}`;

    await query(
        `INSERT INTO users (id, device_id, created_at, last_login) VALUES (?,?,datetime('now'),datetime('now'))`,
        [guestId, finalDeviceId]
    );
    await query('INSERT INTO player_profiles (user_id, display_name) VALUES (?,?)',
        [guestId, `Mehmon_${guestId.slice(-6)}`]);
    await query('INSERT INTO villages (id, user_id, map_data, resources) VALUES (?,?,?,?)',
        [uuid(), guestId, _starterVillage(), _starterResources()]);

    return { id: guestId, is_guest: true, recovered: false, device_id: finalDeviceId };
}

// ─── Telegram Guest Link ──────────────────────────────────────────────────────
export async function linkGuestToTelegram(guestId, telegramUserId, telegramName) {
    const { rows: existing } = await query(
        'SELECT id FROM users WHERE telegram_id = ?', [String(telegramUserId)]
    );
    if (existing.length > 0) throw new Error('TELEGRAM_ALREADY_LINKED');

    const { rows: guest } = await query('SELECT id FROM users WHERE id = ?', [guestId]);
    if (guest.length === 0) throw new Error('GUEST_NOT_FOUND');

    await query('UPDATE users SET telegram_id = ? WHERE id = ?', [String(telegramUserId), guestId]);
    await query(
        'UPDATE player_profiles SET display_name = ? WHERE user_id = ? AND display_name LIKE \'Mehmon_%\'',
        [_sanitizeName(telegramName), guestId]
    );
    await redis.del(KEY.guestLink(guestId));
    return { success: true };
}

// ─── Session ──────────────────────────────────────────────────────────────────
export async function createSession(fastify, userId, isGuest = false) {
    const payload      = { id: userId, is_guest: isGuest };
    const accessToken  = fastify.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_TTL });
    const refreshToken = uuid();

    await redis.setex(KEY.session(userId), TTL.session, '1');
    await redis.setex(KEY.refreshToken(refreshToken), TTL.session, userId);
    return { accessToken, refreshToken };
}

export async function refreshSession(fastify, refreshToken) {
    const userId = await redis.get(KEY.refreshToken(refreshToken));
    if (!userId) throw new Error('INVALID_REFRESH_TOKEN');

    await redis.del(KEY.refreshToken(refreshToken));
    const newRefresh = uuid();
    await redis.setex(KEY.refreshToken(newRefresh), TTL.session, userId);
    await redis.setex(KEY.session(userId), TTL.session, '1');

    const accessToken = fastify.jwt.sign({ id: userId }, { expiresIn: env.JWT_ACCESS_TTL });
    return { accessToken, refreshToken: newRefresh };
}

export async function logout(userId, refreshToken) {
    await redis.del(KEY.session(userId));
    if (refreshToken) await redis.del(KEY.refreshToken(refreshToken));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _sanitizeName(n) {
    return n.replace(/[^\w\sЀ-ӿ-]/g, '').slice(0,32).trim() || 'Jangchi';
}
function _starterVillage() {
    return JSON.stringify({
        buildings: [
            { id: 'b1', type: 'cityHall',    level: 1, x: 20, y: 20 },
            { id: 'b2', type: 'villa',        level: 1, x: 16, y: 18 },
            { id: 'b3', type: 'farm',         level: 1, x: 22, y: 17 },
            { id: 'b4', type: 'barracks',     level: 1, x: 16, y: 22 },
            { id: 'b5', type: 'goldStorage',  level: 1, x: 23, y: 22 },
        ],
        obstacles: []
    });
}
function _starterResources() {
    return JSON.stringify({ gold: 1000, food: 1000, diamond: 0 });
}
