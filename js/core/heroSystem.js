// ============================================
// HERO SYSTEM — 4 Qahramon, Haykal tizimi
// CoC + Total Conquest uslubida
// ============================================

const HERO_MAX_LEVEL = 40;

// Har daraja uchun XP talabi
function _heroXpForLevel(level) {
    return Math.floor(120 * Math.pow(1.35, level - 1));
}

// HP multiplier: har daraja +5%
function _heroHpMult(level) {
    return 1 + (level - 1) * 0.05;
}

// Damage multiplier: har daraja +3%
function _heroDmgMult(level) {
    return 1 + (level - 1) * 0.03;
}

// ── Qahramon konfiguratsiyasi ──────────────────────────────────────────────
// heroKey → haykal turi + ochilish TH
const HERO_CONFIG = {
    legatus: {
        statueType: 'legatusStatue',
        thRequired: 4,
        regenBase: 2700,        // sekund
        abilityKey: 'honor_cry',
        abilityCooldown: 40000,
    },
    aquilifer: {
        statueType: 'aquiliferStatue',
        thRequired: 6,
        regenBase: 2400,
        abilityKey: 'eagle_mark',
        abilityCooldown: 50000,
    },
    praetorian_guard: {
        statueType: 'praetoranStatue',
        thRequired: 8,
        regenBase: 3600,
        abilityKey: 'stone_shield',
        abilityCooldown: 35000,
    },
    imperatrix: {
        statueType: 'imperatriceStatue',
        thRequired: 10,
        regenBase: 4800,
        abilityKey: 'imperium',
        abilityCooldown: 60000,
    },
    // Eski qahramonlar — muvofiqlik uchun saqlanadi
    commander: {
        statueType: null,           // Haykal kerak emas (eski tizim)
        thRequired: 1,
        regenBase: 3600,
        abilityKey: 'battle_cry',
        abilityCooldown: 45000,
    },
    sagittaria: {
        statueType: null,
        thRequired: 1,
        regenBase: 2400,
        abilityKey: 'arrow_rain',
        abilityCooldown: 55000,
    },
};

