import { redis, KEY } from '../config/redis.js';

// Fastify preHandler: request.user ni to'ldiradi
export async function requireAuth(request, reply) {
    try {
        await request.jwtVerify();

        // Token blacklist tekshirish (logout bo'lganmi?)
        const sessionKey = KEY.session(request.user.id);
        const valid = await redis.get(sessionKey);
        if (!valid) {
            return reply.code(401).send({ error: 'Session expired' });
        }
    } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
    }
}

// Guest ham ruxsat — user bo'lsa user, bo'lmasa null
export async function optionalAuth(request) {
    try {
        await request.jwtVerify();
    } catch {
        request.user = null;
    }
}
