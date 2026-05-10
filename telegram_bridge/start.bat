@echo off
title Telegram Bridge — Total Conquest
color 0A
cd /d "%~dp0"

:loop
echo [%time%] Bridge ishga tushmoqda...
node bridge.js
echo [%time%] Bridge to'xtadi. 3s dan keyin qayta ishga tushadi...
timeout /t 3 /nobreak >nul
goto loop
