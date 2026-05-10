// ============================================
// SUPER ASKARLAR TIZIMI (Super Troops)
// CoC-uslubida: Golden Apple ishlatib vaqtincha
// askarlarni güclü versiyaga aylantirish
// ============================================

// Super troop konfiguratsiyasi: oddiy tur → super versiya
const SUPER_TROOP_DATA = {
    // Super Legioner: splash zarar + 2x HP + 1.3x tezlik
    legionary: {
        name:        'Super Legioner',
        icon:        '⚔️🔥',
        color:       '#ff6d00',
        cost:        { goldenApple: 25_000 },
        duration:    3 * 24 * 3600 * 1000,   // 3 kun
        description: 'Splash zarar: 1.5-tile atrofidagi barcha nishonlarga zarar yetkazadi.',
        statMult:  { hp: 2.0, damage: 1.5, speed: 1.3 },
        specialOverride: {
            splashDamage: true,
            splashRadius: 1.5,
        },
    },
    // Super Praetorian: zarar qaytarish + 2.5x HP
    praetorian: {
        name:        'Super Pretorianets',
        icon:        '🛡️🔥',
        color:       '#1565c0',
        cost:        { goldenApple: 50_000 },
        duration:    3 * 24 * 3600 * 1000,
        description: 'Dushman zararining 30% ini qaytaradi.',
        statMult:  { hp: 2.5, damage: 1.4, speed: 1.0 },
        specialOverride: {
            damageReflect: 0.30,
        },
    },
    // Super Sagittarius: uch nishon bir vaqtda
    sagittarius: {
        name:        'Super Mergan',
        icon:        '🏹🔥',
        color:       '#00897b',
        cost:        { goldenApple: 20_000 },
        duration:    3 * 24 * 3600 * 1000,
        description: 'Bir vaqtda 3 ta nishonga o\'q uzadi.',
        statMult:  { hp: 1.8, damage: 1.6, speed: 1.2 },
        specialOverride: {
            multiTarget: 3,
        },
    },
    // Super Minotaur: mudofaa binolarga 3x zarar, devor tezroq buziladi
    minotaur: {
        name:        'Super Minotavr',
        icon:        '🗿🔥',
        color:       '#6a1b9a',
        cost:        { goldenApple: 60_000 },
        duration:    3 * 24 * 3600 * 1000,
        description: 'Mudofaa binolarga 3x zarar beradi. Devorlarni ham tezroq buzadi.',
        statMult:  { hp: 2.2, damage: 2.0, speed: 0.9 },
        specialOverride: {
            bonusVsDefense: 3.0,
            wallBreaker: true,
        },
    },
    // Super Ballistae: AoE radius 2x, zarar 2.5x, chain damage
    ballistae: {
        name:        'Super Ballistae',
        icon:        '🧙🔥',
        color:       '#7b1fa2',
        cost:        { goldenApple: 80_000 },
        duration:    3 * 24 * 3600 * 1000,
        description: 'AoE radius 2x, zarar 2.5x, chain damage effekti.',
        statMult:  { hp: 1.6, damage: 2.5, speed: 1.0 },
        specialOverride: {
            splashDamage: true,
            splashRadius: 3.0,
            chainDamage:  true,
        },
    },
};

