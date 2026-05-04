// ============================================
// ASOSIY GAME CLASS - O'yin boshqaruvchisi
// ============================================

const Game = {
    townHallLevel: 1,
    canvas: null,
    ctx: null,
    running: false,
    lastInfoUpdate: 0,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Tizimlarni ishga tushirish
        Grid.init();
        MapRenderer.init(this.canvas);
        MapRenderer.resize();
        Minimap.init();

        // Boshlang'ich binolar
        BuildingManager.placeStarterBuildings();

        // Kamerani markazga
        Camera.centerOn(Grid.SIZE / 2, Grid.SIZE / 2);

        // Inputni sozlash
        Input.setup(this.canvas);

        // Resize
        window.addEventListener('resize', () => {
            MapRenderer.resize();
            Minimap.resize();
        });

        // HUD tugmalarini ulash
        this._setupButtons();

        // Resurslarni ko'rsatish
        Resources.updateDisplay();
        document.getElementById('th-display').textContent = 'Town Hall: Lvl ' + this.townHallLevel;

        this.running = true;
        this.gameLoop();
    },

    gameLoop() {
        if (!this.running) return;

        // Kamerani yangilash
        Camera.update();

        // Timerlarni yangilash
        timerManager.update();

        // Resurs ishlab chiqarishni yangilash
        BuildingManager.updateProduction();

        // Xaritani chizish
        MapRenderer.renderMap();

        // Binolarni chizish
        BuildingRenderer.renderAll(this.ctx);

        // Minimap
        Minimap.render();

        // Koordinata ko'rsatkichi
        const coordEl = document.getElementById('coord-display');
        const mx = Input.mouse.tileX;
        const my = Input.mouse.tileY;
        if (mx >= 0 && mx < Grid.SIZE && my >= 0 && my < Grid.SIZE) {
            coordEl.textContent = `Tile: (${mx}, ${my})`;
        } else {
            coordEl.textContent = 'Tile: -';
        }

        // Qurish rejimi ko'rsatkichi
        if (BuildMenu.placing) {
            coordEl.textContent += ' | 📍 Joylashtirish...';
        }

        // Info panel yangilash (har 0.5s)
        const now = Date.now();
        if (now - this.lastInfoUpdate > 500) {
            this.lastInfoUpdate = now;
            InfoPanel.update();
        }

        requestAnimationFrame(() => this.gameLoop());
    },

    _setupButtons() {
        // Qurish tugmasi
        document.getElementById('btn-build').onclick = () => BuildMenu.toggle();

        // Boshqa tugmalar (hozircha placeholder)
        document.getElementById('btn-army').onclick = () => this._showMessage('Askarlar tizimi tez orada...');
        document.getElementById('btn-research').onclick = () => this._showMessage('Ilm-fan tez orada...');
        document.getElementById('btn-alliance').onclick = () => this._showMessage('Ittifoq tez orada...');
        document.getElementById('btn-battle').onclick = () => this._showMessage('Jang tizimi tez orada...');
        document.getElementById('btn-shop').onclick = () => this._showMessage('Do\'kon tez orada...');
        document.getElementById('btn-settings').onclick = () => this._showMessage('Sozlamalar tez orada...');

        // Overlay bosish — menyuni yopish
        document.getElementById('modal-overlay').onclick = () => BuildMenu.hide();
    },

    _showMessage(text) {
        const msg = document.createElement('div');
        msg.style.cssText = `
            position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
            background:rgba(20,28,50,0.95); border:1px solid rgba(212,175,55,0.5);
            border-radius:12px; padding:20px 30px; z-index:300;
            font-family:'Cinzel',serif; font-size:14px; color:#d4af37;
            text-align:center; backdrop-filter:blur(10px);
            box-shadow:0 8px 30px rgba(0,0,0,0.5);
        `;
        msg.textContent = text;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
    }
};

// ============================================
// LOADING VA ISHGA TUSHIRISH
// ============================================
function startLoading() {
    const loadBar = document.getElementById('loading-bar');
    const loadText = document.getElementById('loading-text');
    const loadScreen = document.getElementById('loading-screen');

    let progress = 0;
    const msgs = [
        'Xarita yuklanmoqda...',
        'Binolar tayyorlanmoqda...',
        'Rim legionlari yig\'ilmoqda...',
        'Imperiya qurilmoqda...'
    ];

    const iv = setInterval(() => {
        progress += Math.random() * 20 + 8;
        if (progress > 100) progress = 100;

        loadBar.style.width = progress + '%';
        loadText.textContent = msgs[Math.min(Math.floor(progress / 28), msgs.length - 1)];

        if (progress >= 100) {
            clearInterval(iv);

            setTimeout(() => {
                loadScreen.classList.add('hidden');
                setTimeout(() => loadScreen.remove(), 800);
                Game.init();
            }, 400);
        }
    }, 180);
}

window.addEventListener('DOMContentLoaded', startLoading);
