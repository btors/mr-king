# Roadmap y Avances del Sistema MR-KING

Este documento sirve como bitácora oficial para revisar con el dueño los avances logrados en el sistema, así como planificar las futuras modificaciones, funciones extras y ajustes pendientes.

## 🚀 Avances Recientes (Implementados y Probados)

1. **Soporte Completo de "Mitad y Mitad" (Pizzas)**
   - El sistema ahora permite cobrar la mitad más cara y añade automáticamente un cargo extra de +$15.
   - Las comandas de cocina desglosan correctamente ambas mitades de manera clara.

2. **Integración de Orilla Rellena de Queso Dinámica**
   - El sistema en Caja ahora permite añadir "Orilla Rellena" a cualquier pizza.
   - **Prevención de Fraude:** El precio de la orilla rellena se calcula y ajusta automáticamente dependiendo del tamaño de la pizza seleccionada (Mediana, Grande, Familiar).
   - **Tickets de Cobro:** La orilla rellena se imprime como un concepto separado para claridad del cliente y auditoría financiera.
   - **Tickets de Cocina:** El ticket en cocina imprime la orden de la orilla de manera masiva e incluye la nota importante de a qué tamaño de pizza aplica, evitando confusiones con los cocineros.

3. **Optimización de Desgloses en Cocina (Impresora de Red)**
   - Mejoramos la lectura de los tickets para los cocineros. Todo lo marcado como `EXTRA` se imprime junto con los platillos principales de cocina.
   - Se optimizaron las tipografías (doble ancho y alto) y el resaltado en negritas para instrucciones especiales.

---

## ⏸️ Funciones Pendientes (Requieren Aprobación del Dueño)

1. **Cancelación de Pedidos Activos (Escenario de QA 4)**
   - **Situación actual:** Si un pedido ya fue enviado a cocina (estado `PENDING`), la caja no tiene un botón directo para cancelar toda la orden y enviar un ticket de cancelación.
   - **Propuesta pausada:**
     - Añadir un botón rojo de `[Cancelar Pedido]` en la Caja.
     - Al presionarlo, imprimir automáticamente un ticket masivo en cocina con el texto `*** ORDEN CANCELADA ***` para detener la preparación de los platillos.
     - Regresar la mesa a estado `Libre` y borrar la cuenta activa de la pantalla.
   - **Motivo de la pausa:** Se requiere la validación del flujo operativo con el dueño (Ej. ¿Quién tiene autorización para cancelar? ¿Solo el Administrador o también los Meseros/Cajeros?).

---

## 💡 Futuros Cambios y Funciones Extras Propuestas

Aquí se pueden ir listando las ideas de mejora continua para evaluar su viabilidad:

*   **[ ] Auditoría de Cancelaciones y Mermas:** Un reporte diario o semanal que indique qué productos fueron cancelados y el motivo (para cruzar con el inventario de cocina).
*   **[ ] Control de Inventarios Restrictivo:** Evitar que el sistema permita vender un producto (ej. Cerveza) si el stock llega a cero, o simplemente emitir alertas visuales.
*   **[ ] Propinas (Tips) por Tarjeta:** Un módulo especial a la hora de pagar que pregunte si el cliente desea dejar propina, separando este monto contablemente para no mezclarlo con las ventas netas.
*   **[ ] Perfil de Cliente Frecuente (Fidelidad):** Un pequeño CRM para los pedidos `DELIVERY` o `TAKE_AWAY` que recuerde la última dirección del cliente o sus pizzas favoritas basándose en su nombre/teléfono.
*   **[ ] Integración con WhatsApp:** Envío de ticket digital al cliente o avisos automáticos cuando su pedido "Para Llevar" esté listo.

---
*Documento vivo. Actualizado a la fecha de hoy. Se mantendrá en el repositorio para futuras consultas y juntas de avance.*
