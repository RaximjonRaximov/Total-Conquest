// ============================================
// ASOSIY GAME CLASS - O'yin boshqaruvchisi
// ============================================

const Game = {
    townHallLevel: 1,
    canvas: null,
    ctx: null,
    running: false,
    lastInfoUpdate: 0,
    lastArmyUpdate: 0,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Toast tizimini ishga tushirish
        Toast.init();

        // Tizimlarni ishga tushirish
        Grid.init();
        MapRenderer.init(this.canvas);
        MapRenderer.resize();
        Minimap.init();

        // Saqlangan o'yin bormi?
        const loaded = SaveSystem.load();
        if (loaded) {
            Toast.show('O\'yin yuklandi! Xush kelibsiz!', 'info');
        } else {
            // Boshlang'ich binolar
            BuildingManager.placeStarterBuildings();
        }

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
        TroopManager.updateCapacity();
        document.getElementById('th-display').textContent = 'Town Hall: Lvl ' + this.townHallLevel;

        // Auto-save boshlash
        SaveSystem.startAutoSave();

        // Sahifadan chiqishda saqlash
        window.addEventListener('beforeunload', () => {
            SaveSystem.save();
        });

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

        // Ghost bino (joylashtirish rejimida)
        BuildMenu.renderGhost(this.ctx);

        // Drag qilinayotgan bino
        BuildingRenderer.drawDragGhost(this.ctx);

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
            if (BuildMenu.locked) {
                coordEl.textContent += ' | ✅ Tasdiqlang yoki ❌ Bekor qiling';
            } else {
                coordEl.textContent += ' | 👆 Joyni tanlang...';
            }
        }

        // Drag rejimi ko'rsatkichi
        if (BuildingManager.dragging) {
            coordEl.textContent += ' | 🔄 Ko\'chirish...';
        }

        // Info panel yangilash (har 0.5s)
        const now = Date.now();
        if (now - this.lastInfoUpdate > 500) {
            this.lastInfoUpdate = now;
            InfoPanel.update();
        }

        // Army panel yangilash (har 1s)
        if (now - this.lastArmyUpdate > 1000) {
            this.lastArmyUpdate = now;
            ArmyPanel.update();
        }

        requestAnimationFrame(() => this.gameLoop());
    },

    _setupButtons() {
        // Qurish tugmasi
        document.getElementById('btn-build').onclick = () => {
            this._closeAllPanels();
            BuildMenu.toggle();
        };

        // Askar tugmasi
        document.getElementById('btn-army').onclick = () => {
            this._closeAllPanels();
            ArmyPanel.toggle();
        };

        // Ilm-fan (hozircha placeholder)
        document.getElementById('btn-research').onclick = () => this._showMessage('Ilm-fan tez orada...');

        // Ittifoq (hozircha placeholder)
        document.getElementById('btn-alliance').onclick = () => this._showMessage('Ittifoq tez orada...');

        // Jang (hozircha placeholder)
        document.getElementById('btn-battle').onclick = () => this._showMessage('Jang tizimi tez orada...');

        // Do'kon
        document.getElementById('btn-shop').onclick = () => {
            this._closeAllPanels();
            ShopPanel.toggle();
        };

        // Sozlamalar
        document.getElementById('btn-settings').onclick = () => {
            this._closeAllPanels();
            SettingsPanel.toggle();
        };

        // Overlay bosish — barcha menyularni yopish
        document.getElementById('modal-overlay').onclick = () => {
            this._closeAllPanels();
        };
    },

    _closeAllPanels() {
        BuildMenu.hide();
        if (ArmyPanel.visible) ArmyPanel.hide();
        if (ShopPanel.visible) ShopPanel.hide();
        if (SettingsPanel.visible) SettingsPanel.hide();
    },

    _showMessage(text) {
        Toast.show(text, 'info');
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
        'Askarlar saflanmoqda...',
        'Imperiya qurilmoqda...'
    ];

    const iv = setInterval(() => {
        progress += Math.random() * 18 + 6;
        if (progress > 100) progress = 100;

        loadBar.style.width = progress + '%';
        loadText.textContent = msgs[Math.min(Math.floor(progress / 22), msgs.length - 1)];

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
