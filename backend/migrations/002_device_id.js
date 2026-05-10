// Migration 002 — device_id ustuni qo'shish (guest recovery uchun)
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../total_conquest.db'));

db.pragma('foreign_keys = ON');

// Ustun bor-yo'qligini tekshirish
const cols = db.prepare(`PRAGMA table_info(users)`).all();
const hasDeviceId = cols.some(c => c.name === 'device_id');

if (!hasDeviceId) {
    db.prepare(`ALTER TABLE users ADD COLUMN device_id TEXT`).run();
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_device ON users(device_id) WHERE device_id IS NOT NULL`).run();
    console.log('✅ device_id ustuni qo\'shildi');
} else {
    console.log('ℹ️  device_id ustuni allaqachon mavjud');
}

db.close();
