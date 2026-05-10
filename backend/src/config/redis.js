// In-memory Redis replacement — production'da haqiqiy Redis bilan almashtiring

class MemoryStore {
    constructor() {
        this._kv      = new Map();   // key → { value, expires }
        this._sets    = new Map();   // key → Set
        this._sorted  = new Map();   // key → Map(member → score)
        setInterval(() => this._gc(), 30_000).unref();
    }

    // ── KV ────────────────────────────────────────────────────────────────────
    async get(key) {
        const e = this._kv.get(key);
        if (!e) return null;
        if (e.exp && Date.now() > e.exp) { this._kv.delete(key); return null; }
        return e.v;
    }
    async set(key, value) {
        this._kv.set(key, { v: value, exp: null }); return 'OK';
    }
    async setex(key, secs, value) {
        this._kv.set(key, { v: value, exp: Date.now() + secs * 1000 }); return 'OK';
    }
    async del(...keys) {
        let n = 0;
        for (const k of keys) {
            if (this._kv.delete(k))     n++;
            this._sets.delete(k);
            this._sorted.delete(k);
        }
        return n;
    }
    async exists(key) { return (await this.get(key)) !== null ? 1 : 0; }
    async expire(key, secs) {
        const e = this._kv.get(key);
        if (e) { e.exp = Date.now() + secs * 1000; return 1; }
        return 0;
    }
    async ping() { return 'PONG'; }
    on() {} // event listener stub

    // ── Sets ──────────────────────────────────────────────────────────────────
    async sadd(key, ...members) {
        if (!this._sets.has(key)) this._sets.set(key, new Set());
        const s = this._sets.get(key); let added = 0;
        for (const m of members) if (!s.has(m)) { s.add(m); added++; }
        return added;
    }
    async smembers(key) { return [...(this._sets.get(key) ?? new Set())]; }
    async scard(key)    { return (this._sets.get(key) ?? new Set()).size; }
    async srem(key, ...members) {
        const s = this._sets.get(key); if (!s) return 0;
        let n = 0; for (const m of members) if (s.delete(m)) n++;
        return n;
    }

    // ── Sorted Sets ───────────────────────────────────────────────────────────
    async zadd(key, score, member) {
        if (!this._sorted.has(key)) this._sorted.set(key, new Map());
        this._sorted.get(key).set(String(member), Number(score));
        return 1;
    }
    async zscore(key, member) {
        return this._sorted.get(key)?.get(String(member)) ?? null;
    }
    async zrevrangebyscore(key, max, min, ...opts) {
        const ss = this._sorted.get(key);
        if (!ss) return [];
        const hi = max === '+inf' ? Infinity : Number(max);
        const lo = min === '-inf' ? -Infinity : Number(min);
        const withScores = opts.includes('WITHSCORES');
        const li = opts.indexOf('LIMIT');
        const offset = li >= 0 ? Number(opts[li+1]) : 0;
        const count  = li >= 0 ? Number(opts[li+2]) : Infinity;

        const entries = [...ss.entries()]
            .filter(([, s]) => s >= lo && s <= hi)
            .sort(([, a], [, b]) => b - a)
            .slice(offset, offset + count);

        if (withScores) return entries.flatMap(([m, s]) => [m, String(s)]);
        return entries.map(([m]) => m);
    }
    async zrangebyscore(key, min, max, ...opts) {
        const ss = this._sorted.get(key);
        if (!ss) return [];
        const lo = min === '-inf' ? -Infinity : Number(String(min).replace('(',''));
        const hi = max === '+inf' ? Infinity  : Number(String(max).replace('(',''));
        const li = opts.indexOf('LIMIT');
        const offset = li >= 0 ? Number(opts[li+1]) : 0;
        const count  = li >= 0 ? Number(opts[li+2]) : Infinity;

        return [...ss.entries()]
            .filter(([, s]) => s >= lo && s <= hi)
            .sort(([, a], [, b]) => a - b)
            .slice(offset, offset + count)
            .map(([m]) => m);
    }
    async zcard(key) { return this._sorted.get(key)?.size ?? 0; }

    _gc() {
        const now = Date.now();
        for (const [k, e] of this._kv) if (e.exp && now > e.exp) this._kv.delete(k);
    }
}

export const redis = new MemoryStore();

export const KEY = {
    session:         (uid)  => `sess:${uid}`,
    refreshToken:    (tok)  => `ref:${tok}`,
    battleLock:      (did)  => `block:${did}`,
    shield:          (uid)  => `shield:${uid}`,
    leaderboard:     ()     => 'lb:trophies',
    guestLink:       (gid)  => `guest:tg:${gid}`,
    recentDefenders: (aid)  => `recdef:${aid}`,
};

export const TTL = {
    session:        604_800,
    battleLock:     180,
    recentDefender: 3_600,
    guestLink:      86_400,
};
