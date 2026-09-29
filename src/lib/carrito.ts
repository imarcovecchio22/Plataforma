/**
 * Carrito de la tienda, guardado en el navegador (localStorage, sin cuenta de usuario). Guarda
 * solo slug, cantidad y las opciones elegidas (si el producto tiene): precios, promos y stock
 * salen siempre de la base (la página del carrito y el checkout los calculan con los datos
 * actuales). El mismo producto con distintas opciones son dos líneas.
 * Si el navegador no deja guardar (modo privado, almacenamiento bloqueado), el carrito vive
 * mientras la pestaña esté abierta.
 */
import { cliente } from "@/plataforma/cliente";
import { precioUnitario, type Escalon } from "@/lib/precios";
import { claveEleccion, elegidasEnOrden, limpiarEleccion, validarEleccion, type Eleccion, type OpcionProducto } from "@/lib/opciones";

export type ItemCarrito = { producto: string; cantidad: number; opciones?: Eleccion };
/** Qué línea: el producto y lo elegido (un slug solo = la línea sin opciones). */
type CualLinea = string | Pick<ItemCarrito, "producto" | "opciones">;

/** La identidad de una línea: producto + opciones elegidas. */
export function claveItem(item: CualLinea): string {
  return typeof item === "string" ? claveItem({ producto: item }) : `${item.producto}|${claveEleccion(item.opciones)}`;
}

const CLAVE = `${cliente.slug}-carrito`;
const EVENTO = "carrito-cambio";
const MAXIMO_ITEMS = 20;
const MAXIMO_CANTIDAD = 1000;

let enMemoria = "[]";

/** Lee una lista de ítems sin confiar en su forma (puede venir tocada a mano). */
export function limpiarCarrito(valor: unknown): ItemCarrito[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  const items: ItemCarrito[] = [];
  for (const i of valor) {
    if (!i || typeof i !== "object") continue;
    const { producto, cantidad, opciones: crudas } = i as Record<string, unknown>;
    if (typeof producto !== "string" || !producto) continue;
    if (!Number.isInteger(cantidad) || (cantidad as number) < 1) continue;
    const opciones = limpiarEleccion(crudas);
    const item: ItemCarrito = { producto, cantidad: Math.min(cantidad as number, MAXIMO_CANTIDAD) };
    // Sin opciones, la línea queda como siempre (solo slug y cantidad)
    if (Object.keys(opciones).length) item.opciones = opciones;
    const clave = claveItem(item);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    items.push(item);
  }
  return items.slice(0, MAXIMO_ITEMS);
}

export function agregarAlCarrito(items: ItemCarrito[], producto: string, cantidad: number, opciones?: Eleccion): ItemCarrito[] {
  const cual = { producto, opciones };
  const existente = items.find((i) => claveItem(i) === claveItem(cual));
  if (existente) return cambiarCantidad(items, cual, existente.cantidad + cantidad);
  return limpiarCarrito([...items, { producto, cantidad, opciones }]);
}

/** Cambia la cantidad de una línea; con 0 o menos, la saca. */
export function cambiarCantidad(items: ItemCarrito[], cual: CualLinea, cantidad: number): ItemCarrito[] {
  const clave = claveItem(cual);
  if (cantidad < 1) return items.filter((i) => claveItem(i) !== clave);
  return limpiarCarrito(items.map((i) => (claveItem(i) === clave ? { ...i, cantidad } : i)));
}

export function unidadesEnCarrito(items: ItemCarrito[]) {
  return items.reduce((suma, i) => suma + i.cantidad, 0);
}

// ── Guardado en el navegador (para useSyncExternalStore) ──

function leerCrudo() {
  try {
    return window.localStorage.getItem(CLAVE) ?? "[]";
  } catch {
    return enMemoria;
  }
}

let ultimoCrudo: string | null = null;
let ultimosItems: ItemCarrito[] = [];

/** Los ítems guardados (la misma referencia mientras no cambien). */
export function leerCarrito(): ItemCarrito[] {
  const crudo = leerCrudo();
  if (crudo !== ultimoCrudo) {
    ultimoCrudo = crudo;
    try {
      ultimosItems = limpiarCarrito(JSON.parse(crudo));
    } catch {
      ultimosItems = [];
    }
  }
  return ultimosItems;
}

export function guardarCarrito(items: ItemCarrito[]) {
  const crudo = JSON.stringify(limpiarCarrito(items));
  enMemoria = crudo;
  try {
    window.localStorage.setItem(CLAVE, crudo);
  } catch {
    // sin almacenamiento: queda en memoria
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function vaciarCarrito() {
  guardarCarrito([]);
}

/** Avisa cuando cambia el carrito (en esta pestaña o en otra). */
export function escucharCarrito(avisar: () => void) {
  const alCambiarOtraPestana = (e: StorageEvent) => e.key === CLAVE && avisar();
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", alCambiarOtraPestana);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", alCambiarOtraPestana);
  };
}

const SIN_ITEMS: ItemCarrito[] = [];
/** En el servidor (y en el primer render) el carrito está vacío. */
export function carritoEnServidor() {
  return SIN_ITEMS;
}

// ── Líneas del carrito con los datos actuales de los productos ──

type ProductoParaCarrito = {
  slug: string;
  precio: number;
  escalones: Escalon[];
  stock: number;
  /** Las opciones a elegir, solo si el cliente usa opciones de producto (si no, se ignoran). */
  opciones?: OpcionProducto[];
};

/**
 * Cruza el carrito con los productos a la venta: cada línea con lo elegido y su precio, el total
 * y lo que ya no se puede comprar (producto inactivo, borrado, sin stock, o una opción que ya no
 * existe). El stock y la promo por cantidad cuentan todas las líneas del mismo producto (dos
 * colores de la misma pieza suman para la promo), en el orden del carrito.
 */
export function lineasDelCarrito<P extends ProductoParaCarrito>(items: ItemCarrito[], productos: P[]) {
  const porSlug = new Map(productos.map((p) => [p.slug, p]));
  const noDisponibles: ItemCarrito[] = [];
  const quedan = new Map(productos.map((p) => [p.slug, p.stock]));
  const aceptados: { item: ItemCarrito; producto: P; cantidad: number }[] = [];
  for (const item of items) {
    const producto = porSlug.get(item.producto);
    const opciones = producto?.opciones ?? [];
    const valida = !opciones.length || !("error" in validarEleccion(opciones, item.opciones ?? {}, ""));
    const stock = producto ? quedan.get(producto.slug)! : 0;
    if (!producto || stock <= 0 || !valida) {
      noDisponibles.push(item);
      continue;
    }
    const cantidad = Math.min(item.cantidad, stock);
    quedan.set(producto.slug, stock - cantidad);
    aceptados.push({ item, producto, cantidad });
  }
  // La promo, por la cantidad total de cada producto
  const totalPorProducto = new Map<string, number>();
  for (const a of aceptados) totalPorProducto.set(a.producto.slug, (totalPorProducto.get(a.producto.slug) ?? 0) + a.cantidad);
  const lineas = aceptados.map(({ item, producto, cantidad }) => {
    const unitario = precioUnitario(producto.precio, producto.escalones, totalPorProducto.get(producto.slug)!);
    return {
      clave: claveItem(item),
      item,
      producto,
      cantidad,
      elegidas: elegidasEnOrden(producto.opciones ?? [], item.opciones),
      unitario,
      total: unitario * cantidad,
      ahorro: (producto.precio - unitario) * cantidad,
    };
  });
  return { lineas, noDisponibles, total: lineas.reduce((suma, l) => suma + l.total, 0) };
}
