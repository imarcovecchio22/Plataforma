import { notFound } from "next/navigation";
import { cliente } from "@/plataforma/cliente";
import { leerOpciones } from "@/lib/opciones";

/**
 * Funciones del catálogo que cada cliente prende en config.catalogo (apagadas por defecto). Con
 * una apagada, su pantalla del admin y sus rutas de API responden 404, no aparece en el menú ni en
 * los formularios, y la tienda no muestra nada de ella.
 */
export const FUNCIONES_CATALOGO = ["categorias", "opciones"] as const;
export type FuncionCatalogo = (typeof FUNCIONES_CATALOGO)[number];

export function funcionActiva(funcion: FuncionCatalogo) {
  return Boolean(cliente.catalogo?.[funcion]);
}

/** Las opciones a elegir de un producto (ninguna si el cliente no usa opciones de producto). */
export function opcionesDe(producto: { opciones?: unknown }) {
  return funcionActiva("opciones") ? leerOpciones(producto.opciones) : [];
}

/** Para las páginas del admin de una función: 404 si el cliente no la tiene prendida. */
export function exigirFuncion(funcion: FuncionCatalogo) {
  if (!funcionActiva(funcion)) notFound();
}
