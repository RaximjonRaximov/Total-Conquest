// ============================================
// TROPHY ROAD PANEL — CoC uslubida liga progressi
// ============================================

// Global — ikkala funksiya ham shu nusxani ishlatadi
window.LEAGUES_DATA = [
    { name: 'Bronza III',   icon: '🥉', min:    0, color: '#cd7f32', reward: { gold: 500,   diamond: 0  } },
    { name: 'Bronza II',    icon: '🥉', min:  200, color: '#cd7f32', reward: { gold: 800,   diamond: 0  } },
    { name: 'Bronza I',     icon: '🥉', min:  400, color: '#cd7f32', reward: { gold: 1200,  diamond: 1,  item: 'resource_potion' } },
    { name: 'Kumush III',   icon: '🥈', min:  600, color: '#c0c0c0', reward: { gold: 1800,  diamond: 2  } },
    { name: 'Kumush II',    icon: '🥈', min:  900, color: '#c0c0c0', reward: { gold: 2500,  diamond: 2  } },
    { name: 'Kumush I',     icon: '🥈', min: 1200, color: '#c0c0c0', reward: { gold: 3500,  diamond: 3,  item: 'builder_potion'  } },
    { name: 'Oltin III',    icon: '🏅', min: 1500, color: '#ffd700', reward: { gold: 5000,  diamond: 4  } },
    { name: 'Oltin II',     icon: '🏅', min: 1900, color: '#ffd700', reward: { gold: 7000,  diamond: 5,  item: 'training_potion' } },
    { name: 'Oltin I',      icon: '🏅', min: 2300, color: '#ffd700', reward: { gold: 10000, diamond: 6  } },
    { name: 'Kristall III', icon: '💎', min: 2800, color: '#7ecef2', reward: { gold: 15000, diamond: 8,  item: 'rune_gold'       } },
    { name: 'Kristall II',  icon: '💎', min: 3400, color: '#7ecef2', reward: { gold: 20000, diamond: 10 } },
    { name: 'Kristall I',   icon: '💎', min: 4000, color: '#7ecef2', reward: { gold: 28000, diamond: 12, item: 'book_building'   } },
    { name: 'Magistr III',  icon: '👑', min: 4700, color: '#ff9800', reward: { gold: 40000, diamond: 15 } },
    { name: 'Magistr II',   icon: '👑', min: 5400, color: '#ff9800', reward: { gold: 55000, diamond: 18, item: 'rune_food'       } },
    { name: 'Magistr I',    icon: '👑', min: 6100, color: '#ff9800', reward: { gold: 75000, diamond: 22, item: 'book_research'   } },
    { name: 'Chempion III', icon: '⚡', min: 7000, color: '#e040fb', reward: { gold: 100000, diamond: 28 } },
    { name: 'Chempion II',  icon: '⚡', min: 8000, color: '#e040fb', reward: { gold: 130000, diamond: 35, item: 'builder_potion' } },
    { name: 'Chempion I',   icon: '⚡', min: 9000, color: '#e040fb', reward: { gold: 170000, diamond: 45, item: 'book_building'  } },
    { name: 'Titan',        icon: '🔱', min: 10000, color: '#f44336', reward: { gold: 220000, diamond: 60, item: 'gem_potion'    } },
    { name: 'Afsona',       icon: '🌟', min: 15000, color: '#ff1744', reward: { gold: 350000, diamond: 100, item: 'book_research'} },
];

