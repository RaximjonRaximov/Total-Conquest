import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../config/db.js';

export default async function playerRoutes(fastify) {

    // ── O'z profil ───────────────────────────────────────────────────────────
    fastify.get('/player/me', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [row] } = await query(
            `SELECT p.display_name, p.trophies, p.league_id, p.xp, p.level,
                    p.gems, p.th_level, p.attack_won, p.attack_lost,
                    p.defence_won, p.defence_lost,
                    u.shield_until, u.is_banned,
                    CASE WHEN u.google_id   IS NOT NULL THEN true ELSE false END as has_google,
                    CASE WHEN u.telegram_id IS NOT NULL THEN true ELSE false END as has_telegram,
                    m.alliance_id
             FROM player_profiles p
             JOIN users u ON u.id = p.user_id
             LEFT JOIN alliance_members m ON m.user_id = p.user_id
             WHERE p.user_id = $1`,
            [req.user.id]
        );
        if (!row) return reply.code(404).send({ error: 'Profile not found' });
        return reply.send({ user_id: req.user.id, is_guest: req.user.is_guest, ...row });
    });

    // ── Display name o'zgartirish ─────────────────────────────────────────────
    fastify.patch('/player/me', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({
                display_name: z.string().min(2).max(32).regex(/^[a-zA-ZА-Яа-яЎўҚқҒғҲҳ0-9 _-]+$/).optional(),
                avatar_id:    z.number().int().min(0).max(99).optional(),
            })
        }
    }, async (req, reply) => {
        const { display_name, avatar_id } = req.body;
        if (!display_name && avatar_id === undefined) return reply.code(400).send({ error: 'Nothing to update' });

        const updates = [];
        const vals    = [];
        if (display_name) { updates.push(`display_name = $${updates.length + 1}`); vals.push(display_name); }
        if (avatar_id !== undefined) { updates.push(`avatar_id = $${updates.length + 1}`); vals.push(avatar_id); }

        vals.push(req.user.id);
        await query(
            `UPDATE player_profiles SET ${updates.join(', ')} WHERE user_id = $${vals.length}`,
            vals
        );
        return reply.send({ ok: true });
    });

    // ── O'yinchi qidirish (display_name bo'yicha) ────────────────────────────
    fastify.get('/player/search', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    }, async (req, reply) => {
        const q = (req.query.q || '').trim();
        if (q.length < 2) return reply.code(400).send({ error: 'Query too short' });

        const { rows } = await query(
            `SELECT u.id as user_id, p.display_name, p.trophies, p.th_level, p.league_id,
                    m.alliance_id, a.name as alliance_name
             FROM player_profiles p
             JOIN users u ON u.id = p.user_id
             LEFT JOIN alliance_members m ON m.user_id = p.user_id
             LEFT JOIN alliances a ON a.id = m.alliance_id
             WHERE u.is_banned = 0
               AND LOWER(p.display_name) LIKE LOWER($1)
             ORDER BY p.trophies DESC
             LIMIT 20`,
            [`%${q}%`]
        );
        return reply.send(rows);
    });

    // ── O'z global reytingim ─────────────────────────────────────────────────
    fastify.get('/player/me/rank', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [row] } = await query(
            `SELECT COUNT(*) + 1 as rank
             FROM player_profiles
             WHERE trophies > (SELECT trophies FROM player_profiles WHERE user_id = $1)`,
            [req.user.id]
        );
        return reply.send({ rank: row?.rank ?? 0 });
    });

    // ── Boshqa o'yinchi profili ───────────────────────────────────────────────
    fastify.get('/player/:id', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [row] } = await query(
            `SELECT p.display_name, p.trophies, p.league_id, p.xp, p.level, p.th_level,
                    p.attack_won, p.attack_lost, p.defence_won, p.defence_lost,
                    m.alliance_id, a.name as alliance_name
             FROM player_profiles p
             LEFT JOIN alliance_members m ON m.user_id = p.user_id
             LEFT JOIN alliances a ON a.id = m.alliance_id
             WHERE p.user_id = $1`,
            [req.params.id]
        );
        if (!row) return reply.code(404).send({ error: 'Player not found' });
        return reply.send(row);
    });

    // ── Leaderboard — Top 100 o'yinchilar ─────────────────────────────────────
    fastify.get('/leaderboard', { preHandler: requireAuth }, async (req, reply) => {
        const { rows } = await query(
            `SELECT p.user_id, p.display_name, p.trophies, p.th_level,
                    ROW_NUMBER() OVER (ORDER BY p.trophies DESC) AS rank
             FROM player_profiles p
             JOIN users u ON u.id = p.user_id
             WHERE u.is_banned = 0
             ORDER BY p.trophies DESC
             LIMIT 100`
        );
        return reply.send(rows);
    });
}
