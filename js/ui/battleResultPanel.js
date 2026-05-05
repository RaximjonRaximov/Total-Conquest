// ============================================
// JANG NATIJASI PANELI
// 3 yulduzli professional natija oynasi
// ============================================

const BattleResultPanel = {
    show(stars, percent, loot, trophyChange, xp, victory) {
        // Overlay yaratish
        const overlay = document.createElement('div');
        overlay.id = 'battle-result-overlay';
        overlay.className = 'battle-result-overlay active';
        
        const starsHtml = this._generateStarsHtml(stars);
        
        overlay.innerHTML = `
            <div class="result-card ${victory ? 'victory' : 'defeat'}">
                <div class="result-header">
                    <h1>${victory ? 'G\'ALABA!' : 'MAG\'LUBIYAT'}</h1>
                </div>
                
                <div class="stars-container">
                    ${starsHtml}
                </div>
                
                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-label">Vayron qilindi</span>
                        <span class="stat-value">${percent}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Trophies</span>
                        <span class="stat-value ${trophyChange >= 0 ? 'plus' : 'minus'}">${trophyChange >= 0 ? '+' : ''}${trophyChange} 🏆</span>
                    </div>
                </div>
                
                <div class="loot-section">
                    <h3>Yig'ilgan Loot</h3>
                    <div class="loot-grid">
                        <div class="loot-item">
                            <span class="loot-icon">🪙</span>
                            <span class="loot-amount">${Helpers.formatNumber(loot.gold)}</span>
                        </div>
                        <div class="loot-item">
                            <span class="loot-icon">🍎</span>
                            <span class="loot-amount">${Helpers.formatNumber(loot.food)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="xp-section">
                    <span class="xp-gain">+${xp} XP</span>
                </div>
                
                <button class="return-btn" onclick="BattleResultPanel.close()">UYGA QAYTISH</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Animatsiyalar uchun ozgina kechikish
        setTimeout(() => {
            const starEls = document.querySelectorAll('.star-anim');
            starEls.forEach((el, i) => {
                setTimeout(() => el.classList.add('active'), i * 300);
            });
        }, 500);
    },

    _generateStarsHtml(stars) {
        let html = '';
        for (let i = 1; i <= 3; i++) {
            const isActive = i <= stars;
            html += `
                <div class="star-slot">
                    <div class="star-anim ${isActive ? 'filled' : 'empty'}">
                        ${isActive ? '⭐' : '🌑'}
                    </div>
                </div>
            `;
        }
        return html;
    },

    close() {
        const overlay = document.getElementById('battle-result-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                // Jangdan chiqish va uyga qaytish
                BattleManager.active = false;
                BattleManager.ended = false;
                BattleManager.troops = [];
                BattleManager.projectiles = [];
                BattleRenderer.particles = [];
                Game.mode = 'home';
                SaveSystem.load(); // O'z bazasini qayta yuklash
                Camera.centerOn(Grid.SIZE / 2, Grid.SIZE / 2);
            }, 300);
        }
    }
};
