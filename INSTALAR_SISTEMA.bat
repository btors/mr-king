@echo off
title Instalador MR-KING ERP

:: Asegurar que el directorio de ejecucion sea el de esta carpeta (evita el error 'no configuration file provided')
cd /d "%~dp0"

echo ===================================================
echo             INSTALANDO MR-KING ERP
echo ===================================================
echo.

:: 1. Crear .env de manera ultra-segura (sin parentesis para evitar errores de CMD)
if exist .env goto env_exists
echo [*] Creando archivo de configuracion .env...
echo ADMIN_PIN=1234>.env
echo WAITER_PIN=0000>>.env
echo KITCHEN_PRINTER_IP=192.168.3.201>>.env
echo KITCHEN_PRINTER_PORT=9100>>.env
echo CASH_PRINTER_NAME=Caja_Printer>>.env
echo PRINTER_RELAY_HOST=host.docker.internal>>.env
echo PRINTER_RELAY_PORT=9101>>.env
echo [OK] Archivo .env creado con exito.
goto start_docker

:env_exists
echo [OK] El archivo .env ya existe. Omitiendo creacion.

:start_docker
echo.
echo [*] Iniciando descarga y construccion del sistema en Docker...
echo     (Esto puede tardar unos minutos la primera vez. Ten paciencia.)
echo.

:: Intentar con 'docker compose' moderno y usar 'docker-compose' como alternativa
docker compose up -d --build
if %errorlevel% neq 0 (
    echo [*] Probando comando alternativo de Docker...
    docker-compose up -d --build
)

:: 2. Crear Accesos Directos en el Escritorio
echo.
echo [*] Creando accesos directos en tu Escritorio...

set "INICIAR_BAT=%~dp0INICIAR_SISTEMA.bat"
set "APAGAR_BAT=%~dp0APAGAR_SISTEMA.bat"
set "WORK_DIR=%~dp0"

:: Quitar contraslash final para evitar errores de ruta en Windows
if "%WORK_DIR:~-1%"=="\" set "WORK_DIR=%WORK_DIR:~0,-1%"

echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = oWS.ExpandEnvironmentStrings("%%USERPROFILE%%\Desktop\Iniciar MR-KING.lnk") >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%INICIAR_BAT%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%WORK_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "Iniciar el sistema MR-KING ERP" >> CreateShortcut.vbs
echo oLink.Save() >> CreateShortcut.vbs

echo sLinkFile = oWS.ExpandEnvironmentStrings("%%USERPROFILE%%\Desktop\Apagar MR-KING.lnk") >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%APAGAR_BAT%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%WORK_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "Apagar el sistema MR-KING ERP" >> CreateShortcut.vbs
echo oLink.Save() >> CreateShortcut.vbs

cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo [OK] Accesos directos creados exitosamente en tu Escritorio.
echo.
echo ===================================================
echo           INSTALACION COMPLETA CON EXITO
echo ===================================================
echo.
echo Direcciones de Acceso en tu Red:
echo  - Desde esta PC Servidor: http://localhost/
echo  - Desde las Tablets:     http://mrking/
echo  - Desde la Cocina (KDS): http://mrking/kds
echo.
echo (Asegurate de que las tablets esten conectadas a la red Wi-Fi
echo  de tu router Huawei para acceder mediante http://mrking/).
echo.
pause
