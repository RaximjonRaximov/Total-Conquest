// ============================================
// DO'KON (Shop) — CoC-style tabbed shop
// ============================================

const ShopPanel = {
    visible: false,
    _tab: 'gems',   // 'gems' | 'resources' | 'boosts'
    _timerRaf: null,

    packages: [
        { id: 'starter',  name: 'Boshlang\'ich',  icon: '💎',    diamonds: 50,   bonus: 0,    price: '$0.99',  color: '#4fc3f7', value: 1.00 },
        { id: 'small',    name: 'Kichik Xazina',  icon: '💎',    diamonds: 200,  bonus: 20,   price: '$4.99',  color: '#42a5f5', value: 1.10 },
        { id: 'medium',   name: "O'rta Xazina",   icon: '💎💎',   diamonds: 500,  bonus: 75,   price: '$9.99',  color: '#7e57c2', value: 1.15 },
        { id: 'large',    name: 'Katta Xazina',   icon: '💎💎💎',  diamonds: 1200, bonus: 300,  price: '$19.99', color: '#ab47bc', popular: true, value: 1.25 },
        { id: 'mega',     name: 'MEGA Xazina',    icon: '👑💎',   diamonds: 3000, bonus: 1000, price: '$49.99', color: '#ffa726', value: 1.33 },
        { id: 'ultimate', name: 'IMPERATOR',      icon: '👑👑',   diamonds: 8000, bonus: 4000, price: '$99.99', color: '#ef5350', value: 1.50, best: true },
    ],

    resourcePacks: [
        { id: 'gold_s',   name: 'Oltin Qoplami',    icon: '🪙',  type: 'gold',  amount: 50000,  cost: 50,   color: '#ffd700' },
        { id: 'gold_m',   name: 'Oltin Qo\'rgoni',  icon: '🪙',  type: 'gold',  amount: 150000, cost: 120,  color: '#ffd700', popular: true },
        { id: 'gold_l',   name: 'Oltin Xazinasi',   icon: '🪙',  type: 'gold',  amount: 500000, cost: 350,  color: '#ffd700' },
        { id: 'food_s',   name: 'Oziq Qoplami',     icon: '🍎',  type: 'food',  amount: 50000,  cost: 50,   color: '#a5d6a7' },
        { id: 'food_m',   name: 'Oziq Qo\'rgoni',   icon: '🍎',  type: 'food',  amount: 150000, cost: 120,  color: '#a5d6a7', popular: true },
        { id: 'food_l',   name: 'Oziq Xazinasi',    icon: '🍎',  type: 'food',  amount: 500000, cost: 350,  color: '#a5d6a7' },
        { id: 'gem_pack', name: 'Olmos + Resurs',   icon: '💎🪙', type: 'combo', diamonds: 100, gold: 100000, food: 100000, cost: 180, color: '#ce93d8', special: true },
    ],

    boosts: [
        { id: 'builder',   name: 'Quruvchi Sloti',  icon: '👷', desc: 'Yangi quruvchi qo\'shish',       costFn: () => BuilderSystem.getNextBuilderCost(),  maxFn: () => BuilderSystem.totalBuilders >= 5, action: '_buyBuilder', color: '#ff8f00' },
        { id: 'trainboost',name: 'Trening Tezligi', icon: '⚡', desc: '1 soat 2x tezlik',               cost: 25,  duration: 3600,   action: '_buyBoost',  color: '#64b5f6' },
        { id: 'resboost',  name: 'Ishlab chiqarish', icon: '⛏️', desc: '4 soat 2x ishlab chiqarish',    cost: 50,  duration: 14400,  action: '_buyBoost',  color: '#a5d6a7' },
        { id: 'buildboost',name: 'Qurilish Tezligi', icon: '🏗️', desc: '1 soat 2x qurilish',           cost: 40,  duration: 3600,   action: '_buyBoost',  color: '#ffb74d' },
        { id: 'shield1d',  name: '1 Kunlik Qalqon',  icon: '🛡️', desc: '24 soat mudofaa',               cost: 150, action: '_buyShield', color: '#90caf9' },
        { id: 'shield7d',  name: '7 Kunlik Qalqon',  icon: '🛡️', desc: '7 kun mudofaa',                 cost: 500, action: '_buyShield', color: '#90caf9', popular: true },
    ],

    _getDailyDeal() {
        // Deterministic daily deal based on current day
        const day = Math.floor(Date.now() / 86400000);
        const deals = [
            { pkg: 'large',   discount: 20, label: '20% CHEGIRMA' },
            { pkg: 'medium',  discount: 25, label: '25% CHEGIRMA' },
            { pkg: 'mega',    discount: 15, label: '15% CHEGIRMA' },
            { pkg: 'small',   discount: 30, label: '30% CHEGIRMA' },
        ];
        return deals[day % deals.length];
    },

    _getDailyDealSeconds() {
        const now = Date.now();
        const nextMidnight = (Math.floor(now / 86400000) + 1) * 86400000;
        return Math.floor((nextMidnight - now) / 1000);
    },

    toggle() {
        this.visible = !this.visible;
        const el      = document.getElementById('shop-panel');
        const overlay = document.getElementById('modal-overlay');
        if (this.visible) {
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
            AudioManager.playClick();
            this._startTimerLoop();
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
            this._stopTimerLoop();
        }
    },

    hide() {
        this.visible = false;
        document.getElementById('shop-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
        this._stopTimerLoop();
    },

    _startTimerLoop() {
        this._stopTimerLoop();
        const tick = () => {
            if (!this.visible) return;
            // Update countdown only
            const el = document.getElementById('shop-deal-countdown');
            if (el) {
                const s = this._getDailyDealSeconds();
                el.textContent = Helpers.formatTime(s);
            }
            this._timerRaf = requestAnimationFrame(tick);
        };
        this._timerRaf = requestAnimationFrame(tick);
    },

    _stopTimerLoop() {
        if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }
    },

    render() {
        const panel = document.getElementById('shop-panel');
        if (!panel) return;
        const bal = Resources.diamond || 0;

        // ── Header ──────────────────────────────────────────────────
        let html = `
            <div class="panel-header">
                <div class="panel-title">🛒 DO'KON</div>
                <div class="panel-close" onclick="ShopPanel.hide()">✖</div>
            </div>

            <!-- Balance bar -->
            <div style="display:flex;align-items:center;justify-content:center;gap:6px;
                        padding:8px 16px;background:rgba(144,202,249,0.06);
                        border-bottom:1px solid rgba(144,202,249,0.1);">
                <span style="font-size:16px;">💎</span>
                <span style="font-size:16px;font-weight:800;color:#90caf9;">${Helpers.formatNumber(bal)}</span>
                <span style="font-size:11px;color:#555;">olmoslar</span>
            </div>

            <!-- Tabs -->
            <div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.07);padding:0 12px;">
                ${[
                    { id:'gems',      icon:'💎', label:'Olmoslar'    },
                    { id:'resources', icon:'🪙', label:'Resurslar'   },
                    { id:'boosts',    icon:'⚡', label:'Kuchaytirgich' },
                    { id:'items',     icon:'⚗️', label:'Buyumlar'    },
                ].map(t => {
                    const itemBadge = (t.id === 'items' && typeof MagicItems !== 'undefined' && MagicItems.getTotalCount() > 0)
                        ? `<sup style="background:#f44336;color:#fff;font-size:8px;font-weight:800;
                                       padding:1px 4px;border-radius:8px;margin-left:2px;">${MagicItems.getTotalCount()}</sup>`
                        : '';
                    return `
                    <div onclick="ShopPanel._setTab('${t.id}')"
                         style="flex:1;text-align:center;padding:10px 4px;font-size:11px;font-weight:700;cursor:pointer;
                                border-bottom:2px solid ${this._tab===t.id ? '#90caf9' : 'transparent'};
                                color:${this._tab===t.id ? '#90caf9' : '#555'};
                                transition:color 0.2s,border-color 0.2s;">
                        ${t.icon} ${t.label}${itemBadge}
                    </div>`;
                }).join('')}
            </div>

            <div class="panel-content" style="padding:0;">
        `;

        // ── Tab content ──────────────────────────────────────────────
        if (this._tab === 'gems') html += this._renderGems();
        else if (this._tab === 'resources') html += this._renderResources();
        else if (this._tab === 'items') html += this._renderItems();
        else html += this._renderBoosts();

        html += `</div>`;
        panel.innerHTML = html;
    },

    // ── GEMS TAB ─────────────────────────────────────────────────────
    _renderGems() {
        const deal = this._getDailyDeal();
        const dealPkg = this.packages.find(p => p.id === deal.pkg);
        const secs = this._getDailyDealSeconds();

        let html = `<div style="padding:10px 12px 0;">`;

        // Daily Deal banner
        if (dealPkg) {
            const discountedPrice = (parseFloat(dealPkg.price.replace('$','')) * (1 - deal.discount / 100)).toFixed(2);
            html += `
                <div style="background:linear-gradient(135deg,rgba(255,87,34,0.25),rgba(255,152,0,0.15));
                            border:1px solid rgba(255,152,0,0.45);border-radius:12px;
                            padding:12px 14px;margin-bottom:10px;position:relative;overflow:hidden;">
                    <!-- shimmer strip -->
                    <div style="position:absolute;top:0;left:-60%;width:40%;height:100%;
                                background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);
                                animation:shopShimmer 2.5s linear infinite;pointer-events:none;"></div>

                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="font-size:36px;flex-shrink:0;">${dealPkg.icon}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                                <span style="font-size:13px;font-weight:800;color:#fff;">${dealPkg.name}</span>
                                <span style="background:#f44336;color:#fff;font-size:9px;font-weight:800;
                                             padding:2px 6px;border-radius:8px;">-${deal.discount}%</span>
                            </div>
                            <div style="font-size:11px;color:#ffb74d;font-weight:700;">
                                💎 ${Helpers.formatNumber(dealPkg.diamonds + dealPkg.bonus)} olmos
                            </div>
                            <div style="font-size:10px;color:#aaa;margin-top:2px;">
                                ⏳ <span id="shop-deal-countdown">${Helpers.formatTime(secs)}</span> qoldi
                            </div>
                        </div>
                        <div style="text-align:right;flex-shrink:0;">
                            <div style="font-size:11px;color:#777;text-decoration:line-through;">${dealPkg.price}</div>
                            <div style="font-size:16px;font-weight:800;color:#ff7043;">$${discountedPrice}</div>
                            <button onclick="ShopPanel.buy('${dealPkg.id}')"
                                    style="margin-top:4px;padding:5px 12px;background:linear-gradient(135deg,#ff5722,#ff9800);
                                           border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:800;cursor:pointer;">
                                SOTIB OL
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Gem packages grid
        html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-bottom:8px;">`;
        for (const pkg of this.packages) {
            const total = pkg.diamonds + pkg.bonus;
            const valuePct = Math.round((pkg.value - 1) * 100);
            const isDeal = pkg.id === deal.pkg;
            const glow = pkg.best ? 'box-shadow:0 0 16px rgba(239,83,80,0.4);' : isDeal ? 'box-shadow:0 0 12px rgba(255,152,0,0.3);' : '';

            html += `
                <div onclick="ShopPanel.buy('${pkg.id}')"
                     style="background:linear-gradient(160deg,rgba(255,255,255,0.04),rgba(0,0,0,0.3));
                            border:1px solid ${pkg.color}44;border-radius:12px;
                            padding:10px 6px;text-align:center;cursor:pointer;
                            position:relative;overflow:hidden;${glow}
                            transition:transform 0.15s,border-color 0.2s;"
                     onmousedown="this.style.transform='scale(0.95)'"
                     onmouseup="this.style.transform='scale(1)'"
                     onmouseleave="this.style.transform='scale(1)'">

                    ${pkg.popular ? `<div style="position:absolute;top:0;left:0;right:0;background:linear-gradient(90deg,#9c27b0,#e040fb);
                        font-size:8px;font-weight:800;color:#fff;padding:2px 0;text-align:center;">🔥 MASHHUR</div>` : ''}
                    ${pkg.best ? `<div style="position:absolute;top:0;left:0;right:0;background:linear-gradient(90deg,#c62828,#ef5350);
                        font-size:8px;font-weight:800;color:#fff;padding:2px 0;text-align:center;">👑 BEST VALUE</div>` : ''}
                    ${isDeal ? `<div style="position:absolute;top:0;left:0;right:0;background:linear-gradient(90deg,#e65100,#ff9800);
                        font-size:8px;font-weight:800;color:#fff;padding:2px 0;text-align:center;">⚡ BUGUNGI TAKLIF</div>` : ''}

                    <div style="font-size:${pkg.best||pkg.popular?'24px':'22px'};margin-top:${pkg.popular||pkg.best||isDeal?'14px':'4px'};margin-bottom:4px;
                                filter:drop-shadow(0 0 6px ${pkg.color}88);">${pkg.icon}</div>

                    <div style="font-size:13px;font-weight:800;color:${pkg.color};line-height:1;">
                        ${Helpers.formatNumber(total)}
                    </div>
                    ${pkg.bonus > 0 ? `<div style="font-size:8px;color:#4caf50;margin-top:1px;">+${Helpers.formatNumber(pkg.bonus)} bonus</div>` : '<div style="font-size:8px;color:transparent;">—</div>'}

                    <!-- Value bar -->
                    <div style="margin:5px 4px 4px;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
                        <div style="height:100%;width:${Math.min(100, valuePct * 2)}%;background:linear-gradient(90deg,${pkg.color},#fff);border-radius:2px;"></div>
                    </div>
                    <div style="font-size:8px;color:#666;margin-bottom:4px;">+${valuePct}% qiymat</div>

                    <div style="background:${pkg.color};border-radius:6px;padding:4px 0;
                                font-size:11px;font-weight:800;color:#fff;">
                        ${isDeal ? `<span style="text-decoration:line-through;opacity:0.6;font-size:9px;">${pkg.price}</span> ` : ''}${pkg.price}
                    </div>
                </div>
            `;
        }
        html += `</div>`;

        // Free gems section
        html += `
            <div style="background:rgba(76,175,80,0.07);border:1px solid rgba(76,175,80,0.2);
                        border-radius:10px;padding:10px 12px;margin-bottom:12px;">
                <div style="font-size:11px;font-weight:700;color:#81c784;margin-bottom:8px;">
                    🎁 Bepul Olmos
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="ShopPanel.claimDaily()"
                            style="flex:1;padding:8px 4px;background:rgba(76,175,80,0.15);
                                   border:1px solid rgba(76,175,80,0.3);border-radius:8px;
                                   color:#a5d6a7;font-size:10px;font-weight:700;cursor:pointer;">
                        📅 Kunlik<br><span style="color:#4caf50;font-size:12px;">+5 💎</span>
                    </button>
                    <button onclick="ShopPanel.watchAd()"
                            style="flex:1;padding:8px 4px;background:rgba(33,150,243,0.1);
                                   border:1px solid rgba(33,150,243,0.25);border-radius:8px;
                                   color:#90caf9;font-size:10px;font-weight:700;cursor:pointer;">
                        📺 Reklama<br><span style="color:#64b5f6;font-size:12px;">+3 💎</span>
                    </button>
                    <button onclick="ShopPanel.hide();AchievementsPanel.show()"
                            style="flex:1;padding:8px 4px;background:rgba(255,193,7,0.08);
                                   border:1px solid rgba(255,193,7,0.25);border-radius:8px;
                                   color:#ffe082;font-size:10px;font-weight:700;cursor:pointer;">
                        🏆 Yutuqlar<br><span style="color:#ffd700;font-size:12px;">+💎</span>
                    </button>
                </div>
            </div>
        `;

        html += `</div>`;
        return html;
    },

    // ── RESOURCES TAB ────────────────────────────────────────────────
    _renderResources() {
        let html = `<div style="padding:10px 12px;">`;

        // Section: Gold
        html += `
            <div style="font-size:10px;font-weight:700;color:#ffd700;letter-spacing:0.5px;
                        margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,215,0,0.12);">
                🪙 OLTIN PAKETLARI
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
        `;

        for (const p of this.resourcePacks.filter(p => p.type === 'gold')) {
            const canAfford = (Resources.diamond || 0) >= p.cost;
            html += this._resourcePackCard(p, canAfford);
        }
        html += `</div>`;

        // Section: Food
        html += `
            <div style="font-size:10px;font-weight:700;color:#a5d6a7;letter-spacing:0.5px;
                        margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(165,214,167,0.12);">
                🍎 OZIQ PAKETLARI
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
        `;

        for (const p of this.resourcePacks.filter(p => p.type === 'food')) {
            const canAfford = (Resources.diamond || 0) >= p.cost;
            html += this._resourcePackCard(p, canAfford);
        }
        html += `</div>`;

        // Combo pack
        const combo = this.resourcePacks.find(p => p.type === 'combo');
        if (combo) {
            const canAfford = (Resources.diamond || 0) >= combo.cost;
            html += `
                <div style="font-size:10px;font-weight:700;color:#ce93d8;letter-spacing:0.5px;
                            margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(206,147,216,0.12);">
                    ✨ MAXSUS PAKET
                </div>
                <div onclick="${canAfford ? `ShopPanel.buyResource('${combo.id}')` : ''}"
                     style="background:linear-gradient(135deg,rgba(156,39,176,0.15),rgba(103,58,183,0.1));
                            border:1px solid ${canAfford ? 'rgba(206,147,216,0.4)' : 'rgba(255,255,255,0.06)'};
                            border-radius:12px;padding:12px 14px;cursor:${canAfford?'pointer':'default'};
                            display:flex;align-items:center;gap:12px;margin-bottom:12px;
                            opacity:${canAfford?'1':'0.55'};">
                    <div style="font-size:28px;flex-shrink:0;">${combo.icon}</div>
                    <div style="flex:1;">
                        <div style="font-size:13px;font-weight:700;color:#ce93d8;">${combo.name}</div>
                        <div style="font-size:10px;color:#aaa;margin-top:2px;">
                            💎 ${Helpers.formatNumber(combo.diamonds)} +
                            🪙 ${Helpers.formatNumber(combo.gold)} +
                            🍎 ${Helpers.formatNumber(combo.food)}
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="background:rgba(206,147,216,0.2);border:1px solid rgba(206,147,216,0.4);
                                    border-radius:8px;padding:6px 12px;font-size:12px;font-weight:800;
                                    color:${canAfford?'#ce93d8':'#666'};">
                            💎 ${combo.cost}
                        </div>
                        ${!canAfford ? `<div style="font-size:9px;color:#f44336;margin-top:3px;">Olmos yetarli emas</div>` : ''}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    },

    _resourcePackCard(p, canAfford) {
        return `
            <div onclick="${canAfford ? `ShopPanel.buyResource('${p.id}')` : ''}"
                 style="background:rgba(255,255,255,0.03);
                        border:1px solid ${canAfford ? p.color + '44' : 'rgba(255,255,255,0.05)'};
                        border-radius:10px;padding:10px 6px;text-align:center;
                        cursor:${canAfford ? 'pointer' : 'default'};opacity:${canAfford ? '1' : '0.5'};
                        position:relative;transition:border-color 0.2s;"
                 ${canAfford ? `onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'"` : ''}>
                ${p.popular ? `<div style="position:absolute;top:0;left:0;right:0;background:${p.color};
                    font-size:7px;font-weight:800;color:rgba(0,0,0,0.7);padding:2px 0;border-radius:8px 8px 0 0;">MASHHUR</div>` : ''}
                <div style="font-size:22px;margin-top:${p.popular?'12px':'2px'};margin-bottom:4px;">${p.icon}</div>
                <div style="font-size:10px;font-weight:700;color:${p.color};margin-bottom:2px;">${Helpers.formatNumber(p.amount)}</div>
                <div style="font-size:8px;color:#555;margin-bottom:5px;">${p.name}</div>
                <div style="background:${canAfford ? p.color + '22' : 'rgba(255,255,255,0.04)'};
                            border:1px solid ${canAfford ? p.color + '55' : 'transparent'};
                            border-radius:6px;padding:4px 0;font-size:11px;font-weight:800;
                            color:${canAfford ? '#90caf9' : '#555'};">
                    💎 ${p.cost}
                </div>
            </div>
        `;
    },

    // ── BOOSTS TAB ───────────────────────────────────────────────────
    _renderBoosts() {
        let html = `<div style="padding:10px 12px;">`;

        // Builder slot card (special — always first)
        const builderBoost = this.boosts.find(b => b.id === 'builder');
        const maxBuilders = BuilderSystem.totalBuilders >= 5;
        const builderCost = BuilderSystem.getNextBuilderCost ? BuilderSystem.getNextBuilderCost() : 250;
        const builderCanAfford = !maxBuilders && (Resources.diamond || 0) >= builderCost;

        html += `
            <div style="background:linear-gradient(135deg,rgba(255,143,0,0.15),rgba(255,87,34,0.08));
                        border:1px solid rgba(255,152,0,${builderCanAfford?'0.45':'0.15'});
                        border-radius:12px;padding:12px 14px;margin-bottom:10px;
                        opacity:${maxBuilders?'0.5':'1'};">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="font-size:28px;">👷</div>
                    <div style="flex:1;">
                        <div style="font-size:13px;font-weight:700;color:#ffb74d;">Quruvchi Sloti</div>
                        <div style="font-size:10px;color:#888;margin-top:2px;">
                            ${maxBuilders
                                ? 'Maksimal quruvchilar (5 ta) ✅'
                                : `Hozir: <strong style="color:#fff">${BuilderSystem.totalBuilders} ta</strong>  |  Band: ${BuilderSystem.busyBuilders} ta`}
                        </div>
                        ${!maxBuilders ? `
                        <!-- Builder slots visual -->
                        <div style="display:flex;gap:4px;margin-top:6px;">
                            ${Array.from({length:5}, (_,i) => `
                                <div style="width:18px;height:18px;border-radius:4px;font-size:11px;
                                            display:flex;align-items:center;justify-content:center;
                                            background:${i < BuilderSystem.totalBuilders ? 'rgba(255,152,0,0.3)' : 'rgba(255,255,255,0.06)'};
                                            border:1px solid ${i < BuilderSystem.totalBuilders ? 'rgba(255,152,0,0.6)' : 'rgba(255,255,255,0.1)'};">
                                    ${i < BuilderSystem.totalBuilders ? '👷' : ''}
                                </div>`).join('')}
                        </div>` : ''}
                    </div>
                    ${!maxBuilders ? `
                    <div style="text-align:right;flex-shrink:0;">
                        <button onclick="ShopPanel._buyBuilder()"
                                style="padding:7px 12px;background:${builderCanAfford ? 'linear-gradient(135deg,#ff8f00,#ff6d00)' : 'rgba(255,255,255,0.06)'};
                                       border:1px solid ${builderCanAfford ? 'rgba(255,152,0,0.6)' : 'rgba(255,255,255,0.1)'};
                                       border-radius:8px;color:${builderCanAfford?'#fff':'#555'};
                                       font-size:11px;font-weight:800;cursor:${builderCanAfford?'pointer':'default'};">
                            💎 ${builderCost}
                        </button>
                    </div>` : ''}
                </div>
            </div>
        `;

        // Other boosts
        html += `
            <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.5px;
                        margin-bottom:8px;">⚡ KUCHAYTIRGICHLAR</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
        `;

        for (const boost of this.boosts.filter(b => b.id !== 'builder')) {
            const cost = boost.cost;
            const canAfford = (Resources.diamond || 0) >= cost;
            // Check if this boost is currently active
            let activeUntil = 0;
            if (boost.id === 'trainboost' && typeof TroopManager !== 'undefined') activeUntil = TroopManager._boostUntil || 0;
            else if (boost.id === 'resboost' && typeof BuildingManager !== 'undefined') activeUntil = BuildingManager._resBoostUntil || 0;
            else if (boost.id === 'buildboost' && typeof BuildingManager !== 'undefined') activeUntil = BuildingManager._buildBoostUntil || 0;
            const isActive = activeUntil > Date.now();
            const remainSec = isActive ? Math.floor((activeUntil - Date.now()) / 1000) : 0;
            const remainStr = remainSec > 3600
                ? `${Math.floor(remainSec/3600)}s ${Math.floor((remainSec%3600)/60)}d`
                : remainSec > 60 ? `${Math.floor(remainSec/60)}d ${remainSec%60}s`
                : `${remainSec}s`;

            html += `
                <div style="display:flex;align-items:center;gap:10px;
                            background:${isActive ? `rgba(${boost.color.length>4?'':'0,'}0,0,0.0)` : 'rgba(255,255,255,0.03)'};
                            background:${isActive ? `linear-gradient(135deg,${boost.color}18,${boost.color}08)` : 'rgba(255,255,255,0.03)'};
                            border:1px solid ${isActive ? boost.color + '66' : canAfford ? boost.color + '33' : 'rgba(255,255,255,0.05)'};
                            border-radius:10px;padding:10px 12px;
                            opacity:${isActive || canAfford ? '1' : '0.6'};position:relative;overflow:hidden;">
                    ${isActive ? `<div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${boost.color},${boost.color}44);
                        animation:boostActiveBar 1s linear infinite;"></div>` : ''}
                    <div style="font-size:22px;width:32px;text-align:center;flex-shrink:0;
                                filter:${isActive ? `drop-shadow(0 0 6px ${boost.color})` : 'none'};
                                animation:${isActive ? 'boostIconPulse 1.5s ease-in-out infinite' : 'none'};">${boost.icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:12px;font-weight:700;color:${isActive ? boost.color : boost.color};">
                            ${boost.name}
                            ${isActive ? `<span style="font-size:8px;background:${boost.color}33;border-radius:8px;padding:1px 6px;margin-left:4px;color:${boost.color};font-weight:800;">⚡ FAOL</span>` : ''}
                        </div>
                        <div style="font-size:10px;color:${isActive ? boost.color + 'bb' : '#666'};margin-top:1px;">
                            ${isActive ? `⏱ ${remainStr} qoldi` : boost.desc}
                        </div>
                    </div>
                    <button onclick="${!isActive && canAfford ? `ShopPanel.${boost.action}('${boost.id}')` : ''}"
                            style="padding:6px 12px;
                                   background:${isActive ? boost.color + '22' : canAfford ? boost.color + '22' : 'rgba(255,255,255,0.04)'};
                                   border:1px solid ${isActive ? boost.color + '55' : canAfford ? boost.color + '55' : 'rgba(255,255,255,0.08)'};
                                   border-radius:8px;font-size:11px;font-weight:800;
                                   color:${isActive ? boost.color : canAfford ? '#90caf9' : '#555'};
                                   cursor:${!isActive && canAfford ? 'pointer' : 'default'};flex-shrink:0;min-width:58px;text-align:center;">
                        ${isActive ? '✅' : `💎 ${cost}`}
                    </button>
                </div>
            `;
        }

        html += `</div></div>`;
        return html;
    },

    // ── ITEMS TAB ────────────────────────────────────────────────────
    _renderItems() {
        const bal = Resources.diamond || 0;
        let html = `<div style="padding:10px 12px;">`;

        // Inventory section (if player has any items)
        const hasItems = typeof MagicItems !== 'undefined' && MagicItems.getTotalCount() > 0;
        if (hasItems) {
            html += `
                <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.5px;margin-bottom:8px;">
                    🎒 INVENTAR
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;">
            `;
            for (const [itemId, count] of Object.entries(MagicItems.inventory)) {
                if (!count || count < 1) continue;
                const d = MAGIC_ITEM_DATA[itemId];
                if (!d) continue;
                const rarityColor = d.rarity === 'epic' ? '#9c27b0' : d.rarity === 'rare' ? '#2196f3' : '#4caf50';
                html += `
                    <div onclick="ShopPanel._useItem('${itemId}')"
                         style="background:linear-gradient(160deg,rgba(255,255,255,0.05),rgba(0,0,0,0.3));
                                border:1px solid ${rarityColor}44;border-radius:10px;
                                padding:8px 4px;text-align:center;cursor:pointer;position:relative;
                                transition:transform 0.15s,border-color 0.2s;"
                         onmousedown="this.style.transform='scale(0.93)'"
                         onmouseup="this.style.transform='scale(1)'"
                         onmouseleave="this.style.transform='scale(1)'">
                        <div style="font-size:22px;">${d.icon}</div>
                        <div style="position:absolute;top:4px;right:5px;background:${rarityColor};
                                    color:#fff;font-size:8px;font-weight:800;
                                    width:14px;height:14px;border-radius:50%;
                                    display:flex;align-items:center;justify-content:center;">${count}</div>
                        <div style="font-size:8px;color:${rarityColor};font-weight:700;margin-top:3px;line-height:1.2;">${d.name.split(' ')[0]}</div>
                        <div style="font-size:8px;color:#555;margin-top:1px;">ISHLATISH</div>
                    </div>
                `;
            }
            html += `</div>`;
        }

        // Active potions status
        if (typeof MagicItems !== 'undefined') {
            const bpActive = MagicItems.isBuilderPotionActive();
            const tpActive = MagicItems.isTrainingPotionActive();
            if (bpActive || tpActive) {
                html += `<div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.5px;margin-bottom:6px;">⚡ FAOL IKSIRLLAR</div>`;
                if (bpActive) {
                    const rem = Math.max(0, MagicItems._builderPotionUntil - Date.now());
                    const remStr = Helpers.formatTime(Math.floor(rem / 1000));
                    html += `<div style="background:rgba(255,143,0,0.1);border:1px solid rgba(255,143,0,0.4);
                                        border-radius:8px;padding:7px 10px;margin-bottom:5px;font-size:11px;font-weight:700;color:#ff8f00;">
                        ⚗️ Quruvchi Iksiri faol — ${remStr} qoldi
                    </div>`;
                }
                if (tpActive) {
                    const rem = Math.max(0, MagicItems._trainingPotionUntil - Date.now());
                    const remStr = Helpers.formatTime(Math.floor(rem / 1000));
                    html += `<div style="background:rgba(33,150,243,0.1);border:1px solid rgba(33,150,243,0.4);
                                        border-radius:8px;padding:7px 10px;margin-bottom:5px;font-size:11px;font-weight:700;color:#2196f3;">
                        💊 Trening Iksiri faol — ${remStr} qoldi
                    </div>`;
                }
                html += `<div style="margin-bottom:10px;"></div>`;
            }
        }

        // Shop section
        html += `
            <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.5px;margin-bottom:8px;">
                🛒 BUYUMLAR DO'KONI
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
        `;

        for (const entry of MAGIC_ITEMS_SHOP) {
            const d = MAGIC_ITEM_DATA[entry.itemId];
            if (!d) continue;
            const canAfford = bal >= entry.cost;
            const owned = typeof MagicItems !== 'undefined' ? MagicItems.getCount(entry.itemId) : 0;
            const atLimit = owned >= entry.limit;
            const rarityColor = d.rarity === 'epic' ? '#9c27b0' : d.rarity === 'rare' ? '#2196f3' : '#4caf50';
            const rarityLabel = d.rarity === 'epic' ? 'EPİK' : d.rarity === 'rare' ? 'NADIR' : 'ODDIY';

            html += `
                <div style="display:flex;align-items:center;gap:10px;
                            background:${canAfford && !atLimit ? `linear-gradient(135deg,${d.color}10,${d.color}06)` : 'rgba(255,255,255,0.02)'};
                            border:1px solid ${canAfford && !atLimit ? d.color + '44' : 'rgba(255,255,255,0.05)'};
                            border-radius:10px;padding:10px 12px;
                            opacity:${atLimit ? '0.4' : canAfford ? '1' : '0.65'};">
                    <div style="font-size:24px;width:34px;text-align:center;flex-shrink:0;">${d.icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:5px;">
                            <span style="font-size:12px;font-weight:700;color:${d.color};">${d.name}</span>
                            <span style="font-size:7px;font-weight:800;color:${rarityColor};
                                         background:${rarityColor}22;border-radius:6px;padding:1px 5px;">${rarityLabel}</span>
                        </div>
                        <div style="font-size:10px;color:#666;margin-top:1px;">${d.desc}</div>
                        <div style="font-size:9px;color:#555;margin-top:2px;">
                            Egizlik: <strong style="color:${owned>0?'#90caf9':'#555'}">${owned}</strong>/${entry.limit}
                        </div>
                    </div>
                    <button onclick="${canAfford && !atLimit ? `ShopPanel._buyItem('${entry.itemId}')` : ''}"
                            style="padding:6px 10px;flex-shrink:0;min-width:58px;text-align:center;
                                   background:${canAfford && !atLimit ? d.color + '22' : 'rgba(255,255,255,0.04)'};
                                   border:1px solid ${canAfford && !atLimit ? d.color + '55' : 'rgba(255,255,255,0.08)'};
                                   border-radius:8px;font-size:11px;font-weight:800;
                                   color:${canAfford && !atLimit ? '#90caf9' : '#555'};
                                   cursor:${canAfford && !atLimit ? 'pointer' : 'default'};">
                        ${atLimit ? '✅' : `💎 ${entry.cost}`}
                    </button>
                </div>
            `;
        }

        html += `</div>

            <!-- Info footer -->
            <div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.02);
                        border-radius:8px;border:1px solid rgba(255,255,255,0.05);
                        font-size:9px;color:#555;line-height:1.5;">
                💡 Buyumlar Missiya, Trophy Road va maxsus voqealardan ham olinadi.
                Inventardagi buyumni ishlatish uchun uning ustini bosing.
            </div>
        </div>`;

        return html;
    },

    _buyItem(itemId) {
        const entry = MAGIC_ITEMS_SHOP.find(e => e.itemId === itemId);
        if (!entry || typeof MagicItems === 'undefined') return;
        const owned = MagicItems.getCount(itemId);
        if (owned >= entry.limit) { Toast.show('Ushbu buyum chegarasiga yetdingiz!', 'warn'); return; }
        if ((Resources.diamond || 0) < entry.cost) { Toast.show('💎 Olmos yetarli emas!', 'warn'); return; }
        Resources.spend('diamond', entry.cost);
        MagicItems.add(itemId, 1);
        if (typeof SaveSystem !== 'undefined') SaveSystem.save();
        this.render();
    },

    _useItem(itemId) {
        if (typeof MagicItems === 'undefined') return;
        const d = MAGIC_ITEM_DATA[itemId];
        if (!d) return;
        const rarityColor = d.rarity === 'epic' ? '#9c27b0' : d.rarity === 'rare' ? '#2196f3' : '#4caf50';

        // Custom confirm popup
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100002;display:flex;align-items:center;justify-content:center;
        `;
        overlay.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a2340);
                        border:2px solid ${rarityColor}88;border-radius:16px;
                        padding:20px 22px;width:min(280px,88vw);text-align:center;
                        box-shadow:0 0 40px ${rarityColor}33;
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:42px;margin-bottom:8px;">${d.icon}</div>
                <div style="font-size:14px;font-weight:800;color:${rarityColor};margin-bottom:4px;">${d.name}</div>
                <div style="font-size:11px;color:#aaa;margin-bottom:14px;line-height:1.4;">${d.desc}</div>
                <div style="font-size:12px;color:#888;margin-bottom:16px;">Ishlatmoqchimisiz?</div>
                <div style="display:flex;gap:8px;">
                    <button id="_shop-use-cancel"
                            style="flex:1;padding:9px;background:rgba(255,255,255,0.07);
                                   border:1px solid rgba(255,255,255,0.15);border-radius:9px;
                                   color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_shop-use-confirm"
                            style="flex:1;padding:9px;background:linear-gradient(135deg,${rarityColor},${rarityColor}bb);
                                   border:none;border-radius:9px;
                                   color:#fff;font-size:12px;font-weight:700;cursor:pointer;">Ishlatish</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#_shop-use-cancel').onclick  = () => overlay.remove();
        overlay.querySelector('#_shop-use-confirm').onclick = () => {
            overlay.remove();
            MagicItems.use(itemId);
            this.render();
        };
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    },

    // ── Actions ──────────────────────────────────────────────────────
    _setTab(tab) {
        this._tab = tab;
        this.render();
        this._startTimerLoop();
    },

    _buyBuilder() {
        if (BuilderSystem.totalBuilders >= 5) { Toast.show('Maksimal quruvchilar!', 'warn'); return; }
        const result = BuilderSystem.buyBuilder();
        if (result) {
            Toast.show('👷 Yangi quruvchi qo\'shildi!', 'success');
            this.render();
        }
    },

    _buyBoost(boostId) {
        const boost = this.boosts.find(b => b.id === boostId);
        if (!boost) return;
        if ((Resources.diamond || 0) < boost.cost) { Toast.show('💎 Olmos yetarli emas!', 'warn'); return; }
        Resources.spend('diamond', boost.cost);
        // Apply boost effect
        const until = Date.now() + boost.duration * 1000;
        if (boostId === 'trainboost') {
            if (typeof TroopManager !== 'undefined') TroopManager._boostUntil = until;
            Toast.show('⚡ 1 soat trening 2x tezlashtirildi!', 'success');
            if (typeof NotificationSystem !== 'undefined') NotificationSystem.add('build', 'Trening tezligi!', '1 soat davomida 2x tezlik', '⚡');
            if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();
        } else if (boostId === 'resboost') {
            if (typeof BuildingManager !== 'undefined') BuildingManager._resBoostUntil = until;
            Toast.show('⛏️ 4 soat 2x ishlab chiqarish faollashdi!', 'success');
            if (typeof NotificationSystem !== 'undefined') NotificationSystem.add('build', 'Ishlab chiqarish tezligi!', '4 soat 2x resurs ishlab chiqarish', '⛏️');
            if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();
        } else if (boostId === 'buildboost') {
            if (typeof BuildingManager !== 'undefined') BuildingManager._buildBoostUntil = until;
            Toast.show('🏗️ 1 soat qurilish 2x tezlashtirildi!', 'success');
            if (typeof NotificationSystem !== 'undefined') NotificationSystem.add('build', 'Qurilish tezligi!', '1 soat davomida 2x qurilish', '🏗️');
            if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();
        }
        this.render();
    },

    _buyShield(boostId) {
        const boost = this.boosts.find(b => b.id === boostId);
        if (!boost) return;
        if ((Resources.diamond || 0) < boost.cost) { Toast.show('💎 Olmos yetarli emas!', 'warn'); return; }
        Resources.spend('diamond', boost.cost);
        const hours = boostId === 'shield1d' ? 24 : 168;
        if (typeof ShieldHUD !== 'undefined') ShieldHUD.activate(hours * 3600);
        Toast.show(`🛡️ ${hours} soatlik qalqon faollashdi!`, 'success');
        NotificationSystem.add('battle', 'Qalqon faol!', `${hours} soat himoyalanasiz`, '🛡️');
        this.render();
    },

    buy(packageId) {
        const pkg = this.packages.find(p => p.id === packageId);
        if (!pkg) return;
        const totalGems = pkg.diamonds + pkg.bonus;
        Resources.add('diamond', totalGems);
        Toast.show(`💎 ${Helpers.formatNumber(totalGems)} olmos qo'shildi!`, 'reward');
        NotificationSystem.add('reward', 'Olmos sotib olindi!', `${Helpers.formatNumber(totalGems)} olmos hisobingizga tushdi`, '💎');
        this.render();
        this._startTimerLoop();
    },

    buyResource(packId) {
        const p = this.resourcePacks.find(r => r.id === packId);
        if (!p) return;
        if ((Resources.diamond || 0) < p.cost) { Toast.show('💎 Olmos yetarli emas!', 'warn'); return; }
        Resources.spend('diamond', p.cost);
        if (p.type === 'gold')  { Resources.add('gold', p.amount);  Toast.show(`🪙 ${Helpers.formatNumber(p.amount)} oltin qo'shildi!`, 'success'); }
        if (p.type === 'food')  { Resources.add('food', p.amount);  Toast.show(`🍎 ${Helpers.formatNumber(p.amount)} oziq qo'shildi!`, 'success'); }
        if (p.type === 'combo') {
            Resources.add('diamond', p.diamonds);
            Resources.add('gold', p.gold);
            Resources.add('food', p.food);
            Toast.show(`✨ Maxsus paket faollashdi!`, 'reward');
        }
        this.render();
    },

    claimDaily() {
        if (typeof DailyRewardPanel !== 'undefined') {
            this.hide();
            DailyRewardPanel.show();
        }
    },

    watchAd() {
        Resources.add('diamond', 3);
        Toast.show('📺 +3 olmos olindi!', 'reward');
        this.render();
        this._startTimerLoop();
    },
};
