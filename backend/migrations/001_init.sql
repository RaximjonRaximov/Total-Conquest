-- Total Conquest — Database Schema v1
-- Run: psql -U tc_user -d total_conquest -f migrations/001_init.sql

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,              -- UUID yoki guest_xxx
    google_id    TEXT UNIQUE,
    telegram_id  TEXT UNIQUE,
    email        TEXT UNIQUE,
    password_hash TEXT,                         -- email/password uchun (kelajak)
    shield_until TIMESTAMPTZ,
    is_banned    BOOLEAN NOT NULL DEFAULT FALSE,
    ban_reason   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login   TIMESTAMPTZ
);

CREATE INDEX idx_users_google    ON users(google_id)   WHERE google_id   IS NOT NULL;
CREATE INDEX idx_users_telegram  ON users(telegram_id) WHERE telegram_id IS NOT NULL;
CREATE INDEX idx_users_shield    ON users(shield_until) WHERE shield_until IS NOT NULL;

-- ─── PLAYER PROFILES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_profiles (
    user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name  VARCHAR(32) NOT NULL,
    avatar_id     SMALLINT NOT NULL DEFAULT 0,
    trophies      INTEGER NOT NULL DEFAULT 0,
    league_id     SMALLINT NOT NULL DEFAULT 0,
    xp            INTEGER NOT NULL DEFAULT 0,
    level         SMALLINT NOT NULL DEFAULT 1,
    gems          INTEGER NOT NULL DEFAULT 500,
    th_level      SMALLINT NOT NULL DEFAULT 1,
    attack_won    INTEGER NOT NULL DEFAULT 0,
    attack_lost   INTEGER NOT NULL DEFAULT 0,
    defence_won   INTEGER NOT NULL DEFAULT 0,
    defence_lost  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_profiles_trophies ON player_profiles(trophies DESC);
CREATE INDEX idx_profiles_league   ON player_profiles(league_id);

-- ─── VILLAGES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS villages (
    id          TEXT PRIMARY KEY,
    user_id     TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    map_data    JSONB NOT NULL DEFAULT '{"buildings":[],"obstacles":[]}',
    army_data   JSONB NOT NULL DEFAULT '{}',
    resources   JSONB NOT NULL DEFAULT '{"gold":500,"food":500,"diamond":0}',
    research    JSONB NOT NULL DEFAULT '{}',
    layout_war  JSONB,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_villages_user    ON villages(user_id);
CREATE INDEX idx_villages_updated ON villages(updated_at DESC);

-- ─── BATTLE LOCKS (hujum davomida defender qulflash) ─────────────────────────
CREATE TABLE IF NOT EXISTS battle_locks (
    defender_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    attacker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_battle_locks_expires ON battle_locks(expires_at);

-- ─── BATTLE LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battle_logs (
    id             TEXT PRIMARY KEY,
    attacker_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    defender_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    attacker_name  VARCHAR(32),
    defender_name  VARCHAR(32),
    stars          SMALLINT NOT NULL CHECK (stars BETWEEN 0 AND 3),
    destruction    SMALLINT NOT NULL CHECK (destruction BETWEEN 0 AND 100),
    loot_gold      INTEGER NOT NULL DEFAULT 0,
    loot_food      INTEGER NOT NULL DEFAULT 0,
    trophy_change  SMALLINT NOT NULL DEFAULT 0,
    replay_data    JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_battles_attacker ON battle_logs(attacker_id, created_at DESC);
CREATE INDEX idx_battles_defender ON battle_logs(defender_id, created_at DESC);
CREATE INDEX idx_battles_created  ON battle_logs(created_at DESC);

-- ─── ALLIANCES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alliances (
    id            TEXT PRIMARY KEY,
    name          VARCHAR(32) UNIQUE NOT NULL,
    tag           VARCHAR(8)  UNIQUE NOT NULL,
    description   TEXT,
    badge_id      INTEGER NOT NULL DEFAULT 0,
    min_trophies  INTEGER NOT NULL DEFAULT 0,
    is_open       BOOLEAN NOT NULL DEFAULT TRUE,
    war_wins      INTEGER NOT NULL DEFAULT 0,
    war_losses    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alliances_trophies ON alliances(min_trophies);

-- ─── ALLIANCE MEMBERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alliance_members (
    alliance_id TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    role        VARCHAR(16) NOT NULL DEFAULT 'member'
                    CHECK (role IN ('leader','co-leader','elder','member')),
    donated     INTEGER NOT NULL DEFAULT 0,
    received    INTEGER NOT NULL DEFAULT 0,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (alliance_id, user_id)
);

CREATE INDEX idx_alliance_members_user ON alliance_members(user_id);

-- ─── TRANSACTIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type             VARCHAR(32) NOT NULL,
    amount           INTEGER NOT NULL,
    currency         VARCHAR(8) NOT NULL DEFAULT 'gem',
    description      TEXT,
    idempotency_key  TEXT UNIQUE,    -- double-spend oldini olish
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user    ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_idem    ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ─── EXPIRED LOCKS CLEANUP (pg_cron yoki cron job uchun) ────────────────────
-- Bu funksiya har 5 daqiqada chaqirilishi kerak
CREATE OR REPLACE FUNCTION cleanup_expired_locks() RETURNS void AS $$
    DELETE FROM battle_locks WHERE expires_at < NOW();
$$ LANGUAGE SQL;

COMMIT;
