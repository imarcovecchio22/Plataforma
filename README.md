# Plataforma: tienda + Instagram en piloto automático

Plataforma para emprendimientos: **tienda propia** (landing, productos, checkout con Mercado Pago, stock y pedidos), **Instagram en piloto automático** (cronograma, textos con Gemini, imágenes generadas con Chromium, aprobación desde Telegram y publicación con la Graph API de Meta) y **respuestas automáticas de DMs** que llevan a la compra, con un panel de administración para gestionar todo (pedidos, productos, zonas de envío, consultas, posts, autorespuestas y logs). Todo propio, sin Make, Buffer ni ManyChat.

Cada cliente es **una instancia desplegada** de este mismo repo, con su propia base y sus propias credenciales. La variable de entorno `CLIENTE` elige qué cliente carga el despliegue; su identidad (marca, tema visual, textos, plantillas de Instagram, tono para Gemini) vive en `clientes/<slug>/`, los datos del negocio en su base y los secretos en sus variables de entorno. Las funcionalidades opcionales (autorespuestas, chat con IA, cotizador) se prenden por cliente.

El primer cliente es **Melera** (miel artesanal), de donde salió el código; el segundo va a ser **3DRinoMaker** (impresiones 3D). Las fases 1 (Melera como cliente de la plataforma, sin cambiar lo que se ve) y 2 (varios productos con carrito y zonas de envío configurables) están terminadas; la próxima es Rino. Detalle en [`CLAUDE.md`](CLAUDE.md) y [`docs/plataforma/`](docs/plataforma/). Las secciones de más abajo todavía describen el funcionamiento con Melera como ejemplo.

## Clientes

```
clientes/<slug>/
  config.ts        identidad, validada con zod (src/plataforma/cliente/esquema.ts): nombre, dominio,
                   Instagram, SEO, colores, imágenes, módulos, estilos de Instagram, textos para Gemini,
                   unidad de venta, textos de la tienda y región
  seed.ts          datos iniciales del negocio (productos, zonas de envío, preguntas frecuentes, respuestas automáticas)
  public/          imágenes que se sirven tal cual (logo, foto del producto, imagen para compartir)
  app/             favicons (icon.png, apple-icon.png…)
  tema.css         opcional: variables y clases del contrato de tema (si no, el tema neutro)
  tema/index.tsx   opcional: entrada, fondo animado, logo y fuentes del tema (si no, los neutros)
  instagram/       plantillas <estilo>-<tipo>.html de cada estilo declarado, logo.png y scripts
```

- `CLIENTE=<slug>` elige el cliente. Antes de `dev` y `build`, `scripts/preparar-cliente.ts` valida la config, las imágenes y las plantillas (**el build falla si algo está mal**) y copia `public/`, los favicons y el tema a su lugar (esos archivos generados no van a git).
- `clientes/melera/` es Melera (tema del panal). `clientes/ejemplo/` es una tienda de ejemplo sin tema propio: sirve para probar sin Melera (`CLIENTE=ejemplo npm run dev`).

### Crear un cliente nuevo

1. Copiar `clientes/ejemplo/` a `clientes/<slug>/` y cambiar `slug` en `config.ts` (tiene que ser igual al nombre de la carpeta).
2. Completar la config: marca, colores, imágenes (en `public/`), textos, módulos y estilos de Instagram (con sus plantillas en `instagram/`).
3. Opcional: tema propio (`tema.css` y `tema/index.tsx`); si no, se usa el neutro con los colores de la config y su `apariencia` (fondo claro u oscuro y fuentes de Google Fonts, que se bajan al preparar el cliente y se sirven desde el sitio).
4. Base de desarrollo propia (cada cliente tiene la suya): crear `.env.<slug>.local` con `CLIENTE="<slug>"`, su `DATABASE_URL` y el resto de las variables (las que no tenga quedan vacías, nunca se toman las de otro cliente). Después `npm run cliente -- <slug> db:migrate` y `npm run cliente -- <slug> db:seed` (con los datos de `seed.ts`).
5. `npm run cliente -- <slug> dev` y revisar; `npm test` tiene que seguir pasando.

### Desarrollar varios clientes en la misma máquina

