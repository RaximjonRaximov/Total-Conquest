@echo off
title Total Conquest Frontend
echo.
echo  ==============================
echo   TOTAL CONQUEST FRONTEND
echo   http://localhost:8080
echo  ==============================
echo.
"C:\Program Files\nodejs\node.exe" "%TEMP%\tc_server.js" 2>nul
if errorlevel 1 (
    echo Oddiy server ishga tushirilmoqda...
    "C:\Program Files\nodejs\node.exe" -e "const h=require('http'),fs=require('fs'),p=require('path'),R='C:\\Users\\raxim\\Desktop\\Claude Projects\\Total conquest',M={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg'};h.createServer((q,r)=>{let f=p.join(R,q.url==='/'?'index.html':q.url.split('?')[0]);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end('Not found');return;}r.writeHead(200,{'Content-Type':M[p.extname(f)]||'text/plain','Access-Control-Allow-Origin':'*'});r.end(d);});}).listen(8080,()=>console.log('Frontend: http://localhost:8080'));"
)
pause
