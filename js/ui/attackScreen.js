// ============================================
// ATTACK SCREEN — Hujum oynasi
// CoC/TC uslubida to'liq alohida oyna:
//   1) Pre-attack: dushman baza ko'rinishi + "Hujum!" tugmasi
//   2) Attack HUD: loot, vaqt, yulduzlar, askarlar paneli
// ============================================

const AttackScreen = {
    _currentLevel: null,    // campaign level object
    _currentOpp: null,      // multiplayer opponent object
    _mode: null,            // 'campaign' | 'multiplayer'

    // ── 1. Kampaniya hujumi ───────────────────────────────────────────────────
    showCampaign(campaignLevel) {
        this._currentLevel = campaignLevel;
        this._currentOpp   = null;
        this._mode         = 'campaign';
        this._showPreAttack({
            title:        campaignLevel.name,
            subtitle:     `${campaignLevel.regionIcon} ${campaignLevel.region} • TH ${campaignLevel.thLevel}`,
            description:  campaignLevel.description,
            thLevel:      campaignLevel.thLevel,
            goldLoot:     Math.round((campaignLevel.loot.gold[0] + campaignLevel.loot.gold[1]) / 2),
            foodLoot:     Math.round((campaignLevel.loot.food[0] + campaignLevel.loot.food[1]) / 2),
            xpReward:     campaignLevel.xpReward,
            trophyReward: campaignLevel.trophyReward,
            difficulty:   campaignLevel.difficulty,
            stars:        CampaignProgress.getCompleted(campaignLevel.id)?.stars || 0,
            isBoss:       campaignLevel.isBoss,
            buildings:    campaignLevel.buildings,   // Mini base preview uchun
        });
    },

    // ── 2. Multiplayer hujumi ─────────────────────────────────────────────────
    showMultiplayer(opponent) {
        this._currentLevel = null;
        this._currentOpp   = opponent;
        this._mode         = 'multiplayer';
        this._showPreAttack({
            title:        opponent.name,
            subtitle:     `🌍 Online Raqib • TH ${opponent.thLevel || '?'}`,
            description:  `${opponent.icon || '⚔️'} ${opponent.archetype || ''} — ${opponent.trophies || 0} 🏆`,
            thLevel:      opponent.thLevel || 1,
            goldLoot:     opponent.goldLoot  || 0,
            foodLoot:     opponent.foodLoot  || 0,
            xpReward:     35,
            trophyReward: 20,
            difficulty:   Math.min(10, Math.ceil((opponent.thLevel || 1) * 0.8)),
            stars:        0,
            isBoss:       false,
        });
    },

    // ── Pre-Attack Overlay ────────────────────────────────────────────────────
    _showPreAttack(info) {
        // Eski overlay yo'q qilish
        const old = document.getElementById('pre-attack-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'pre-attack-overlay';

        const diffColor = ['','#4caf50','#4caf50','#8bc34a','#ff9800','#ff9800',
                           '#ff5722','#ff5722','#f44336','#9c27b0','#d4af37'][Math.min(info.difficulty, 10)] || '#888';
        const diffStars = '⭐'.repeat(Math.min(Math.ceil(info.difficulty / 2), 5));

        // Askar kuchi (askarlar + aktiv qahramonlar)
        let armyPower = 0;
        if (typeof TroopManager !== 'undefined') armyPower = TroopManager.getTotal();
        let activeHeroCount = 0;
        if (typeof HeroSystem !== 'undefined') {
            activeHeroCount = HeroSystem.getActiveHeroes().filter(h => !HeroSystem.commanders[h]?.sleeping).length;
        }
        const canAttack = armyPower > 0 || activeHeroCount > 0;

        overlay.style.cssText = `
            position:fixed; inset:0; z-index:7500;
            display:flex; align-items:center; justify-content:center;
            background:rgba(0,0,0,0.82);
            backdrop-filter:blur(4px);
            animation:preAttackIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
        `;

        overlay.innerHTML = `
        <div style="
            width:min(380px,94vw);
            background:linear-gradient(160deg,#0e1a0a,#0a1628,#120020);
            border:1px solid rgba(255,215,0,0.2);
            border-radius:20px;
            padding:0;
            overflow:hidden;
            box-shadow:0 20px 60px rgba(0,0,0,0.7),0 0 40px rgba(212,175,55,0.08);
        ">
            <!-- Sarlavha -->
            <div style="
                background:linear-gradient(135deg,rgba(212,175,55,0.15),rgba(184,134,11,0.08));
                border-bottom:1px solid rgba(255,215,0,0.15);
                padding:18px 20px 14px;
                text-align:center;
                position:relative;
            ">
                ${info.isBoss ? `<div style="position:absolute;top:-1px;left:0;right:0;height:3px;
                    background:linear-gradient(90deg,transparent,#d4af37,#ff4400,#d4af37,transparent);
                    animation:bossGlow 2s ease-in-out infinite alternate;"></div>` : ''}

                <div style="font-size:${info.isBoss ? 22 : 18}px;font-weight:900;
                            color:${info.isBoss ? '#ffd700' : '#fff'};
                            font-family:'Cinzel',serif;margin-bottom:4px;
                            text-shadow:${info.isBoss ? '0 0 20px rgba(212,175,55,0.6)' : 'none'};">
                    ${info.isBoss ? '👑 ' : '⚔️ '}${info.title}
                </div>
                <div style="font-size:11px;color:#888;">${info.subtitle}</div>
                <div style="font-size:10px;color:#666;margin-top:3px;">${info.description}</div>

                <!-- Qiyinlik -->
                <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;">
                    <span style="font-size:10px;color:${diffColor};font-weight:700;">Qiyinlik:</span>
                    <span style="font-size:12px;">${diffStars}</span>
                    <span style="font-size:10px;color:${diffColor};">${info.difficulty}/10</span>
                </div>

                ${info.stars > 0 ? `
                <div style="margin-top:6px;display:flex;justify-content:center;gap:3px;">
                    ${[1,2,3].map(i => `<span style="font-size:16px;color:${i<=info.stars?'#ffd700':'rgba(255,255,255,0.15)'};
                        text-shadow:${i<=info.stars?'0 0 8px #ffd700':'none'};">★</span>`).join('')}
                </div>` : ''}
            </div>

            <!-- Mukofotlar -->
            <div style="display:flex;padding:14px 20px;gap:8px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="flex:1;text-align:center;background:rgba(255,193,7,0.08);
                            border:1px solid rgba(255,193,7,0.2);border-radius:10px;padding:8px 4px;">
                    <div style="font-size:16px;">🪙</div>
                    <div style="font-size:11px;font-weight:700;color:#ffc107;">${Helpers.formatNumber(info.goldLoot)}</div>
                    <div style="font-size:8px;color:#888;">OLTIN</div>
                </div>
                <div style="flex:1;text-align:center;background:rgba(76,175,80,0.08);
                            border:1px solid rgba(76,175,80,0.2);border-radius:10px;padding:8px 4px;">
                    <div style="font-size:16px;">🍎</div>
                    <div style="font-size:11px;font-weight:700;color:#4caf50;">${Helpers.formatNumber(info.foodLoot)}</div>
                    <div style="font-size:8px;color:#888;">OZIQ</div>
                </div>
                <div style="flex:1;text-align:center;background:rgba(206,147,216,0.08);
                            border:1px solid rgba(206,147,216,0.2);border-radius:10px;padding:8px 4px;">
                    <div style="font-size:16px;">⭐</div>
                    <div style="font-size:11px;font-weight:700;color:#ce93d8;">+${info.xpReward}</div>
                    <div style="font-size:8px;color:#888;">XP</div>
                </div>
                <div style="flex:1;text-align:center;background:rgba(255,215,0,0.08);
                            border:1px solid rgba(255,215,0,0.2);border-radius:10px;padding:8px 4px;">
                    <div style="font-size:16px;">🏆</div>
                    <div style="font-size:11px;font-weight:700;color:#ffd700;">+${info.trophyReward}</div>
                    <div style="font-size:8px;color:#888;">KUBOK</div>
                </div>
            </div>

            <!-- Mini baza ko'rinishi (faqat campaign uchun) -->
            ${info.buildings ? `
            <div style="padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:9px;color:#666;text-align:center;margin-bottom:5px;
                            text-transform:uppercase;letter-spacing:1px;">🗺️ Baza xaritasi</div>
                <canvas id="pre-atk-base-canvas"
                        width="320" height="120"
                        style="width:100%;height:auto;border-radius:8px;
                               background:#060e1a;display:block;
                               border:1px solid rgba(255,255,255,0.06);"></canvas>
            </div>` : ''}

            <!-- Askar kuchi -->
            <div style="padding:10px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span style="font-size:10px;color:#888;">⚔️ Sizning kuchingiz</span>
                    <span id="pre-atk-army" style="font-size:11px;color:#90caf9;font-weight:700;">${armyPower}/${typeof TroopManager !== 'undefined' ? TroopManager.maxTroops : '?'}${activeHeroCount > 0 ? ` + ${activeHeroCount} qahramon` : ''}</span>
                </div>
                <div id="pre-atk-troop-list" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;">
                    ${this._buildTroopPreview()}
                </div>
                ${!canAttack ? `
                <div style="text-align:center;color:#f44336;font-size:10px;margin-top:4px;">
                    ⚠️ Askaringiz yo'q! Avval qo'shin tayyorlang.
                </div>` : ''}
            </div>

            <!-- Tugmalar -->
            <div style="padding:14px 20px;display:flex;gap:10px;">
                <button onclick="AttackScreen._cancel()"
                    style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
                           color:#aaa;padding:11px;border-radius:10px;font-size:13px;
                           cursor:pointer;font-family:'Cinzel',serif;">
                    ← Orqaga
                </button>
                <button onclick="AttackScreen._startBattle()"
                    id="pre-atk-start-btn"
                    style="flex:2;background:${canAttack ? 'linear-gradient(to bottom,#d4af37,#b8860b)' : 'rgba(255,255,255,0.06)'};
                           border:none;color:${canAttack ? '#000' : '#555'};
                           padding:11px;border-radius:10px;font-size:14px;font-weight:900;
                           cursor:${canAttack ? 'pointer' : 'not-allowed'};
                           font-family:'Cinzel',serif;
                           box-shadow:${canAttack ? '0 3px 12px rgba(212,175,55,0.3)' : 'none'};">
                    ⚔️ HUJUM!
                </button>
            </div>
        </div>`;

        document.body.appendChild(overlay);

        // Mini baza canvas render
        if (info.buildings) {
            requestAnimationFrame(() => this._renderMiniBase(info.buildings));
        }

        // Tashqariga bosish — yopish
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this._cancel();
        });
    },

    // ── Mini baza preview — campaign binolarini kichik canvas da ko'rsatish ──
    _renderMiniBase(buildings) {
        const canvas = document.getElementById('pre-atk-base-canvas');
        if (!canvas || !buildings) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        // Fon
        ctx.fillStyle = '#060e1a';
        ctx.fillRect(0, 0, W, H);

        // Grid pattern — subtle
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        const gs = 8;
        for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
        for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

        // Building type raqamlash
        const COLORS = {
            cityHall:      { fill:'#ffd700', stroke:'#ff8f00', size:4 },
            wall:          { fill:'#607d8b', stroke:'#546e7a', size:2 },
            gate:          { fill:'#78909c', stroke:'#546e7a', size:2 },
            archerTower:   { fill:'#ef5350', stroke:'#c62828', size:3 },
            tormenta:      { fill:'#e64a19', stroke:'#bf360c', size:3 },
            scorpio:       { fill:'#e53935', stroke:'#b71c1c', size:3 },
            magicTower:    { fill:'#ab47bc', stroke:'#7b1fa2', size:3 },
            boltTower:     { fill:'#d32f2f', stroke:'#b71c1c', size:3 },
            flamingCitadel:{ fill:'#ff7043', stroke:'#d84315', size:4 },
            scorpio:       { fill:'#f44336', stroke:'#c62828', size:3 },
            tormenta:      { fill:'#ec407a', stroke:'#ad1457', size:3 },
            infernoColumn: { fill:'#ff1744', stroke:'#d50000', size:4 },
            villa:         { fill:'#66bb6a', stroke:'#388e3c', size:2 },
            farm:          { fill:'#81c784', stroke:'#388e3c', size:2 },
            goldStorage:   { fill:'#ffa726', stroke:'#e65100', size:2 },
            foodStorage:   { fill:'#a5d6a7', stroke:'#2e7d32', size:2 },
            treeOfLife:    { fill:'#a5d6a7', stroke:'#1b5e20', size:2 },
        };

        // Barcha binolar bounding box — markazlash uchun
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const b of buildings) {
            minX = Math.min(minX, b.dx); maxX = Math.max(maxX, b.dx);
            minY = Math.min(minY, b.dy); maxY = Math.max(maxY, b.dy);
        }
        const rangeX = Math.max(1, maxX - minX + 4);
        const rangeY = Math.max(1, maxY - minY + 4);
        const scale  = Math.min((W - 20) / rangeX, (H - 12) / rangeY);
        const offX   = W/2 - ((minX + maxX) / 2) * scale;
        const offY   = H/2 - ((minY + maxY) / 2) * scale;

        // Devorlarni avval chizish (pastki qavat)
        for (const b of buildings) {
            if (b.type !== 'wall' && b.type !== 'gate') continue;
            const c = COLORS[b.type] || COLORS.wall;
            const px = offX + b.dx * scale;
            const py = offY + b.dy * scale;
            const sz = Math.max(1.5, c.size * scale * 0.3);
            ctx.fillStyle = c.fill;
            ctx.fillRect(px - sz/2, py - sz/2, sz, sz);
        }

        // Boshqa binolarni chizish
        for (const b of buildings) {
            if (b.type === 'wall' || b.type === 'gate') continue;
            const c   = COLORS[b.type] || { fill:'#78909c', stroke:'#546e7a', size:2 };
            const px  = offX + b.dx * scale;
            const py  = offY + b.dy * scale;
            const sz  = Math.max(2, c.size * scale * 0.32);
            const r   = Math.max(1, sz * 0.35);

            // Shadow
            ctx.save();
            ctx.shadowColor = c.fill + '88';
            ctx.shadowBlur  = sz * 0.8;

            ctx.fillStyle = c.stroke;
            ctx.beginPath();
            ctx.roundRect?.(px - sz/2 - 0.5, py - sz/2 - 0.5, sz + 1, sz + 1, r) ||
                ctx.rect(px - sz/2, py - sz/2, sz, sz);
            ctx.fill();

            ctx.fillStyle = c.fill;
            ctx.beginPath();
            ctx.roundRect?.(px - sz/2, py - sz/2, sz, sz, r) ||
                ctx.rect(px - sz/2, py - sz/2, sz, sz);
            ctx.fill();

            ctx.restore();
        }

        // Markaziy nuqta ko'rsatgichi (koʻzni tortish uchun)
        ctx.strokeStyle = 'rgba(212,175,55,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
        ctx.setLineDash([]);
    },

    _buildTroopPreview() {
        const troopDb = typeof TROOP_DATA !== 'undefined' ? TROOP_DATA : {};
        let html = '';

        // Oddiy askarlar
        if (typeof TroopManager !== 'undefined') {
            const army = TroopManager.army || {};
            for (const [type, count] of Object.entries(army)) {
                if (!count || count <= 0) continue;
                const td = troopDb[type];
                const icon = td?.icon || '⚔️';
                html += `<span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);
                                      border-radius:6px;padding:3px 6px;font-size:10px;color:#ddd;">
                            ${icon} ${count}
                         </span>`;
            }
        }

        // Aktiv qahramonlar
        if (typeof HeroSystem !== 'undefined') {
            const activeHeroes = HeroSystem.getActiveHeroes();
            for (const heroKey of activeHeroes) {
                const hero = HeroSystem.commanders[heroKey];
                if (!hero) continue;
                const td   = troopDb[heroKey];
                const icon = td?.icon || '👑';
                const name = td?.name?.split(' ')[0] || heroKey;
                const isSleeping = hero.sleeping;
                html += `<span style="background:${isSleeping ? 'rgba(100,100,100,0.15)' : 'rgba(212,175,55,0.15)'};
                                      border:1px solid ${isSleeping ? 'rgba(100,100,100,0.3)' : 'rgba(212,175,55,0.4)'};
                                      border-radius:6px;padding:3px 6px;font-size:10px;
                                      color:${isSleeping ? '#666' : '#ffd700'};">
                            ${icon} ${name}${isSleeping ? ' 💤' : ''}
                         </span>`;
            }
        }

        return html || '<span style="font-size:10px;color:#555;">Askar yo\'q</span>';
    },

    _cancel() {
        const overlay = document.getElementById('pre-attack-overlay');
        if (overlay) {
            overlay.style.animation = 'preAttackOut 0.2s ease-in forwards';
            setTimeout(() => overlay.remove(), 220);
        }
        this._currentLevel = null;
        this._currentOpp   = null;
        this._mode         = null;
    },

    _startBattle() {
        // Jangda oddiy askarlar YOKI aktiv qahramonlar bo'lishi kerak
        const hasTroops = typeof TroopManager !== 'undefined' && TroopManager.getTotal() > 0;
        const hasHeroes = typeof HeroSystem !== 'undefined'
            && HeroSystem.getActiveHeroes().some(h => !HeroSystem.commanders[h]?.sleeping);
        if (!hasTroops && !hasHeroes) {
            Toast.show('⚔️ Askar yoki qahramon kerak!', 'error');
            return;
        }

        // Overlay yopish
        const overlay = document.getElementById('pre-attack-overlay');
        if (overlay) {
            overlay.style.animation = 'preAttackOut 0.2s ease-in forwards';
            setTimeout(() => overlay.remove(), 220);
        }

        // Hujumni boshlash (rejimga qarab)
        if (this._mode === 'campaign' && this._currentLevel) {
            BattleManager.startCampaignBattle(this._currentLevel);
        } else if (this._mode === 'npc' && this._npcBaseId) {
            BattleManager.startLiveBattle(this._npcBaseId);
            this._npcBaseId = null;
        } else if (this._mode === 'multiplayer' && this._currentOpp) {
            BattleManager.startOnlineLiveBattle(this._currentOpp);
        }
    },

    // ── Attack Mode HUD ───────────────────────────────────────────────────────
    // Jang boshlanganida chaqiriladi
    showAttackHUD() {
        this.hideAttackHUD(); // eski HUD tozalash

        const hud = document.createElement('div');
        hud.id = 'attack-hud';
        hud.style.cssText = `
            position:fixed; top:0; left:0; right:0; z-index:2500;
            display:flex; align-items:stretch; gap:0;
            background:linear-gradient(to bottom,rgba(0,0,0,0.85),rgba(0,0,0,0.6),transparent);
            pointer-events:none;
            padding:6px 10px 18px;
        `;

        hud.innerHTML = `
        <!-- Loot bo'limi -->
        <div style="display:flex;gap:6px;flex:1;pointer-events:none;">
            <!-- Oltin -->
            <div style="display:flex;align-items:center;gap:4px;
                        background:rgba(255,193,7,0.12);border:1px solid rgba(255,193,7,0.25);
                        border-radius:10px;padding:4px 8px;min-width:0;">
                <span style="font-size:13px;">🪙</span>
                <div>
                    <div style="display:flex;align-items:baseline;gap:2px;">
                        <div id="ahud-gold" style="font-size:11px;font-weight:700;color:#ffc107;">0</div>
                        <div id="ahud-gold-max" style="font-size:8px;color:#666;white-space:nowrap;"></div>
                    </div>
                    <div style="font-size:8px;color:#888;">OLTIN</div>
                </div>
            </div>
            <!-- Oziq -->
            <div style="display:flex;align-items:center;gap:4px;
                        background:rgba(76,175,80,0.12);border:1px solid rgba(76,175,80,0.25);
                        border-radius:10px;padding:4px 8px;min-width:0;">
                <span style="font-size:13px;">🍎</span>
                <div>
                    <div style="display:flex;align-items:baseline;gap:2px;">
                        <div id="ahud-food" style="font-size:11px;font-weight:700;color:#4caf50;">0</div>
                        <div id="ahud-food-max" style="font-size:8px;color:#666;white-space:nowrap;"></div>
                    </div>
                    <div style="font-size:8px;color:#888;">OZIQ</div>
                </div>
            </div>
        </div>

        <!-- Markaziy: Yulduzlar + Vaqt -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;
                    flex-shrink:0;padding:0 12px;pointer-events:none;">
            <div id="ahud-stars" style="display:flex;gap:3px;">
                <span class="ahud-star" data-star="1" style="font-size:22px;color:rgba(255,255,255,0.15);">★</span>
                <span class="ahud-star" data-star="2" style="font-size:22px;color:rgba(255,255,255,0.15);">★</span>
                <span class="ahud-star" data-star="3" style="font-size:22px;color:rgba(255,255,255,0.15);">★</span>
            </div>
            <div id="ahud-timer"
                 style="font-size:16px;font-weight:900;color:#fff;font-family:'Cinzel',serif;
                        text-shadow:0 0 8px rgba(255,255,255,0.4);">3:00</div>
        </div>

        <!-- O'ng: Destroy % + End Battle -->
        <div style="display:flex;gap:6px;flex:1;justify-content:flex-end;align-items:center;pointer-events:all;">
            <div style="text-align:right;">
                <div id="ahud-destroy" style="font-size:11px;font-weight:700;color:#ff8a65;">0%</div>
                <div style="font-size:8px;color:#888;">VAYRON</div>
                <div id="ahud-building-count" style="font-size:9px;color:#666;">0/0</div>
            </div>
            <button onclick="AttackScreen.endBattle()"
                style="background:linear-gradient(to bottom,#c62828,#8b0000);
                       border:1px solid rgba(255,100,100,0.3);
                       color:#fff;padding:7px 12px;border-radius:10px;
                       font-size:11px;font-weight:700;cursor:pointer;
                       font-family:'Cinzel',serif;
                       box-shadow:0 2px 8px rgba(198,40,40,0.4);">
                🏳️ Tugatish
            </button>
        </div>`;

        document.body.appendChild(hud);

        // Vaqtni hisoblash
        this._hudInterval = setInterval(() => this._updateHUD(), 500);
    },

    hideAttackHUD() {
        const hud = document.getElementById('attack-hud');
        if (hud) hud.remove();
        if (this._hudInterval) {
            clearInterval(this._hudInterval);
            this._hudInterval = null;
        }
    },

    _updateHUD() {
        if (!BattleManager.active) return;

        const goldEl  = document.getElementById('ahud-gold');
        const foodEl  = document.getElementById('ahud-food');
        const timerEl = document.getElementById('ahud-timer');
        const destEl  = document.getElementById('ahud-destroy');
        const cntEl   = document.getElementById('ahud-building-count');

        if (goldEl)  goldEl.textContent  = Helpers.formatNumber(BattleManager.lootGained?.gold || 0);
        if (foodEl)  foodEl.textContent  = Helpers.formatNumber(BattleManager.lootGained?.food || 0);

        // Available loot max ko'rsatish
        const gMax = document.getElementById('ahud-gold-max');
        const fMax = document.getElementById('ahud-food-max');
        if (gMax) {
            const av = BattleManager.lootAvailable?.gold || 0;
            gMax.textContent = av > 0 ? `/ ${Helpers.formatNumber(av)}` : '';
        }
        if (fMax) {
            const av = BattleManager.lootAvailable?.food || 0;
            fMax.textContent = av > 0 ? `/ ${Helpers.formatNumber(av)}` : '';
        }

        // Vaqt
        if (timerEl) {
            const elapsed = Date.now() - BattleManager.startTime;
            const remaining = Math.max(0, BattleManager.timeLimit - elapsed);
            const secs = Math.ceil(remaining / 1000);
            const mm   = Math.floor(secs / 60);
            const ss   = secs % 60;
            timerEl.textContent = `${mm}:${ss.toString().padStart(2,'0')}`;
            // Qizil — 30 soniyadan kam
            timerEl.style.color = secs <= 30 ? '#f44336' : secs <= 60 ? '#ff9800' : '#fff';
        }

        // Vayron foizi
        const destroyed = BattleManager.destroyedCount || 0;
        const total     = BattleManager.totalBuildings  || 1;
        const pct       = Math.round(destroyed / total * 100);
        if (destEl)  destEl.textContent  = pct + '%';
        if (cntEl)   cntEl.textContent   = `${destroyed}/${total}`;

        // Yulduzlar (50% = 1y, 100% = 2y + TH = 3y)
        this._updateStars(pct, BattleManager.cityHallDestroyed);
    },

    _updateStars(destroyPct, cityHallDestroyed) {
        const starsDiv = document.getElementById('ahud-stars');
        if (!starsDiv) return;

        const earned = destroyPct >= 100 ? 3
                     : cityHallDestroyed ? 2
                     : destroyPct >= 50  ? 1
                     : 0;

        for (let i = 1; i <= 3; i++) {
            const star = starsDiv.querySelector(`[data-star="${i}"]`);
            if (!star) continue;
            const lit = i <= earned;
            star.style.color         = lit ? '#ffd700' : 'rgba(255,255,255,0.15)';
            star.style.textShadow    = lit ? '0 0 10px #ffd700,0 0 20px rgba(255,215,0,0.5)' : 'none';
            star.style.transform     = lit ? 'scale(1.15)' : 'scale(1)';
            star.style.transition    = 'all 0.3s ease';
        }
    },

    // Jangni tugatish tugmasi
    endBattle() {
        if (!BattleManager.active) return;
        // Ikki marta bosilganda ikkinchi modal ochilmasin
        if (document.getElementById('end-battle-confirm')) return;

        // Confirm modal
        const modal = document.createElement('div');
        modal.id = 'end-battle-confirm';
        modal.style.cssText = `
            position:fixed;inset:0;z-index:9900;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.7);
        `;
        modal.innerHTML = `
        <div style="background:linear-gradient(135deg,#1a0a0a,#2a1010);
                    border:1px solid rgba(255,100,100,0.3);border-radius:16px;
                    padding:24px 28px;text-align:center;width:min(280px,90vw);">
            <div style="font-size:28px;margin-bottom:8px;">🏳️</div>
            <div style="font-size:15px;font-weight:800;color:#f44336;font-family:'Cinzel',serif;margin-bottom:6px;">
                Jangni tugatish?
            </div>
            <div style="font-size:11px;color:#888;margin-bottom:16px;">
                Hozirgi natija saqlanadi. Askar yo'qotiladi.
            </div>
            <div style="display:flex;gap:10px;">
                <button onclick="this.closest('div[style]').parentElement.remove()"
                    style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                           color:#aaa;padding:10px;border-radius:8px;cursor:pointer;font-size:13px;">
                    Davom et
                </button>
                <button onclick="AttackScreen._confirmEnd(); this.closest('div[style]').parentElement.remove()"
                    style="flex:1;background:linear-gradient(to bottom,#c62828,#8b0000);border:none;
                           color:#fff;padding:10px;border-radius:8px;cursor:pointer;
                           font-size:13px;font-weight:700;">
                    Tugatish
                </button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    },

    _confirmEnd() {
        BattleManager.endBattle?.();
    },

    // Jang tugaganda chaqiriladi (battleManager dan)
    onBattleEnd(result) {
        this.hideAttackHUD();

        // Campaign progress saqlash
        if (this._mode === 'campaign' && this._currentLevel) {
            CampaignProgress.setCompleted(
                this._currentLevel.id,
                result.stars || 0,
                result.duration || 0
            );
        }

        this._currentLevel = null;
        this._currentOpp   = null;
        this._mode         = null;
    },
};

// CSS animatsiyalari
(function() {
    if (document.getElementById('attack-screen-css')) return;
    const style = document.createElement('style');
    style.id = 'attack-screen-css';
    style.textContent = `
        @keyframes preAttackIn {
            from { opacity:0; transform:scale(0.88) translateY(20px); }
            to   { opacity:1; transform:scale(1)    translateY(0); }
        }
        @keyframes preAttackOut {
            from { opacity:1; transform:scale(1); }
            to   { opacity:0; transform:scale(0.92); }
        }
        @keyframes bossGlow {
            from { opacity:0.5; }
            to   { opacity:1; }
        }
        #attack-hud { animation: attackHudIn 0.3s ease-out forwards; }
        @keyframes attackHudIn {
            from { opacity:0; transform:translateY(-10px); }
            to   { opacity:1; transform:translateY(0); }
        }
    `;
    document.head.appendChild(style);
})();