`npm run cliente -- <slug> <comando>` (o `node scripts/con-cliente.js <slug> <comando>`) corre un script de npm (`dev`, `build`, `db:migrate`, `db:seed`…) o cualquier comando (`prisma studio`, `node …`) con el entorno de ese cliente: `.env.<slug>.local` o, si no existe, `.env.local` (el de Melera). Antes de correr muestra a qué base se conecta, y no corre nada si el archivo declara otro `CLIENTE`. Los clientes se levantan de a uno (comparten `public/` y `.next/`, que se regeneran al cambiar de cliente).

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) ORM + PostgreSQL ([Neon](https://neon.tech/) en producción)
- [MercadoPago Checkout Pro](https://www.mercadopago.com.ar/developers)
- Autenticación de admin vía JWT (`jose`) en cookie `httpOnly`

## Funcionalidades

- Landing con presentación del producto destacado (el primero de Productos), "Quiénes somos" y, si hay más, los demás productos; o, con `inicio: "catalogo"` en la config, la marca y la grilla de todos los productos
- Catálogo: `/productos` (listado) y `/producto/<slug>` (ficha). Con un solo producto, `/producto` muestra su ficha y la tienda no usa carrito (como Melera); con varios, `/producto` manda al listado y se compra con un **carrito** guardado en el navegador (`/carrito`)
- Checkout con selector de cantidad (un producto) o con los ítems del carrito, promos por cantidad de cada producto y **zona de envío**: las zonas se cargan en `/admin/envios`, con costo fijo (se suma al total y a Mercado Pago como ítem "Envío") o "a coordinar"; con una sola, se elige sola
- Integración con MercadoPago (Checkout Pro) y webhook de confirmación de pago
- `/consultas`: preguntas frecuentes (precio real desde la base) + formulario mobile-first para quien llega desde Instagram (botones de la respuesta automática; responder por Instagram o email, anti-spam con honeypot y tiempo mínimo). Cada consulta se guarda y se avisa por Telegram
- `?origen=` (ej. `instagram` desde los botones de la respuesta automática de los DMs) se guarda en las consultas y en los pedidos que pasan por `/producto` → Comprar → checkout
- Avisos por Telegram de pedidos pagados y consultas nuevas, directo desde la web al bot (`src/lib/telegram.ts`, sin Make). Diagnóstico en `GET/POST /api/admin/telegram` (dice si el bot está configurado y manda un mensaje de prueba)
- Panel `/admin` protegido: pedidos (estado, detalle por ítem y envío, origen), productos (precio, stock, promos, unidad, foto, activo y orden), envíos, consultas (link directo a ig.me / mailto, marcar respondida, archivar) y **logs**. Fechas en hora de Argentina
- `/admin/logs`: registro de eventos de la web (pedidos, pagos, consultas, avisos de Telegram, logins y cambios del admin, imágenes de Instagram) con filtros en la URL: `?nivel=error`, `?tipo=pago`, `?q=texto`, `?pagina=2`. Se guarda 90 días. Para registrar algo nuevo: `logEvent(tipo, mensaje, { nivel, detalle })` de `src/lib/logs.ts` (nunca lanza error)
- `/api/generate` + `/api/img/...`: imágenes de feed y story para Instagram, renderizadas con Chromium en Vercel (plantillas en `clientes/melera/instagram/`)
- **Instagram** (`/admin/instagram`): cronograma de posts en la base. Todos los días (Vercel Cron, 9–10 h Argentina) se generan los pendientes y llegan a Telegram con 4 botones (Feed, Historia, Feed + Historia, Descartar). Al tocar uno se publica directo con la Graph API de Meta. Ver "Instagram" más abajo
- **Respuestas automáticas de Instagram** (`/admin/autorespuestas`, reemplazan a ManyChat): reglas por palabra clave para DMs, con botones de link, Probador y registro de los mensajes recibidos. En producción desde el 2026-09-24 (ManyChat suspendido). Los comentarios están programados pero necesitan acceso avanzado de Meta (App Review), pendiente. Ver "Respuestas automáticas" más abajo
- `/privacidad`: política de privacidad (Meta la pide para pasar la app a Live)

## Desarrollo local

### Requisitos

- Node.js 22.17+ (lo exige `@sparticuz/chromium`; en Vercel el proyecto usa Node 24.x — no fijar `engines.node` en `package.json`)
- Una base PostgreSQL accesible (local vía Docker o remota)

### Setup

```bash
npm install
cp .env.example .env.local   # completar con tus valores, ver tabla abajo
npx prisma migrate deploy    # aplica las migraciones de prisma/migrations
npm run dev                  # http://localhost:3000
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `CLIENTE` | Cliente de este despliegue: carpeta `clientes/<CLIENTE>` (ej. `melera`). Sin ella no arranca ni compila |
| `DATABASE_URL` | Connection string de PostgreSQL (Neon en producción) |
| `MP_ACCESS_TOKEN` | Access token de MercadoPago (server-side) |
| `MP_PUBLIC_KEY` | Public key de MercadoPago (client-side) |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Credenciales de acceso al panel `/admin` |
| `NEXTAUTH_SECRET` | Secreto para firmar el JWT de sesión de admin |
| `NEXTAUTH_URL` | URL base del sitio (usada en la sesión) |
| `NEXT_PUBLIC_BASE_URL` | URL pública del sitio, usada en los redirects de MercadoPago |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram que avisa pedidos pagados y consultas nuevas (opcional; sin él no se avisa) |
| `TELEGRAM_CHAT_ID` | Id del chat de Telegram donde llegan esos avisos (el mismo de la automatización de Instagram) |
| `GEMINI_API_KEY` | API key de Gemini para el chat de atención (widget flotante) |
| `GENERATE_WEBHOOK_SECRET` | Secreto que Make manda en `x-webhook-secret` a `/api/generate`; también firma las URLs de `/api/img` |
| `IMAGE_SIGNING_SECRET` | Opcional: secreto propio para firmar las URLs de `/api/img` (si no está, usa `GENERATE_WEBHOOK_SECRET`) |
| `META_PAGE_TOKEN` | Token de la página de Facebook vinculada a Instagram (publica feed e historias). Vence cada ~60 días |
| `META_IG_USER_ID` | Id numérico de la cuenta de Instagram del cliente |
| `TELEGRAM_WEBHOOK_SECRET` | Clave que Telegram manda en cada toque de botón (16+ caracteres: letras, números, `_` o `-`) |
| `CRON_SECRET` | Clave con la que Vercel Cron llama a `/api/cron/instagram` y `/api/cron/instagram-token` |
| `IG_APP_ID` / `IG_APP_SECRET` | App de Instagram (Instagram Login) de las respuestas automáticas. El secreto valida la firma del webhook |
| `IG_WEBHOOK_VERIFY_TOKEN` | Texto al azar que se carga también en Meta al configurar el webhook |
| `IG_ACCESS_TOKEN` / `IG_USER_ID` | Token de larga duración e id de la cuenta de Instagram del cliente para responder. Después se renueva solo y vive en la tabla `InstagramToken` |
| `IG_DRY_RUN` | `true` = hace todo menos publicar en Instagram (para probar) |
| `GEMINI_COPY_MODEL` | Opcional: modelo de Gemini para los textos (por defecto `gemini-flash-lite-latest`) |

`NEXTAUTH_SECRET` es obligatoria en producción: sin ella el login de `/admin` falla después de validar usuario y contraseña (el proxy, `src/proxy.ts`, tampoco puede verificar la sesión). Después de cargar o cambiar una variable en Vercel hay que hacer **Redeploy**: los deploys que ya existen no la toman.

Ver `.env.example` para el detalle completo.

### Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas automáticas (vitest, carpeta `tests/`) |
| `npm run lint` | ESLint (`eslint.config.mjs`, reglas de Next + TypeScript) |
| `npm run build` | `prisma generate` + build de producción |
| `npm start` | Levanta el build de producción |
| `npx prisma migrate dev --name <nombre>` | Crea una migración nueva a partir de cambios en `schema.prisma` (contra una base de desarrollo) |
| `npx prisma migrate deploy` o `npm run db:migrate` | Aplica las migraciones pendientes (producción, o la base de desarrollo de otro cliente con `npm run cliente -- <slug> db:migrate`) |
| `npm run cliente -- <slug> <comando>` | Corre el comando con el entorno de desarrollo de ese cliente (ver "Desarrollar varios clientes") |
| `npm run db:push` | Sincroniza el schema sin migraciones — ya no se usa desde 2026-09-24 |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run db:seed` | Carga datos de ejemplo |

## Instagram

- **Cargar posts:** `/admin/instagram` (fecha, tipo, estilo, tema; en productos también nombre, precio y foto). Cada post pasa por `pendiente → generando → esperando_aprobacion → publicando → publicado` (o `descartado` / `error`). Cada cambio de estado es atómico, así que no hay doble publicación.
- **Generación:** `/api/cron/instagram` (Vercel Cron, `vercel.json`) toma hasta 3 pendientes por corrida. También avisa por Telegram si el token de Meta vence en 7 días o menos. Desde el admin se puede generar al momento.
- **Aprobación:** Telegram llama a `/api/telegram/webhook` (clave secreta, solo el chat de Melera). Para que los botones lleguen a esta web hay que tocar una vez **"Conectar el bot a esta web"** en `/admin/instagram`.
- **Estilos:** `organico` (fondo oscuro), `geo` (fondo crema) y `panal` (como la web: panal con luz cálida y abeja con jarrón; el panal sale del id del post). Plantillas y reglas en [`clientes/melera/instagram/README.md`](clientes/melera/instagram/README.md).
- **Imágenes a Telegram:** la web descarga las dos imágenes al generarlas y se las **sube** a Telegram como archivo (no le pasa la URL), así Telegram no depende de poder entrar al sitio. Meta, al publicar, sí usa la URL.
- **Código:** `src/lib/instagram/`. Los errores quedan en `/admin/logs?tipo=instagram` y llegan por Telegram.
- **Previews:** el cron solo corre en producción. Para probar los botones en una preview, activar *Protection Bypass for Automation* en Vercel y usar `IG_DRY_RUN=true`. Ojo: las imágenes se dibujan en el dominio de producción (`siteUrl()`), así que un **estilo nuevo** recién se puede probar después de desplegarlo.

## Diseño del panal (páginas públicas)

- **Referencia:** el prototipo aprobado `clientes/melera/docs/panal-prototipo.html`. Los valores ajustables (radio de huida, velocidades, gotas, luz, parallax, duración de la entrada) están en `src/components/panal/config.ts`.
- **Dónde va:** `/`, `/producto`, `/consultas` y `/privacidad` comparten el layout `src/app/(publico)/layout.tsx` (Header, Footer, fondo de panal y abeja). `/checkout` tiene su layout con la misma paleta, fondo oscuro liso y sin animación. El admin no cambia.
- **Código:** `components/panal/dibujo.ts` (capas y entrada), `abeja.ts` (abeja y gotas), `motor.ts` (un solo `requestAnimationFrame`, pausa con la pestaña oculta, DPR hasta 2), `Panal.tsx` (se carga con `dynamic(ssr: false)`). Los botones que la abeja esquiva llevan `data-bee-avoid`.
- **Entrada:** solo en la home, una vez por sesión (`sessionStorage`), con "Saltar" y Esc. Para que no parpadee, un script mínimo marca `<html data-entrada>` antes de pintar y un velo CSS muestra el primer cuadro hasta que carga el canvas.
- **Reducir movimiento:** sin entrada, fondo quieto y sin abeja.
- **Estilos:** paleta como variables CSS (`--wax`, `--honey`, `--glow`…) y clases públicas propias (`.btn-panal`, `.btn-ghost`, `.campo-panal`, `.tarjeta-panal`, `.velo-texto`), separadas de las del admin.
- **Rendimiento:** la foto del frasco es el LCP. `<FotoFrasco lcp />` la pide enseguida y con prioridad alta (en Next 16, `priority` quedó obsoleto). No cargar imágenes en el velo con `<img>`: se descargan aunque estén ocultas; por eso el logo va como fondo CSS.

## Respuestas automáticas

- **Configuración en Meta:** paso a paso en [`docs/instagram-setup.md`](docs/instagram-setup.md), incluido el orden para dejar ManyChat sin respuestas dobles.
- **Webhook:** `/api/instagram/webhook` valida la firma `X-Hub-Signature-256`, responde 200 enseguida y procesa en segundo plano. Cada mensaje o comentario se registra en `InstagramEvento` por su id (un reintento de Meta no responde dos veces). No repite la misma regla a la misma persona por 2 h (`HORAS_ENTRE_RESPUESTAS`); para pruebas, "Reiniciar límite" en la tabla de mensajes lo libera para esa cuenta.
- **Coincidencia:** sin tildes, mayúsculas ni signos, por palabra completa ("info" no coincide con "informal"). Gana la regla activa de mayor prioridad. En la respuesta, `$PRODUCTO`, `$PRECIO` y `$PROMOS` se reemplazan por los datos actuales del producto destacado, `$CATALOGO` por todos los productos con su precio y `$ZONAS` por las zonas de envío (las mismas variables sirven en las preguntas frecuentes; ver `src/lib/variables.ts`).
- **Token:** `/api/cron/instagram-token` (diario) lo renueva cuando le quedan menos de 15 días; si falla, avisa por Telegram. Con 5 errores seguidos al responder también avisa.
- **Código:** `src/lib/instagram/reglas.ts` (coincidencia, sin servidor: la usa también el Probador), `webhook.ts` (firma y lectura del aviso), `autorespuestas.ts` (procesamiento), `mensajes.ts` y `token.ts` (API de Instagram).

## Seguridad

- Login del admin: comparación de claves resistente a ataques de tiempo y bloqueo de 15 min tras 5 intentos fallidos por IP.
- `/api/admin/*` rechaza cambios que vengan de otro origen (CSRF). Headers de seguridad en todo el sitio, incluida una Content Security Policy (`next.config.js`: solo recursos propios; en previews también permite la barra de Vercel).
- Límites: 5 consultas por IP cada 10 min; chat: 20 mensajes por IP cada 10 min (se registran en `/admin/logs?tipo=chat`, solo la IP) y largo máximo por mensaje.
- Las URLs que carga el servidor (fotos de producto) tienen que ser https públicas. Al dibujar imágenes, Chromium solo puede cargar fuentes de Google e imágenes https públicas.
- Dependencias al día (Next 16, React 19, `mercadopago` 3, vitest 5): `npm audit` sin vulnerabilidades al 2026-09-24.

- Pagos: el paso a "pagado" es atómico (`updateMany` condicionado dentro de la transacción), así que avisos repetidos o simultáneos de Mercado Pago descuentan el stock y avisan una sola vez, y un rechazo tardío no pisa un pago aprobado. Si falla la consulta a Mercado Pago, el webhook responde 500 para que reintente.
- Pruebas (`npm test`, carpeta `tests/`): además de la lógica de Instagram, las rutas de login (bloqueo), consultas (honeypot y límite), checkout (validación, zonas de envío, precio de la base), pagos (idempotencia y concurrencia), el proxy del admin (sesión y CSRF), los crons y el webhook de Mercado Pago.

### Notas de Next.js 16

- El middleware se llama **proxy** (`src/proxy.ts`, función `proxy`) y corre en Node.
- `params`, `searchParams`, `cookies()` y `headers()` son asíncronos: siempre con `await`.
- `next lint` ya no existe: se usa `npm run lint` (ESLint directo). `next build` no corre el lint.
- En `outputFileTracingIncludes` las claves son globs: una ruta con corchetes (`[formato]`) no coincide literal, por eso la de imágenes usa `/api/img/**`. Sin eso, Chromium no se incluye en la función y las imágenes de Instagram fallan en Vercel.

## Base de datos

Desde 2026-09-24 el esquema se maneja con migraciones (`prisma/migrations`). `0_init` es la foto del esquema que existía antes (creado con `db push`) y en Neon se marcó como aplicada con `prisma migrate resolve --applied 0_init`. Los cambios nuevos van como migraciones: crear con `migrate dev` y aplicar en producción con `migrate deploy` **antes** de hacer push del código que las usa.

**Las previews usan la misma base que producción.** Si se agrega un valor a un enum (por ejemplo un estilo nuevo) y se crea un registro con ese valor desde una preview, producción falla al leerlo (su Prisma no conoce el valor) hasta que se despliega el código nuevo. Probar esos cambios después del merge, o no crear registros con el valor nuevo desde la preview.

## Deploy

Pensado para desplegarse en [Vercel](https://vercel.com/) conectando este repo. Configurar las variables de entorno de la tabla anterior en el proyecto de Vercel, usando credenciales reales de Neon y MercadoPago (no las de test).

> Nota: mientras `MP_ACCESS_TOKEN` / `MP_PUBLIC_KEY` sean valores de test, el checkout no procesa pagos reales.

**Firewall de Vercel:** el proyecto no tiene Bot Protection ni Attack Mode, pero Vercel aplica solo una mitigación automática ("System Mitigations") si ve mucho tráfico automatizado desde una IP: le muestra un desafío anti-bots (403 `x-vercel-mitigated: challenge`) a todo lo que no sea un navegador desde ahí, y a veces alcanza a otros clientes automáticos. Pasó el 2026-09-25 después de muchas pruebas automáticas (Lighthouse, capturas) contra producción: hacer esas pruebas en local (`next start`). Meta (webhooks e imágenes) pasa el desafío; por eso a Telegram se le suben las imágenes.
