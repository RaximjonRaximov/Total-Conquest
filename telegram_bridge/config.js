// ================================================
// TELEGRAM BRIDGE — SOZLAMALAR
// Faqat shu faylni o'zgartiring!
// ================================================

module.exports = {

    // 1. @BotFather dan olgan token
    BOT_TOKEN: '8632916484:AAEwtjtMkJ5GTiw_i-XXLwfzJGr1D1OOCq8',

    // 2. O'z Telegram user ID (https://t.me/userinfobot → /start)
    ALLOWED_USER_IDS: [818518622],   // bir nechta bo'lishi mumkin

    // 3. Loyiha papkasi (claude shu joyda ishlaydi)
    PROJECT_DIR: 'C:\\Users\\raxim\\Desktop\\Claude Projects\\Total conquest',

    // 4. Claude CLI yo'li (avtomatik topilgan)
    CLAUDE_EXE: 'C:\\Users\\raxim\\AppData\\Roaming\\Claude\\claude-code\\2.1.121\\claude.exe',

    // 5. Ssenariy: har xabar yangi suhbat boshlaydi (-c = davom ettiradi)
    CONTINUE_SESSION: true,   // true = avvalgi suhbatni davom ettiradi

    // 6. Max kutish vaqti (sekund)
    TIMEOUT_SECONDS: 300,     // 5 daqiqa

    // 7. Tez javob xabarlari
    MESSAGES: {
        start: '👋 Salom! Total Conquest loyihasini boshqaruv botiga xush kelibsiz.\n\nVazifa yuboring — Claude shu PCda ishlaydi.',
        working: '🤖 *Ishlamoqda...*\n⏳ Iltimos kuting.',
        done: '✅ *Bajarildi!*',
        error: '❌ *Xato yuz berdi*',
        timeout: '⏰ *Vaqt tugadi* (5 daqiqa). Jarayon to\'xtatildi.',
        unauthorized: '🚫 Ruxsat yo\'q.',
        cancelled: '🛑 Jarayon to\'xtatildi.',
        status_idle: '✅ Bot tayyor. Loyiha: Total Conquest',
        status_busy: '⏳ Hozir vazifa bajarilmoqda...',
    }
};
