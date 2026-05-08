@echo off
title Apagando MR-KING ERP

:: Asegurar que el directorio de ejecucion sea el de esta carpeta (evita el error 'no configuration file provided')
cd /d "%~dp0"

echo ===================================================
echo             APAGANDO MR-KING ERP
echo ===================================================
echo.
echo [*] Deteniendo servidores de forma segura...

docker compose down
if %errorlevel% neq 0 (
    docker-compose down
)
echo [*] Cerrando controlador de ticketera USB...
for /f "tokens=5" %%a in ('netstat -aon ^| find "9101"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo [OK] El sistema se ha apagado correctamente. Puedes cerrar esta ventana.
timeout /t 5
