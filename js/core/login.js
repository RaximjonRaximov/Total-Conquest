// ============================================
// LOGIN SYSTEM - Avtorizatsiya mantiqlari
// ============================================

const LoginSystem = {
    init() {
        DatabaseSystem.init();

        if (DatabaseSystem.checkLogin()) {
            // Tizimga kirgan bo'lsa
            this.hideLoginScreen();
            this.updateProfileBadge();
            return true; // Game davom etishi mumkin
        } else {
            // Tizimga kirmagan bo'lsa
            this.showLoginScreen();
            return false; // Game to'xtab turadi
        }
    },

    showLoginScreen() {
        const overlay = document.getElementById('login-screen');
        if (overlay) overlay.style.display = 'flex';
    },

    hideLoginScreen() {
        const overlay = document.getElementById('login-screen');
        if (overlay) overlay.style.display = 'none';
    },

    register() {
        const nameInput = document.getElementById('login-name').value;
        const ageInput = parseInt(document.getElementById('login-age').value);

        const result = DatabaseSystem.register(ageInput, nameInput);
        if (result.success) {
            this.hideLoginScreen();
            this.updateProfileBadge();
            
            Game.init();
            
            Toast.show(`Xush kelibsiz, ${DatabaseSystem.currentUser.name}!`, 'success');
        } else {
            alert(result.msg);
        }
    },

    updateProfileBadge() {
        if (!DatabaseSystem.currentUser) return;
        
        const badge = document.getElementById('profile-name-display');
        if (badge) {
            badge.textContent = DatabaseSystem.currentUser.name;
        }
    }
};
