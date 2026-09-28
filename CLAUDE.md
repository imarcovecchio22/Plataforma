# CLAUDE.md

## Qué es este repo

La **plataforma base** para ofrecer a emprendimientos: tienda propia (catálogo, checkout de Mercado
Pago, stock, pedidos) + Instagram en piloto automático (textos con Gemini, imágenes con Chromium,
aprobación por Telegram, publicación con la Graph API) + respuestas automáticas de DMs que llevan
a la compra, con un panel de admin para gestionar todo. Sin Make, Buffer ni ManyChat.

Nació como un clon de **Melera** (tienda de miel artesanal). Melera sigue en producción desde **su
repo original**: nada de lo que se haga acá la afecta. Acá Melera pasa a ser "el cliente `melera`
de la plataforma".

## Decisiones tomadas (no re-discutir sin que lo pida el usuario)

- **Un solo repo, una instancia desplegada por cliente**, cada una con su propia base y sus propias
  credenciales. Nada de forks por cliente. **Todavía NO es multi-tenant** (eso viene después, cuando
  se sepa qué se repite entre clientes).
- La variable de entorno **`CLIENTE`** (ej. `melera`, `rino`) elige qué cliente carga cada despliegue.
- Todo lo específico de un cliente va en **uno de cuatro lugares**:
  1. **Código genérico** → el repo, igual para todos.
  2. **Identidad** (nombre, logo, paleta, fuentes, textos de la landing, tema visual, plantillas de
     imágenes de Instagram, tono de marca para Gemini) → `clientes/<slug>/`, con un `config.ts`
     tipado y validado con zod. **El build tiene que fallar si la config es inválida.**
  3. **Datos del negocio** (productos, precios, stock, zonas de envío, preguntas frecuentes, reglas
     de autorespuesta, cronograma de posts) → la base de cada cliente, editable desde el admin.
  4. **Secretos** (Mercado Pago, Meta, Telegram, base) → variables de entorno de cada despliegue.
- **Funcionalidades opcionales = módulos** que se prenden por config (autorespuestas, chat IA, y más
  adelante un cotizador de impresión 3D que ya existe aparte).
- **El tema del panal con la abeja es identidad de Melera**, no de la plataforma: va a
  `clientes/melera/`. La plataforma necesita un **tema neutro por defecto**.
- El enum de estilos de Instagram (`organico`, `geo`, `panal`) pasa a ser **un string validado contra
  las plantillas que declara cada cliente**.
- El cliente se carga con un alias de build (`@cliente` → `clientes/$CLIENTE`); con `CLIENTE` vacía
  el build falla. Los assets de `clientes/<slug>/public/` se copian a `public/` antes del build.
- El admin lleva los colores de cada cliente. Moneda, locale y zona horaria van en la config.
- Las preguntas frecuentes van a la base (con su pantalla en el admin) ya en la fase 1.
- Hosting probable a futuro: VPS con Coolify, una app por cliente. No planificar para eso todavía,
  pero **no atarse a cosas exclusivas de Vercel** si hay una alternativa simple.

## Fases

1. **Convertir Melera en el cliente `melera` de la plantilla SIN cambiar comportamiento.** Melera
   tiene que quedar idéntica y todos los tests tienen que seguir pasando.
   **✅ Terminada el 2026-09-28 (rama `fase-1`).**
2. **Multiproducto y zonas de envío configurables** (antes: un solo producto y envío fijo "solo CABA").
   **✅ Terminada el 2026-09-28 (rama `fase-2`).**
3. **Crear `clientes/rino/` y levantar 3DRinoMaker** (impresiones 3D, catálogo de productos fijos:
   listado, ficha por slug, pedido con ítems, checkout de MP con varios ítems, stock por producto,
   zonas de envío, identidad propia; el cotizador queda previsto como módulo).

Inventario de lo específico de Melera: [`docs/plataforma/inventario-melera.md`](docs/plataforma/inventario-melera.md).
Plan de la fase 1: [`docs/plataforma/plan-fase-1.md`](docs/plataforma/plan-fase-1.md).
Plan de la fase 2 (con las decisiones tomadas): [`docs/plataforma/plan-fase-2.md`](docs/plataforma/plan-fase-2.md).

## Reglas de trabajo

