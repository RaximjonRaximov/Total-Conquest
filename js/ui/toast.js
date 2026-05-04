// ============================================
// TOAST BILDIRISHNOMA TIZIMI
// Ekranning yuqori qismida xabar ko'rsatadi
// ============================================

const Toast = {
    container: null,

    init() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 62px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 500;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    },

    show(message, type = 'info', duration = 2500) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        const colors = {
            success: { bg: 'rgba(46,125,50,0.92)', border: '#4caf50', icon: '✅' },
            error:   { bg: 'rgba(198,40,40,0.92)', border: '#f44336', icon: '❌' },
            warning: { bg: 'rgba(230,160,20,0.92)', border: '#ff9800', icon: '⚠️' },
            info:    { bg: 'rgba(30,40,70,0.92)', border: '#d4af37', icon: 'ℹ️' },
            reward:  { bg: 'rgba(60,40,10,0.92)', border: '#ffd700', icon: '🎁' }
        };
        const c = colors[type] || colors.info;

        toast.style.cssText = `
            background: ${c.bg};
            border: 1px solid ${c.border};
            border-radius: 10px;
            padding: 8px 18px;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            font-weight: 600;
            color: #fff;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: default;
            white-space: nowrap;
        `;
        toast.textContent = `${c.icon} ${message}`;

        this.container.appendChild(toast);

        // Animatsiya
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};
