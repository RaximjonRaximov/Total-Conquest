// ============================================
// API CLIENT — Backend bilan aloqa
// ============================================

const API_BASE = (() => {
    const meta = document.querySelector('meta[name="api-base"]');
    return meta ? meta.content : 'http://localhost:4000/api';
})();

const Api = {
    _accessToken:  null,
    _refreshToken: null,

    // ── Token management ────────────────────────────────────────────────────
    setTokens(access, refresh) {
        this._accessToken  = access;
        this._refreshToken = refresh;
        localStorage.setItem('tc_refresh', refresh);
    },

    loadStoredTokens() {
        this._refreshToken = localStorage.getItem('tc_refresh');
    },

    clearTokens() {
        this._accessToken  = null;
        this._refreshToken = null;
        localStorage.removeItem('tc_refresh');
        localStorage.removeItem('tc_user_id');
        localStorage.removeItem('tc_is_guest');
    },

    // ── HTTP yordamchi ───────────────────────────────────────────────────────
    async _request(method, path, body = null, retry = true, signal = undefined) {
        const headers = { 'Content-Type': 'application/json' };
        if (this._accessToken) headers['Authorization'] = `Bearer ${this._accessToken}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal,
        });

        // Token muddati o'tgan — refresh qilish
        if (res.status === 401 && retry && this._refreshToken) {
            const refreshed = await this._refresh();
            if (refreshed) return this._request(method, path, body, false);
            this.clearTokens();
            window.dispatchEvent(new Event('tc:logout'));
            throw new Error('SESSION_EXPIRED');
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err });
        }

        return res.status === 204 ? null : res.json();
    },

    async _refresh() {
        if (!this._refreshToken) return false;
        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ refresh_token: this._refreshToken }),
            });
            if (!res.ok) return false;
            const { accessToken, refreshToken } = await res.json();
            this.setTokens(accessToken, refreshToken);
            return true;
        } catch {
            return false;
        }
    },

    // ── Auth ─────────────────────────────────────────────────────────────────
    async loginWithGoogle(idToken) {
        const data = await this._request('POST', '/auth/google', { id_token: idToken });
        this.setTokens(data.accessToken, data.refreshToken);
        localStorage.setItem('tc_user_id', data.user_id);
        localStorage.setItem('tc_is_guest', 'false');
        return data;
    },

    async loginWithGoogleAccessToken(accessToken) {
        const data = await this._request('POST', '/auth/google-token', { access_token: accessToken });
        this.setTokens(data.accessToken, data.refreshToken);
        localStorage.setItem('tc_user_id', data.user_id);
        localStorage.setItem('tc_is_guest', 'false');
        return data;
    },

    async loginAsGuest() {
        // Qurilma ID ni serverga yuborish — bir xil qurilmada saqlanishni ta'minlash
        const deviceId = localStorage.getItem('tc_device_id') || null;
        const data = await this._request('POST', '/auth/guest', { device_id: deviceId });
        this.setTokens(data.accessToken, data.refreshToken);
        localStorage.setItem('tc_user_id', data.user_id);
        localStorage.setItem('tc_is_guest', 'true');
        // Server device_id ni qaytarsa, saqlab qo'yamiz
        if (data.device_id) localStorage.setItem('tc_device_id', data.device_id);
        if (data.save_link) localStorage.setItem('tc_tg_link', data.save_link);
        return data;
    },

    async logout() {
        await this._request('DELETE', '/auth/logout').catch(() => {});
        this.clearTokens();
    },

    // ── Player ───────────────────────────────────────────────────────────────
    async getMe() {
        return this._request('GET', '/player/me');
    },

    async getMyRank() {
        return this._request('GET', '/player/me/rank');
    },

    async searchPlayers(query) {
        return this._request('GET', `/player/search?q=${encodeURIComponent(query)}`);
    },

    async updateProfile({ display_name, avatar_id } = {}) {
        return this._request('PATCH', '/player/me', { display_name, avatar_id });
    },

    // ── Village ──────────────────────────────────────────────────────────────
    async getMyVillage() {
        return this._request('GET', '/village/me');
    },

    async saveVillage(data) {
        return this._request('PUT', '/village/me', data);
    },

    async syncResources(gold, food, diamond) {
        const last_sync_at = localStorage.getItem('tc_last_sync') || undefined;
        const result = await this._request('POST', '/village/resources/sync', { gold, food, diamond, last_sync_at });
        localStorage.setItem('tc_last_sync', new Date().toISOString());
        return result;
    },

    async collectLootCart() {
        return this._request('POST', '/village/resources/collect-cart');
    },

    // ── Battle ───────────────────────────────────────────────────────────────
    async findOpponent(signal) {
        return this._request('POST', '/battle/find', null, true, signal);
    },

    async reportBattle(payload) {
        return this._request('POST', '/battle/report', payload);
    },

    async getBattleLog() {
        return this._request('GET', '/battle/log');
    },

    async getLeaderboard() {
        return this._request('GET', '/leaderboard');
    },

    async getAllianceLeaderboard() {
        return this._request('GET', '/alliance/leaderboard');
    },

    // ── Alliance ──────────────────────────────────────────────────────────────
    async getMyAlliance() {
        return this._request('GET', '/alliance/me');
    },

    async searchAlliances(query) {
        return this._request('GET', `/alliance/search?q=${encodeURIComponent(query)}`);
    },

    async createAlliance(data) {
        return this._request('POST', '/alliance', data);
    },

    async joinAlliance(id) {
        return this._request('POST', `/alliance/${id}/join`);
    },

    async leaveAlliance() {
        return this._request('DELETE', '/alliance/me');
    },

    async getAlliance(id) {
        return this._request('GET', `/alliance/${id}`);
    },

    async setMemberRole(userId, role) {
        return this._request('PATCH', `/alliance/members/${userId}/role`, { role });
    },

    async kickMember(userId) {
        return this._request('DELETE', `/alliance/members/${userId}`);
    },

    async transferLeader(toUserId) {
        return this._request('PATCH', '/alliance/transfer-leader', { to_user_id: toUserId });
    },

    async requestTroops(troopType, amount, message) {
        return this._request('POST', '/alliance/request-troops', { troop_type: troopType, amount, message: message || '' });
    },

    async getTroopRequests() {
        return this._request('GET', '/alliance/requests');
    },

    async donateTroops(requestId, amount) {
        return this._request('POST', `/alliance/donate/${requestId}`, { amount });
    },

    // ── Clan War ──────────────────────────────────────────────────────────────
    async getMyWar() {
        return this._request('GET', '/war/me');
    },

    async startWar() {
        return this._request('POST', '/war/start');
    },

    async saveWarBase(baseData) {
        return this._request('PUT', '/war/base', baseData);
    },

    async warAttack(defenderId, stars, destruction) {
        return this._request('POST', '/war/attack', { defender_id: defenderId, stars, destruction });
    },

    async getWarMemberBase(userId) {
        return this._request('GET', `/war/member/${encodeURIComponent(userId)}/base`);
    },

    // ── Alliance Chat ─────────────────────────────────────────────────────────
    async getAllianceChat(since) {
        const url = since ? `/alliance/chat?since=${encodeURIComponent(since)}` : '/alliance/chat';
        return this._request('GET', url);
    },

    async sendAllianceMessage(message) {
        return this._request('POST', '/alliance/chat', { message });
    },

    // ── Global Chat ───────────────────────────────────────────────────────────
    async getGlobalChat(since) {
        const url = since ? `/chat/global?since=${encodeURIComponent(since)}` : '/chat/global';
        return this._request('GET', url);
    },

    async sendGlobalMessage(message) {
        return this._request('POST', '/chat/global', { message });
    },

    // ── Ishlash holati ───────────────────────────────────────────────────────
    isLoggedIn() {
        return !!this._refreshToken;
    },

    isGuest() {
        return localStorage.getItem('tc_is_guest') === 'true';
    },

    getUserId() {
        return localStorage.getItem('tc_user_id');
    },
};

// ── Qo'shimcha yordamchilar ─────────────────────────────────────────────────
Api._restore = function() {
    Api.loadStoredTokens();
    return !!(Api._refreshToken && localStorage.getItem('tc_user_id'));
};

Api.clear = Api.clearTokens.bind(Api);

Api.checkServer = async function() {
    try {
        const base = API_BASE.replace(/\/api$/, '');
        const r = await fetch(`${base}/health`);
        return r.ok;
    } catch { return false; }
};

Api.getUserId = function() {
    return localStorage.getItem('tc_user_id');
};

Api._userId = null;

// Sahifa yuklanganida token'larni yuklash
Api.loadStoredTokens();
