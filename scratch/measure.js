const fs = require('fs');

function getBounds() {
    // Actually, I cannot easily parse PNG without a library like pngjs.
    // Let's just output the dimensions using PowerShell instead, or skip and just add the config.
    console.log("No built-in PNG parser in Node.");
}

getBounds();
