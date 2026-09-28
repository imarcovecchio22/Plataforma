/**
 * Variables de los textos que escribe el cliente (preguntas frecuentes y respuestas automáticas).
 * Sin dependencias de servidor: lo usan también las vistas previas del admin.
 *
 * - $PRODUCTO, $PRECIO y $PROMOS: el producto destacado (el primero activo).
 * - $CATALOGO: todos los productos a la venta con su precio.
 * - $ZONAS: las zonas de envío activas con su costo.
 */
import { formatPrecio } from "@/lib/utils";
import { cliente } from "@/plataforma/cliente";

export type DatosTextos = {
  nombre: string;
  precio: string;
  promos: string;
  catalogo: string;
  zonas: string;
};

export const VARIABLES = ["$PRODUCTO", "$PRECIO", "$PROMOS", "$CATALOGO", "$ZONAS"] as const;

/** Lo que muestran $CATALOGO y $ZONAS cuando todavía no hay nada cargado (como $PRECIO sin producto). */
export const SIN_CARGAR = "a confirmar";

const VALOR: Record<(typeof VARIABLES)[number], keyof DatosTextos> = {
  $PRODUCTO: "nombre",
  $PRECIO: "precio",
  $PROMOS: "promos",
  $CATALOGO: "catalogo",
  $ZONAS: "zonas",
};

/** Reemplaza las variables en una sola pasada (un valor con "$" no se vuelve a reemplazar). */
export function reemplazarVariables(texto: string, datos: DatosTextos) {
  return texto.replace(/\$(PRODUCTO|PRECIO|PROMOS|CATALOGO|ZONAS)/g, (v) => datos[VALOR[v as keyof typeof VALOR]]);
}

/** Si el texto usa alguna variable (para no ir a la base cuando no hace falta). */
export function usaVariables(texto: string) {
  return VARIABLES.some((v) => texto.includes(v));
}

/** "a, b y c" en el idioma del cliente. */
export function lista(elementos: string[]) {
  return new Intl.ListFormat(cliente.region.locale, { type: "conjunction" }).format(elementos);
}

/** $CATALOGO: "Miel ($ 6.500) y Propóleo ($ 3.000)". */
export function textoCatalogo(productos: { nombre: string; precio: number }[]) {
  if (productos.length === 0) return SIN_CARGAR;
  return lista(productos.map((p) => `${p.nombre} (${formatPrecio(p.precio)})`));
}

/** $ZONAS: "CABA (a coordinar después de la compra) y Zona sur ($ 2.500)". */
export function textoZonas(zonas: { nombre: string; costo: number | null }[]) {
  if (zonas.length === 0) return SIN_CARGAR;
  return lista(zonas.map((z) => `${z.nombre} (${z.costo === null ? "a coordinar después de la compra" : formatPrecio(z.costo)})`));
}
