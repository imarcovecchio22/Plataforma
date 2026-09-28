import { formatPrecio } from "@/lib/utils";
import { cantidadConUnidad, cliente } from "@/plataforma/cliente";

/**
 * Precio por escalón (promos por cantidad): desde cierta cantidad de unidades (frascos, piezas…),
 * cada una sale más barata. La palabra de la unidad sale de la config del cliente. Ej.: [{ desde: 5, precio: 6000 }, { desde: 10, precio: 5500 }].
 * Sin dependencias de servidor: lo usan el checkout (el total SIEMPRE se calcula en el
 * servidor) y las páginas para mostrar el ahorro.
 */
export type Escalon = { desde: number; precio: number };

/** Lee los escalones guardados en la base sin confiar en su forma; los ordena por cantidad. */
export function leerEscalones(valor: unknown): Escalon[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter(
      (e): e is Escalon =>
        typeof e === "object" &&
        e !== null &&
        Number.isInteger(e.desde) &&
        e.desde >= 2 &&
        Number.isInteger(e.precio) &&
        e.precio > 0
    )
    .map((e) => ({ desde: e.desde, precio: e.precio }))
    .sort((a, b) => a.desde - b.desde);
}

/** Precio de cada unidad para esa cantidad: el del escalón más alto alcanzado (nunca más caro que el base). */
export function precioUnitario(precioBase: number, escalones: Escalon[], cantidad: number) {
  let precio = precioBase;
  for (const e of escalones) if (cantidad >= e.desde && e.precio < precio) precio = e.precio;
  return precio;
}

export function totalPedido(precioBase: number, escalones: Escalon[], cantidad: number) {
  const unitario = precioUnitario(precioBase, escalones, cantidad);
  return { unitario, total: unitario * cantidad, ahorro: (precioBase - unitario) * cantidad };
}

/** "5 frascos a $30.000 · 10 frascos a $55.000" (para textos, el chat y las respuestas automáticas). */
export function textoPromos(escalones: Escalon[]) {
  return escalones.map((e) => `${cantidadConUnidad(e.desde)} a ${formatPrecio(e.desde * e.precio)}`).join(" · ");
}

/**
 * Revisa que los escalones tengan sentido: cantidades distintas (desde 2 unidades) y cada
 * escalón más barato que el precio base y que el escalón anterior. Devuelve el error o null.
 */
export function errorEscalones(precioBase: number, escalones: Escalon[]) {
  let anterior = { desde: 1, precio: precioBase };
  for (const e of [...escalones].sort((a, b) => a.desde - b.desde)) {
    if (!Number.isInteger(e.desde) || e.desde < 2) return `Cada promo tiene que ser desde 2 ${cliente.unidad.plural} o más`;
    if (e.desde === anterior.desde) return `Hay dos promos desde ${cantidadConUnidad(e.desde)}`;
    if (!Number.isInteger(e.precio) || e.precio <= 0) return "El precio de cada promo tiene que ser mayor a 0";
    if (e.precio >= anterior.precio)
      return `La promo desde ${cantidadConUnidad(e.desde)} tiene que ser más barata que ${formatPrecio(anterior.precio)} por ${cliente.unidad.singular}`;
    anterior = e;
  }
  return null;
}

/**
 * Promos para la plantilla de Instagram tipo "promo", con los precios de la base al momento
 * de generar: "1 frasco|$ 6.500|;5 frascos|$ 30.000|$ 6.000 c/u · ahorrás $ 2.500;..."
 */
export function promosParaPlantilla(precioBase: number, escalones: Escalon[]) {
  const filas = [`${cantidadConUnidad(1)}|${formatPrecio(precioBase)}|`];
  for (const e of escalones) {
    const t = totalPedido(precioBase, escalones, e.desde);
    filas.push(`${cantidadConUnidad(e.desde)}|${formatPrecio(t.total)}|${formatPrecio(t.unitario)} c/u · ahorrás ${formatPrecio(t.ahorro)}`);
  }
  return filas.join(";");
}

/** Lo que muestran $PRECIO y los textos cuando todavía no hay producto cargado. */
export const PRECIO_SIN_PRODUCTO = "a confirmar";

/**
 * Nombre, precio y promos del producto ya formateados para textos ($PRODUCTO, $PRECIO, $PROMOS
 * de las preguntas frecuentes, el chat y las respuestas automáticas). Sin producto: precio "a
 * confirmar" y sin promos.
 */
export function textosDelProducto(producto: { nombre: string; precio: number; escalones: unknown } | null) {
  if (!producto) return { nombre: "", precio: PRECIO_SIN_PRODUCTO, promos: "" };
  return {
    nombre: producto.nombre,
    precio: formatPrecio(producto.precio),
    promos: textoPromos(leerEscalones(producto.escalones)),
  };
}
