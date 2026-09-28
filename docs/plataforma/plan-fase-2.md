# Fase 2: multiproducto y zonas de envío

**Objetivo:** que la tienda venda varios productos (listado, ficha por slug, carrito, pedido con
ítems, checkout de Mercado Pago con varios ítems, stock por producto) y que las zonas de envío se
configuren desde el admin (hoy: un solo producto y envío fijo "solo CABA").

**Criterio para Melera:** con su único producto y una sola zona (CABA), la tienda tiene que seguir
viéndose y funcionando como hoy, salvo lo que la fase agrega a propósito (carrito y selector de
zona, cuyo aspecto se define en la pregunta 6). Los links viejos (`/producto?origen=instagram` de
las autorespuestas y de Instagram) tienen que seguir funcionando.

**Fuera de la fase 2:** Rino (fase 3), el cotizador, variantes de producto (color, tamaño) y
categorías, salvo que se decida otra cosa en las preguntas.

Cada paso termina con `npm test`, `npm run lint` y `npm run build` en verde; los cambios de
esquema, con migraciones que conservan los datos (probadas en la base de desarrollo con datos
creados antes de migrar, como en la fase 1).

---

## Lo que hoy asume un solo producto o "solo CABA"

| Qué | Dónde |
|---|---|
| `getMainProduct()`: el primer producto | `src/lib/product.ts` y sus 11 usos |
| `Order.productId` + `Order.cantidad` (un producto por pedido) | `prisma/schema.prisma` |
| Checkout con un ítem, stock de un producto, preferencia de MP con un ítem | `src/app/api/checkout/route.ts` |
| Descuento de stock de un producto al pagarse | `src/lib/orders.ts` (`applyPayment`) |
| Aviso de Telegram con un producto (`nombre × cantidad`) | `src/lib/orders.ts` (`notifyOrderPaid`) |
| `/producto` sin slug; home con el hero y la sección de un producto | `src/app/(publico)/`, `Hero`, `ProductoSection` |
| Selector de cantidad → `/checkout?cantidad=N` | `QuantitySelector`, `src/app/checkout/page.tsx`, `CheckoutForm` |
| Admin "Precio y stock" de un producto | `/admin/stock`, `StockEditor`, `/api/admin/stock` |
| Admin de pedidos: una línea `producto × cantidad` | `/admin/pedidos`, `/admin/pedidos/[id]` |
| `provincia` tiene que ser `"CABA"`; zona fija en el formulario | `src/lib/validation.ts`, `CheckoutForm` |
| "Envíos: por ahora solo dentro de CABA…" | `clientes/melera/config.ts` (`ia.chat.datos`), pregunta de envíos en el seed |
| `$PRECIO` / `$PROMOS` / `$PRODUCTO` = el producto principal | chat, autorespuestas, preguntas frecuentes |
| "Producto: Miel Artesanal 500g, frasco de vidrio" en el prompt del chat | `clientes/melera/config.ts` (`ia.chat.producto`) |
| Posts de promo con las promos y la foto del producto principal | `src/lib/instagram/generar.ts` |
| Unidad de venta ("frasco") por cliente, no por producto | `config.unidad` |

## Modelo de datos propuesto

- **`Product`** suma `slug` (único), `activo`, `orden` (el primero es el destacado de la home) y,
  según la pregunta 7, `unidad`.
- **`OrderItem`** (nuevo): `orderId`, `productId`, y una copia de lo que se vendió (`nombre`,
  `precioUnitario`, `cantidad`, `subtotal`), así un pedido viejo no cambia si después se edita el
  producto.
- **`Order`**: pierde `productId`/`cantidad` (pasan a sus ítems, con migración de datos para los
  pedidos existentes) y suma `subtotal`, `costoEnvio` y la zona elegida (id + copia del nombre).
- **`ZonaEnvio`** (nuevo): `nombre`, `descripcion`, `costo` (según la pregunta 2), `activa`,
  `orden`.

## Pasos

