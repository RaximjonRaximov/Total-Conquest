// ============================================
// GLOBAL CHAT PANEL — Real-time xabar (polling)
// ============================================

const GlobalChatPanel = {
    _open: false,
    _messages: [],
    _lastTime: null,
    _pollInterval: null,
    _minimized: false,

    toggle() {
        if (this._open) {
            this.hide();
        } else {
            this.show();
        }
    },

    show() {
        AudioManager.playClick();
        this._open = true;
        this._minimized = false;
        let el = document.getElementById('global-chat-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'global-chat-panel';
            document.body.appendChild(el);
        }
        el.style.display = 'flex';
        this._render(el);
        this._startPolling();
        requestAnimationFrame(() => el.classList.add('gcp-show'));
    },

    hide() {
        this._open = false;
        this._stopPolling();
        const el = document.getElementById('global-chat-panel');
        if (el) {
            el.classList.remove('gcp-show');
            setTimeout(() => { if (el) el.style.display = 'none'; }, 250);
        }
    },

    minimize() {
        this._minimized = !this._minimized;
        const body = document.getElementById('gcp-body');
        const input = document.getElementById('gcp-input-row');
        if (body) body.style.display = this._minimized ? 'none' : 'flex';
        if (input) input.style.display = this._minimized ? 'none' : 'flex';
        const minBtn = document.getElementById('gcp-min-btn');
        if (minBtn) minBtn.textContent = this._minimized ? '▲' : '▼';
    },

    _render(el) {
        el.innerHTML = `
            <div class="gcp-header">
                <span class="gcp-title">🌍 Global Chat</span>
                <div style="display:flex;gap:4px;align-items:center;">
                    <div id="gcp-min-btn" onclick="GlobalChatPanel.minimize()"
                         style="width:22px;height:22px;background:rgba(255,255,255,0.08);border-radius:4px;
                                display:flex;align-items:center;justify-content:center;cursor:pointer;
                                font-size:11px;color:#aaa;">▼</div>
                    <div onclick="GlobalChatPanel.hide()"
                         style="width:22px;height:22px;background:rgba(255,255,255,0.08);border-radius:4px;
                                display:flex;align-items:center;justify-content:center;cursor:pointer;
                                font-size:14px;color:#888;">✕</div>
                </div>
            </div>
            <div id="gcp-body" class="gcp-body">
                <div id="gcp-messages" class="gcp-messages"></div>
            </div>
            <div id="gcp-input-row" class="gcp-input-row">
                <input id="gcp-input" type="text" placeholder="Xabar yozing..." maxlength="200"
                       onkeydown="if(event.key==='Enter')GlobalChatPanel.send()"
                       style="flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                              border-radius:6px;color:#fff;padding:6px 10px;font-size:12px;outline:none;" />
                <button onclick="GlobalChatPanel.send()"
                        style="background:linear-gradient(145deg,#1565c0,#0d47a1);border:none;color:#fff;
                               padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;
                               font-weight:bold;white-space:nowrap;">▶ Yuborish</button>
            </div>
        `;
        this._refreshMessages();
    },

    _renderMessages() {
        const container = document.getElementById('gcp-messages');
        if (!container) return;
        if (!this._messages.length) {
            container.innerHTML = `<div style="text-align:center;color:#555;padding:20px;font-size:11px;">Hali xabar yo'q. Birinchi bo'lib yozing!</div>`;
            return;
        }
        const myId = (typeof Api !== 'undefined') ? String(Api.getUserId()) : null;
        container.innerHTML = this._messages.map(m => {
            const isMe = myId && String(m.user_id) === myId;
            const league = typeof BattleSystem !== 'undefined' ? BattleSystem.getLeague(m.trophies || 0) : null;
            const timeStr = this._formatTime(m.created_at);
            return `
            <div class="gcp-msg ${isMe ? 'gcp-msg-me' : ''}">
                <div class="gcp-msg-meta">
                    <span class="gcp-msg-name" style="color:${isMe ? '#ffd700' : '#90caf9'};">
                        TH${m.th_level || '?'} ${(m.display_name || '?').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
                        ${league ? `<span style="color:${league.color};font-size:9px;">${league.icon}</span>` : ''}
                    </span>
                    <span class="gcp-msg-time">${timeStr}</span>
                </div>
                <div class="gcp-msg-text">${(m.message || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
            </div>`;
        }).join('');
        // Auto-scroll pastga
        container.scrollTop = container.scrollHeight;
    },

    async _refreshMessages() {
        if (!this._open) return;
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            // offline placeholder
            const container = document.getElementById('gcp-messages');
            if (container) container.innerHTML = `<div style="text-align:center;color:#555;padding:20px;font-size:11px;">Chat faqat online rejimda ishlaydi.</div>`;
            return;
        }
        try {
            const msgs = await Api.getGlobalChat(this._lastTime).catch(() => []);
            if (msgs && msgs.length > 0) {
                this._messages = msgs;
                this._lastTime = msgs[msgs.length - 1]?.created_at;
                this._renderMessages();
                // Badge tozalash
                const badge = document.getElementById('gcp-badge');
                if (badge) badge.style.display = 'none';
            }
        } catch { /* ignore */ }
    },

    _startPolling() {
        this._stopPolling();
        this._pollInterval = setInterval(() => {
            if (!this._open) { this._stopPolling(); return; }
            this._refreshMessages();
        }, 3000);
    },

    _stopPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
    },

    async send() {
        const input = document.getElementById('gcp-input');
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) return;
        if (typeof Api === 'undefined' || !Api.isLoggedIn()) {
            Toast.show('Chat uchun kirish talab qilinadi!', 'warn');
            return;
        }
        input.value = '';
        try {
            const sent = await Api.sendGlobalMessage(msg);
            if (sent) {
                // Xabarni darhol qo'shamiz
                this._messages.push(sent);
                if (this._messages.length > 60) this._messages.shift();
                this._renderMessages();
            }
        } catch (e) {
            const errMsg = e?.message || 'Xabar yuborilmadi';
            Toast.show(errMsg, 'error');
        }
    },

    _formatTime(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        const now = new Date();
        const diff = (now - d) / 1000;
        if (diff < 60) return 'Hozir';
        if (diff < 3600) return `${Math.floor(diff / 60)}d oldin`;
        return d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
    },
};
