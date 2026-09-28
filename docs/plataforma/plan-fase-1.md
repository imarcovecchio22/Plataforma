# Fase 1: Melera como cliente `melera` de la plataforma

**Objetivo:** que todo lo específico de Melera (ver [`inventario-melera.md`](inventario-melera.md))
salga del código genérico y quede en `clientes/melera/`, **sin cambiar lo que se ve ni lo que hace**
con `CLIENTE=melera`.

**Criterio de "idéntica":** con `CLIENTE=melera`, el HTML de las páginas, los textos que recibe
Gemini, los mensajes de Telegram, las imágenes de Instagram y las respuestas de la API son los
mismos que hoy. Lo único que cambia es de dónde salen.

**Fuera de la fase 1:** multiproducto, zonas de envío, preguntas frecuentes en la base (fase 2),
Rino (fase 3), sacar la dependencia de Vercel.

**Línea de base (2026-09-28):** `npm test` → 17 archivos, 231 tests, todos pasan.

Cada paso termina con `npm test`, `npm run lint` y `npm run build` en verde, y se revisa antes de
pasar al siguiente.

---

## Paso 0: Red de seguridad ✅ (2026-09-28)

Tests en `tests/salida-melera/` que fijan la salida actual de Melera con snapshots:

- `paginas.test.ts`: metadata y HTML de `/`, `/producto`, `/consultas`, `/privacidad`, el checkout
  (formulario, éxito, falla, pendiente) y el admin (login, pedidos con menú, detalle, stock,
  consultas, Instagram, autorespuestas, logs), con la base mockeada y la fecha fija.
- `textos.test.ts`: instrucciones del chat y sus mensajes de error, prompt del copy de Instagram
  (los 4 tipos), avisos de Telegram (consulta, pedido pagado, prueba), links para responder y nombre
  de la cookie del admin.
- `instagram.test.ts`: HTML de las 12 plantillas (`__snapshots__/plantillas/*.html`, el logo va
  aparte como hash) y, al generar posts, los datos firmados en las URLs, lo que recibe Gemini y lo
  que llega a Telegram.

Regla para los pasos siguientes: si un snapshot cambia, el diff tiene que ser **solo** lo buscado
(por ejemplo, clases renombradas en los pasos 7 y 8) y se actualiza a conciencia con
`npx vitest run -u`, revisando el diff antes de seguir.

Resultado: 20 archivos, 277 tests (231 anteriores + 46 nuevos); lint, tipos y build en verde.

## Paso 1: Esqueleto de la config del cliente ✅ (2026-09-28)

Hecho: `src/plataforma/cliente/` (esquema zod, `definirCliente`, `problemasDeConfig`, `cliente`),
`clientes/melera/config.ts` (slug, nombre, dominio, región), alias `@cliente/*` en
`next.config.js` (Turbopack) y `vitest.config.ts` (los tests usan Melera salvo otro `CLIENTE`),
`scripts/validar-cliente.ts` antes de `dev` y `build`, y `formatPrecio`, `formatFecha`,
`hoyLocal` (antes `hoyArgentina`) y la moneda de Mercado Pago leen la región de la config.
Queda fijo en `vercel.json` el horario de los crons (12 UTC = 9 h de Argentina).

Plan original:

- `src/plataforma/cliente/esquema.ts`: esquema zod de la config (se arranca solo con `slug`,
  `nombre` y `dominio`, y se va ampliando en los pasos siguientes).
- `clientes/melera/config.ts` con esos valores.
- El cliente elegido por `CLIENTE` se carga con un alias de build (`@cliente` → `clientes/$CLIENTE`):
  cada despliegue incluye solo el código y los assets de su cliente. Si `CLIENTE` está vacía, el
  build falla.
- Config `region` (moneda, locale, zona horaria) con los valores actuales (ARS, `es-AR`,
  `America/Argentina/Buenos_Aires`) y que la usen `utils.ts`, el checkout y `hoyArgentina`.
