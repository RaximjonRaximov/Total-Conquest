// ============================================================
// DEPLOY PANEL — Jangda askarlarni tushirish (professional)
// ============================================================

const DeployPanel = {
    selectedTroop: null,
    _timerInterval: null,

    show() {
        let panel = document.getElementById('deploy-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'deploy-panel';
            document.body.appendChild(panel);
        }
        panel.style.display = 'flex';
        this.selectedTroop = null;
        this._prevStars = 0;  // Reset star tracking for new battle
        this._warnedAt = {};  // Reset timer warnings for new battle
        this._render();
        this._startTimer();
        // Slide-in animation
        requestAnimationFrame(() => panel.classList.add('visible'));
    },

    hide() {
        const panel = document.getElementById('deploy-panel');
        if (panel) {
            panel.classList.remove('visible');
            // Remove display after transition
            setTimeout(() => { if (panel) panel.style.display = 'none'; }, 280);
        }
        this._stopTimer();
    },

    // update() — tashqaridan chaqiriladi (troop deploy, hp o'zgarishi)
    update() {
        if (Game.mode !== 'attack') return;
        const panel = document.getElementById('deploy-panel');
        if (!panel || panel.style.display === 'none') return;
        this._updateStats();
        this._updateCards();
        this._updateInfo();
    },

    // ── To'liq render (faqat show() va selectTroop() dan) ────────────────
    _render() {
        const panel = document.getElementById('deploy-panel');
        if (!panel) return;

        const pct    = this._destructionPct();
        const lootG  = Helpers.formatNumber(BattleManager.lootGained?.gold  || 0);
        const lootF  = Helpers.formatNumber(BattleManager.lootGained?.food  || 0);
        const avG    = Helpers.formatNumber(BattleManager.lootAvailable?.gold || 0);
        const avF    = Helpers.formatNumber(BattleManager.lootAvailable?.food || 0);
        const _lootPct = (key) => {
            const av  = BattleManager.lootAvailable?.[key] || 0;
            const got = BattleManager.lootGained?.[key] || 0;
            return av > 0 ? Math.min(100, Math.round(got / av * 100)) : 0;
        };
        const goldBarPct = _lootPct('gold');
        const foodBarPct = _lootPct('food');

        // Enemy base name banner
        const baseInfo = BattleManager.battleBaseInfo;
        const baseBanner = baseInfo ? `
            <div style="display:flex;align-items:center;justify-content:center;gap:6px;
                        padding:4px 12px;background:rgba(0,0,0,0.4);
                        border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="font-size:10px;color:#888;">🏰</span>
                <span style="font-size:10px;font-weight:600;color:#ddd;
                             font-family:'Cinzel',serif;letter-spacing:0.5px;">
                    ${baseInfo.name || 'Noma\'lum Baza'}
                </span>
                ${baseInfo.difficulty ? `
                <div style="display:flex;gap:1px;">
                    ${'⭐'.repeat(baseInfo.difficulty || 1)}
                </div>` : ''}
            </div>
        ` : '';

        panel.innerHTML = `
            ${baseBanner}
            <!-- ── Yuqori stat satri ───────────────────────── -->
            <div class="deploy-header" id="dp-header">
                <div class="deploy-stats">
                    <div class="deploy-stat" style="flex-direction:column;gap:1px;align-items:stretch;min-width:64px;">
                        <div style="display:flex;align-items:center;gap:3px;">
                            <span class="stat-icon">🪙</span>
                            <span class="stat-val" id="dp-gold">${lootG}</span>
                            <span style="color:#555;font-size:8px">/${avG}</span>
                        </div>
                        <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                            <div id="dp-gold-bar" style="height:100%;width:${goldBarPct}%;
                                background:linear-gradient(90deg,#ffa000,#ffd700);
                                transition:width 0.4s ease;border-radius:2px;"></div>
                        </div>
                    </div>
                    <div class="deploy-stat" style="flex-direction:column;gap:1px;align-items:stretch;min-width:64px;">
                        <div style="display:flex;align-items:center;gap:3px;">
                            <span class="stat-icon">🍎</span>
                            <span class="stat-val" id="dp-food">${lootF}</span>
                            <span style="color:#555;font-size:8px">/${avF}</span>
                        </div>
                        <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                            <div id="dp-food-bar" style="height:100%;width:${foodBarPct}%;
                                background:linear-gradient(90deg,#388e3c,#66bb6a);
                                transition:width 0.4s ease;border-radius:2px;"></div>
                        </div>
                    </div>
                    ${BattleSystem.winStreak >= 2 ? `
                    <div class="deploy-stat" style="background:rgba(255,152,0,0.12);border-color:rgba(255,152,0,0.3);">
                        <span class="stat-icon">🔥</span>
                        <span class="stat-val" style="color:#ff9800;">${BattleSystem.winStreak}x</span>
                    </div>` : ''}
                </div>

                <div class="deploy-destruction">
                    <!-- Star goals tooltip row -->
                    <div id="dp-star-goals" style="display:flex;gap:4px;justify-content:center;margin-bottom:3px;">
                        <div style="font-size:7px;color:#666;background:rgba(0,0,0,0.3);
                                    border-radius:4px;padding:1px 5px;white-space:nowrap;"
                             title="1-yulduz: 50% vayronalik">★ 50%</div>
                        <div style="font-size:7px;color:#666;background:rgba(0,0,0,0.3);
                                    border-radius:4px;padding:1px 5px;white-space:nowrap;"
                             title="2-yulduz: Qarorgohi vayron qiling">★★ Qarorgohi</div>
                        <div style="font-size:7px;color:#666;background:rgba(0,0,0,0.3);
                                    border-radius:4px;padding:1px 5px;white-space:nowrap;"
                             title="3-yulduz: 100% vayronalik">★★★ 100%</div>
                    </div>
                    <div class="deploy-stars" id="dp-stars">
                        <span class="dp-star" id="dp-s1">★</span>
                        <span class="dp-star" id="dp-s2">★</span>
                        <span class="dp-star" id="dp-s3">★</span>
                    </div>
                    <div class="deploy-dest-bar-bg">
                        <div class="deploy-dest-bar-fill" id="dp-dest-fill" style="width:${pct}%"></div>
                    </div>
                    <div class="deploy-dest-pct" id="dp-dest-pct">${pct}%</div>
                </div>

                <div style="display:flex;align-items:center;gap:6px;">
                    <div class="deploy-timer" id="dp-timer">3:00</div>
                    <div id="dp-speed-btn"
                         onclick="DeployPanel.toggleSpeed()"
                         style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
                                border-radius:5px;padding:3px 7px;cursor:pointer;font-size:10px;
                                font-weight:bold;color:#fff;user-select:none;">1x</div>
                </div>
            </div>

            <!-- ── Tez deploy pattern tugmalari ─────────────── -->
            <div id="dp-pattern-row" style="display:flex;gap:4px;padding:3px 8px;border-top:1px solid rgba(255,255,255,0.04);">
                <button onclick="DeployPanel.scatterAll('north')"
                    style="flex:1;padding:3px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                           border-radius:5px;color:#aaa;font-size:9px;cursor:pointer;"
                    title="Shimoldan tushirish">⬆ Shimol</button>
                <button onclick="DeployPanel.scatterAll('south')"
                    style="flex:1;padding:3px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                           border-radius:5px;color:#aaa;font-size:9px;cursor:pointer;"
                    title="Janubdan tushirish">⬇ Janub</button>
                <button onclick="DeployPanel.scatterAll('west')"
                    style="flex:1;padding:3px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                           border-radius:5px;color:#aaa;font-size:9px;cursor:pointer;"
                    title="G'arbdan tushirish">⬅ G'arb</button>
                <button onclick="DeployPanel.scatterAll('east')"
                    style="flex:1;padding:3px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                           border-radius:5px;color:#aaa;font-size:9px;cursor:pointer;"
                    title="Sharqdan tushirish">➡ Sharq</button>
                <button onclick="DeployPanel.scatterAll('scatter')"
                    style="flex:1;padding:3px;background:rgba(255,87,34,0.12);border:1px solid rgba(255,87,34,0.25);
                           border-radius:5px;color:#ff8a80;font-size:9px;cursor:pointer;"
                    title="Barcha tomondan hujum">⚡ Hammasi</button>
            </div>

            <!-- ── Askar qoldiq + sehr fabrika holati ─────── -->
            <div id="dp-army-status"
                 style="display:flex;justify-content:space-between;align-items:center;
                        padding:2px 10px;border-top:1px solid rgba(255,255,255,0.04);
                        background:rgba(0,0,0,0.15);">
                <span id="dp-troops-left"
                      style="font-size:9px;color:#aaa;font-weight:600;">⚔️ — askar</span>
                <span id="dp-spell-status"
                      style="font-size:9px;color:#888;"></span>
            </div>

            <!-- ── Askarlar + tugma ───────────────────────── -->
            <div class="deploy-troops-row" id="dp-troops"></div>

            <!-- ── Tanlangan askar ma'lumoti ─────────────────── -->
            <div class="deploy-troop-info" id="dp-info">
                <span style="color:#555; font-size:10px">Askar tanlang, keyin xaritaga bosing</span>
            </div>
            <!-- ── Commander ability ─────────────────────────── -->
            <div id="dp-ability-row" style="display:none;padding:4px 10px 6px;border-top:1px solid rgba(255,255,255,0.04);">
                <button id="dp-ability-btn" onclick="DeployPanel.useCommanderAbility()"
                        style="width:100%;padding:6px;border-radius:8px;border:none;cursor:pointer;
                               font-size:11px;font-weight:bold;font-family:'Cinzel',serif;
                               background:linear-gradient(145deg,#b8860b,#d4af37);color:#000;">
                    👑 Jang Nidosi (tayyor)
                </button>
            </div>
        `;

        this._buildCards();
    },

    // ── Kartalar (troops + end btn) ───────────────────────────────────────
    _buildCards() {
        const row = document.getElementById('dp-troops');
        if (!row) return;
        row.innerHTML = '';

        const troops = BattleManager.availableTroops || {};
        let anyTroop = false;

        for (const [type, count] of Object.entries(troops)) {
            if (count < 0) continue;
            anyTroop = true;

            // Praetorium CC troops — maxsus karta
            if (type === '_praetorium') {
                const sel = this.selectedTroop === type;
                const empty = count === 0;
                const card = document.createElement('div');
                card.className = `deploy-troop-card${sel ? ' selected' : ''}${empty ? ' empty' : ''}`;
                card.setAttribute('data-type', type);
                if (!empty) card.onclick = () => this.selectTroop(type);
                card.innerHTML = `
                    <div class="dtc-portrait" style="background:linear-gradient(135deg,#5c3d2e,#8b6914);">
                        <span style="font-size:22px;line-height:1">🏰</span>
                    </div>
                    <div class="dtc-count" id="dtc-cnt-${type}">${count}</div>
                    <div class="dtc-name" style="font-size:8px">Praetorium</div>
                    <div class="dtc-selected-ring"></div>
                `;
                row.appendChild(card);
                continue;
            }

            const td  = TROOP_DATA[type];
            if (!td) continue;
            const sel = this.selectedTroop === type;
            const empty = count === 0;

            const card = document.createElement('div');
            card.className = `deploy-troop-card${sel ? ' selected' : ''}${empty ? ' empty' : ''}`;
            card.setAttribute('data-type', type);
            if (!empty) card.onclick = () => this.selectTroop(type);

            // Portrait — try asset, fallback emoji
            const portrait = AssetManager.getTroopPortrait(type);
            const catClass = `cat-${td.category || 'piyoda'}`;
            const portContent = portrait
                ? `<img src="assets/ui/portraits/${type}.png" alt="${td.name}">`
                : `<span style="font-size:26px;line-height:1">${td.icon}</span>`;

            const flyBadge = td.flying
                ? `<div class="dtc-flying-badge">FLY</div>`
                : '';

            // Research darajasi badge (Lv.X)
            const troopLv = (typeof ResearchSystem !== 'undefined')
                ? ResearchSystem.getTroopDisplayLevel(type) : 1;
            const lvBadge = troopLv > 1
                ? `<div class="dtc-level-badge">Lv.${troopLv}</div>`
                : '';

            // Super Troop badge
            const isSuper = typeof SuperTroops !== 'undefined' && SuperTroops.isActive(type);
            const superBadge = isSuper
                ? `<div style="position:absolute;top:-3px;left:-3px;
                               background:linear-gradient(135deg,#ff6d00,#ffd700);
                               color:#000;font-size:7px;font-weight:900;
                               padding:1px 3px;border-radius:3px;z-index:10;
                               box-shadow:0 0 4px rgba(255,109,0,0.8);">🔥S</div>`
                : '';
            if (isSuper) {
                card.style.setProperty('--super-glow', '1');
                card.style.boxShadow = '0 0 8px rgba(255,109,0,0.6),0 0 3px rgba(255,215,0,0.4)';
                card.style.borderColor = 'rgba(255,109,0,0.7)';
            }

            // Housing space badge — capacity > 1 bo'lsa ko'rsatish (Giant=5, Dragon=20 kabi)
            const housingCap = td.stats?.capacity || 1;
            const housingBadge = housingCap > 1
                ? `<div style="position:absolute;bottom:14px;right:-2px;
                               background:rgba(0,0,0,0.75);border:1px solid rgba(144,202,249,0.3);
                               color:#90caf9;font-size:7px;font-weight:800;
                               padding:1px 3px;border-radius:3px;z-index:10;
                               letter-spacing:0.2px;">🏠${housingCap}</div>`
                : '';

            card.innerHTML = `
                <div class="dtc-portrait ${catClass}" style="${isSuper ? 'filter:brightness(1.2) saturate(1.5);' : ''}">${portContent}</div>
                <div class="dtc-count" id="dtc-cnt-${type}">${count}</div>
                <div class="dtc-name" style="${isSuper ? 'color:#ff8a65;' : ''}">${isSuper ? '🔥' : ''}${td.name}</div>
                <div class="dtc-selected-ring"></div>
                ${flyBadge}${lvBadge}${superBadge}${housingBadge}
            `;
            row.appendChild(card);
        }

        if (!anyTroop) {
            const msg = document.createElement('div');
            msg.style.cssText = 'color:#666;font-size:10px;margin:auto;padding:0 12px';
            msg.textContent = 'Qo\'shin yo\'q';
            row.appendChild(msg);
        }

        // ── Barcha qahramonlar — mavjud bo'lsalar oldin chiqadi ─────────────
        if (typeof HeroSystem !== 'undefined' && typeof TROOP_DATA !== 'undefined') {
            // Faqat aktiv qahramonlar (haykal qurilgan va TH yetarli)
            const activeHeroes = HeroSystem.getActiveHeroes();
            for (const heroType of activeHeroes) {
                const td = TROOP_DATA[heroType];
                if (!td) continue;

                const hero = HeroSystem.commanders[heroType];
                if (!hero) continue;
                const heroAvailable = !hero.sleeping &&
                                      (BattleManager.availableTroops?.[heroType] || 0) > 0;
                const heroSleeping  = hero?.sleeping;
                const sel = this.selectedTroop === heroType;
                const regenSec = HeroSystem.getRegenRemaining(heroType);
                const prog = Math.round(HeroSystem.getXPProgress(heroType) * 100);
                const abilityInfo = HeroSystem.getAbilityInfo(heroType);

                const card = document.createElement('div');
                card.className = `deploy-troop-card hero-troop-card${sel ? ' selected' : ''}${!heroAvailable ? ' empty' : ''}`;
                card.setAttribute('data-type', heroType);
                if (heroAvailable) card.onclick = () => this.selectTroop(heroType);

                const regenLabel = heroSleeping
                    ? `<div class="dtc-regen">⏳${Math.ceil(regenSec/60)}m</div>`
                    : '';

                card.innerHTML = `
                    <div class="dtc-portrait cat-qahramon"
                         style="border-color:${abilityInfo.color}99;background:${abilityInfo.color}15;">
                        <span style="font-size:24px;line-height:1">${td.icon}</span>
                        ${heroSleeping ? '<div class="dtc-sleep-overlay">😴</div>' : ''}
                    </div>
                    <div class="dtc-count" style="background:#b8860b;">${heroSleeping ? '💤' : '1'}</div>
                    <div class="dtc-name" style="color:${sel ? abilityInfo.color : '#daa520'}">${td.name}</div>
                    <div class="dtc-hero-lv">Lv${hero.level}</div>
                    <div class="dtc-selected-ring"></div>
                    ${regenLabel}
                `;
                row.insertBefore(card, row.firstChild);
            }
        }

        // Sehrlar (agar mavjud bo'lsa)
        if (typeof SpellSystem !== 'undefined') {
            const spells = SpellSystem.inventory;
            for (const [type, count] of Object.entries(spells)) {
                if (count < 1) continue;
                const sd = SPELL_DATA[type];
                if (!sd) continue;
                const sel = this.selectedTroop === `spell:${type}`;
                const card = document.createElement('div');
                card.className = `deploy-troop-card${sel ? ' selected' : ''}`;
                card.setAttribute('data-type', `spell:${type}`);
                card.onclick = () => this.selectTroop(`spell:${type}`);
                card.innerHTML = `
                    <div class="dtc-portrait" style="background:rgba(123,31,162,0.3);border-color:rgba(156,39,176,0.5);">
                        <span style="font-size:24px;line-height:1">${sd.icon}</span>
                    </div>
                    <div class="dtc-count">${count}</div>
                    <div class="dtc-name">${sd.name.split(' ')[0]}</div>
                    <div class="dtc-selected-ring"></div>
                `;
                row.appendChild(card);
            }
        }

        // End battle tugmasi
        const endBtn = document.createElement('div');
        endBtn.className = 'deploy-end-btn';
        endBtn.onclick = () => {
            // AttackScreen ning chiroyli confirm modali (native confirm() o'rniga)
            if (typeof AttackScreen !== 'undefined') {
                AttackScreen.endBattle();
            } else {
                BattleManager.endBattle();
            }
        };
        endBtn.innerHTML = `<span class="deploy-end-icon">🏳️</span><span>Yakunlash</span>`;
        row.appendChild(endBtn);
    },

    // ── Faqat badgelarni yangilash (har deploy dan keyin) ─────────────────
    _updateCards() {
        const troops = BattleManager.availableTroops || {};
        for (const [type, count] of Object.entries(troops)) {
            const badge = document.getElementById(`dtc-cnt-${type}`);
            if (badge) badge.textContent = count;

            const card = document.querySelector(`.deploy-troop-card[data-type="${type}"]`);
            if (card) {
                card.classList.toggle('empty',    count === 0);
                card.classList.toggle('selected', this.selectedTroop === type);
            }
        }

        // Barcha hero card yangilash
        if (typeof HeroSystem !== 'undefined') {
            for (const heroType of Object.keys(HeroSystem.commanders)) {
                const heroCard = document.querySelector(`.deploy-troop-card[data-type="${heroType}"]`);
                if (!heroCard) continue;
                const avail = HeroSystem.isAvailable(heroType) &&
                              (BattleManager.availableTroops?.[heroType] || 0) > 0;
                heroCard.classList.toggle('empty',    !avail);
                heroCard.classList.toggle('selected', this.selectedTroop === heroType);
            }
        }
    },

    _prevStars: 0,   // Yulduz o'zgarishini kuzatish uchun

    // ── Stats: loot + destruction bar + yulduzlar ─────────────────────────
    _updateStats() {
        const pct   = this._destructionPct();
        const lootG = Helpers.formatNumber(BattleManager.lootGained?.gold || 0);
        const lootF = Helpers.formatNumber(BattleManager.lootGained?.food || 0);

        const g = document.getElementById('dp-gold');
        const f = document.getElementById('dp-food');
        const fill = document.getElementById('dp-dest-fill');
        const pctEl = document.getElementById('dp-dest-pct');

        // Yulduzlar — yangi yulduz qo'shilganda burst animatsiya
        const liveStars = BattleManager.getLiveStars?.() ?? 0;
        if (liveStars > this._prevStars) {
            this._triggerStarBurst(liveStars);
            this._prevStars = liveStars;
        }
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById(`dp-s${i}`);
            if (el) {
                const earned = i <= liveStars;
                el.style.color  = earned ? '#FFD700' : 'rgba(255,255,255,0.2)';
                el.style.textShadow = earned ? '0 0 8px #FFD700, 0 0 20px rgba(255,215,0,0.5)' : 'none';
                el.style.transform = earned ? 'scale(1.2)' : 'scale(1)';
                el.style.transition = 'transform 0.3s ease, color 0.3s ease, text-shadow 0.3s ease';
            }
        }

        // Star goal hints — earned goallar yashil bo'lsin
        // _updateStars mantiqiga mos: star1=50%, star2=TH yo'q qilindi, star3=100%
        const goalEls = document.querySelectorAll('#dp-star-goals div');
        if (goalEls.length === 3) {
            const thDestroyed = BattleManager.cityHallDestroyed || false;
            const goalStates = [pct >= 50, thDestroyed, pct >= 100];
            goalEls.forEach((el, i) => {
                el.style.color = goalStates[i] ? '#81c784' : '#555';
                el.style.background = goalStates[i] ? 'rgba(76,175,80,0.15)' : 'rgba(0,0,0,0.3)';
            });
        }

        if (g) g.textContent = lootG;
        if (f) f.textContent = lootF;
        if (fill)  fill.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';

        // Loot progress bars
        const gBar = document.getElementById('dp-gold-bar');
        const fBar = document.getElementById('dp-food-bar');
        if (gBar) {
            const av  = BattleManager.lootAvailable?.gold || 0;
            const got = BattleManager.lootGained?.gold    || 0;
            gBar.style.width = (av > 0 ? Math.min(100, Math.round(got / av * 100)) : 0) + '%';
        }
        if (fBar) {
            const av  = BattleManager.lootAvailable?.food || 0;
            const got = BattleManager.lootGained?.food    || 0;
            fBar.style.width = (av > 0 ? Math.min(100, Math.round(got / av * 100)) : 0) + '%';
        }

        // ── Askar qoldiq hisoblagichi ────────────────────────────────────────
        const troopsLeftEl = document.getElementById('dp-troops-left');
        if (troopsLeftEl) {
            const troops = BattleManager.availableTroops || {};
            let totalLeft = 0;
            for (const [type, cnt] of Object.entries(troops)) {
                if (type === '_praetorium') { if (cnt > 0) totalLeft++; continue; }
                if (cnt > 0 && TROOP_DATA?.[type]) totalLeft += cnt;
            }
            troopsLeftEl.textContent = `⚔️ ${totalLeft} qoldi`;
            troopsLeftEl.style.color = totalLeft === 0 ? '#ef5350' : totalLeft <= 5 ? '#ff9800' : '#aaa';
        }

        // ── Sehr fabrika holati ──────────────────────────────────────────────
        const spellStatusEl = document.getElementById('dp-spell-status');
        if (spellStatusEl && typeof SpellSystem !== 'undefined') {
            const q = SpellSystem._brewQueue;
            if (q && q.length > 0) {
                const brewing = q[0];
                const sd = SPELL_DATA?.[brewing.type];
                const rem = typeof timerManager !== 'undefined' && timerManager.getRemaining
                    ? timerManager.getRemaining(brewing.timerId)
                    : null;
                if (rem !== null && rem > 0) {
                    const m = Math.floor(rem / 60), s = Math.floor(rem % 60);
                    spellStatusEl.textContent = `${sd?.icon || '🧪'} ${m}:${String(s).padStart(2,'0')}`;
                    spellStatusEl.style.color = '#b39ddb';
                } else {
                    spellStatusEl.textContent = `${sd?.icon || '🧪'} tayyorlanmoqda`;
                    spellStatusEl.style.color = '#b39ddb';
                }
            } else {
                spellStatusEl.textContent = '';
            }
        }

        const speedBtn = document.getElementById('dp-speed-btn');
        if (speedBtn) {
            const spd = Game.gameSpeed || 1;
            speedBtn.innerHTML = spd > 1 ? '⚡ 2x' : '▶ 1x';
            speedBtn.style.background = spd > 1 ? 'rgba(255,87,34,0.35)' : 'rgba(255,255,255,0.08)';
            speedBtn.style.borderColor = spd > 1 ? 'rgba(255,87,34,0.7)' : 'rgba(255,255,255,0.15)';
            speedBtn.style.color = spd > 1 ? '#ff8a80' : '#aaa';
            speedBtn.style.transform = spd > 1 ? 'scale(1.08)' : 'scale(1)';
        }

        // Qahramon ability buttons (barcha heroTypes)
        const abilityRow = document.getElementById('dp-ability-row');
        const abilityBtn = document.getElementById('dp-ability-btn');
        if (abilityRow && abilityBtn && typeof HeroSystem !== 'undefined') {
            // Birinchi jangdagi qahramon qobiliyatini ko'rsatish
            let anyHeroDeployed = false;
            let shownHeroType = null;
            for (const heroType of Object.keys(HeroSystem.commanders)) {
                if (BattleManager.troops.some(t => t.type === heroType && t.hp > 0)) {
                    anyHeroDeployed = true;
                    shownHeroType = heroType;
                    break; // Birinchisini ko'rsat
                }
            }
            if (anyHeroDeployed && shownHeroType) {
                abilityRow.style.display = 'block';
                const abilityInfo = HeroSystem.getAbilityInfo(shownHeroType);
                const canUse = HeroSystem.canUseAbility(shownHeroType);
                const cdLeft = HeroSystem.getAbilityCooldownLeft(shownHeroType);
                if (canUse) {
                    abilityBtn.textContent = `${abilityInfo.icon} ${abilityInfo.name} (tayyor)`;
                    abilityBtn.style.background = `linear-gradient(145deg,${abilityInfo.color}88,${abilityInfo.color})`;
                    abilityBtn.style.opacity = '1';
                    abilityBtn.disabled = false;
                    abilityBtn.onclick = () => DeployPanel.useHeroAbility(shownHeroType);
                } else {
                    abilityBtn.textContent = `${abilityInfo.icon} ${abilityInfo.name} (${cdLeft}s)`;
                    abilityBtn.style.background = 'rgba(255,255,255,0.08)';
                    abilityBtn.style.opacity = '0.5';
                    abilityBtn.disabled = true;
                }
            } else {
                abilityRow.style.display = 'none';
            }
        }
    },

    useHeroAbility(heroType) {
        if (typeof HeroSystem === 'undefined') return;
        const ht = heroType || 'legatus';
        const hero = BattleManager.troops.find(t => t.type === ht && t.hp > 0);
        if (!hero) { Toast.show(`${TROOP_DATA[ht]?.name || 'Qahramon'} jangda emas!`, 'warn'); return; }
        HeroSystem.useAbility(ht, hero.x, hero.y);
    },

    // Backward compat
    useCommanderAbility() { this.useHeroAbility('legatus'); },

    // ── Yangi yulduz qo'shilganda katta animatsiya ───────────────────────────
    _triggerStarBurst(starCount) {
        // Oldingi animatsiyani tozalash
        const old = document.getElementById('star-burst-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'star-burst-overlay';
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            pointer-events:none;z-index:9999;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
        `;

        // Yulduzlar qatori
        const starRow = document.createElement('div');
        starRow.style.cssText = `display:flex;gap:8px;`;

        const msgs = ['', 'TH yo\'q qilindi!', '50% vayron!', '3 Yulduz! Mukammal!'];
        const msg  = msgs[starCount] || '';

        for (let i = 1; i <= 3; i++) {
            const s = document.createElement('div');
            const earned = i <= starCount;
            s.style.cssText = `
                font-size:52px;line-height:1;
                color:${earned ? '#FFD700' : 'rgba(255,255,255,0.15)'};
                text-shadow:${earned ? '0 0 30px #FFD700, 0 0 60px rgba(255,200,0,0.6)' : 'none'};
                transform:scale(0);
                transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${(i-1)*0.12}s;
            `;
            s.textContent = '★';
            starRow.appendChild(s);
            // Trigger
            requestAnimationFrame(() => requestAnimationFrame(() => {
                s.style.transform = 'scale(1)';
            }));
        }

        const label = document.createElement('div');
        label.style.cssText = `
            margin-top:10px;font-size:16px;font-weight:bold;
            color:#FFD700;font-family:'Cinzel',serif;letter-spacing:1px;
            text-shadow:0 0 12px rgba(255,200,0,0.8);
            opacity:0;transition:opacity 0.3s ease 0.5s;
        `;
        label.textContent = msg;

        overlay.appendChild(starRow);
        overlay.appendChild(label);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            label.style.opacity = '1';
        }));

        // Screen shake
        if (typeof BattleRenderer !== 'undefined') {
            BattleRenderer.triggerShake(14 * (Camera.zoom || 1), 400);
        }

        // 1.8 soniyadan keyin yashirin
        setTimeout(() => {
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 550);
        }, 1800);

        // Audio
        if (typeof AudioManager !== 'undefined') AudioManager.playClick?.();
    },

    toggleSpeed() {
        Game.gameSpeed = (Game.gameSpeed || 1) >= 2 ? 1 : 2;
        const spd = Game.gameSpeed;
        Toast.show(spd > 1 ? '⚡ 2x tezlik yoqildi!' : '▶️ Normal tezlik', 'info', 1000);
        this._updateStats();
    },

    // ── Tanlangan askar ma'lumoti ─────────────────────────────────────────
    _updateInfo() {
        const info = document.getElementById('dp-info');
        if (!info) return;
        const type = this.selectedTroop;
        if (!type) {
            info.innerHTML = `<span style="color:#555;font-size:10px">Askar tanlang, keyin xaritaga bosing</span>`;
            return;
        }
        if (type.startsWith('spell:')) {
            const spellType = type.slice(6);
            const sd = SPELL_DATA?.[spellType];
            if (sd) {
                info.innerHTML = `
                    <span class="dti-icon">${sd.icon}</span>
                    <span class="dti-name">${sd.name}</span>
                    <span class="dti-stats">${sd.description || ''}</span>
                    <span class="dti-hint">👆 Xaritaga bosing</span>
                `;
            }
            return;
        }
        const td  = TROOP_DATA[type];
        const cnt = BattleManager.availableTroops?.[type] || 0;
        const dps = td.stats.attackSpeed
            ? Math.round((td.stats.damage / td.stats.attackSpeed) * 1000)
            : td.stats.damage;
        info.innerHTML = `
            <span class="dti-icon">${td.icon}</span>
            <span class="dti-name">${td.name}</span>
            <span class="dti-stats">HP:${td.stats.hp} | DPS:${dps} | Tezlik:${td.stats.speed} | x${cnt}</span>
            <span class="dti-hint">👆 Xaritaga bosing</span>
        `;
    },

    // ── Timer ─────────────────────────────────────────────────────────────
    _startTimer() {
        this._stopTimer();
        this._timerInterval = setInterval(() => this._tickTimer(), 1000);
    },

    _stopTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    },

    _tickTimer() {
        const timerEl = document.getElementById('dp-timer');
        if (!timerEl) return;

        const elapsed = (Date.now() - (BattleManager.startTime || Date.now())) / 1000;
        const limit   = (BattleManager.timeLimit || 180000) / 1000;
        const left    = Math.max(0, limit - elapsed);

        const m = Math.floor(left / 60);
        const s = Math.floor(left % 60);
        timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        timerEl.classList.toggle('urgent', left <= 30);

        // Countdown ogoh qilishlari
        const leftInt = Math.floor(left);
        if (!this._warnedAt) this._warnedAt = {};
        if (leftInt === 60 && !this._warnedAt[60]) {
            this._warnedAt[60] = true;
            Toast.show('⏰ 1 daqiqa qoldi!', 'warn', 2000);
        }
        if (leftInt === 30 && !this._warnedAt[30]) {
            this._warnedAt[30] = true;
            Toast.show('⚠️ 30 soniya qoldi!', 'warn', 2000);
            if (typeof AudioManager !== 'undefined') AudioManager.playClick?.();
            // Sariq ekran chaqnashi
            const flash30 = document.createElement('div');
            flash30.style.cssText = 'position:fixed;inset:0;background:rgba(255,160,0,0.12);z-index:24000;pointer-events:none;animation:achFlash 0.5s ease-out forwards;';
            document.body.appendChild(flash30);
            setTimeout(() => flash30.remove(), 550);
        }
        if (leftInt === 10 && !this._warnedAt[10]) {
            this._warnedAt[10] = true;
            Toast.show('🚨 10 soniya qoldi!', 'error', 2500);
            // Qizil ekran chaqnashi (3 marta)
            for (let fi = 0; fi < 3; fi++) {
                setTimeout(() => {
                    const flashRed = document.createElement('div');
                    flashRed.style.cssText = 'position:fixed;inset:0;background:rgba(244,67,54,0.18);z-index:24000;pointer-events:none;animation:achFlash 0.4s ease-out forwards;';
                    document.body.appendChild(flashRed);
                    setTimeout(() => flashRed.remove(), 450);
                }, fi * 300);
            }
        }
    },

    // ── Public API ────────────────────────────────────────────────────────
    selectTroop(type) {
        if ((BattleManager.availableTroops?.[type] || 0) <= 0) return;
        this.selectedTroop = type;
        this._updateCards();
        this._updateInfo();
    },

    handleClick(x, y) {
        if (!this.selectedTroop) {
            Toast.show('Askar tanlang!', 'warning');
            return;
        }

        // Sehr ishlatish
        if (this.selectedTroop.startsWith('spell:')) {
            const spellType = this.selectedTroop.slice(6);
            if (typeof SpellSystem !== 'undefined') {
                if (SpellSystem.useInBattle(spellType, x, y)) {
                    if (!SpellSystem.inventory[spellType]) this.selectedTroop = null;
                    this._buildCards();
                    this._updateStats();
                }
            }
            return;
        }

        if (BattleManager.deployTroop(this.selectedTroop, x, y)) {
            if ((BattleManager.availableTroops?.[this.selectedTroop] || 0) <= 0) {
                this.selectedTroop = null;
            }
            this._updateCards();
            this._updateStats();
            this._updateInfo();
            // Ground impact ripple at screen position
            this._troopDropRipple(x, y);
        }
    },

    _troopDropRipple(wx, wy) {
        const screen = (typeof Camera !== 'undefined') ? Camera.worldToScreen(wx, wy) : { x: wx, y: wy };
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position:fixed;
            left:${Math.round(screen.x)}px;
            top:${Math.round(screen.y)}px;
            width:4px;height:4px;
            border-radius:50%;
            pointer-events:none;
            z-index:8700;
            transform:translate(-50%,-50%);
            background:rgba(255,220,100,0.7);
            box-shadow:0 0 0 0 rgba(255,220,100,0.5);
            animation:troopDropRippleAnim 0.5s ease-out forwards;
        `;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 550);
    },

    // ── Quick scatter deploy (koʻp askarni bir yon bo'ylab tushirish) ──────
    scatterAll(direction) {
        const type = this.selectedTroop;
        if (!type || type.startsWith('spell:')) {
            Toast.show('Avval askar tanlang!', 'warn', 1500);
            return;
        }

        const avail = BattleManager.availableTroops?.[type] || 0;
        if (avail === 0) {
            Toast.show('Bu turdagi askar qolmadi!', 'warn', 1500);
            return;
        }

        const GRID = typeof Grid !== 'undefined' ? Grid.SIZE : 30;
        const margin = 1;   // Xarita chetidan ichkariga
        const count = Math.min(avail, 12);  // Max 12 ta bir yo'la
        let deployed = 0;

        // Deploy qilish funksiyasi
        const deploy = (wx, wy) => {
            if (BattleManager.deployTroop(type, wx, wy)) deployed++;
        };

        if (direction === 'north') {
            // Y = 0 (xarita shimoli), X bo'ylab taqsimlash
            for (let i = 0; i < count; i++) {
                const wx = margin + ((GRID - margin * 2) * i / Math.max(1, count - 1));
                deploy(wx, margin);
            }
        } else if (direction === 'south') {
            for (let i = 0; i < count; i++) {
                const wx = margin + ((GRID - margin * 2) * i / Math.max(1, count - 1));
                deploy(wx, GRID - margin);
            }
        } else if (direction === 'west') {
            for (let i = 0; i < count; i++) {
                const wy = margin + ((GRID - margin * 2) * i / Math.max(1, count - 1));
                deploy(margin, wy);
            }
        } else if (direction === 'east') {
            for (let i = 0; i < count; i++) {
                const wy = margin + ((GRID - margin * 2) * i / Math.max(1, count - 1));
                deploy(GRID - margin, wy);
            }
        } else if (direction === 'scatter') {
            // Barcha 4 tomonga
            const perSide = Math.ceil(count / 4);
            const sides = ['north', 'south', 'west', 'east'];
            for (const side of sides) {
                const n = Math.min(perSide, (BattleManager.availableTroops?.[type] || 0));
                for (let i = 0; i < n; i++) {
                    const t = i / Math.max(1, n - 1);
                    const wx = side === 'north' || side === 'south'
                        ? margin + (GRID - margin * 2) * t
                        : (side === 'west' ? margin : GRID - margin);
                    const wy = side === 'west' || side === 'east'
                        ? margin + (GRID - margin * 2) * t
                        : (side === 'north' ? margin : GRID - margin);
                    deploy(wx, wy);
                }
            }
        }

        if (deployed > 0) {
            const td = TROOP_DATA[type];
            Toast.show(`${td?.icon || '⚔️'} ${deployed}x ${td?.name || type} tushirildi!`, 'success', 1500);
            this._updateCards();
            this._updateStats();
            this._updateInfo();
        }
    },

    // ── Yordamchi ─────────────────────────────────────────────────────────
    _destructionPct() {
        const total = BattleManager.totalBuildings || 1;
        const dest  = BattleManager.destroyedCount || 0;
        return Math.min(100, Math.floor((dest / total) * 100));
    },

    // ── Pre-result cinematic overlay ─────────────────────────────────────
    _showResultCinematic(victory, stars, onDone) {
        const overlay = document.createElement('div');
        overlay.id = 'br-cinematic-overlay';
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:19000;pointer-events:none;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            background:${victory
                ? 'radial-gradient(circle at 50% 50%,rgba(212,175,55,0.35) 0%,rgba(0,0,0,0.92) 70%)'
                : 'radial-gradient(circle at 50% 50%,rgba(180,0,0,0.25) 0%,rgba(0,0,0,0.95) 70%)'};
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-family:'Cinzel',serif;font-size:52px;font-weight:900;
            color:${victory ? '#ffd700' : '#ef5350'};
            text-shadow:${victory
                ? '0 0 20px #ffd700,0 0 40px #ffa000,0 4px 8px rgba(0,0,0,0.8)'
                : '0 0 20px #f44336,0 0 40px #b71c1c,0 4px 8px rgba(0,0,0,0.8)'};
            letter-spacing:6px;
            opacity:0;transform:scale(0.3) translateY(-20px);
            animation:brCinTitle 0.65s cubic-bezier(0.175,0.885,0.32,1.275) 0.15s forwards;
        `;
        title.textContent = victory ? "G'ALABA!" : "MAG'LUBIYAT";

        const sub = document.createElement('div');
        sub.style.cssText = `
            font-size:16px;color:${victory?'#ffecb3':'#ef9a9a'};margin-top:12px;
            opacity:0;animation:brCinSub 0.4s ease-out 0.6s forwards;
            letter-spacing:2px;font-weight:700;
        `;
        sub.textContent = victory
            ? (stars >= 3 ? '🌟 MUKAMMAL HUJUM! 🌟' : `${stars} yulduz bilan`)
            : 'Keyingi safar omad tilaymiz';

        // Stars row (cinematic)
        const starsRow = document.createElement('div');
        starsRow.style.cssText = 'display:flex;gap:12px;margin-top:20px;';
        for (let i = 0; i < 3; i++) {
            const s = document.createElement('span');
            s.style.cssText = `
                font-size:36px;opacity:0;
                animation:brCinStar 0.4s cubic-bezier(0.175,0.885,0.32,1.275) ${0.7 + i * 0.18}s forwards;
                filter:${i < stars ? 'drop-shadow(0 0 10px #ffd700)' : 'grayscale(1) opacity(0.3)'};
            `;
            s.textContent = i < stars ? '⭐' : '☆';
            starsRow.appendChild(s);
        }

        overlay.appendChild(title);
        overlay.appendChild(sub);
        overlay.appendChild(starsRow);

        // Victory particle burst + 3-star fireworks (CoC-style)
        if (victory) {
            const burstColors = ['#ffd700','#ff8f00','#fff9c4','#ffe082','#ffecb3','#ef5350','#42a5f5'];
            // Confetti burst (kengaytirilgan)
            setTimeout(() => {
                const count = stars >= 3 ? 65 : 35;
                for (let i = 0; i < count; i++) {
                    const p = document.createElement('div');
                    const angle = Math.random() * Math.PI * 2;
                    const spd   = 80 + Math.random() * (stars >= 3 ? 200 : 140);
                    const size  = 4 + Math.random() * 8;
                    const color = burstColors[Math.floor(Math.random() * burstColors.length)];
                    const dur   = 700 + Math.random() * 500;
                    p.style.cssText = `
                        position:fixed;left:50%;top:45%;
                        width:${size}px;height:${size}px;
                        background:${color};border-radius:${Math.random()>0.5?'50%':'2px'};
                        pointer-events:none;z-index:19001;
                        transform:translate(-50%,-50%);
                        animation:buildConfettiPiece ${dur}ms ease-out forwards;
                        --vx:${Math.cos(angle)*spd}px;--vy:${Math.sin(angle)*spd - 40}px;
                    `;
                    overlay.appendChild(p);
                    setTimeout(() => p.remove(), dur);
                }
            }, 300);

            // ── 3-Yulduz Fireworks — raketa ko'tariladi, portlaydi ────────────────
            if (stars >= 3) {
                const _launchFirework = (cx, cy, delay) => {
                    setTimeout(() => {
                        if (!document.body.contains(overlay)) return;
                        const fwColors = [
                            ['#ffd700','#ff8f00','#fff176'],
                            ['#ef5350','#ff8a65','#ffcdd2'],
                            ['#42a5f5','#81d4fa','#e3f2fd'],
                            ['#66bb6a','#a5d6a7','#e8f5e9'],
                            ['#ab47bc','#ce93d8','#f3e5f5'],
                        ];
                        const palette = fwColors[Math.floor(Math.random() * fwColors.length)];
                        // Portlash zarralar
                        const sparkCount = 18;
                        for (let si = 0; si < sparkCount; si++) {
                            const spark = document.createElement('div');
                            const sAngle = (si / sparkCount) * Math.PI * 2 + Math.random() * 0.3;
                            const sSpd = 60 + Math.random() * 80;
                            const sSize = 3 + Math.random() * 5;
                            const sColor = palette[Math.floor(Math.random() * palette.length)];
                            const sDur = 600 + Math.random() * 400;
                            spark.style.cssText = `
                                position:fixed;
                                left:${cx}px;top:${cy}px;
                                width:${sSize}px;height:${sSize}px;
                                background:${sColor};
                                border-radius:${Math.random() > 0.4 ? '50%' : '2px'};
                                pointer-events:none;z-index:19002;
                                transform:translate(-50%,-50%);
                                box-shadow:0 0 ${sSize*1.5}px ${sColor};
                                animation:buildConfettiPiece ${sDur}ms ease-out forwards;
                                --vx:${Math.cos(sAngle)*sSpd}px;
                                --vy:${Math.sin(sAngle)*sSpd - 20}px;
                            `;
                            document.body.appendChild(spark);
                            setTimeout(() => spark.remove(), sDur);
                        }
                        // Portlash flash
                        const flash = document.createElement('div');
                        flash.style.cssText = `
                            position:fixed;left:${cx}px;top:${cy}px;
                            width:30px;height:30px;
                            background:radial-gradient(circle,${palette[0]}cc,transparent 70%);
                            border-radius:50%;pointer-events:none;z-index:19003;
                            transform:translate(-50%,-50%) scale(0);
                            animation:fwFlash 0.4s ease-out forwards;
                        `;
                        document.body.appendChild(flash);
                        setTimeout(() => flash.remove(), 400);
                    }, delay);
                };

                // CSS keyframe fwFlash qo'shish (bir marta)
                if (!document.getElementById('fw-style')) {
                    const st = document.createElement('style');
                    st.id = 'fw-style';
                    st.textContent = `
                        @keyframes fwFlash {
                            0%   { transform:translate(-50%,-50%) scale(0); opacity:1; }
                            50%  { transform:translate(-50%,-50%) scale(3); opacity:0.7; }
                            100% { transform:translate(-50%,-50%) scale(5); opacity:0; }
                        }
                    `;
                    document.head.appendChild(st);
                }

                // 6 ta firework, ekranning turli joylarida, ketma-ket
                const W = window.innerWidth, H = window.innerHeight;
                const positions = [
                    [W*0.25, H*0.3], [W*0.75, H*0.25], [W*0.5, H*0.2],
                    [W*0.15, H*0.5], [W*0.85, H*0.45], [W*0.6, H*0.15],
                ];
                positions.forEach(([x, y], idx) => _launchFirework(x, y, 200 + idx * 220));
                // Ikkinchi to'lqin (1.8s da)
                positions.forEach(([x, y], idx) => _launchFirework(x + (Math.random()-0.5)*80, y + (Math.random()-0.5)*60, 1800 + idx * 150));
            }
        }

        document.body.appendChild(overlay);

        // Fade out and call onDone
        const DELAY = victory ? 1900 : 1600;
        setTimeout(() => {
            overlay.style.transition = 'opacity 0.4s ease-out';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                onDone();
            }, 420);
        }, DELAY);
    },

    // ── Battle result modal ───────────────────────────────────────────────
    showResult(victory, stars, loot, percent, xp, trophies, extra) {
        // Deploy panelni darhol yashirish — natija modali ustida ko'rinmasin
        const dp = document.getElementById('deploy-panel');
        if (dp) { dp.classList.remove('visible'); dp.style.display = 'none'; }
        this._stopTimer();
        // Brief cinematic before modal
        this._showResultCinematic(victory, stars, () => this._showResultModal(victory, stars, loot, percent, xp, trophies, extra));
    },

    _showResultModal(victory, stars, loot, percent, xp, trophies, extra) {
        let modal = document.getElementById('battle-result-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'battle-result-modal';
            document.body.appendChild(modal);
        }

        // Yulduzlar initially hidden, animate in one by one
        const starsHtml = ['⭐','⭐','⭐'].map((s, i) =>
            `<span id="br-star-${i}"
                  style="opacity:0.15;filter:none;font-size:32px;
                         transition:opacity 0.25s, transform 0.25s, filter 0.25s;
                         transform:scale(0.7);display:inline-block;">${s}</span>`
        ).join('');

        const trophySign = trophies >= 0 ? '+' : '';
        const ex = extra || {};
        // Kampaniya tugallangani ekranini keyinroq ko'rsatish uchun flag
        if (ex.isCampaignComplete) this._pendingCampaignComplete = true;
        const durationStr = ex.duration !== undefined
            ? `${Math.floor(ex.duration / 60)}:${String(ex.duration % 60).padStart(2, '0')}`
            : null;

        modal.className = '';
        modal.innerHTML = `
            <div class="battle-result-box ${victory ? 'victory' : 'defeat'}">
                <div class="br-title">${victory ? "🏆 G'ALABA" : "💀 MAG'LUBIYAT"}</div>
                ${ex.baseName ? `<div style="font-size:11px;color:#888;margin-bottom:4px;">${ex.baseName}</div>` : ''}
                ${ex.isNewBest ? `
                <div style="
                    display:inline-block;
                    background:linear-gradient(135deg,rgba(76,175,80,0.35),rgba(76,175,80,0.12));
                    border:1px solid rgba(76,175,80,0.6);
                    border-radius:8px; padding:4px 14px; margin:0 auto 6px;
                    font-size:11px; font-weight:800; color:#a5d6a7; letter-spacing:0.5px;
                    animation:newBestPop 0.5s cubic-bezier(.17,.67,.33,1.4) forwards;
                    transform-origin:center;">
                    🌟 YANGI REKORD!
                </div>` : ''}
                ${ex.isCampaignComplete ? `
                <div style="
                    display:inline-block;
                    background:linear-gradient(135deg,rgba(212,175,55,0.4),rgba(212,175,55,0.12));
                    border:1px solid rgba(212,175,55,0.7);
                    border-radius:8px; padding:5px 16px; margin:0 auto 6px;
                    font-size:12px; font-weight:900; color:#ffd700; letter-spacing:0.5px;
                    animation:newBestPop 0.6s cubic-bezier(.17,.67,.33,1.4) 0.4s both;
                    transform-origin:center; opacity:0;">
                    👑 KAMPANIYA TUGALLANDI!
                </div>` : ''}
                <div class="br-stars">${starsHtml}</div>

                <div class="br-stats-grid">
                    <div class="br-stat-card">
                        <div class="br-stat-label">🪙 Oltin</div>
                        <div class="br-stat-value gold" id="br-gold-val">${victory ? '+0' : '0'}</div>
                    </div>
                    <div class="br-stat-card">
                        <div class="br-stat-label">🍎 Oziq-ovqat</div>
                        <div class="br-stat-value food" id="br-food-val">${victory ? '+0' : '0'}</div>
                    </div>
                    <div class="br-stat-card">
                        <div class="br-stat-label">🏆 Kubok</div>
                        <div class="br-stat-value trophy" style="color:${trophies>=0?'#ffd700':'#ef9a9a'}">${trophySign}${trophies}</div>
                    </div>
                    <div class="br-stat-card">
                        <div class="br-stat-label">⚡ Tajriba</div>
                        <div class="br-stat-value xp">+${xp} XP</div>
                    </div>
                </div>

                <div class="br-dest-row">
                    <span style="font-size:11px;color:#888">Vayron</span>
                    <div class="br-dest-bar-bg">
                        <div class="br-dest-bar-fill" style="width:${percent}%"></div>
                    </div>
                    <span class="br-dest-pct">${percent}%</span>
                </div>

                ${ex.deployed !== undefined || durationStr || ex.winStreak > 0 ? `
                <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;">
                    ${ex.deployed !== undefined ? `<div class="br-extra-stat">⚔️ ${ex.deployed} askar</div>` : ''}
                    ${ex.destroyed !== undefined && ex.total !== undefined ? `<div class="br-extra-stat">🏚️ ${ex.destroyed}/${ex.total} bino</div>` : ''}
                    ${durationStr ? `<div class="br-extra-stat">⏱️ ${durationStr}</div>` : ''}
                    ${ex.winStreak >= 2 ? `<div class="br-extra-stat" style="background:rgba(255,87,34,0.2);border-color:rgba(255,87,34,0.4);color:#ff8a65;">🔥 ${ex.winStreak}x Seriya${ex.streakBonus ? ` +${ex.streakBonus}%` : ''}</div>` : ''}
                </div>` : ''}

                <div class="br-btns">
                    <button class="br-btn primary" onclick="DeployPanel._closeResult()">
                        🏠 Uyga Qaytish
                    </button>
                    ${ex.nextCampaignId ? `
                    <button class="br-btn secondary"
                            style="background:linear-gradient(135deg,rgba(212,175,55,0.25),rgba(212,175,55,0.08));
                                   border-color:rgba(212,175,55,0.5);color:#ffd700;font-weight:700;"
                            onclick="DeployPanel._closeResult();setTimeout(()=>{
                                const lvl=CAMPAIGN_LEVELS?.find(l=>l.id===${ex.nextCampaignId});
                                if(lvl)AttackScreen?.showCampaign(lvl);
                            },220)">
                        ⚔️ Keyingi Daraja →
                    </button>` : (victory ? `<button class="br-btn secondary" onclick="DeployPanel._closeResult();setTimeout(()=>BattlePanel?.open?.(),200)">⚔️ Keyingi Jang</button>` : '')}
                    ${(typeof BattleManager !== 'undefined' && BattleManager._replayEvents?.length > 0) ? `
                    <button class="br-btn secondary"
                            style="background:rgba(33,150,243,0.15);border-color:rgba(33,150,243,0.4);color:#90caf9;"
                            onclick="DeployPanel._showLocalReplay()">
                        ▶ Replay
                    </button>` : ''}
                </div>
                <!-- Retrain Last Army — CoC-style bir klik bilan qayta o'qitish -->
                <div style="text-align:center;margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
                    ${(typeof TroopManager !== 'undefined' && TroopManager._lastBattleArmy && Object.keys(TroopManager._lastBattleArmy).some(k => !k.startsWith('_') && TroopManager._lastBattleArmy[k] > 0)) ? `
                    <button onclick="DeployPanel._closeResult();setTimeout(()=>TroopManager.retrainLast(),200)"
                        style="background:linear-gradient(135deg,rgba(255,152,0,0.2),rgba(255,152,0,0.08));
                               border:1px solid rgba(255,152,0,0.4);
                               color:#ffb74d;padding:7px 16px;border-radius:10px;font-size:11px;
                               cursor:pointer;letter-spacing:0.3px;font-weight:700;">
                        ⚡ Avvalgi Armiyani Qayta O'qit
                    </button>` : ''}
                    <button onclick="DeployPanel._closeResult();setTimeout(()=>document.getElementById('btn-army')?.click(),300)"
                        style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
                               color:#777;padding:7px 14px;border-radius:10px;font-size:10px;
                               cursor:pointer;letter-spacing:0.3px;">
                        🪖 Armiya paneli
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('show');
        this._stopTimer();

        // Yulduz animatsiyasi — birin-ketin paydo bo'ladi (CoC uslubi)
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const el = document.getElementById(`br-star-${i}`);
                if (!el) return;
                if (i < stars) {
                    // Star pop
                    el.style.opacity = '1';
                    el.style.transform = 'scale(1.6)';
                    el.style.filter = 'drop-shadow(0 0 14px #ffd700) drop-shadow(0 0 28px #ff8800)';
                    setTimeout(() => { if (el) { el.style.transform = 'scale(1.0)'; el.style.transition += ',transform 0.3s cubic-bezier(.17,.67,.33,1.3)'; } }, 220);
                    // Screen flash per star
                    const flash = document.createElement('div');
                    flash.style.cssText = 'position:fixed;inset:0;background:rgba(255,215,0,0.12);z-index:99998;pointer-events:none;animation:achFlash 0.4s ease-out forwards;';
                    document.body.appendChild(flash);
                    setTimeout(() => flash.remove(), 450);
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick?.();
                } else {
                    el.style.opacity = '0.14';
                    el.style.filter = 'grayscale(1)';
                }
            }, 350 + i * 550);
        }

        // 3-star special confetti burst
        if (stars >= 3) {
            setTimeout(() => {
                this._burstResultConfetti();
            }, 350 + 3 * 550 + 200);
        }

        // Loot animated counter (delayed until stars done)
        const lootDelay = 350 + Math.min(stars, 3) * 550 + 100;
        if (victory && loot.gold > 0) {
            setTimeout(() => this._animateCounter('br-gold-val', 0, loot.gold, 1000, v => `+${Helpers.formatNumber(Math.round(v))}`), lootDelay);
        }
        if (victory && loot.food > 0) {
            setTimeout(() => this._animateCounter('br-food-val', 0, loot.food, 1000, v => `+${Helpers.formatNumber(Math.round(v))}`), lootDelay + 100);
        }

        // Season pass XP chip
        if (typeof SeasonPass !== 'undefined' && xp > 0) {
            const spXP = Math.ceil(xp * 0.5);
            setTimeout(() => {
                const box = document.querySelector('.battle-result-box');
                if (!box) return;
                const chip = document.createElement('div');
                chip.style.cssText = `text-align:center;font-size:10px;color:#ce93d8;
                    margin-top:6px;animation:xpGainFly 1.5s ease-out forwards;`;
                chip.textContent = `🏅 Season Pass +${spXP} XP`;
                box.appendChild(chip);
                setTimeout(() => chip.remove(), 1600);
            }, lootDelay + 400);
        }
    },

    // ── Kampaniya tugallandi ekrani ──────────────────────────────────────────
    _pendingCampaignComplete: false,

    _showCampaignComplete() {
        // Eski overlay yo'q qilish
        document.getElementById('campaign-complete-overlay')?.remove();

        const totalStars = (typeof CampaignProgress !== 'undefined') ? CampaignProgress.getTotalStars() : 0;
        const maxStars   = (typeof CAMPAIGN_LEVELS !== 'undefined') ? CAMPAIGN_LEVELS.length * 3 : 45;
        const pct        = Math.round(totalStars / maxStars * 100);

        const overlay = document.createElement('div');
        overlay.id = 'campaign-complete-overlay';
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:9600;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.9);
            backdrop-filter:blur(8px);
            animation:preAttackIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
        `;
        overlay.innerHTML = `
        <div style="
            width:min(360px,94vw);
            background:linear-gradient(160deg,#1a1200,#0d1a2a,#150a00);
            border:2px solid rgba(212,175,55,0.55);
            border-radius:24px;overflow:hidden;
            box-shadow:0 0 80px rgba(212,175,55,0.18),0 24px 70px rgba(0,0,0,0.85);
        ">
            <!-- Oltin glow chizig'i -->
            <div style="height:3px;background:linear-gradient(90deg,transparent,#d4af37,#ffd700,#d4af37,transparent);
                        animation:bossGlow 2s ease-in-out infinite alternate;"></div>

            <!-- Sarlavha -->
            <div style="text-align:center;padding:30px 24px 18px;">
                <div style="font-size:54px;line-height:1;margin-bottom:10px;
                            animation:newBestPop 0.7s cubic-bezier(.17,.67,.33,1.4) 0.15s both;">👑</div>
                <div style="font-size:22px;font-weight:900;color:#ffd700;
                            font-family:'Cinzel',serif;letter-spacing:2px;
                            text-shadow:0 0 24px rgba(212,175,55,0.7);
                            animation:newBestPop 0.6s cubic-bezier(.17,.67,.33,1.4) 0.3s both;">
                    KAMPANIYA
                </div>
                <div style="font-size:13px;font-weight:700;color:#ffecb3;margin-top:6px;
                            letter-spacing:1px;animation:newBestPop 0.5s ease 0.5s both;">
                    MUVAFFAQIYATLI YAKUNLANDI!
                </div>
            </div>

            <!-- Yulduz jamlash -->
            <div style="text-align:center;padding:4px 24px 16px;">
                <div style="font-size:11px;color:#888;margin-bottom:6px;">JAMI YULDUZLAR</div>
                <div style="font-size:28px;letter-spacing:2px;color:#ffd700;
                            text-shadow:0 0 12px rgba(255,215,0,0.6);">
                    ${totalStars} <span style="font-size:16px;color:#888;">/ ${maxStars}</span>
                </div>
                <div style="margin-top:10px;background:rgba(255,255,255,0.06);
                            border-radius:6px;overflow:hidden;height:6px;">
                    <div style="height:100%;width:${pct}%;
                                background:linear-gradient(90deg,#d4af37,#ffd700);
                                border-radius:6px;transition:width 1.2s ease;"></div>
                </div>
            </div>

            <!-- Mukofot -->
            <div style="margin:4px 20px 16px;padding:14px 20px;
                        background:rgba(212,175,55,0.08);
                        border:1px solid rgba(212,175,55,0.25);
                        border-radius:14px;text-align:center;">
                <div style="font-size:10px;color:#888;text-transform:uppercase;
                            letter-spacing:1px;margin-bottom:10px;">🎁 Mukofot</div>
                <div style="display:flex;justify-content:center;gap:20px;">
                    <div>
                        <div style="font-size:24px;">💎</div>
                        <div style="font-size:13px;font-weight:800;color:#b39ddb;margin-top:2px;">+100</div>
                        <div style="font-size:9px;color:#666;">OLMOS</div>
                    </div>
                    <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
                    <div>
                        <div style="font-size:24px;">🏅</div>
                        <div style="font-size:13px;font-weight:800;color:#ce93d8;margin-top:2px;">+500</div>
                        <div style="font-size:9px;color:#666;">XP</div>
                    </div>
                    <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
                    <div>
                        <div style="font-size:24px;">🏆</div>
                        <div style="font-size:13px;font-weight:800;color:#ffd700;margin-top:2px;">+250</div>
                        <div style="font-size:9px;color:#666;">KUBOK</div>
                    </div>
                </div>
            </div>

            <!-- Tugma -->
            <div style="padding:0 20px 22px;">
                <button id="cc-close-btn"
                    style="width:100%;padding:13px;
                           background:linear-gradient(to bottom,#d4af37,#b8860b);
                           border:none;border-radius:12px;
                           font-size:14px;font-weight:900;color:#000;
                           cursor:pointer;font-family:'Cinzel',serif;
                           box-shadow:0 4px 18px rgba(212,175,55,0.45);">
                    🏠 Uyga Qaytish
                </button>
            </div>
        </div>`;

        document.body.appendChild(overlay);

        // Tugma handler
        overlay.querySelector('#cc-close-btn').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        // Double confetti burst
        setTimeout(() => this._burstResultConfetti(), 300);
        setTimeout(() => this._burstResultConfetti(), 700);
        setTimeout(() => this._burstResultConfetti(), 1200);

        // Mukofot qo'shish (agar tizimlar mavjud bo'lsa)
        if (typeof Resources !== 'undefined') {
            Resources.add('diamond', 100);
        }
        // Kuboklar
        if (typeof BattleSystem !== 'undefined') {
            BattleSystem.trophies = (BattleSystem.trophies || 0) + 250;
            if (typeof Resources !== 'undefined') Resources.updateDisplay();
        }
    },

    _burstResultConfetti() {
        const colors = ['#ffd700','#ff9800','#4caf50','#2196f3','#e040fb','#f44336'];
        for (let i = 0; i < 40; i++) {
            const el = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 6 + Math.random() * 8;
            el.style.cssText = `
                position:fixed;
                left:${30 + Math.random() * 40}%;
                top:${20 + Math.random() * 30}%;
                width:${size}px;height:${size}px;
                background:${color};border-radius:${Math.random()>0.5?'50%':'2px'};
                pointer-events:none;z-index:99998;
                animation:confettiFall ${1.2 + Math.random() * 1.5}s ${Math.random() * 0.4}s ease-in forwards;
            `;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2500);
        }
    },

    _animateCounter(id, from, to, duration, fmt) {
        const el = document.getElementById(id);
        if (!el) return;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
            el.textContent = fmt(from + (to - from) * ease);
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    },

    _closeResult() {
        const modal = document.getElementById('battle-result-modal');
        if (modal) {
            modal.classList.remove('show');
            // Modal CSS animatsiyasi tugagandan so'ng DOM dan o'chirish
            setTimeout(() => {
                if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
            }, 350);
        }
        // Cinematik overlay ham tozalash
        const cinematic = document.getElementById('br-cinematic-overlay');
        if (cinematic) cinematic.remove();
        BattleManager.returnHome();
        // Kampaniya tugallangani ekranini uyga qaytgandan keyin ko'rsatish
        if (this._pendingCampaignComplete) {
            this._pendingCampaignComplete = false;
            setTimeout(() => this._showCampaignComplete(), 500);
        }
    },

    // ── Local replay — joriy jangning _replayEvents ni ko'rsatish ────────
    _showLocalReplay() {
        if (typeof BattleLogPanel === 'undefined') return;
        const events = BattleManager._replayEvents || [];
        if (events.length === 0) {
            Toast.show('Bu jang uchun replay mavjud emas', 'info');
            return;
        }
        // BattleLogPanel replay modalni ko'rsatish (events format: { t, troopType, x, y })
        // BattleLogPanel ichida format: { t, type, x, y } — troopType → type o'tkazamiz
        const converted = events.map(e => ({ t: e.t, type: e.troopType, x: e.x, y: e.y }));
        BattleLogPanel._renderReplayModal(converted, 'local');
    }
};
