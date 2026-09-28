/** Formato de un slug: minúsculas, números y guiones (ej. "miel-artesanal-500g"). */
export const FORMATO_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Slug a partir de un nombre: sin tildes, en minúsculas, con guiones; "producto" si no queda nada.
 * Igual que el que arma la migración 20260928200000_producto_slug_activo_orden. Sin dependencias
 * de servidor: lo usa el formulario del admin para sugerirlo.
 */
export function slugDe(nombre: string) {
  const s = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "producto";
}