- Script `validar-cliente` que corre antes del build: falla si `CLIENTE` no existe o si la config no
  valida. Se agrega a `npm run build`.
- Tests: config válida pasa, config inválida falla con un mensaje claro, `CLIENTE` desconocido falla.

Nada del código de la app la usa todavía.

## Paso 2: Nombre, dominio y cuentas ✅ (2026-09-28)

Hecho: la config suma `instagram` y `seo` (título, descripción, alt de la imagen), más
`hostCliente` para los textos. Salen de la config: metadata del layout, títulos de `/consultas` y
`/privacidad`, fallback de `siteUrl()`, usuario de Instagram (footer, privacidad, admin),
"Panel …", "… · Admin", Header y Footer, asunto del mail, mensaje de prueba de Telegram, nombre
del archivo de las fotos, saludo del chat, mensajes de error del chat, placeholders del admin y la
cookie (`<slug>_admin_session`, igual que antes para Melera). Paquete renombrado a `plataforma`.
Sin ids reales en `.env.example` ni en el README. Quedan para sus pasos: el prompt del chat (5),
el título "Melera 🍯" del chat (3), logos e imágenes (6), `.container-melera` (7) y las plantillas (10).

Plan original:

Reemplazar con la config lo de la sección 1 del inventario: título y metadata SEO, fallback de
`siteUrl()`, `@melera.miel`, "Panel Melera", asunto del mail, textos de Telegram, `melera.jpg`,
cookie del admin (`<slug>_admin_session`, igual para Melera), `package.json`. Sacar los ids reales de
Telegram y Meta de `.env.example` y del README.

## Paso 3: Textos de la tienda ✅ (2026-09-28)

Hecho: config `textos` (emoji de la marca, hero, aclaración junto al precio, Quiénes somos con
`**negrita**` vía `TextoConNegrita`, pie, descripción de `/consultas`, frases de privacidad,
título del chat y ejemplos de los formularios del admin). Los nombres de secciones y botones
genéricos ("Producto", "Quiénes somos", "Comprar ahora", "¿Tenés alguna consulta?") quedan en el
código, iguales para todos. Las preguntas frecuentes siguen en el código hasta el paso 3b.

Plan original:

Config `textos` para Hero, Quiénes somos, Header, Footer, privacidad, metadata de `/consultas`,
saludo y título del chat, placeholders del admin. Los componentes quedan genéricos y leen la config.

Las preguntas frecuentes de `/consultas` van a la base en el paso 3b.

## Paso 3b: Preguntas frecuentes en la base ✅ (2026-09-28)

Hecho: modelo `PreguntaFrecuente` (migración `20260928052507_preguntas_frecuentes`, aplicada en la
base de desarrollo junto con las 11 anteriores). La respuesta admite `$PRODUCTO`, `$PRECIO`,
`$PROMOS`, `[[ solo si hay promos ]]` y links `[texto](#ancla | /ruta | https://…)`
(`src/lib/preguntas.ts`). Pantalla `/admin/preguntas` (crear, editar con vista previa, ordenar,
mostrar/ocultar, borrar) y rutas `/api/admin/preguntas`. `/consultas` lee de la base y, sin
preguntas visibles, muestra solo el formulario. Las de Melera están en `clientes/melera/seed.ts`
y `npm run db:seed` las carga si la tabla está vacía. El snapshot de `/consultas` no cambió; el
del menú del admin suma solo el link nuevo.

Plan original:

- Modelo `PreguntaFrecuente` (pregunta, respuesta, orden, activa) con su migración.
- La respuesta admite `$PRECIO` y `$PROMOS` (como las autorespuestas), así la del precio sigue
  saliendo de la base.
- Pantalla `/admin/preguntas` para crear, editar, ordenar y desactivar, con sus rutas de API
  (misma protección que el resto del admin).
- Las preguntas actuales de Melera van al seed de Melera (paso 13), con el mismo texto. La de envíos
  queda como texto hasta que existan las zonas (fase 2). El link "escribinos acá abajo" de la
  respuesta de envíos se resuelve con un formato mínimo de links en la respuesta.
