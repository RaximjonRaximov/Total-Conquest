// ============================================
// INFO PANEL - Bino va to'siq ma'lumotlari
// ============================================

const InfoPanel = {
    currentBuilding: null,
    currentObstacle: null,

    show(building) {
        this.currentBuilding = building;
        this.currentObstacle = null;
        const panel = document.getElementById('info-panel');
        panel.classList.add('show');
        // Overlay: info panel uchun overlay ko'rsatmaymiz (canvas click bilan yopiladi)
        // Lekin agar boshqa panel overlay ni olgan bo'lsa — uni saqlab qolamiz
        this.render();
    },

    showObstacle(obstacle) {
        this.currentObstacle = obstacle;
        this.currentBuilding = null;
        const panel = document.getElementById('info-panel');
        panel.classList.add('show');
        this.renderObstacle();
    },

    hide() {
        if (!this.currentBuilding && !this.currentObstacle) return; // allaqachon yopiq
        this.currentBuilding = null;
        this.currentObstacle = null;
        document.getElementById('info-panel').classList.remove('show');
    },

    renderObstacle() {
        const obs = this.currentObstacle;
        if (!obs) return;

        const od = OBSTACLE_DATA[obs.type];
        const panel = document.getElementById('info-panel');

        let html = `<div class="info-title">${od.icon} ${od.name}</div>`;

        // Pozitsiya
        html += `<div class="info-row"><span class="label">Pozitsiya</span><span class="value">(${obs.x}, ${obs.y})</span></div>`;
        html += `<div class="info-row"><span class="label">O'lcham</span><span class="value">${od.size[0]}x${od.size[1]}</span></div>`;

        // Olib tashlash narxi
        let costText = '';
        for (const [res, amt] of Object.entries(od.removeCost)) {
            const icons = { gold: '🪙', food: '🍎', diamond: '💎' };
            costText += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
        }
        html += `<div class="info-row"><span class="label">Olib tashlash</span><span class="value">${costText}</span></div>`;
        html += `<div class="info-row"><span class="label">Vaqt</span><span class="value">${Helpers.formatTime(od.removeTime)}</span></div>`;

        // Mukofotlar
        if (od.rewards) {
            let rewardText = '';
            if (od.rewards.xp) rewardText += `⭐ ${od.rewards.xp} XP `;
            if (od.rewards.diamond) rewardText += `💎 ${od.rewards.diamond} `;
            html += `<div class="info-row"><span class="label">Mukofot</span><span class="value">${rewardText}</span></div>`;
        }

        // Olib tashlash holati
        if (obs.removing && obs.timerId) {
            const rem = timerManager.getRemaining(obs.timerId);
            const prog = timerManager.getProgress(obs.timerId);
            const gemCost = Helpers.calcGemCost(rem);
            html += `<div class="info-row"><span class="label">Olib tashlanmoqda</span><span id="_ip-obs-timer" class="value">${Helpers.formatTime(rem)}</span></div>`;
            html += `<div class="build-progress"><div id="_ip-obs-bar" class="build-progress-fill" style="width:${prog * 100}%"></div></div>`;
            html += `<div class="info-buttons">
                <div class="info-btn" onclick="InfoPanel.speedUpObstacle()">💎 ${gemCost} Tezlashtirish</div>
            </div>`;
        } else {
            // Olib tashlash tugmasi
            html += `<div class="info-buttons">
                <div class="info-btn" onclick="InfoPanel.removeObstacle()">🪓 Olib tashlash</div>
            </div>`;
        }

        panel.innerHTML = html;
    },

    removeObstacle() {
        if (!this.currentObstacle) return;
        const result = ObstacleManager.startRemove(this.currentObstacle.id);
        if (result) {
            this.renderObstacle();
        }
    },

    speedUpObstacle() {
        if (!this.currentObstacle) return;
        const obs = this.currentObstacle;
        const rem = obs.timerId ? timerManager.getRemaining(obs.timerId) : 0;
        const gemCost = Helpers.calcGemCost(rem);
        GemConfirm.show({
            gemCost,
            title: 'To\'siqni tezlashtirish',
            icon: OBSTACLE_DATA[obs.type]?.icon || '🌲',
            timeLabel: `Tejaydi: ${Helpers.formatTime(rem)}`,
            onConfirm: () => {
                ObstacleManager.speedUpRemove(this.currentObstacle.id);
                this.renderObstacle();
            }
        });
    },

    render() {
        const b = this.currentBuilding;
        if (!b) return;

        const bd = BUILDING_DATA[b.type];
        const lv = bd.levels[b.level];
        const panel = document.getElementById('info-panel');

        // ── Devor/Darvoza — maxsus sodda UI ──────────────────────────────────
        if (bd.isBarrier) {
            this._renderBarrier(b, bd, panel);
            return;
        }

        let html = `<div class="info-title">${bd.icon} ${bd.name} (Lvl ${b.level})</div>`;

        // ── Qahramon haykali — maxsus UI ──────────────────────────────────────
        if (bd.isHeroStatue && typeof HeroSystem !== 'undefined') {
            const heroKey  = bd.heroType;
            const hero     = HeroSystem.commanders[heroKey];
            const tdHero   = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[heroKey] : null;
            if (hero && tdHero) {
                const stats    = HeroSystem.getCommanderStats(heroKey);
                const sleeping = hero.sleeping;
                const regenSec = sleeping ? HeroSystem.getRegenRemaining(heroKey) : 0;
                const available = HeroSystem.isAvailableForBattle(heroKey);
                const lvlCap   = typeof HERO_MAX_LEVEL !== 'undefined' ? HERO_MAX_LEVEL : 40;
                const xpNeeded = typeof _heroXpForLevel === 'function' ? _heroXpForLevel(hero.level) : 100;
                const xpPct    = hero.level >= lvlCap ? 100 : Math.min(100, Math.round(hero.xp / xpNeeded * 100));
                const heroColor = sleeping ? '#ff9800' : available ? '#69f0ae' : '#888';

                html += `
                <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);
                            border-radius:10px;padding:10px 12px;margin-bottom:8px;">
                    <!-- Hero header -->
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <div style="font-size:28px;line-height:1;">${tdHero.icon}</div>
                        <div style="flex:1;">
                            <div style="font-size:12px;font-weight:800;color:#ffd700;">${tdHero.name}</div>
                            <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
                                <span style="background:rgba(212,175,55,0.25);color:#ffd700;
                                             font-size:9px;font-weight:900;padding:2px 6px;border-radius:6px;">
                                    LVL ${hero.level}
                                </span>
                                <span style="font-size:9px;color:${heroColor};font-weight:700;">
                                    ${sleeping ? '💤 Tiklanmoqda' : available ? '✅ Tayyor' : '🔒 Haykal kerak'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Stats grid -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;">
                        <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:5px;text-align:center;">
                            <div style="font-size:11px;font-weight:700;color:#ef9a9a;">❤️ ${Helpers.formatNumber(stats?.hp || 0)}</div>
                            <div style="font-size:8px;color:#666;">HP</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:5px;text-align:center;">
                            <div style="font-size:11px;font-weight:700;color:#ff7043;">⚔️ ${Helpers.formatNumber(stats?.damage || 0)}</div>
                            <div style="font-size:8px;color:#666;">Zarar</div>
                        </div>
                    </div>

                    <!-- XP bar -->
                    ${hero.level < lvlCap ? `
                    <div style="margin-bottom:6px;">
                        <div style="display:flex;justify-content:space-between;font-size:9px;color:#888;margin-bottom:3px;">
                            <span>⭐ XP: ${hero.xp}/${xpNeeded}</span>
                            <span>${xpPct}%</span>
                        </div>
                        <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                            <div style="height:100%;width:${xpPct}%;background:linear-gradient(90deg,#ffd70088,#ffd700);border-radius:2px;"></div>
                        </div>
                    </div>` : `<div style="font-size:9px;color:#ffd700;text-align:center;margin-bottom:6px;">⭐ MAKSIMAL DARAJA</div>`}

                    <!-- Regen timer -->
                    ${sleeping ? `
                    <div style="background:rgba(255,152,0,0.1);border:1px solid rgba(255,152,0,0.3);
                                border-radius:6px;padding:6px;text-align:center;">
                        <div style="font-size:10px;color:#ff9800;font-weight:700;">💤 ${Helpers.formatTime(regenSec)}</div>
                        <div style="font-size:8px;color:#666;margin-top:1px;">Tiklanish vaqti</div>
                    </div>` : ''}
                </div>`;
            }
            // Hero statue building itself (HP, upgrade) continues below...
        }

        // HP
        const hpPercent = Math.round(b.hp / b.maxHp * 100);
        html += `<div class="info-row"><span class="label">HP</span><span class="value">${b.hp}/${b.maxHp} (${hpPercent}%)</span></div>`;

        // Ishlab chiqarish
        if (lv.production) {
            const resName = b.type === 'villa' ? 'Oltin' : b.type === 'farm' ? 'Olma' : 'Olma Oltin';
            html += `<div class="info-row"><span class="label">Ishlab chiqarish</span><span class="value">${lv.production}/min ${resName}</span></div>`;
        }
        // Gem Mine
        if (lv.diamondPerHour) {
            html += `<div class="info-row"><span class="label">💎 Qazish</span><span class="value">${lv.diamondPerHour}/soat</span></div>`;
        }

        // Sig'im
        if (lv.capacity) {
            html += `<div class="info-row"><span class="label">Sig'im</span><span class="value">${Helpers.formatNumber(lv.capacity)}</span></div>`;
        }

        // Mudofaa statistikalar
        if (lv.damage) {
            const atkSpeed  = bd.attackSpeed || 1000;
            const dps       = Math.round(lv.damage / (atkSpeed / 1000) * 10) / 10;
            const atkType   = bd.attackType;
            const splash    = bd.splashRadius;

            html += `<div class="info-stat-grid">`;
            html += `<div class="info-stat-card"><div class="info-stat-val" style="color:#f44336">⚡${lv.damage}</div><div class="info-stat-lbl">Zarar</div></div>`;
            html += `<div class="info-stat-card"><div class="info-stat-val" style="color:#ff7043">${dps}/s</div><div class="info-stat-lbl">DPS</div></div>`;
            html += `<div class="info-stat-card"><div class="info-stat-val" style="color:#42a5f5">${lv.range}</div><div class="info-stat-lbl">Radius</div></div>`;
            html += `<div class="info-stat-card"><div class="info-stat-val" style="color:#ab47bc">${(atkSpeed/1000).toFixed(1)}s</div><div class="info-stat-lbl">Hujum tezl.</div></div>`;
            if (splash) {
                html += `<div class="info-stat-card"><div class="info-stat-val" style="color:#ffd700">💥${splash}</div><div class="info-stat-lbl">Splash</div></div>`;
            }
            if (atkType) {
                const atkLabels = { splash:'💥 AoE', fire_splash:'🔥 Olov', single:'🎯 Bitta', arrow:'🏹 O\'q' };
                html += `<div class="info-stat-card"><div class="info-stat-val" style="color:#80cbc4;font-size:9px">${atkLabels[atkType]||atkType}</div><div class="info-stat-lbl">Tur</div></div>`;
            }
            html += `</div>`;
        }

        // Pozitsiya
        html += `<div class="info-row"><span class="label">Pozitsiya</span><span class="value">(${b.x}, ${b.y})</span></div>`;

        // Yig'ilmagan resurs
        if (b.type === 'gemMine') {
            const stored = Math.floor(b.storedDiamond || 0);
            const cap = (BUILDING_DATA.gemMine.levels[b.level] || {}).capacity || 12;
            const fillPct = Math.round(stored / cap * 100);
            html += `<div class="info-row"><span class="label">💎 Yig'ilgan</span>
                <span class="value">${stored}/${cap} (${fillPct}%)</span></div>`;
        } else if (b.storedResource >= 1) {
            const resIcon = b.type === 'villa' ? '🪙' : b.type === 'farm' ? '🍎' : '🍏';
            html += `<div class="info-row"><span class="label">Yig'ilmagan</span><span class="value">${resIcon} ${Math.floor(b.storedResource)}</span></div>`;
        }

        // HP bar (rang bilan)
        const hpColor = hpPercent > 60 ? '#4caf50' : hpPercent > 30 ? '#ff9800' : '#f44336';
        html += `<div class="build-progress" style="margin:4px 0;">
            <div class="build-progress-fill" style="width:${hpPercent}%;background:${hpColor};"></div>
        </div>`;

        // Qurilish holati
        if (b.building && b.timerId) {
            const rem = timerManager.getRemaining(b.timerId);
            const prog = timerManager.getProgress(b.timerId);
            const pct  = Math.round(prog * 100);
            const gemCost = Helpers.calcGemCost(rem);
            const canAffordGem = (Resources.diamond || 0) >= gemCost;
            const barColor = pct >= 90 ? '#69f0ae' : pct >= 60 ? '#ffd700' : pct >= 30 ? '#ff9800' : '#ff5722';
            html += `
                <div style="background:rgba(255,152,0,0.08);border:1px solid rgba(255,152,0,0.25);
                            border-radius:10px;padding:10px 12px;margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:11px;font-weight:700;color:#ffb74d;">🏗️ Qurilmoqda...</span>
                        <span id="_ip-build-timer" style="font-size:11px;color:#aaa;font-weight:700;">⏱ ${Helpers.formatTime(rem)}</span>
                    </div>
                    <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;margin-bottom:6px;">
                        <div id="_ip-build-bar" style="height:100%;width:${pct}%;background:linear-gradient(90deg,${barColor}88,${barColor});
                                    border-radius:3px;transition:width 0.4s linear;
                                    box-shadow:0 0 6px ${barColor}66;"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span id="_ip-build-pct" style="font-size:9px;color:${barColor};font-weight:700;">${pct}% bajarildi</span>
                        <button id="_ip-build-gem" onclick="InfoPanel.speedUp()"
                                style="background:${canAffordGem ? 'linear-gradient(135deg,#1565c0,#0d47a1)' : 'rgba(255,255,255,0.05)'};
                                       border:1px solid ${canAffordGem ? 'rgba(100,181,246,0.5)' : 'rgba(255,255,255,0.1)'};
                                       color:${canAffordGem ? '#90caf9' : '#555'};
                                       border-radius:8px;padding:4px 10px;font-size:10px;font-weight:800;cursor:pointer;">
                            ⚡ ${gemCost} 💎 Tezlat
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Tugmalar
            html += '<div class="info-buttons">';

            // Yig'ish
            if (b.type === 'gemMine') {
                const stored = Math.floor(b.storedDiamond || 0);
                if (stored >= 1) {
                    html += `<div class="info-btn" onclick="InfoPanel.collect()"
                                 style="background:linear-gradient(135deg,rgba(126,206,242,0.2),rgba(33,150,243,0.15));
                                        border-color:rgba(126,206,242,0.5);color:#7ecef2;">
                                 💎 +${stored} Yig'ish</div>`;
                } else {
                    html += `<div class="info-btn" style="opacity:0.45;cursor:default;">💎 Hali tayyor emas</div>`;
                }
            } else if (b.storedResource >= 1) {
                html += `<div class="info-btn" onclick="InfoPanel.collect()">📦 Yig'ish</div>`;
            }

            // ⚡ Boost (ishlab chiqarish binolari uchun)
            if (['villa', 'farm', 'treeOfLife'].includes(b.type)) {
                const now = Date.now();
                const boosted = b._boostUntil && b._boostUntil > now;
                if (boosted) {
                    const remMin = Math.ceil((b._boostUntil - now) / 60000);
                    html += `<div class="info-btn" style="opacity:0.6;cursor:default;
                                 border-color:rgba(255,152,0,0.4);color:#ff9800;">
                                 ⚡ Boost: ${remMin}d qoldi</div>`;
                } else {
                    html += `<div class="info-btn" onclick="InfoPanel.boostBuilding()"
                                 style="background:linear-gradient(135deg,rgba(255,152,0,0.2),rgba(255,87,34,0.15));
                                        border-color:rgba(255,152,0,0.5);color:#ff9800;">
                                 ⚡ 2x Boost (💎10 · 2s)</div>`;
                }
            }

            // Quruvchi uyi
            if (b.type === 'builderHut') {
                const totalB   = typeof BuilderSystem !== 'undefined' ? BuilderSystem.totalBuilders : 1;
                const busyB    = typeof BuilderSystem !== 'undefined' ? BuilderSystem.busyBuilders  : 0;
                const freeB    = totalB - busyB;
                const hutIdx   = (() => {
                    // Bu hut indeksi = hunts sorted by id
                    const huts = Object.values(BuildingManager.buildings)
                        .filter(bh => bh.type === 'builderHut')
                        .sort((a, c) => a.id - c.id);
                    return huts.indexOf(b);
                })();
                const isBuilderBusy = hutIdx >= 0 && hutIdx < busyB;
                const statusIcon  = isBuilderBusy ? '🔨' : '👷';
                const statusText  = isBuilderBusy ? 'Qurilmoqda' : 'Bo\'sh';
                const statusColor = isBuilderBusy ? '#ff9800' : '#69f0ae';
                html += `
                    <div style="background:rgba(139,105,20,0.1);border:1px solid rgba(212,175,55,0.3);
                                border-radius:8px;padding:8px 10px;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:22px;">${statusIcon}</span>
                            <div>
                                <div style="font-size:11px;font-weight:700;color:${statusColor};">${statusText}</div>
                                <div style="font-size:9px;color:#666;">Quruvchi ${hutIdx + 1}/${totalB}</div>
                            </div>
                            <div style="margin-left:auto;font-size:10px;color:#aaa;">${freeB} bo'sh</div>
                        </div>
                    </div>
                `;
            }

            // Askar tayyorlash (Kazarma uchun)
            if (b.type === 'barracks') {
                html += `<div class="info-btn" onclick="InfoPanel.openArmyPanel()" style="background: linear-gradient(to bottom, #d4af37, #b8860b); color: #000; border-color: #ffd700;">⚔️ Askar Tayyorlash</div>`;
            }

            // Praetorium — klan qal'asi
            if (b.type === 'praetorium') {
                const cap = (bd.levels[b.level] || {}).capacity || 10;
                const stored = b._storedTroops || 0;
                const pct = Math.round(stored / cap * 100);
                html += `
                    <div style="background:rgba(139,105,20,0.12);border:1px solid rgba(139,105,20,0.35);
                                border-radius:8px;padding:8px 10px;margin-bottom:6px;">
                        <div style="font-size:10px;color:#cd853f;font-weight:700;margin-bottom:5px;">
                            🏰 Praetorium Garnizoni
                        </div>
                        <div style="height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;margin-bottom:5px;">
                            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#cd853f,#ffd700);
                                        border-radius:3px;"></div>
                        </div>
                        <div style="font-size:10px;color:#aaa;">${stored}/${cap} askar</div>
                    </div>
                `;
                if (stored < cap) {
                    html += `<div class="info-btn" onclick="InfoPanel._praetoriumRequest()"
                                 style="background:linear-gradient(135deg,rgba(139,105,20,0.3),rgba(205,133,63,0.2));
                                        border-color:rgba(205,133,63,0.5);color:#cd853f;">
                                 📨 Ittifoqdan askar so'rash</div>`;
                }
            }

            // Sehr fabrikasi
            if (b.type === 'spellFactory') {
                html += `<div class="info-btn" onclick="InfoPanel.hide();SpellFactoryPanel.show();"
                              style="background:linear-gradient(135deg,#7b1fa2,#9c27b0);color:#fff;border-color:rgba(156,39,176,0.6);">
                              🧪 Sehr Fabrikasi</div>`;
            }

            // Upgrade (noUpgrade=true bo'lsa ko'rsatilmaydi)
            const nextLv = !bd.noUpgrade ? bd.levels[b.level + 1] : null;
            if (nextLv) {
                const _upCostMult = typeof ResearchSystem !== 'undefined' ? ResearchSystem.getBuildCostMultiplier() : 1;
                const _upCost = _upCostMult < 1
                    ? Object.fromEntries(Object.entries(nextLv.cost).map(([r, a]) => [r, Math.max(1, Math.floor(a * _upCostMult))]))
                    : nextLv.cost;
                let upgradeCost = '';
                for (const [res, amt] of Object.entries(_upCost)) {
                    const icons = { gold: '🪙', food: '🍎', diamond: '💎', goldenApple: '🍏' };
                    upgradeCost += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
                }
                html += `<div class="info-btn" onclick="InfoPanel.upgrade()">⬆️ Upgrade (${upgradeCost})</div>`;

                // Next level preview — CoC-style stat comparison
                {
                    const statRows = [];
                    const _statRow = (icon, label, cur, nxt, fmt) => {
                        if (!cur || !nxt) return;
                        const improved = nxt > cur;
                        const same     = nxt === cur;
                        const pct      = cur > 0 ? Math.round((nxt - cur) / cur * 100) : 0;
                        const arrow    = improved ? '▲' : same ? '–' : '▼';
                        const arrowCol = improved ? '#69f0ae' : same ? '#888' : '#ef5350';
                        const valCol   = improved ? '#a5d6a7' : same ? '#aaa' : '#ef9a9a';
                        statRows.push(`
                            <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;
                                        background:rgba(255,255,255,0.03);border-radius:6px;">
                                <span style="font-size:12px;flex-shrink:0;">${icon}</span>
                                <span style="font-size:10px;color:#888;flex:1;">${label}</span>
                                <span style="font-size:10px;color:#666;">${fmt(cur)}</span>
                                <span style="font-size:10px;color:${arrowCol};font-weight:700;">${arrow}</span>
                                <span style="font-size:11px;color:${valCol};font-weight:700;">${fmt(nxt)}</span>
                                ${improved && pct > 0 ? `<span style="font-size:8px;color:#69f0ae;background:rgba(105,240,174,0.12);
                                    border-radius:8px;padding:1px 4px;">+${pct}%</span>` : ''}
                            </div>`);
                    };
                    const fmtN  = v => Helpers.formatNumber(v);
                    const fmtR  = v => v.toFixed ? v.toFixed(1) : v;
                    const fmtT  = v => v >= 3600 ? `${Math.floor(v/3600)}s` : v >= 60 ? `${Math.floor(v/60)}d` : `${v}s`;
                    _statRow('❤️', 'Sog\'liq',     lv.hp,         nextLv.hp,         fmtN);
                    _statRow('⚔️', 'Zarba',         lv.damage,     nextLv.damage,     fmtN);
                    _statRow('📡', 'Diapazon',      lv.range,      nextLv.range,      fmtR);
                    _statRow('⚡', 'Hujum tezligi', lv.fireRate,   nextLv.fireRate,   fmtR);
                    _statRow('⚙️', 'Ishlab chiqarish', lv.production, nextLv.production, v => `${fmtN(v)}/min`);
                    _statRow('📦', 'Sig\'im',       lv.capacity,   nextLv.capacity,   fmtN);
                    _statRow('🔬', 'Tadqiqot uyasi',lv.researchSlots, nextLv.researchSlots, fmtR);
                    _statRow('🧪', 'Sehr uyasi',    lv.spellSlots, nextLv.spellSlots, fmtR);

                    if (statRows.length) {
                        html += `</div>
                        <div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.18);
                                    border-radius:10px;padding:8px;margin:6px 0;">
                            <div style="font-size:9px;color:#ffd700;font-weight:700;letter-spacing:1px;
                                        margin-bottom:6px;padding:0 4px;">
                                ⬆️ LVL ${b.level} → ${b.level + 1} O'ZGARISHLAR
                            </div>
                            <div style="display:flex;flex-direction:column;gap:4px;">
                                ${statRows.join('')}
                            </div>
                        </div>
                        <div class="info-buttons" style="margin-top:0;">`;
                    }
                }
                
                // Vaqtsiz (Tezkor) Upgrade tugmasi
                const missingDiamonds = Resources.getMissingCostInDiamonds(nextLv.cost);
                const timerDiamonds = Helpers.calcGemCost(nextLv.time);
                const totalDiamonds = missingDiamonds + timerDiamonds;
                
                html += `<div class="info-btn" onclick="InfoPanel.instantUpgrade()" style="margin-left: 5px;">💎 ${totalDiamonds} Tezkor Upgrade</div>`;
            }

            html += '</div>';

            // Qo'shimcha tugmalar (ikkinchi qator)
            html += '<div class="info-buttons" style="margin-top:4px">';

            // Ta'mirlash
            if (b.hp < b.maxHp) {
                const missingHpPct = 1 - b.hp / b.maxHp;
                const bd2 = BUILDING_DATA[b.type];
                const lv2 = bd2.levels[b.level];
                const repairCost = Math.max(10, Math.floor(((lv2.cost?.gold || 100)) * missingHpPct * 0.25));
                html += `<div class="info-btn" onclick="InfoPanel.repair()" style="background:linear-gradient(to bottom,#2196f3,#1565c0);">🔧 Ta'mirlash 🪙${Helpers.formatNumber(repairCost)}</div>`;
            }

            // Ko'chirish
            html += `<div class="info-btn" onclick="InfoPanel.moveBuilding()">🔄 Ko'chirish</div>`;

            // Olib tashlash (cityHall bo'lmasa)
            if (b.type !== 'cityHall') {
                html += `<div class="info-btn danger" onclick="InfoPanel.removeBuilding()">🗑️ Buzish</div>`;
            }

            html += '</div>';
        }

        // ── Upgrade Advisor (faqat cityHall da) ────────────────────────────
        if (b.type === 'cityHall' && !b.building) {
            html += this._renderUpgradeAdvisor();
        }

        panel.innerHTML = html;
    },

    _renderUpgradeAdvisor() {
        const buildings = Object.values(BuildingManager.buildings).filter(b => !b.building);
        if (buildings.length === 0) return '';

        const thLevel = Game.townHallLevel || 1;

        // Mudofaa binolariga afzallik beramiz (archerTower, scorpio, tormenta, etc.)
        const DEFENSE_TYPES = new Set(['archerTower','scorpio','tormenta','flamingCitadel','cloudBuster','boltTower','infernoColumn','magicTower','wall']);
        const PROD_TYPES    = new Set(['villa','farm','treeOfLife','goldStorage','foodStorage']);

        let best = null;
        let bestScore = -1;

        for (const b of buildings) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            const nextLv = bd.levels[b.level + 1];
            if (!nextLv) continue; // Max level

            // Score: defense > production > other
            let score = 0;
            if (DEFENSE_TYPES.has(b.type)) score += 3;
            else if (PROD_TYPES.has(b.type)) score += 1;

            // Low-level binoalarga qo'shimcha ball
            score += Math.max(0, 5 - b.level);

            // Affordable?
            const canAfford = Resources.canAfford(nextLv.cost);
            if (canAfford) score += 4;

            if (score > bestScore) { bestScore = score; best = b; }
        }

        if (!best) return '';

        const bd = BUILDING_DATA[best.type];
        const nextLv = bd.levels[best.level + 1];
        if (!nextLv) return '';

        let costHtml = '';
        let canAffordBest = true;
        for (const [res, amt] of Object.entries(nextLv.cost)) {
            const icons = { gold: '🪙', food: '🍎', diamond: '💎', goldenApple: '🍏' };
            const has = Resources[res] >= amt;
            if (!has) canAffordBest = false;
            costHtml += `<span style="color:${has ? '#aaa' : '#f44336'}">${icons[res] || ''}${Helpers.formatNumber(amt)}</span> `;
        }

        const advisorColor = canAffordBest ? '#ffd700' : '#888';
        return `
            <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);
                        border-radius:10px;padding:8px 10px;margin-top:6px;">
                <div style="font-size:9px;font-weight:700;color:${advisorColor};letter-spacing:1px;margin-bottom:5px;">
                    💡 UPGRADE MASLAHAT
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:22px;">${bd.icon}</div>
                    <div style="flex:1;">
                        <div style="font-size:11px;font-weight:bold;color:#ddd;">${bd.name} → Lv${best.level + 1}</div>
                        <div style="font-size:10px;color:#888;margin-top:1px;">${costHtml}</div>
                    </div>
                    ${canAffordBest ? `
                    <button onclick="InfoPanel._advisorUpgrade('${best.id}')"
                        style="background:linear-gradient(145deg,#b8860b,#ffd700);border:none;
                               border-radius:7px;color:#000;font-size:10px;font-weight:900;
                               padding:5px 8px;cursor:pointer;font-family:'Cinzel',serif;">
                        ⬆ Yangilash
                    </button>` : `<span style="font-size:9px;color:#555;">💰 Yetarli emas</span>`}
                </div>
            </div>
        `;
    },

    _advisorUpgrade(buildingId) {
        const b = BuildingManager.buildings[buildingId];
        if (!b) return;
        const result = BuildingManager.upgrade(buildingId);
        if (result) {
            const bd = BUILDING_DATA[b.type];
            Toast.show(`${bd.icon} ${bd.name} Lv${b.level} yangilanmoqda!`, 'success');
            this.render();
        }
    },

    boostBuilding() {
        const b = this.currentBuilding;
        if (!b) return;
        const BOOST_COST = 10;
        const BOOST_DURATION = 2 * 3600 * 1000; // 2 soat ms da

        if ((Resources.diamond || 0) < BOOST_COST) {
            Toast.show('💎 10 ta olmos kerak!', 'error');
            return;
        }
        Resources.spend('diamond', BOOST_COST);
        b._boostUntil = Date.now() + BOOST_DURATION;

        const typeNames = { villa: 'Villa', farm: 'Ferma', treeOfLife: 'Hayot Daraxti' };
        Toast.show(`⚡ ${typeNames[b.type] || b.type} 2 soat uchun 2x tezlashtirildi!`, 'success', 3500);
        if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();

        // Small visual flash on the building's screen position
        const bd = BUILDING_DATA[b.type];
        if (bd && typeof BuildingRenderer !== 'undefined' && typeof Camera !== 'undefined') {
            const fp = BuildingRenderer.getScreenFootprint(b.x, b.y, bd.size[0], bd.size[1]);
            const flash = document.createElement('div');
            flash.style.cssText = `
                position:fixed;left:${fp.cx}px;top:${fp.top.y}px;
                transform:translate(-50%,-50%);
                width:60px;height:60px;border-radius:50%;
                background:radial-gradient(circle,rgba(255,152,0,0.6),transparent);
                pointer-events:none;z-index:9000;
                animation:buildGlowRing 0.7s ease-out forwards;
                border:2px solid #ff9800;
            `;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 750);
        }
        this.render();
    },

    openArmyPanel() {
        this.hide();
        ArmyPanel.toggle();
    },

    _praetoriumRequest() {
        const b = this.currentBuilding;
        if (!b || b.type !== 'praetorium') return;
        const bd = BUILDING_DATA.praetorium;
        const cap = (bd.levels[b.level] || {}).capacity || 10;
        const stored = b._storedTroops || 0;
        const need = cap - stored;
        if (need <= 0) {
            Toast.show('Praetorium to\'lgan!', 'warning');
            return;
        }
        // Ittifoq so'rovini jo'natish yoki auto-fill (demo)
        if (typeof AllianceSystem !== 'undefined' && AllianceSystem.inAlliance?.()) {
            AllianceSystem.requestTroops?.(b.id, need);
            Toast.show(`📨 ${need} ta askar so'rovi yuborildi!`, 'success');
        } else {
            // Ittifoqsiz: resursga qarab auto-fill
            const cost = need * 50;
            if (Resources.canAfford({ food: cost })) {
                Resources.spend('food', cost);
                b._storedTroops = cap;
                Toast.show(`⚔️ Praetorium ${cap} ta askar bilan to\'ldirildi!`, 'success');
            } else {
                Toast.show(`🍎 ${cost} oziq-ovqat kerak ittifoq a'zosi yo'q!`, 'warning');
            }
        }
        this.render();
    },

    collect() {
        if (!this.currentBuilding) return;
        const b = this.currentBuilding;
        const amount = BuildingManager.collect(b.id);  // ResourceFlyAnim ichida chaqiriladi
        if (amount > 0) {
            let resIcon;
            if (b.type === 'villa')           resIcon = '🪙';
            else if (b.type === 'farm')       resIcon = '🍎';
            else if (b.type === 'treeOfLife') resIcon = '🍏';
            else if (b.type === 'gemMine')    resIcon = '💎';
            else                               resIcon = '📦';
            Toast.show(`${resIcon} +${amount} yig'ildi!`, 'success');
            if (typeof AudioManager !== 'undefined') AudioManager.playCollect?.();
        }
        this.render();
    },

    upgrade() {
        if (!this.currentBuilding) return;
        const result = BuildingManager.upgrade(this.currentBuilding.id);
        if (result) {
            const bd = BUILDING_DATA[this.currentBuilding.type];
            Toast.show(`${bd.icon} ${bd.name} yangilanmoqda...`, 'info');
        }
        this.render();
    },

    instantUpgrade() {
        if (!this.currentBuilding) return;
        const result = BuildingManager.instantUpgrade(this.currentBuilding.id);
        if (result) {
            // Toast building manager ichida ko'rsatiladi
            this.render();
        }
    },

    speedUp() {
        if (!this.currentBuilding) return;
        const b = this.currentBuilding;
        const rem = b.timerId ? timerManager.getRemaining(b.timerId) : 0;
        const gemCost = Helpers.calcGemCost(rem);
        GemConfirm.show({
            gemCost,
            title: 'Qurilishni tezlashtirish',
            icon: '🏗️',
            timeLabel: `Tejaydi: ${Helpers.formatTime(rem)}`,
            onConfirm: () => {
                const result = BuildingManager.speedUp(this.currentBuilding.id);
                if (result) {
                    Toast.show('💎 Qurilish tezlashtirildi!', 'success');
                } else {
                    Toast.show('Olmos yetarli emas!', 'error');
                }
                this.render();
            }
        });
    },

    repair() {
        if (!this.currentBuilding) return;
        const result = BuildingManager.repair(this.currentBuilding.id);
        if (result) this.render();
    },

    moveBuilding() {
        if (!this.currentBuilding) return;
        if (this.currentBuilding.building) {
            Toast.show('Qurilayotgan binoni ko\'chirib bo\'lmaydi!', 'warning');
            return;
        }
        BuildingManager.startDrag(this.currentBuilding.id);
        this.hide();
        Toast.show('🔄 Binoni yangi joyga surib qo\'ying', 'info');
    },

    removeBuilding() {
        if (!this.currentBuilding) return;
        if (this.currentBuilding.type === 'cityHall') return;

        const bd = BUILDING_DATA[this.currentBuilding.type];

        // Custom demolish confirm modal (no native confirm)
        const _ipSelf = this;
        const _ipBuildingId = this.currentBuilding.id;
        const _ipLevel = this.currentBuilding.level;
        document.getElementById('_ip-demolish-modal')?.remove();
        const _dmOv = document.createElement('div');
        _dmOv.id = '_ip-demolish-modal';
        _dmOv.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);
            z-index:100020;display:flex;align-items:center;justify-content:center;`;
        // Calculate refund for display
        const _lv = bd.levels[_ipLevel];
        let _refundText = '';
        if (_lv && _lv.cost) {
            const parts = [];
            for (const [res, amt] of Object.entries(_lv.cost)) {
                const refund = Math.floor(amt * 0.3);
                if (res === 'gold') parts.push(`🪙 ${refund}`);
                else if (res === 'food') parts.push(`🍎 ${refund}`);
                else if (res === 'stone') parts.push(`🪨 ${refund}`);
                else if (res === 'wood') parts.push(`🪵 ${refund}`);
                else parts.push(`${refund} ${res}`);
            }
            if (parts.length) _refundText = `<div style="font-size:11px;color:#80cbc4;margin-bottom:14px;">Qaytariladi: ${parts.join(' + ')}</div>`;
        }
        _dmOv.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a1020);
                        border:2px solid rgba(244,67,54,0.45);border-radius:16px;
                        padding:22px 24px;width:min(280px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(244,67,54,0.12);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:36px;margin-bottom:8px;">${bd.icon || '🏚️'}</div>
                <div style="font-size:13px;font-weight:800;color:#ef9a9a;margin-bottom:8px;">${bd.name} ni Buzish</div>
                <div style="font-size:11px;color:#aaa;margin-bottom:8px;line-height:1.5;">
                    Haqiqatan ham bu binoni buzmoqchimisiz?
                </div>
                ${_refundText}
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_ip-demolish-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_ip-demolish-ok"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(244,67,54,0.5),rgba(183,28,28,0.4));
                                   border:1px solid rgba(244,67,54,0.5);border-radius:9px;
                                   color:#ef9a9a;font-size:12px;font-weight:800;cursor:pointer;">🗑️ Buzish</button>
                </div>
            </div>`;
        document.body.appendChild(_dmOv);
        _dmOv.onclick = e => { if (e.target === _dmOv) _dmOv.remove(); };
        document.getElementById('_ip-demolish-ok').onclick = () => {
            _dmOv.remove();
            // Narxning 30% qaytarish
            const lv = bd.levels[_ipLevel];
            if (lv && lv.cost) {
                for (const [res, amt] of Object.entries(lv.cost)) {
                    Resources.add(res, Math.floor(amt * 0.3));
                }
            }
            BuildingManager.remove(_ipBuildingId);
            Toast.show(`🗑️ ${bd.name} buzildi!`, 'warning');
            _ipSelf.hide();
        };
        return; // modal async, execution continues via onclick
    },

    // ── Devor/Darvoza — to'siq uchun sodda UI ────────────────────────────────
    _renderBarrier(b, bd, panel) {
        const lv = bd.levels[b.level];
        const hpPercent = Math.round(b.hp / b.maxHp * 100);
        const hpColor = hpPercent > 60 ? '#4caf50' : hpPercent > 30 ? '#ff9800' : '#f44336';
        const nextLv = bd.levels[b.level + 1];
        const isMaxLv = !nextLv;

        // Wall color preview based on level (matches buildingRenderer WALL_COLORS)
        const WALL_COLOR_PREVIEWS = [
            '#aaaaaa','#909090','#a8906e','#c09a5a','#ccaa52',
            '#9fb8c0','#a0c4cf','#b4d4e8','#8a7090','#c8a040'
        ];
        const wallColor = WALL_COLOR_PREVIEWS[(b.level - 1) % 10];

        let html = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${bd.icon}</div>
            <div>
                <div style="font-size:13px;font-weight:800;color:#ddd;font-family:'Cinzel',serif;">${bd.name}</div>
                <div style="display:flex;gap:6px;align-items:center;margin-top:2px;">
                    <span style="background:${wallColor};color:#000;font-size:9px;font-weight:900;
                                 padding:2px 6px;border-radius:8px;">LVL ${b.level}</span>
                    <span style="font-size:9px;color:#888;">🧱 To'siq</span>
                    ${b.type === 'gate' ? `<span style="font-size:9px;color:#90caf9;">🚪 O'z askar o'tadi</span>` : ''}
                </div>
            </div>
        </div>`;

        // HP bar
        html += `
        <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span style="font-size:10px;color:#888;">❤️ HP</span>
                <span style="font-size:10px;color:${hpColor};font-weight:700;">${b.hp} / ${b.maxHp}</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${hpPercent}%;background:${hpColor};border-radius:3px;transition:width 0.3s;"></div>
            </div>
        </div>`;

        // Qurilish holati
        if (b.building && b.timerId) {
            const rem = timerManager.getRemaining(b.timerId);
            const prog = timerManager.getProgress(b.timerId);
            const gemCost = Helpers.calcGemCost(rem);
            html += `
            <div style="background:rgba(255,152,0,0.08);border:1px solid rgba(255,152,0,0.2);
                        border-radius:8px;padding:8px 10px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                    <span style="font-size:10px;color:#ffb74d;font-weight:700;">🏗️ Yangilanmoqda...</span>
                    <span id="_ip-build-timer" style="font-size:10px;color:#aaa;">⏱ ${Helpers.formatTime(rem)}</span>
                </div>
                <div style="height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
                    <div id="_ip-build-bar" style="height:100%;width:${Math.round(prog*100)}%;background:#ff9800;border-radius:3px;"></div>
                </div>
                <div class="info-buttons" style="margin-top:8px;margin-bottom:0;">
                    <div class="info-btn" onclick="InfoPanel.speedUp()">💎 ${gemCost} Tezlashtirish</div>
                </div>
            </div>`;
        } else if (!isMaxLv) {
            // Upgrade section
            let costHtml = '';
            let canAfford = true;
            for (const [res, amt] of Object.entries(nextLv.cost || {})) {
                const icons = { gold: '🪙', food: '🍎', diamond: '💎' };
                const has = Resources[res] >= amt;
                if (!has) canAfford = false;
                costHtml += `<span style="color:${has ? '#aaa' : '#f44336'}">${icons[res]||''}${Helpers.formatNumber(amt)}</span> `;
            }
            const timeStr = Helpers.formatTime(nextLv.time || 0);
            html += `
            <div style="background:rgba(118,196,66,0.06);border:1px solid rgba(118,196,66,0.2);
                        border-radius:8px;padding:8px 10px;margin-bottom:8px;">
                <div style="font-size:9px;color:#76c442;font-weight:700;letter-spacing:1px;margin-bottom:6px;">
                    ⬆️ LVL ${b.level} → ${b.level + 1}
                </div>
                <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px;">
                    <span>❤️ HP: <b style="color:#a5d6a7">${lv.hp} → ${nextLv.hp}</b></span>
                    <span>⏱ ${timeStr}</span>
                </div>
                <div style="font-size:10px;margin-bottom:6px;">Narx: ${costHtml}</div>
            </div>
            <div class="info-buttons">
                <div class="info-btn" onclick="InfoPanel.upgrade()"
                     style="background:${canAfford ? 'linear-gradient(to bottom,#4caf50,#1b5e20)' : 'rgba(255,255,255,0.06)'};">
                    ⬆️ Upgrade
                </div>
                <div class="info-btn" onclick="InfoPanel.moveBuilding()">🔄 Ko'chirish</div>
                <div class="info-btn danger" onclick="InfoPanel.removeBuilding()">🗑️ Buzish</div>
            </div>`;
        } else {
            // Max level
            html += `
            <div style="text-align:center;padding:6px;color:#ffd700;font-size:10px;
                        font-weight:700;letter-spacing:1px;margin-bottom:6px;">
                ✅ MAKSIMAL DARAJA
            </div>
            <div class="info-buttons">
                <div class="info-btn" onclick="InfoPanel.moveBuilding()">🔄 Ko'chirish</div>
                <div class="info-btn danger" onclick="InfoPanel.removeBuilding()">🗑️ Buzish</div>
            </div>`;
        }

        panel.innerHTML = html;
    },

    // Har frame yangilash (progress bar uchun) — selective update, full re-render emas
    update() {
        if (this.currentBuilding && this.currentBuilding.building && this.currentBuilding.timerId) {
            this._updateBuildProgress();
        }
        if (this.currentObstacle && this.currentObstacle.removing && this.currentObstacle.timerId) {
            this._updateObstacleProgress();
        }
    },

    // Qurilish progress'ini faqat timer qismlarini yangilaydi (full re-render emas)
    _updateBuildProgress() {
        const b = this.currentBuilding;
        if (!b || !b.timerId) return;
        const rem  = timerManager.getRemaining(b.timerId);
        const prog = timerManager.getProgress(b.timerId);
        const pct  = Math.round(prog * 100);

        // Timer text
        const timerEl = document.getElementById('_ip-build-timer');
        if (timerEl) timerEl.textContent = '⏱ ' + Helpers.formatTime(rem);

        // Progress bar
        const barEl = document.getElementById('_ip-build-bar');
        if (barEl) barEl.style.width = pct + '%';

        // Pct label
        const pctEl = document.getElementById('_ip-build-pct');
        if (pctEl) {
            const barColor = pct >= 90 ? '#69f0ae' : pct >= 60 ? '#ffd700' : pct >= 30 ? '#ff9800' : '#ff5722';
            pctEl.textContent = pct + '% bajarildi';
            pctEl.style.color = barColor;
        }

        // Gem cost (kamayib borayotgani uchun)
        const gemEl = document.getElementById('_ip-build-gem');
        if (gemEl) {
            const gemCost = Helpers.calcGemCost(rem);
            const canAffordGem = (Resources.diamond || 0) >= gemCost;
            gemEl.textContent = '⚡ ' + gemCost + ' 💎 Tezlat';
            gemEl.style.color = canAffordGem ? '#90caf9' : '#555';
        }
    },

    // To'siq olib tashlash progress'ini selective yangilash
    _updateObstacleProgress() {
        const obs = this.currentObstacle;
        if (!obs || !obs.timerId) return;
        const rem  = timerManager.getRemaining(obs.timerId);
        const prog = timerManager.getProgress(obs.timerId);

        const timerEl = document.getElementById('_ip-obs-timer');
        if (timerEl) timerEl.textContent = Helpers.formatTime(rem);

        const barEl = document.getElementById('_ip-obs-bar');
        if (barEl) barEl.style.width = (prog * 100) + '%';
    }
};

// ============================================
// GEM CONFIRM — Reusable gem-cost confirm modal
// ============================================
const GemConfirm = {
    /**
     * show({ gemCost, title, icon, timeLabel, onConfirm })
     * Shows a CoC-style gem confirmation dialog.
     * onConfirm is called only when user taps the confirm button.
     */
    show({ gemCost, title, icon, timeLabel, onConfirm }) {
        // Remove any existing confirm
        const existing = document.getElementById('gem-confirm-modal');
        if (existing) existing.remove();

        const hasGems = (Resources.diamond || 0) >= gemCost;
        const currentGems = Resources.diamond || 0;

        const modal = document.createElement('div');
        modal.id = 'gem-confirm-modal';
        modal.style.cssText = `
            position:fixed;inset:0;z-index:15000;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);
            animation:gcFadeIn 0.18s ease-out both;
        `;
        // GemConfirm fade-in animatsiyasini bir marta qo'shish
        if (!document.getElementById('_gc-style')) {
            const _st = document.createElement('style');
            _st.id = '_gc-style';
            _st.textContent = `
                @keyframes gcFadeIn  { from{opacity:0} to{opacity:1} }
                @keyframes gcSlideIn { from{opacity:0;transform:scale(0.88) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
            `;
            document.head.appendChild(_st);
        }

        modal.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1420,#161e30);
                        border:1px solid rgba(100,181,246,0.35);border-radius:18px;
                        padding:0;width:min(300px,88vw);overflow:hidden;
                        box-shadow:0 20px 60px rgba(0,0,0,0.7),0 0 30px rgba(33,150,243,0.15);
                        animation:gcSlideIn 0.22s cubic-bezier(0.175,0.885,0.32,1.275) both;">

                <!-- Header -->
                <div style="background:linear-gradient(135deg,rgba(13,71,161,0.9),rgba(21,101,192,0.8));
                            padding:16px;text-align:center;
                            border-bottom:1px solid rgba(100,181,246,0.2);">
                    <div style="font-size:32px;margin-bottom:4px;
                                filter:drop-shadow(0 0 8px rgba(100,181,246,0.6));">${icon}</div>
                    <div style="font-size:13px;font-weight:800;color:#e3f2fd;
                                letter-spacing:0.5px;">${title}</div>
                </div>

                <!-- Body -->
                <div style="padding:16px 20px;text-align:center;">
                    ${timeLabel ? `
                    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:10px;">
                        ⏰ ${timeLabel}
                    </div>` : ''}

                    <!-- Gem cost display -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:8px;
                                margin:8px 0 12px;">
                        <div style="display:flex;align-items:center;gap:6px;
                                    background:rgba(33,150,243,0.12);border:1px solid rgba(100,181,246,0.3);
                                    border-radius:12px;padding:8px 16px;">
                            <span style="font-size:22px;">💎</span>
                            <span style="font-size:22px;font-weight:900;color:#e3f2fd;">${gemCost}</span>
                        </div>
                    </div>

                    <!-- Balance -->
                    <div style="font-size:10px;color:${hasGems ? 'rgba(255,255,255,0.4)' : '#ef5350'};margin-bottom:14px;">
                        Sizda: 💎 ${currentGems.toLocaleString()}
                        ${!hasGems ? ' · <strong style="color:#ef5350;">Yetarli emas!</strong>' : ''}
                    </div>

                    <!-- Buttons -->
                    <div style="display:flex;gap:8px;">
                        <button onclick="GemConfirm._close()"
                                style="flex:1;padding:10px 0;border-radius:10px;
                                       background:rgba(255,255,255,0.07);
                                       border:1px solid rgba(255,255,255,0.12);
                                       color:rgba(255,255,255,0.6);font-size:13px;
                                       font-weight:700;cursor:pointer;">
                            Bekor qilish
                        </button>
                        <button onclick="GemConfirm._confirm()"
                                ${!hasGems ? 'disabled' : ''}
                                style="flex:1;padding:10px 0;border-radius:10px;
                                       background:${hasGems ? 'linear-gradient(135deg,#1565c0,#0d47a1)' : 'rgba(255,255,255,0.04)'};
                                       border:1px solid ${hasGems ? 'rgba(100,181,246,0.5)' : 'rgba(255,255,255,0.08)'};
                                       color:${hasGems ? '#e3f2fd' : 'rgba(255,255,255,0.2)'};
                                       font-size:13px;font-weight:800;cursor:${hasGems ? 'pointer' : 'not-allowed'};
                                       ${hasGems ? 'box-shadow:0 4px 12px rgba(21,101,192,0.4);' : ''}">
                            ⚡ Tezlashtirish
                        </button>
                    </div>
                </div>
            </div>
        `;

        this._pendingCallback = onConfirm;

        // Close on backdrop click
        modal.addEventListener('click', e => { if (e.target === modal) this._close(); });
        document.body.appendChild(modal);
    },

    _confirm() {
        const cb = this._pendingCallback;
        this._close();
        if (typeof cb === 'function') cb();
    },

    _close() {
        const modal = document.getElementById('gem-confirm-modal');
        if (modal) modal.remove();
        this._pendingCallback = null;
    },

    _pendingCallback: null,
};
