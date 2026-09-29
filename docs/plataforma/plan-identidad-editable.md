# Identidad editable por el dueño (etapa de refinamiento)

**Objetivo:** que el dueño de cada tienda cambie desde el admin parte de su identidad, sin pasar
por nosotros: los textos de la tienda, el color de la marca y el fondo, y el logo y la imagen para
compartir.

**Principio:** la config (`clientes/<slug>/config.ts`, validada al compilar) sigue siendo la
identidad **por defecto**; la base guarda **solo lo que el dueño cambió**. Lo que se muestra es la
config con esos cambios encima. Cada cambio se valida al guardarlo, y si algo guardado no valida
(por ejemplo, después de un cambio de esquema), se usa lo de la config: el sitio nunca se rompe.
Sin cambios guardados, cada cliente se ve exactamente como hoy (los snapshots de Melera no cambian).

## Decisiones (2026-09-29)

1. **Qué se edita en esta versión:**
   - **Textos de la tienda:** título, bajada y botón del inicio; título y párrafos de "Quiénes
     somos"; pie; texto de consultas; lo que va junto al precio.
   - **Colores y fondo:** el color principal de la marca y fondo claro u oscuro.
   - **Logo e imagen para compartir:** como link https (igual que las fotos de producto) hasta que
     se puedan subir archivos.
2. **Colores:** el dueño elige **un color** y la plataforma arma la escala de 10 tonos (50–900).
3. **Fuentes:** quedan en la config (cambiarlas en el momento necesita guardar archivos o abrir la
   política de seguridad a Google; va junto con la subida de archivos).
4. **Quedan en la config:** nombre, dominio, Instagram, SEO, región, módulos, funciones del
   catálogo, textos para Gemini, estilos y plantillas de Instagram, fuentes y tema propio.

## Alcances y límites

- Con **tema propio** (como el panal de Melera), su CSS tiene sus colores fijos: el color de la
  marca cambia el admin y algunos acentos, no el sitio entero, y el fondo no se puede elegir. La
  pantalla del admin lo aclara (y no ofrece el fondo).
- Las **imágenes de Instagram** tienen sus colores en el HTML de cada plantilla: no cambian con el
  color de la marca.
- El logo de un tema propio puede venir de su componente (el de Melera es la celda del panal): en
  ese caso el logo de la tienda no cambia; el del admin sí.

## Pasos

### Paso 1: modelo y lectura ✅ (2026-09-29)
Hecho: tabla `IdentidadCliente` (migración `*_identidad_editable`, aplicada en las bases de
desarrollo de Melera y de Rino). `src/plataforma/cliente/identidad.ts`: `esquemaIdentidad`,
`limpiarValores` (descarta lo que no valida campo por campo, así el resto de los cambios se queda)
e `identidadEfectiva` (sin cambios da exactamente la config). `src/lib/identidad.ts`:
`getIdentidad()` (con `cache` de React; si la base falla, la config).
`src/plataforma/cliente/escala.ts`: `escalaDeColor(hex)` (el elegido es el 500; los claros se
mezclan con blanco y los oscuros con negro, oscureciendo el 600–900 hasta que el texto blanco se
lea: 700 con 4,5:1, 600 con 3:1; probado con amarillo, lima, blanco y negro).

Plan original:
Tabla `IdentidadCliente` (una fila: `valores` Json y `updatedAt`), con migración.
`src/plataforma/cliente/identidad.ts`: el esquema de lo editable (zod, todo opcional), la mezcla
config + cambios (descarta lo que no valida) y `getIdentidad()` para el servidor (una consulta por
pedido, con `cache` de React). `escalaDeColor(hex)`: los 10 tonos desde un color (pruebas de que
el contraste de los botones sigue siendo legible).

### Paso 2: la tienda y el admin leen la identidad efectiva ✅ (2026-09-29)
Hecho: como los componentes no pueden ser async (y las pruebas los renderizan con
`renderToStaticMarkup`), la leen **los layouts y las páginas** (una vez por pedido) y se la pasan
por props; cada componente la recibe como prop opcional y, sin ella, usa la config (como antes):
- Layout raíz: la escala del color de la marca y el fondo (`data-fondo`), y la imagen para
  compartir en `generateMetadata`. Con `dynamic = "force-dynamic"`: `/privacidad`,
  `/admin/login` y la página 404 eran estáticas y se habrían quedado con la identidad del build.
- Layouts público y del checkout → Header y pie (logo y texto del pie); la home → los dos heros y
  "Quiénes somos"; las fichas → la aclaración junto al precio; `/consultas` → su descripción.
- Admin: el layout le pasa el logo al menú; `/admin/login` pasó a ser una página del servidor que
  le pasa el logo al formulario (`LoginFormulario`, del navegador).
- El logo del tema (`TemaPublico.Logo`) recibe `src`; el neutro lo usa (un link externo va sin el
  optimizador de imágenes) y el del panal de Melera lo ignora.
- `getIdentidad` tolera también un error sincrónico (sin la tabla): usa la config.
Melera: snapshots sin cambios y la comparación por píxel igual que antes. Pruebas con cambios
guardados (`tests/identidad-paginas.test.ts`): colores, fondo, textos, logo e imagen para
compartir.

Plan original:
El layout raíz (colores, fondo y la imagen para compartir en `generateMetadata`), el Header, el
pie, los dos heros, "Quiénes somos", consultas, el precio, el logo del tema neutro y el del admin.
Los componentes del navegador la reciben por props. Lo que no es editable sigue leyendo `cliente`
como hoy.

### Paso 3: pantalla `/admin/marca` ✅ (2026-09-29)
Hecho: "Marca" en el menú del admin. Tres secciones: textos (con los valores vigentes; los
párrafos de "Quiénes somos" separados por una línea en blanco), color y fondo (selector de color,
los 10 tonos que se arman, un botón de muestra con su contraste; el fondo solo con el tema neutro)
e imágenes (links https con vista previa). Cada sección tiene "volver a los de la config". Al
guardar se manda **solo lo que difiere de la config** (un campo vacío vuelve a la config) y la API
(`PUT /api/admin/marca`) lo valida con el mismo esquema (400 con el campo que falla) y lo registra
en los logs. `TemaPublico.neutro` distingue el tema neutro de uno propio: con el de Melera la
pantalla avisa que el color cambia poco y no ofrece el fondo. Vista en Chrome con Rino y Melera.

Plan original:
Tres secciones (textos, colores y fondo, imágenes), con la vista previa de la escala de colores y
"volver a lo de la config" en cada una. API con validación y registro en los logs.

### Paso 4: pruebas y cierre ✅ (2026-09-29)
- **Rino de punta a punta** (build con `CLIENTE=rino`, Chrome contra su base): desde `/admin/marca`
  se cambiaron el título del inicio, el pie, el color (azul), el fondo (oscuro) y el logo (link);
  la base guardó solo eso y la tienda lo mostró al instante (botones y acentos azules, fondo
  oscuro, logo y textos nuevos; lo demás, de la config). Un logo `http://` se rechazó con el
  campo que falla, sin pisar nada. "Volver a los de la config" en todo dejó la base en `{}` y la
  tienda como antes.
- **Melera**: build sin cambios en su base y comparación por píxel: todas las páginas públicas
  idénticas; en el admin, solo el menú (el link "Marca"), la fecha de hoy en Instagram y los logs.

Plan original:
Melera sin cambios (snapshots y comparación por píxel), Rino con cambios desde el admin en Chrome
(y vuelta atrás), docs.
