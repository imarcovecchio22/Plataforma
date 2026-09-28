# Inventario de lo específico de Melera

Relevado el 2026-09-28 sobre `main` (`1b346f5`). Cada ítem dice **dónde está**, **en qué categoría cae**
y **a qué fase le toca**. Categorías:

- **C** = código genérico (se queda en el repo, pero hay que generalizarlo)
- **I** = identidad → `clientes/<slug>/` (config tipada con zod, assets, tema, plantillas)
- **D** = datos del negocio → la base del cliente, editable desde el admin
- **S** = secretos / ids de cuentas → variables de entorno del despliegue

> Algunos ítems hoy mezclan dos categorías (ej. el prompt del chat tiene tono de marca **I** y datos
> de envío **D**). Se marcan con las dos y la fase en que se separan.

## 1. Nombre, dominio y cuentas

| Qué | Dónde | Cat. | Fase | Nota |
|---|---|---|---|---|
| "Melera", "Melera \| Miel Artesanal", descripción SEO, `siteName`, `alt` de la OG | `src/app/layout.tsx:19-47` | I | 1 | |
| Fallback de URL `https://melera.vercel.app` | `src/app/layout.tsx:19`, `src/lib/telegram.ts:123` | I | 1 | Dominio de producción del cliente |
| `melera.vercel.app/...` escrito en textos (chat, errores del chat) | `src/app/api/chat/route.ts` (prompt y 2 mensajes de error), `src/components/ChatWidget.tsx:67` | I | 1 | Se arma con el dominio de la config |
| `@melera.miel` e `instagram.com/melera.miel` | `Footer.tsx:21`, `privacidad/page.tsx:30,71`, `autorespuestas/page.tsx:99`, prompt del chat | I | 1 | Usuario de Instagram de la marca |
| "Panel Melera", "Melera · Admin" | `admin/login/page.tsx:53`, `AdminNav.tsx:31` | I | 1 | |
| Asunto del mail "Tu consulta a Melera" | `src/lib/consultas.ts:10` | I | 1 | |
| "✅ Prueba de avisos de la web de Melera", nombre de archivo `melera.jpg` | `api/admin/telegram/route.ts:37`, `src/lib/telegram.ts:93` | I | 1 | |
| Cookie `melera_admin_session` | `src/lib/auth.ts:4`, `src/proxy.ts:4` | C | 1 | Derivar del slug (`<slug>_admin_session`): para Melera queda igual y no desloguea a nadie |
| Clave de sessionStorage `melera-entrada-vista` | `components/panal/config.ts` | I | 1 | Va con el tema del panal |
| Comentarios "chat de Melera", "cuenta de Melera" | `src/lib/telegram.ts`, `src/lib/instagram/webhook.ts:59` | C | 1 | Solo comentarios |
| `package.json` `"name": "melera"` | `package.json` | C | 1 | |
| `TELEGRAM_CHAT_ID="6219737981"` | `.env.example`, `README.md` | S | 1 | Sacar el valor real de los ejemplos y la doc |
| `META_IG_USER_ID` `17841431194977725` | `README.md` | S | 1 | Ídem |

## 2. Textos de la tienda

| Qué | Dónde | Cat. | Fase | Nota |
|---|---|---|---|---|
| Hero: "Miel artesanal, pura y natural", Apícola Mercedes, Tomás Jofré, "el frasco de 500 g" | `src/components/Hero.tsx` | I | 1 | Textos de la landing |
| "Quiénes somos" completo | `src/components/QuienesSomos.tsx` | I | 1 | |
| Footer: "Miel artesanal de Tomás Jofré, Buenos Aires", © Melera | `src/components/Footer.tsx` | I | 1 | |
| Header: logo + "Melera", links "Producto" / "Quiénes somos" | `src/components/Header.tsx` | I | 1 | |
| Política de privacidad (menciona Melera, la miel, @melera.miel) | `src/app/(publico)/privacidad/page.tsx` | I | 1 | Plantilla genérica + datos de la marca; hay un TODO de email de contacto |
| Metadata de `/consultas` ("nuestra miel artesanal") | `consultas/page.tsx:11-13` | I | 1 | |
| Preguntas frecuentes de `/consultas` (precio, envíos, pago, origen de la miel, cristalización) | `consultas/page.tsx:25-60` | **D** (+I) | 1 → 2 | Por decisión son datos del negocio. En fase 1 se pueden estacionar en la config y pasar a la base en fase 2 (ver pregunta abierta) |
| "el frasco de 500 g" junto al precio | `producto/page.tsx:35`, `Hero.tsx:29` | D | 1 → 2 | Es la presentación del producto: con multiproducto va en el producto |
| Alt "Frasco de miel artesanal Melera" | `FotoFrasco.tsx:23` | I / D | 1 → 2 | |
| Saludo del chat "¡Hola! 🐝 Soy el asistente de Melera", título "Melera 🍯" | `ChatWidget.tsx:9,78` | I | 1 | |
| Placeholders del admin ("miel, precio, comprar", "Miel <em>Artesanal</em>", "frasco 500 g", "cuánto sale la miel?", link `melera.vercel.app`) | `AutoRespuestaForm.tsx`, `PostIGForm.tsx`, `ProbadorRespuestas.tsx` | I | 1 | Ejemplos por cliente o genéricos |

