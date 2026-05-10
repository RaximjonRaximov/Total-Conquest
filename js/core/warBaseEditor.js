// ============================================
// WAR BASE EDITOR
// O'z urush bazasini alohida tahrirlash rejimi
// ============================================

const WarBaseEditor = {
    active: false,
    _savedVillage: null,
    _banner: null,

    _showBanner() {
        let banner = document.getElementById('war-base-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'war-base-banner';
            banner.style.cssText = `position:fixed;top:0;left:0;right:0;z-index:2000;
                background:linear-gradient(to right,rgba(33,150,243,0.9),rgba(0,100,200,0.9));
                padding:8px 16px;display:flex;align-items:center;justify-content:space-between;
                font-size:12px;color:#fff;font-weight:bold;backdrop-filter:blur(4px);`;
            document.body.appendChild(banner);
        }
        banner.innerHTML = `
            <div>🛡️ Urush Bazasi Tahrirlash Rejimi — binolarni istalgan joyga ko'chiring</div>
            <div style="display:flex;gap:8px;">
                <button onclick="WarBaseEditor.saveAndExit()"
                        style="background:rgba(76,175,80,0.8);border:none;color:#fff;padding:5px 12px;
                               border-radius:5px;cursor:pointer;font-size:11px;font-weight:bold;">
                    ✅ Saqlash
                </button>
                <button onclick="WarBaseEditor.exitWithoutSaving()"
                        style="background:rgba(244,67,54,0.8);border:none;color:#fff;padding:5px 12px;
                               border-radius:5px;cursor:pointer;font-size:11px;font-weight:bold;">
                    ❌ Bekor qilish
                </button>
            </div>`;
        this._banner = banner;
    },

    async saveAndExit() {
        // Joriy joylashuvni war base sifatida saqlash
        try {
            const buildings = Object.values(BuildingManager.buildings).map(b => ({
                id: b.id, type: b.type, x: b.x, y: b.y, level: b.level,
            }));
            const baseData = { buildings, saved_at: new Date().toISOString() };
            localStorage.setItem('tc_war_base', JSON.stringify(baseData));
            if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                await Api.saveWarBase(baseData);
            }
            Toast.show('🛡️ Urush bazasi saqlandi!', 'success');
        } catch (e) {
            Toast.show('⚠️ Saqlashda xatolik: ' + (e.message || 'unknown'), 'warn');
        }
        this._restoreVillage();
    },

    exitWithoutSaving() {
        Toast.show('❌ Urush bazasi o\'zgarishlari bekor qilindi', 'info');
        this._restoreVillage();
    },

    _restoreVillage() {
        if (this._savedVillage) {
            BuildingManager.buildings = JSON.parse(this._savedVillage.buildings);
            BuildingManager.nextId    = this._savedVillage.nextId;
            Grid.tiles                = JSON.parse(this._savedVillage.grid);
            this._savedVillage = null;
        }
        this.active = false;
        document.getElementById('war-base-banner')?.remove();
        this._banner = null;
    },

    // Tahrirlash rejimiga kirish
    enter() {
        if (this.active) return;
        if (typeof BattleManager !== 'undefined' && BattleManager.active) {
            Toast.show('Jang vaqtida tahrirlash mumkin emas!', 'warn');
            return;
        }
        // Joriy qishloqni saqlash (undo uchun)
        this._savedVillage = {
            buildings: JSON.stringify(BuildingManager.buildings),
            nextId:    BuildingManager.nextId,
            grid:      JSON.stringify(Grid.tiles),
        };
        this.active = true;
        this._showBanner();
        Toast.show('🛡️ Urush bazasi tahrirlash rejimi faol. Binolarni ko\'chiring!', 'info', 4000);
        AudioManager.playClick?.();
    },

    // ESC ile chiqish
    handleEscape() {
        if (!this.active) return false;
        // Custom modal — native confirm() o'rniga
        const ov = document.createElement('div');
        ov.id = '_wbe-esc-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);
            z-index:100020;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#0d1a20);
                        border:2px solid rgba(33,150,243,0.45);border-radius:16px;
                        padding:22px 24px;width:min(280px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(33,150,243,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:36px;margin-bottom:8px;">🛡️</div>
                <div style="font-size:14px;font-weight:800;color:#64b5f6;margin-bottom:8px;">Urush Bazasi</div>
                <div style="font-size:12px;color:#aaa;margin-bottom:18px;line-height:1.5;">
                    O'zgarishlarni saqlaysizmi?
                </div>
                <div style="display:flex;gap:8px;">
                    <button id="_wbe-discard"
                            style="flex:1;padding:10px;background:rgba(244,67,54,0.15);border:1px solid rgba(244,67,54,0.4);
                                   border-radius:9px;color:#ef9a9a;font-size:12px;font-weight:700;cursor:pointer;">❌ Bekor</button>
                    <button id="_wbe-save"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(76,175,80,0.5),rgba(56,142,60,0.35));
                                   border:1px solid rgba(76,175,80,0.55);border-radius:9px;
                                   color:#a5d6a7;font-size:12px;font-weight:800;cursor:pointer;">✅ Saqlash</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        document.getElementById('_wbe-discard').onclick = () => { ov.remove(); this.exitWithoutSaving(); };
        document.getElementById('_wbe-save').onclick    = () => { ov.remove(); this.saveAndExit(); };
        return true;
    },
};
