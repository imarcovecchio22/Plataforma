/**
 * Preguntas frecuentes de /consultas (tabla PreguntaFrecuente, se editan en /admin/preguntas).
 * Sin dependencias de servidor: lo usan la página y el formulario del admin (vista previa).
 *
 * En la respuesta:
 * - $PRODUCTO, $PRECIO y $PROMOS se reemplazan por los datos actuales del producto.
 * - [[ ... ]] se muestra solo si hay promos por cantidad.
 * - [texto](destino) es un link; el destino puede ser #ancla, /ruta o https://...
 */

export type DatosProducto = { nombre: string; precio: string; promos: string };

export type ParteRespuesta = { texto: string } | { texto: string; href: string };

/** Reemplaza las variables y resuelve los [[ ]] (sin tocar los links). */
export function armarRespuesta(respuesta: string, datos: DatosProducto) {
  return respuesta
    .replace(/\[\[([\s\S]*?)\]\]/g, (_, bloque: string) => (datos.promos ? bloque : ""))
    .replace(/\$PRODUCTO/g, datos.nombre)
    .replace(/\$PRECIO/g, datos.precio)
    .replace(/\$PROMOS/g, datos.promos);
}

// #ancla, /ruta del sitio (no //otro-sitio.com, que el navegador abre como externo) o https://
const DESTINO_PERMITIDO = /^(#[\w-]+|\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/;

/** Separa el texto en partes y links. Un link con destino no permitido queda como texto. */
export function partesRespuesta(texto: string): ParteRespuesta[] {
  const partes: ParteRespuesta[] = [];
  const patron = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let desde = 0;
  for (const m of texto.matchAll(patron)) {
    if (!DESTINO_PERMITIDO.test(m[2])) continue;
    if (m.index > desde) partes.push({ texto: texto.slice(desde, m.index) });
    partes.push({ texto: m[1], href: m[2] });
    desde = m.index + m[0].length;
  }
  if (desde < texto.length) partes.push({ texto: texto.slice(desde) });
  return partes;
}