### Paso 1: slug, activo y orden en `Product` ✅ (2026-09-28)
Hecho: migración `20260928200000_producto_slug_activo_orden` escrita a mano (Prisma no deja crear
una columna obligatoria sobre datos existentes sin preguntar): arma el slug con el nombre (sin
tildes, `-2` si se repite, `producto` si no queda nada) y el orden por fecha de creación. Probada
en la base de desarrollo con productos de prueba; `prisma migrate diff` confirma que la base quedó
igual al esquema. `getMainProduct()` = primer activo por orden. El seed pasa a `productos` (lista,
con slug). La unidad por producto (decisión 7) va cuando se use, en los pasos 3 a 5.
Plan original:
Migración con `slug` a partir del nombre para los productos existentes. `getMainProduct()` pasa a
ser "el primer producto activo por orden". Sin cambios visibles.

### Paso 2: admin de productos ✅ (2026-09-28)
Hecho: `/admin/productos` (lista por orden con estado, destacado, slug, stock y pedidos; crear,
editar con promos y slug sugerido desde el nombre, activar/desactivar, borrar) y su API
`/api/admin/productos`. No se puede borrar un producto con pedidos (409: hay que desactivarlo).
Reemplaza a "Precio y stock": `/admin/stock` redirige, se borraron `StockEditor` y
`/api/admin/stock` y sus tests pasaron a `tests/productos-admin.test.ts` (mismos registros en los
logs). Foto: link https público (vacío = la de la config). Probado de punta a punta con la app.
Plan original:
`/admin/productos`: listar, crear, editar (nombre, slug, descripción, precio, promos por cantidad,
stock, foto, activo, orden). Reemplaza a "Precio y stock" (`/admin/stock` redirige). La foto: según
la pregunta 8.

### Paso 3: listado y ficha por slug ✅ (2026-09-28)
Hecho: `/productos` (tarjetas con foto, precio, promo y "sin stock"), `/producto/<slug>` (ficha, 404
si no existe o está inactivo, con título propio) y `/producto` sin slug (un producto: su ficha;
varios: redirige al listado conservando `?origen=`). Home: el destacado como antes (sus botones van
a su ficha) y "Más productos" debajo si hay varios. La foto del producto (link) se usa donde está;
sin foto, la de la marca. Agregado: la ficha pasa el slug al checkout (`?producto=<slug>`) y el
checkout (página y API) compra ese producto; sin slug, el destacado (links viejos). Snapshots de
Melera: solo cambian los links de los dos botones "Comprar ahora" de la home. Probado con la app y
un segundo producto.
Pendiente (decisión 7, pasos 4-5): la unidad y la aclaración junto al precio ("el frasco de 500 g")
siguen siendo del cliente, no del producto.
Plan original:
`/productos` (listado) y `/producto/[slug]` (ficha). `/producto` sin slug: pregunta 5. Home: el
producto destacado como hoy y, si hay más de uno, el listado debajo. Con un solo producto, Melera
queda igual.

### Paso 4: pedidos con ítems (sin cambiar todavía el checkout) ✅ (2026-09-28)
Hecho: `OrderItem` (copia de nombre, precio unitario con la promo, cantidad y subtotal; se borra
con su pedido). Migración `20260928210000_pedidos_con_items` escrita a mano: cada pedido existente
pasa a un ítem (precio unitario = total / cantidad) y recién después se borran `productId` y
`cantidad`; probada con dos pedidos creados antes de migrar (uno con promo) y `prisma migrate diff`
en 0. El checkout crea el pedido con su ítem; el pago descuenta el stock de cada ítem (atómico,
igual que antes); el aviso de Telegram y el admin de pedidos muestran los ítems (con uno solo, el
texto y el HTML de siempre: los snapshots de Melera no cambiaron). Probado con el checkout real.
Plan original:
`OrderItem` + migración que pasa los pedidos existentes a un ítem cada uno (probada con pedidos
creados antes de migrar). El checkout sigue siendo de un producto pero ya escribe ítems; el pago
descuenta stock por ítem; admin de pedidos y aviso de Telegram muestran los ítems.

### Paso 5: carrito y checkout con varios productos
Se hace en cuatro partes: **5a** unidad por producto, **5b** API de checkout con varios ítems,
**5c** carrito (guardado, "Agregar al carrito", ícono y `/carrito`), **5d** página de checkout
con varios ítems.

