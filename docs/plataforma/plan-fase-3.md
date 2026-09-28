# Fase 3: 3DRinoMaker (`clientes/rino/`)

**Objetivo:** levantar la tienda de **3DRinoMaker** (impresiones 3D) como segundo cliente de la
plataforma: identidad propia, catálogo de productos fijos (listado, ficha por slug, carrito, pedido
con ítems, checkout de Mercado Pago con varios ítems, stock por producto), zonas de envío, y el
cotizador de impresión 3D previsto como módulo (apagado).

**Lo que ya está hecho (fases 1 y 2) y Rino usa tal cual:** config tipada y validada
(`clientes/<slug>/config.ts`), tema neutro para quien no trae tema, módulos que se prenden por
config, seed por cliente, catálogo con `/productos` y `/producto/<slug>`, carrito, pedidos con
ítems, checkout con varios productos, zonas de envío desde el admin, variables `$CATALOGO` y
`$ZONAS`, y posts de Instagram con productos del catálogo. `clientes/ejemplo/` es un cliente
completo sin tema propio: es la base para arrancar `clientes/rino/`.

**Criterio para Melera:** no cambia nada. Lo que se agregue para Rino es genérico, con un valor por
defecto que deja a Melera como está (los snapshots de `tests/salida-melera/` no se tocan salvo que
se decida otra cosa).

**Fuera de la fase 3:** el cotizador funcionando (queda el módulo declarado y, si se decide, un link
o una página que lo anuncie), multi-tenant, hosting en Coolify y el despliegue real de Rino (se
deja listo para desplegar, pero no se despliega desde acá).

Cada paso termina con `npm test`, `npm run lint` y `npm run build` en verde, con `CLIENTE=melera` y
con `CLIENTE=rino`; los cambios de esquema, con migraciones que conservan los datos.

---

## Preguntas (hay que decidirlas antes de arrancar)

### Material de la marca (lo tenés que pasar vos)
1. **Identidad:** nombre tal cual se muestra ("3DRinoMaker", "3D Rino Maker"…), dominio (aunque sea
   provisorio), usuario de Instagram, y el **logo** (idealmente SVG o PNG grande con fondo
   transparente). Si no hay logo todavía, arranco con uno de texto.
2. **Colores y tipografías:** la paleta (aunque sean 2 o 3 colores; de ahí armo la escala 50–900) y
   si hay fuentes de marca. Sin definición, propongo una paleta y la ajustamos.
3. **Textos de la landing:** título y bajada del inicio, "Quiénes somos", pie, y el tono para Gemini
   (cómo habla la marca). Puedo escribir un borrador para que lo corrijas.
4. **Catálogo inicial:** qué productos (nombre, precio, stock, descripción, foto como link https),
   las promos por cantidad si hay, y la unidad de venta ("pieza", "unidad"…).
5. **Zonas de envío:** cuáles y con qué costo (o "a coordinar"); si hay retiro en persona, va como
   una zona sin costo.

### Decisiones de la plataforma
6. **Tema:** ¿Rino usa el **tema neutro** con sus colores y fuentes (recomendado para arrancar:
   rápido y ya probado con `clientes/ejemplo/`), o un **tema propio** como el panal de Melera
   (fondo, animaciones, formas de botones)? Con el neutro, si el fondo es claro, termino de pasar al
   contrato de tema los detalles que hoy asumen fondo oscuro (avisos de error y los íconos de
   éxito/pendiente/falla del checkout; quedó anotado al cerrar la fase 1).
7. **Inicio:** hoy la home está armada para un producto destacado (hero con "Comprar · $ precio",
   sección del producto y "Más productos" abajo). Para un catálogo como el de Rino, ¿preferís un
   **inicio de catálogo** (hero de la marca + grilla de productos)? Recomendación: un campo en la
   config (`inicio: "destacado" | "catalogo"`), Melera en `destacado` (queda igual).
8. **Variantes (color, material, tamaño):** en impresión 3D suele elegirse el color o el material.
   Opciones: (a) **sin variantes** por ahora (cada combinación es un producto aparte, o se aclara
   en consultas); (b) **opciones simples** por producto (ej. "Color: rojo, negro, blanco") que el
   comprador elige y quedan en el ítem del pedido, sin stock ni precio propio; (c) **variantes
   completas** con precio y stock propios. Recomendación: (b) si hace falta; (c) solo si el stock
   o el precio cambian de verdad por variante.
9. **Categorías:** ¿hacen falta para el listado (ej. "Macetas", "Llaveros", "Figuras")?
   Recomendación: sí si arranca con más de ~10 productos; si no, más adelante.
10. **Stock de lo que se imprime a pedido:** hoy todo producto tiene stock y no se puede comprar
    más de lo que hay. ¿Rino trabaja con stock real, o algunos productos son **"a pedido"** (sin
    límite, con un aviso de demora tipo "se imprime en 3 a 5 días")?
