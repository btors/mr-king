@echo off
title Apagando MR-KING ERP
echo ===================================================
echo             APAGANDO MR-KING ERP
echo ===================================================
echo.
echo [*] Deteniendo servidores de forma segura...
docker-compose down
echo.
echo [OK] El sistema se ha apagado correctamente. Puedes cerrar esta ventana.
timeout /t 5 >nul
