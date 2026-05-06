# 👑 Contrato de Integración API - MR-KING ERP

Este documento detalla el contrato de integración definitivo para la creación de órdenes (`POST /api/orders`). La API del backend cuenta con un **Motor de Precios (`PricingService`)** con validaciones estrictas y tolerantes a fallas en el servidor para evitar fraudes, manipulación de precios y errores de redondeo.

---

## 🚀 Detalles Generales de la Petición

* **Endpoint:** `POST /api/orders`
* **Autenticación:** Requerida (`Bearer Token` en la cabecera `Authorization`).
* **Seguridad de Precios:** El backend calcula el precio de cada ítem de manera autónoma consultando la base de datos. **Cualquier propiedad de precio enviada por el frontend será ignorada**; el total y el desglose de precios se derivan directamente en el servidor según la variante, sabores y adicionales seleccionados.

---

## 🛡️ Robustez y Tolerancia a Fallas

### 1. Tolerancia a Datos Nulos y Vacíos (Defensividad)
Si un producto no requiere personalización (por ejemplo, refrescos, Sabritas, postres), el objeto `config` puede enviarse nulo, indefinido o vacío. El sistema cuenta con fallbacks automáticos para evitar errores `500 Internal Server Error`:
* Si `config` no está en el payload, el backend asume un objeto vacío `{}` de forma segura.
* Si no se envía un tamaño para productos de variante única, el backend asigna por defecto la variante `"Única"`.

### 2. Equivalencia de Caja (Case-Insensitive)
El sistema tolera discrepancias de mayúsculas y minúsculas de forma nativa para evitar rechazos innecesarios en la sincronización:
* Las variantes (ej. `GD`, `gd`, `Gd`) se asocian de manera correcta.
* Los sabores de especialidades (ej. `BBQ`, `bbq`, `Mango Habanero`, `mango habanero`) se validan sin importar el formato de capitalización enviado por el cliente.

### 3. Precisión Centesimal (Redondeo de Dinero)
Para evitar el error de precisión de punto flotante de Javascript (ej: `0.1 + 0.2 = 0.300000000004`), todos los cálculos en el servidor (totales, subtotales, e importes individuales) se procesan aplicando redondeos estrictos a dos decimales (`Math.round(total * 100) / 100`). Esto garantiza consistencia absoluta entre lo que calcula el mesero y el balance de caja al cerrar turno.

---

## 🍕 1. Especialidad: Pizzas

El motor de precios de pizzas soporta el tamaño normal de pizza y la especialidad **Mitad y Mitad**.

### A. Pizza de Tamaño Único / Tradicional
Para enviar una pizza tradicional, debes especificar el tamaño deseado. El backend busca el tamaño usando `variantName` en el nivel superior de cada ítem o dentro del objeto `config`.

#### Estructura del JSON:
```json
{
  "productId": "id-de-la-pizza",
  "quantity": 1,
  "variantName": "GD", // Tamaños soportados: MD, GD, FM (Case-insensitive)
  "config": {
    "variantName": "GD" // También se puede enviar aquí (fallback admitido)
  }
}
```

### B. Pizza Mitad y Mitad (Half and Half)
El costo se calcula dinámicamente con la fórmula: `Math.max(Precio Mitad A, Precio Mitad B) + Recargo Mitad`. El recargo se obtiene dinámicamente del producto `"PIZZA MITAD Y MITAD"` en la categoría `"EXTRAS"` (con un fallback seguro de `$15` si no existe).

#### Estructura del JSON:
```json
{
  "productId": "id-de-la-pizza-base",
  "quantity": 1,
  "config": {
    "isHalfAndHalf": true,
    "variantName": "GD", // El tamaño seleccionado para ambas mitades
    "halfA": {
      "productId": "id-de-la-pizza-mitad-a",
      "variantName": "GD"
    },
    "halfB": {
      "productId": "id-de-la-pizza-mitad-b",
      "variantName": "GD"
    }
  }
}
```

---

## 🍗 2. Especialidad: Alitas y Boneless

Las alitas y los boneless pertenecen a categorías con selección estricta de salsas/sabores. El backend requiere que el pedido cumpla con los límites y las opciones configuradas en la base de datos:

