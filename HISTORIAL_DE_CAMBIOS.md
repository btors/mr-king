# 📜 HISTORIAL DE CAMBIOS Y DESPLIEGUES (MR-KING ERP)
Este documento registra de forma cronológica y técnica cada actualización, los problemas resueltos, las decisiones de arquitectura y la lista exacta de archivos a copiar/sobrescribir en el equipo de producción para mantener el contexto histórico a través del tiempo.

---

## 📅 14 de Octubre de 2026: Blindaje de Impresora de Cocina (192.168.3.201), Reimpresión Manual KDS y Logging en Vivo

### 1. Objetivos del Cambio
* **Blindaje de IP de Cocina (`192.168.3.201`):** Erradicar dependencias o variables de entorno obsoletas de redes anteriores (`192.168.0.x` o `192.168.1.x`) que bloqueaban la conexión TCP hacia la impresora térmica de cocina.
* **Reimpresión Manual en Pantalla KDS:** Asegurar que al pulsar el icono de reimpresión (🖨️) en las tarjetas de la cocina, la orden se recupere de la base de datos y se envíe inmediatamente al spooler de red.
* **Fallback Seguro de Comanda:** Evitar que órdenes con productos que carezcan de la categoría explícita `preparationPlace = KITCHEN` generen comandas vacías invisibles. Si no hay ítems marcados, el sistema imprime todos los ítems de la orden.
* **Timeout y Diagnóstico en Vivo:** Aumentar el timeout del socket a 6 segundos con temporizador explícito y habilitar logging de alta visibilidad para monitorear en tiempo real con `docker logs -f mrking_api`.

---

### 2. Decisiones Técnicas y Arquitectura
1. **Resolución Robusta de IP (`printer.service.ts`):**
   - El servicio verifica la variable `KITCHEN_PRINTER_IP`. Si viene vacía o si contiene una subred vieja (`192.168.0.` o `192.168.1.`), automáticamente la descarta y fuerza la IP oficial de producción: `192.168.3.201` en el puerto `9100`.
2. **Fallback de Ítems en Comanda (`printer.service.ts`):**
   - En `formatKitchenTicket`, si el filtro `preparationPlace === 'KITCHEN'` resulta en 0 ítems pero la orden contiene productos, se toma la lista completa para garantizar que la cocina nunca se quede sin comanda.
3. **Socket TCP Blindado (`printer.service.ts`):**
   - Se añadió un `setTimeout` explícito de 6000ms que destruye el socket y rechaza la promesa limpiamente si la impresora tarda en responder el handshake a través de repetidores Wi-Fi.
4. **Logs Extensivos en Todo el Flujo:**
   - Logs con prefijos `[ORDERS_CONTROLLER]`, `[ORDERS_SERVICE]`, `[PRINTER]` y `[PRINTER RAW]` visibles directamente en consola al correr `docker logs -f mrking_api`.
5. **Logging en Consola KDS (`OrderCard.tsx`):**
   - La pantalla de cocina registra en la consola del navegador (`F12`) el envío y la respuesta del servidor al solicitar la reimpresión.

---

### 3. Archivos Modificados / A Sobrescribir en Producción
```text
📁 mr-king/
├── .env                                         <-- KITCHEN_PRINTER_IP=192.168.3.201 y PORT=9100
├── apps/
│   ├── api/src/
│   │   ├── printer/printer.service.ts           <-- IP blindada 192.168.3.201, timeout 6s, fallback y logs
│   │   ├── orders/orders.controller.ts          <-- Logging explícito en printKitchen endpoint
│   │   └── orders/orders.service.ts             <-- Logging y despacho seguro en printKitchenManual
│   └── kds/src/
│       └── components/OrderCard.tsx             <-- Logging en consola de KDS al presionar botón 🖨️
```

---

## 📅 12 de Octubre de 2026: Orilla de Salchicha, URL http://mrking/ y Erradicación de Órdenes Fantasma

### 1. Objetivos del Cambio
* **Orilla Rellena de Salchicha:** Añadir la opción dual de "Orilla Rellena de Salchicha" junto a "Orilla de Queso" con precios dinámicos según el tamaño ($45 MD, $65 GD, $85 FAM), garantizando selección mutuamente excluyente (Queso, Salchicha o Nada).
* **Autosembrado en Producción:** Garantizar que los productos de salchicha se creen automáticamente en la base de datos sin requerir que el usuario los dé de alta manualmente en el panel de administración.
* **Erradicación de Órdenes Fantasma:** Prevenir que micro-cortes de Wi-Fi en las tablets o reinicios de Docker causen duplicación de pedidos, cobros dobles o comandas duplicadas en cocina.
* **URL Limpia sin IPs (`http://mrking/`):** Configurar Nginx para que las tablets y pantallas se conecten por nombre de red local sin necesidad de teclear números de IP.
* **Configuración `.env` Intuitiva:** Centralizar todas las IPs y puertos de impresoras en el archivo `.env` de forma comentada y fácil de editar con el Bloc de Notas.
* **Scripts de 1 Clic (`ACTUALIZAR_SISTEMA.bat`):** Facilitar la actualización en producción con un solo doble clic sin abrir consolas de comandos.

---

### 2. Decisiones Técnicas y Arquitectura
1. **Selector Dual Excluyente (`PizzaBuilder.tsx`):**
   - Se migró de un booleano `wantsStuffedCrust` a un estado `selectedCrust: 'QUESO' | 'SALCHICHA' | null`.
   - Por defecto inicia en `null` (deshabilitadas). Si el cajero toca una opción, se activa; si toca la otra, se desmarca la anterior; si vuelve a tocar la activa, se desmarca regresando a sin orilla.
