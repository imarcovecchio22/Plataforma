/**
 * Carrito de la tienda, guardado en el navegador (localStorage, sin cuenta de usuario). Guarda
 * solo slug y cantidad: precios, promos y stock salen siempre de la base (la página del carrito
 * y el checkout los calculan con los datos actuales).
 * Si el navegador no deja guardar (modo privado, almacenamiento bloqueado), el carrito vive
 * mientras la pestaña esté abierta.
 */
import { cliente } from "@/plataforma/cliente";
import { totalPedido, type Escalon } from "@/lib/precios";

export type ItemCarrito = { producto: string; cantidad: number };

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
    const { producto, cantidad } = i as Record<string, unknown>;
    if (typeof producto !== "string" || !producto || vistos.has(producto)) continue;
    if (!Number.isInteger(cantidad) || (cantidad as number) < 1) continue;
    vistos.add(producto);
    items.push({ producto, cantidad: Math.min(cantidad as number, MAXIMO_CANTIDAD) });
  }
  return items.slice(0, MAXIMO_ITEMS);
}

export function agregarAlCarrito(items: ItemCarrito[], producto: string, cantidad: number): ItemCarrito[] {
  const existente = items.find((i) => i.producto === producto);
  if (existente) return cambiarCantidad(items, producto, existente.cantidad + cantidad);
  return limpiarCarrito([...items, { producto, cantidad }]);
}

/** Cambia la cantidad de un producto; con 0 o menos, lo saca. */
export function cambiarCantidad(items: ItemCarrito[], producto: string, cantidad: number): ItemCarrito[] {
  if (cantidad < 1) return items.filter((i) => i.producto !== producto);
  return limpiarCarrito(items.map((i) => (i.producto === producto ? { ...i, cantidad } : i)));
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

type ProductoParaCarrito = { slug: string; precio: number; escalones: Escalon[]; stock: number };

/**
 * Cruza el carrito con los productos a la venta: cada línea con su precio por la promo que
 * corresponda (la cantidad no pasa el stock), el total y lo que ya no se puede comprar (producto
 * inactivo, borrado o sin stock).
 */
export function lineasDelCarrito<P extends ProductoParaCarrito>(items: ItemCarrito[], productos: P[]) {
  const porSlug = new Map(productos.map((p) => [p.slug, p]));
  const lineas = items.flatMap((i) => {
    const producto = porSlug.get(i.producto);
    if (!producto || producto.stock <= 0) return [];
    const cantidad = Math.min(i.cantidad, producto.stock);
    return [{ producto, cantidad, ...totalPedido(producto.precio, producto.escalones, cantidad) }];
  });
  const noDisponibles = items.filter((i) => !porSlug.get(i.producto) || porSlug.get(i.producto)!.stock <= 0);
  return { lineas, noDisponibles, total: lineas.reduce((suma, l) => suma + l.total, 0) };
}
