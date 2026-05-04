// ============================================
// DO'KON (Shop) - Olmos paketi sotib olish
// ============================================

const ShopPanel = {
    visible: false,

    packages: [
        { id: 'starter', name: 'Boshlang\'ich to\'plam', icon: '💎', diamonds: 50, bonus: 0, price: '$0.99', color: '#4fc3f7' },
        { id: 'small', name: 'Kichik xazina', icon: '💎', diamonds: 200, bonus: 20, price: '$4.99', color: '#42a5f5' },
        { id: 'medium', name: 'O\'rta xazina', icon: '💎💎', diamonds: 500, bonus: 75, price: '$9.99', color: '#7e57c2' },
        { id: 'large', name: 'Katta xazina', icon: '💎💎💎', diamonds: 1200, bonus: 300, price: '$19.99', color: '#ab47bc', popular: true },
        { id: 'mega', name: 'MEGA xazina', icon: '👑💎', diamonds: 3000, bonus: 1000, price: '$49.99', color: '#ffa726' },
        { id: 'ultimate', name: 'IMPERATOR', icon: '👑👑', diamonds: 8000, bonus: 4000, price: '$99.99', color: '#ef5350' }
    ],

    toggle() {
        this.visible = !this.visible;
        const el = document.getElementById('shop-panel');
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
        document.getElementById('shop-panel').classList.remove('show');
        document.getElementById('modal-overlay').classList.remove('show');
    },

    render() {
        const panel = document.getElementById('shop-panel');
        if (!panel) return;

        let html = `
            <div class="shop-title">💎 DO'KON</div>
            <div class="shop-balance">Balansingiz: 💎 ${Helpers.formatNumber(Resources.diamond)}</div>
            <div class="shop-grid">
        `;

        for (const pkg of this.packages) {
            const totalGems = pkg.diamonds + pkg.bonus;
            html += `
                <div class="shop-item ${pkg.popular ? 'popular' : ''}" style="border-color: ${pkg.color}40" onclick="ShopPanel.buy('${pkg.id}')">
                    ${pkg.popular ? '<div class="shop-popular-tag">🔥 MASHHUR</div>' : ''}
                    <div class="shop-item-icon" style="color:${pkg.color}">${pkg.icon}</div>
                    <div class="shop-item-name">${pkg.name}</div>
                    <div class="shop-item-amount">💎 ${Helpers.formatNumber(totalGems)}</div>
                    ${pkg.bonus > 0 ? `<div class="shop-item-bonus">+${Helpers.formatNumber(pkg.bonus)} BONUS!</div>` : ''}
                    <div class="shop-item-price" style="background: ${pkg.color}">${pkg.price}</div>
                </div>
            `;
        }

        html += `</div>
            <div class="shop-special">
                <div class="shop-special-title">🎁 Bepul olmos</div>
                <div class="shop-free-items">
                    <div class="shop-free-btn" onclick="ShopPanel.claimDaily()">📅 Kunlik mukofot (+5 💎)</div>
                    <div class="shop-free-btn" onclick="ShopPanel.watchAd()">📺 Reklama ko'rish (+3 💎)</div>
                </div>
            </div>
        `;

        panel.innerHTML = html;
    },

    buy(packageId) {
        const pkg = this.packages.find(p => p.id === packageId);
        if (!pkg) return;

        // Demo uchun — haqiqiy to'lov yo'q, shunchaki qo'shamiz
        const totalGems = pkg.diamonds + pkg.bonus;
        Resources.add('diamond', totalGems);
        Toast.show(`💎 ${Helpers.formatNumber(totalGems)} olmos qo'shildi!`, 'reward');
        this.render();
    },

    claimDaily() {
        const lastClaim = localStorage.getItem('tc_daily_claim');
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (lastClaim && (now - parseInt(lastClaim)) < oneDay) {
            Toast.show('Kunlik mukofot allaqachon olingan!', 'warning');
            return;
        }

        localStorage.setItem('tc_daily_claim', now.toString());
        Resources.add('diamond', 5);
        Toast.show('📅 +5 olmos olindi!', 'reward');
        this.render();
    },

    watchAd() {
        // Demo — shunchaki beramiz
        Resources.add('diamond', 3);
        Toast.show('📺 +3 olmos olindi!', 'reward');
        this.render();
    }
};
