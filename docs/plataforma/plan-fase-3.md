# Fase 3: 3DRinoMaker (`clientes/rino/`)

**Objetivo:** levantar la tienda de **3DRinoMaker** (impresiones 3D) como segundo cliente de la
plataforma. Todavía no se habló con el dueño de cómo quiere su tienda, así que la fase **no decide
por él**: lo que puede variar entre clientes se construye como **opciones de la plataforma**, cada
una con un valor por defecto que deja a Melera como está, y Rino arranca con una identidad
provisoria que se completa después de esa charla.

**Lo que ya está hecho (fases 1 y 2) y Rino usa tal cual:** config tipada y validada
(`clientes/<slug>/config.ts`), tema neutro para quien no trae tema, módulos que se prenden por
config, seed por cliente, catálogo con `/productos` y `/producto/<slug>`, carrito, pedidos con
ítems, checkout con varios productos, zonas de envío desde el admin, variables `$CATALOGO` y
`$ZONAS`, y posts de Instagram con productos del catálogo. `clientes/ejemplo/` es un cliente
completo sin tema propio: es la base para arrancar `clientes/rino/`.

**Criterio para Melera:** no cambia nada. Cada opción nueva tiene un valor por defecto igual al
comportamiento de hoy; los snapshots de `tests/salida-melera/` no se tocan y su admin no suma
pantallas ni campos de funciones que no usa.

**Fuera de la fase 3:** el cotizador funcionando (queda el módulo declarado y, si la config lo
pide, un link), la identidad editable por el dueño (ver "Etapa de refinamiento"), multi-tenant,
hosting en Coolify y el despliegue real de Rino (queda listo para desplegar, sin desplegar).

Cada paso termina con `npm test`, `npm run lint` y `npm run build` en verde, con `CLIENTE=melera`,
`CLIENTE=ejemplo` y `CLIENTE=rino`; los cambios de esquema, con migraciones que conservan los datos.

---

## Opciones: quién elige qué

Siguiendo los cuatro lugares de CLAUDE.md, cada opción vive en uno de dos lados:

- **Config del cliente** (`clientes/<slug>/config.ts`, validada con zod): la eligen al dar de alta
  al cliente (o cuando pide un cambio). Define **cómo se ve y qué funciones tiene** la tienda.
- **Admin** (la base del cliente): la cambia **el dueño** cuando quiera. Define **cómo usa** esas
  funciones. Si una función está apagada en la config, su parte del admin no aparece.

| Opción | Dónde | Valores | Por defecto (= Melera) |
|---|---|---|---|
| Tema | config | propio (`tema.css` + `tema/`) o neutro | neutro si el cliente no trae tema |
| Apariencia del tema neutro | config | fondo `claro` / `oscuro`, fuentes de títulos y texto (Google Fonts) | lo de hoy |
| Inicio | config | `destacado` (hero del producto) / `catalogo` (hero de la marca + grilla) | `destacado` |
| Módulos | config | instagram, autorespuestas, chatIA, cotizador (ya existe) | como hoy |
| Cotizador | config | apagado / link a donde esté hoy | apagado |
| Categorías | config prende, admin carga | lista de categorías; cada producto en una; filtro en `/productos` | apagado |
| Opciones de producto | config prende, admin carga | por producto, listas como "Color: rojo, negro, blanco" que elige el comprador | apagado |
| Productos a pedido | config prende, admin carga | por producto: sin límite de stock + aviso de demora ("se imprime en 3 a 5 días") | apagado |
| Productos, precios, stock, promos, zonas, preguntas | admin | (ya existe) | — |

Las opciones de producto son **simples**: lo elegido queda guardado en el ítem del pedido (y se ve
en el admin, en Telegram y en Mercado Pago), sin precio ni stock propio por opción. Si un cliente
necesita precio o stock por variante, se planifica aparte.

## Qué falta para arrancar

- **Base de desarrollo de Rino** (lo único que frena): una base de Neon aparte (proyecto o rama
  nueva, como la de la plataforma), así sus datos no se mezclan con los de Melera. Va en
  `.env.rino.local`. Nunca se usa una base de producción.
- **Material de la marca** (no frena): nombre, dominio, Instagram, logo, colores, textos, tono,
  productos y zonas. Mientras tanto, `clientes/rino/` usa valores provisorios marcados como tales,
  y el día de la charla se cambian en su config y en el admin.

---

## Pasos

### Paso 1: dos clientes en la misma máquina ✅ (2026-09-28)
Hecho: `scripts/con-cliente.js` (`npm run cliente -- <slug> <comando>`), `.env.rino.local` con la
base de desarrollo de Rino (secretos propios; MP, Telegram, Gemini e Instagram vacíos), y
`npm run db:migrate`. Todas las migraciones aplicadas en la base de Rino.

