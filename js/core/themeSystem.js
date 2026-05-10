// ============================================
// THEME SYSTEM — O'yin ko'rinish mavzulari
// ============================================

const THEMES = {
    classic: {
        name: 'Klassik',
        '--bg-primary':    '#0d1117',
        '--bg-secondary':  '#1a1f2e',
        '--bg-panel':      '#161b27',
        '--accent':        '#d4af37',
        '--accent-light':  '#ffd700',
        '--border':        'rgba(212,175,55,0.2)',
        '--hud-bg':        'rgba(0,0,0,0.85)',
    },
    blue: {
        name: 'Ko\'k',
        '--bg-primary':    '#0a1628',
        '--bg-secondary':  '#0e1f3d',
        '--bg-panel':      '#0c1a35',
        '--accent':        '#2196f3',
        '--accent-light':  '#64b5f6',
        '--border':        'rgba(33,150,243,0.25)',
        '--hud-bg':        'rgba(5,10,25,0.9)',
    },
    green: {
        name: 'Yashil',
        '--bg-primary':    '#0a1a0d',
        '--bg-secondary':  '#0f2414',
        '--bg-panel':      '#0c1e10',
        '--accent':        '#4caf50',
        '--accent-light':  '#81c784',
        '--border':        'rgba(76,175,80,0.25)',
        '--hud-bg':        'rgba(5,15,8,0.9)',
    },
    purple: {
        name: 'Binafsha',
        '--bg-primary':    '#0f0a1e',
        '--bg-secondary':  '#1a1030',
        '--bg-panel':      '#14092a',
        '--accent':        '#9c27b0',
        '--accent-light':  '#ce93d8',
        '--border':        'rgba(156,39,176,0.25)',
        '--hud-bg':        'rgba(8,5,18,0.9)',
    },
    dark: {
        name: 'Qora',
        '--bg-primary':    '#050505',
        '--bg-secondary':  '#111111',
        '--bg-panel':      '#0a0a0a',
        '--accent':        '#888888',
        '--accent-light':  '#cccccc',
        '--border':        'rgba(255,255,255,0.08)',
        '--hud-bg':        'rgba(0,0,0,0.95)',
    },
};

const ThemeSystem = {
    init() {
        const saved = localStorage.getItem('tc_theme') || 'classic';
        this.apply(saved);
    },

    apply(themeName) {
        const theme = THEMES[themeName] || THEMES.classic;
        const root = document.documentElement;
        for (const [prop, val] of Object.entries(theme)) {
            if (prop.startsWith('--')) root.style.setProperty(prop, val);
        }
        document.body.setAttribute('data-theme', themeName);
    },
};
