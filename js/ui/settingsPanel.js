// ============================================
// SOZLAMALAR PANELI (Settings)
// ============================================

const SettingsPanel = {
    visible: false,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('settings-panel');
        const overlay = document.getElementById('modal-overlay');
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
        document.getElementById('settings-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    render() {
        const panel = document.getElementById('settings-panel');
        if (!panel) return;

        const lastSave = SaveSystem.getLastSaveTime();
        const lastSaveText = lastSave ? new Date(lastSave).toLocaleString('uz') : 'Saqlanmagan';
        const obstacleCount = Object.keys(ObstacleManager.obstacles).length;

        panel.innerHTML = `
            <div class="settings-title">⚙️ SOZLAMALAR</div>

            <div class="settings-section">
                <div class="settings-section-title">💾 Saqlash</div>
                <div class="settings-info">Oxirgi: ${lastSaveText}</div>
                <div class="settings-buttons">
                    <div class="settings-btn" onclick="SettingsPanel.saveGame()">💾 Saqlash</div>
                    <div class="settings-btn" onclick="SettingsPanel.loadGame()">📂 Yuklash</div>
                    <div class="settings-btn danger" onclick="SettingsPanel.resetGame()">🗑️ O'chirish</div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-section-title">📊 Statistika</div>
                <div class="settings-stat-grid">
                    <div class="settings-stat">
                        <span class="stat-label">Daraja</span>
                        <span class="stat-value">${XPSystem.level}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Unvon</span>
                        <span class="stat-value" style="font-size:10px">${XPSystem.getRankName()}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">XP</span>
                        <span class="stat-value">${Helpers.formatNumber(XPSystem.xp)}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Binolar</span>
                        <span class="stat-value">${Object.keys(BuildingManager.buildings).length}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">TH daraja</span>
                        <span class="stat-value">${Game.townHallLevel}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Askarlar</span>
                        <span class="stat-value">${TroopManager.getTotal()}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">🏆 Kubok</span>
                        <span class="stat-value">${BattleSystem.trophies}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">To'siqlar</span>
                        <span class="stat-value">${obstacleCount}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Quruvchi</span>
                        <span class="stat-value">${BuilderSystem.totalBuilders}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Oltin</span>
                        <span class="stat-value">${Helpers.formatNumber(Resources.gold)}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Olma</span>
                        <span class="stat-value">${Helpers.formatNumber(Resources.food)}</span>
                    </div>
                    <div class="settings-stat">
                        <span class="stat-label">Olmos</span>
                        <span class="stat-value">${Helpers.formatNumber(Resources.diamond)}</span>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-section-title">👷 Quruvchi</div>
                <div class="settings-info">Hozirgi: ${BuilderSystem.totalBuilders} ta quruvchi (${BuilderSystem.totalBuilders - BuilderSystem.busyBuilders} ta bo'sh)</div>
                ${BuilderSystem.getNextBuilderCost() !== null ? `
                    <div class="settings-buttons">
                        <div class="settings-btn" onclick="SettingsPanel.buyBuilder()">💎 ${BuilderSystem.getNextBuilderCost()} — Yangi quruvchi</div>
                    </div>
                ` : '<div class="settings-info" style="color:#4caf50">Maksimal quruvchi soni!</div>'}
            </div>

            <div class="settings-section">
                <div class="settings-section-title">🔊 Ovoz & Ko'rsatish</div>
                <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
                    <!-- Audio toggle -->
                    <div style="display:flex;align-items:center;justify-content:space-between;
                                padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px;
                                border:1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:16px;">${AudioManager.enabled ? '🔊' : '🔇'}</span>
                            <span style="font-size:12px;color:#ccc;">Ovoz effektlari</span>
                        </div>
                        <div onclick="SettingsPanel.toggleAudio()" style="cursor:pointer;
                             width:38px;height:20px;border-radius:10px;
                             background:${AudioManager.enabled ? 'linear-gradient(90deg,#4caf50,#66bb6a)' : 'rgba(255,255,255,0.12)'};
                             position:relative;transition:background 0.3s;">
                            <div style="position:absolute;top:2px;
                                        ${AudioManager.enabled ? 'right:2px' : 'left:2px'};
                                        width:16px;height:16px;border-radius:50%;
                                        background:#fff;transition:all 0.3s;
                                        box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
                        </div>
                    </div>

                    <!-- FPS / performance toggle -->
                    <div style="display:flex;align-items:center;justify-content:space-between;
                                padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px;
                                border:1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:16px;">⚡</span>
                            <span style="font-size:12px;color:#ccc;">Yuqori FPS rejimi</span>
                        </div>
                        <div onclick="SettingsPanel.toggleHighFPS()" style="cursor:pointer;
                             width:38px;height:20px;border-radius:10px;
                             background:${SettingsPanel._highFPS ? 'linear-gradient(90deg,#1e88e5,#42a5f5)' : 'rgba(255,255,255,0.12)'};
                             position:relative;transition:background 0.3s;">
                            <div style="position:absolute;top:2px;
                                        ${SettingsPanel._highFPS ? 'right:2px' : 'left:2px'};
                                        width:16px;height:16px;border-radius:50%;
                                        background:#fff;transition:all 0.3s;
                                        box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
                        </div>
                    </div>

                    <!-- Seasonal particles -->
                    <div style="display:flex;align-items:center;justify-content:space-between;
                                padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px;
                                border:1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:16px;">✨</span>
                            <span style="font-size:12px;color:#ccc;">Mavsumiy effektlar</span>
                        </div>
                        <div onclick="SettingsPanel.toggleParticles()" style="cursor:pointer;
                             width:38px;height:20px;border-radius:10px;
                             background:${SettingsPanel._particles !== false ? 'linear-gradient(90deg,#9c27b0,#ce93d8)' : 'rgba(255,255,255,0.12)'};
                             position:relative;transition:background 0.3s;">
                            <div style="position:absolute;top:2px;
                                        ${SettingsPanel._particles !== false ? 'right:2px' : 'left:2px'};
                                        width:16px;height:16px;border-radius:50%;
                                        background:#fff;transition:all 0.3s;
                                        box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-section-title">🎨 Ko'rinish</div>
                <div class="settings-buttons" style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${['classic','blue','green','purple','dark'].map(t => `
                        <div class="settings-btn ${SettingsPanel._getTheme()===t?'active':''}"
                             onclick="SettingsPanel.setTheme('${t}')"
                             style="${SettingsPanel._getTheme()===t?'border-color:#ffd700;color:#ffd700;':''};flex:1;min-width:80px;text-align:center;">
                            ${t==='classic'?'🏛️ Klassik':t==='blue'?'🌊 Ko\'k':t==='green'?'🌿 Yashil':t==='purple'?'💜 Binafsha':'🌑 Qora'}
                        </div>
                    `).join('')}
                </div>
            </div>

            ${typeof Api !== 'undefined' && Api.isLoggedIn() ? `
            <div class="settings-section">
                <div class="settings-section-title">👤 Hisob</div>
                <div class="settings-info">${Api.isGuest?.() ? 'Mehmon hisobi' : 'Google orqali kirdi'}</div>
                <div class="settings-buttons">
                    <div class="settings-btn" onclick="SettingsPanel.renamePrompt()">✏️ Ism O'zgartirish</div>
                    <div class="settings-btn danger" onclick="SettingsPanel.logoutAccount()">🚪 Chiqish</div>
                </div>
            </div>
            ` : ''}

            ${typeof PrestigeSystem !== 'undefined' ? `
            <div class="settings-section">
                <div class="settings-section-title">⭐ Prestige</div>
                <div class="settings-info">
                    ${PrestigeSystem.level > 0
                        ? `Darajangiz: ${PrestigeSystem.getLabel()} Prestige ${PrestigeSystem.level}`
                        : 'Prestige — TH10 ga yetganda qishloqni qayta boshlang va doimiy bonuslar oling'}
                </div>
                ${PrestigeSystem.level > 0 ? `
                    <div class="settings-stat-grid" style="margin-bottom:8px;">
                        <div class="settings-stat">
                            <span class="stat-label">Oltin</span>
                            <span class="stat-value">+${Math.round((PrestigeSystem.getGoldProdMult()-1)*100)}%</span>
                        </div>
                        <div class="settings-stat">
                            <span class="stat-label">Askar</span>
                            <span class="stat-value">+${PrestigeSystem.getTroopCapBonus()}</span>
                        </div>
                        <div class="settings-stat">
                            <span class="stat-label">Daraja</span>
                            <span class="stat-value">${PrestigeSystem.level}/${5}</span>
                        </div>
                    </div>
                ` : ''}
                ${PrestigeSystem.canPrestige() ? `
                    <div class="settings-buttons">
                        <div class="settings-btn" style="background:rgba(255,215,0,0.1);border-color:rgba(255,215,0,0.4);color:#ffd700;"
                             onclick="PrestigeSystem.promptPrestige();SettingsPanel.hide();">
                            ⭐ Prestige ${PrestigeSystem.level + 1} ga o'tish
                        </div>
                    </div>
                ` : PrestigeSystem.level < 5 ? `
                    <div class="settings-info" style="color:#666;">TH 10 ga yeting (hozir: TH ${Game.townHallLevel})</div>
                ` : '<div class="settings-info" style="color:#ffd700;">Maksimal prestige! 🌟</div>'}
            </div>
            ` : ''}

            <div class="settings-section">
                <div class="settings-section-title">ℹ️ Haqida</div>
                <div class="settings-about">
                    <div>Total Conquest — Rim Imperiyasi</div>
                    <div style="color:#888;font-size:10px;margin-top:4px">v2.0 | 2026</div>
                </div>
            </div>
        `;
    },

    _getTheme() {
        return localStorage.getItem('tc_theme') || 'classic';
    },

    setTheme(theme) {
        localStorage.setItem('tc_theme', theme);
        ThemeSystem.apply(theme);
        this.render();
    },

    _highFPS: localStorage.getItem('tc_highFPS') !== 'false',
    _particles: localStorage.getItem('tc_particles') !== 'false',

    toggleAudio() {
        AudioManager.toggle();
        AudioManager.playClick();
        this.render();
    },

    toggleHighFPS() {
        this._highFPS = !this._highFPS;
        localStorage.setItem('tc_highFPS', this._highFPS);
        // Apply: if low FPS mode, throttle render loop (placeholder — game.js can read this)
        if (typeof Game !== 'undefined') Game._highFPS = this._highFPS;
        AudioManager.playClick?.();
        this.render();
    },

    toggleParticles() {
        this._particles = this._particles === false ? true : false;
        localStorage.setItem('tc_particles', this._particles);
        // Disable seasonal particles in renderer
        if (typeof Renderer !== 'undefined') Renderer._particlesEnabled = this._particles;
        AudioManager.playClick?.();
        this.render();
    },

    buyBuilder() {
        BuilderSystem.buyBuilder();
        this.render();
    },

    saveGame() {
        const result = SaveSystem.save();
        if (result) {
            Toast.show('O\'yin saqlandi!', 'success');
            this.render();
        } else {
            Toast.show('Saqlashda xato!', 'error');
        }
    },

    loadGame() {
        if (!SaveSystem.hasSave()) {
            Toast.show('Saqlangan o\'yin topilmadi!', 'warning');
            return;
        }

        const result = SaveSystem.load();
        if (result) {
            Resources.updateDisplay();
            XPSystem.updateDisplay();
            BuilderSystem.updateDisplay();
            document.getElementById('th-display').textContent = 'Town Hall: Lvl ' + Game.townHallLevel;
            Toast.show('O\'yin yuklandi!', 'success');
            this.hide();
        } else {
            Toast.show('Yuklashda xato!', 'error');
        }
    },

    resetGame() {
        const ov = document.createElement('div');
        ov.id = '_sp-reset-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(5px);
            z-index:100020;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#100808,#1a0e0e);
                        border:2px solid rgba(244,67,54,0.55);border-radius:16px;
                        padding:24px;width:min(300px,88vw);text-align:center;
                        box-shadow:0 0 40px rgba(244,67,54,0.2);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:42px;margin-bottom:8px;">🗑️</div>
                <div style="font-size:14px;font-weight:800;color:#ef5350;margin-bottom:8px;">O'yinni Qayta Boshlash</div>
                <div style="font-size:12px;color:#aaa;margin-bottom:6px;line-height:1.5;">
                    Barcha ma'lumotlar o'chiriladi!
                </div>
                <div style="font-size:10px;color:#666;margin-bottom:18px;">
                    Binolar, askarlar, resurslar, kubok — hammasi yo'qoladi.
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_sp-reset-modal')?.remove()"
                            style="flex:1;padding:11px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_sp-reset-confirm"
                            style="flex:1;padding:11px;background:linear-gradient(135deg,rgba(244,67,54,0.5),rgba(183,28,28,0.4));
                                   border:1px solid rgba(244,67,54,0.6);border-radius:9px;
                                   color:#ef9a9a;font-size:12px;font-weight:800;cursor:pointer;">🗑️ O'chirish</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_sp-reset-confirm').onclick = () => {
            ov.remove();
            SaveSystem.deleteSave();
            location.reload();
        };
    },

    renamePrompt() {
        const current = document.getElementById('profile-name-display')?.textContent || '';
        const ov = document.createElement('div');
        ov.id = '_sp-rename-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100020;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a1a10);
                        border:2px solid rgba(212,175,55,0.45);border-radius:16px;
                        padding:22px 24px;width:min(290px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(212,175,55,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:14px;font-weight:800;color:#ffd700;margin-bottom:12px;">✏️ Ism O'zgartirish</div>
                <input id="_sp-rename-input" type="text" maxlength="32"
                       value="${current.replace(/"/g,'&quot;')}"
                       placeholder="Yangi ism (2-32 belgi)"
                       style="width:100%;box-sizing:border-box;padding:10px 12px;
                              background:rgba(255,255,255,0.07);border:1px solid rgba(212,175,55,0.35);
                              border-radius:9px;color:#fff;font-size:13px;outline:none;text-align:center;
                              margin-bottom:14px;">
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_sp-rename-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_sp-rename-confirm"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(212,175,55,0.4),rgba(180,130,20,0.3));
                                   border:1px solid rgba(212,175,55,0.55);border-radius:9px;
                                   color:#ffd700;font-size:12px;font-weight:800;cursor:pointer;">✅ Saqlash</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };

        const inp = document.getElementById('_sp-rename-input');
        inp.focus(); inp.select();
        inp.onkeydown = e => { if (e.key === 'Enter') document.getElementById('_sp-rename-confirm').click(); };

        document.getElementById('_sp-rename-confirm').onclick = async () => {
            const trimmed = inp.value.trim();
            if (trimmed.length < 2) { inp.style.borderColor = 'rgba(244,67,54,0.7)'; return; }
            if (!/^[a-zA-ZА-Яа-яЎўҚқҒғҲҳ0-9 _-]+$/.test(trimmed)) {
                Toast.show('Noto\'g\'ri belgilar', 'warn'); return;
            }
            ov.remove();
            if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                try {
                    await Api.updateProfile({ display_name: trimmed });
                    const badge = document.getElementById('profile-name-display');
                    if (badge) badge.textContent = trimmed;
                    Toast.show('✅ Ism o\'zgartirildi!', 'success');
                } catch (err) {
                    Toast.show('❌ ' + (err.data?.error || 'Xatolik'), 'warn');
                }
            } else {
                const badge = document.getElementById('profile-name-display');
                if (badge) badge.textContent = trimmed;
                Toast.show('✅ Ism o\'zgartirildi (local)', 'success');
            }
        };
    },

    logoutAccount() {
        const ov = document.createElement('div');
        ov.id = '_sp-logout-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
            z-index:100020;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#1a1520);
                        border:2px solid rgba(255,152,0,0.4);border-radius:16px;
                        padding:22px 24px;width:min(270px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(255,152,0,0.12);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:38px;margin-bottom:8px;">🚪</div>
                <div style="font-size:14px;font-weight:800;color:#ffa726;margin-bottom:8px;">Hisobdan Chiqish</div>
                <div style="font-size:12px;color:#aaa;margin-bottom:18px;">Hisobdan chiqmoqchimisiz?</div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_sp-logout-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_sp-logout-confirm"
                            style="flex:1;padding:10px;background:rgba(255,152,0,0.2);border:1px solid rgba(255,152,0,0.5);
                                   border-radius:9px;color:#ffa726;font-size:12px;font-weight:800;cursor:pointer;">🚪 Chiqish</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_sp-logout-confirm').onclick = async () => {
            ov.remove();
            if (typeof Api !== 'undefined') await Api.logout().catch(() => {});
            location.reload();
        };
    }
};
