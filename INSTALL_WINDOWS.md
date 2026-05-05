# Guía de Instalación MR-KING ERP (Windows + Módem Telmex)

Esta guía está diseñada para que puedas instalar el sistema de manera sumamente sencilla usando la red de tu **Módem Telmex (Infinitum)**, asignando una **IP fija de `192.168.1.200`** al servidor. Esto garantiza que las tablets de los meseros y la pantalla de cocina siempre se conecten sin problemas.

---

## Paso 1: Configurar la IP Fija en Windows (Servidor)

Para que el módem Telmex siempre sepa dónde está tu servidor y no le cambie la dirección IP, configúralo de la siguiente manera:

1. Presiona las teclas `Windows + R`, escribe **`ncpa.cpl`** y presiona Enter (esto abrirá las Conexiones de Red).
2. Haz clic derecho sobre tu conexión activa (ya sea **Wi-Fi** o **Ethernet**) y selecciona **Propiedades**.
3. Haz doble clic sobre la opción **"Habilitar el protocolo de Internet versión 4 (TCP/IPv4)"**.
4. Selecciona la opción **"Usar la siguiente dirección IP"** y llena los campos exactamente así:
   * **Dirección IP:** `192.168.1.200`
   * **Máscara de subred:** `255.255.255.0`
   * **Puerta de enlace predeterminada:** `192.168.1.254` (IP predeterminada de los módems Telmex)
5. En la sección de abajo, selecciona **"Usar las siguientes direcciones de servidor DNS"**:
   * **Servidor DNS preferido:** `8.8.8.8` (Google)
   * **Servidor DNS alternativo:** `1.1.1.1` (Cloudflare)
6. Haz clic en **Aceptar** en todas las ventanas para guardar los cambios.

---

## 🐳 Paso 2: Descargar el Motor del Sistema (Solo una vez)

El único programa que necesitas instalar en tu computadora es **Docker Desktop**, que se encarga de correr las aplicaciones de manera estable:

1. Descárgalo e instálalo desde aquí: [Descargar Docker Desktop para Windows](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe).
2. *Muy Importante:* Durante la instalación, deja activada la casilla que dice **"Use WSL 2 instead of Hyper-V"**.
3. Si el instalador te pide reiniciar la computadora al terminar, hazlo.

---

## 🚀 Paso 3: Descarga y Arranque del Sistema

¡Olvídate de comandos técnicos! Sigue estos sencillos pasos:

1. Entra a tu navegador web y ve a tu repositorio: [https://github.com/btors/mr-king](https://github.com/btors/mr-king)
2. Busca el botón verde que dice **"Code"** (Código), haz clic en él y selecciona **"Download ZIP"** (Descargar ZIP).
3. Una vez descargado, haz clic derecho sobre el archivo ZIP y selecciona **"Extraer todo"**.
4. Abre la carpeta que acabas de extraer, busca el archivo llamado **`INSTALAR_SISTEMA.bat`** y dale **Doble Clic**.
5. El script se encargará de configurar todo el entorno de forma automática e instalará dos accesos directos directamente en tu **Escritorio de Windows**:
   * **`Iniciar MR-KING`**: Para arrancar el sistema en las mañanas.
   * **`Apagar MR-KING`**: Para apagar el sistema por las noches.

---

## Paso 4: Conectar las Tablets y Pantallas

Ya que configuramos la IP fija `192.168.1.200`, tus dispositivos se conectarán siempre usando las mismas direcciones. Conecta tus tablets a la red Wi-Fi de tu módem Telmex e ingresa a los siguientes enlaces:

*   **Punto de Venta para Meseros (POS):**
    `http://192.168.1.200/`
*   **Pantalla de Cocina (KDS):**
    `http://192.168.1.200/kds`

*(Te sugerimos guardar estos enlaces como "Marcadores" o "Añadir a la pantalla de inicio" en las tablets para ingresar con un solo toque).*
