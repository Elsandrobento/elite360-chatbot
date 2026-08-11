@echo off
:start
echo ===================================================
echo [KIXICRÉDITO KIXI IA] A iniciar o chatbot da KixiCrédito...
echo ===================================================
node index.js
echo [KIXICRÉDITO KIXI IA] O processo foi encerrado. A reiniciar em 5 segundos...
timeout /t 5
goto start