const SuperTroops = {
    // Faol super troop'lar: { troopType: { until, data } }
    active: {},

    init() {
        // Save tizimidan yuklanadi
    },

    // Super troop faolmi?
    isActive(troopType) {
        const a = this.active[troopType];
        if (!a) return false;
        if (Date.now() > a.until) {
            delete this.active[troopType];
            return false;
        }
        return true;
    },

    // Super troop ma'lumotlarini olish (null bo'lsa super emas)
    getSuperData(troopType) {
        if (!this.isActive(troopType)) return null;
        return SUPER_TROOP_DATA[troopType] || null;
    },

    // Super troop faollashtirish
    activate(troopType) {
        const cfg = SUPER_TROOP_DATA[troopType];
        if (!cfg) {
            if (typeof Toast !== 'undefined') Toast.show('Bu askar uchun super versiya yo\'q!', 'error');
            return false;
        }
        if (this.isActive(troopType)) {
            if (typeof Toast !== 'undefined') Toast.show(`${cfg.name} allaqachon faol!`, 'info');
            return false;
        }
        if (!Resources.spendMultiple(cfg.cost)) {
            const needed = Object.entries(cfg.cost).map(([t, a]) => `${a.toLocaleString()} ${t}`).join(', ');
            if (typeof Toast !== 'undefined') Toast.show(`${needed} kerak!`, 'error');
            return false;
        }

        this.active[troopType] = { until: Date.now() + cfg.duration };

        const troop = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[troopType] : null;
        const troopName = troop?.name || troopType;
        if (typeof Toast !== 'undefined')
            Toast.show(`🔥 ${cfg.name} (${troopName}) faollashtirildi! 3 kun davom etadi.`, 'reward', 4000);
        if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();
        return true;
    },

    // Super troop bekor qilish (refund yo'q)
    deactivate(troopType) {
        delete this.active[troopType];
        if (typeof Toast !== 'undefined') Toast.show('Super troop bekor qilindi.', 'info');
    },

    // Qolgan vaqt (ms)
    getRemaining(troopType) {
        const a = this.active[troopType];
        if (!a) return 0;
        return Math.max(0, a.until - Date.now());
    },

    // Troop stats ga super bonuslarini qo'llash (battleManager.deployTroop da ishlatiladi)
    applyToTroop(troop) {
        const cfg = this.getSuperData(troop.type);
        if (!cfg) return troop;

        const mult = cfg.statMult;
        if (mult.hp)     troop.hp     = Math.round(troop.hp     * mult.hp);
        if (mult.hp)     troop.maxHp  = troop.hp;
        if (mult.damage) troop.damage = Math.round((troop.damage || TROOP_DATA[troop.type]?.stats.damage || 10) * mult.damage);
        if (mult.speed)  troop.speed  = (troop.speed  || 1.0) * mult.speed;

        // Override spetsial qobiliyatlar
        const ov = cfg.specialOverride || {};
        if (ov.splashDamage) { troop._superSplash = true; troop._superSplashR = ov.splashRadius || 1.5; }
        if (ov.multiTarget)  { troop._superMultiTarget = ov.multiTarget; }
        if (ov.damageReflect){ troop._superDmgReflect = ov.damageReflect; }
        if (ov.bonusVsDefense) { troop._superVsDefense = ov.bonusVsDefense; }
        if (ov.chainDamage)  { troop._superChain = true; }
        if (ov.wallBreaker)  { troop._superWallBreaker = true; }

        troop._isSuper = true;
        troop._superIcon = cfg.icon;
        troop._superColor = cfg.color;
        return troop;
    },

    // Super troop UI: ro'yxat generatsiyasi (armyPanel / shopPanel)
    renderPanel(container) {
        if (!container) return;
        const thLevel = typeof Game !== 'undefined' ? (Game.townHallLevel || 1) : 1;
        let html = `
            <div style="font-size:10px;color:#888;padding:4px 8px;margin-bottom:4px;letter-spacing:1px;text-transform:uppercase;">
                🔥 Super Askarlar
                <span style="font-size:9px;color:#666;text-transform:none;letter-spacing:0;">(Golden Apple ishlatiladi)</span>
            </div>`;

        for (const [troopType, cfg] of Object.entries(SUPER_TROOP_DATA)) {
            const base = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[troopType] : null;
            if (!base) continue;
            if (thLevel < (base.unlockBarracks || 1) + 3) continue; // TH parity gate

            const isActive = this.isActive(troopType);
            const rem = this.getRemaining(troopType);
            const remHr = Math.ceil(rem / 3_600_000);
            const cost = Object.entries(cfg.cost).map(([t, a]) => `🍏 ${a.toLocaleString()}`).join(' ');

            const statLine = Object.entries(cfg.statMult)
                .filter(([, v]) => v !== 1.0)
                .map(([k, v]) => {
                    const icons = { hp:'❤️', damage:'⚔️', speed:'💨' };
                    return `${icons[k] || k} x${v}`;
                }).join(' ');

            html += `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;margin-bottom:3px;
                            background:${isActive ? 'rgba(255,109,0,0.12)' : 'rgba(255,255,255,0.04)'};
                            border:1px solid ${isActive ? 'rgba(255,109,0,0.4)' : 'rgba(255,255,255,0.08)'};
                            border-radius:8px;">
                    <div style="font-size:22px;line-height:1;min-width:28px;text-align:center;">${cfg.icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:11px;font-weight:700;color:${isActive ? cfg.color : '#ddd'};">
                            ${cfg.name}
                            <span style="font-size:9px;color:#888;font-weight:400;margin-left:4px;">(${base.name})</span>
                        </div>
                        <div style="font-size:9px;color:#aaa;margin-top:1px;">${cfg.description}</div>
                        <div style="font-size:9px;color:#81c784;margin-top:1px;">${statLine}</div>
                        ${isActive ? `<div style="font-size:9px;color:#ff9800;margin-top:2px;">⏳ ${remHr} soat qoldi</div>` : ''}
                    </div>
                    <div style="flex-shrink:0;">
                        ${isActive
                            ? `<button onclick="SuperTroops.deactivate('${troopType}')"
                                       style="background:rgba(244,67,54,0.2);border:1px solid rgba(244,67,54,0.4);
                                              color:#ef9a9a;padding:4px 8px;border-radius:5px;cursor:pointer;
                                              font-size:9px;">Bekor</button>`
                            : `<button onclick="SuperTroops.activate('${troopType}')"
                                       style="background:linear-gradient(135deg,rgba(255,109,0,0.3),rgba(255,152,0,0.3));
                                              border:1px solid rgba(255,152,0,0.5);
                                              color:#ffcc80;padding:4px 8px;border-radius:5px;cursor:pointer;
                                              font-size:9px;font-weight:700;">${cost}</button>`
                        }
                    </div>
                </div>`;
        }
        container.innerHTML = html;
    },

    // Save / Load
    serialize() {
        return JSON.parse(JSON.stringify(this.active));
    },

    deserialize(data) {
        if (!data) return;
        const now = Date.now();
        for (const [type, info] of Object.entries(data)) {
            if (info.until > now) {
                this.active[type] = info;
            }
        }
    },
};
