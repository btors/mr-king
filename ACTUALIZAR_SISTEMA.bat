@echo off
title Actualizando MR-KING ERP

:: Asegurar que el directorio de ejecucion sea el de esta carpeta
cd /d "%~dp0"

echo ===================================================
echo             ACTUALIZANDO MR-KING ERP
echo ===================================================
echo.
echo [*] Recompilando el sistema en Docker con los nuevos cambios...
echo     (Esto puede tardar 1 o 2 minutos. Por favor espera...)
echo.

docker compose up -d --build
if %errorlevel% neq 0 (
    docker-compose up -d --build
)

echo.
echo ===================================================
echo         [OK] SISTEMA ACTUALIZADO CON EXITO
echo ===================================================
echo.
echo Ya puedes usar el sistema normalmente.
pause
