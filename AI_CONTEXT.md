# Contexto de IA - MR-KING Restaurant ERP

Este documento contiene el estado completo, reglas de negocio y arquitectura del proyecto `mr-king`. Sirve como "memoria base" para que cualquier agente de IA retome el proyecto en cualquier computadora sin perder contexto. **Cualquier agente que lea este proyecto debe iniciar leyendo detenidamente este archivo.**

## 1. Visión del Proyecto
El objetivo del proyecto es crear un **ERP y sistema de punto de venta (POS) completamente a la medida, local y de alto rendimiento para el restaurante MR-KING (venta de Snacks, Pizzas, Hamburguesas, Alitas, etc.)**, con el objetivo principal de **reemplazar su sistema anterior basado en Odoo**. 

Se busca crear un sistema distribuido con estándar de calidad "Senior", que enfatice la facilidad de uso para los meseros (botones rápidos, combinaciones ágiles) y precisión impecable en los precios sin latencia perceptible.

## 2. Arquitectura de Software
El proyecto utiliza una arquitectura **Monorepo** gestionada con **Turborepo** para orquestar los diferentes servicios simultáneamente de forma local:

- **Espacio de trabajo:** Monorepo en `/Users/ar/Documents/GitHub/mr-king`
- **Backend (API):** `NestJS` (RESTful API), alojado en `apps/api` o estructurado por Turborepo. Provee controladores seguros, RBAC (Role-Based Access Control) y lógica compleja como el `PricingEngine` asíncrono.
- **Frontend POS:** Aplicación Mobile-First y de acceso rápido para meseros/cajeros (posiblemente React/Vite/Next.js) alojado en `apps/pos`.
- **Frontend KDS:** (Kitchen Display System) - Pantalla en tiempo real para cocineros, enfocado en mostrar las órdenes entrantes.
- **Base de Datos & ORM:** `PostgreSQL` y `Prisma 7`. Módulo de base de datos extraído en `packages/database`.

## 3. Modelo de Base de Datos (Prisma)
El esquema central de entidades abarca:
- `User`: Gestión de acceso con roles RBAC (ej. Driver, Cashier, Kitchen, Admin).
- `Category` y `Product`: Representan el menú.
- `Table`, `Order`, `OrderItem`: Entidades transaccionales.
- `CashFlow`: Módulo financiero/caja.
  
**Manejo de Metadatos Complejos:**
`OrderItem` contiene un campo flexible (`metadata` o `pizzaConfig` de tipo JSON) diseñado específicamente para soportar:
- Mitades de Pizzas ("half-and-half").
- Ingredientes extra.
- Configuración de salsas para alas.

## 4. Reglas de Negocio Críticas (Implementadas)
Todo agente debe respetar estrictamente estas reglas al modificar o extender la base de código.

1. **Gestión de Precios (Pricing Engine asíncrono):** El POS nunca debe calcular los totales complejos ni los precios de forma autoritaria ni hacer "cálculos pesados" ("zero-computation pizza builder"). La fuente de verdad ("single source of truth") es siempre el `PricingEngine` en el backend, el cual asegura la integridad matemática de combos y configuraciones.
2. **Límite dinámico de Salsas para Alitas:** El backend hace cumplir validaciones de datos (Business Rule Validation) para la cantidad máxima de salsas permitidas sobre un producto según la categoría de las alitas.
3. **Optimización de UX en el POS:** Las adiciones de items comunes como Hamburguesas y Hot Dogs deben mantener el flujo de "One-tap combo additions" (agregar rápido con 1 click) exigido para la rapidez del servicio de un cajero/mesero.
4. **Validación Exhaustiva:** Se implementaron pruebas de extremo a extremo (E2E) y pruebas unitarias (Unit Tests) para certificar y evitar regresiones en RBAC, límites de salsas y los precios matemáticos del flujo de la pizza.

## 5. Instrucciones de Entorno de Desarrollo (DevOps / Local)
- El entorno se inicia localmente usando los scripts globales del monorepo (usualmente dependiente de `npm run dev` o el orquestador de Turborepo).
- Previamente se han resuelto conflictos de puertos entre POS, KDS y API para que puedan operar de forma paralela. Los agentes no deben modificar puertos arbitrariamente sin revisar la configuración global (e.g. `turbo.json` y/o `.env`).

## 6. Siguientes Pasos (Estado Actual)
Nos encontramos en la **Fase Front-End del POS**:
- Finalizando la integración del frontend del POS con las APIs remotas/locales de NestJS.
- Reemplazando definitivamente el antiguo "mock data" por datos extraídos directamente de los endpoints `Products` y `Categories`.
- Actualmente, el archivo activo es el `seed.ts` de la base de datos (`packages/database/prisma/seed.ts`), donde estamos sembrando de forma asertiva el menú real de MR-KING para tener un ambiente robusto de pruebas para la UI y la QA (Inspección Visual). 

---
**NOTA PARA EL AGENTE DE IA LECTOR:** Confirma que has procesado este archivo exitosamente e infórmame (el humano) que estás listo para continuar con la refactorización o integración de los módulos del proyecto de MR-KING basados en esta arquitectura.
