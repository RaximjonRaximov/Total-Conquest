// ============================================
// LOGIN SYSTEM — Backend auth
// ============================================

const LoginSystem = {
    _serverAvailable: false,
    _googleClientId: null,

    async init() {
        this._serverAvailable = await Api.checkServer();

        // Public config yukla (Google Client ID uchun)
        if (this._serverAvailable) {
            try {
                const cfg = await fetch(`${Api.BASE_URL || 'http://localhost:4000/api'}/config`).then(r => r.json());
                this._googleClientId = cfg.google_client_id || null;
            } catch { /* silent */ }
        }

        // Google One Tap sozlash
        this._initGoogleSignIn();

        // Saqlangan session bor?
        const restored = Api._restore ? Api._restore() : false;
        if (restored) {
            try {
                await Api.getMe();
                this.hideLoginScreen();
                await this._postLogin();
                return true;
            } catch {
                Api.clearTokens ? Api.clearTokens() : Api.clear();
            }
        }

        this.showLoginScreen();
        return false;
    },

    _initGoogleSignIn() {
        const clientId = this._googleClientId;
        const btn = document.getElementById('btn-google-login');
        const onetapContainer = document.getElementById('google-onetap-container');

        if (!clientId) {
            if (btn) { btn.title = 'GOOGLE_CLIENT_ID sozlanmagan'; btn.style.opacity = '0.5'; }
            if (onetapContainer) onetapContainer.style.display = 'none';
            return;
        }

        // Agar GSI yuklangan bo'lsa — One Tap va rendered button
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => this._handleGoogleCallback(response.credential),
                auto_select: false,
                cancel_on_tap_outside: true,
            });

            if (onetapContainer) {
                google.accounts.id.renderButton(onetapContainer, {
                    theme: 'outline', size: 'large', width: 260,
                    text: 'signin_with', locale: 'uz',
                });
                if (btn) btn.style.display = 'none';
            }
        } else {
            // GSI hali yuklanmagan — window.onload ga bog'lash
            window.addEventListener('load', () => this._initGoogleSignIn());
        }
    },

    async _handleGoogleCallback(idToken) {
        this._setStatus('Google bilan kirilmoqda...', '#aaa');
        try {
            const data = await Api.loginWithGoogle(idToken);
            this.hideLoginScreen();
            Toast.show(`🎉 Xush kelibsiz, ${data.display_name || 'Jangchi'}!`, 'success', 3000);
            await this._postLogin();
        } catch (e) {
            console.error('Google login failed:', e);
            this._setStatus('Google login xatosi. Qayta urinib ko\'ring.', '#e57373');
        }
    },

    showLoginScreen() {
        const el = document.getElementById('login-screen');
        if (el) el.style.display = 'flex';
    },

    hideLoginScreen() {
        const el = document.getElementById('login-screen');
        if (el) el.style.display = 'none';
    },

    _setStatus(msg, color = '#aaa') {
        const el = document.getElementById('login-status');
        if (el) { el.textContent = msg; el.style.color = color; }
    },

    // ── Google OAuth ────────────────────────────────────────────────────
    loginGoogle() {
        if (!this._serverAvailable) {
            this._setStatus('Server ishlamayapti. Mehmon sifatida kiring.', '#e57373');
            return;
        }
        if (!this._googleClientId) {
            this._setStatus('Google kirish sozlanmagan (GOOGLE_CLIENT_ID kerak).', '#ffd54f');
            return;
        }
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // One Tap ko'rsatilmasa — OAuth popup
                    this._googleOAuthPopup();
                }
            });
        } else {
            this._googleOAuthPopup();
        }
    },

    _googleOAuthPopup() {
        const clientId = this._googleClientId;
        if (!clientId) return;
        const redirectUri = encodeURIComponent(window.location.origin + '/google-callback');
        const scope = encodeURIComponent('openid email profile');
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
        const popup = window.open(url, 'google_login', 'width=480,height=600,left=200,top=100');
        const timer = setInterval(() => {
            try {
                if (popup.closed) { clearInterval(timer); return; }
                const href = popup.location.href;
                if (href.includes('access_token')) {
                    clearInterval(timer);
                    popup.close();
                    const params = new URLSearchParams(href.split('#')[1]);
                    const token = params.get('access_token');
                    if (token) this._exchangeGoogleToken(token);
                }
            } catch { /* cross-origin, wait */ }
        }, 500);
    },

    async _exchangeGoogleToken(accessToken) {
        this._setStatus('Tekshirilmoqda...', '#aaa');
        try {
            // access_token → id_token ga almashtirish
            const info = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`).then(r => r.json());
            this._setStatus('Google tekshirildi, kirilmoqda...', '#aaa');
            // Backend ga yuborish (access token bilan — backend tokeninfo dan verify qiladi)
            const data = await Api.loginWithGoogleAccessToken(accessToken);
            this.hideLoginScreen();
            await this._postLogin();
        } catch (e) {
            this._setStatus('Google login xatosi.', '#e57373');
        }
    },

    // ── Guest Login ─────────────────────────────────────────────────────
    async loginGuest() {
        this._setStatus('Kirish...', '#aaa');

        if (!this._serverAvailable) {
            // Offline fallback
            this._offlineFallback();
            return;
        }

        try {
            const data = await Api.loginAsGuest();
            this.hideLoginScreen();

            if (data.save_link) {
                Toast.show(`Mehmon: ${data.user_id.slice(0, 12)}. Saqlash: Telegram`, 'info', 4000);
            }

            await this._postLogin();
        } catch (e) {
            console.warn('Guest login failed:', e.message);
            this._setStatus('Server xatosi. Offline rejimda kirilmoqda...', '#e57373');
            setTimeout(() => this._offlineFallback(), 1500);
        }
    },

    // ── Qurilma barmoq izi (mehmon uchun) ──────────────────────────────────
    _getOrCreateDeviceId() {
        const KEY = 'tc_device_id';
        let id = localStorage.getItem(KEY);
        if (id) return id;

        // Qurilma ma'lumotlaridan barqaror ID yaratish
        const ua   = navigator.userAgent || '';
        const lang = navigator.language  || '';
        const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const w    = screen.width  || 0;
        const h    = screen.height || 0;
        const cd   = screen.colorDepth || 0;

        let hash = 5381;
        const str = `${ua}|${lang}|${tz}|${w}x${h}x${cd}`;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
            hash = hash & 0xFFFFFFFF;
        }
        // Random suffix zarur — bir xil qurilmalarda to'qnashuv oldini olish
        const rand = Math.random().toString(36).substr(2, 6);
        id = `guest_${(hash >>> 0).toString(16)}_${rand}`;
        localStorage.setItem(KEY, id);
        return id;
    },

    // ── Offline rejim (server yo'q) ─────────────────────────────────────
    _offlineFallback() {
        this.hideLoginScreen();
        const deviceId = this._getOrCreateDeviceId();
        SaveSystem.setPlayerId(deviceId);
        this._updateBadge('Mehmon', null);
        Game.init();
        Toast.show('Offline rejim — progress qurilmada saqlanadi', 'warn', 4000);
        setTimeout(() => this._claimDailyReward(), 1000);
    },

    // ── Login muvaffaqiyatli bo'lgandan keyin ───────────────────────────
    async _postLogin() {
        try {
            const profile = await Api.getMe();
            this._updateBadge(profile.display_name, profile.trophies);
            SaveSystem.setPlayerId(Api.getUserId ? Api.getUserId() : Api._userId || 'default');

            // Shield yukla
            if (profile.shield_until) BattleSystem.setShieldFromISO(profile.shield_until);

            // Backenddan village yukla
            const loaded = await this._loadVillage();
            Game.init(loaded);

            // Auto-save: har 60s backendga sync
            this._startAutoSync();

            // Kunlik mukofot
            this._claimDailyReward();

            // Offline hujum bormi? Bildirishnoma ko'rsat
            this._checkOfflineAttacks();
        } catch (e) {
            console.warn('Post-login setup failed:', e.message);
            Game.init(false);
        }
    },

    async _loadVillage() {
        try {
            const village = await Api.getMyVillage();
            const md = village?.map_data;
            if (!md?.buildings?.length) return false;

            Grid.init();
            BuildingManager.buildings = {};
            BuildingManager.nextId = 1;

            for (const bd of md.buildings) {
                BuildingManager.buildings[bd.id] = {
                    id: bd.id, type: bd.type,
                    x: bd.x, y: bd.y,
                    level: bd.level || 1,
                    hp: bd.hp, maxHp: bd.maxHp,
                    building: false, timerId: null,
                    storedResource: bd.storedResource || 0,
                    lastCollect: Date.now(),
                };
                const bData = BUILDING_DATA[bd.type];
                if (bData) Grid.occupy(bd.x, bd.y, bData.size[0], bData.size[1], bd.id);
                const num = parseInt(bd.id.replace('b', ''));
                if (!isNaN(num) && num >= BuildingManager.nextId) BuildingManager.nextId = num + 1;
            }

            if (md.obstacles) ObstacleManager.deserialize(md.obstacles);
            if (village.army_data) TroopManager.army = village.army_data;
            if (village.research)  ResearchSystem.levels = village.research;
            if (village.resources) {
                Resources.gold    = village.resources.gold    ?? Resources.gold;
                Resources.food    = village.resources.food    ?? Resources.food;
                Resources.diamond = village.resources.diamond ?? Resources.diamond;
            }

            // Loot Cart: hujumdan so'ng qaytarilgan resurslarni ko'rsat
            if (village.loot_cart?.gold > 0 || village.loot_cart?.food > 0) {
                setTimeout(() => this._showLootCart(village.loot_cart), 2000);
            }

            return true;
        } catch { return false; }
    },

    _showLootCart(cart) {
        const existing = document.getElementById('loot-cart-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'loot-cart-modal';
        modal.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:linear-gradient(160deg,#1a1200,#2a1800);
            border:2px solid #ff9800;border-radius:14px;
            padding:18px 22px;z-index:99999;min-width:240px;max-width:300px;
            box-shadow:0 0 40px rgba(255,152,0,0.3);text-align:center;
        `;
        const goldTxt = cart.gold > 0 ? `🪙 +${Helpers.formatNumber(cart.gold)}` : '';
        const foodTxt = cart.food > 0 ? `🍎 +${Helpers.formatNumber(cart.food)}` : '';
        modal.innerHTML = `
            <div style="font-size:32px;margin-bottom:8px;">🛒</div>
            <div style="font-size:15px;font-weight:bold;color:#ff9800;margin-bottom:6px;">Loot Aravasi!</div>
            <div style="font-size:12px;color:#aaa;margin-bottom:12px;">
                Hujum paytida himoyalangan resurslar
            </div>
            <div style="font-size:20px;font-weight:bold;color:#fff;margin-bottom:14px;">
                ${[goldTxt, foodTxt].filter(Boolean).join('  ')}
            </div>
            <button onclick="Login._collectLootCart()"
                    style="width:100%;padding:10px;background:linear-gradient(to bottom,#e65100,#bf360c);
                           border:none;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;cursor:pointer;">
                📦 Yig'ish
            </button>
        `;
        document.body.appendChild(modal);
    },

    async _collectLootCart() {
        try {
            const result = await Api.collectLootCart();
            if (result.gold > 0) Resources.add('gold', result.gold);
            if (result.food > 0) Resources.add('food', result.food);
            document.getElementById('loot-cart-modal')?.remove();
            Toast.show(`🛒 Yig'ildi: 🪙${Helpers.formatNumber(result.gold)} 🍎${Helpers.formatNumber(result.food)}`, 'success', 3000);
        } catch {
            Toast.show('Yig\'ishda xato!', 'error');
        }
    },

    _updateBadge(name, trophies) {
        const badge = document.getElementById('profile-name-display');
        if (badge) badge.textContent = name || 'Mehmon';
        if (trophies !== null && trophies !== undefined) {
            const el = document.getElementById('trophy-count');
            if (el) el.textContent = trophies;
            BattleSystem.trophies = trophies;
            if (typeof BattleSystem.updateLeagueDisplay === 'function') BattleSystem.updateLeagueDisplay();
        }
    },

    _syncTimer: null,
    _profileTimer: null,
    _lastSeenDefence: null,

    async _checkOfflineAttacks() {
        try {
            const logs = await Api.getBattleLog();
            const defences = logs.filter(l => l.type === 'defence');
            if (defences.length === 0) return;

            const last = defences[0];
            const lastKey = 'tc_last_defence_' + (Api.getUserId() || 'me');
            const prevSeen = localStorage.getItem(lastKey);

            if (!prevSeen || last.id !== prevSeen) {
                localStorage.setItem(lastKey, last.id);
                const attName = last.attacker_name || 'Kimdir';
                const stars   = last.stars ?? 0;
                const lootG   = last.loot_gold ?? 0;
                const starsStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
                Toast.show(
                    `🛡️ ${attName} bazangizga hujum qildi! ${stars}⭐ — 🪙${Helpers.formatNumber(lootG)} o'g'irlandi`,
                    'warn', 6000
                );
                if (typeof NotificationSystem !== 'undefined') {
                    NotificationSystem.add('defence', `${attName} hujum qildi!`,
                        `${starsStr} | 🪙-${Helpers.formatNumber(lootG)}`, '🛡️');
                }
                // Badge on battle button
                LoginSystem._showAttackBadge();
            }
        } catch { /* silent */ }
    },

    _showAttackBadge() {
        const btn = document.getElementById('btn-battle');
        if (!btn) return;
        if (btn.querySelector('.attack-badge')) return;
        btn.style.position = 'relative';
        const badge = document.createElement('span');
        badge.className = 'attack-badge';
        badge.textContent = '!';
        btn.appendChild(badge);
    },

    clearAttackBadge() {
        const btn = document.getElementById('btn-battle');
        if (!btn) return;
        const badge = btn.querySelector('.attack-badge');
        if (badge) badge.remove();
    },

    _claimDailyReward() {
        if (typeof DailyRewardPanel !== 'undefined') {
            DailyRewardPanel.checkAndShow();
        }
    },

    _startAutoSync() {
        if (this._syncTimer) clearInterval(this._syncTimer);
        // SaveSystem.startAutoSave() da backend sync ham bor — bu yerda alohida timer shart emas
        // Faqat profile (trophy) ni har 30s da yangilaymiz
        this._profileTimer = setInterval(async () => {
            if (!Api.isLoggedIn()) return;
            try {
                const p = await Api.getMe();
                this._updateBadge(p.display_name, p.trophies);
                BattleSystem.trophies = p.trophies;
                if (p.shield_until) BattleSystem.setShieldFromISO(p.shield_until);
                else { BattleSystem.shieldUntil = 0; if (typeof ShieldHUD !== 'undefined') ShieldHUD.update(); }
            } catch { /* silent */ }
        }, 30_000);
    },
};

