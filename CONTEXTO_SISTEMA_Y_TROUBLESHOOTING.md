# 🧠 MR-KING ERP: CONTEXTO MAESTRO, ARQUITECTURA Y GUÍA DE TROUBLESHOOTING
**Propósito:** Este documento contiene **todo el contexto operativo, técnico y arquitectónico** del proyecto MR-KING ERP para que cualquier desarrollador, agente de IA o tú mismo en otro equipo comprendan exactamente cómo funciona el sistema, qué se ha hecho y cómo resolver cualquier problema tras una actualización.

---

## 1. 📌 Estado Actual del Repositorio
* **Rama Activa de Git:** `reportes`
* **Último Commit:** `5936dfcb` (*feat: robustecimiento de red http://mrking/, orilla de salchicha dual, erradicacion de ordenes fantasma y scripts de despliegue*)
* **Stack Tecnológico:**
  * **Frontend (POS & KDS):** Next.js 16 (Turbopack, React 19, TailwindCSS, Zustand con persistencia).
    * POS: Corre internamente en puerto `3000`, expuesto al usuario en puerto `80` (raíz `/`).
    * KDS (Pantalla Cocina): Corre internamente en puerto `3001`, expuesto en `http://mrking/kds`.
  * **Backend (API):** NestJS 10, TypeScript, Socket.io (WebSockets en tiempo real), Prisma 7.8.
    * Corre internamente en puerto `4000`, expuesto en `http://mrking/api/` y WebSockets en `/socket.io/`.
  * **Base de Datos:** PostgreSQL 16 (Contenedor `mrking_db_container`, puerto `5432`).
  * **Caché / Spooler:** Redis 7 (Contenedor `mrking_redis_container`, puerto `6379`).
  * **Proxy Inverso:** Nginx Alpine (Contenedor `mrking_nginx`, puerto `80`).
  * **Servicio de Tickets USB:** Micro-Relay nativo en PowerShell (`print_relay.ps1`, puerto `9101`).

---

## 2. 🌐 Infraestructura Física de Red del Restaurante

La red del restaurante está compuesta por 4 niveles físicos:

```
[MÓDEM DEL PROVEEDOR] (Telmex / Megacable / Totalplay - Solo da salida a Internet)
        │
        ▼ (Cable Ethernet al puerto WAN)
[ROUTER MAESTRO HUAWEI: 192.168.3.1] (Servidor DHCP y Emisor de Wi-Fi)
        │
        ├─────────────────────────────────────────────────┐
        ▼ (Wi-Fi)                                         ▼ (Wi-Fi / Cable)
[REPETIDOR DE COCINA (Modo Bridge)]             [PC PRINCIPAL SERVIDOR WINDOWS]
        │ (Wi-Fi / Ethernet)                              │ (Docker Desktop)
        ▼                                                 ├─ Abre: http://localhost/
[IMPRESORA DE COCINA IP: 9100]                            ├─ Impresora Caja USB (Caja_Printer)
(Debe residir en 192.168.3.X)                             │
                                                          ▼ (Wi-Fi Huawei)
                                                [TABLETS DE MESEROS Y PANTALLA KDS]
                                                (Abren: http://mrking/ y http://mrking/kds)
```

### Reglas de Oro de la Red:
1. **El internet se puede caer, pero el sistema NO se detiene:** El router Huawei maneja la red local `192.168.3.X`. Las tablets, la caja, la cocina y las impresoras pueden seguir operando al 100% en modo local sin internet.
2. **El Repetidor de Cocina:** Debe tener el **DHCP APAGADO (Modo Bridge / Punto de Acceso)**. Si el repetidor crea su propia subred (ej. `192.168.0.X`), la impresora de cocina quedará aislada.
3. **Acceso de Tablets:** Conectadas a la red Wi-Fi de Huawei, entran a `http://mrking/` o a la IP local de la PC Windows (ej. `http://192.168.3.50/`).

---

## 3. 🛡️ Funcionalidades Críticas Implementadas Recientemente

### A. Orilla Rellena Dual (Queso, Salchicha o Nada)
* **Dónde está:** `apps/pos/src/components/PizzaBuilder.tsx`.
* **Cómo funciona:**
  * Al hacer clic en cualquier tamaño de pizza (normal o mitad y mitad), se abre el constructor con el tamaño preseleccionado.
  * En la barra inferior hay dos botones: `[🧀 Orilla Queso (+$XX)]` y `[🌭 Orilla Salchicha (+$XX)]`.
  * **Comportamiento:** Por defecto deshabilitadas (sin orilla). Es mutuamente excluyente: si tocas una se activa, si tocas la otra conmuta y desmarca la anterior; si tocas la activa se desmarca (regresa a normal).
  * **Precios dinámicos:** Mediana ($45), Grande ($65), Familiar ($85).
* **Autosembrado:** En `apps/api/src/products/products.service.ts`, al iniciar el servidor verifica si existen `Orilla de Salchicha MD, GD, FAM` en la categoría Extras; si faltan, las inserta automáticamente sin intervención manual.

### B. Erradicación Definitiva de Órdenes Fantasma
* **Problema anterior:** Si una tablet perdía señal Wi-Fi por 3 segundos, guardaba el pedido en `localStorage`. Cuando reconectaba horas después, reenviaba la orden y el servidor (que ya había olvidado la clave de idempotencia) creaba un duplicado completo.
* **Solución aplicada:**
  1. **Idempotencia persistente de 24 horas (`orders.service.ts`):** Guarda las llaves en disco (`temp_prints/idempotency_cache.json`). Si la tablet reenvía una orden procesada, responde HTTP 200 con `ALREADY_PROCESSED` sin duplicar nada.
  2. **Ventana de 45 min en Take-Away (`orders.service.ts`):** Solo fusiona órdenes de clientes con el mismo nombre si se crearon en los últimos 45 minutos.
  3. **Purga periódica cada 30 min (`shifts.service.ts`):** Cancela órdenes huérfanas (>12h) y libera sus mesas automáticamente sin reiniciar la PC.
  4. **Blindaje de la cola en tablet (`usePOSStore.ts`):** Expulsa órdenes duplicadas o con error 4xx de inmediato, reduce TTL a 2 horas y limpia la cola al abrir/cerrar turno.

### C. Desacoplamiento de IPs a `.env`
* En `apps/api/src/printer/printer.service.ts`, todas las IPs y puertos se leen desde `.env`.
* El archivo `.env` está comentado y organizado en español.
* El spooler de cocina tiene un límite de **3 reintentos máximos** con timeout de 3 segundos para no congelar el sistema si la impresora de cocina se apaga.

---

## 4. 🚨 GUÍA DE DIAGNÓSTICO Y SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING)

Si al actualizar o arrancar en el nuevo equipo algo falla, revisa esta tabla paso a paso:

### ⚠️ Caso 1: "Copié los archivos en el equipo pero la pantalla sigue mostrando el diseño viejo"
* **Causa:** El navegador guardó en caché la versión vieja de Next.js, o Docker no recompiló.
* **Solución:**
  1. Ejecuta **`ACTUALIZAR_SISTEMA.bat`** (fuerza `docker compose up -d --build`).
  2. En el navegador presiona **Ctrl + F5** (o **Cmd + Shift + R**) para forzar Hard Refresh.
  3. Si persiste, abre una ventana de **Incógnito/Privada**.

### ⚠️ Caso 2: "Las tablets no abren http://mrking/"
* **Causa A:** La tablet está conectada a otra red Wi-Fi (ej. a los datos móviles o a la red del módem anterior y no al router Huawei).
  * *Solución:* Conectar la tablet al Wi-Fi del router Huawei `192.168.3.1`.
* **Causa B:** La tablet es un modelo antiguo de Android que no soporta mDNS nativo (`.local`).
  * *Solución:* Abre PowerShell en la PC servidora y escribe `ipconfig`. Busca la "Dirección IPv4" (ejemplo: `192.168.3.50`). En la tablet, entra directo usando esa IP: `http://192.168.3.50/` y guárdala como marcador.

### ⚠️ Caso 3: "La impresora de cocina no imprime comandas"
* **Causa A:** La IP configurada en `.env` no coincide con la IP actual de la impresora o el contenedor no se ha recompilado.
  * *Solución:* La IP oficial de cocina en la red Huawei es `192.168.3.201` en el puerto `9100`. El código cuenta con fallback y protección ante subredes viejas. Si se modificó `.env`, ejecuta `ACTUALIZAR_SISTEMA.bat` para recompilar la API.
* **Causa B:** La impresora física o el repetidor tienen el puerto 9100 trabado.
  * *Solución:* Prueba el puerto desde CMD corriendo:
    ```cmd
    powershell -Command "Test-NetConnection -ComputerName 192.168.3.201 -Port 9100"
    ```
    Si `TcpTestSucceeded` es `False`, apaga la impresora de su botón físico 10 segundos y vuelve a encenderla.
* **Causa C:** Windows 11 tiene la red como "Pública" y bloquea el tráfico de Docker.
  * *Solución:* En Windows ve a *Configuración -> Red e Internet -> Wi-Fi/Ethernet* y cambia el perfil de red a **"Privada"**.
* **Diagnóstico en Vivo de Comandas:**
  * Abre una consola CMD en el servidor y ejecuta:
    ```cmd
    docker logs -f mrking_api
    ```
    Al pulsar el icono de reimpresión (🖨️) en la pantalla de Cocina (`http://mrking/kds`), verás en tiempo real el socket conectando, enviando los bytes y confirmando con `[SPOOLER] ✅ Impresión exitosa`.

### ⚠️ Caso 4: "La impresora de caja (USB) no imprime el ticket de cobro"
* **Causa A:** El micro-relay de PowerShell no está activo.
  * *Solución:* Al ejecutar `INICIAR_SISTEMA.bat`, se lanza en segundo plano `print_relay.ps1`. Si se cerró, ejecútalo manualmente haciendo clic derecho en `print_relay.ps1` -> "Ejecutar con PowerShell".
* **Causa B:** La impresora en Windows no se llama `Caja_Printer` o no está compartida.
  * *Solución:* En Windows ve a *Panel de Control -> Dispositivos e Impresoras -> Propiedades de Impresora -> pestaña Compartir*. Marca "Compartir esta impresora" y ponle de nombre de recurso compartido exactamente: `Caja_Printer`.

### ⚠️ Caso 5: "Conflicto de Docker o contenedores trabados"
* **Solución rápida en Windows:**
  ```cmd
  docker compose down
  docker compose rm -f
  docker compose up -d --build
  ```

---

## 5. 📂 Lista Maestra de Archivos del Proyecto

```text
MR-KING ERP ROOT/
├── .env                                         <-- Variables de entorno (IPs de impresoras, pines)
├── .env.example                                 <-- Plantilla limpia de variables
├── ACTUALIZAR_SISTEMA.bat                       <-- Doble clic para compilar y aplicar cambios
├── INICIAR_SISTEMA.bat                          <-- Doble clic matutino para abrir en http://localhost/
├── APAGAR_SISTEMA.bat                           <-- Doble clic nocturno para detener el sistema
├── INSTALAR_SISTEMA.bat                         <-- Script de instalación limpia desde cero
├── HISTORIAL_DE_CAMBIOS.md                      <-- Bitácora de cambios por fechas
├── CONTEXTO_SISTEMA_Y_TROUBLESHOOTING.md       <-- ESTE DOCUMENTO (Contexto total y soporte)
├── print_relay.ps1                              <-- Micro-relay HTTP en puerto 9101 para USB de caja
├── docker-compose.yml                           <-- Definición de servicios (api, pos, kds, db, redis, nginx)
├── infra/nginx/nginx.conf                       <-- Proxy inverso en puerto 80 (mrking, localhost)
├── packages/database/prisma/
│   ├── schema.prisma                            <-- Modelo de datos relacional
│   └── seed.ts                                  <-- Catálogo maestro de productos (con salchicha)
└── apps/
    ├── api/src/
    │   ├── printer/printer.service.ts           <-- Spooler de cocina y tickets de caja
    │   ├── orders/orders.service.ts             <-- Lógica de pedidos e idempotencia persistente (24h)
    │   ├── shifts/shifts.service.ts             <-- Manejo de turnos y purga de órdenes huérfanas
    │   └── products/products.service.ts         <-- Autosembrado de productos de salchicha
    └── pos/src/
        ├── components/
        │   ├── PizzaBuilder.tsx                 <-- Constructor con selector dual Queso/Salchicha
        │   └── MenuView.tsx                     <-- Catálogo POS con apertura automática de builder
        └── store/
            └── usePOSStore.ts                   <-- Estado global Zustand y cola offline blindada
```
