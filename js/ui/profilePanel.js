// ============================================
// PROFILE PANEL - O'yinchi profili
// ============================================

const ProfilePanel = {
    visible: false,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('profile-panel');
        const overlay = document.getElementById('modal-overlay');
        
        if (!el) {
            this._createPanel();
            return this.toggle();
        }

        if (this.visible) {
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
            AudioManager.playClick();
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
        }
    },

    hide() {
        this.visible = false;
        const el = document.getElementById('profile-panel');
        if (el) el.classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'profile-panel';
        panel.className = 'panel-container';
        document.body.appendChild(panel);
    },

    render() {
        const panel = document.getElementById('profile-panel');
        if (!panel) return;

        const user = DatabaseSystem.currentUser;
        if (!user) return;

        const alliance = AllianceSystem.getCurrentData();
        const winCount = BattleSystem.battleLog.filter(l => l.victory).length;
        const lossCount = BattleSystem.battleLog.filter(l => !l.victory).length;

        let html = `
            <div class="panel-header">
                <div class="panel-title">👤 IMPERATOR PROFILI</div>
                <div class="panel-close" onclick="ProfilePanel.hide()">✖</div>
            </div>
            <div class="panel-content">
                <div style="background:linear-gradient(145deg, rgba(212,175,55,0.2), rgba(0,0,0,0.5)); border:1px solid rgba(212,175,55,0.4); padding:20px; border-radius:12px; margin-bottom:15px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:10px;">👑</div>
                    <div style="font-size:24px; font-weight:bold; color:#fff; font-family:'Cinzel',serif;">${user.name}</div>
                    <div style="color:#d4af37; font-size:14px; font-weight:bold; margin-bottom:10px;">Unvon: ${XPSystem.getRankName()}</div>
                    <div style="color:#aaa; font-size:12px;">Yoshi: ${user.age}</div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; text-align:center;">
                        <div style="font-size:20px; margin-bottom:5px;">🏆</div>
                        <div style="font-size:18px; font-weight:bold; color:#ffd700;">${BattleSystem.trophies}</div>
                        <div style="font-size:10px; color:#888;">Jami Kuboklar</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; text-align:center;">
                        <div style="font-size:20px; margin-bottom:5px;">⭐</div>
                        <div style="font-size:18px; font-weight:bold; color:#fff;">Daraja ${XPSystem.level}</div>
                        <div style="font-size:10px; color:#888;">Tajriba</div>
                    </div>
                </div>

                <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:8px; margin-bottom:15px;">
                    <div style="color:#fff; font-weight:bold; margin-bottom:10px;">Jang Statistikasi</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px;">
                        <span style="color:#888;">G'alabalar:</span>
                        <span style="color:#4caf50;">${winCount}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px;">
                        <span style="color:#888;">Mag'lubiyatlar:</span>
                        <span style="color:#f44336;">${lossCount}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px;">
                        <span style="color:#888;">Ittifoq:</span>
                        <span style="color:#d4af37;">${alliance ? alliance.name : 'Yo\'q'}</span>
                    </div>
                </div>

                <button onclick="DatabaseSystem.logout()" class="btn btn-danger" style="width:100%;">🚪 Boshqa Profilga Kirish</button>
            </div>
        `;
        panel.innerHTML = html;
    }
};
