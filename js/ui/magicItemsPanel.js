// ============================================
// MAGIC ITEMS PANEL — Sehrli buyumlar oynasi
// CoC-style consumable items UI
// ============================================

const MagicItemsPanel = {
    visible: false,

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('magic-items-panel');
        const ov = document.getElementById('modal-overlay');
        if (this.visible) {
            this._render();
            if (el) el.style.display = 'flex';
            if (ov) { ov.style.display = 'block'; ov.onclick = () => MagicItemsPanel.close(); }
        } else {
            this.close();
        }
    },

    close() {
        this.visible = false;
        const el = document.getElementById('magic-items-panel');
        const ov = document.getElementById('modal-overlay');
        if (el) el.style.display = 'none';
        if (ov) { ov.style.display = 'none'; ov.onclick = null; }
    },

    updateBadge() {
        const badge = document.getElementById('magic-items-badge');
        if (!badge || typeof MagicItems === 'undefined') return;
        const total = Object.values(MagicItems.inventory).reduce((s, n) => s + n, 0);
        badge.textContent = total > 0 ? total : '';
        badge.style.display = total > 0 ? 'flex' : 'none';
    },

    _render() {
        let el = document.getElementById('magic-items-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'magic-items-panel';
            el.style.cssText = `
                display:none;position:fixed;z-index:7500;
                top:50%;left:50%;transform:translate(-50%,-50%);
                background:linear-gradient(160deg,#131c2e,#0d1520);
                border:1px solid rgba(212,175,55,0.3);
                border-radius:20px;padding:0;width:340px;max-width:95vw;
                max-height:85vh;overflow:hidden;
                flex-direction:column;
                box-shadow:0 16px 60px rgba(0,0,0,0.85),0 0 0 1px rgba(255,255,255,0.04);
                font-family:'Inter',sans-serif;
            `;
            document.body.appendChild(el);
        }

        const items = typeof MAGIC_ITEM_DATA !== 'undefined' ? MAGIC_ITEM_DATA : {};
        const inv   = typeof MagicItems !== 'undefined' ? MagicItems.inventory : {};
        const totalItems = Object.values(inv).reduce((s, n) => s + n, 0);

        const RARITY_COLOR = {
            common: '#9e9e9e',
            rare:   '#2196f3',
            epic:   '#9c27b0',
        };

        let itemsHtml = '';
        for (const [id, data] of Object.entries(items)) {
            const count   = inv[id] || 0;
            const rColor  = RARITY_COLOR[data.rarity] || '#9e9e9e';
            const canUse  = count > 0;
            const activeBuilderPotion  = id === 'builder_potion'  && typeof MagicItems !== 'undefined' && MagicItems._builderPotionUntil > Date.now();
            const activeTrainingPotion = id === 'training_potion' && typeof MagicItems !== 'undefined' && MagicItems._trainingPotionUntil > Date.now();
            const isActive = activeBuilderPotion || activeTrainingPotion;

            itemsHtml += `
                <div style="
                    display:flex;align-items:center;gap:12px;
                    padding:11px 16px;
                    border-bottom:1px solid rgba(255,255,255,0.04);
                    background:${count > 0 ? 'rgba(255,255,255,0.025)' : 'transparent'};
                    transition:background 0.15s;
                " ${count > 0 ? 'onmouseover="this.style.background=\'rgba(255,255,255,0.05)\'"  onmouseout="this.style.background=\'rgba(255,255,255,0.025)\'"' : ''}>

                    <!-- Icon + rarity ring -->
                    <div style="position:relative;flex-shrink:0;">
                        <div style="
                            width:42px;height:42px;
                            background:rgba(255,255,255,0.06);
                            border:2px solid ${rColor}66;
                            border-radius:12px;
                            display:flex;align-items:center;justify-content:center;
                            font-size:22px;
                            ${isActive ? `box-shadow:0 0 12px ${rColor}88;border-color:${rColor};animation:pulse 1.5s ease-in-out infinite;` : ''}
                            ${count === 0 ? 'opacity:0.35;' : ''}
                        ">${data.icon}</div>
                        ${count > 0 ? `
                        <div style="
                            position:absolute;top:-5px;right:-5px;
                            background:${rColor};color:#fff;
                            font-size:9px;font-weight:800;
                            width:16px;height:16px;border-radius:50%;
                            display:flex;align-items:center;justify-content:center;
                            border:1.5px solid #0d1520;
                        ">${count}</div>` : ''}
                    </div>

                    <!-- Info -->
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
                            <span style="font-size:12px;font-weight:700;color:${count > 0 ? '#fff' : '#555'};">${data.name}</span>
                            <span style="font-size:8px;padding:1px 5px;border-radius:4px;
                                         background:${rColor}22;color:${rColor};border:1px solid ${rColor}44;
                                         text-transform:uppercase;letter-spacing:0.5px;">${data.rarity}</span>
                        </div>
                        <div style="font-size:10px;color:#888;line-height:1.3;">${data.desc}</div>
                        ${isActive ? `<div style="font-size:9px;color:#69f0ae;margin-top:2px;font-weight:600;">⚡ Aktiv!</div>` : ''}
                    </div>

                    <!-- Use button -->
                    ${canUse ? `
                    <button onclick="MagicItemsPanel._use('${id}')"
                            style="padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;
                                   background:linear-gradient(135deg,${rColor}33,${rColor}11);
                                   border:1px solid ${rColor}66;border-radius:8px;
                                   color:${rColor};white-space:nowrap;flex-shrink:0;
                                   transition:all 0.15s;"
                            onmouseover="this.style.background='${rColor}44'"
                            onmouseout="this.style.background='linear-gradient(135deg,${rColor}33,${rColor}11)'">
                        Ishlatish
                    </button>` : `
                    <div style="padding:6px 10px;font-size:10px;color:#444;
                                border:1px solid rgba(255,255,255,0.06);border-radius:8px;
                                white-space:nowrap;flex-shrink:0;">
                        —
                    </div>`}
                </div>
            `;
        }

        el.innerHTML = `
            <!-- Header -->
            <div style="
                display:flex;align-items:center;justify-content:space-between;
                padding:16px 20px 14px;
                border-bottom:1px solid rgba(255,255,255,0.07);
                background:linear-gradient(135deg,rgba(212,175,55,0.08),transparent);
            ">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:22px;">🧪</span>
                    <div>
                        <div style="font-size:14px;font-weight:800;color:#fff;letter-spacing:0.3px;">Sehrli Buyumlar</div>
                        <div style="font-size:10px;color:#888;">Jami: ${totalItems} ta buyum</div>
                    </div>
                </div>
                <div onclick="MagicItemsPanel.close()"
                     style="cursor:pointer;color:#666;font-size:18px;padding:4px 8px;
                            background:rgba(255,255,255,0.05);border-radius:8px;
                            transition:color 0.15s;"
                     onmouseover="this.style.color='#fff'"
                     onmouseout="this.style.color='#666'">✕</div>
            </div>

            <!-- Items list -->
            <div style="overflow-y:auto;max-height:calc(85vh - 80px);">
                ${itemsHtml || '<div style="padding:30px;text-align:center;color:#555;font-size:12px;">Hech qanday buyum yo\'q</div>'}

                <!-- Get items info -->
                <div style="
                    margin:12px 16px;padding:10px 14px;
                    background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.07);
                    border-radius:10px;
                ">
                    <div style="font-size:10px;color:#666;line-height:1.5;text-align:center;">
                        💡 Buyumlarni <b style="color:#aaa;">Season Pass</b>, <b style="color:#aaa;">Kunlik Mukofot</b>,
                        <b style="color:#aaa;">Tadqiqot</b> va <b style="color:#aaa;">Do'kon</b>dan olish mumkin.
                    </div>
                </div>
            </div>
        `;
    },

    _use(itemId) {
        if (typeof MagicItems === 'undefined') return;
        const data = MAGIC_ITEM_DATA[itemId];
        if (!data) return;

        // Confirm popup
        const old = document.getElementById('magic-use-confirm');
        if (old) old.remove();

        const pop = document.createElement('div');
        pop.id = 'magic-use-confirm';
        pop.style.cssText = `
            position:fixed;inset:0;z-index:9999;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
        `;
        pop.innerHTML = `
            <div style="
                background:linear-gradient(160deg,#1a2236,#0d1220);
                border:1px solid rgba(255,255,255,0.12);
                border-radius:18px;padding:24px;
                min-width:240px;max-width:280px;
                text-align:center;
                box-shadow:0 16px 50px rgba(0,0,0,0.85);
                font-family:'Inter',sans-serif;
                animation:popIn 0.2s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
            ">
                <div style="font-size:36px;margin-bottom:8px;">${data.icon}</div>
                <div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:4px;">${data.name}</div>
                <div style="font-size:11px;color:#aaa;margin-bottom:16px;line-height:1.5;">${data.desc}</div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('magic-use-confirm')?.remove()"
                            style="flex:1;padding:9px;font-size:12px;cursor:pointer;
                                   background:rgba(255,255,255,0.06);
                                   border:1px solid rgba(255,255,255,0.12);
                                   border-radius:10px;color:#888;">
                        Bekor
                    </button>
                    <button onclick="MagicItemsPanel._confirmUse('${itemId}');document.getElementById('magic-use-confirm')?.remove()"
                            style="flex:1;padding:9px;font-size:12px;font-weight:700;cursor:pointer;
                                   background:linear-gradient(135deg,rgba(118,196,66,0.3),rgba(76,175,80,0.15));
                                   border:1px solid rgba(118,196,66,0.5);
                                   border-radius:10px;color:#69f0ae;">
                        Ishlatish
                    </button>
                </div>
            </div>
        `;
        pop.addEventListener('click', e => { if (e.target === pop) pop.remove(); });
        document.body.appendChild(pop);
    },

    _confirmUse(itemId) {
        const ok = MagicItems.use(itemId);
        if (ok) {
            // Re-render panel if still open
            const el = document.getElementById('magic-items-panel');
            if (el && el.style.display !== 'none') this._render();
        }
    },
};
