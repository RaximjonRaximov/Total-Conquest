#!/usr/bin/env node
// ================================================
// TELEGRAM ↔ CLAUDE SESSION BRIDGE
// Telegram → inbox.json → Claude → response.json → Telegram
// ================================================

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const cfg   = require('./config');

const INBOX_FILE    = path.join(__dirname, 'inbox.json');
const RESPONSE_FILE = path.join(__dirname, 'response.json');

let lastOffset = 0;

// ── Telegram API ─────────────────────────────────
function tgRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(params);
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${cfg.BOT_TOKEN}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve({}); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function sendMessage(chatId, text) {
    const chunks = splitMessage(text);
    for (const chunk of chunks) {
        await tgRequest('sendMessage', {
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown',
        }).catch(() => tgRequest('sendMessage', {
            chat_id: chatId,
            text: chunk.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&'),
        }));
    }
}

function splitMessage(text, limit = 4000) {
    if (text.length <= limit) return [text];
    const chunks = [];
    while (text.length > 0) {
        let chunk = text.slice(0, limit);
        const lastNl = chunk.lastIndexOf('\n');
        if (lastNl > limit * 0.7) chunk = text.slice(0, lastNl);
        chunks.push(chunk);
        text = text.slice(chunk.length).trimStart();
    }
    return chunks;
}

async function sendTyping(chatId) {
    return tgRequest('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
}

// ── Inbox fayl holati ─────────────────────────────
function isInboxBusy() {
    try {
        if (!fs.existsSync(INBOX_FILE)) return false;
        const data = JSON.parse(fs.readFileSync(INBOX_FILE, 'utf8'));
        return data.status === 'pending' || data.status === 'processing';
    } catch { return false; }
}

function writeInbox(chatId, userId, text) {
    const data = {
        status: 'pending',
        chatId,
        userId,
        text,
        timestamp: Date.now(),
    };
    fs.writeFileSync(INBOX_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`📨 Inbox ga yozildi: "${text.slice(0, 60)}"`);
}

// ── Response faylni kutish ─────────────────────────
async function waitForResponse(chatId, timeoutMs = 600000) {
    const start = Date.now();

    // Typing indikatorini har 4s yangilash
    const typingInterval = setInterval(() => sendTyping(chatId), 4000);

    return new Promise((resolve) => {
        const check = () => {
            // Vaqt tugadimi?
            if (Date.now() - start > timeoutMs) {
                clearInterval(typingInterval);
                resolve(null);
                return;
            }

            // Response fayl bormi?
            if (fs.existsSync(RESPONSE_FILE)) {
                try {
                    const data = JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'));
                    if (data.status === 'done') {
                        clearInterval(typingInterval);
                        // Fayllarni tozalash
                        try { fs.unlinkSync(RESPONSE_FILE); } catch {}
                        try { fs.unlinkSync(INBOX_FILE);    } catch {}
                        resolve(data.text || '*(Bo\'sh javob)*');
                        return;
                    }
                } catch {}
            }

            // 2s da qayta tekshir
            setTimeout(check, 2000);
        };

        // Darhol tekshir, keyin intervalli
        setTimeout(check, 2000);
    });
}

// ── Xabar qayta ishlash ───────────────────────────
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text   = (msg.text || '').trim();

    // Ruxsat tekshirish
    if (!cfg.ALLOWED_USER_IDS.includes(userId)) {
        await sendMessage(chatId, '🚫 Ruxsat yo\'q.');
        return;
    }

    // Oddiy buyruqlar
    if (text === '/start') {
        await sendMessage(chatId, '👋 Salom! Menga loyiha haqida vazifa bering.');
        return;
    }
    if (text === '/help') {
        await sendMessage(chatId, [
            '📖 *Qanday ishlaydi:*',
            '',
            'Istalgan vazifa yozing → Men shu PCda ishlayман → Natija qaytadi.',
            '',
            '*Misollar:*',
            '`Villaga yangi animatsiya qo\'sh`',
            '`Battle rejimidagi xatoni tuzat`',
            '`o\'yin holatini ko\'rsat`',
        ].join('\n'));
        return;
    }
    if (text === '/status') {
        const busy = isInboxBusy();
        await sendMessage(chatId, busy ? '⏳ Hozir vazifa bajarilmoqda...' : '✅ Tayyor. Vazifa yuboring!');
        return;
    }

    // Band bo'lsa
    if (isInboxBusy()) {
        await sendMessage(chatId, '⏳ Hozir boshqa vazifa bajarilmoqda. Iltimos kuting...');
        return;
    }

    // Vazifani inbox ga yozish
    writeInbox(chatId, userId, text);

    // Qabul xabar
    await sendMessage(chatId, `📥 *Qabul qilindi!*\n\n_"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"_\n\nIshlayapman... ⏳`);

    // Javobni kutish (max 10 daqiqa)
    const response = await waitForResponse(chatId, 600000);

    if (response) {
        await sendMessage(chatId, `✅ *Bajarildi!*\n\n${response}`);
    } else {
        await sendMessage(chatId, '⏰ Vaqt tugadi (10 daqiqa). Katta vazifa bo\'lsa, kichikroq qismlarga bo\'ling.');
        try { fs.unlinkSync(INBOX_FILE); } catch {}
    }
}

// ── Polling loop ──────────────────────────────────
async function poll() {
    try {
        const res = await tgRequest('getUpdates', {
            offset: lastOffset,
            timeout: 30,
            allowed_updates: ['message'],
        });

        if (res.result && res.result.length > 0) {
            for (const update of res.result) {
                lastOffset = update.update_id + 1;
                if (update.message) {
                    handleMessage(update.message).catch(console.error);
                }
            }
        }
    } catch (err) {
        console.error('Polling xato:', err.message);
        await new Promise(r => setTimeout(r, 5000));
    }

    setImmediate(poll);
}

// ── Ishga tushirish ───────────────────────────────
async function main() {
    // Eski fayllarni tozalash
    try { fs.unlinkSync(INBOX_FILE);    } catch {}
    try { fs.unlinkSync(RESPONSE_FILE); } catch {}

    const me = await tgRequest('getMe');
    if (!me.result) {
        console.error('❌ Bot token noto\'g\'ri!');
        process.exit(1);
    }

    console.clear();
    console.log('═══════════════════════════════════════════');
    console.log('   📨 TELEGRAM ↔ CLAUDE BRIDGE (fayl rejim)');
    console.log('═══════════════════════════════════════════');
    console.log(`   Bot:     @${me.result.username}`);
    console.log(`   Inbox:   ${INBOX_FILE}`);
    console.log(`   Response:${RESPONSE_FILE}`);
    console.log('───────────────────────────────────────────');
    console.log('   ✅ Tayyor! Claude Code ham ishlashi kerak.');
    console.log('═══════════════════════════════════════════\n');

    process.on('SIGINT', () => {
        try { fs.unlinkSync(INBOX_FILE);    } catch {}
        try { fs.unlinkSync(RESPONSE_FILE); } catch {}
        process.exit(0);
    });

    poll();
}

main().catch(err => {
    console.error('Kritik xato:', err);
    process.exit(1);
});
