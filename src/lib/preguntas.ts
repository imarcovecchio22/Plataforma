/**
 * Preguntas frecuentes de /consultas (tabla PreguntaFrecuente, se editan en /admin/preguntas).
 * Sin dependencias de servidor: lo usan la página y el formulario del admin (vista previa).
 *
 * En la respuesta:
 * - Las variables ($PRODUCTO, $PRECIO, $PROMOS, $CATALOGO, $ZONAS) se reemplazan por los datos
 *   actuales (src/lib/variables.ts).
 * - [[ ... ]] se muestra solo si hay promos por cantidad.
 * - [texto](destino) es un link; el destino puede ser #ancla, /ruta o https://...
 */
import { reemplazarVariables, type DatosTextos } from "@/lib/variables";

export type ParteRespuesta = { texto: string } | { texto: string; href: string };

/** Reemplaza las variables y resuelve los [[ ]] (sin tocar los links). */
export function armarRespuesta(respuesta: string, datos: DatosTextos) {
  return reemplazarVariables(
    respuesta.replace(/\[\[([\s\S]*?)\]\]/g, (_, bloque: string) => (datos.promos ? bloque : "")),
    datos
  );
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
