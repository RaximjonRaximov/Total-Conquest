// ============================================================
// ASSET MANAGER — Markaziy asset yuklash + animatsiya tizimi
// ============================================================

const AssetManager = {
    _cache: {},       // src → HTMLImageElement | null | 'missing'
    _pending: 0,

    // Asynchronous preload — optional, non-blocking
    preload(srcList, onDone) {
        let remaining = srcList.length;
        if (remaining === 0) { onDone && onDone(); return; }
        for (const src of srcList) {
            this.load(src, () => { if (--remaining === 0) onDone && onDone(); });
        }
    },

    // Sync get — returns HTMLImageElement or null
    load(src, onLoad) {
        if (this._cache[src] === 'missing') return null;
        if (this._cache[src])               { onLoad && onLoad(); return this._cache[src]; }
        if (this._cache[src] === null)       return null; // loading

        this._cache[src] = null;
        const img = new Image();
        img.onload  = () => { this._cache[src] = img; onLoad && onLoad(); };
        img.onerror = () => { this._cache[src] = 'missing'; };
        img.src = src;
        return null;
    },

    get(src) {
        const v = this._cache[src];
        return (v && v !== 'missing') ? v : null;
    },

    // ── Troop sprite ─────────────────────────────────────────────────────────
    // Returns spritesheet image or null (fallback = procedural)
    getTroopSprite(type, state) {
        const src = `assets/troops/${type}/${state}.png`;
        return this.load(src) || null;
    },

    getTroopPortrait(type) {
        const src = `assets/ui/portraits/${type}.png`;
        return this.load(src) || null;
    },

    // ── Building image ────────────────────────────────────────────────────────
    getBuildingImage(type, level) {
        const src = `assets/buildings/${type}/lvl${level}.png`;
        // Also try legacy flat path for backward compat
        if (this.load(src)) return this.get(src);
        const legacy = `assets/buildings/${type}_${level}.png`;
        return this.load(legacy) || null;
    },

    // ── Terrain tile ──────────────────────────────────────────────────────────
    getTerrain(name) {
        return this.load(`assets/terrain/${name}.png`) || null;
    },

    // ── UI icon ───────────────────────────────────────────────────────────────
    getIcon(name) {
        return this.load(`assets/ui/icons/${name}.png`) || null;
    },

    // ── Sprite frame calculator ───────────────────────────────────────────────
    // Returns { img, sx, sy, sw, sh } for ctx.drawImage
    // frameCounts: { idle:4, walk:8, attack:6, death:4 }
    // frameWidth/Height: px per frame in the sheet
    getSpriteFrame(type, state, frameWidth, frameHeight) {
        const img = this.getTroopSprite(type, state);
        if (!img) return null;

        const FPS_ANIM = 10; // animation frames per second
        const totalFrames = img.width / frameWidth;
        const frame = Math.floor(Date.now() / (1000 / FPS_ANIM)) % Math.max(1, Math.floor(totalFrames));

        return {
            img,
            sx: frame * frameWidth,
            sy: 0,
            sw: frameWidth,
            sh: frameHeight || img.height
        };
    },

    // Per-troop frame config
    TROOP_FRAME: {
        legionary:  { w: 64,  h: 96  },
        praetorian: { w: 64,  h: 96  },
        gladiator:  { w: 64,  h: 96  },
        speculator: { w: 64,  h: 96  },
        sagittarius:{ w: 64,  h: 96  },
        ballistae:  { w: 96,  h: 80  },
        centaur:    { w: 96,  h: 96  },
        cataphract: { w: 96,  h: 96  },
        aries:      { w: 96,  h: 80  },
        onager:     { w: 96,  h: 80  },
        minotaur:   { w: 96,  h: 128 },
        medicus:    { w: 64,  h: 96  },
        cyclops:    { w: 128, h: 160 },
        harpy:      { w: 80,  h: 80  },
    },

    getFrame(type, state) {
        const cfg = this.TROOP_FRAME[type] || { w: 64, h: 96 };
        return this.getSpriteFrame(type, state, cfg.w, cfg.h);
    },
};
