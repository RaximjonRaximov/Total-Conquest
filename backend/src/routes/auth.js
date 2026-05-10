import { z } from 'zod';
import * as authService from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

export default async function authRoutes(fastify) {

    // ── Google OAuth ────────────────────────────────────────────────────────
    fastify.post('/auth/google', {
        config: {
            zodBody: z.object({ id_token: z.string().min(10) }),
        }
    }, async (req, reply) => {
        const { id_token } = req.body;
        try {
            const user    = await authService.loginWithGoogle(id_token);
            const session = await authService.createSession(fastify, user.id, false);
            return reply.send({ ...session, user_id: user.id, display_name: user.display_name });
        } catch (err) {
            if (err.message.includes('Invalid token')) {
                return reply.code(401).send({ error: 'Invalid Google token' });
            }
            throw err;
        }
    });

    // ── Guest Login ─────────────────────────────────────────────────────────
    fastify.post('/auth/guest', {
        config: {
            zodBody: z.object({ device_id: z.string().max(64).optional() }).optional(),
        }
    }, async (req, reply) => {
        const deviceId = req.body?.device_id ?? null;
        const user     = await authService.loginAsGuest(deviceId);
        const session  = await authService.createSession(fastify, user.id, true);
        return reply.send({
            ...session,
            user_id:   user.id,
            is_guest:  true,
            recovered: user.recovered || false,
            device_id: user.device_id,
            save_link: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'your_bot'}?start=${user.id}`,
        });
    });

    // ── Google Access Token Login (popup flow) ──────────────────────────────────
    fastify.post('/auth/google-token', {
        config: {
            zodBody: z.object({ access_token: z.string().min(10) }),
        }
    }, async (req, reply) => {
        const { access_token } = req.body;
        try {
            const user    = await authService.loginWithGoogleAccessToken(access_token);
            const session = await authService.createSession(fastify, user.id, false);
            return reply.send({ ...session, user_id: user.id, display_name: user.display_name });
        } catch (err) {
            if (err.message === 'INVALID_GOOGLE_TOKEN') {
                return reply.code(401).send({ error: 'Invalid Google token' });
            }
            throw err;
        }
    });

    // ── Token Refresh ───────────────────────────────────────────────────────
    fastify.post('/auth/refresh', {
        config: { zodBody: z.object({ refresh_token: z.string().uuid() }) }
    }, async (req, reply) => {
        try {
            const tokens = await authService.refreshSession(fastify, req.body.refresh_token);
            return reply.send(tokens);
        } catch {
            return reply.code(401).send({ error: 'Invalid or expired refresh token' });
        }
    });

    // ── Logout ──────────────────────────────────────────────────────────────
    fastify.delete('/auth/logout', {
        preHandler: requireAuth,
    }, async (req, reply) => {
        const refreshToken = req.headers['x-refresh-token'];
        await authService.logout(req.user.id, refreshToken);
        return reply.code(204).send();
    });

    // ── Telegram Bot Callback (bot /start GUEST_ID chaqiradi) ───────────────
    // Bu endpoint faqat Telegram Bot server tomonidan chaqiriladi
    fastify.post('/auth/telegram/link', {
        config: {
            zodBody: z.object({
                bot_secret:    z.string(),   // .env dagi TELEGRAM_BOT_TOKEN dan hash
                guest_id:      z.string(),
                telegram_id:   z.number(),
                telegram_name: z.string().max(64),
            })
        }
    }, async (req, reply) => {
        // Bot secret tekshirish — faqat bot chaqira olsin
        const expectedSecret = Buffer.from(process.env.TELEGRAM_BOT_TOKEN || '').toString('base64').slice(0, 32);
        if (req.body.bot_secret !== expectedSecret) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        try {
            await authService.linkGuestToTelegram(req.body.guest_id, req.body.telegram_id, req.body.telegram_name);
            return reply.send({ success: true });
        } catch (err) {
            if (err.message === 'TELEGRAM_ALREADY_LINKED') return reply.code(409).send({ error: 'Already linked' });
            if (err.message === 'GUEST_NOT_FOUND')         return reply.code(404).send({ error: 'Guest not found' });
            throw err;
        }
    });
}
