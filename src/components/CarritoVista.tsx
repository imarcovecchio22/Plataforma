"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useCarrito } from "@/components/useCarrito";
import { cambiarCantidad, guardarCarrito, lineasDelCarrito } from "@/lib/carrito";
import type { Escalon } from "@/lib/precios";
import { textoOpciones, type OpcionProducto } from "@/lib/opciones";
import { formatPrecio } from "@/lib/utils";
import { cantidadConUnidad, type Unidad } from "@/plataforma/cliente";

const sinSuscripcion = () => () => {};

export type ProductoCarrito = {
  slug: string;
  nombre: string;
  precio: number;
  escalones: Escalon[];
  stock: number;
  unidad: Unidad;
  /** Las opciones a elegir (solo si el cliente usa opciones de producto). */
  opciones?: OpcionProducto[];
  /** Si se hace a pedido, el aviso de demora. */
  demora?: string | null;
};

/** El carrito: una línea por producto y opciones elegidas (con su promo), cantidades, total y "Finalizar compra". */
export default function CarritoVista({ productos }: { productos: ProductoCarrito[] }) {
  const items = useCarrito();
  // El carrito vive en el navegador: hasta que se lee, no se muestra nada (sin parpadeo de "vacío")
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);

  const { lineas, noDisponibles, total } = lineasDelCarrito(items, productos);
  // El stock es del producto: entre todas sus líneas (ej. dos colores) no pueden pasarlo
  const enCarrito = new Map<string, number>();
  for (const l of lineas) enCarrito.set(l.producto.slug, (enCarrito.get(l.producto.slug) ?? 0) + l.cantidad);

  // Lo que ya no está a la venta (o se quedó sin stock) sale del carrito
  useEffect(() => {
    if (!listo || noDisponibles.length === 0) return;
    guardarCarrito(items.filter((i) => !noDisponibles.includes(i)));
  }, [listo, items, noDisponibles]);

  if (!listo) return null;

  if (lineas.length === 0) {
    return (
      <div className="tarjeta p-8 text-center">
        <p className="text-[var(--texto)]">Tu carrito está vacío.</p>
        <Link href="/productos" className="btn mt-6">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
      <ul className="space-y-4 lg:col-span-2">
        {lineas.map(({ clave, item, producto, cantidad, elegidas, unitario, total: subtotal, ahorro }) => (
          <li key={clave} className="tarjeta flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <Link href={`/producto/${producto.slug}`} className="font-serif text-lg font-semibold text-[var(--texto)] underline-offset-4 hover:underline">
                {producto.nombre}
              </Link>
              {elegidas.length > 0 && <p className="mt-1 text-sm text-[var(--texto)]">{textoOpciones(elegidas)}</p>}
              {producto.demora && <p className="mt-1 text-xs texto-suave">{producto.demora}</p>}
              <p className="mt-1 text-sm texto-suave">
                {cantidadConUnidad(cantidad, producto.unidad)} × {formatPrecio(unitario)}
                {ahorro > 0 && <span className="text-[var(--destacado)]"> · ahorrás {formatPrecio(ahorro)}</span>}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--acento-rgb)/0.45)] text-[var(--texto)]"
                  onClick={() => guardarCarrito(cambiarCantidad(items, item, cantidad - 1))}
                  aria-label={`Restar ${producto.nombre}`}
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold text-[var(--texto)]">{cantidad}</span>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--acento-rgb)/0.45)] text-[var(--texto)] disabled:opacity-40"
                  onClick={() => guardarCarrito(cambiarCantidad(items, item, cantidad + 1))}
                  disabled={(enCarrito.get(producto.slug) ?? 0) >= producto.stock}
                  aria-label={`Sumar ${producto.nombre}`}
                >
                  +
                </button>
              </div>
              <span className="w-24 text-right font-semibold text-[var(--texto)]">{formatPrecio(subtotal)}</span>
              <button
                type="button"
                className="text-sm texto-suave underline underline-offset-2"
                onClick={() => guardarCarrito(cambiarCantidad(items, item, 0))}
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="tarjeta h-fit p-6">
        <div className="flex items-center justify-between font-semibold text-[var(--texto)]">
          <span>Total</span>
          <span>{formatPrecio(total)}</span>
        </div>
        <Link href="/checkout?carrito=1" className="btn mt-6 w-full" data-fondo-evita>
          Finalizar compra
        </Link>
        <Link href="/productos" className="btn-ghost mt-2 w-full justify-center">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