## 3. Vocabulario "frasco / frascos" (unidad de venta)

| Qué | Dónde | Cat. | Fase | Nota |
|---|---|---|---|---|
| "1 frasco", "5 frascos a $…", "c/u", mensajes de error de promos | `src/lib/precios.ts` (`textoPromos`, `errorEscalones`, `promosParaPlantilla`) | C + I | 1 | La lógica es genérica; la palabra de la unidad (singular/plural) sale de la config. Tests de `precios` esperan "frascos" |
| Selector de cantidad ("1 frasco", "cada frasco", "Elegí cuántos frascos") | `QuantitySelector.tsx` | C + I | 1 | |
| Checkout ("Llevando N frascos pagás…") | `CheckoutForm.tsx:164` | C + I | 1 | |
| Admin de stock ("Precio del frasco", "Desde (frascos)", "Precio por frasco") | `StockEditor.tsx`, `api/admin/stock/route.ts` (comentarios) | C + I | 1 | |
| "$PRECIO se reemplaza por el precio actual del frasco" | `AutoRespuestaForm.tsx:127` | C + I | 1 | |
| FAQ "¿Cuánto sale el frasco?" | `consultas/page.tsx:27` | D | 1 → 2 | |

> Con multiproducto (fase 2) la unidad probablemente pase a ser del producto o de la categoría
> ("frasco", "unidad", "pieza"). En fase 1 alcanza con una unidad por cliente.

## 4. Envíos "solo CABA"

| Qué | Dónde | Cat. | Fase | Nota |
|---|---|---|---|---|
| `provincia` tiene que ser `"CABA"` | `src/lib/validation.ts:14-15` | D | 2 | Zonas de envío en la base |
| `ZONA_DE_ENVIO = "CABA"` y textos "solo dentro de CABA" | `CheckoutForm.tsx:13-14,117,168` | D | 2 | |
| FAQ de envíos | `consultas/page.tsx:36` | D | 2 | |
| "Envíos: por ahora solo dentro de CABA…" en el prompt del chat | `api/chat/route.ts` | D | 2 | |
| Tests de checkout y validación que esperan CABA | `tests/validation.test.ts`, `tests/pagos.test.ts` y otros (9 menciones) | — | 2 | Se quedan igual en fase 1 |

## 5. Supuesto de un único producto

| Qué | Dónde | Cat. | Fase |
|---|---|---|---|
| `getMainProduct()`: devuelve el primero y, si no hay, **crea "Miel Artesanal 500g"** con precio y descripción de Melera | `src/lib/product.ts` | C + D | 1 (sacar el producto por defecto) → 2 |
| `prisma/seed.ts` crea el mismo producto (con otro precio: 6000 vs 6500) | `prisma/seed.ts` | D | 1 |
| `Order.productId` + `cantidad` (un producto por pedido) | `prisma/schema.prisma` | C | 2 |
| Checkout con un ítem, stock de un solo producto | `api/checkout/route.ts`, `src/lib/orders.ts` | C | 2 |
| Páginas `/`, `/producto`, `/checkout`, `/consultas`, `/admin/stock` usan `getMainProduct()` | varias | C | 2 |
| `/producto` sin slug | `src/app/(publico)/producto/page.tsx` | C | 2 |
| `$PRECIO` / `$PROMOS` de las autorespuestas = el del producto principal | `src/lib/instagram/autorespuestas.ts:76` | C | 2 |
| Post tipo `promo` usa las promos del producto principal y la foto `/producto-miel-500g.png` | `src/lib/instagram/generar.ts:206-213` | C + I | 1 (foto) → 2 |
| Aviso de Telegram de pedido pagado con un producto | `src/lib/orders.ts` (`notifyOrderPaid`) | C | 2 |

