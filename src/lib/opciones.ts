/**
 * Opciones de producto que elige el comprador (config.catalogo.opciones), ej. "Color: Rojo".
 * Son simples: no cambian el precio ni tienen stock propio. Lo elegido viaja en el carrito y en el
 * pedido, y queda en el ítem (su nombre lo incluye: "Maceta (Color: Rojo)").
 * Sin dependencias de servidor: lo usan la ficha, el carrito, el checkout y la API.
 */

export type OpcionProducto = { nombre: string; valores: string[] };
/** Lo elegido, por nombre de opción: { Color: "Rojo" }. */
export type Eleccion = Record<string, string>;
/** Lo elegido en el orden de las opciones del producto (así se guarda en el pedido). */
export type OpcionElegida = { nombre: string; valor: string };

export const MAXIMO_OPCIONES = 3;
export const MAXIMO_VALORES = 20;

/** Las opciones guardadas en el producto (Json), sin confiar en su forma. */
export function leerOpciones(valor: unknown): OpcionProducto[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((o): o is OpcionProducto => Boolean(o) && typeof o.nombre === "string" && Array.isArray(o.valores))
    .map((o) => ({ nombre: o.nombre, valores: o.valores.filter((v: unknown): v is string => typeof v === "string") }))
    .filter((o) => o.nombre && o.valores.length > 0);
}

/** Una elección que viene de afuera (carrito, URL, pedido), sin confiar en su forma. */
export function limpiarEleccion(valor: unknown): Eleccion {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const eleccion: Eleccion = {};
  for (const [nombre, v] of Object.entries(valor).slice(0, MAXIMO_OPCIONES)) {
    if (typeof v === "string" && v && nombre.length <= 60 && v.length <= 60) eleccion[nombre] = v;
  }
  return eleccion;
}

/** La misma elección da la misma clave, sin importar el orden (para el carrito). */
export function claveEleccion(eleccion: Eleccion = {}) {
  return JSON.stringify(Object.keys(eleccion).sort().map((k) => [k, eleccion[k]]));
}

/**
 * Controla lo elegido contra las opciones del producto: todas elegidas, con un valor que existe,
 * y nada de más. Devuelve la lista en el orden de las opciones, o el error para el comprador.
 */
export function validarEleccion(opciones: OpcionProducto[], eleccion: Eleccion, producto: string) {
  const sobrantes = Object.keys(eleccion).filter((n) => !opciones.some((o) => o.nombre === n));
  if (sobrantes.length) return { error: `Esa opción ya no está disponible para ${producto}` } as const;
  const elegidas: OpcionElegida[] = [];
  for (const o of opciones) {
    const valor = eleccion[o.nombre];
    if (!valor) return { error: `Elegí ${o.nombre.toLowerCase()} para ${producto}` } as const;
    if (!o.valores.includes(valor)) return { error: `Esa opción de ${o.nombre.toLowerCase()} ya no está disponible para ${producto}` } as const;
    elegidas.push({ nombre: o.nombre, valor });
  }
  return { elegidas } as const;
}

/** "Color: Rojo · Tamaño: Grande" */
export function textoOpciones(elegidas: OpcionElegida[]) {
  return elegidas.map((o) => `${o.nombre}: ${o.valor}`).join(" · ");
}

/** "Maceta (Color: Rojo)" (sin opciones, el nombre solo). */
export function nombreConOpciones(nombre: string, elegidas: OpcionElegida[]) {
  return elegidas.length ? `${nombre} (${elegidas.map((o) => `${o.nombre}: ${o.valor}`).join(", ")})` : nombre;
}

/** Lo elegido, en el orden de las opciones del producto (para mostrar en el carrito). */
export function elegidasEnOrden(opciones: OpcionProducto[], eleccion: Eleccion = {}): OpcionElegida[] {
  return opciones.filter((o) => eleccion[o.nombre]).map((o) => ({ nombre: o.nombre, valor: eleccion[o.nombre] }));
}
