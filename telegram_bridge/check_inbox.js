#!/usr/bin/env node
// Bu skript inbox.json ni o'qib, mazmunini chiqaradi
// Claude Code /loop dan chaqiriladi

const fs   = require('fs');
const path = require('path');

const INBOX_FILE    = path.join(__dirname, 'inbox.json');
const RESPONSE_FILE = path.join(__dirname, 'response.json');

if (!fs.existsSync(INBOX_FILE)) {
    console.log('NO_MESSAGE');
    process.exit(0);
}

try {
    const data = JSON.parse(fs.readFileSync(INBOX_FILE, 'utf8'));
    if (data.status === 'pending') {
        // Processing deb belgilash
        data.status = 'processing';
        fs.writeFileSync(INBOX_FILE, JSON.stringify(data, null, 2), 'utf8');
        // Xabarni stdout ga chiqarish
        console.log('MESSAGE:' + data.text);
    } else {
        console.log('NO_MESSAGE');
    }
} catch (e) {
    console.log('NO_MESSAGE');
}
