import Fastify from 'fastify';
import cors    from '@fastify/cors';
import jwt     from '@fastify/jwt';
import helmet  from '@fastify/helmet';
import { env } from './config/env.js';
import { db }  from './config/db.js';
import { runMigrations } from '../migrations/001_init.js';

import authRoutes    from './routes/auth.js';
import playerRoutes  from './routes/player.js';
import villageRoutes from './routes/village.js';
import battleRoutes  from './routes/battle.js';
import allianceRoutes from './routes/alliance.js';
import warRoutes      from './routes/war.js';
import chatRoutes     from './routes/chat.js';

// ── DB migrations ─────────────────────────────────────────────────────────────
runMigrations(db);

const fastify = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'warn' : 'info' },
});

await fastify.register(helmet,  { contentSecurityPolicy: false });
await fastify.register(cors, {
    origin: env.FRONTEND_URL === '*' ? true : [env.FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
});
await fastify.register(jwt, { secret: env.JWT_SECRET });

// ── Zod body validation (config.zodBody da saqlanadi) ────────────────────────
fastify.addHook('preHandler', async (req, reply) => {
    const schema = req.routeOptions?.config?.zodBody;
    if (!schema) return;
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return reply.code(400).send({
            error: 'Validation failed',
            details: result.error.flatten().fieldErrors,
        });
    }
    req.body = result.data;
});

// ── Routes ────────────────────────────────────────────────────────────────────
await fastify.register(authRoutes,    { prefix: '/api' });
await fastify.register(playerRoutes,  { prefix: '/api' });
await fastify.register(villageRoutes, { prefix: '/api' });
await fastify.register(battleRoutes,  { prefix: '/api' });
await fastify.register(allianceRoutes, { prefix: '/api' });
await fastify.register(warRoutes,      { prefix: '/api' });
await fastify.register(chatRoutes,     { prefix: '/api' });

// ── Health check ──────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({
    status: 'ok',
    db: 'sqlite',
    ts: new Date().toISOString(),
}));

// ── Public config (frontend uchun) ────────────────────────────────────────────
fastify.get('/api/config', async () => ({
    google_client_id: env.GOOGLE_CLIENT_ID || null,
    version: '1.0.0',
}));

// ── Error handler ─────────────────────────────────────────────────────────────
fastify.setErrorHandler((err, req, reply) => {
    if (!err.statusCode || err.statusCode >= 500) {
        req.log.error({ err, url: req.url }, 'Unhandled error');
    }
    const code = err.statusCode || 500;
    reply.code(code).send({
        error: code >= 500 ? 'Internal server error' : err.message,
        ...(env.NODE_ENV !== 'production' && code >= 500 ? { stack: err.stack } : {}),
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────
try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`✅ Total Conquest backend — http://localhost:${env.PORT}`);
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