- **5a ✅ (2026-09-28):** `Product` suma `unidadSingular`, `unidadPlural`, `unidadGenero` y
  `aclaracionPrecio` (migración `20260928210806_producto_unidad_y_aclaracion`, columnas opcionales:
  vacías = las del cliente). `unidadDe(producto)` y los helpers de precios y cantidades reciben la
  unidad; la usan la ficha, el selector, el listado, la home, el checkout, el chat, los posts de
  promo y los registros. El admin de productos suma los campos. Melera (sin unidad propia) no
  cambia; el selector concuerda con el género ("cuántas piezas").
- **5b ✅ (2026-09-28):** la API de checkout acepta `items: [{ producto, cantidad }]` (hasta 20, sin
  repetir) y sigue aceptando `producto` + `cantidad`. Busca todos los productos de una vez, valida
  que estén a la venta y el stock de cada uno (el error dice de cuál), calcula cada ítem con sus
  promos y manda a Mercado Pago un ítem por producto. Con un producto, mismos mensajes que antes.

Plan original del paso 5:
Carrito (pregunta 3). La API de checkout recibe ítems, valida stock de cada uno, calcula todo en el
servidor (promos por producto) y arma la preferencia de MP con un ítem por producto. El descuento
de stock al pagarse sigue siendo atómico para todos los ítems.

### Paso 6: zonas de envío
`ZonaEnvio` + migración; admin `/admin/envios`; el seed de Melera trae su zona (CABA, envío a
coordinar). El checkout muestra las zonas activas; la validación deja de exigir "CABA" y valida
contra la base; el pedido guarda zona y costo; el costo va a MP según la pregunta 2. Sin zonas
activas, el checkout lo avisa y no deja comprar.

### Paso 7: textos que dependen del catálogo y las zonas
- Chat: el prompt lista los productos activos con sus precios y promos, y las zonas de envío (sale
  de `ia.chat.producto` y del texto de envíos de `ia.chat.datos`).
- Variables nuevas para autorespuestas y preguntas frecuentes: `$CATALOGO` (productos con precio)
  y `$ZONAS`; qué pasa con `$PRECIO` y `$PRODUCTO`: pregunta 4.
- La pregunta de envíos del seed de Melera usa `$ZONAS`.

### Paso 8: Instagram con catálogo
Posts de producto y de promo: se elige el producto del catálogo (nombre, precio y foto se
completan solos; hoy se cargan a mano). `PostIG` suma el producto elegido (migración).

### Paso 9: cierre
Comparación visual de Melera contra el final de la fase 1, test de que no quede nada de
"solo CABA" en el código, pruebas de punta a punta del checkout con varios ítems y zona (sin pagar:
hasta la preferencia de MP de prueba), documentación.

---

## Decisiones (2026-09-28)

1. **Zonas:** una lista de zonas que el comprador elige (ej. "CABA", "GBA Norte", "Resto del país"),
   que cada cliente arma y edita desde el admin.
2. **Costo de envío:** cada zona se configura como **costo fijo** (se suma al total y va a Mercado
   Pago como ítem "Envío") o **a coordinar** (como hoy Melera: no suma nada y se arregla después
   de la compra). Sin envío gratis por monto, por ahora.
3. **Carrito:** sí, guardado en el navegador (sin cuenta de usuario), con ícono en el Header y
   `/carrito`.
4. **`$PRECIO` y `$PRODUCTO`:** siguen siendo los del producto destacado (el primero); se suma
   `$CATALOGO` (y `$ZONAS`).
5. **`/producto` sin slug:** con un solo producto activo muestra su ficha; con más, redirige a
   `/productos`.
6. **Melera:** con un producto y una zona, el carrito y el selector de zona se ocultan ("Comprar"
   directo y la zona se elige sola), así queda como hoy.
7. **Unidad de venta:** cada producto puede tener la suya; la del cliente (`config.unidad`) es el
   valor por defecto.
8. **Fotos de producto:** link https en esta fase; subir archivos desde el admin cuando se defina
   el hosting.
9. **Variantes y categorías:** no en la fase 2. Cada cliente tiene necesidades distintas: se agregan
   cuando un cliente las necesite (se ve con Rino en la fase 3). El modelo de la fase 2 no las
   impide (los ítems del pedido guardan una copia de lo vendido, así se puede sumar la variante).
