// ============================================
// SEASON PASS PANEL — CoC Battle Pass UI
// Horizontal scrollable tier track
// ============================================

const SeasonPassPanel = {
    _visible: false,

    show() {
        if (this._visible) { this.hide(); return; }
        this._visible = true;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick?.();
        this._mount();
    },

    hide() {
        this._visible = false;
        const el = document.getElementById('season-pass-panel');
        if (el) el.remove();
        const ov = document.getElementById('modal-overlay');
        if (ov) { ov.classList.remove('show'); ov.onclick = null; }
    },

    _mount() {
        let el = document.getElementById('season-pass-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'season-pass-panel';
            el.style.cssText = `
                position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
                z-index:20000;pointer-events:none;
            `;
            document.body.appendChild(el);
        }
        const ov = document.getElementById('modal-overlay');
        if (ov) { ov.classList.add('show'); ov.onclick = () => this.hide(); }
        this._render(el);
    },

    _render(wrapper) {
        const sp       = SeasonPass;
        const curTier  = sp.currentTier;   // tiers cleared so far
        const pct      = Math.round(sp.getTierProgress() * 100);
        const premium  = sp.premium;
        const msLeft   = sp.getSeasonTimeLeft();
        const daysLeft = Math.ceil(msLeft / 86400000);

        // Time left string
        const timeStr = daysLeft > 1 ? `${daysLeft} kun qoldi` : daysLeft === 1 ? '1 kun qoldi' : 'Tugadi';

        const totalTiers    = SEASON_PASS_TIERS.length;
        const claimableFree = SEASON_PASS_TIERS.filter((t, i) => i < curTier && !sp.claimedFree.includes(i)).length;
        const claimablePrem = premium
            ? SEASON_PASS_TIERS.filter((t, i) => i < curTier && !sp.claimedPremium.includes(i)).length : 0;

        wrapper.innerHTML = `
            <div style="
                pointer-events:auto;
                width:min(580px,96vw);
                background:linear-gradient(160deg,rgba(10,8,24,0.98),rgba(18,12,40,0.98));
                border:1px solid rgba(212,175,55,0.3);border-radius:18px;
                box-shadow:0 12px 48px rgba(0,0,0,0.8),0 0 0 1px rgba(212,175,55,0.08);
                overflow:hidden;max-height:92vh;display:flex;flex-direction:column;
            ">
                <!-- HEADER -->
                <div style="
                    background:linear-gradient(90deg,rgba(30,20,60,0.9),rgba(60,30,10,0.7));
                    padding:14px 18px 12px;
                    border-bottom:1px solid rgba(212,175,55,0.15);
                    flex-shrink:0;
                ">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:24px;">🏅</span>
                            <div>
                                <div style="font-family:'Cinzel',serif;font-weight:700;font-size:15px;color:#ffd700;">
                                    SEASON PASS
                                </div>
                                <div style="font-size:10px;color:#777;">⏰ ${timeStr} · ${curTier}/${totalTiers} bosqich</div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${!premium ? `
                            <button onclick="SeasonPassPanel._buyPremium()"
                                    style="background:linear-gradient(135deg,#d4af37,#ff8f00);
                                           border:none;border-radius:10px;padding:7px 14px;
                                           color:#000;font-weight:800;font-size:11px;cursor:pointer;
                                           box-shadow:0 2px 10px rgba(255,215,0,0.4);">
                                💎 Premium — 500
                            </button>` : `
                            <div style="background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.4);
                                        border-radius:10px;padding:5px 12px;font-size:11px;
                                        color:#ffd700;font-weight:700;">⭐ Premium</div>`}
                            <button onclick="SeasonPassPanel.hide()"
                                    style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                    </div>

                    <!-- Overall progress bar -->
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:8px;background:rgba(255,255,255,0.07);border-radius:4px;overflow:hidden;">
                            <div style="height:100%;width:${Math.round(curTier / totalTiers * 100)}%;
                                        background:linear-gradient(90deg,#7b1fa2,#ffd700);border-radius:4px;
                                        transition:width 0.6s ease;"></div>
                        </div>
                        <span style="font-size:10px;color:#ffd700;font-weight:700;min-width:32px;">${Math.round(curTier/totalTiers*100)}%</span>
                    </div>

                    <!-- Current tier XP bar -->
                    <div style="margin-top:6px;display:flex;align-items:center;gap:6px;">
                        <span style="font-size:9px;color:#888;">Tier ${curTier + 1} XP:</span>
                        <div style="flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#9c27b0,#e040fb);
                                        border-radius:3px;"></div>
                        </div>
                        <span style="font-size:9px;color:#9c27b0;">${pct}%</span>
                    </div>

                    <!-- Claimable badges -->
                    ${(claimableFree + claimablePrem) > 0 ? `
                    <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                        ${claimableFree > 0 ? `<div style="background:rgba(255,183,0,0.15);border:1px solid rgba(255,183,0,0.3);
                            border-radius:20px;padding:3px 10px;font-size:10px;color:#ffb300;
                            animation:pulse 1s infinite;">📦 ${claimableFree} ta free mukofot!</div>` : ''}
                        ${claimablePrem > 0 ? `<div style="background:rgba(156,39,176,0.15);border:1px solid rgba(156,39,176,0.3);
                            border-radius:20px;padding:3px 10px;font-size:10px;color:#ce93d8;
                            animation:pulse 1s infinite;">💎 ${claimablePrem} ta premium mukofot!</div>` : ''}
                    </div>` : ''}
                </div>

                <!-- TRACK — horizontally scrollable -->
                <div style="overflow-x:auto;flex:1;padding:16px 16px 20px;
                            scrollbar-width:thin;scrollbar-color:rgba(212,175,55,0.3) transparent;">
                    <div style="display:flex;gap:0;min-width:max-content;align-items:flex-end;">
                        ${SEASON_PASS_TIERS.map((t, i) => this._tierCard(t, i, curTier, sp, premium)).join('')}
                    </div>
                </div>
            </div>
        `;

        // Auto-scroll to current tier
        setTimeout(() => {
            const track = wrapper.querySelector('[style*="overflow-x:auto"]');
            if (track) {
                const cardW = 76;
                track.scrollLeft = Math.max(0, (curTier - 3) * cardW);
            }
        }, 50);
    },

    _tierCard(tier, idx, curTier, sp, premium) {
        const unlocked = idx < curTier;
        const isCurrent = idx === curTier;
        const freeReward  = tier.free;
        const premReward  = tier.premium;

        const freeClaimed  = sp.claimedFree.includes(idx);
        const premClaimed  = sp.claimedPremium.includes(idx);

        const freeClaimable  = unlocked && !freeClaimed;
        const premClaimable  = unlocked && premium && !premClaimed;

        const isSpecial = tier.tier % 5 === 0;

        const tierBg = isCurrent
            ? 'rgba(212,175,55,0.12)'
            : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)';
        const tierBdr = isCurrent
            ? 'rgba(212,175,55,0.5)'
            : isSpecial ? 'rgba(156,39,176,0.4)' : 'rgba(255,255,255,0.06)';

        const rewardBox = (r, claimed, claimable, trackType) => {
            if (!r) return '<div style="height:52px;"></div>';
            const isPrem  = trackType === 'premium';
            const trackBg = isPrem
                ? (claimed ? 'rgba(80,40,100,0.4)' : claimable ? 'rgba(156,39,176,0.2)' : 'rgba(40,20,60,0.4)')
                : (claimed ? 'rgba(60,60,60,0.4)'  : claimable ? 'rgba(255,183,0,0.15)'  : 'rgba(255,255,255,0.04)');
            const trackBdr = isPrem
                ? (claimable ? 'rgba(156,39,176,0.7)' : 'rgba(80,40,100,0.3)')
                : (claimable ? 'rgba(255,183,0,0.6)'  : 'rgba(255,255,255,0.08)');

            const onclick = claimable
                ? `SeasonPassPanel._claim(${idx},'${trackType}')`
                : '';
            const glowAnim = claimable ? 'animation:achIconPulse 1.5s infinite;' : '';

            return `
                <div onclick="${onclick}"
                     style="width:64px;height:52px;border-radius:8px;
                            background:${trackBg};border:1px solid ${trackBdr};
                            display:flex;flex-direction:column;align-items:center;justify-content:center;
                            gap:2px;cursor:${claimable ? 'pointer' : 'default'};
                            ${glowAnim}
                            transition:all 0.2s;${isSpecial && isPrem ? 'box-shadow:0 0 10px rgba(156,39,176,0.3);' : ''}">
                    ${claimed
                        ? '<span style="font-size:18px;filter:grayscale(0.7);opacity:0.5;">✅</span>'
                        : SeasonPassPanel._rewardInnerHTML(r, isSpecial && isPrem, claimable, isPrem)}
                    ${claimable && !claimed ? '<span style="font-size:7px;color:' + (isPrem ? '#9c27b0' : '#ff8f00') + ';font-weight:800;">OLISH</span>' : ''}
                </div>`;
        };

        return `
            <div style="display:flex;flex-direction:column;align-items:center;width:76px;flex-shrink:0;">
                <!-- Tier number + connector -->
                <div style="display:flex;align-items:center;width:100%;margin-bottom:8px;position:relative;">
                    <div style="flex:1;height:2px;background:${idx === 0 ? 'transparent' : (unlocked ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.06)')};"></div>
                    <div style="width:${isSpecial ? '30' : '24'}px;height:${isSpecial ? '30' : '24'}px;
                                border-radius:50%;flex-shrink:0;
                                background:${isCurrent ? 'linear-gradient(135deg,#d4af37,#ff8f00)' : unlocked ? 'rgba(212,175,55,0.2)' : 'rgba(30,30,30,0.8)'};
                                border:2px solid ${tierBdr};
                                display:flex;align-items:center;justify-content:center;
                                font-size:${isSpecial ? '10' : '9'}px;font-weight:800;
                                color:${isCurrent ? '#000' : unlocked ? '#ffd700' : '#444'};
                                ${isSpecial ? 'box-shadow:0 0 8px rgba(156,39,176,0.4);' : ''}">
                        ${isSpecial ? '⭐' : tier.tier}
                    </div>
                    <div style="flex:1;height:2px;background:${unlocked && idx < curTier - 1 || (unlocked && idx < curTier) ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.06)'};" ></div>
                </div>

                <!-- Card -->
                <div style="padding:4px;background:${tierBg};border:1px solid ${tierBdr};
                            border-radius:10px;width:72px;box-sizing:border-box;
                            ${isCurrent ? 'box-shadow:0 0 12px rgba(212,175,55,0.2);' : ''}">

                    <!-- Premium row -->
                    <div style="font-size:8px;color:${premium ? '#ce93d8' : '#444'};
                                text-align:center;margin-bottom:3px;letter-spacing:0.5px;">
                        ${premium ? '⭐ PREMIUM' : '🔒 Premium'}
                    </div>
                    ${rewardBox(premReward, premClaimed, premClaimable, 'premium')}

                    <!-- Divider -->
                    <div style="height:1px;background:rgba(255,255,255,0.06);margin:4px 0;"></div>

                    <!-- Free row -->
                    <div style="font-size:8px;color:#aaa;text-align:center;margin-bottom:3px;">FREE</div>
                    ${rewardBox(freeReward, freeClaimed, freeClaimable, 'free')}
                </div>
            </div>`;
    },

    _claim(tierIdx, track) {
        if (typeof SeasonPass === 'undefined') return;
        let ok = false;
        if (track === 'free') ok = SeasonPass.claimFree(tierIdx);
        else ok = SeasonPass.claimPremium(tierIdx);

        if (ok) {
            if (typeof AudioManager !== 'undefined') AudioManager.playClick?.();
            const el = document.getElementById('season-pass-panel');
            if (el) this._render(el);
        }
    },

    _buyPremium() {
        if (typeof SeasonPass === 'undefined') return;
        SeasonPass.buyPremium();
        const el = document.getElementById('season-pass-panel');
        if (el) this._render(el);
    },

    // Helper: reward box inner HTML (item type support)
    _rewardInnerHTML(r, large, claimable, isPrem) {
        let icon, label;
        if (r.type === 'item') {
            const d = (typeof MAGIC_ITEM_DATA !== 'undefined' && MAGIC_ITEM_DATA[r.itemId]) || {};
            icon  = d.icon  || '⚗️';
            label = d.name  ? d.name.split(' ').slice(-1)[0] : 'Item';
        } else {
            icon  = r.icon;
            label = r.type === 'xp' ? ('+' + r.amount) : Helpers.formatNumber(r.amount);
        }
        const sz    = large ? '22' : '18';
        const color = claimable ? (isPrem ? '#ce93d8' : '#ffb300') : '#555';
        return '<span style="font-size:' + sz + 'px;">' + icon + '</span>'
             + '<span style="font-size:8px;color:' + color + ';font-weight:700;">' + label + '</span>';
    },
};
