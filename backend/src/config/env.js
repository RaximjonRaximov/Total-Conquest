import { z } from 'zod';
import 'dotenv/config';

const schema = z.object({
    PORT:                 z.coerce.number().default(4000),
    NODE_ENV:             z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL:         z.string().default('http://localhost:3000'),
    JWT_SECRET:           z.string().min(8).default('local_dev_secret_change_in_prod_32chars'),
    JWT_REFRESH_SECRET:   z.string().min(8).default('local_dev_refresh_secret_change_in_prod'),
    JWT_ACCESS_TTL:       z.coerce.number().default(900),
    JWT_REFRESH_TTL:      z.coerce.number().default(604800),
    GOOGLE_CLIENT_ID:     z.string().default(''),
    TELEGRAM_BOT_TOKEN:   z.string().optional(),
    TELEGRAM_BOT_USERNAME:z.string().optional(),
    RATE_LIMIT_MAX:       z.coerce.number().default(200),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ .env xatosi:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