Plan original:
Cada cliente con su archivo de entorno de desarrollo (`.env.local` para Melera,
`.env.rino.local` para Rino) y scripts con el cliente elegido (`dev`, `build`, migrar, `db:seed`)
que muestran a qué base se conectan y se niegan si el cliente y el archivo no coinciden.
Migraciones y seed de Rino en su base de desarrollo.

### Paso 2: `clientes/rino/` provisorio ✅ (2026-09-28)
Hecho: `clientes/rino/` (config con todo lo provisorio marcado `PROVISORIO`, paleta naranja de
relleno, logo de texto "3DR", foto por defecto, `app/icon.svg`, plantillas "simple" del ejemplo
con sus colores) y seed de muestra (maceta, llavero y soporte; retiro, CABA con costo y resto del
país a coordinar; preguntas con `$CATALOGO` y `$ZONAS`), cargado en su base. El cliente de ejemplo
también suma `app/icon.svg` (antes pedía `/favicon.ico` y daba 404). `tests/cliente-rino.test.ts`.
Build con `CLIENTE=rino` y capturas en Chrome (escritorio y celular) sin errores.
Para más adelante: el campo "Barrio" del checkout viene del envío solo a CABA de Melera; para
otras zonas quedaría mejor "Localidad" (cambia el checkout de Melera, se decide aparte).

Plan original:
A partir de `clientes/ejemplo/`: config con identidad provisoria (nombre "3DRinoMaker", colores y
textos de relleno claramente marcados), logo de texto, imágenes por defecto, y seed con unos
productos, zonas y preguntas de muestra. Tests: la config valida y sus páginas no tienen rastros de
Melera ni del cliente de ejemplo.

### Paso 3: apariencia del tema neutro
Opciones `fondo` (claro/oscuro) y fuentes en la config para el tema neutro. Lo que hoy asume fondo
oscuro (avisos de error, íconos de éxito/pendiente/falla del checkout, detalles blancos
semitransparentes) pasa al contrato de tema. Capturas en Chrome del ejemplo y de Rino con las dos
variantes, en escritorio y celular; Melera sin cambios.

### Paso 4: inicio de catálogo
`inicio: "destacado" | "catalogo"`. En `catalogo`: hero de la marca (sin el precio de un
producto), grilla de productos y "Quiénes somos". Melera en `destacado`.

### Paso 5: categorías
Config `catalogo.categorias`. Tabla de categorías (admin: crear, renombrar, ordenar, borrar si no
tiene productos), cada producto en una (opcional); `/productos` con filtro
(`/productos?categoria=macetas`) cuando hay dos o más; `$CATALOGO` y el chat agrupan por categoría.

### Paso 6: opciones de producto
Config `catalogo.opciones`. En el admin, cada producto puede tener opciones (nombre y valores); la
ficha las pide antes de agregar al carrito; el carrito distingue la misma pieza con distintas
opciones; el ítem del pedido guarda lo elegido (admin, Telegram, Mercado Pago). Migración sin tocar
los pedidos existentes.

### Paso 7: productos a pedido
Config `catalogo.aPedido`. En el admin, un producto puede ser "a pedido" con su demora; no tiene
límite de stock, la ficha, el carrito y el checkout muestran la demora, y el pago no descuenta su
stock.

### Paso 8: Instagram, respuestas automáticas y chat de Rino
Plantillas de Instagram en `clientes/rino/instagram/` (arranca con la "simple" del ejemplo con los
colores de Rino), tono y ejemplos provisorios para Gemini, reglas de respuestas automáticas de
muestra y datos del chat. Qué módulos quedan prendidos se elige en su config.

### Paso 9: cotizador previsto
El módulo `cotizador` sigue apagado. Config opcional con la URL de donde está hoy: si está, la
tienda muestra un link ("Cotizá tu impresión"). Queda anotado qué hace falta para integrarlo
(rutas, datos, cómo una cotización se convierte en pedido).

### Paso 10: cierre
Compra de punta a punta con `CLIENTE=rino` y todas las opciones prendidas (categorías, opciones,
a pedido, zona con costo), Melera sin cambios (snapshots y comparación visual con `main`), guía
"cómo crear un cliente" con todas las opciones, y la lista de lo que Rino necesita para
desplegarse (variables de entorno, credenciales de MP, Meta y Telegram, dominio).

---

## Etapa de refinamiento (después de la fase 3)

- **Identidad editable por el dueño desde el admin** (decidido el 2026-09-28: se quiere, pero no
  en esta fase porque se complica). Lo que implica: el logo y las imágenes necesitan subir archivos
  (depende del hosting, igual que las fotos de producto); los colores y los textos pasarían a la
  base con la config como valor de reserva, validados al guardar en vez de al compilar. Para no
  cerrarle la puerta, en esta fase los componentes leen la identidad solo a través de `cliente`
  (`src/plataforma/cliente`), no importando la config directo.
- Subir fotos de producto desde el admin (pendiente desde la fase 2).
