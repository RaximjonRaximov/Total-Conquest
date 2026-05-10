import { z } from 'zod';
import * as battleService from '../services/battleService.js';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../config/db.js';

export default async function battleRoutes(fastify) {

    // ── Opponent topish (Matchmaking) ────────────────────────────────────────
    // CoC'dagi "Attack!" bosganda chaqiriladi
    fastify.post('/battle/find', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, // spam himoyasi
    }, async (req, reply) => {
        try {
            // Shield bormi? Shield bor bo'lsa hujum qilsa shield tushadi
            const { rows: [user] } = await query(
                'SELECT shield_until FROM users WHERE id = $1',
                [req.user.id]
            );
            const hasShield = user?.shield_until && new Date(user.shield_until) > new Date();
            if (hasShield) {
                // Shield sindirilsin (CoC xuddi shunday)
                await query('UPDATE users SET shield_until = NULL WHERE id = $1', [req.user.id]);
            }

            const opponent = await battleService.findOpponent(req.user.id);
            return reply.send(opponent);
        } catch (err) {
            if (err.message === 'PLAYER_NOT_FOUND') return reply.code(404).send({ error: 'Player not found' });
            throw err;
        }
    });

    // ── Jang natijasini submit qilish ─────────────────────────────────────────
    fastify.post('/battle/report', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({
                opponent_id:    z.string(),
                is_bot:         z.boolean().default(false),
                stars:          z.number().int().min(0).max(3),
                destruction_pct: z.number().min(0).max(100),
                troops_used:    z.record(z.string(), z.number().int().min(0)).optional(),
                replay_data:    z.array(z.any()).max(10_000).optional(),
            }),
            rateLimit: { max: 5, timeWindow: '1 minute' },
        },
    }, async (req, reply) => {
        try {
            const result = await battleService.reportBattle(req.user.id, req.body);
            return reply.send(result);
        } catch (err) {
            const clientErrors = ['BATTLE_EXPIRED', 'INVALID_STARS', 'INVALID_DESTRUCTION'];
            if (clientErrors.includes(err.message)) return reply.code(400).send({ error: err.message });
            if (err.message === 'CHEAT_DETECTED')   return reply.code(403).send({ error: 'Battle validation failed' });
            throw err;
        }
    });

    // ── Battle log (oxirgi 20 ta) ─────────────────────────────────────────────
    fastify.get('/battle/log', { preHandler: requireAuth }, async (req, reply) => {
        const { rows } = await query(
            `SELECT id, attacker_id, defender_id, attacker_name, defender_name,
                    stars, destruction, loot_gold, loot_food, trophy_change, created_at,
                    CASE WHEN attacker_id = $1 THEN 'attack' ELSE 'defence' END AS type,
                    CASE WHEN attacker_id = $1 THEN (stars > 0) ELSE (stars = 0) END AS victory
             FROM battle_logs
             WHERE attacker_id = $1 OR defender_id = $1
             ORDER BY created_at DESC
             LIMIT 30`,
            [req.user.id]
        );
        return reply.send(rows);
    });

    // ── Replay ma'lumotlari ───────────────────────────────────────────────────
    fastify.get('/battle/:id/replay', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [row] } = await query(
            `SELECT replay_data FROM battle_logs
             WHERE id = $1 AND (attacker_id = $2 OR defender_id = $2)`,
            [req.params.id, req.user.id]
        );
        if (!row) return reply.code(404).send({ error: 'Replay not found' });
        return reply.send({ replay: row.replay_data });
    });

    // ── Global leaderboard ────────────────────────────────────────────────────
    fastify.get('/leaderboard', async (req, reply) => {
        const top = await battleService.getLeaderboard(100);
        return reply.send(top);
    });
}
