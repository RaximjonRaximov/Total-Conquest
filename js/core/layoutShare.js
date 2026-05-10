// ============================================
// LAYOUT SHARE — Base layout kodni eksport/import
// ============================================

const LayoutShare = {
    VERSION: 1,

    // Current village → compact share string
    export() {
        const buildings = Object.values(BuildingManager.buildings).map(b => ({
            t: b.type, x: b.x, y: b.y, l: b.level,
        }));
        const payload = { v: this.VERSION, b: buildings };
        try {
            return btoa(JSON.stringify(payload));
        } catch {
            return null;
        }
    },

    // Share string → building array (validates, does NOT apply)
    parse(code) {
        try {
            const raw = atob(code.trim());
            const payload = JSON.parse(raw);
            if (payload.v !== this.VERSION) throw new Error('Version mismatch');
            if (!Array.isArray(payload.b)) throw new Error('Invalid buildings');

            const buildings = payload.b
                .filter(b => b.t && typeof b.x === 'number' && typeof b.y === 'number')
                .map(b => ({
                    type: b.t, x: b.x, y: b.y, level: b.l || 1,
                }));

            if (buildings.length === 0) throw new Error('No valid buildings');
            return buildings;
        } catch (e) {
            return null;
        }
    },

    // Apply imported layout to current village
    apply(buildings) {
        if (!buildings || buildings.length === 0) return false;

        Grid.init();
        BuildingManager.buildings = {};
        BuildingManager.nextId = 1;

        for (const b of buildings) {
            const bd = BUILDING_DATA[b.type];
            if (!bd) continue;
            // Check grid bounds
            if (b.x < 0 || b.y < 0 || b.x + bd.size[0] > Grid.SIZE || b.y + bd.size[1] > Grid.SIZE) continue;
            // Check no overlap
            let blocked = false;
            for (let dx = 0; dx < bd.size[0] && !blocked; dx++) {
                for (let dy = 0; dy < bd.size[1] && !blocked; dy++) {
                    if (Grid.tiles[b.y + dy]?.[b.x + dx]) blocked = true;
                }
            }
            if (blocked) continue;

            const id = BuildingManager.nextId++;
            const lv = bd.levels[b.level] || bd.levels[1];
            BuildingManager.buildings[id] = {
                id, type: b.type, x: b.x, y: b.y, level: b.level,
                hp: lv.hp, maxHp: lv.hp,
                building: false, timerId: null,
                storedResource: 0, lastCollect: Date.now(),
            };
            Grid.occupy(b.x, b.y, bd.size[0], bd.size[1], id);
        }
        return true;
    },

    // Modal: export current village
    showExport() {
        const code = this.export();
        if (!code) { Toast.show('Export xatosi', 'error'); return; }
        this._showModal('📤 Bazani Ulashish', `
            <div style="font-size:11px;color:#aaa;margin-bottom:8px;">
                Bu kodni do'stingizga yuboring — u o'z qishlog'iga import qila oladi.
            </div>
            <textarea id="ls-code-out" readonly
                style="width:100%;box-sizing:border-box;background:rgba(0,0,0,0.4);
                       border:1px solid rgba(255,255,255,0.1);border-radius:8px;
                       color:#90caf9;font-size:10px;font-family:monospace;
                       padding:8px;resize:none;height:80px;">${code}</textarea>
            <div style="display:flex;gap:8px;margin-top:10px;">
                <button onclick="LayoutShare._copyCode()" class="btn btn-primary" style="flex:1;">📋 Nusxa olish</button>
                <button onclick="document.getElementById('layout-share-modal').remove()" class="btn" style="flex:1;">✕ Yopish</button>
            </div>
        `);
        setTimeout(() => document.getElementById('ls-code-out')?.select(), 100);
    },

    // Modal: import from code
    showImport() {
        this._showModal('📥 Bazani Import Qilish', `
            <div style="font-size:11px;color:#aaa;margin-bottom:8px;">
                Do'stingiz ulashgan kodni quyiga joylashtiring.
            </div>
            <textarea id="ls-code-in" placeholder="Base kodini bu yerga joylashtiring..."
                style="width:100%;box-sizing:border-box;background:rgba(0,0,0,0.4);
                       border:1px solid rgba(255,255,255,0.15);border-radius:8px;
                       color:#fff;font-size:10px;font-family:monospace;
                       padding:8px;resize:none;height:80px;"></textarea>
            <div id="ls-import-err" style="color:#ef9a9a;font-size:10px;min-height:14px;margin:4px 0;"></div>
            <div style="display:flex;gap:8px;margin-top:6px;">
                <button onclick="LayoutShare._doImport()" class="btn btn-primary" style="flex:1;">✅ Import qilish</button>
                <button onclick="document.getElementById('layout-share-modal').remove()" class="btn" style="flex:1;">✕ Bekor</button>
            </div>
        `);
    },

    _copyCode() {
        const el = document.getElementById('ls-code-out');
        if (!el) return;
        el.select();
        try {
            document.execCommand('copy');
            Toast.show('📋 Kod nusxalandi!', 'success');
        } catch {
            navigator.clipboard?.writeText(el.value).catch(() => {});
            Toast.show('📋 Clipboard ga nusxalandi!', 'success');
        }
    },

    _doImport() {
        const code = document.getElementById('ls-code-in')?.value?.trim() || '';
        const errEl = document.getElementById('ls-import-err');
        if (!code) { if (errEl) errEl.textContent = 'Kod kiritilmadi'; return; }

        const buildings = this.parse(code);
        if (!buildings) {
            if (errEl) errEl.textContent = '❌ Noto\'g\'ri kod yoki versiya mos kelmadi';
            return;
        }

        // Custom confirm modal
        const ov = document.createElement('div');
        ov.id = '_ls-confirm-modal';
        ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);
            z-index:100020;display:flex;align-items:center;justify-content:center;`;
        ov.innerHTML = `
            <div style="background:linear-gradient(160deg,#0d1117,#0d1a20);
                        border:2px solid rgba(33,150,243,0.45);border-radius:16px;
                        padding:22px 24px;width:min(280px,88vw);text-align:center;
                        box-shadow:0 0 36px rgba(33,150,243,0.15);
                        animation:popIn 0.25s cubic-bezier(.175,.885,.32,1.275) both;">
                <div style="font-size:36px;margin-bottom:8px;">📥</div>
                <div style="font-size:13px;font-weight:800;color:#64b5f6;margin-bottom:8px;">Layout Import</div>
                <div style="font-size:12px;color:#aaa;margin-bottom:6px;">
                    <strong style="color:#fff;">${buildings.length}</strong> ta bino import qilinadi.
                </div>
                <div style="font-size:10px;color:#666;margin-bottom:18px;">Joriy joylashuvingiz o'zgaradi.</div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('_ls-confirm-modal')?.remove()"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
                                   border-radius:9px;color:#aaa;font-size:12px;cursor:pointer;">Bekor</button>
                    <button id="_ls-import-ok"
                            style="flex:1;padding:10px;background:linear-gradient(135deg,#1e88e5,#1565c0);
                                   border:none;border-radius:9px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">✅ Import</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        document.getElementById('_ls-import-ok').onclick = () => {
            ov.remove();
            const ok = LayoutShare.apply(buildings);
            if (ok) {
                document.getElementById('layout-share-modal')?.remove();
                Toast.show(`✅ ${buildings.length} ta bino import qilindi!`, 'success');
            } else {
                const errEl2 = document.getElementById('ls-import-err');
                if (errEl2) errEl2.textContent = '❌ Import muvaffaqiyatsiz tugadi';
            }
        };
    },

    _showModal(title, body) {
        document.getElementById('layout-share-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'layout-share-modal';
        modal.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:linear-gradient(160deg,#0d1117,#1a1f2e);
            border:1px solid rgba(255,255,255,0.12);border-radius:14px;
            padding:18px 20px;z-index:99999;min-width:280px;max-width:340px;
            box-shadow:0 8px 40px rgba(0,0,0,0.6);
        `;
        modal.innerHTML = `
            <div style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:12px;">${title}</div>
            ${body}
        `;
        document.body.appendChild(modal);
    },
};