- Tests: rutas de API, reemplazo de `$PRECIO`/`$PROMOS` y que `/consultas` muestre lo de la base.

## Paso 4: Unidad de venta ("frasco / frascos") ✅ (2026-09-28)

Hecho: config `unidad` (singular, plural, género) y helpers `cantidadConUnidad`, `cadaUno`,
`deLaUnidad` y `masBarato` en `src/plataforma/cliente`. Los usan `precios.ts` (promos, errores y
filas de la plantilla), el selector de cantidad, el checkout, el admin de stock, la ayuda de
autorespuestas y el texto de promos que recibe Gemini. Test con un cliente de "piezas" (femenino).
Quedan con "frasco" el prompt del chat y del copy (paso 5) y la foto `FotoFrasco` (paso 6).

Plan original:

Config `unidad: { singular, plural }` y que la usen `precios.ts`, `QuantitySelector`,
`CheckoutForm`, `StockEditor` y el form de autorespuestas. Los tests de `precios` quedan iguales
porque Melera dice "frasco".

## Paso 5: Prompts de Gemini ✅ (2026-09-28)

Hecho: config `ia` (descripción y tema de la marca; producto y datos del chat, con `$SITIO`;
rol, tono, a qué corresponden las promos, temática de los datos curiosos y ejemplos del copy).
El esqueleto de los prompts (formato, reglas, protección contra instrucciones en los datos) queda
en el código. Los snapshots de los dos prompts no cambiaron. Test con otra marca inventada: ningún
rastro de Melera en los prompts. El texto de envíos sigue en `ia.chat.datos` hasta la fase 2.

Plan original:

- Config `marca`: descripción corta, tono, temática de los datos curiosos y ejemplos para el copy.
- Config `chat`: los datos que hoy están escritos en el prompt (elaboración, pago, consultas,
  Instagram). El texto de envíos queda en la config hasta que existan las zonas (fase 2).
- `armarPrompt` y `buildSystemPrompt` arman el mismo texto a partir de la config. El test del paso 0
  confirma que es idéntico carácter por carácter.

## Paso 6: Assets ✅ (2026-09-28)

Hecho: `public/` → `clientes/melera/public/`, favicons → `clientes/melera/app/`, `images/` →
`clientes/melera/marca/` (fuentes de diseño, no se sirven). `scripts/validar-cliente.ts` pasa a
`scripts/preparar-cliente.ts`: además de validar, falla si falta una imagen de la config y copia
los assets a `public/` y `src/app/` (generados, en `.gitignore`). Config `imagenes` (logo del
admin, imagen para compartir, foto del producto con alt y tamaño). `FotoFrasco` → `FotoProducto`.
Probado con `next start`: imágenes, favicons y `og:image` iguales. Quedan para el paso 8 las
imágenes del tema del panal (`LogoCelda`, logo de la entrada) y la clase `.foto-frasco`.

Plan original:

Mover logos, íconos, OG, favicons y la foto del frasco a `clientes/melera/public/` (y `images/` a
`clientes/melera/`). Un paso previo al build copia `clientes/<slug>/public/` a `public/` (que pasa a
ser generado e ignorado por git). `FotoFrasco` pasa a `FotoProducto`, con la
foto y el alt que diga la config (en fase 2 van a salir del producto).

## Paso 7: Colores del admin y del chat (Tailwind) ✅ (2026-09-28)

Hecho: config `colores` (escala `marca` 50–900, `claro`, `oscuro`, `sombra`, en hex validado).
El layout raíz define las variables CSS (`src/plataforma/cliente/colores.ts`) y Tailwind las usa:
`miel-*` → `marca-*`, `crema` → `claro`, `marron` → `oscuro`, `shadow-soft` con el tono de la
config; `beige` y `ambar` no se usaban y se sacaron. `.container-melera` → `.contenedor`.
Verificado: los snapshots viejos con el mismo renombrado aplicado son idénticos a los nuevos (salvo
el `<style>` con las variables), y en el CSS compilado las 23 clases de color resuelven al mismo
color (la sombra pasa de 0,251 a 0,25 de opacidad, por el redondeo del minificador de antes).