const HeroSystem = {
    // Barcha qahramonlar holati
    commanders: {
        legatus: {
            level: 1,
            xp: 0,
            sleeping: false,
            sleepUntil: 0,
        },
        aquilifer: {
            level: 1,
            xp: 0,
            sleeping: false,
            sleepUntil: 0,
        },
        praetorian_guard: {
            level: 1,
            xp: 0,
            sleeping: false,
            sleepUntil: 0,
        },
        imperatrix: {
            level: 1,
            xp: 0,
            sleeping: false,
            sleepUntil: 0,
        },
        // Eski qahramonlar
        commander: {
            level: 1,
            xp: 0,
            sleeping: false,
            sleepUntil: 0,
        },
        sagittaria: {
            level: 1,
            xp: 0,
            sleeping: false,
            sleepUntil: 0,
        },
    },

    init() {
        // save/load tizimi orqali yuklanadi
    },

    // ── Qurilgan haykallarga qarab aktiv qahramonlar ───────────────────────
    // GameState.buildings massivida isHeroStatue === true bo'lgan binolar tekshiriladi
    getActiveHeroes() {
        const active = [];
        const thLevel = typeof Game !== 'undefined' ? (Game.townHallLevel || 1) : 1;

        for (const [heroKey, cfg] of Object.entries(HERO_CONFIG)) {
            // TH talabini tekshir
            if (thLevel < cfg.thRequired) continue;

            // Haykal kerak bo'lmagan eski qahramonlar
            if (cfg.statueType === null) {
                active.push(heroKey);
                continue;
            }

            // Haykal qurilganmi?
            const statueBuilt = this._isStatueBuilt(cfg.statueType);
            if (statueBuilt) {
                active.push(heroKey);
            }
        }
        return active;
    },

    _isStatueBuilt(statueType) {
        // BuildingManager.buildings dan tekshirish
        if (typeof BuildingManager === 'undefined') return false;
        return Object.values(BuildingManager.buildings).some(
            b => b.type === statueType && !b.building
        );
    },

    // ── Qahramonni jangda ishlatish mumkinmi? ──────────────────────────────
    isAvailableForBattle(heroKey) {
        const active = this.getActiveHeroes();
        if (!active.includes(heroKey)) return false;
        const hero = this.commanders[heroKey];
        if (!hero) return false;
        return !hero.sleeping;
    },

    isAvailable(heroType) {
        return this.isAvailableForBattle(heroType);
    },

    // ── Stat hisoblash (daraja asosida) ───────────────────────────────────
    getCommanderStats(heroKey) {
        const hero = this.commanders[heroKey];
        if (!hero) return null;
        const base = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[heroKey] : null;
        if (!base) return null;

        const hpMult  = _heroHpMult(hero.level);
        const dmgMult = _heroDmgMult(hero.level);

        const result = {
            hp:     Math.round(base.stats.hp     * hpMult),
            damage: Math.round(base.stats.damage * dmgMult),
            speed:  base.stats.speed,
            range:  base.stats.range,
            level:  hero.level,
        };

        // Aura bonuslari
        if (base.stats.aura) {
            result.aura = true;
            result.auraRadius = base.stats.auraRadius;
            result.auraDamageBonus = Math.min(
                0.60,
                (base.stats.auraDamageBonus || 0.15) + Math.floor((hero.level - 1) / 5) * 0.02
            );
            if (base.stats.auraRangeBonus) {
                result.auraRangeBonus = Math.min(
                    0.50,
                    base.stats.auraRangeBonus + Math.floor((hero.level - 1) / 5) * 0.015
                );
            }
        }

        // Qo'shimcha statslar
        if (base.stats.damageReduction)  result.damageReduction  = base.stats.damageReduction;
        if (base.stats.splashDamage)     result.splashDamage     = true;
        if (base.stats.splashRadius)     result.splashRadius     = base.stats.splashRadius;

        return result;
    },

    // ── XP berish ─────────────────────────────────────────────────────────
    grantBattleXP(heroKey, victory) {
        const hero = this.commanders[heroKey];
        if (!hero) return;
        if (hero.level >= HERO_MAX_LEVEL) return;

        const baseXP = victory ? 50 : 15;
        hero.xp += baseXP;

        let levelsGained = 0;
        while (hero.level < HERO_MAX_LEVEL) {
            const needed = _heroXpForLevel(hero.level);
            if (hero.xp < needed) break;
            hero.xp -= needed;
            hero.level++;
            levelsGained++;
        }

        if (levelsGained > 0) {
            this._showHeroLevelUpBanner(heroKey, hero.level);
            if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();
        }
    },

    // Barcha aktiv qahramonlarga XP berish (jangdan keyin)
    grantBattleXPAll(victory) {
        const active = this.getActiveHeroes();
        for (const heroKey of active) {
            this.grantBattleXP(heroKey, victory);
        }
    },

    // ── Tiklanish (Regeneration — CoC kabi) ───────────────────────────────
    startRegen(heroKey) {
        const hero = this.commanders[heroKey];
        if (!hero || hero.sleeping) return;
        const cfg  = HERO_CONFIG[heroKey];
        const regenTime = (cfg?.regenBase || 3600) * 1000;
        hero.sleeping   = true;
        hero.sleepUntil = Date.now() + regenTime;
    },

    checkRegen() {
        const now = Date.now();
        for (const [heroKey, hero] of Object.entries(this.commanders)) {
            if (hero.sleeping && now >= hero.sleepUntil) {
                hero.sleeping  = false;
                hero.sleepUntil = 0;
                // Qahramon tiklanib bo'ldi — xabar ko'rsatish
                // (qahramonlar TroopManager.army da saqlanmaydi, ular alohida tizim)
                const troopData = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[heroKey] : null;
                const heroName = troopData?.name || heroKey;
                if (typeof Toast !== 'undefined') {
                    Toast.show(`👑 ${heroName} tiklanib bo'ldi! Jangga tayyor.`, 'info', 4000);
                }
            }
        }
    },

    getRegenRemaining(heroKey) {
        const hero = this.commanders[heroKey];
        if (!hero || !hero.sleeping) return 0;
        return Math.max(0, hero.sleepUntil - Date.now()) / 1000;
    },

    // ── Qobiliyat (Ability) tizimi ────────────────────────────────────────
    _abilityUsedAt: {},

    canUseAbility(heroKey) {
        const ht = heroKey || 'commander';
        const cfg = HERO_CONFIG[ht];
        const cd  = cfg?.abilityCooldown || 45000;
        const last = this._abilityUsedAt[ht] || 0;
        return (Date.now() - last) > cd;
    },

    getAbilityCooldownLeft(heroKey) {
        const ht  = heroKey || 'commander';
        const cfg = HERO_CONFIG[ht];
        const cd  = cfg?.abilityCooldown || 45000;
        const last = this._abilityUsedAt[ht] || 0;
        return Math.max(0, Math.ceil((cd - (Date.now() - last)) / 1000));
    },

    getAbilityInfo(heroKey) {
        const ht = heroKey || 'commander';
        const troop = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[ht] : null;
        const ab = troop?.specialAbility;
        const defaults = {
            legatus:          { name: 'Shon-sharaf Nidosi', icon: '🦁', color: '#ffca28' },
            aquilifer:        { name: 'Burgut Nishoni',     icon: '🦅', color: '#78909c' },
            praetorian_guard: { name: 'Tosh Qalqon',        icon: '🛡️', color: '#546e7a' },
            imperatrix:       { name: "Imperium G'oyati",   icon: '⚜️', color: '#ffd700' },
            commander:        { name: 'Jang Nidosi',        icon: '👑', color: '#ffd700' },
            sagittaria:       { name: "O'q Yomg'iri",       icon: '🏹', color: '#69f0ae' },
        };
        return defaults[ht] || { name: ab?.name || 'Qobiliyat', icon: '⚡', color: '#fff' };
    },

    useAbility(heroKeyOrX, xOrY, yArg) {
        // Eski va yangi API ni qo'llab-quvvatlash
        let heroKey, x, y;
        if (typeof heroKeyOrX === 'string') {
            heroKey = heroKeyOrX; x = xOrY; y = yArg;
        } else {
            heroKey = 'commander'; x = heroKeyOrX; y = xOrY;
        }

        if (!this.canUseAbility(heroKey)) {
            if (typeof Toast !== 'undefined') {
                Toast.show(`Qobiliyat ${this.getAbilityCooldownLeft(heroKey)}s da tayyor!`, 'warn', 1000);
            }
            return false;
        }
        this._abilityUsedAt[heroKey] = Date.now();

        switch (heroKey) {
            case 'legatus':          return this._useLegatusAbility(x, y);
            case 'aquilifer':        return this._useAquiliferAbility(x, y);
            case 'praetorian_guard': return this._usePraetorianAbility(x, y);
            case 'imperatrix':       return this._useImperatrixAbility(x, y);
            case 'sagittaria':       return this._useSagittariaAbility(x, y);
            default:                 return this._useCommanderAbility(x, y);
        }
    },

    // ── Legatus: "Shon-sharaf Nidosi" — 3s +50% tezlik ───────────────────
    _useLegatusAbility(x, y) {
        const RADIUS   = 3.5;
        const SPD_BUFF = 0.50;
        const DURATION = 3000;
        let buffed = 0;
        if (typeof BattleManager !== 'undefined') {
            for (const t of BattleManager.troops) {
                if (Math.hypot(t.x - x, t.y - y) <= RADIUS) {
                    t._abilityBuff = { spd: SPD_BUFF, until: Date.now() + DURATION };
                    buffed++;
                }
            }
        }
        this._visualBurst(x, y, '#ffca28', 28);
        if (typeof Toast !== 'undefined')
            Toast.show(`🦁 Shon-sharaf Nidosi! ${buffed} ta askar +50% tezlashdi!`, 'success', 2500);
        return true;
    },

    // ── Aquilifer: "Burgut Nishoni" — 3 ta binoga 5s hujum ───────────────
    _useAquiliferAbility(x, y) {
        const TARGET_COUNT   = 3;
        const DMG_PER_SECOND = 80;
        const DURATION       = 5000;
        const TICK           = 500;
        let targeted = 0;

        if (typeof BattleManager !== 'undefined') {
            // Eng yaqin 3 ta binoni topish (BuildingManager.buildings — ob'ekt, array emas)
            const aliveBuildings = Object.values(BuildingManager.buildings)
                .filter(b => b && b.hp > 0)
                .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))
                .slice(0, TARGET_COUNT);

            for (const bld of aliveBuildings) {
                targeted++;
                const ticks = DURATION / TICK;
                const dmgPerTick = DMG_PER_SECOND * (TICK / 1000);
                const bldId = bld.id;
                for (let i = 0; i < ticks; i++) {
                    setTimeout(() => {
                        const target = BuildingManager.buildings[bldId];
                        if (target && target.hp > 0) {
                            BattleManager._damageBuilding(bldId, dmgPerTick);
                        }
                    }, i * TICK);
                }
            }
        }

        // Visual
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const tx = x + Math.cos(angle) * 3;
            const ty = y + Math.sin(angle) * 3;
            setTimeout(() => this._visualBurst(tx, ty, '#78909c', 10), i * 60);
        }
        this._visualBurst(x, y, '#90a4ae', 20);
        if (typeof Toast !== 'undefined')
            Toast.show(`🦅 Burgut Nishoni! ${targeted} ta bino hujum ostida!`, 'success', 2500);
        return true;
    },

    // ── Praetorian Guard: "Tosh Qalqon" — 4s 70% himoya + splash ─────────
    _usePraetorianAbility(x, y) {
        const DURATION    = 4000;
        const DMG_REDUCE  = 0.70;
        const SPLASH_R    = 1.8;

        if (typeof BattleManager !== 'undefined') {
            // Praetorian Guardian askarni topish
            for (const t of BattleManager.troops) {
                if (t.type === 'praetorian_guard') {
                    t._stoneShield = {
                        active:    true,
                        until:     Date.now() + DURATION,
                        reduction: DMG_REDUCE,
                        splash:    SPLASH_R,
                    };
                    break;
                }
            }
        }

        // Visual — tosh effekti
        if (typeof BattleRenderer !== 'undefined') {
            BattleRenderer.addExplosion?.(x, y, '#546e7a', 35);
            BattleRenderer.addExplosion?.(x, y, '#90a4ae', 20);
            BattleRenderer.triggerShake?.(10, 400);
        }
        if (typeof Toast !== 'undefined')
            Toast.show(`🛡️ Tosh Qalqon! 4s davomida 70% himoya + splash!`, 'success', 2500);
        return true;
    },

    // ── Imperatrix: "Imperium G'oyati" — barcha HP tiklanadi + 8s rage ────
    _useImperatrixAbility(x, y) {
        const RAGE_DUR   = 8000;
        const RAGE_DMG   = 0.80;
        const RAGE_SPD   = 0.50;
        let healed = 0;
        let raged  = 0;

        if (typeof BattleManager !== 'undefined') {
            for (const t of BattleManager.troops) {
                if (!t || t.hp <= 0) continue;
                // To'liq HP tiklash
                const base = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[t.type] : null;
                if (base?.stats?.hp) {
                    t.hp = base.stats.hp;
                    healed++;
                }
                // Rage buffi
                t._abilityBuff = {
                    dmg:   RAGE_DMG,
                    spd:   RAGE_SPD,
                    until: Date.now() + RAGE_DUR,
                };
                raged++;
            }
        }

        // Visual — oltin portlash
        if (typeof BattleRenderer !== 'undefined') {
            BattleRenderer.addExplosion?.(x, y, '#ffd700', 50);
            BattleRenderer.addExplosion?.(x, y, '#ff8c00', 35);
            BattleRenderer.addExplosion?.(x, y, '#ffffff', 20);
            BattleRenderer.triggerShake?.(15, 600);
        }
        this._burstHeroConfetti(null, null, null); // screen center — x/y grid coords emas
        if (typeof Toast !== 'undefined')
            Toast.show(`⚜️ Imperium G'oyati! ${healed} ta askar tiklanib, ${raged} ta rage oldi!`, 'success', 3500);
        if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();
        return true;
    },

    // ── Commander (eski): "Jang Nidosi" ──────────────────────────────────
    _useCommanderAbility(x, y) {
        const BUFF_RADIUS = 4;
        const BUFF_DMG    = 0.6;
        const BUFF_SPD    = 0.4;
        const BUFF_DUR    = 3000;
        let buffed = 0;
        if (typeof BattleManager !== 'undefined') {
            for (const t of BattleManager.troops) {
                if (Math.hypot(t.x - x, t.y - y) <= BUFF_RADIUS) {
                    t._abilityBuff = { dmg: BUFF_DMG, spd: BUFF_SPD, until: Date.now() + BUFF_DUR };
                    buffed++;
                }
            }
        }
        this._visualBurst(x, y, '#ffd700', 30);
        if (typeof BattleRenderer !== 'undefined') {
            BattleRenderer.addExplosion?.(x, y, '#ff9800', 20);
            BattleRenderer.triggerShake?.(8, 300);
        }
        if (typeof Toast !== 'undefined')
            Toast.show(`👑 Jang Nidosi! ${buffed} ta askar kuchaydi!`, 'success', 2500);
        return true;
    },

    // ── Sagittaria (eski): "O'q Yomg'iri" ────────────────────────────────
    _useSagittariaAbility(x, y) {
        const SHOT_RADIUS  = 5;
        const SHOTS        = 8;
        const DMG_PER_SHOT = 100;
        let hit = 0;
        if (typeof BattleManager !== 'undefined') {
            for (const b of Object.values(BuildingManager.buildings)) {
                if (!b || b.hp <= 0) continue;
                if (Math.hypot(b.x - x, b.y - y) <= SHOT_RADIUS) {
                    const bId = b.id;
                    for (let i = 0; i < SHOTS; i++) {
                        setTimeout(() => {
                            const target = BuildingManager.buildings[bId];
                            if (target && target.hp > 0) {
                                BattleManager._damageBuilding(bId, DMG_PER_SHOT);
                            }
                        }, i * 500);
                    }
                    hit++;
                }
            }
        }
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const tx = x + Math.cos(angle) * SHOT_RADIUS;
            const ty = y + Math.sin(angle) * SHOT_RADIUS;
            setTimeout(() => {
                if (typeof BattleRenderer !== 'undefined')
                    BattleRenderer.addExplosion?.(tx, ty, '#69f0ae', 12);
            }, i * 80);
        }
        this._visualBurst(x, y, '#00e676', 25);
        if (typeof Toast !== 'undefined')
            Toast.show(`🏹 O'q Yomg'iri! ${hit} ta bino zarbga uchradi!`, 'success', 2500);
        return true;
    },

    // ── Visual yordamchi ──────────────────────────────────────────────────
    _visualBurst(x, y, color, size) {
        if (typeof BattleRenderer !== 'undefined') {
            BattleRenderer.addExplosion?.(x, y, color, size);
            // Kengayuvchi yer halqasi — qobiliyat zonasini ko'rsatadi
            BattleRenderer.addGroundRing?.(x, y, color, Math.max(3, size * 0.18), 700);
            // Kechiktirilgan ikkinchi halqa — dramatik effekt
            setTimeout(() => {
                BattleRenderer.addGroundRing?.(x, y, color, Math.max(4, size * 0.22), 550);
            }, 120);
        }
        if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();
    },

    // ── XP progressi (0..1) ───────────────────────────────────────────────
    getXPProgress(heroKey) {
        const hero = this.commanders[heroKey];
        if (!hero) return 0;
        if (hero.level >= HERO_MAX_LEVEL) return 1;
        return hero.xp / _heroXpForLevel(hero.level);
    },

    // ── Barcha qahramonlarning aura bonuslarini hisoblash ─────────────────
    getAllHeroAura() {
        let damageMult = 1.0;
        let rangeMult  = 1.0;
        const active   = this.getActiveHeroes();

        for (const heroKey of active) {
            const hero  = this.commanders[heroKey];
            if (!hero || !this.isAvailable(heroKey)) continue;
            const stats = this.getCommanderStats(heroKey);
            if (!stats) continue;
            const lv = hero.level;

            // Har 5 daraja uchun +2% zarar aura
            damageMult += Math.floor(lv / 5) * 0.02;

            // Rangega alohida bonus
            if (stats.auraRangeBonus) {
                rangeMult += Math.floor(lv / 5) * 0.01;
            }
        }
        return { damageMult, rangeMult };
    },

    // ── Level-up banner ───────────────────────────────────────────────────
    _showHeroLevelUpBanner(heroKey, newLevel) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position:fixed;inset:0;
            background:radial-gradient(ellipse at center,rgba(255,215,0,0.12) 0%,transparent 70%);
            z-index:19990;pointer-events:none;
            animation:achFlash 0.6s ease-out forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 650);

        const troop    = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[heroKey] : null;
        const heroName = troop?.name || heroKey;
        const heroIcon = troop?.icon || '👑';
        const hpBonus  = Math.round((newLevel - 1) * 5);
        const dmgBonus = Math.round((newLevel - 1) * 3);

        const banner = document.createElement('div');
        banner.style.cssText = `
            position:fixed;top:72px;left:50%;
            transform:translateX(-50%) translateY(-20px);opacity:0;
            background:linear-gradient(160deg,#1a1200 0%,#2a1e00 50%,#1a1200 100%);
            border:2px solid #ffd700;border-radius:16px;
            padding:14px 22px 12px;z-index:20000;
            min-width:260px;max-width:320px;text-align:center;
            box-shadow:0 0 0 1px rgba(255,215,0,0.12),
                       0 4px 28px rgba(255,140,0,0.4),
                       0 0 50px rgba(255,215,0,0.12);
            transition:transform 0.42s cubic-bezier(.175,.885,.32,1.275),opacity 0.28s;
            cursor:pointer;
        `;
        banner.innerHTML = `
            <div style="position:absolute;top:0;left:12%;right:12%;height:2px;
                        background:linear-gradient(90deg,transparent,#ffd700,transparent);
                        border-radius:2px;"></div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:3px;
                        color:#b8860b;margin-bottom:7px;font-weight:700;">✦ Qahramon Kuchaydi ✦</div>
            <div style="position:relative;display:inline-block;margin-bottom:8px;">
                <div style="width:58px;height:58px;border-radius:50%;margin:0 auto;
                            background:radial-gradient(circle,rgba(255,215,0,0.25) 0%,rgba(255,140,0,0.05) 70%);
                            border:2px solid rgba(255,215,0,0.6);
                            display:flex;align-items:center;justify-content:center;font-size:30px;
                            box-shadow:0 0 18px rgba(255,215,0,0.45),inset 0 0 12px rgba(255,215,0,0.1);
                            animation:achIconPulse 1.6s ease-in-out infinite;">
                    ${heroIcon}
                </div>
            </div>
            <div style="font-family:'Cinzel',serif;font-size:14px;font-weight:700;
                        color:#ffd700;margin-bottom:3px;text-shadow:0 0 10px rgba(255,215,0,0.5);">
                ${heroName} Lv${newLevel}
            </div>
            <div style="font-size:10px;color:rgba(200,200,200,0.55);margin-bottom:8px;">
                Maksimal daraja: ${HERO_MAX_LEVEL}
            </div>
            <div style="display:flex;gap:5px;justify-content:center;flex-wrap:wrap;">
                <span style="display:inline-flex;align-items:center;gap:3px;
                             background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                             border-radius:20px;padding:2px 8px;font-size:11px;color:#ef9a9a;font-weight:600;">
                    ❤️ +${hpBonus}% HP
                </span>
                <span style="display:inline-flex;align-items:center;gap:3px;
                             background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                             border-radius:20px;padding:2px 8px;font-size:11px;color:#ff8a65;font-weight:600;">
                    ⚔️ +${dmgBonus}% zarar
                </span>
                <span style="display:inline-flex;align-items:center;gap:3px;
                             background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                             border-radius:20px;padding:2px 8px;font-size:11px;color:#ce93d8;font-weight:600;">
                    ✦ ${newLevel}/${HERO_MAX_LEVEL}
                </span>
            </div>
            <div style="position:absolute;bottom:0;left:12%;right:12%;height:1px;
                        background:linear-gradient(90deg,transparent,rgba(255,215,0,0.3),transparent);"></div>
        `;
        document.body.appendChild(banner);

        requestAnimationFrame(() => {
            banner.style.transform = 'translateX(-50%) translateY(0)';
            banner.style.opacity   = '1';
        });

        this._burstHeroConfetti(banner, null, null);

        const dismissTimer = setTimeout(() => {
            banner.style.transform  = 'translateX(-50%) translateY(-14px)';
            banner.style.opacity    = '0';
            banner.style.transition = 'transform 0.3s ease-in,opacity 0.25s';
            setTimeout(() => banner.remove(), 320);
        }, 3500);

        banner.onclick = () => {
            clearTimeout(dismissTimer);
            banner.style.transform  = 'translateX(-50%) translateY(-14px)';
            banner.style.opacity    = '0';
            banner.style.transition = 'transform 0.22s ease-in,opacity 0.18s';
            setTimeout(() => banner.remove(), 230);
        };
    },

    _burstHeroConfetti(anchor, cx_override, cy_override) {
        let cx, cy;
        if (anchor) {
            const rect = anchor.getBoundingClientRect();
            cx = rect.left + rect.width  / 2;
            cy = rect.top  + rect.height / 2;
        } else {
            cx = cx_override ?? window.innerWidth  / 2;
            cy = cy_override ?? window.innerHeight / 2;
        }
        const colors = ['#ffd700','#ff8c00','#fff59d','#ffe082','#ffb74d','#ffffff'];
        for (let i = 0; i < 26; i++) {
            const p     = document.createElement('div');
            const size  = 4 + Math.random() * 5;
            const angle = Math.random() * Math.PI * 2;
            const dist  = 50 + Math.random() * 100;
            const tx    = Math.cos(angle) * dist;
            const ty    = Math.sin(angle) * dist - 20;
            const rot   = Math.random() * 600 - 300;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = Math.random() > 0.5 ? '50%' : '2px';
            p.style.cssText = `
                position:fixed;left:${cx - size/2}px;top:${cy - size/2}px;
                width:${size}px;height:${size}px;
                background:${color};border-radius:${shape};
                pointer-events:none;z-index:20001;
                transition:transform 0.85s cubic-bezier(0,.7,.3,1),opacity 0.85s ease-in;opacity:1;
            `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg)`;
                p.style.opacity   = '0';
            });
            setTimeout(() => p.remove(), 900);
        }
    },

    // ── Hero HUD render ───────────────────────────────────────────────────
    renderHeroInfo(container) {
        if (!container) return;
        const thLevel  = typeof Game !== 'undefined' ? (Game.townHallLevel || 1) : 1;
        const active   = this.getActiveHeroes();
        let html = '';

        for (const heroKey of Object.keys(this.commanders)) {
            const hero  = this.commanders[heroKey];
            const troop = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[heroKey] : null;
            if (!troop) continue;

            const cfg       = HERO_CONFIG[heroKey];
            const isActive  = active.includes(heroKey);
            const locked    = thLevel < (cfg?.thRequired || 1);
            const needStatue = cfg?.statueType && !this._isStatueBuilt(cfg.statueType);
            const level     = hero.level;
            const prog      = this.getXPProgress(heroKey);
            const stats     = this.getCommanderStats(heroKey);
            const regenSec  = this.getRegenRemaining(heroKey);
            const ab        = this.getAbilityInfo(heroKey);

            const regenStr = regenSec > 0
                ? `<div class="hero-regen">⏳ ${Math.ceil(regenSec / 60)} daqiqa tiklanish</div>`
                : '';
            const lockedStr = locked
                ? `<div style="font-size:9px;color:#f44336;margin-top:2px;">🔒 TH ${cfg?.thRequired}+ kerak</div>`
                : '';
            const statueStr = (!locked && needStatue)
                ? `<div style="font-size:9px;color:#ff9800;margin-top:2px;">🗿 Haykal qurib bering</div>`
                : '';

            const hpBonus  = Math.round((level - 1) * 5);
            const dmgBonus = Math.round((level - 1) * 3);

            html += `
                <div class="hero-card" style="opacity:${isActive ? '1' : '0.45'};">
                    <div class="hero-icon" style="color:${ab.color}">${troop.icon}</div>
                    <div class="hero-info">
                        <div class="hero-name">${troop.name}
                            <span class="hero-level">Lv${level}</span>
                            <span style="font-size:9px;color:${ab.color};margin-left:4px;">${ab.icon} ${ab.name}</span>
                        </div>
                        <div class="hero-xp-bar">
                            <div class="hero-xp-fill" style="width:${Math.round(prog * 100)}%"></div>
                        </div>
                        <div class="hero-stats">
                            ${stats ? `❤️ ${typeof Helpers !== 'undefined' ? Helpers.formatNumber(stats.hp) : stats.hp}
                                       &nbsp;⚔️ ${typeof Helpers !== 'undefined' ? Helpers.formatNumber(stats.damage) : stats.damage}
                                       &nbsp;<span style="font-size:9px;color:#aaa;">+${hpBonus}% HP / +${dmgBonus}% DMG</span>` : ''}
                        </div>
                        ${regenStr}${lockedStr}${statueStr}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    },

    // ── Save / Load ────────────────────────────────────────────────────────
    serialize() {
        return JSON.parse(JSON.stringify(this.commanders));
    },

    deserialize(data) {
        if (!data) return;
        for (const [type, saved] of Object.entries(data)) {
            if (this.commanders[type]) {
                Object.assign(this.commanders[type], saved);
            } else {
                // Yangi qahramon bo'lishi mumkin — qo'shib qo'yamiz
                this.commanders[type] = { level: 1, xp: 0, sleeping: false, sleepUntil: 0, ...saved };
            }
        }
    },
};
