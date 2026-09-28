# Melera — Templates IG v4

12 plantillas HTML (3 estilos × 4 tipos) que se renderizan con **Chromium en nuestra propia app de Vercel**
(`puppeteer-core` + `@sparticuz/chromium`). No hay servicio externo ni cuota mensual de imágenes.
Cada plantilla sirve para **feed y story**: el diseño se adapta solo según el tamaño de render.

| Formato | Tamaño | Uso |
|---|---|---|
| Feed | 1080 × 1350 (4:5) | Post del feed (Graph API de Meta) |
| Story | 1080 × 1920 (9:16) | Story que se publica vía Graph API de Meta |

## Archivos

| Archivo | Qué es |
|---|---|
| `organico-{presentacion,dato,producto}.html` | Estilo orgánico: fondo oscuro, gotas de miel, logo en círculo crema |
| `geo-{presentacion,dato,producto}.html` | Estilo geométrico: fondo crema, hexágonos, logo directo |
| `panal-{presentacion,dato,producto}.html` | Estilo panal (el de la web): panal con luz cálida, abeja con jarrón, logo sobre una celda crema |
| `panal-fondo.js` | Dibujo compartido del estilo panal (panal con semilla + abeja). El motor lo inserta en cada `panal-*.html` donde dice `<!--SCRIPT:panal-fondo.js-->` |
| `logo.png` | Logo Melera (abeja + hexágono + wordmark). El motor lo inyecta como data URI en `{{logo_src}}` |

Los estilos se declaran en `clientes/melera/config.ts` (`estilosInstagram`, con `usaSemilla` para el panal);
el build falla si falta alguna de sus plantillas.

El motor es de la plataforma: `src/plataforma/imagenes/plantillas.ts` (normaliza y valida los datos, rellena la
plantilla, arma y verifica las URLs firmadas) y `render.ts` (abre Chromium y saca la captura JPEG; en Vercel usa
`@sparticuz/chromium`, en local Chrome/Edge instalado o `CHROME_PATH`). Rutas que lo usan:
`src/app/api/generate/route.ts` y `src/app/api/img/[formato]/[token]/route.ts`.

Tipografías: Fraunces + Poppins (Google Fonts, `<link>` en el `<head>`).

## Variables por tipo

### Presentación
| Variable | Ejemplo |
|---|---|
| `{{tagline}}` | `miel artesanal` (va en mayúsculas arriba del título) |
| `{{titulo}}` | `Pura, <em>natural</em>` |
| `{{texto}}` | `Desde nuestras colmenas a tu mesa.` |
| `{{cta}}` | `Escribinos por DM` |

### Dato curioso
| Variable | Ejemplo |
|---|---|
| `{{numero}}` | `50.000+` |
| `{{texto_dato}}` | `abejas pueden vivir en una sola colmena` |
| `{{tagline}}` | `la magia de la colmena` |

El encabezado "¿Sabías que?" es fijo en la plantilla.

### Producto
| Variable | Ejemplo |
|---|---|
| `{{imagen_url}}` | `https://melera.vercel.app/producto-miel.png` (PNG sin fondo; también acepta `/producto-miel.png`) |
| `{{nombre_producto}}` | `Miel <em>Artesanal</em>` |
| `{{caracteristicas}}` | `Miel pura\|Frasco 500 g` (separadas por `\|`, se muestran como etiquetas; opcional) |
| `{{precio}}` | `6500` o `$6.500` (se muestra `$6.500`) |

Obligatorios por tipo: presentación `tagline`, `titulo`, `texto` · dato `numero`, `texto_dato` · producto `imagen_url`, `nombre_producto`, `precio`.

### Promo
| Variable | Ejemplo |
|---|---|
| `{{tagline}}` | `llevá más, pagá menos` |
| `{{titulo}}` | `Más miel, <em>mejor precio</em>` |
| `{{promos}}` | `1 frasco\|$ 6.500\|;5 frascos\|$ 30.000\|$ 6.000 c/u · ahorrás $ 2.500;…` (filas separadas por `;`, columnas por `\|`) |
| `{{cta}}` | `Pedila en la web` |
| `{{imagen_url}}` | la foto del frasco (la pone la web) |

`{{promos}}` **no se escribe a mano**: `src/lib/instagram/generar.ts` lo arma con `promosParaPlantilla` (`src/lib/precios.ts`) a partir de las promos de "Precio y stock" al momento de generar, así la imagen nunca muestra un precio viejo. Gemini escribe solo `tagline`, `titulo`, `cta` y el caption (recibe las promos reales y no puede inventar otras). En orgánico y geo, si la foto queda de menos de 200 px (feed o textos largos), se oculta. Obligatorios: `titulo`, `promos`.

### Estilo panal

