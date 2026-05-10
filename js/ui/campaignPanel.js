// ============================================
// KAMPANIYA PANELI — CoC/TC uslubida
// Single-player daraja xaritasi
// ============================================

const CampaignPanel = {
    visible: false,
    _selectedLevel: null,

    show() {
        if (this.visible) return;
        this.visible = true;
        this._render();
    },

    hide() {
        this.visible = false;
        const el = document.getElementById('campaign-overlay');
        if (el) {
            el.style.animation = 'campaignSlideOut 0.25s ease-in forwards';
            setTimeout(() => { if (el) el.style.display = 'none'; }, 260);
        }
    },

    toggle() {
        if (this.visible) this.hide();
        else this.show();
    },

    _render() {
        let overlay = document.getElementById('campaign-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'campaign-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.cssText = `
            position:fixed; inset:0; z-index:7000;
            background:linear-gradient(160deg,#0a1628,#0d2a1a,#1a2008);
            display:flex; flex-direction:column; overflow:hidden;
            animation:campaignSlideIn 0.28s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
        `;

        const progress = CampaignProgress.load();
        const totalStars = CampaignProgress.getTotalStars();
        const maxStars = CAMPAIGN_LEVELS.length * 3;
        const completedCount = Object.keys(progress).length;

        // ── Sarlavha ─────────────────────────────────────────────────────────
        const header = `
        <div style="flex-shrink:0;padding:12px 16px 8px;
                    background:linear-gradient(to bottom,rgba(0,0,0,0.6),transparent);
                    border-bottom:1px solid rgba(255,215,0,0.12);">
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <div style="font-size:18px;font-weight:900;color:#d4af37;font-family:'Cinzel',serif;
                                letter-spacing:1px;text-shadow:0 0 12px rgba(212,175,55,0.4);">
                        ⚔️ KAMPANIYA
                    </div>
                    <div style="font-size:10px;color:#888;margin-top:1px;">
                        ${completedCount}/${CAMPAIGN_LEVELS.length} daraja •
                        ⭐ ${totalStars}/${maxStars}
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <!-- Yulduz progress -->
                    <div style="text-align:right;">
                        <div style="font-size:11px;color:#ffd700;font-weight:700;">
                            ⭐ ${totalStars} / ${maxStars}
                        </div>
                        <div style="width:80px;height:4px;background:rgba(255,255,255,0.1);
                                    border-radius:2px;overflow:hidden;margin-top:2px;">
                            <div style="height:100%;width:${Math.round(totalStars/maxStars*100)}%;
                                        background:linear-gradient(90deg,#ffd700,#ff9800);border-radius:2px;"></div>
                        </div>
                    </div>
                    <button onclick="CampaignPanel.hide()"
                        style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                               color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;
                               cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>
            </div>
        </div>`;

        // ── Daraja xaritasi ───────────────────────────────────────────────────
        let mapHTML = `<div style="flex:1;overflow-y:auto;padding:16px 12px;
                                   scroll-behavior:smooth;
                                   -webkit-overflow-scrolling:touch;">`;

        // Mintaqalarga guruhlab ko'rsatish
        const regions = [];
        let currentRegion = null;
        for (const lvl of CAMPAIGN_LEVELS) {
            if (!currentRegion || currentRegion.name !== lvl.region) {
                currentRegion = { name: lvl.region, icon: lvl.regionIcon, levels: [] };
                regions.push(currentRegion);
            }
            currentRegion.levels.push(lvl);
        }

        for (const region of regions) {
            mapHTML += `
            <div style="margin-bottom:20px;">
                <div style="font-size:12px;font-weight:700;color:#aaa;letter-spacing:2px;
                            text-transform:uppercase;margin-bottom:10px;
                            display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">${region.icon}</span>
                    ${region.name}
                    <div style="flex:1;height:1px;background:rgba(255,255,255,0.08);margin-left:4px;"></div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">`;

            for (const lvl of region.levels) {
                const comp = progress[lvl.id];
                const unlocked = CampaignProgress.isUnlocked(lvl.id);
                const stars = comp?.stars || 0;

                const diffColors = [
                    '','#4caf50','#4caf50','#8bc34a','#ff9800','#ff9800',
                    '#ff5722','#ff5722','#f44336','#9c27b0','#d4af37'
                ];
                const diffColor = diffColors[Math.min(lvl.difficulty, 10)] || '#888';
                const diffLabel = ['','★','★★','★★','⚔','⚔⚔','⚔⚔⚔','💀','💀','☠','👑'][Math.min(lvl.difficulty, 10)];

                let starHTML = '';
                for (let i = 1; i <= 3; i++) {
                    starHTML += `<span style="color:${i <= stars ? '#ffd700' : 'rgba(255,255,255,0.15)'};font-size:14px;text-shadow:${i <= stars ? '0 0 6px #ffd700' : 'none'};">★</span>`;
                }

                const lootStr = `🪙${Helpers.formatNumber(Math.round((lvl.loot.gold[0]+lvl.loot.gold[1])/2))}`;

                mapHTML += `
                <div onclick="${unlocked ? `CampaignPanel.selectLevel(${lvl.id})` : ''}"
                     id="camp-lvl-${lvl.id}"
                     style="
                     display:flex;align-items:center;gap:12px;
                     background:${comp ? 'rgba(76,175,80,0.08)' : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)'};
                     border:1px solid ${comp ? 'rgba(76,175,80,0.25)' : unlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'};
                     border-radius:12px;padding:10px 12px;
                     cursor:${unlocked ? 'pointer' : 'default'};
                     opacity:${unlocked ? 1 : 0.45};
                     transition:background 0.15s,transform 0.1s;
                     ${unlocked ? 'active:transform:scale(0.98)' : ''}
                     ">
                    <!-- Daraja raqami -->
                    <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;
                                background:${unlocked ? `radial-gradient(circle at 35% 35%,${diffColor}88,${diffColor}33)` : 'rgba(255,255,255,0.06)'};
                                border:2px solid ${unlocked ? diffColor+'66' : 'rgba(255,255,255,0.1)'};
                                display:flex;align-items:center;justify-content:center;
                                font-size:13px;font-weight:900;color:${unlocked ? '#fff' : '#555'};
                                font-family:'Cinzel',serif;box-shadow:${comp ? '0 0 8px rgba(76,175,80,0.3)' : 'none'};">
                        ${unlocked ? lvl.id : '🔒'}
                    </div>

                    <!-- Ma'lumot -->
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                            <span style="font-size:12px;font-weight:700;color:${comp ? '#a5d6a7' : unlocked ? '#ddd' : '#555'};
                                         white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">
                                ${lvl.isBoss ? '👑 ' : ''}${lvl.name}
                            </span>
                            <span style="font-size:10px;color:${diffColor};font-weight:700;flex-shrink:0;">${diffLabel}</span>
                        </div>
                        <div style="font-size:9px;color:#666;margin-bottom:3px;
                                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${lvl.description}
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="font-size:10px;color:#888;">TH${lvl.thLevel}</div>
                            <div style="font-size:10px;color:#ffa040;">${lootStr}</div>
                            <div style="font-size:10px;color:#ce93d8;">+${lvl.xpReward} XP</div>
                        </div>
                    </div>

                    <!-- Yulduzlar -->
                    <div style="display:flex;gap:1px;flex-shrink:0;">${starHTML}</div>

                    ${unlocked && !comp ? `
                    <div style="background:linear-gradient(to bottom,#d4af37,#b8860b);
                                color:#000;font-size:10px;font-weight:900;
                                padding:6px 10px;border-radius:8px;flex-shrink:0;
                                font-family:'Cinzel',serif;">
                        ▶ HUJUM
                    </div>` : comp ? `
                    <div style="background:rgba(76,175,80,0.15);border:1px solid rgba(76,175,80,0.3);
                                color:#69f0ae;font-size:10px;font-weight:700;
                                padding:6px 10px;border-radius:8px;flex-shrink:0;">
                        ✓ BAJARILDI
                    </div>` : ''}
                </div>`;
            }

            mapHTML += `</div></div>`;
        }

        mapHTML += `</div>`;

        overlay.innerHTML = header + mapHTML;

        // Hover effektlari
        for (const lvl of CAMPAIGN_LEVELS) {
            if (!CampaignProgress.isUnlocked(lvl.id)) continue;
            const el = document.getElementById(`camp-lvl-${lvl.id}`);
            if (!el) continue;
            el.addEventListener('mouseover', () => { el.style.background = 'rgba(255,255,255,0.08)'; el.style.transform = 'translateX(2px)'; });
            el.addEventListener('mouseout',  () => {
                const comp = !!progress[lvl.id];
                el.style.background = comp ? 'rgba(76,175,80,0.08)' : 'rgba(255,255,255,0.04)';
                el.style.transform = '';
            });
        }
    },

    selectLevel(levelId) {
        const lvl = CAMPAIGN_LEVELS.find(l => l.id === levelId);
        if (!lvl) return;
        if (!CampaignProgress.isUnlocked(levelId)) return;

        // Jang uchun askar bormi?
        if (typeof TroopManager !== 'undefined' && TroopManager.getTotal() === 0) {
            Toast.show('⚔️ Avval askar tayyorlang!', 'warning');
            return;
        }

        // AttackScreen orqali boshlash
        if (typeof AttackScreen !== 'undefined') {
            this.hide();
            setTimeout(() => AttackScreen.showCampaign(lvl), 280);
        }
    }
};

// CSS animatsiyalari (bir marta qo'shish)
(function() {
    if (document.getElementById('campaign-panel-css')) return;
    const style = document.createElement('style');
    style.id = 'campaign-panel-css';
    style.textContent = `
        @keyframes campaignSlideIn {
            from { opacity:0; transform:translateY(20px) scale(0.97); }
            to   { opacity:1; transform:translateY(0)    scale(1); }
        }
        @keyframes campaignSlideOut {
            from { opacity:1; transform:translateY(0); }
            to   { opacity:0; transform:translateY(12px); }
        }
    `;
    document.head.appendChild(style);
})();
