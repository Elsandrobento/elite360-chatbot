@echo off
:start
echo ===================================================
echo [ELITE 360 CHATBOT] A iniciar o chatbot comercial...
echo ===================================================
node index.js
echo [ELITE 360 CHATBOT] O processo foi encerrado. A reiniciar em 5 segundos...
timeout /t 5
goto start