* **Validación Dinámica de Opciones:** El servidor valida que cada sabor enviado en el payload exista dentro de la lista de sabores permitida (`productDetails.flavors`) en la base de datos de manera case-insensitive.
* **Validación de Mínimo:** Al menos una salsa debe ser seleccionada. Si se envía vacío, el servidor arrojará `400 BadRequestException`.
* **Validación de Máximo (`maxFlavors`):** Si excede el límite permitido por la presentación, se arrojará `400 BadRequestException`.

### Estructura del JSON:
Envía las salsas seleccionadas dentro de `config.variants` o `config.sauces` como un arreglo de cadenas de texto.

```json
{
  "productId": "id-de-las-alitas",
  "quantity": 1,
  "variantName": "12pz", // Variantes soportadas: 6pz, 12pz, 18pz, 24pz, 36pz
  "config": {
    "variants": ["bbq", "MANGO HABANERO"] // Las salsas elegidas (Case-insensitive)
  }
}
```

---

## 🍺 3. Especialidad: Micheladas

Las micheladas son bebidas con sabor específico. Siguiendo el catálogo inyectado por el DBA, cada michelada cuenta ahora con validación de sabores dinámica usando el campo `flavors` de la base de datos:

* **Validación Dinámica de Sabores:** Se valida que el sabor elegido pertenezca a la lista autorizada (`'Clasica'`, `'Maracuya'`, `'Mango'`, `'Fresa'`, `'Tamarindo'`, `'Azulito'`, `'Clamato'`, `'Tradicional'`) de manera case-insensitive.
* **Validación de Cantidad:** Máximo 1 sabor permitido por michelada.

### Estructura del JSON:
El sabor de la michelada se puede enviar en `config.variants` (como un arreglo que contiene el sabor único) o de forma directa en `config.flavor` / `variantName` del ítem.

#### Opción Recomendada (Por arreglo en `config.variants`):
```json
{
  "productId": "id-de-la-michelada",
  "quantity": 1,
  "config": {
    "variants": ["mango"] // Sabor único en arreglo (Case-insensitive)
  }
}
```

#### Opción Alternativa (Por propiedad directa):
```json
{
  "productId": "id-de-la-michelada-chica",
  "quantity": 1,
  "variantName": "Única", // La variante unificada del DBA es siempre 'Única'
  "config": {
    "flavor": "Tamarindo" // Sabor especificado de manera directa
  }
}
```

---

## 📋 Ejemplo Completo de Payload para `/orders`

Este es un ejemplo de un payload de orden de canal mixto (omnichannel) listo para producción:

```json
{
  "tableId": "id-de-la-mesa-opcional", // Obligatorio para EAT_IN, nulo para TAKE_AWAY/DELIVERY
  "orderType": "EAT_IN", // Valores válidos: EAT_IN, TAKE_AWAY, DELIVERY
  "clientName": "Juan Pérez", // Obligatorio para TAKE_AWAY y DELIVERY
  "clientType": "GENERAL",
  "items": [
    {
      "productId": "id-pizza-pepperoni",
      "quantity": 1,
      "variantName": "GD",
      "config": {
        "variantName": "gd"
      }
    },
    {
      "productId": "id-alitas-12pz",
      "quantity": 1,
      "variantName": "12pz",
      "config": {
        "variants": ["bbq", "Mango Habanero"]
      }
    },
    {
      "productId": "id-michelada-gd",
      "quantity": 2,
      "config": {
        "variants": ["tamarindo"]
      }
    }
  ]
}
```

---

## 🛡️ Respuestas y Errores del Servidor

* **`201 Created`**: El pedido ha sido creado y procesado exitosamente. Se emite un evento vía Sockets al monitor de cocina (KDS) y de meseros (POS).
* **`400 Bad Request`**: Ocurre si fallan las validaciones dinámicas:
  * `"Variante de producto no válida: 'X' para 'Y'"` (Variante incorrecta o precio nulo).
  * `"El producto 'X' requiere al menos un sabor/salsa."` (Alitas o especialidad sin sabor).
  * `"El sabor 'X' no es válido para 'Y'. Sabores permitidos: A, B, C..."` (Sabor fuera del catálogo autorizado).
  * `"El número de sabores (X) supera el límite permitido (Y)"` (Límite de salsas/sabores excedido).
* **`401 Unauthorized`**: Si el token JWT ha expirado, el usuario fue desactivado, o el token es inválido.
