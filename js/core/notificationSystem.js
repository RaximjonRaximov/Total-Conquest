// ============================================
// NOTIFICATION SYSTEM — O'yin ichida bildirishnomalar
// ============================================

const NotificationSystem = {
    _notifications: [],
    _unreadCount: 0,
    _visible: false,

    init() {
        try {
            const raw = localStorage.getItem('tc_notifications');
            if (raw) {
                const d = JSON.parse(raw);
                this._notifications = d.notifications || [];
                // Mark old ones as read
                this._unreadCount = this._notifications.filter(n => !n.read).length;
            }
        } catch { /* ignore */ }
        this._updateBadge();
    },

    add(type, title, body, icon = '🔔') {
        const notif = {
            id:      Date.now() + Math.random(),
            type,
            title,
            body,
            icon,
            read:    false,
            time:    Date.now(),
        };
        this._notifications.unshift(notif);
        if (this._notifications.length > 30) this._notifications.pop();
        this._unreadCount++;
        this._save();
        this._updateBadge();
        return notif;
    },

    markAllRead() {
        for (const n of this._notifications) n.read = true;
        this._unreadCount = 0;
        this._save();
        this._updateBadge();
    },

    _save() {
        try {
            localStorage.setItem('tc_notifications', JSON.stringify({
                notifications: this._notifications.slice(0, 30),
            }));
        } catch { /* ignore */ }
    },

    _updateBadge() {
        const btn = document.getElementById('notif-bell-btn');
        if (!btn) return;
        const badge = btn.querySelector('.notif-badge');
        if (this._unreadCount > 0) {
            if (badge) {
                badge.textContent = this._unreadCount > 9 ? '9+' : this._unreadCount;
            } else {
                const b = document.createElement('span');
                b.className = 'notif-badge';
                b.style.cssText = 'position:absolute;top:-3px;right:-3px;background:#f44336;color:#fff;border-radius:50%;width:14px;height:14px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:bold;';
                b.textContent = this._unreadCount > 9 ? '9+' : this._unreadCount;
                btn.style.position = 'relative';
                btn.appendChild(b);
            }
        } else if (badge) {
            badge.remove();
        }
    },

    _timeAgo(ms) {
        const diff = Date.now() - ms;
        const m = Math.floor(diff / 60000);
        if (m < 1)  return 'Hozir';
        if (m < 60) return `${m}d oldin`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}s oldin`;
        return `${Math.floor(h / 24)}k oldin`;
    },

    toggle() {
        this._visible = !this._visible;
        const el = document.getElementById('notification-panel');
        if (this._visible) {
            if (!el) this._createPanel();
            else this._renderPanel(el);
            document.getElementById('notification-panel').style.display = 'block';
            this.markAllRead();
        } else {
            if (el) el.style.display = 'none';
        }
    },

    _createPanel() {
        const el = document.createElement('div');
        el.id = 'notification-panel';
        el.style.cssText = `
            position:fixed;top:55px;right:8px;width:280px;max-height:380px;
            background:linear-gradient(160deg,#0d1117,#1a2340);
            border:1px solid rgba(255,255,255,0.12);border-radius:12px;
            z-index:9990;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.5);
            animation:thUnlockPop 0.2s ease-out both;
        `;
        document.body.appendChild(el);
        this._renderPanel(el);
    },

    _renderPanel(el) {
        const list = this._notifications;

        // Type config
        const TYPE_CFG = {
            battle:      { icon: '⚔️', color: '#ef5350', label: 'Jang' },
            build:       { icon: '🏗️', color: '#ffd700', label: 'Qurilish' },
            achievement: { icon: '🏆', color: '#ffd700', label: 'Yutuq' },
            research:    { icon: '🔬', color: '#ce93d8', label: 'Tadqiqot' },
            alliance:    { icon: '🤝', color: '#64b5f6', label: 'Ittifoq' },
            reward:      { icon: '🎁', color: '#4caf50', label: 'Mukofot' },
            general:     { icon: '🔔', color: '#aaa',    label: 'Umumiy' },
        };

        const rowsHtml = list.length === 0
            ? `<div style="text-align:center;color:#555;padding:30px 16px;font-size:12px;">
                   <div style="font-size:28px;margin-bottom:8px;opacity:0.4;">🔔</div>
                   Hali bildirishnoma yo'q
               </div>`
            : list.slice(0, 25).map(n => {
                const cfg  = TYPE_CFG[n.type] || TYPE_CFG.general;
                const newDot = !n.read ? `<div style="width:6px;height:6px;border-radius:50%;
                    background:#ffd700;flex-shrink:0;margin-top:4px;
                    animation:pulse 1s infinite;"></div>` : `<div style="width:6px;"></div>`;

                return `
                    <div style="display:flex;align-items:flex-start;gap:8px;
                                padding:10px 12px;
                                border-bottom:1px solid rgba(255,255,255,0.05);
                                background:${!n.read ? `rgba(${cfg.color==='#ffd700'?'212,175,55':'255,255,255'},0.04)` : 'transparent'};
                                transition:background 0.2s;">
                        ${newDot}
                        <!-- Type icon circle -->
                        <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;
                                    background:rgba(255,255,255,0.06);border:1px solid ${cfg.color}40;
                                    display:flex;align-items:center;justify-content:center;
                                    font-size:15px;">${n.icon || cfg.icon}</div>

                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
                                <span style="font-size:11px;font-weight:700;color:#eee;
                                             white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">${n.title}</span>
                                <span style="font-size:8px;color:${cfg.color};background:${cfg.color}18;
                                             border-radius:8px;padding:1px 5px;flex-shrink:0;">${cfg.label}</span>
                            </div>
                            ${n.body ? `<div style="font-size:10px;color:#777;line-height:1.3;">${n.body}</div>` : ''}
                            <div style="font-size:9px;color:#444;margin-top:2px;">${this._timeAgo(n.time)}</div>
                        </div>
                    </div>`;
            }).join('');

        const unread = list.filter(n => !n.read).length;

        el.innerHTML = `
            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">🔔</span>
                    <span style="font-size:13px;font-weight:700;color:#fff;">Bildirishnomalar</span>
                    ${unread > 0 ? `<span style="background:#f44336;color:#fff;border-radius:10px;
                        padding:1px 7px;font-size:9px;font-weight:700;">${unread}</span>` : ''}
                </div>
                <div onclick="NotificationSystem.toggle()"
                     style="cursor:pointer;color:#666;font-size:16px;padding:2px 8px;
                            border-radius:6px;transition:background 0.2s;"
                     onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                     onmouseout="this.style.background='transparent'">✕</div>
            </div>

            <!-- List -->
            <div style="max-height:340px;overflow-y:auto;
                        scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.15) transparent;">
                ${rowsHtml}
            </div>

            <!-- Footer -->
            ${list.length > 0 ? `
            <div style="padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06);
                        display:flex;justify-content:center;">
                <button onclick="NotificationSystem._clearAll()"
                        style="background:none;border:1px solid rgba(255,255,255,0.1);
                               border-radius:8px;padding:5px 16px;
                               font-size:10px;color:#666;cursor:pointer;
                               transition:all 0.2s;"
                        onmouseover="this.style.borderColor='rgba(244,67,54,0.5)';this.style.color='#ef9a9a'"
                        onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.color='#666'">
                    🗑️ Hammasini tozalash
                </button>
            </div>` : ''}
        `;
    },

    _clearAll() {
        this._notifications = [];
        this._unreadCount = 0;
        this._save();
        const el = document.getElementById('notification-panel');
        if (el) this._renderPanel(el);
        this._updateBadge();
    },
};
