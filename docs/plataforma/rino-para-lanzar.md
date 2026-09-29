# 3DRinoMaker: qué falta para lanzarlo

La tienda de Rino funciona de punta a punta en desarrollo (`npm run cliente -- rino dev`, con su
base de desarrollo de `.env.rino.local`). Antes de publicarla faltan dos cosas: **la charla con el
dueño** (todo lo provisorio) y **las cuentas y el despliegue**.

## 1. Lo provisorio (buscar `PROVISORIO` en `clientes/rino/`)

| Qué | Dónde | Cómo se cambia |
|---|---|---|
| Nombre tal cual se muestra, dominio, usuario de Instagram, SEO | `config.ts` | a mano en la config |
| Colores (escala 50–900 a partir de 2 o 3 de la marca) | `config.ts` → `colores` | a mano |
| Fondo claro u oscuro y fuentes (hoy Space Grotesk e Inter) | `config.ts` → `apariencia` | a mano (el build revisa que Google Fonts las tenga) |
| Logo e imagen para compartir | `public/logo.svg`, `app/icon.svg`, `public/compartir.svg` | reemplazar los archivos (SVG o PNG) |
| Foto por defecto de un producto sin foto | `public/producto.svg` | reemplazar el archivo |
| Textos de la tienda (inicio, "El taller", pie, consultas, privacidad) | `config.ts` → `textos` | a mano |
| Tono y datos para Gemini (chat y textos de Instagram) | `config.ts` → `ia` | a mano |
| Diseño de las imágenes de Instagram | `instagram/simple-*.html` | ajustar el HTML/CSS (o sumar otro estilo) |
| Link al cotizador | `config.ts` → `enlaceCotizador` | agregar la URL cuando se sepa dónde está |
| Qué funciones usa: categorías, opciones (color), productos a pedido, home de catálogo, módulos | `config.ts` → `catalogo`, `inicio`, `modulos` | prender o apagar |
| Productos, precios, stock, promos, categorías, colores, qué se hace a pedido | la base | **el dueño, desde el admin** |
| Zonas de envío y costos | la base | el dueño, desde `/admin/envios` |
| Preguntas frecuentes y respuestas automáticas (arrancan apagadas) | la base | el dueño, desde el admin |

Los productos, zonas y preguntas del seed son de muestra: en la base de producción conviene
cargar los reales desde el admin (o cambiar `seed.ts` antes de correrlo por primera vez).

## 2. Cuentas y despliegue

Una instancia propia (hoy Vercel; más adelante, Coolify en un VPS), con estas variables:

| Variable | Para qué | ¿Hace falta para lanzar? |
|---|---|---|
| `CLIENTE=rino` | elige el cliente | sí |
| `DATABASE_URL` | **base de producción nueva** (Neon, aparte de la de desarrollo) | sí |
| `ADMIN_USER`, `ADMIN_PASSWORD` | acceso al admin (clave fuerte y propia) | sí |
| `NEXTAUTH_SECRET` | firma de la sesión del admin (secreto nuevo) | sí |
| `NEXT_PUBLIC_BASE_URL` | el dominio público (redirects de Mercado Pago) | sí |
| `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` | Mercado Pago de Rino (su cuenta) | sí (sin esto no se puede pagar) |
| `IMAGE_SIGNING_SECRET`, `GENERATE_WEBHOOK_SECRET` | imágenes de Instagram | si usa Instagram |
| `CRON_SECRET` | los crons diarios | si usa Instagram o respuestas automáticas |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | avisos de pedidos y consultas, aprobación de posts | recomendado |
| `GEMINI_API_KEY` | chat y textos de Instagram | si usa el chat o Instagram |
| `IG_APP_ID`, `IG_APP_SECRET`, `IG_WEBHOOK_VERIFY_TOKEN`, `IG_ACCESS_TOKEN`, `IG_USER_ID` | Instagram (ver `docs/instagram-setup.md`) | si usa Instagram o respuestas automáticas |

Pasos, con la base de producción nueva:
1. `npx prisma migrate deploy` contra esa base (todas las migraciones).
2. `CLIENTE=rino npm run db:seed` (o cargar todo desde el admin).
3. Desplegar con esas variables. El aviso de pagos de Mercado Pago no se configura: el checkout
   manda `/api/mercadopago/webhook` en cada preferencia. Si corresponde, conectar Telegram
   (`/admin/instagram` → bot) e Instagram (`docs/instagram-setup.md`).
4. Una compra de prueba con las credenciales de prueba de Mercado Pago antes de pasar a las reales.

Con un módulo sin sus credenciales (por ejemplo Instagram sin la cuenta de Meta), la tienda
funciona igual: ese módulo no hace nada. Si no se va a usar al principio, conviene apagarlo en
`config.ts` → `modulos` para que tampoco aparezca en el admin.
