// SQLite migration — app.js tomonidan start vaqtida ishga tushiriladi
export function runMigrations(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        google_id     TEXT UNIQUE,
        telegram_id   TEXT UNIQUE,
        email         TEXT UNIQUE,
        shield_until  TEXT,
        is_banned     INTEGER NOT NULL DEFAULT 0,
        ban_reason    TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        last_login    TEXT
    );

    CREATE TABLE IF NOT EXISTS player_profiles (
        user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        display_name  TEXT NOT NULL,
        avatar_id     INTEGER NOT NULL DEFAULT 0,
        trophies      INTEGER NOT NULL DEFAULT 0,
        league_id     INTEGER NOT NULL DEFAULT 0,
        xp            INTEGER NOT NULL DEFAULT 0,
        level         INTEGER NOT NULL DEFAULT 1,
        gems          INTEGER NOT NULL DEFAULT 500,
        th_level      INTEGER NOT NULL DEFAULT 1,
        attack_won    INTEGER NOT NULL DEFAULT 0,
        attack_lost   INTEGER NOT NULL DEFAULT 0,
        defence_won   INTEGER NOT NULL DEFAULT 0,
        defence_lost  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS villages (
        id          TEXT PRIMARY KEY,
        user_id     TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        map_data    TEXT NOT NULL DEFAULT '{"buildings":[],"obstacles":[]}',
        army_data   TEXT NOT NULL DEFAULT '{}',
        resources   TEXT NOT NULL DEFAULT '{"gold":500,"food":500,"diamond":0}',
        research    TEXT NOT NULL DEFAULT '{}',
        layout_war  TEXT,
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS battle_locks (
        defender_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        attacker_id TEXT NOT NULL,
        expires_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS battle_logs (
        id             TEXT PRIMARY KEY,
        attacker_id    TEXT,
        defender_id    TEXT,
        attacker_name  TEXT,
        defender_name  TEXT,
        stars          INTEGER NOT NULL DEFAULT 0,
        destruction    INTEGER NOT NULL DEFAULT 0,
        loot_gold      INTEGER NOT NULL DEFAULT 0,
        loot_food      INTEGER NOT NULL DEFAULT 0,
        trophy_change  INTEGER NOT NULL DEFAULT 0,
        replay_data    TEXT,
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alliances (
        id            TEXT PRIMARY KEY,
        name          TEXT UNIQUE NOT NULL,
        tag           TEXT UNIQUE NOT NULL,
        description   TEXT,
        badge_id      INTEGER NOT NULL DEFAULT 0,
        min_trophies  INTEGER NOT NULL DEFAULT 0,
        is_open       INTEGER NOT NULL DEFAULT 1,
        war_wins      INTEGER NOT NULL DEFAULT 0,
        war_losses    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alliance_members (
        alliance_id TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role        TEXT NOT NULL DEFAULT 'member',
        donated     INTEGER NOT NULL DEFAULT 0,
        received    INTEGER NOT NULL DEFAULT 0,
        joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (alliance_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
        id               TEXT PRIMARY KEY,
        user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type             TEXT NOT NULL,
        amount           INTEGER NOT NULL,
        currency         TEXT NOT NULL DEFAULT 'gem',
        description      TEXT,
        idempotency_key  TEXT UNIQUE,
        created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clan_wars (
        id            TEXT PRIMARY KEY,
        alliance1_id  TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
        alliance2_id  TEXT REFERENCES alliances(id) ON DELETE SET NULL,
        state         TEXT NOT NULL DEFAULT 'searching',
        prep_start    TEXT,
        battle_start  TEXT,
        ended_at      TEXT,
        alliance1_stars INTEGER NOT NULL DEFAULT 0,
        alliance2_stars INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS war_members (
        war_id        TEXT NOT NULL REFERENCES clan_wars(id) ON DELETE CASCADE,
        user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alliance_id   TEXT NOT NULL,
        war_base      TEXT,
        attacks_used  INTEGER NOT NULL DEFAULT 0,
        stars_earned  INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (war_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS war_attacks (
        id            TEXT PRIMARY KEY,
        war_id        TEXT NOT NULL REFERENCES clan_wars(id) ON DELETE CASCADE,
        attacker_id   TEXT NOT NULL,
        defender_id   TEXT NOT NULL,
        stars         INTEGER NOT NULL DEFAULT 0,
        destruction   INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS troop_requests (
        id           TEXT PRIMARY KEY,
        alliance_id  TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        troop_type   TEXT NOT NULL,
        amount       INTEGER NOT NULL DEFAULT 1,
        filled       INTEGER NOT NULL DEFAULT 0,
        message      TEXT,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS troop_donations (
        id          TEXT PRIMARY KEY,
        request_id  TEXT NOT NULL REFERENCES troop_requests(id) ON DELETE CASCADE,
        donor_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount      INTEGER NOT NULL DEFAULT 1,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alliance_chat (
        id           TEXT PRIMARY KEY,
        alliance_id  TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        message      TEXT NOT NULL,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS global_chat (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        th_level     INTEGER NOT NULL DEFAULT 1,
        trophies     INTEGER NOT NULL DEFAULT 0,
        message      TEXT NOT NULL,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_profiles_trophies ON player_profiles(trophies DESC);
    CREATE INDEX IF NOT EXISTS idx_global_chat_created ON global_chat(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_alliance     ON alliance_chat(alliance_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_battles_attacker  ON battle_logs(attacker_id);
    CREATE INDEX IF NOT EXISTS idx_battles_defender  ON battle_logs(defender_id);
    CREATE INDEX IF NOT EXISTS idx_battles_created   ON battle_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_members_user      ON alliance_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_requests_alliance ON troop_requests(alliance_id);
    CREATE INDEX IF NOT EXISTS idx_requests_user     ON troop_requests(user_id);
    `);

    // Additive migrations (safe to re-run — IF NOT EXISTS / ALTER TABLE guards)
    const addCols = [
        `ALTER TABLE villages ADD COLUMN loot_cart TEXT`,
        `ALTER TABLE users ADD COLUMN device_id TEXT`,
    ];
    for (const sql of addCols) {
        try { db.exec(sql); } catch { /* column already exists */ }
    }

    // device_id unique index
    try {
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_device ON users(device_id) WHERE device_id IS NOT NULL`);
    } catch { /* already exists */ }

    console.log('✅ Database migrations complete');
}
