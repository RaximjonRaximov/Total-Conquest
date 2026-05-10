// ============================================
// GLOBAL CHAT ROUTES
// ============================================

import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../config/db.js';
import crypto from 'crypto';

export default async function chatRoutes(fastify) {

    // ── Global chat messages (last 50) ────────────────────────────────────────
    fastify.get('/chat/global', { preHandler: requireAuth }, async (req, reply) => {
        const { since } = req.query;

        let sql = `
            SELECT g.id, g.user_id, g.display_name, g.th_level, g.trophies,
                   g.message, g.created_at
            FROM global_chat g
        `;
        const params = [];
        if (since) {
            sql += ` WHERE g.created_at > $1`;
            params.push(since);
        }
        sql += ` ORDER BY g.created_at DESC LIMIT 60`;

        const { rows } = await query(sql, params);
        return reply.send(rows.reverse());
    });

    // ── Send global chat message ───────────────────────────────────────────────
    fastify.post('/chat/global', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({
                message: z.string().min(1).max(200).trim(),
            })
        }
    }, async (req, reply) => {
        const { message } = req.body;

        // Rate limit: 1 xabar 2 soniyada (SQLite ga tekshirish)
        const { rows: recent } = await query(
            `SELECT COUNT(*) as cnt FROM global_chat
             WHERE user_id = $1
               AND created_at > datetime('now', '-2 seconds')`,
            [req.user.id]
        );
        if (recent[0]?.cnt > 0) {
            return reply.code(429).send({ error: 'Juda tez yuborayapsiz! 2 soniya kuting.' });
        }

        // Display name va TH level olish
        const { rows: [profile] } = await query(
            `SELECT p.display_name, p.th_level, p.trophies
             FROM player_profiles p WHERE p.user_id = $1`,
            [req.user.id]
        );
        if (!profile) return reply.code(403).send({ error: 'Profil topilmadi' });

        const id = crypto.randomUUID();
        await query(
            `INSERT INTO global_chat (id, user_id, display_name, th_level, trophies, message)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, req.user.id, profile.display_name, profile.th_level, profile.trophies, message]
        );

        // Eski xabarlarni tozalash (100 dan ortiq bo'lsa)
        try {
            await query(
                `DELETE FROM global_chat WHERE id NOT IN (
                    SELECT id FROM global_chat ORDER BY created_at DESC LIMIT 100
                )`
            );
        } catch { /* ignore */ }

        return reply.send({
            id, user_id: req.user.id,
            display_name: profile.display_name,
            th_level: profile.th_level,
            trophies: profile.trophies,
            message, created_at: new Date().toISOString()
        });
    });
}
