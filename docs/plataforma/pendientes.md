# Pendientes

Lo que queda abierto al cerrar la fase 3 (2026-09-29). Se tacha o se borra cuando se resuelve.

## Del usuario (decisiones o cosas que no se pueden hacer desde acá)

- [ ] **Charla con el dueño de Rino**: reemplazar todo lo marcado `PROVISORIO` en `clientes/rino/`
      (colores, logo, textos, tono, productos, zonas) y elegir qué funciones usa. Detalle en
      [`rino-para-lanzar.md`](rino-para-lanzar.md).
- [ ] **Dónde está el cotizador de Rino** (URL, con qué está hecho, qué datos pide): para
      `enlaceCotizador` ya, y para integrarlo como módulo después (ver plan de la fase 3, paso 9).
- [ ] **Cuentas de Rino para lanzar**: base de producción nueva, Mercado Pago, y Telegram, Gemini
      e Instagram si los usa. Variables y pasos en [`rino-para-lanzar.md`](rino-para-lanzar.md).
- [x] **Campo "Barrio" del checkout**: pasó a "Localidad" (2026-09-29; en Melera cambia solo la
      etiqueta y el mensaje de error, el dato se guarda igual).
- [x] **Merge y push**: `fase-3` e `identidad-editable` mergeadas a `main` y subidas a GitHub
      (2026-09-29).
- [ ] **Credenciales de prueba de Mercado Pago** (opcional): para probar un pago completo de punta
      a punta.
- [ ] **Rotar la clave de la base de desarrollo de Rino** en Neon si se comparte esta conversación
      (quedó escrita en el chat).

## Etapa de refinamiento (a planificar)

- [x] **Identidad editable por el dueño desde el admin**: hecha el 2026-09-29 (textos, color de
      la marca, fondo, logo e imagen para compartir por link). Ver
      [`plan-identidad-editable.md`](plan-identidad-editable.md). Quedan en la config: nombre,
      Instagram, SEO y fuentes (las fuentes, junto con la subida de archivos).
- [ ] **Subir fotos de producto desde el admin** (hoy son links https; depende del hosting).
- [ ] **Integrar el cotizador como módulo** (cuando se sepa qué es hoy).
- [ ] **Hosting**: una app por cliente en un VPS con Coolify (sin atarse a Vercel).
- [ ] **Multi-tenant**: cuando se sepa qué se repite entre clientes.