## 6. Prompts de Gemini (tono de marca + datos)

| Qué | Dónde | Cat. | Fase | Nota |
|---|---|---|---|---|
| Prompt del chat: "Sos el asistente virtual de Melera…", producto, elaboración, Apícola Mercedes, envíos, pago, consultas, Instagram, sitio | `src/app/api/chat/route.ts:21-35` | I + D | 1 → 2 | Tono y datos de la marca → config; producto/precio ya vienen de la base; envíos → zonas (fase 2) |
| Prompt de copy: "Sos copywriter de Melera, marca argentina de miel artesanal. Tono cálido…" | `src/lib/instagram/copy.ts:69` | I | 1 | Tono de marca |
| "promos son los precios REALES (miel de 500 g)" | `copy.ts:77` | I / D | 1 → 2 | |
| Ejemplos dentro del prompt (Artesanal / Sin aditivos / Cosecha 2026 / Frasco 500 g, "Pura, *natural*") | `copy.ts:80-82` | I | 1 | |
| "El dato debe ser real y verificable **sobre abejas/apicultura/miel**" | `copy.ts:83` | I | 1 | Temática de los "datos curiosos" |
| Modelos `gemini-3.6-flash` (chat) y `gemini-flash-lite-latest` (copy) | `chat/route.ts:10`, `copy.ts:5` | C | — | Genéricos |

## 7. Tema visual del panal (identidad de Melera)

| Qué | Dónde | Cat. | Fase |
|---|---|---|---|
| Canvas del panal, abeja, gotas, motor, entrada, velo | `src/components/panal/*` (6 archivos, ~1000 líneas) | I | 1 |
| Layout público con velo de entrada y `PanalDiferido` | `src/app/(publico)/layout.tsx` | C + I | 1 (el layout queda genérico; el fondo lo aporta el tema) |
| `LogoCelda` (logo en celda hexagonal) | `src/components/LogoCelda.tsx` | I | 1 |
| Paleta `--wax`, `--honey`, `--glow`… y clases `.tema-panal`, `.btn-panal`, `.campo-panal`, `.tarjeta-panal`, `.titulo-panal`, `.precio-panal`, `.foto-frasco`, `.velo-*` | `src/app/globals.css` (~290 de 348 líneas) | I (+ C) | 1 | Separar: base genérica con variables semánticas + tema de Melera |
| Checkout con `tema-panal` sin animación | `src/app/checkout/layout.tsx` | C + I | 1 |
| Fuentes Poppins + Fraunces | `src/app/layout.tsx:1-16` | I | 1 |
| Paleta Tailwind `miel-*`, `crema`, `beige`, `marron`, `ambar`, sombra `soft` | `tailwind.config.ts` | I | 1 | Se usa en **todo el admin** (`border-miel-100`, `text-miel-700`…) y en el `ChatWidget` |
| `.container-melera` | `globals.css`, `admin/(dashboard)/layout.tsx`, `AdminNav.tsx` | C | 1 | Solo el nombre |
| Prototipo y referencias de diseño | `clientes/melera/docs/panal-prototipo.html`, `docs/templates-panal/*` | I | 1 | Mover a `clientes/melera/docs/` |

## 8. Instagram: plantillas y estilos

