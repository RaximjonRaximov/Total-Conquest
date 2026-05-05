// ============================================
// ALLIANCE PANEL - Ittifoq UI
// ============================================

const AlliancePanel = {
    visible: false,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('alliance-panel');
        const overlay = document.getElementById('modal-overlay');
        
        if (!el) {
            this._createPanel();
            return this.toggle();
        }

        if (this.visible) {
            this.render();
            el.classList.add('show');
            overlay.classList.add('show');
        } else {
            el.classList.remove('show');
            overlay.classList.remove('show');
        }
    },

    hide() {
        this.visible = false;
        const el = document.getElementById('alliance-panel');
        if (el) el.classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'alliance-panel';
        panel.className = 'panel-container';
        document.body.appendChild(panel);
    },

    render() {
        const panel = document.getElementById('alliance-panel');
        if (!panel) return;

        const current = AllianceSystem.getCurrentData();

        let html = `
            <div class="panel-header">
                <div class="panel-title">🤝 ITTIFOQ</div>
                <div class="panel-close" onclick="AlliancePanel.hide()">✖</div>
            </div>
            <div class="panel-content">
        `;

        if (current) {
            // Ittifoq ichidagi ko'rinish
            html += `
                <div style="text-align:center; padding: 20px; background:rgba(255,255,255,0.05); border-radius:12px; margin-bottom:16px;">
                    <div style="font-size:32px; margin-bottom:10px;">🛡️</div>
                    <div style="font-size:24px; font-weight:700; color:#d4af37; margin-bottom:5px;">${current.name}</div>
                    <div style="color:#aaa; font-size:12px; margin-bottom:15px;">${current.description}</div>
                    
                    <div style="display:flex; justify-content:center; gap:20px; margin-bottom:20px; font-size:14px;">
                        <div>Daraja: <span style="color:#fff">${current.level}</span></div>
                        <div>A'zolar: <span style="color:#fff">${current.members + 1}/50</span></div>
                    </div>

                    <div class="btn btn-primary" onclick="AlliancePanel.requestTroops()" style="width:100%; margin-bottom:10px;">
                        🗡️ Askar So'rash
                    </div>
                    <div class="btn btn-danger" onclick="AlliancePanel.leave()" style="width:100%;">
                        🚪 Ittifoqni Tark Etish
                    </div>
                </div>
                
                <div style="padding: 10px; background:rgba(0,0,0,0.3); border-radius:8px; height:150px; overflow-y:auto; font-size:12px;">
                    <div style="color:#888; text-align:center; margin-bottom:10px;">Chat (Tez kunda)</div>
                    <div style="color:#aaa;"><i>*Tizim: Siz ittifoqqa qo'shildingiz.</i></div>
                </div>
            `;
        } else {
            // Ittifoq qidirish ko'rinishi
            html += `<div style="color:#aaa; font-size:13px; margin-bottom:16px; text-align:center;">Ittifoqqa qo'shiling va boshqalar bilan birgalikda o'ynang!</div>`;
            
            html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
            for (const a of ALLIANCES) {
                const canJoin = BattleSystem.trophies >= a.minTrophies && a.members < 50;
                
                html += `
                    <div style="display:flex; align-items:center; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                        <div style="font-size:24px; margin-right:15px;">🛡️</div>
                        <div style="flex:1;">
                            <div style="font-size:16px; font-weight:bold; color:#fff;">${a.name}</div>
                            <div style="font-size:11px; color:#aaa;">${a.members}/50 a'zo | ${a.minTrophies} 🏆 kerak</div>
                        </div>
                        <div>
                            <button class="btn ${canJoin ? 'btn-primary' : 'btn-disabled'}" 
                                    style="padding:6px 12px; font-size:12px;"
                                    onclick="${canJoin ? `AlliancePanel.join('${a.id}')` : ''}"
                                    ${!canJoin ? 'disabled' : ''}>
                                Qo'shilish
                            </button>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        }

        html += `</div>`;
        panel.innerHTML = html;
    },

    join(id) {
        if (AllianceSystem.join(id)) {
            this.render();
        }
    },

    leave() {
        if (AllianceSystem.leave()) {
            this.render();
        }
    },

    requestTroops() {
        AllianceSystem.requestTroops();
        this.render();
    }
};
