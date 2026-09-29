import { notFound } from "next/navigation";
import { cliente } from "@/plataforma/cliente";
import { leerOpciones } from "@/lib/opciones";

/**
 * Funciones del catálogo que cada cliente prende en config.catalogo (apagadas por defecto). Con
 * una apagada, su pantalla del admin y sus rutas de API responden 404, no aparece en el menú ni en
 * los formularios, y la tienda no muestra nada de ella.
 */
export const FUNCIONES_CATALOGO = ["categorias", "opciones", "aPedido"] as const;
export type FuncionCatalogo = (typeof FUNCIONES_CATALOGO)[number];

export function funcionActiva(funcion: FuncionCatalogo) {
  return Boolean(cliente.catalogo?.[funcion]);
}

/** Las opciones a elegir de un producto (ninguna si el cliente no usa opciones de producto). */
export function opcionesDe(producto: { opciones?: unknown }) {
  return funcionActiva("opciones") ? leerOpciones(producto.opciones) : [];
}

/** Lo máximo que se puede pedir de un producto a pedido (no tiene stock). */
export const LIMITE_A_PEDIDO = 1000;
/** El texto de la demora cuando el producto no trae uno propio. */
export const DEMORA_POR_DEFECTO = "Se hace a pedido";

type ProductoConStock = { stock: number; aPedido?: boolean | null; demora?: string | null };

/** Si el producto se hace a pedido (y el cliente usa esa función). */
export function esAPedido(producto: Pick<ProductoConStock, "aPedido">) {
  return funcionActiva("aPedido") && Boolean(producto.aPedido);
}

/** Lo que se puede vender: el stock, o sin límite (LIMITE_A_PEDIDO) si se hace a pedido. */
export function stockParaVender(producto: ProductoConStock) {
  return esAPedido(producto) ? LIMITE_A_PEDIDO : producto.stock;
}

/** El aviso de demora de un producto a pedido (null si no lo es). */
export function demoraDe(producto: ProductoConStock) {
  return esAPedido(producto) ? producto.demora?.trim() || DEMORA_POR_DEFECTO : null;
}

/** Para las páginas del admin de una función: 404 si el cliente no la tiene prendida. */
export function exigirFuncion(funcion: FuncionCatalogo) {
  if (!funcionActiva(funcion)) notFound();
}
