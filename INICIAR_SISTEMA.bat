@echo off
title Iniciando MR-KING ERP
echo ===================================================
echo             INICIANDO MR-KING ERP
echo ===================================================
echo.
echo [*] Encendiendo servidores del sistema...
docker-compose up -d
echo.
echo [OK] Servidores activos.
echo [*] Abriendo Punto de Venta en el navegador local...
start http://localhost/
timeout /t 5 >nul
