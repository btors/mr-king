@echo off
title Iniciando MR-KING ERP

:: Asegurar que el directorio de ejecucion sea el de esta carpeta (evita el error 'no configuration file provided')
cd /d "%~dp0"

echo ===================================================
echo             INICIANDO MR-KING ERP
echo ===================================================
echo.
echo [*] Encendiendo servidores del sistema...

docker compose up -d
if %errorlevel% neq 0 (
    docker-compose up -d
)
echo [*] Activando controlador automático de ticketera USB...
start /min "" node print_relay.js

echo.
echo [OK] Servidores activos.
echo [*] Abriendo Punto de Venta en el navegador local...
start http://localhost/
timeout /t 5