- **Semilla:** el panal del fondo sale de `{{semilla}}` (el id del post; lo manda `src/lib/instagram/generar.ts`). Mismo post → misma imagen; posts distintos → celdas distintas. Sin semilla (por ejemplo desde `/api/generate`) usa un valor fijo.
- **Abeja:** se ubica después de medir los textos y la foto, en el primer lugar candidato (`data-lugares`) donde no toca nada. Si no hubiera lugar libre, sale sin abeja.
- **Contraste:** velos radiales oscuros detrás de cada texto. Medido en 20 semillas: mínimo 6:1.
- **Dato:** `{{numero}}` grande en Fraunces color miel, `{{texto_dato}}` debajo y `{{tagline}}` arriba con el hexágono.
- **Presentación:** `{{tagline}}`, `{{titulo}}`, `{{texto}}` y `{{cta}}` como botón hexagonal (sin sticker de encuesta: la API de Meta no lo permite).
- **Producto:** la foto con resplandor, `{{nombre_producto}}`, `{{caracteristicas}}` en una línea (separadas por ·), `{{precio}}` y "melera.vercel.app".
- La plantilla avisa con `window.__plantillaLista` cuándo terminó de medir y dibujar; `render.ts` la espera.
- Referencias de diseño aprobadas: `docs/templates-panal/*.dc.html`.

### Reglas
- `{{titulo}}` y `{{nombre_producto}}` aceptan `<em>…</em>` / `<i>…</i>` (cursiva color miel) y `<br>`. El resto del HTML se escapa.
- Los textos largos se achican solos (script al final de cada plantilla). La foto de producto también cede espacio si no entra todo.
- `precio` numérico se formatea como `$6.500`; cualquier etiqueta que sea un precio se descarta (el precio ya va grande abajo).
- `imagen_url` tiene que responder con una imagen: si es una página (por ejemplo `/producto`) o da error, `/api/generate` devuelve 400 con el motivo.
- `{{logo_src}}` lo completa el motor; no hay que mandarlo.

### Compatibilidad con la Sheet "Cronograma"
`normalizeData` (`src/plataforma/imagenes/plantillas.ts`) traduce los nombres de columna que usa Make:

| Sheet / Make | Plantilla |
|---|---|
| `subtitulo` | `texto` |
| `caracteristica_1..3` | `caracteristicas` (unidas con `\|`) |
| `numero` + `sufijo` | `numero` |

`tag_inferior`, `intro_label`, `unidad`, `descripcion`, `categoria`, `presentacion` y `hashtags` no se muestran en la imagen.

## Quién las usa

Desde el 2026-09-24 las usa la propia web: `src/lib/instagram/generar.ts` llama a `buildImageUrls` directamente para cada post del cronograma (`/admin/instagram`). `/api/generate` sigue disponible por si otro sistema necesita generar imágenes con la clave `x-webhook-secret`.

## Endpoints

### `POST /api/generate`
Header `x-webhook-secret` (= env `GENERATE_WEBHOOK_SECRET`). Body `application/x-www-form-urlencoded`
(lo que usa Make) o JSON: `tipo`, `estilo`, `fecha` + las variables del tipo.

```json
{
  "image_url": "https://melera.vercel.app/api/img/feed/<token>.jpg",
  "story_image_url": "https://melera.vercel.app/api/img/story/<token>.jpg",
  "filename": "2026-09-23_organico-dato.jpg"
}
```

Antes de responder pide las dos imágenes, así un error de render aparece acá (502) y no recién al publicar.
Errores de datos → 400 con `{"error": "…"}` (Make los reenvía a Telegram).

### `GET /api/img/{feed|story}/<token>.jpg`
Renderiza la plantilla y devuelve el JPEG. El token lleva los datos comprimidos (deflate + base64url) y una
firma HMAC (env `IMAGE_SIGNING_SECRET`, o `GENERATE_WEBHOOK_SECRET` si no está), así que nadie puede
generar imágenes arbitrarias con nuestra URL. La respuesta es inmutable y queda en la CDN de Vercel un año:
el primer pedido tarda 2–7 s (Chromium), los siguientes son instantáneos. Se toleran `.jpg` extra al final.

Si se cambia una plantilla, las URLs viejas ya cacheadas siguen mostrando el diseño anterior; las nuevas salen con el nuevo.

## Uso local

Con `npm run dev`, generar un post desde `/admin/instagram` (con `IG_DRY_RUN=true` no publica): las imágenes
se dibujan con Chrome/Edge instalado (o `CHROME_PATH`).

Para previsualizar solo el HTML: abrir la plantilla en Chrome con la ventana en 1080×1350 o 1080×1920.

## Deploy
- `@sparticuz/chromium` y `puppeteer-core` están en `serverExternalPackages` y el binario de Chromium se incluye con `outputFileTracingIncludes` (`next.config.js`).
- Requieren Node ≥ 22.17: el proyecto de Vercel está en Node 24.x. No agregar `engines.node` al `package.json` (fijar 22.x rompió el build).
