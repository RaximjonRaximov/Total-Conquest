// ============================================
// ASKAR PANELI (Army Panel)
// Kazarmada askar yaratish, armiyani ko'rish
// ============================================

const ArmyPanel = {
    visible: false,
    activeTab: 'train',  // 'train' | 'army' | 'spells' | 'super'
    selectedBarracks: null,
    _tickId: null,

    // Panel ochiq bo'lganda har sekund yangilanish
    _startTick() {
        if (this._tickId) return;
        this._tickId = setInterval(() => {
            if (!this.visible) { this._stopTick(); return; }
            if (this.activeTab === 'train') this._refreshQueueProgress();
        }, 1000);
    },

    _stopTick() {
        if (this._tickId) { clearInterval(this._tickId); this._tickId = null; }
    },

    // Faqat navbat progress ringlarini yangilash (to'liq re-render yo'q — tez)
    _refreshQueueProgress() {
        const allBarracks = this._findAllBarracks();
        for (const brc of allBarracks) {
            const queue = TroopManager.getQueue(brc.id);
            if (!queue || queue.length === 0) continue;
            const firstProgress  = timerManager.getProgress(queue[0]?.timerId) || 0;
            const firstRemaining = timerManager.getRemaining(queue[0]?.timerId) || 0;
            // SVG ring yangilash
            const ring = document.querySelector(`[data-queue-ring="${brc.id}"]`);
            if (ring) {
                const r = 18, circ = 2 * Math.PI * r;
                ring.setAttribute('stroke-dasharray',
                    `${circ * firstProgress} ${circ * (1 - firstProgress)}`);
            }
            // Qolgan vaqt
            const timeEl = document.querySelector(`[data-queue-time="${brc.id}"]`);
            if (timeEl) timeEl.textContent = `⏰ ${Helpers.formatTime(firstRemaining)}`;
            // Progress bar
            const barEl = document.querySelector(`[data-queue-bar="${brc.id}"]`);
            if (barEl) barEl.style.width = `${Math.round(firstProgress * 100)}%`;
        }
    },

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('army-panel');
        const overlay = document.getElementById('modal-overlay');
        if (this.visible) {
            this.selectedBarracks = this._findBarracks();
            TroopManager.updateCapacity();
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
            this._startTick();
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
            this._stopTick();
        }
    },

    hide() {
        this.visible = false;
        this._stopTick();
        document.getElementById('army-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _findBarracks() {
        for (const b of Object.values(BuildingManager.buildings)) {
            if (b.type === 'barracks' && !b.building) return b;
        }
        return null;
    },

    // Barcha faol kazarmalarni qaytarish (parallel training uchun)
    _findAllBarracks() {
        return Object.values(BuildingManager.buildings)
            .filter(b => b.type === 'barracks' && !b.building)
            .sort((a, b) => b.level - a.level); // Yuqori darajali avval
    },

    setTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    render() {
        const panel = document.getElementById('army-panel');
        if (!panel) return;

        const barracks = this.selectedBarracks;
        const barracksLevel = barracks ? barracks.level : 0;
        const total = TroopManager.getTotal();
        const queueTotal = TroopManager.getQueueTotal();
        const maxTroops = TroopManager.maxTroops;

        // Hero cards — faqat TROOP_DATA da isHero bo'lgan va HERO_CONFIG dagi qahramonlar
        let heroHtml = '';
        if (typeof HeroSystem !== 'undefined') {
            const thLv = Game.townHallLevel || 1;
            const activeHeroes = HeroSystem.getActiveHeroes();
            for (const [heroType, hero] of Object.entries(HeroSystem.commanders)) {
                const troop = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA[heroType] : null;
                if (!troop || !troop.isHero) continue;
                const cfg = typeof HERO_CONFIG !== 'undefined' ? HERO_CONFIG[heroType] : null;
                const thRequired = cfg?.thRequired || troop.unlockBarracks || 1;
                const locked = thLv < thRequired;
                const needsStatue = cfg?.statueType && !activeHeroes.includes(heroType) && !locked;
                if (locked) {
                    heroHtml += `
                        <div class="hero-card" style="opacity:0.4;">
                            <div class="hero-icon">${troop.icon}</div>
                            <div class="hero-info">
                                <div class="hero-name">${troop.name} <span style="font-size:9px;color:#f44336;">🔒 TH${thRequired}+</span></div>
                                <div class="hero-stats" style="color:#666;">Qulfdan chiqarish uchun ${thRequired}-daraja Qarorgohi kerak</div>
                            </div>
                        </div>`;
                    continue;
                }
                if (needsStatue) {
                    heroHtml += `
                        <div class="hero-card" style="opacity:0.5;">
                            <div class="hero-icon">${troop.icon}</div>
                            <div class="hero-info">
                                <div class="hero-name">${troop.name} <span style="font-size:9px;color:#ff9800;">🗿 Haykal kerak</span></div>
                                <div class="hero-stats" style="color:#666;">Haykal quring va qahramon bilan jang qiling</div>
                            </div>
                        </div>`;
                    continue;
                }
                const stats = HeroSystem.getCommanderStats(heroType);
                const prog  = Math.round(HeroSystem.getXPProgress(heroType) * 100);
                const regenSec = HeroSystem.getRegenRemaining(heroType);
                const regenStr = regenSec > 0
                    ? `<div class="hero-regen">⏳ ${Math.ceil(regenSec / 60)} daqiqa tiklanmoqda</div>`
                    : '';
                const auraStr = stats?.auraDamageBonus
                    ? `🌟 Aura +${Math.round(stats.auraDamageBonus * 100)}%`
                    : stats?.auraRangeBonus
                        ? `🎯 Diapazon +${Math.round((stats.auraRangeBonus || 0) * 100)}%`
                        : '';
                const abilityInfo = HeroSystem.getAbilityInfo(heroType);
                const cdLeft = HeroSystem.getAbilityCooldownLeft(heroType);
                heroHtml += `
                    <div class="hero-card">
                        <div class="hero-icon">${troop.icon}</div>
                        <div class="hero-info">
                            <div class="hero-name">${troop.name} <span class="hero-level">Lv${hero.level}</span></div>
                            <div class="hero-xp-bar"><div class="hero-xp-fill" style="width:${prog}%"></div></div>
                            <div class="hero-stats">
                                ${stats ? `❤️ ${Helpers.formatNumber(stats.hp)} ⚔️ ${Helpers.formatNumber(stats.damage)} ${auraStr}` : ''}
                            </div>
                            <div style="font-size:9px;color:${abilityInfo.color};margin-top:2px;">
                                ${abilityInfo.icon} ${abilityInfo.name}${cdLeft > 0 ? ` (${cdLeft}s)` : ' ✓'}
                            </div>
                            ${regenStr}
                        </div>
                    </div>`;
            }
        }

        let html = `
            <div class="army-panel-title">⚔️ ASKARLAR</div>
            ${heroHtml}
            <div class="army-capacity">
                <span>Armiya: ${total + queueTotal}/${maxTroops}</span>
                ${queueTotal > 0 ? `<span class="army-queue-count">(${total}+${queueTotal})</span>` : ''}
            </div>
            <!-- CoC-style army capacity bar -->
            <div style="margin:2px 8px 0;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                ${(() => {
                    const usedPct  = Math.min(100, Math.round((total)              / maxTroops * 100));
                    const queuePct = Math.min(100 - usedPct, Math.round(queueTotal / maxTroops * 100));
                    const barCol   = usedPct > 80 ? '#ef5350' : usedPct > 60 ? '#ffa726' : '#66bb6a';
                    return `<div style="display:flex;height:100%;width:100%;">
                        <div style="width:${usedPct}%;background:${barCol};transition:width 0.3s;"></div>
                        <div style="width:${queuePct}%;background:rgba(255,152,0,0.5);"></div>
                    </div>`;
                })()}
            </div>
            <div class="army-tabs">
                <div class="army-tab ${this.activeTab === 'train' ? 'active' : ''}" onclick="ArmyPanel.setTab('train')">🏋️ Yaratish</div>
                <div class="army-tab ${this.activeTab === 'army' ? 'active' : ''}" onclick="ArmyPanel.setTab('army')">🛡️ Armiya</div>
                ${typeof SpellSystem !== 'undefined' && SpellSystem.hasSpellFactory()
                    ? `<div class="army-tab ${this.activeTab === 'spells' ? 'active' : ''}" onclick="ArmyPanel.setTab('spells')">⚗️ Sehrlar</div>`
                    : ''}
                ${typeof SuperTroops !== 'undefined'
                    ? `<div class="army-tab ${this.activeTab === 'super' ? 'active' : ''}" onclick="ArmyPanel.setTab('super')"
                           style="${this.activeTab === 'super' ? '' : 'color:#ff8a65;'}">🔥 Super</div>`
                    : ''}
            </div>
        `;

        if (this.activeTab === 'train') {
            html += this._renderTrainTab(barracks, barracksLevel, total, queueTotal, maxTroops);
        } else if (this.activeTab === 'spells') {
            html += this._renderSpellsTab();
        } else if (this.activeTab === 'super') {
            html += this._renderSuperTab();
        } else {
            html += this._renderArmyTab();
        }

        panel.innerHTML = html;
    },

    _renderTrainTab(barracks, barracksLevel, total, queueTotal, maxTroops) {
        if (!barracks) {
            return `<div class="army-empty">
                <div style="font-size:32px;margin-bottom:8px">🏗️</div>
                <div>Kazarma qurib, askar yarating!</div>
            </div>`;
        }

        const allBarracks = this._findAllBarracks();
        let html = `<div class="army-barracks-info">Kazarma ${allBarracks.length}x &nbsp;·&nbsp; ${total + queueTotal}/${maxTroops} askar</div>`;

        // ── Barcha kazarmalar navbatlarini ko'rsat (CoC-style parallel queues) ──
        let anyQueue = false;
        for (const brc of allBarracks) {
            const queue = TroopManager.getQueue(brc.id);
            if (!queue || queue.length === 0) continue;
            anyQueue = true;

            const totalQueueSec = queue.reduce((s, q) => s + (timerManager.getRemaining(q.timerId) || 0), 0);
            const firstRemaining = timerManager.getRemaining(queue[0]?.timerId);
            const firstProgress  = timerManager.getProgress(queue[0]?.timerId) || 0;
            const gemCost = queue[0]?.timerId ? Helpers.calcGemCost(firstRemaining) : 0;
            const bId = brc.id;

            html += `
                <div style="margin-bottom:8px;background:rgba(0,0,0,0.2);
                            border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px;">

                    <!-- Queue header -->
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.5px;">
                            🏰 Kazarma Lv${brc.level} · ${queue.length} askar
                        </div>
                        <div style="font-size:9px;color:#666;">
                            ${Helpers.formatTime(totalQueueSec)}
                        </div>
                    </div>

                    <!-- Active troop (first in queue) -->
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                        <!-- Progress ring -->
                        <div style="position:relative;width:46px;height:46px;flex-shrink:0;">
                            <svg width="46" height="46" style="transform:rotate(-90deg);">
                                <circle cx="23" cy="23" r="18" fill="none"
                                        stroke="rgba(255,255,255,0.07)" stroke-width="4"/>
                                <circle cx="23" cy="23" r="18" fill="none"
                                        stroke="#ef5350" stroke-width="4"
                                        data-queue-ring="${bId}"
                                        stroke-dasharray="${2*Math.PI*18*firstProgress} ${2*Math.PI*18*(1-firstProgress)}"
                                        stroke-linecap="round"/>
                            </svg>
                            <div style="position:absolute;inset:0;display:flex;align-items:center;
                                        justify-content:center;font-size:18px;">
                                ${TROOP_DATA[queue[0].type]?.icon || '⚔️'}
                            </div>
                        </div>

                        <div style="flex:1;min-width:0;">
                            <div style="font-size:12px;font-weight:700;color:#eee;">
                                ${TROOP_DATA[queue[0].type]?.name || queue[0].type}
                            </div>
                            <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;
                                        overflow:hidden;margin:4px 0;">
                                <div data-queue-bar="${bId}"
                                     style="height:100%;width:${Math.round(firstProgress*100)}%;
                                            background:linear-gradient(90deg,#b71c1c,#ef5350);
                                            border-radius:2px;transition:width 0.8s;"></div>
                            </div>
                            <div data-queue-time="${bId}" style="font-size:10px;color:#888;">⏰ ${Helpers.formatTime(firstRemaining)}</div>
                        </div>

                        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                            ${gemCost > 0 ? `
                            <button onclick="ArmyPanel.speedUpBarracks('${bId}')"
                                    style="background:rgba(0,188,212,0.15);border:1px solid rgba(0,188,212,0.4);
                                           border-radius:6px;padding:4px 8px;color:#4dd0e1;font-size:9px;cursor:pointer;">
                                💎 ${gemCost}
                            </button>` : ''}
                            <button onclick="ArmyPanel.cancelBarracksAt('${bId}',0)"
                                    style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.3);
                                           border-radius:6px;padding:3px 6px;color:#ef9a9a;font-size:9px;cursor:pointer;">✕</button>
                        </div>
                    </div>

                    <!-- Waiting queue (scrollable) -->
                    ${queue.length > 1 ? `
                    <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:6px;
                                border-top:1px solid rgba(255,255,255,0.05);">
                        ${queue.slice(1).map((q, qi) => {
                            const td2 = TROOP_DATA[q.type];
                            return `<div style="display:flex;flex-direction:column;align-items:center;
                                                gap:2px;padding:4px 6px;border-radius:8px;
                                                background:rgba(255,255,255,0.03);
                                                border:1px solid rgba(255,255,255,0.06);
                                                position:relative;">
                                <span style="font-size:16px;">${td2?.icon||'⚔️'}</span>
                                <span style="font-size:8px;color:#666;">#${qi+2}</span>
                                <button onclick="ArmyPanel.cancelBarracksAt('${bId}',${qi+1})"
                                        style="position:absolute;top:-4px;right:-4px;
                                               background:rgba(244,67,54,0.5);border:none;
                                               border-radius:50%;width:12px;height:12px;
                                               color:#fff;font-size:8px;cursor:pointer;
                                               display:flex;align-items:center;justify-content:center;">×</button>
                            </div>`;
                        }).join('')}
                    </div>` : ''}
                </div>
            `;
        }

        const available = TroopManager.getAvailableTroops(barracksLevel);
        const full = total + queueTotal >= maxTroops;
        const remaining = maxTroops - total - queueTotal;
        const maxSlots = barracks ? TroopManager.getBarracksSlots(barracks.id) : 5;
        const queueLen  = barracks ? TroopManager.getQueue(barracks.id).length : 0;
        const slotsLeft = maxSlots - queueLen;

        // Tez to'ldirish + Instant train tugmalari
        if (!full && available.length > 0) {
            const cheapest = available.slice().sort((a, b) => {
                const aC = a.cost.food || a.cost.gold || 0;
                const bC = b.cost.food || b.cost.gold || 0;
                return aC - bC;
            })[0];
            const fillCount = Math.min(remaining, slotsLeft);
            html += `<div style="display:flex;gap:6px;margin-bottom:8px;">`;
            if (cheapest && Resources.canAfford(cheapest.cost) && fillCount > 0) {
                html += `<button onclick="ArmyPanel.quickFill('${cheapest.type}')"
                        style="flex:1;padding:7px;background:linear-gradient(to bottom,#1b5e20,#2e7d32);
                               border:1px solid #388e3c;border-radius:8px;color:#a5d6a7;
                               font-size:11px;font-weight:bold;cursor:pointer;">
                    ⚡ Tez To'ldirish (${fillCount}x ${cheapest.icon})
                </button>`;
            }
            if (queueLen > 0) {
                html += `<button onclick="ArmyPanel.instantAll()"
                        style="flex:1;padding:7px;background:linear-gradient(to bottom,#006064,#00838f);
                               border:1px solid #00acc1;border-radius:8px;color:#80deea;
                               font-size:11px;font-weight:bold;cursor:pointer;">
                    💎 Barchasini Tezlashtir
                </button>`;
            }
            html += `</div>`;
        }

        // Kazarma slot ko'rsatgich
        html += `<div style="font-size:9px;color:#666;margin-bottom:6px;text-align:center;">
            Kazarma navbat: ${queueLen}/${maxSlots} slot
        </div>`;

        // Kategoriyalarga ajratib ko'rsatish
        const CAT_LABELS = {
            piyoda:    { label: '⚔️ Piyoda',   color: '#e53935' },
            otishma:   { label: '🏹 Otishma',  color: '#43a047' },
            otliq:     { label: '🐴 Otliq',    color: '#8e24aa' },
            qamal:     { label: '💣 Qamal',    color: '#6d4c41' },
            maxsus:    { label: '✨ Maxsus',   color: '#f9a825' },
            uchuvchi:  { label: '🦅 Uchuvchi', color: '#0288d1' },
            qahramon:  { label: '👑 Qahramon', color: '#ffd700' },
        };

        const grouped = {};
        for (const troop of available) {
            const cat = troop.category || 'piyoda';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(troop);
        }

        for (const [cat, troops] of Object.entries(grouped)) {
            const ci = CAT_LABELS[cat] || { label: cat, color: '#999' };
            html += `<div style="font-size:9px;font-weight:700;color:${ci.color};text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px;padding-left:2px;">${ci.label}</div>`;
            html += '<div class="army-troops-grid">';

            for (const troop of troops) {
                // Narx — faqat food/gold (olmossiz)
                let costText = '';
                for (const [res, amt] of Object.entries(troop.cost)) {
                    const icons = { gold: '🪙', food: '🍎' };
                    costText += `${icons[res] || res}${Helpers.formatNumber(amt)} `;
                }
                const canAfford = Resources.canAfford(troop.cost);
                const slotFull  = slotsLeft <= 0;
                const disabled  = full || !canAfford || slotFull;
                const flyBadge  = troop.flying
                    ? `<div style="font-size:7px;background:rgba(2,119,189,0.7);color:#fff;border-radius:3px;padding:1px 3px;margin-bottom:2px">✈ UCHUVCHI</div>`
                    : '';

                // +5 tugmasi: kamida 5 slot bo'sh va resurs yetarli
                const can5 = !full && canAfford && !slotFull && remaining >= 5 && slotsLeft >= 5;
                const can10 = !full && canAfford && !slotFull && remaining >= 10 && slotsLeft >= 10;

                // Research bonuslari
                const rb = typeof ResearchSystem !== 'undefined'
                    ? ResearchSystem.getTroopBonus(troop.type)
                    : { hp: 0, damage: 0 };
                const bonusHp  = rb.hp  || 0;
                const bonusDmg = rb.damage || 0;
                const effectiveHp  = troop.stats.hp  + bonusHp;
                const effectiveDmg = troop.stats.damage + bonusDmg;
                const hpStr  = bonusHp  > 0 ? `<span style="color:#69f0ae">${effectiveHp}</span>` : `${effectiveHp}`;
                const dmgStr = bonusDmg > 0 ? `<span style="color:#ff8a65">${effectiveDmg}</span>` : `${effectiveDmg}`;

                html += `<div class="army-troop-item${disabled ? ' disabled' : ''}"
                        ${!disabled ? `onclick="ArmyPanel.trainTroop('${troop.type}')"` : ''}>
                    ${flyBadge}
                    <div class="army-troop-icon">${troop.icon}</div>
                    <div class="army-troop-name">${troop.name}</div>
                    <div class="army-troop-stats">❤️${hpStr} ⚡${dmgStr}</div>
                    <div class="army-troop-cost">${costText.trim()}</div>
                    <div class="army-troop-time">⏱️ ${Helpers.formatTime(troop.time)}</div>
                    ${can10 ? `<div onclick="event.stopPropagation();ArmyPanel.trainMultiple('${troop.type}',10)"
                                   style="position:absolute;bottom:2px;right:2px;background:rgba(21,101,192,0.9);
                                          color:#90caf9;font-size:8px;font-weight:bold;padding:2px 5px;
                                          border-radius:4px;cursor:pointer;">+10</div>` :
                      can5 ? `<div onclick="event.stopPropagation();ArmyPanel.trainMultiple('${troop.type}',5)"
                                   style="position:absolute;bottom:2px;right:2px;background:rgba(21,101,192,0.9);
                                          color:#90caf9;font-size:8px;font-weight:bold;padding:2px 5px;
                                          border-radius:4px;cursor:pointer;">+5</div>` : ''}
                </div>`;
            }
            html += '</div>';
        }

        // Locked askarlar (qahramonlar bundan istisno — ular haykal orqali ochiladi)
        const locked = Object.entries(TROOP_DATA).filter(([, d]) => !d.isHero && d.unlockBarracks > barracksLevel);
        if (locked.length > 0) {
            html += `<div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px;padding-left:2px;">🔒 Qulflangan</div>`;
            html += '<div class="army-troops-grid">';
            for (const [type, data] of locked) {
                html += `<div class="army-troop-item disabled">
                    <div class="army-troop-icon">🔒</div>
                    <div class="army-troop-name">${data.name}</div>
                    <div class="army-troop-cost">Kazarma Lvl ${data.unlockBarracks}</div>
                </div>`;
            }
            html += '</div>';
        }

        return html;
    },

    _renderArmyTab() {
        const army    = TroopManager.army;
        const entries = Object.entries(army).filter(([, c]) => c > 0);

        if (entries.length === 0) {
            return `<div class="army-empty">
                <div style="font-size:32px;margin-bottom:8px">🏕️</div>
                <div>Hali askaringiz yo'q.</div>
                <div style="font-size:11px;color:#888;margin-top:4px">Kazarmada askar yarating!</div>
            </div>`;
        }

        // Kategoriyalar bo'yicha guruhlash
        const CAT_ORDER  = ['piyoda','otishma','otliq','qamal','maxsus','uchuvchi'];
        const CAT_COLORS = { piyoda:'#e53935', otishma:'#43a047', otliq:'#8e24aa', qamal:'#6d4c41', maxsus:'#f9a825', uchuvchi:'#0288d1' };
        const grouped    = {};
        let totalHP = 0, totalDMG = 0;

        for (const [type, count] of entries) {
            const data = TROOP_DATA[type];
            if (!data) continue;
            const cat = data.category || 'piyoda';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ type, count, data });
            totalHP  += data.stats.hp     * count;
            totalDMG += data.stats.damage * count;
        }

        let html = '';
        for (const cat of CAT_ORDER) {
            if (!grouped[cat]) continue;
            const color = CAT_COLORS[cat] || '#999';
            html += `<div style="font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px;margin:6px 0 3px;padding-left:2px">${cat}</div>`;
            html += '<div class="army-list">';
            for (const { type, count, data } of grouped[cat]) {
                const portrait = AssetManager.getTroopPortrait(type);
                const portHtml = portrait
                    ? `<img src="assets/ui/portraits/${type}.png" style="width:28px;height:28px;object-fit:cover;border-radius:6px">`
                    : `<span style="font-size:22px">${data.icon}</span>`;

                const flyTag = data.flying
                    ? `<span style="font-size:7px;background:rgba(2,119,189,0.7);color:#fff;border-radius:2px;padding:1px 3px;margin-left:4px">FLY</span>`
                    : '';

                // Research bonuslari
                const rb2 = typeof ResearchSystem !== 'undefined'
                    ? ResearchSystem.getTroopBonus(type)
                    : { hp: 0, damage: 0 };
                const effHp  = data.stats.hp  + (rb2.hp || 0);
                const effDmg = data.stats.damage + (rb2.damage || 0);
                const hasBonus = (rb2.hp || 0) > 0 || (rb2.damage || 0) > 0;

                const housing = (data.stats?.capacity || 1) * count;
                html += `<div class="army-list-item">
                    <div class="army-list-icon">${portHtml}</div>
                    <div class="army-list-info">
                        <div class="army-list-name">${data.name}${flyTag}${hasBonus ? `<span style="font-size:8px;color:#ffd700;margin-left:4px">🔬+</span>` : ''}</div>
                        <div class="army-list-stats">
                            ❤️<span style="color:${rb2.hp > 0 ? '#69f0ae' : '#aaa'}">${effHp}</span>
                            ⚡<span style="color:${rb2.damage > 0 ? '#ff8a65' : '#aaa'}">${effDmg}</span>
                            🏃${data.stats.speed}
                            ${data.stats.range > 2 ? `🎯${data.stats.range}` : ''}
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div class="army-list-count">x${count}</div>
                        ${(data.stats?.capacity || 1) > 1 ? `<div style="font-size:8px;color:#78909c;margin-top:1px;">🏠${housing}</div>` : ''}
                    </div>
                </div>`;
            }
            html += '</div>';
        }

        html += `<div class="army-total-stats">
            Jami: ❤️${Helpers.formatNumber(totalHP)} | ⚡${Helpers.formatNumber(totalDMG)}
        </div>`;

        // Army composition save/load slots
        const comps = TroopManager.savedCompositions || [null, null, null];
        const hasArmy = entries.length > 0;
        html += `
            <div style="margin-top:12px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.07);
                        border-radius:12px;padding:10px 12px;">
                <div style="font-size:9px;font-weight:700;color:#666;text-transform:uppercase;
                            letter-spacing:1px;margin-bottom:8px;">
                    💾 ARMIYA TARKIBLARI
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
                    ${comps.map((comp, idx) => {
                        const slotColor = comp ? '#4fc3f7' : '#444';
                        const troops = comp ? Object.entries(comp.troops).filter(([,c])=>c>0)
                            .map(([t,c]) => `${TROOP_DATA[t]?.icon||'?'}x${c}`).slice(0,3).join(' ') : '';
                        return `
                        <div style="background:rgba(255,255,255,0.03);border:1px solid ${slotColor}33;
                                    border-radius:8px;padding:6px;text-align:center;min-height:56px;">
                            <div style="font-size:8px;font-weight:700;color:${slotColor};margin-bottom:3px;">
                                SLOT ${idx+1}
                            </div>
                            ${comp ? `
                            <div style="font-size:8px;color:#aaa;margin-bottom:5px;">${troops}</div>
                            <div style="display:flex;gap:3px;">
                                <button onclick="TroopManager.loadComposition(${idx})"
                                        style="flex:1;padding:3px;background:rgba(79,195,247,0.15);
                                               border:1px solid rgba(79,195,247,0.3);border-radius:4px;
                                               color:#4fc3f7;font-size:8px;cursor:pointer;">▶ Load</button>
                                <button onclick="TroopManager.saveComposition(${idx})"
                                        style="flex:1;padding:3px;background:rgba(255,255,255,0.05);
                                               border:1px solid rgba(255,255,255,0.1);border-radius:4px;
                                               color:#888;font-size:8px;cursor:pointer;">✏️</button>
                            </div>` : `
                            <button onclick="${hasArmy ? `TroopManager.saveComposition(${idx})` : ''}"
                                    style="width:100%;padding:5px 2px;background:${hasArmy?'rgba(76,175,80,0.12)':'rgba(255,255,255,0.03)'};
                                           border:1px solid ${hasArmy?'rgba(76,175,80,0.3)':'rgba(255,255,255,0.06)'};
                                           border-radius:4px;color:${hasArmy?'#81c784':'#555'};
                                           font-size:8px;cursor:${hasArmy?'pointer':'default'};">
                                ${hasArmy ? '💾 Saqlash' : 'Bo\'sh'}
                            </button>`}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;

        return html;
    },

    trainTroop(type) {
        if (!this.selectedBarracks) return;
        const result = TroopManager.train(type, this.selectedBarracks.id);
        if (result) {
            this.render();
        } else {
            // xato xabarini train() ichida ko'rsatildi
        }
    },

    trainMultiple(type, count) {
        if (!this.selectedBarracks) return;
        const trained = TroopManager.trainBulk(type, this.selectedBarracks.id, count);
        if (trained > 0) {
            const td = TROOP_DATA[type];
            Toast.show(`${td?.icon || '⚔️'} ${trained}x ${td?.name || type} navbatga qo'shildi!`, 'success');
            this.render();
        } else {
            Toast.show('Askar navbatga qo\'shib bo\'lmadi!', 'error');
        }
    },

    quickFill(type) {
        if (!this.selectedBarracks) return;
        const maxTroops = TroopManager.maxTroops;
        const current = TroopManager.getTotal() + TroopManager.getQueueTotal();
        const armySlots = maxTroops - current;
        const barracksSlots = TroopManager.getBarracksSlots(this.selectedBarracks.id)
                              - TroopManager.getQueue(this.selectedBarracks.id).length;
        const slots = Math.min(armySlots, barracksSlots);
        if (slots <= 0) { Toast.show('Kazarma navbati yoki armiya to\'liq!', 'warning'); return; }
        this.trainMultiple(type, slots);
    },

    // Barcha kazarmalardagi navbatlarni darhol tayyorlash (gems)
    instantAll() {
        const allBarracks = this._findAllBarracks();
        let anyQueued = false;
        for (const brc of allBarracks) {
            const q = TroopManager.getQueue(brc.id);
            if (q && q.length > 0) { anyQueued = true; break; }
        }
        if (!anyQueued) { Toast.show('Hech qaysi kazarmada navbat yo\'q!', 'warn'); return; }
        // Use first barracks as reference (selectedBarracks for gem confirm)
        if (!this.selectedBarracks) this.selectedBarracks = allBarracks[0];
        TroopManager.instantTrain(this.selectedBarracks.id);
    },

    cancelTrain() {
        if (!this.selectedBarracks) return;
        TroopManager.cancelLast(this.selectedBarracks.id);
        this.render();
    },

    cancelAt(index) {
        if (!this.selectedBarracks) return;
        TroopManager.cancelAt(this.selectedBarracks.id, index);
        this.render();
    },

    // Specific barracks cancel — multi-barracks queue support
    cancelBarracksAt(barracksId, index) {
        TroopManager.cancelAt(barracksId, index);
        this.render();
    },

    // Specific barracks speed up — multi-barracks support
    speedUpBarracks(barracksId) {
        const b = BuildingManager.buildings[barracksId];
        if (!b) return;
        const prevSelected = this.selectedBarracks;
        this.selectedBarracks = b;
        this.speedUpTrain();
        this.selectedBarracks = prevSelected;
    },

    // Olmos bilan navbatni tezlashtirish
    speedUpTrain() {
        if (!this.selectedBarracks) return;
        const queue = TroopManager.getQueue(this.selectedBarracks.id);
        if (!queue || queue.length === 0 || !queue[0].timerId) return;

        const rem = timerManager.getRemaining(queue[0].timerId);
        const gemCost = Helpers.calcGemCost(rem);
        const troopData = TROOP_DATA[queue[0].type];

        if (typeof GemConfirm !== 'undefined') {
            GemConfirm.show({
                gemCost,
                title: 'Askar tayyorlashni tezlashtirish',
                icon: troopData?.icon || '⚔️',
                timeLabel: `Tejaydi: ${Helpers.formatTime(rem)}`,
                onConfirm: () => {
                    if (!Resources.spend('diamond', gemCost)) {
                        Toast.show('Olmos yetarli emas!', 'error');
                        return;
                    }
                    timerManager.instant(queue[0].timerId);
                    Toast.show('💎 Askar darhol tayyor!', 'success');
                    this.render();
                }
            });
        } else {
            if (!Resources.spend('diamond', gemCost)) {
                Toast.show('Olmos yetarli emas!', 'error');
                return;
            }
            timerManager.instant(queue[0].timerId);
            Toast.show('💎 Askar darhol tayyor!', 'success');
            this.render();
        }
    },

    // Super Troops tab — CoC-style super askarlarni faollashtirish
    _renderSuperTab() {
        if (typeof SuperTroops === 'undefined' || typeof SUPER_TROOP_DATA === 'undefined') {
            return `<div class="army-empty">Super askarlar tizimi yuklanmagan.</div>`;
        }
        const container = document.createElement('div');
        container.style.cssText = 'padding:6px 4px;';
        // Render darhol
        SuperTroops.renderPanel(container);
        return container.outerHTML;
    },

    _renderSpellsTab() {
        if (typeof SpellSystem === 'undefined') return '';

        const maxSlots = SpellSystem.getMaxSlots();
        const current  = SpellSystem.getTotalPending ? SpellSystem.getTotalPending() : SpellSystem.getTotalInventory();
        const thLevel = Game.townHallLevel;

        let html = `
            <div class="army-barracks-info">
                Sehr slotlari: ${current}/${maxSlots} &nbsp;·&nbsp;
                Fabrika Lvl ${Object.values(BuildingManager.buildings).find(b => b.type === 'spellFactory')?.level || 1}
            </div>
        `;

        // Inventar
        if (current > 0) {
            html += `<div class="army-queue" style="margin-bottom:10px;">
                <div class="army-queue-title">📦 Inventar</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">`;
            for (const [type, cnt] of Object.entries(SpellSystem.inventory)) {
                if (cnt < 1) continue;
                const sd = SPELL_DATA[type];
                html += `<div style="background:rgba(123,31,162,0.2);border:1px solid rgba(156,39,176,0.3);
                                    border-radius:8px;padding:6px 10px;font-size:11px;color:#ce93d8;">
                    ${sd.icon} ${sd.name} ×${cnt}
                </div>`;
            }
            html += `</div></div>`;
        }

        // Tayyorlash
        html += `<div class="army-troops-grid">`;
        for (const [type, sd] of Object.entries(SPELL_DATA)) {
            const unlocked = thLevel >= (sd.thRequired || 1);
            const full = current >= maxSlots;
            const disabled = !unlocked || full;

            let costText = '';
            for (const [res, amt] of Object.entries(sd.cost || {})) {
                const icons = { gold: '🪙', food: '🍎', diamond: '💎' };
                costText += `${icons[res] || ''} ${Helpers.formatNumber(amt)} `;
            }

            html += `<div class="army-troop-item ${disabled ? 'disabled' : ''}"
                          onclick="${disabled ? '' : `SpellSystem.brew('${type}');ArmyPanel.render()`}"
                          title="${sd.description}">
                <div class="army-troop-icon">${sd.icon}</div>
                <div class="army-troop-name">${sd.name}</div>
                <div class="army-troop-stats" style="color:#ce93d8;font-size:8px;">${sd.description.substring(0, 24)}...</div>
                <div class="army-troop-cost">${costText}</div>
                <div class="army-troop-time">${Helpers.formatTime(sd.time)}</div>
                ${!unlocked ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#888;">TH${sd.thRequired}</div>` : ''}
            </div>`;
        }
        html += `</div>`;

        return html;
    },

    // Har 1 soniyada yangilash (queue progress) — minimal DOM update
    update() {
        if (!this.visible || this.activeTab !== 'train') return;

        const barracks = this.selectedBarracks;
        if (!barracks) return;

        const queue = TroopManager.getQueue(barracks.id);
        if (!queue.length) { this.render(); return; }

        const q0 = queue[0];
        const fill = document.querySelector('.army-queue-fill');
        const timeEl = document.querySelector('.army-queue-time');

        if (!fill) { this.render(); return; } // first render

        const progress  = timerManager.getProgress(q0.timerId);
        const remaining = timerManager.getRemaining(q0.timerId);
        fill.style.width = `${progress * 100}%`;
        if (timeEl) timeEl.textContent = Helpers.formatTime(remaining);
    }
};
