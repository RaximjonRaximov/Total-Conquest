import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '../../total_conquest.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// JSON columns — auto serialize/deserialize
const JSON_COLS = new Set([
    'map_data','army_data','resources','research','layout_war','replay_data'
]);

function serializeParams(params) {
    return params.map(p =>
        p !== null && p !== undefined && typeof p === 'object' ? JSON.stringify(p) : p
    );
}

function parseRow(row) {
    if (!row) return null;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
        if (JSON_COLS.has(k) && typeof v === 'string') {
            try { out[k] = JSON.parse(v); } catch { out[k] = v; }
        } else if (k === 'is_banned' || k === 'is_open') {
            out[k] = v === 1 || v === true;
        } else {
            out[k] = v;
        }
    }
    return out;
}

function _run(sql, params = []) {
    // $1,$2 → ?
    const converted = sql.replace(/\$\d+/g, '?');
    const serialized = serializeParams(params);
    const upper = sql.trim().toUpperCase();

    if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
        const rows = db.prepare(converted).all(...serialized).map(parseRow);
        return { rows };
    }
    if (upper.includes(' RETURNING ')) {
        const rows = db.prepare(converted).all(...serialized).map(parseRow);
        return { rows };
    }
    const result = db.prepare(converted).run(...serialized);
    return { rows: [], rowCount: result.changes };
}

export async function query(sql, params = []) {
    return _run(sql, params);
}

// transaction() — fn receives a client with .query() method
export async function transaction(fn) {
    db.prepare('BEGIN').run();
    try {
        const client = {
            query: (sql, params = []) => Promise.resolve(_run(sql, params))
        };
        const result = await fn(client);
        db.prepare('COMMIT').run();
        return result;
    } catch (err) {
        try { db.prepare('ROLLBACK').run(); } catch {}
        throw err;
    }
}