- **Pasos chicos**, cada uno con los tests pasando (`npm test`) antes de seguir.
- **Nunca conectarse a la base de producción de Melera.** Solo a la base de desarrollo de `.env.local`.
- **No desplegar nada** ni configurar Vercel / Meta / Telegram reales desde acá.
- **Cambios de esquema siempre con migraciones de Prisma** (`npx prisma migrate dev --name <nombre>`
  contra la base de desarrollo). Nunca `db push`.
- **Si una decisión no está cubierta acá, preguntar antes de elegir.**
- Commits y pushes solo cuando el usuario lo pide.

## Notas del código

- Next.js 16 (App Router): el middleware es `src/proxy.ts`; `params`, `searchParams`, `cookies()` y
  `headers()` son asíncronos. Lint con `npm run lint`.
- Todo en español rioplatense: nombres de variables, comentarios, textos y mensajes de commit.
- Tests con vitest en `tests/` (mockean Prisma; no necesitan base). `tests/salida-melera/` fija la
  salida de Melera con snapshots: si cambia uno, revisar el diff y actualizar solo si es lo buscado.
- La CLI de Prisma lee `.env`, no `.env.local`: para migrar, exportar antes `DATABASE_URL` de
  `.env.local`. La base de Neon se suspende sola; por eso la URL lleva `connect_timeout=30`.
  `npm run db:seed` y los scripts sí leen `.env.local` (usan `@next/env`).
- `public/` y los íconos de `src/app/` (`icon.png`, `apple-icon.png`…) son **generados**: los copia
  `scripts/preparar-cliente.ts` desde `clientes/<CLIENTE>/public/` y `clientes/<CLIENTE>/app/` antes de
  `dev` y `build`. Las imágenes nuevas van en la carpeta del cliente, nunca en `public/`.
- **Contrato de tema**: los componentes públicos usan solo variables (`--texto`, `--acento`,
  `--fondo-seccion`…) y clases (`.tema-publico`, `.btn`, `.campo`, `.tarjeta`…) genéricas; cada tema
  las define (lista completa arriba de `clientes/melera/tema.css`). Nada de colores fijos en los
  componentes públicos. El tema se copia a `src/app/tema-cliente.css` (generado) y lo importa
  `globals.css` con `postcss-import`, así sus `@layer` funcionan. Los componentes del tema (entrada,
  fondo animado y logo) los exporta `clientes/<slug>/tema/index.tsx` y la plataforma los toma de
  `@cliente/tema`; lo que el fondo animado no tiene que tapar lleva `data-fondo-evita`.
- **Módulos**: una ruta nueva de un módulo opcional va en `RUTAS_DE_MODULOS`
  (`src/plataforma/cliente/modulos.ts`) y, si no es del admin, en el `matcher` de `src/proxy.ts`;
  sus páginas del admin empiezan con `exigirModulo("<módulo>")`.
- Un cliente sin `tema.css` o sin `tema/index.tsx` usa el **tema neutro** (`src/plataforma/tema/`).
  `clientes/ejemplo/` es un cliente completo sin tema: sirve para probar sin Melera
  (`CLIENTE=ejemplo npm run dev`) y como base para uno nuevo.
- **Catálogo y pedidos**: el producto destacado es el primero activo por orden (`getMainProduct`);
  con más de un producto activo la tienda usa el carrito (`localStorage`, `<slug>-carrito`). Un pedido
  tiene ítems (`OrderItem`, con nombre y precio del momento) y una zona de envío (`Order.provincia`
  guarda su nombre y `Order.costoEnvio` su costo). Los precios y las promos siempre se recalculan en
  el servidor.
- **Variables de textos** (`$PRODUCTO`, `$PRECIO`, `$PROMOS`, `$CATALOGO`, `$ZONAS`):
  `src/lib/variables.ts` (reemplazo, sin servidor) y `datosParaTextos()` (valores de la base). El chat
  arma productos y envíos con la base; `ia.chat.datos` de la config no tiene que hablar de envíos.
- En los tests, `tests/zonas-de-prueba.ts` arma mocks de `@/lib/zonas` con las zonas del seed de cada
  cliente.
- Más detalle (Instagram, autorespuestas, seguridad, base) en el `README.md`.