Plan original:

Renombrar la paleta `miel-*`, `crema`, `marron`… a nombres semánticos (`marca-*`, `fondo`, `texto`…)
que toman sus valores de variables CSS, y definir esas variables con los valores actuales en el tema
de Melera. Mismos colores, otros nombres. `.container-melera` → `.contenedor`.

El admin lleva los colores de cada cliente: las variables salen de la config/tema del cliente.

## Paso 8: Tema del panal → `clientes/melera/`

En tres pasos chicos:

- **8a.** ✅ (2026-09-28) Hecho: `clientes/melera/tema.css` con la paleta del panal y las clases
  públicas; `globals.css` queda con lo genérico e importa el tema (copiado a
  `src/app/tema-cliente.css` por `preparar-cliente`, vía `postcss-import`). Contrato de tema:
  variables `--texto`, `--texto-suave`, `--destacado`, `--acento`, `--acento-rgb`,
  `--fondo-seccion`, `--degrade-seccion`, `--fondo-control`, `--texto-pie` y clases genéricas
  (`.tema-publico`, `.contenedor-publico`, `.btn`, `.btn-sm`, `.link-nav`, `.titulo`, `.campo`,
  `.etiqueta`, `.foto-producto`, `.precio`, `.tarjeta`…); los componentes ya no tienen colores fijos
  del panal. Verificado: snapshots = viejos con el renombrado aplicado; en el CSS compilado las 41
  reglas del tema resuelven igual y el resto (434) no cambió.
  Plan original: separar `globals.css`: base genérica (variables semánticas, clases de botones, campos,
  tarjetas) y `clientes/melera/tema/tema.css` con la paleta del panal. Las clases públicas pasan a
  nombres genéricos (`.btn-panal` → `.btn`, etc.) sin cambiar su CSS.
- **8b.** ✅ (2026-09-28) Hecho: `src/components/panal/` → `clientes/melera/tema/panal/`,
  `LogoCelda` → `clientes/melera/tema/`, la entrada (script + velo) → `clientes/melera/tema/Entrada.tsx`
  y el prototipo → `clientes/melera/docs/`. Cada cliente exporta en `clientes/<slug>/tema/index.tsx`
  un `TemaPublico` (`src/plataforma/tema/tipos.ts`): `Entrada`, `Fondo` y `Logo`, todos opcionales;
  el layout público, el Header y el Footer los usan si están (`@cliente/tema`). `data-bee-avoid` →
  `data-fondo-evita`. Tailwind escanea también `clientes/<CLIENTE>/`. Verificado: snapshots iguales
  salvo el atributo renombrado, CSS compilado idéntico, y en Chrome la home muestra el panal, la
  abeja y el logo sin errores en la consola.
  Plan original: mover `src/components/panal/*`, `LogoCelda` y el velo de entrada a `clientes/melera/tema/`.
  La config del cliente declara el fondo animado y la entrada; el layout público los usa si existen.
- **8c.** ✅ (2026-09-28) Hecho: Poppins y Fraunces → `clientes/melera/tema/fuentes.ts`, con las
  variables genéricas `--fuente-texto` y `--fuente-titulos`; el tema las expone en `fuentes` y el
  layout raíz las pone en el `<body>`. Sin fuentes del tema, `globals.css` usa las del sistema.
  `lang` y el locale de Open Graph salen de `region.locale`. Verificado: snapshot igual salvo los
  nombres de las variables; CSS compilado igual salvo el `:root` con las fuentes por defecto; en
  Chrome, tienda y admin con Poppins y Fraunces.
  Plan original: fuentes: la config del cliente exporta sus fuentes (`next/font` necesita llamadas con
  valores fijos, así que van en un archivo del cliente, no en la config zod).