| Qué | Dónde | Cat. | Fase | Nota |
|---|---|---|---|---|
| 12 plantillas HTML (3 estilos × 4 tipos), `panal-fondo.js`, `logo.png` | `melera-templates/*.html`, `*.js`, `logo.png` | I | 1 | → `clientes/melera/instagram/` |
| Motor de plantillas (normaliza, valida, firma URLs, renderiza) | `melera-templates/generate.js`, `render.js`, `server.js` | C | 1 | Genérico: queda en la plataforma y recibe la carpeta y los estilos del cliente |
| `ESTILOS = ['organico','geo','panal']` fijos | `generate.js:19` | I | 1 | Los declara cada cliente |
| `TIPOS` (presentacion, producto, dato, promo) y campos obligatorios | `generate.js:20-28` | C | — | Genéricos (confirmar en fase 3 si Rino necesita otros) |
| Semilla solo para `estilo === "panal"` | `src/lib/instagram/generar.ts:160` | C | 1 | Que la plantilla declare si usa semilla, o mandarla siempre |
| Enum Prisma `EstiloPostIG` | `prisma/schema.prisma` | C | 1 | → `String` con migración |
| `z.enum(["organico","geo","panal"])` | `src/lib/validation.ts:365` | C | 1 | Validar contra los estilos del cliente |
| Opciones de estilo en el form | `src/components/admin/PostIGForm.tsx` | C | 1 | Salen de la config |
| Foto por defecto `https://melera.vercel.app/producto-miel-500g.png` | `PostIGForm.tsx:27` | I / D | 1 → 2 | |
| Rutas `require("…/melera-templates/generate")` | `generar.ts:148`, `api/generate/route.ts:4`, `api/img/.../route.ts:4` | C | 1 | |
| `outputFileTracingIncludes` con `./melera-templates/*` | `next.config.js:47-53` | C | 1 | Depende del cliente |
| `melera-templates/README.md` | | I + C | 1 | Parte genérica (motor) y parte de Melera (estilos) |
| Tests que apuntan a `melera-templates/` y a los estilos | `tests/templates*.test.ts`, `tests/render.test.ts` | — | 1 | Se ajustan las rutas; los casos quedan |

## 9. Assets

| Qué | Dónde | Cat. | Fase |
|---|---|---|---|
| Logos e íconos `public/brand/melera-*` (9 archivos) | `public/brand/` | I | 1 |
| Foto del producto `public/producto-miel-500g.png`, `producto-miel.png` | `public/` | I / D | 1 → 2 (con multiproducto, la foto es del producto) |
| Imágenes OG `public/melera-og-{clara,oscura}.png` | `public/` | I | 1 |
| `src/app/icon.png`, `src/app/apple-icon.png` (favicons por convención de Next) | `src/app/` | I | 1 |
| Carpeta `images/` en la raíz (logos, prototipo): no la usa el código | `images/` | I | 1 | Mover a `clientes/melera/` |

## 10. Datos del negocio que hoy están en código o migraciones

| Qué | Dónde | Cat. | Fase | Nota |
|---|---|---|---|---|
| Producto por defecto (nombre, descripción, precio, stock) | `src/lib/product.ts`, `prisma/seed.ts` | D | 1 | |
| Regla "Bienvenida (como ManyChat)" con textos y links de Melera | `prisma/migrations/20260925000100_regla_inicial_como_manychat/migration.sql` | D | 1 | **Es una migración con datos**: cualquier base nueva (Rino) la recibe al hacer `migrate deploy`. Ver pregunta abierta |
| Preguntas frecuentes | `consultas/page.tsx` | D | 2 | |
| Zonas de envío | ver §4 | D | 2 | |

## 11. Región (no es de Melera, pero está fijo)

| Qué | Dónde | Cat. | Nota |
|---|---|---|---|
| Moneda `ARS` | `api/checkout/route.ts:79`, `src/lib/utils.ts:4` | C o I | Todos los clientes son de Argentina por ahora |
| Locale `es-AR`, zona `America/Argentina/Buenos_Aires` | `src/lib/utils.ts`, `src/lib/instagram/botones.ts:41` | C o I | Idem; el cron de Vercel (`0 12 * * *` UTC) asume esa zona |

## 12. Acoplamiento a Vercel (para no empeorarlo; no se toca en fase 1)

- `waitUntil` de `@vercel/functions` en los webhooks de Instagram y Telegram.
- Crons en `vercel.json` (con Coolify serían crons del sistema llamando a las mismas rutas con `CRON_SECRET`).
- `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_AUTOMATION_BYPASS_SECRET`.
- `render.js` elige `@sparticuz/chromium` si `VERCEL` o `AWS_LAMBDA_FUNCTION_NAME`; si no, busca Chrome local (en un VPS alcanzaría con `CHROME_PATH`).
- CSP con `vercel.live` en previews (`next.config.js`).

## Lo que ya es genérico (no hace falta tocar)

Mercado Pago (`src/lib/mercadopago.ts`, webhook, idempotencia de pagos), logs, seguridad (login,
CSRF, límites), consultas (salvo el asunto del mail), el flujo de Instagram (cron, generación,
aprobación por Telegram, publicación, token), las autorespuestas (reglas, webhook, probador) y los
precios por escalón (salvo la palabra "frasco").
