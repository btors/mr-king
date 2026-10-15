# 👑 MR-KING ERP - Sistema Integral de Punto de Venta y Cocina

Sistema de gestión para restaurante y snack bar **MR-KING ("El Rey de las Meriendas")**. Diseñado para operación local autónoma de alta disponibilidad sobre Windows 11 y Docker, resistente a caídas de Internet y optimizado para pantallas táctiles y tablets de meseros.

---

## 🏗️ 1. Arquitectura del Sistema

El proyecto es un monorepo administrado con **Turborepo** y **Docker Compose**:

| Servicio | Tecnología | Contenedor | Puerto Interno | URL Externa (Red Local) |
|---|---|---|---|---|
| **POS (Punto de Venta)** | Next.js 16, React 19, TailwindCSS, Zustand | `mrking_pos` | `3000` | `http://mrking/` o `http://localhost/` |
| **KDS (Pantalla Cocina)** | Next.js 16, Framer Motion, Audio Alerts | `mrking_kds` | `3001` | `http://mrking/kds` |
| **API Backend** | NestJS 10, WebSockets (Socket.io) | `mrking_api` | `4000` | `http://mrking/api/` |
| **Base de Datos** | PostgreSQL 16, Prisma ORM 7.8 | `mrking_db_container` | `5432` | Persistente en volumen `postgres_data` |
| **Caché / Spooler** | Redis 7 Alpine | `mrking_redis_container` | `6379` | En memoria para eventos rápidos |
| **Proxy Inverso** | Nginx Alpine | `mrking_nginx` | `80` | Distribuye tráfico por URL `http://mrking/` |
| **Relay Impresión USB** | PowerShell Micro-Relay | Nativo en Windows | `9101` | Puente HTTP hacia impresora de caja `\\localhost\Caja_Printer` |

---

## 🌐 2. Topología de Red y Dispositivos Físicos

```text
[MÓDEM INTERNET (Megacable/Telmex)]
        │
        ▼ (Puerto WAN)
[ROUTER MAESTRO HUAWEI: 192.168.3.1] (Servidor DHCP / Emisor Wi-Fi del Restaurante)
        │
        ├────────────────────────────────────────────────────────┐
        ▼ (Wi-Fi)                                                ▼ (Ethernet / Wi-Fi)
[REPETIDOR COCINA (Modo Bridge)]                        [PC PRINCIPAL WINDOWS (Servidor)]
        │ (Ethernet / Wi-Fi)                             (IP: 192.168.3.200 aprox.)
        ▼                                                ├─ Abre: http://localhost/
[IMPRESORA COCINA TÉRMICA ESC/POS]                       ├─ Impresora Caja USB (Caja_Printer)
IP Fija: 192.168.3.201 : Puerto 9100                     │
                                                         ▼ (Wi-Fi Huawei)
                                                [TABLETS MESEROS Y PANTALLA COCINA]
                                                (Abren: http://mrking/ y http://mrking/kds)
```

### Reglas Críticas de Red:
1. **Sin Internet el sistema sigue operando:** Todas las comunicaciones ocurren dentro de la subred local `192.168.3.x`.
2. **Impresora de Cocina:** Se conecta por socket TCP directo en `192.168.3.201:9100`. No requiere drivers en Windows ni software intermedio.
3. **Impresora de Caja:** Es USB y se comparte en Windows bajo el recurso `Caja_Printer`. El script `print_relay.ps1` escucha en el puerto `9101` para recibir los tickets desde Docker.
4. **Perfil de Red en Windows 11:** Debe estar configurado como **"Red Privada"** para que el Firewall permita el enrutamiento de Docker a la LAN.

---

## ⚡ 3. Scripts Operativos (1 Clic en Windows)

En la raíz del proyecto se encuentran los scripts de automatización:

* **`INICIAR_SISTEMA.bat`**: Enciende todos los contenedores Docker en segundo plano, arranca el micro-relay USB (`print_relay.ps1`) y abre el navegador automáticamente en `http://localhost/`.
* **`APAGAR_SISTEMA.bat`**: Detiene de forma segura los contenedores y cierra el proceso del relay USB sin perder información de ventas.
* **`ACTUALIZAR_SISTEMA.bat`**: Recompila las imágenes de Docker (`docker compose up -d --build`) tras modificar código o variables de entorno.
* **`INSTALAR_SISTEMA.bat`**: Script de despliegue inicial desde cero para nuevas máquinas.

---

## ⚙️ 4. Variables de Entorno (`.env`)

Ubicado en la raíz del proyecto. Las variables más relevantes son:

```env
# Acceso y Seguridad
ADMIN_PIN=1234
WAITER_PIN=0000

# Base de datos
DB_USER=mrking_user
DB_PASSWORD=mrking_password
DB_NAME=mrking_db

# Impresora de Cocina (Red Ethernet / Wi-Fi)
KITCHEN_PRINTER_IP=192.168.3.201
KITCHEN_PRINTER_PORT=9100

# Impresora de Caja (USB compartida en Windows)
CASH_PRINTER_NAME=Caja_Printer
PRINTER_RELAY_HOST=host.docker.internal
PRINTER_RELAY_PORT=9101
```

---

## 🔍 5. Diagnóstico Rápido y Troubleshooting

### Ver logs de la API en vivo (envío de comandas, cobros, errores):
```cmd
docker logs -f mrking_api
```

### Probar si la impresora de cocina responde en el puerto 9100:
```cmd
powershell -Command "Test-NetConnection -ComputerName 192.168.3.201 -Port 9100"
```
*(Debe responder `TcpTestSucceeded : True`)*.

### Reiniciar el servicio de la API tras cambios en `.env`:
```cmd
docker compose restart api
```

### Reconstruir el sistema tras cambios en código:
```cmd
docker compose up -d --build
```

---

## 📚 6. Documentación Detallada

Para más información técnica, consulta:
* [CONTEXTO_SISTEMA_Y_TROUBLESHOOTING.md](file:///c:/Users/PC/Documents/GitHub/mr-king/CONTEXTO_SISTEMA_Y_TROUBLESHOOTING.md) — Documento maestro con detalles exhaustivos de hardware, software y solución de fallas.
* [HISTORIAL_DE_CAMBIOS.md](file:///c:/Users/PC/Documents/GitHub/mr-king/HISTORIAL_DE_CAMBIOS.md) — Bitácora de cambios cronológica por fecha y archivos afectados.
