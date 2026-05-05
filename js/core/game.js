// ============================================
// ASOSIY GAME CLASS - O'yin boshqaruvchisi
// ============================================

const Game = {
    mode: 'home', // 'home' | 'attack'
    townHallLevel: 1,
    canvas: null,
    ctx: null,
    running: false,
    lastInfoUpdate: 0,
    lastArmyUpdate: 0,
    lastBattleUpdate: 0,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Toast tizimini ishga tushirish
        Toast.init();
        AudioManager.init();

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
            // Boshlang'ich to'siqlar
            ObstacleManager.placeInitialObstacles();
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
        XPSystem.updateDisplay();
        BuilderSystem.updateDisplay();
        document.getElementById('th-display').textContent = 'Town Hall: Lvl ' + this.townHallLevel;

        // Auto-save boshlash
        SaveSystem.startAutoSave();

        // Sahifadan chiqishda saqlash
        window.addEventListener('beforeunload', () => {
            // Agar hujum rejimida bo'lsak, avval baza ma'lumotlarini tiklash
            if (BattleManager.active && BattleManager.playerBaseData) {
                BattleManager.returnHome();
            }
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

        if (this.mode === 'home') {
            // Resurs ishlab chiqarishni yangilash
            BuildingManager.updateProduction();
        } else if (this.mode === 'attack') {
            // Jangni yangilash
            BattleManager.update();
        }

        // Xaritani chizish
        MapRenderer.renderMap();

        // To'siqlarni chizish (binolardan oldin)
        ObstacleRenderer.renderAll(this.ctx);

        // Binolarni chizish
        BuildingRenderer.renderAll(this.ctx);

        if (this.mode === 'attack') {
            // Askarlar va snaryadlarni chizish
            BattleRenderer.renderAll(this.ctx);
        }

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

        if (this.mode === 'home') {
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
                ResearchPanel.update();
            }

            // Battle panel yangilash (har 1s)
            if (now - this.lastBattleUpdate > 1000) {
                this.lastBattleUpdate = now;
                BattlePanel.update();
            }
        }

        requestAnimationFrame(() => this.gameLoop());
    },
    // Barcha ma'lumotlarni o'chirib, o'yinni qaytadan boshlash
    fullReset() {
        if (!confirm("O'yin noldan boshlanadi. BARCHA ma'lumotlaringiz o'chadi!\n\nIshonchingiz komilmi?")) return;
        
        SaveSystem.stopAutoSave();
        
        // Hujum rejimida bo'lsa, avval uyga qaytish
        if (BattleManager.active) {
            BattleManager.returnHome();
        }
        
        // Joriy saqlash faylini o'chirish
        SaveSystem.deleteSave();
        
        // Database dan ham o'chirish
        if (typeof DatabaseSystem !== 'undefined') {
            DatabaseSystem.logout(true);
        }
        
        // Sahifani qaytadan yuklash
        location.reload();
    },

    _setupButtons() {
        // Restart tugmasi (fullReset onclick da, qo'shimcha handler shart emas)

        // Qurish tugmasi
        document.getElementById('btn-build').onclick = () => {
            AudioManager.playClick();
            this._closeAllPanels();
            BuildMenu.toggle();
        };

        // Askar tugmasi
        document.getElementById('btn-army').onclick = () => {
            AudioManager.playClick();
            this._closeAllPanels();
            ArmyPanel.toggle();
        };

        // Ilm-fan
        document.getElementById('btn-research').onclick = () => {
            AudioManager.playClick();
            this._closeAllPanels();
            ResearchPanel.toggle();
        };

        // Ittifoq
        document.getElementById('btn-alliance').onclick = () => {
            AudioManager.playClick();
            this._closeAllPanels();
            AlliancePanel.toggle();
        };

        // Jang
        document.getElementById('btn-battle').onclick = () => {
            AudioManager.playClick();
            this._closeAllPanels();
            BattlePanel.toggle();
        };

        // Do'kon
        document.getElementById('btn-shop').onclick = () => {
            AudioManager.playClick();
            this._closeAllPanels();
            ShopPanel.toggle();
        };

        // Sozlamalar
        document.getElementById('btn-settings').onclick = () => {
            AudioManager.playClick();
            this._closeAllPanels();
            SettingsPanel.toggle();
        };

        // Overlay bosish — barcha menyularni yopish
        document.getElementById('modal-overlay').onclick = () => {
            this._closeAllPanels();
        };

        // Quruvchi tugmasi
        const builderBtn = document.getElementById('builder-display');
        if (builderBtn) {
            builderBtn.onclick = () => {
                const cost = BuilderSystem.getNextBuilderCost();
                if (cost === null) {
                    Toast.show("Maksimal quruvchi soni!", "info");
                    return;
                }
                if (confirm(`Yangi quruvchi sotib olish: 💎 ${cost} olmos. Rozimisiz?`)) {
                    BuilderSystem.buyBuilder();
                }
            };
        }
    },

    _closeAllPanels() {
        BuildMenu.hide();
        if (ArmyPanel.visible) ArmyPanel.hide();
        if (ShopPanel.visible) ShopPanel.hide();
        if (SettingsPanel.visible) SettingsPanel.hide();
        if (BattlePanel.visible) BattlePanel.hide();
        if (ResearchPanel.visible) ResearchPanel.hide();
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
                
                const loggedIn = LoginSystem.init();
                if (loggedIn) {
                    Game.init();
                } else {
                    // Kutib turamiz, login.js dagi register() Game.init() ni chaqiradi
                    // Yo'q, register() ichiga Game.init() ni qo'shib qo'yamiz.
                }
            }, 400);
        }
    }, 180);
}

window.addEventListener('DOMContentLoaded', startLoading);