## Paso 9: Tema neutro por defecto

Un tema de la plataforma (fondo liso, paleta sobria, fuentes del sistema o una sans libre, sin
animación) que se usa cuando el cliente no trae tema. Se prueba con un cliente de prueba
(`clientes/ejemplo/`) que solo tiene la config mínima: la tienda tiene que levantar y verse bien.
Ese cliente sirve después como base para crear `clientes/rino/`.

## Paso 10: Plantillas de Instagram

- Mover las 12 plantillas, `panal-fondo.js` y `logo.png` a `clientes/melera/instagram/`.
- El motor (`generate.js`, `render.js`, `server.js`) queda en la plataforma (`src/plataforma/imagenes/`
  o similar) y recibe la carpeta de plantillas y los estilos del cliente.
- La config declara los estilos (`[{ id: "organico", nombre: "Orgánico" }, …]`) y, por estilo, si
  usa semilla (hoy solo `panal`). El build valida que exista cada `<estilo>-<tipo>.html` declarado.
- `outputFileTracingIncludes` arma la ruta según `CLIENTE`.
- Los tests de plantillas apuntan a la nueva carpeta; los casos no cambian.

## Paso 11: `EstiloPostIG` de enum a string

- Migración de Prisma: `ALTER TABLE "PostIG" ALTER COLUMN "estilo" TYPE TEXT USING "estilo"::text;
  DROP TYPE "EstiloPostIG";` (se crea con `migrate dev` contra la base de desarrollo).
- `postIGSchema` valida `estilo` contra los estilos del cliente; `PostIGForm` los lista desde la config.
- Test: un estilo que el cliente no declara se rechaza con un mensaje claro.

## Paso 12: Módulos

Config `modulos: { instagram, autorespuestas, chatIA, cotizador }`. Melera: los tres primeros
prendidos, cotizador apagado. Si un módulo está apagado: no aparece en el menú del admin, sus
páginas y rutas de API responden 404 y sus crons no hacen nada. `cotizador` queda solo declarado
(sin código). Tests del apagado con el cliente de ejemplo.

## Paso 13: Datos de Melera fuera del código

- `getMainProduct()` deja de crear "Miel Artesanal 500g" si no hay producto (ver decisiones).
- `prisma/seed.ts` toma los datos iniciales de `clientes/<slug>/seed.ts` (el de Melera queda con su
  producto de ejemplo).
- La migración con la regla de ManyChat: ver decisiones.

## Paso 14: Cierre

- Revisar que no quede "melera", "miel", "frasco", "panal" ni "abeja" fuera de `clientes/melera/`
  (con un test que lo verifique en `src/`).
- Levantar la app en local con `CLIENTE=melera` contra la base de desarrollo y comparar capturas de
  las páginas públicas y del admin con las de antes del paso 1 (las de antes se sacan al empezar).
- Actualizar el README (estructura de `clientes/`, cómo crear un cliente nuevo) y `CLAUDE.md`.

---

## Decisiones (2026-09-28)

- Cliente cargado con alias de build `@cliente` → `clientes/$CLIENTE` (paso 1).
- `CLIENTE` vacía → el build falla (paso 1).
- Assets: copia de `clientes/<slug>/public/` a `public/` antes del build (paso 6).
- El admin lleva los colores de cada cliente (paso 7).
- Preguntas frecuentes: tabla y pantalla del admin ya en la fase 1 (paso 3b).
- Región (moneda, locale, zona horaria) en la config, con los valores de Argentina (paso 1).
- Producto por defecto: se saca. Cada cliente tiene `clientes/<slug>/seed.ts` con sus datos
  iniciales (productos, preguntas frecuentes, reglas) que se cargan una vez con `npm run db:seed`;
  con la base vacía la tienda muestra "todavía no hay productos" (paso 13).
- Regla de bienvenida de la migración `20260925000100`: una migración nueva la borra solo si sigue
  desactivada y con el texto original; la regla pasa al seed de Melera (paso 13).