2. **Autosembrado en Inicialización (`products.service.ts`):**
   - Al encender la API (`onModuleInit`), verifica si existen `Orilla de Salchicha MD`, `GD` y `FAM` en la categoría `Extras`. Si faltan, las inserta automáticamente.
3. **Idempotencia Persistente de 24 Horas (`orders.service.ts`):**
   - Se reemplazó el `Set` volátil en RAM por un archivo de estado persistente (`temp_prints/idempotency_cache.json`). Si una tablet reenvía una orden ya registrada, el servidor responde HTTP 200 con `status: 'ALREADY_PROCESSED'`, evitando órdenes duplicadas.
4. **Ventana de 45 Minutos en Take-Away (`orders.service.ts`):**
   - Se restringió la fusión de pedidos de clientes con el mismo nombre a los últimos 45 minutos.
5. **Purga Periódica en Background (`shifts.service.ts`):**
   - Se programó una tarea cada 30 minutos que busca órdenes huérfanas (>12h) en `PENDING`/`PREPARING`/`SERVED` para cancelarlas y liberar sus mesas.
6. **Blindaje de la Cola Offline (`usePOSStore.ts`):**
   - Expulsión inmediata de órdenes con errores 4xx o duplicadas de la memoria de la tablet. Reducción de TTL a 2 horas y limpieza de cola al abrir o cerrar turno.
7. **Nginx Multi-Host (`nginx.conf`):**
   - Se añadió `server_name localhost mrking mrking.local _;` en el puerto 80.

---

### 3. Archivos Modificados / A Sobrescribir en Producción
Para desplegar esta actualización, copia y reemplaza estos archivos en tu servidor de producción:

```text
📁 mr-king/
├── .env                                         <-- Variables intuitivas comentadas
├── .env.example                                 <-- Plantilla para instalaciones limpias
├── ACTUALIZAR_SISTEMA.bat                       <-- NUEVO: Script de actualización de 1 clic
├── INICIAR_SISTEMA.bat                          <-- Actualizado con http://localhost/ y recordatorio mrking/
├── INSTALAR_SISTEMA.bat                         <-- Actualizado con plantilla .env y URLs mrking
├── infra/
│   └── nginx/
│       └── nginx.conf                           <-- Soporte para http://mrking/
├── packages/
│   └── database/
│       └── prisma/
│           └── seed.ts                          <-- Añadidas Orillas de Salchicha al catálogo maestro
└── apps/
    ├── api/
    │   └── src/
    │       ├── printer/
    │       │   └── printer.service.ts           <-- Desacoplamiento a .env y spooler limitado a 3 reintentos
    │       ├── orders/
    │       │   └── orders.service.ts            <-- Idempotencia persistente 24h y merge Take-Away a 45m
    │       ├── shifts/
    │       │   └── shifts.service.ts            <-- Tarea periódica de purga de huérfanas cada 30 min
    │       └── products/
    │           └── products.service.ts          <-- Autosembrado de Orillas de Salchicha al iniciar
    └── pos/
        └── src/
            ├── components/
            │   └── PizzaBuilder.tsx             <-- Selector dual interactivo (Queso / Salchicha / Nada)
            └── store/
                └── usePOSStore.ts               <-- Blindaje de cola offline, TTL 2h y limpieza de turnos
```

### 4. Instrucciones de Despliegue
1. Copia y reemplaza los archivos listados en la carpeta del sistema en Windows.
2. Dale **doble clic a `ACTUALIZAR_SISTEMA.bat`**.
3. Espera 1 o 2 minutos a que Docker termine de compilar.
4. ¡Listo! Al abrir `http://localhost/` o `http://mrking/`, la selección dual de orillas estará activa y el backend blindado.

---

## 📅 19 de Junio de 2026: Orilla Rellena de Queso, WebSockets y Fix de Admin

### 1. Objetivos del Cambio
* Integrar la selección de Orilla Rellena de Queso en pizzas normales (no solo mitad y mitad).
* Reparar la pantalla de cocina (KDS) para que reciba ítems de categoría `EXTRAS` en tiempo real vía WebSockets.
* Corregir el bloqueo de scroll en el Panel Maestro (`/admin/products`).
* Inactivar clics accidentales en "Orilla Rellena" y "Mitad y Mitad" dentro de la pestaña de Extras del menú general.

### 2. Decisiones Técnicas
* **Apertura de Constructor:** `MenuView.tsx` redirige el clic de los tamaños de pizza directamente al `PizzaBuilder`, pre-cargando el tamaño (`initialSize`).
* **Filtro de WebSockets (`orders.gateway.ts`):** Se ajustó el filtro de transmisión en tiempo real para incluir ítems de categoría `EXTRA`.
* **Flexbox en Admin (`admin/layout.tsx`):** Se sustituyó `overflow-auto` por `flex-1 flex flex-col min-h-0` para forzar a los sub-contenedores a respetar el límite de altura de la pantalla y activar scrollbars internas.
* **Bloqueo de Clics en Menú (`MenuView.tsx`):** Se condicionó el botón superpuesto para excluir nombres con `ORILLA` o `MITAD Y MITAD`.

### 3. Archivos Modificados
* `apps/pos/src/components/PizzaBuilder.tsx`
* `apps/pos/src/components/MenuView.tsx`
* `apps/pos/src/app/admin/layout.tsx`
* `apps/api/src/orders/orders.service.ts`
* `apps/api/src/events/orders.gateway.ts`
