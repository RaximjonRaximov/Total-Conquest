// ============================================
// YORDAMCHI FUNKSIYALAR
// ============================================

const Helpers = {
    // Vaqtni formatlash (soniya -> "1s 30m 2h 1d")
    formatTime(seconds) {
        if (seconds <= 0) return 'Tayyor';
        if (seconds < 60) return Math.ceil(seconds) + 's';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
        return Math.floor(seconds / 86400) + 'd ' + Math.floor((seconds % 86400) / 3600) + 'h';
    },

    // Raqamni formatlash (1000 -> "1,000")
    formatNumber(num) {
        return Math.floor(num).toLocaleString();
    },

    // Olmos narxini hisoblash (qolgan vaqtga qarab)
    calcGemCost(remainingSeconds) {
        if (remainingSeconds <= 0) return 0;
        if (remainingSeconds <= 60) return 1;
        if (remainingSeconds <= 3600) return Math.ceil(remainingSeconds / 120);
        return Math.ceil(remainingSeconds / 360);
    },

    // Ikki nuqta orasidagi masofa
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Kvadrat masofa — sqrt yo'q, faqat solishtirish uchun (3-4x tezroq)
    distSq(x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    // Random butun son
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Clamp
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }
};
