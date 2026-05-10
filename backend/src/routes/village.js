import { z } from 'zod';
import * as villageService from '../services/villageService.js';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../config/db.js';


export default async function villageRoutes(fastify) {

    // ── O'z qishlog'im ─────────────────────────────────────────────────────
    fastify.get('/village/me', { preHandler: requireAuth }, async (req, reply) => {
        try {
            return await villageService.getVillage(req.user.id);
        } catch (err) {
            if (err.message === 'VILLAGE_NOT_FOUND') return reply.code(404).send({ error: 'Village not found' });
            throw err;
        }
    });

    // ── Village saqlash (auto-save, har 60s) ───────────────────────────────
    fastify.put('/village/me', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({
                map_data:  z.object({}).passthrough(),
                army_data: z.object({}).passthrough().optional(),
                resources: z.object({
                    gold:    z.number().int().min(0),
                    food:    z.number().int().min(0),
                    diamond: z.number().int().min(0),
                }).optional(),
                research:  z.object({}).passthrough().optional(),
            })
        }
    }, async (req, reply) => {
        const result = await villageService.saveVillage(req.user.id, req.body);
        return reply.send(result);
    });

    // ── Town Hall level yangilash ───────────────────────────────────────────
    fastify.patch('/village/me/th', {
        preHandler: requireAuth,
        config: { zodBody: z.object({ th_level: z.number().int().min(1).max(20) }) }
    }, async (req, reply) => {
        await villageService.updateTHLevel(req.user.id, req.body.th_level);
        return reply.send({ ok: true });
    });

    // ── Resurs sinxronizatsiya (conflict resolution) ───────────────────────
    fastify.post('/village/resources/sync', {
        preHandler: requireAuth,
        config: {
            zodBody: z.object({
                gold:         z.number().int().min(0).max(10_000_000),
                food:         z.number().int().min(0).max(10_000_000),
                diamond:      z.number().int().min(0).max(100_000),
                last_sync_at: z.string().datetime().optional(),
            })
        }
    }, async (req, reply) => {
        const { gold, food, diamond, last_sync_at } = req.body;
        const result = await villageService.syncResources(
            req.user.id,
            { gold, food, diamond },
            last_sync_at
        );
        return reply.send(result);
    });

    // ── Qalqon faollashtirish (shield) ─────────────────────────────────────
    fastify.post('/player/shield', {
        preHandler: requireAuth,
        config: { zodBody: z.object({ hours: z.number().int().min(1).max(72) }) }
    }, async (req, reply) => {
        const { hours } = req.body;
        const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
        await query(
            `UPDATE users SET shield_until = ? WHERE id = ?`,
            [until, req.user.id]
        );
        return reply.send({ shield_until: until });
    });

    // ── Loot Cart yig'ish ──────────────────────────────────────────────────
    fastify.post('/village/resources/collect-cart', { preHandler: requireAuth }, async (req, reply) => {
        const collected = await villageService.collectLootCart(req.user.id);
        return reply.send(collected);
    });

    // ── Boshqa o'yinchi qishlog'i (attack preview) ─────────────────────────
    fastify.get('/village/:userId', { preHandler: requireAuth }, async (req, reply) => {
        try {
            return await villageService.getOpponentVillage(req.params.userId);
        } catch {
            return reply.code(404).send({ error: 'Village not found' });
        }
    });
}