const TrophyRoadPanel = {
    _open: false,

    show() {
        AudioManager.playClick();
        let el = document.getElementById('trophy-road-panel');
        if (!el) {
            el = document.createElement('div');
            el.id = 'trophy-road-panel';
            document.body.appendChild(el);
        }
        el.innerHTML = this._buildHTML();
        el.style.display = 'flex';
        requestAnimationFrame(() => el.classList.add('trp-show'));

        this._open = true;

        // Hozirgi ligaga scroll
        requestAnimationFrame(() => {
            setTimeout(() => {
                const cur = el.querySelector('.trp-league-row.trp-current');
                if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 120);
        });
    },

    hide() {
        const el = document.getElementById('trophy-road-panel');
        if (!el) return;
        el.classList.remove('trp-show');
        setTimeout(() => { el.style.display = 'none'; }, 280);
        this._open = false;
    },

    _buildHTML() {
        const trophies  = (typeof BattleSystem !== 'undefined') ? (BattleSystem.trophies || 0) : 0;
        const curLeague = (typeof BattleSystem !== 'undefined') ? BattleSystem.getLeague(trophies) : { name: '?', icon: '?', color: '#aaa', min: 0 };
        const nxtLeague = (typeof BattleSystem !== 'undefined') ? BattleSystem.getNextLeague(trophies) : null;

        // Liga to'plamlari (har 3 liga = 1 "tier")
        const LEAGUES = window.LEAGUES_DATA;

        // Qaysi ligada ekanligimizni topamiz
        // findLastIndex fallback (eski brauzerlar uchun)
        let curIdx = 0;
        for (let i = 0; i < LEAGUES.length; i++) {
            if (trophies >= LEAGUES[i].min) curIdx = i;
            else break;
        }

        // Next milestone
        const nxtIdx = curIdx + 1 < LEAGUES.length ? curIdx + 1 : -1;
        const nxtMin = nxtIdx >= 0 ? LEAGUES[nxtIdx].min : null;
        const progress = nxtMin !== null
            ? Math.min(100, ((trophies - LEAGUES[curIdx].min) / (nxtMin - LEAGUES[curIdx].min)) * 100)
            : 100;

        // Header
        const headerHTML = `
            <div class="trp-header">
                <div class="trp-back-btn" onclick="TrophyRoadPanel.hide()">←</div>
                <div class="trp-title">🏆 LIGA YO'LI</div>
                <div class="trp-trophy-count">🏆 ${trophies.toLocaleString()}</div>
            </div>
            <div class="trp-current-card" style="border-color:${LEAGUES[curIdx].color}40;background:linear-gradient(135deg,${LEAGUES[curIdx].color}18,transparent);">
                <div class="trp-cc-icon">${LEAGUES[curIdx].icon}</div>
                <div class="trp-cc-info">
                    <div class="trp-cc-name" style="color:${LEAGUES[curIdx].color};">${LEAGUES[curIdx].name}</div>
                    <div class="trp-cc-sub">Hozirgi liga</div>
                    ${nxtMin !== null ? `
                    <div class="trp-progress-wrap">
                        <div class="trp-progress-track">
                            <div class="trp-progress-fill" style="width:${progress.toFixed(1)}%;background:${LEAGUES[curIdx].color};"></div>
                        </div>
                        <span class="trp-progress-label">${nxtMin - trophies} ta 🏆 kerak</span>
                    </div>` : `<div style="font-size:11px;color:#ffd700;">🏆 Eng yuqori liga!</div>`}
                </div>
            </div>
        `;

        // Liga qatorlari — pastdan yuqoriga
        const rows = [...LEAGUES].reverse().map((l, ri) => {
            const lIdx = LEAGUES.length - 1 - ri;
            const isUnlocked = trophies >= l.min;
            const isCurrent  = lIdx === curIdx;
            const isNext     = lIdx === nxtIdx;

            let rowClass = 'trp-league-row';
            if (isCurrent) rowClass += ' trp-current';
            else if (!isUnlocked) rowClass += ' trp-locked';
            else rowClass += ' trp-done';

            // Sinish chizig'i (tier o'zgarishi)
            let divider = '';
            if (ri > 0) {
                const prevL = [...LEAGUES].reverse()[ri - 1];
                const tierPrev = Math.floor((LEAGUES.length - ri) / 3);
                const tierCur  = Math.floor(lIdx / 3);
                if (tierCur !== Math.floor((LEAGUES.length - ri) / 3) + (ri > 0 ? 0 : 0)) {
                    // Xuddi liganin nomi o'zgarganda divider ko'rsatamiz
                    if (prevL.icon !== l.icon) {
                        divider = `<div class="trp-tier-divider" style="border-color:${l.color}40;"></div>`;
                    }
                }
            }

            const rewardBits = [];
            if (l.reward.gold  > 0) rewardBits.push(`🪙 ${Helpers.formatNumber(l.reward.gold)}`);
            if (l.reward.diamond > 0) rewardBits.push(`💎 ${l.reward.diamond}`);
            if (l.reward.item && typeof MAGIC_ITEM_DATA !== 'undefined' && MAGIC_ITEM_DATA[l.reward.item]) {
                rewardBits.push(`${MAGIC_ITEM_DATA[l.reward.item].icon}`);
            }

            const claimed = (typeof BattleSystem !== 'undefined') && (BattleSystem._claimedLeagues || []).includes(lIdx);
            const canClaim = isUnlocked && !claimed && (l.reward.gold > 0 || l.reward.diamond > 0 || l.reward.item);

            let rewardCol;
            if (!isUnlocked) {
                rewardCol = `<div class="trp-row-reward trp-reward-locked">
                    ${rewardBits.map(b => `<span style="color:#444">${b}</span>`).join('')}
                </div>`;
            } else if (claimed) {
                rewardCol = `<div class="trp-row-reward trp-reward-done">
                    <span style="font-size:16px;">✅</span>
                </div>`;
            } else if (canClaim) {
                rewardCol = `<div class="trp-row-reward">
                    <button onclick="TrophyRoadPanel.claimReward(${lIdx})"
                            style="background:linear-gradient(135deg,${l.color},${l.color}aa);
                                   border:none;border-radius:8px;padding:5px 10px;
                                   color:#000;font-weight:800;font-size:10px;cursor:pointer;
                                   box-shadow:0 2px 8px ${l.color}44;
                                   animation:boostIconPulse 1.5s ease-in-out infinite;">
                        🎁 Yig'ish<br>
                        <span style="font-size:9px;font-weight:700;">${rewardBits.join(' ')}</span>
                    </button>
                </div>`;
            } else {
                rewardCol = `<div class="trp-row-reward trp-reward-done">
                    ${rewardBits.map(b => `<span>${b}</span>`).join('')}
                </div>`;
            }

            return `${divider}
            <div class="${rowClass}" id="trp-row-${lIdx}">
                <div class="trp-row-left">
                    <div class="trp-row-icon" style="color:${isUnlocked?l.color:'#444'};filter:${!isUnlocked?'grayscale(1)':'none'};">${l.icon}</div>
                    <div class="trp-row-track">
                        <div class="trp-row-dot" style="background:${isUnlocked?l.color:'#333'};box-shadow:${isCurrent?`0 0 8px ${l.color}`:'none'};"></div>
                        ${lIdx > 0 ? `<div class="trp-row-line" style="background:${isUnlocked && lIdx <= curIdx ? l.color+'60' : '#1e1e2e'};"></div>` : ''}
                    </div>
                </div>
                <div class="trp-row-body">
                    <div class="trp-row-name" style="color:${isUnlocked?l.color:'#555'};">
                        ${l.name}
                        ${isCurrent ? '<span class="trp-cur-badge">● Hozir</span>' : ''}
                        ${isNext ? '<span class="trp-next-badge">↑ Keyingi</span>' : ''}
                    </div>
                    <div class="trp-row-min" style="color:${isUnlocked?'#777':'#444'};">
                        🏆 ${l.min.toLocaleString()}${l.min === 0 ? '' : '+'} dan
                    </div>
                </div>
                ${rewardCol}
            </div>`;
        }).join('');

        return `
            ${headerHTML}
            <div class="trp-scroll-area">${rows}</div>
        `;
    },

    claimReward(leagueIdx) {
        const LEAGUES = window.LEAGUES_DATA;
        const league = LEAGUES[leagueIdx];
        if (!league) return;

        // Check eligibility
        if (typeof BattleSystem === 'undefined') return;
        const trophies = BattleSystem.trophies || 0;
        if (trophies < league.min) { Toast.show('Hali bu ligaga yetmadingiz!', 'warn'); return; }
        if (!BattleSystem._claimedLeagues) BattleSystem._claimedLeagues = [];
        if (BattleSystem._claimedLeagues.includes(leagueIdx)) { Toast.show('Bu mukofot allaqachon yig\'ilgan!', 'warn'); return; }

        // Give reward
        BattleSystem._claimedLeagues.push(leagueIdx);
        if (league.reward.gold > 0) Resources.add('gold', league.reward.gold);
        if (league.reward.diamond > 0) Resources.add('diamond', league.reward.diamond);
        // Magic Item reward
        if (league.reward.item && typeof MagicItems !== 'undefined') {
            MagicItems.add(league.reward.item, 1);
        }

        // Toast
        const parts = [];
        if (league.reward.gold > 0) parts.push(`🪙 +${Helpers.formatNumber(league.reward.gold)}`);
        if (league.reward.diamond > 0) parts.push(`💎 +${league.reward.diamond}`);
        if (league.reward.item && typeof MAGIC_ITEM_DATA !== 'undefined' && MAGIC_ITEM_DATA[league.reward.item]) {
            const d = MAGIC_ITEM_DATA[league.reward.item];
            parts.push(`${d.icon} ${d.name}`);
        }
        Toast.show(`${league.icon} ${league.name} mukofoti yig\'ildi! ${parts.join(' ')}`, 'reward', 4000);
        if (typeof AudioManager !== 'undefined') AudioManager.playSuccess?.();

        // Re-render panel
        const el = document.getElementById('trophy-road-panel');
        if (el) el.innerHTML = this._buildHTML();
        if (typeof SaveSystem !== 'undefined') SaveSystem.save();
    },
};
