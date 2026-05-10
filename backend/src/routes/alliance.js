import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { query, transaction } from '../config/db.js';

export default async function allianceRoutes(fastify) {

    // ── O'z ittifoqim ─────────────────────────────────────────────────────────
    fastify.get('/alliance/me', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [member] } = await query(
            `SELECT m.alliance_id, m.role, m.donated, m.received,
                    a.name, a.tag, a.description, a.badge_id, a.min_trophies,
                    a.is_open, a.war_wins, a.war_losses,
                    (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
             FROM alliance_members m
             JOIN alliances a ON a.id = m.alliance_id
             WHERE m.user_id = $1`,
            [req.user.id]
        );
        if (!member) return reply.code(404).send({ error: 'Not in an alliance' });
        return reply.send(member);
    });

    // ── Ittifoq qidirish ──────────────────────────────────────────────────────
    fastify.get('/alliance/search', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    }, async (req, reply) => {
        const q = (req.query.q || '').trim();
        if (q.length < 2) return reply.code(400).send({ error: 'Query too short' });

        const { rows } = await query(
            `SELECT a.id, a.name, a.tag, a.description, a.badge_id,
                    a.min_trophies, a.is_open, a.war_wins,
                    (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
             FROM alliances a
             WHERE LOWER(a.name) LIKE LOWER($1) OR LOWER(a.tag) LIKE LOWER($2)
             ORDER BY member_count DESC
             LIMIT 20`,
            [`%${q}%`, `%${q}%`]
        );
        return reply.send(rows);
    });

    // ── Ittifoq yaratish ──────────────────────────────────────────────────────
    fastify.post('/alliance', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({
                name:         z.string().min(3).max(30).regex(/^[a-zA-ZА-Яа-яЎўҚқҒғҲҳ0-9 _-]+$/),
                tag:          z.string().min(2).max(8).regex(/^[A-Z0-9]+$/i).transform(s => s.toUpperCase()),
                description:  z.string().max(120).optional().default(''),
                min_trophies: z.number().int().min(0).max(10000).optional().default(0),
                is_open:      z.boolean().optional().default(true),
            })
        }
    }, async (req, reply) => {
        // Allaqachon ittifoqda?
        const { rows: [existing] } = await query(
            'SELECT 1 FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (existing) return reply.code(409).send({ error: 'Already in an alliance' });

        const { name, tag, description, min_trophies, is_open } = req.body;

        const id = uuid();
        try {
            await transaction(async (client) => {
                await client.query(
                    `INSERT INTO alliances (id, name, tag, description, min_trophies, is_open)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, name, tag, description, min_trophies, is_open ? 1 : 0]
                );
                await client.query(
                    `INSERT INTO alliance_members (alliance_id, user_id, role)
                     VALUES ($1, $2, 'leader')`,
                    [id, req.user.id]
                );
            });
        } catch (err) {
            if (err.message?.includes('UNIQUE')) {
                return reply.code(409).send({ error: 'Name or tag already taken' });
            }
            throw err;
        }

        return reply.code(201).send({ id, name, tag });
    });

    // ── Ittifoqqa qo'shilish ──────────────────────────────────────────────────
    fastify.post('/alliance/:id/join', { preHandler: requireAuth }, async (req, reply) => {
        const allianceId = req.params.id;

        // Allaqachon boshqa ittifoqda?
        const { rows: [existingMembership] } = await query(
            'SELECT alliance_id FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (existingMembership) {
            return reply.code(409).send({ error: 'Already in an alliance' });
        }

        const { rows: [alliance] } = await query(
            `SELECT a.id, a.min_trophies, a.is_open,
                    (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
             FROM alliances a WHERE a.id = $1`,
            [allianceId]
        );
        if (!alliance) return reply.code(404).send({ error: 'Alliance not found' });
        if (!alliance.is_open) return reply.code(403).send({ error: 'Alliance is closed' });
        if (alliance.member_count >= 50) return reply.code(409).send({ error: 'Alliance is full' });

        // Kuboklar yetarlimi?
        const { rows: [profile] } = await query(
            'SELECT trophies FROM player_profiles WHERE user_id = $1', [req.user.id]
        );
        if (!profile) return reply.code(404).send({ error: 'Player not found' });
        if (profile.trophies < alliance.min_trophies) {
            return reply.code(403).send({ error: `Need ${alliance.min_trophies} trophies to join` });
        }

        await query(
            `INSERT INTO alliance_members (alliance_id, user_id, role) VALUES ($1, $2, 'member')`,
            [allianceId, req.user.id]
        );
        return reply.send({ ok: true });
    });

    // ── Ittifoqdan chiqish ────────────────────────────────────────────────────
    fastify.delete('/alliance/me', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [member] } = await query(
            'SELECT alliance_id, role FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (!member) return reply.code(404).send({ error: 'Not in an alliance' });

        if (member.role === 'leader') {
            // Rahbar chiqsa — ittifoqni o'chirish
            const { rows: others } = await query(
                `SELECT user_id FROM alliance_members WHERE alliance_id = $1 AND user_id != $2 LIMIT 1`,
                [member.alliance_id, req.user.id]
            );
            if (others.length > 0) {
                // Keyingi a'zoni rahbar qilish
                await query(
                    `UPDATE alliance_members SET role = 'leader' WHERE user_id = $1`,
                    [others[0].user_id]
                );
            } else {
                // Oxirgi a'zo — ittifoqni o'chirish
                await query('DELETE FROM alliances WHERE id = $1', [member.alliance_id]);
                return reply.send({ ok: true });
            }
        }

        await query(
            'DELETE FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        return reply.send({ ok: true });
    });

    // ── A'zo rolini o'zgartirish (leader / co-leader oldim/berish) ───────────
    fastify.patch('/alliance/members/:userId/role', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({
                role: z.enum(['co-leader', 'member'])
            })
        }
    }, async (req, reply) => {
        const targetUserId = req.params.userId;
        const { role: newRole } = req.body;

        // Chaqiruvchining rolini tekshirish
        const { rows: [me] } = await query(
            'SELECT alliance_id, role FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (!me) return reply.code(404).send({ error: 'Not in an alliance' });
        if (!['leader', 'co-leader'].includes(me.role)) {
            return reply.code(403).send({ error: 'Only leader or co-leader can change roles' });
        }
        // Co-leader faqat member ↔ co-leader o'zgartirishi mumkin (leaderga ko'tarishi yo'q)
        if (me.role === 'co-leader' && newRole !== 'co-leader' && newRole !== 'member') {
            return reply.code(403).send({ error: 'Co-leaders cannot assign leader role' });
        }

        // Target shu ittifoqdami?
        const { rows: [target] } = await query(
            'SELECT alliance_id, role FROM alliance_members WHERE user_id = $1', [targetUserId]
        );
        if (!target || target.alliance_id !== me.alliance_id) {
            return reply.code(404).send({ error: 'Member not found in your alliance' });
        }
        // Boshqa rahbarni o'zgartirish mumkin emas
        if (target.role === 'leader') {
            return reply.code(403).send({ error: 'Cannot change leader role this way' });
        }
        // O'zini o'zgartira olmaydi
        if (targetUserId === req.user.id) {
            return reply.code(400).send({ error: 'Cannot change your own role' });
        }

        await query(
            'UPDATE alliance_members SET role = $1 WHERE user_id = $2 AND alliance_id = $3',
            [newRole, targetUserId, me.alliance_id]
        );
        return reply.send({ ok: true, user_id: targetUserId, role: newRole });
    });

    // ── Rahbarlikni topshirish ────────────────────────────────────────────────
    fastify.patch('/alliance/transfer-leader', {
        preHandler: requireAuth,
        config: { zodBody: z.object({ to_user_id: z.string().uuid() }) }
    }, async (req, reply) => {
        const { to_user_id } = req.body;

        const { rows: [me] } = await query(
            'SELECT alliance_id, role FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (!me || me.role !== 'leader') {
            return reply.code(403).send({ error: 'Only leader can transfer leadership' });
        }

        const { rows: [target] } = await query(
            'SELECT user_id FROM alliance_members WHERE user_id = $1 AND alliance_id = $2',
            [to_user_id, me.alliance_id]
        );
        if (!target) return reply.code(404).send({ error: 'Target not in your alliance' });

        await transaction(async (client) => {
            await client.query(
                'UPDATE alliance_members SET role = $1 WHERE user_id = $2',
                ['co-leader', req.user.id]
            );
            await client.query(
                'UPDATE alliance_members SET role = $1 WHERE user_id = $2',
                ['leader', to_user_id]
            );
        });
        return reply.send({ ok: true });
    });

    // ── A'zoni ittifoqdan chiqarish (kick) ───────────────────────────────────
    fastify.delete('/alliance/members/:userId', { preHandler: requireAuth }, async (req, reply) => {
        const targetUserId = req.params.userId;

        const { rows: [me] } = await query(
            'SELECT alliance_id, role FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (!me) return reply.code(404).send({ error: 'Not in an alliance' });
        if (!['leader', 'co-leader'].includes(me.role)) {
            return reply.code(403).send({ error: 'Only leader or co-leader can kick members' });
        }

        const { rows: [target] } = await query(
            'SELECT alliance_id, role FROM alliance_members WHERE user_id = $1', [targetUserId]
        );
        if (!target || target.alliance_id !== me.alliance_id) {
            return reply.code(404).send({ error: 'Member not found in your alliance' });
        }
        if (target.role === 'leader') {
            return reply.code(403).send({ error: 'Cannot kick the leader' });
        }
        if (me.role === 'co-leader' && target.role === 'co-leader') {
            return reply.code(403).send({ error: 'Co-leaders cannot kick other co-leaders' });
        }
        if (targetUserId === req.user.id) {
            return reply.code(400).send({ error: 'Use /alliance/me to leave' });
        }

        await query('DELETE FROM alliance_members WHERE user_id = $1', [targetUserId]);
        return reply.send({ ok: true });
    });

    // ── Ittifoq tafsilotlari + a'zolar ───────────────────────────────────────
    fastify.get('/alliance/:id', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [alliance] } = await query(
            `SELECT a.*, (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
             FROM alliances a WHERE a.id = $1`,
            [req.params.id]
        );
        if (!alliance) return reply.code(404).send({ error: 'Alliance not found' });

        const { rows: members } = await query(
            `SELECT m.user_id, m.role, m.donated, m.received, m.joined_at,
                    p.display_name, p.trophies, p.th_level, p.league_id
             FROM alliance_members m
             JOIN player_profiles p ON p.user_id = m.user_id
             WHERE m.alliance_id = $1
             ORDER BY CASE m.role WHEN 'leader' THEN 0 WHEN 'co-leader' THEN 1 ELSE 2 END,
                      p.trophies DESC`,
            [req.params.id]
        );

        return reply.send({ ...alliance, members });
    });

    // ── Ittifoq reytingi ──────────────────────────────────────────────────────
    fastify.get('/alliance/leaderboard', async (req, reply) => {
        const { rows } = await query(
            `SELECT a.id, a.name, a.tag, a.badge_id, a.war_wins, a.war_losses,
                    COUNT(m.user_id) as member_count,
                    COALESCE(SUM(p.trophies), 0) as total_trophies,
                    COALESCE(AVG(p.trophies), 0) as avg_trophies,
                    COALESCE(MAX(p.trophies), 0) as top_trophies
             FROM alliances a
             LEFT JOIN alliance_members m ON m.alliance_id = a.id
             LEFT JOIN player_profiles p ON p.user_id = m.user_id
             GROUP BY a.id
             ORDER BY total_trophies DESC
             LIMIT 50`
        );
        return reply.send(rows.map((r, i) => ({ ...r, rank: i + 1 })));
    });

    // ── Askar so'rash ─────────────────────────────────────────────────────────
    fastify.post('/alliance/request-troops', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({
                troop_type: z.string().min(1).max(30),
                amount:     z.number().int().min(1).max(20).optional().default(5),
                message:    z.string().max(60).optional().default(''),
            })
        }
    }, async (req, reply) => {
        const { rows: [me] } = await query(
            'SELECT alliance_id FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (!me) return reply.code(404).send({ error: 'Not in an alliance' });

        // Hali tugamagan so'rov bormi?
        const { rows: [active] } = await query(
            `SELECT id FROM troop_requests
             WHERE user_id = $1 AND filled < amount AND expires_at > datetime('now')`,
            [req.user.id]
        );
        if (active) return reply.code(409).send({ error: 'You already have an active request' });

        const id      = uuid();
        const now     = new Date();
        const expires = new Date(now.getTime() + 8 * 3600_000).toISOString();

        await query(
            `INSERT INTO troop_requests (id, alliance_id, user_id, troop_type, amount, message, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, me.alliance_id, req.user.id, req.body.troop_type, req.body.amount, req.body.message, expires]
        );
        return reply.code(201).send({ id, expires_at: expires });
    });

    // ── Ittifoqdagi askar so'rovlarini ko'rish ────────────────────────────────
    fastify.get('/alliance/requests', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [me] } = await query(
            'SELECT alliance_id FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (!me) return reply.code(404).send({ error: 'Not in an alliance' });

        const { rows } = await query(
            `SELECT tr.id, tr.user_id, tr.troop_type, tr.amount, tr.filled,
                    tr.message, tr.created_at, tr.expires_at,
                    p.display_name
             FROM troop_requests tr
             JOIN player_profiles p ON p.user_id = tr.user_id
             WHERE tr.alliance_id = $1
               AND tr.filled < tr.amount
               AND tr.expires_at > datetime('now')
             ORDER BY tr.created_at DESC
             LIMIT 20`,
            [me.alliance_id]
        );
        return reply.send(rows);
    });

    // ── Askar yuborish (donate) ───────────────────────────────────────────────
    fastify.post('/alliance/donate/:requestId', {
        preHandler: requireAuth,
        config: { zodBody: z.object({ amount: z.number().int().min(1).max(10) }) }
    }, async (req, reply) => {
        const { rows: [me] } = await query(
            'SELECT alliance_id FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (!me) return reply.code(404).send({ error: 'Not in an alliance' });

        const { rows: [tr] } = await query(
            `SELECT * FROM troop_requests WHERE id = $1 AND alliance_id = $2`,
            [req.params.requestId, me.alliance_id]
        );
        if (!tr) return reply.code(404).send({ error: 'Request not found' });
        if (tr.user_id === req.user.id) return reply.code(400).send({ error: 'Cannot donate to yourself' });
        if (tr.filled >= tr.amount) return reply.code(409).send({ error: 'Request already filled' });
        if (new Date(tr.expires_at) < new Date()) return reply.code(410).send({ error: 'Request expired' });

        const canDonate = Math.min(req.body.amount, tr.amount - tr.filled);

        await transaction(async (client) => {
            await client.query(
                `INSERT INTO troop_donations (id, request_id, donor_id, amount) VALUES ($1, $2, $3, $4)`,
                [uuid(), tr.id, req.user.id, canDonate]
            );
            await client.query(
                `UPDATE troop_requests SET filled = filled + $1 WHERE id = $2`,
                [canDonate, tr.id]
            );
            await client.query(
                `UPDATE alliance_members SET donated = donated + $1 WHERE user_id = $2`,
                [canDonate, req.user.id]
            );
            await client.query(
                `UPDATE alliance_members SET received = received + $1 WHERE user_id = $2`,
                [canDonate, tr.user_id]
            );
        });

        return reply.send({ ok: true, donated: canDonate });
    });

    // ── Ittifoq chati ─────────────────────────────────────────────────────────
    fastify.get('/alliance/chat', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [me] } = await query(
            'SELECT alliance_id FROM alliance_members WHERE user_id = $1', [req.user.id]
        );
        if (!me) return reply.code(404).send({ error: 'Not in an alliance' });

        const since = req.query.since || null;
        let sql, params;
        if (since) {
            sql = `SELECT id, user_id, display_name, message, created_at
                   FROM alliance_chat
                   WHERE alliance_id = $1 AND created_at > $2
                   ORDER BY created_at ASC LIMIT 50`;
            params = [me.alliance_id, since];
        } else {
            sql = `SELECT id, user_id, display_name, message, created_at
                   FROM alliance_chat
                   WHERE alliance_id = $1
                   ORDER BY created_at DESC LIMIT 50`;
            params = [me.alliance_id];
        }
        const { rows } = await query(sql, params);
        return reply.send(since ? rows : rows.reverse());
    });

    fastify.post('/alliance/chat', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({ message: z.string().min(1).max(200).trim() }),
            rateLimit: { max: 20, timeWindow: '1 minute' },
        }
    }, async (req, reply) => {
        const { rows: [me] } = await query(
            `SELECT m.alliance_id, p.display_name
             FROM alliance_members m
             JOIN player_profiles p ON p.user_id = m.user_id
             WHERE m.user_id = $1`, [req.user.id]
        );
        if (!me) return reply.code(404).send({ error: 'Not in an alliance' });

        const msgId = uuid();
        await query(
            `INSERT INTO alliance_chat (id, alliance_id, user_id, display_name, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [msgId, me.alliance_id, req.user.id, me.display_name, req.body.message]
        );

        // Eski xabarlarni tozalash (1000 dan ko'p bo'lsa)
        await query(
            `DELETE FROM alliance_chat WHERE alliance_id = $1
             AND id NOT IN (
                 SELECT id FROM alliance_chat WHERE alliance_id = $1
                 ORDER BY created_at DESC LIMIT 1000
             )`,
            [me.alliance_id]
        );

        return reply.code(201).send({
            id: msgId, user_id: req.user.id,
            display_name: me.display_name,
            message: req.body.message,
            created_at: new Date().toISOString()
        });
    });
}
