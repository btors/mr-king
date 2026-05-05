# Documentación Maestra MR-KING ERP

Este repositorio contiene el sistema integral para la gestión de MR-KING.

## Estructura de Documentación
1. [Manual del Mesero](./MANUAL_MESERO.md): Guía operativa para el personal de piso y barra.
2. [Manual del Administrador](./MANUAL_ADMIN.md): Guía de finanzas, cortes de caja y gestión de catálogo.
3. [Guía de Instalación en Windows](../INSTALL_WINDOWS.md): Instrucciones técnicas para el despliegue local.

## Arquitectura Técnica
- **Frontend:** Next.js + Tailwind CSS (POS y KDS).
- **Backend:** NestJS + Prisma ORM.
- **Base de Datos:** PostgreSQL.
- **Comunicación:** WebSockets (Socket.io) para alertas en tiempo real.
- **Infraestructura:** Docker + Nginx (Reverse Proxy).

## 🌐 Configuración de Red
Para que las tablets funcionen, deben estar conectadas a la misma red Wi-Fi que la computadora principal.
- **URL POS:** `http://[IP-DEL-SERVIDOR]/`
- **URL KDS:** `http://[IP-DEL-SERVIDOR]/kds`

---
*Desarrollado con estándares de alta disponibilidad y resiliencia offline.*