11. **Módulos al arrancar:** Instagram (necesita plantillas propias de Rino: ¿reusamos la plantilla
    "simple" del cliente de ejemplo con sus colores, o querés un diseño propio?), respuestas
    automáticas de DMs y chat con IA. ¿Cuáles van prendidos en la primera versión?
12. **Cotizador:** hoy existe aparte. En esta fase, ¿lo dejamos solo declarado (apagado), o querés
    un link desde la tienda hacia donde está hoy? ¿Dónde vive (URL) y en qué tecnología está, para
    planear su integración como módulo más adelante?
13. **Base de desarrollo de Rino:** cada cliente tiene su base. Para desarrollar Rino hace falta
    una base de desarrollo aparte (un proyecto o una rama nueva en Neon, como la de la plataforma),
    así sus datos no se mezclan con los de Melera. ¿La creás vos y me pasás la conexión para un
    `.env.rino.local`? (Propongo que `npm run dev` con `CLIENTE=rino` lea ese archivo; nunca se usa
    una base de producción.)

---

## Pasos

### Paso 1: poder desarrollar dos clientes en la misma máquina
Que cada cliente tenga su archivo de entorno de desarrollo (`.env.rino.local` junto al
`.env.local` de Melera) y scripts claros (`dev`, `build`, `db:migrate`, `db:seed` con el cliente
elegido), sin riesgo de apuntar a la base equivocada: el script muestra a qué base se conecta y
se niega si `CLIENTE` y el archivo no coinciden. Migraciones y seed de Rino en su base de
desarrollo (pregunta 13).

### Paso 2: `clientes/rino/` con la identidad mínima
A partir de `clientes/ejemplo/`: `config.ts` (nombre, dominio, Instagram, SEO, colores, logo e
imágenes, unidad, textos, región), `public/` con logo, imagen para compartir y foto por defecto,
y `seed.ts` con productos, zonas y preguntas frecuentes (preguntas 1–5). Sin tema propio todavía
(usa el neutro). Tests: la config valida, el build falla si falta algo, y las páginas de Rino no
tienen rastros de Melera ni del cliente de ejemplo (como `tests/cliente-ejemplo.test.ts`).

### Paso 3: tema de Rino
Según la pregunta 6: el neutro con los colores y fuentes de Rino, o `clientes/rino/tema.css` y
`clientes/rino/tema/` propios. En los dos casos, lo que hoy asume fondo oscuro pasa al contrato de
tema (sin cambiar cómo se ve Melera). Capturas en Chrome de todas las páginas públicas y del
admin, en escritorio y celular.

### Paso 4: inicio de catálogo (si se decide en la pregunta 7)
`inicio: "destacado" | "catalogo"` en la config (por defecto `destacado`). En `catalogo`: hero de
la marca (sin precio de un producto) y la grilla de productos. Melera sigue en `destacado`
(snapshots sin cambios).

### Paso 5: opciones o variantes de producto (si se decide en la pregunta 8)
Con la opción (b): cada producto puede declarar opciones (ej. "Color": lista de valores) en el
admin; la ficha las pide antes de agregar al carrito; el carrito distingue la misma pieza en dos
colores; el ítem del pedido guarda lo elegido (y se ve en el admin, en Telegram y en el detalle de
MP). Migración sin tocar los pedidos existentes. Con (c), se planifica aparte antes de arrancar.

### Paso 6: categorías (si se decide en la pregunta 9)
Tabla de categorías editable en el admin, cada producto en una; `/productos` con filtro por
categoría (`/productos?categoria=macetas`); el chat y `$CATALOGO` agrupan por categoría.

### Paso 7: productos "a pedido" (si se decide en la pregunta 10)
Un producto puede ser "a pedido": sin límite de stock y con un aviso de demora en la ficha, el
carrito y el checkout; el pago no descuenta stock de esos productos.

### Paso 8: Instagram, respuestas automáticas y chat de Rino (pregunta 11)
Plantillas de Instagram en `clientes/rino/instagram/` (por lo menos un estilo con los 4 tipos),
tono y ejemplos para Gemini en la config, reglas iniciales de respuestas automáticas en el seed,
y datos del chat. Los módulos que no van en la primera versión quedan apagados.

### Paso 9: cotizador previsto (pregunta 12)
El módulo `cotizador` sigue apagado. Si se decide, un link o una página simple que lo anuncie.
Queda anotado qué hace falta para integrarlo (rutas, datos que necesita, cómo se convierte una
cotización en un pedido).

### Paso 10: cierre
Compra de punta a punta con `CLIENTE=rino` (carrito, opciones si las hay, zona, hasta la
preferencia de MP de prueba), Melera sin cambios (snapshots y comparación visual con el final de la
fase 2), guía "cómo crear un cliente" actualizada con lo aprendido, y la lista de lo que Rino
necesita para desplegarse (variables de entorno, credenciales de MP, Meta y Telegram, dominio).
