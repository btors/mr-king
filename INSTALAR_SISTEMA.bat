@echo off
title Instalador MR-KING ERP
echo ===================================================
echo             INSTALANDO MR-KING ERP
echo ===================================================
echo.

:: 1. Crear .env automáticamente si no existe con IPs optimizadas para red local
if not exist .env (
    echo [*] Creando archivo de configuracion .env...
    (
        echo ADMIN_PIN=1234
        echo WAITER_PIN=0000
        echo DB_USER=mrking_user
        echo DB_PASSWORD=mrking_password
        echo DB_NAME=mrking_db
        echo NEXT_PUBLIC_API_URL=/api
    ) > .env
    echo [OK] Archivo .env creado con exito.
) else (
    echo [OK] El archivo .env ya existe. Omitiendo creacion.
)

echo.
echo [*] Iniciando descarga y construccion del sistema en Docker...
echo     (Esto puede tardar unos minutos la primera vez. Ten paciencia.)
echo.
docker-compose up -d --build

:: 2. Crear Accesos Directos en el Escritorio de Windows usando VBScript
echo.
echo [*] Creando accesos directos en tu Escritorio...

set "INICIAR_BAT=%~dp0INICIAR_SISTEMA.bat"
set "APAGAR_BAT=%~dp0APAGAR_SISTEMA.bat"

echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = oWS.ExpandEnvironmentStrings("%%USERPROFILE%%\Desktop\Iniciar MR-KING.lnk") >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%INICIAR_BAT%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%~dp0" >> CreateShortcut.vbs
echo oLink.Description = "Iniciar el sistema MR-KING ERP" >> CreateShortcut.vbs
echo oLink.Save() >> CreateShortcut.vbs

echo sLinkFile = oWS.ExpandEnvironmentStrings("%%USERPROFILE%%\Desktop\Apagar MR-KING.lnk") >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%APAGAR_BAT%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%~dp0" >> CreateShortcut.vbs
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
echo Para que las tablets funcionen siempre, asegúrate de
echo configurar la IP de esta PC como estática: 192.168.1.200
echo.
echo Direcciones de Acceso:
echo  - Desde esta PC: http://localhost/
echo  - Desde las Tablets: http://192.168.1.200/
echo  - Desde la Cocina: http://192.168.1.200/kds
echo.
pause
