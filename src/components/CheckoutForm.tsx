"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { formatPrecio } from "@/lib/utils";
import { totalPedido, type Escalon } from "@/lib/precios";
import { lineasDelCarrito } from "@/lib/carrito";
import { useCarrito } from "@/components/useCarrito";
import type { ProductoCarrito } from "@/components/CarritoVista";
import { cadaUnoDe, cantidadConUnidad, type Unidad } from "@/plataforma/cliente";

type Props = {
  /** Compra de un producto (la ficha con "Comprar", o los links de siempre). */
  producto?: { slug: string; nombre: string; precio: number; escalones: Escalon[]; unidad: Unidad };
  cantidadInicial?: number;
  /** Compra del carrito: los productos a la venta, con los datos actuales (el carrito guarda slug y cantidad). */
  carrito?: ProductoCarrito[];
  origen?: string;
};

const sinSuscripcion = () => () => {};

// Por ahora solo se envía dentro de CABA (el envío se coordina después de la compra).
const ZONA_DE_ENVIO = "CABA";

export default function CheckoutForm({ producto, cantidadInicial = 1, carrito, origen }: Props) {
  const [cantidad, setCantidad] = useState(cantidadInicial);
  const itemsCarrito = useCarrito();
  // El carrito vive en el navegador: hasta leerlo no se muestra el formulario
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const lineas = carrito ? lineasDelCarrito(itemsCarrito, carrito) : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    if (lineas) {
      payload.items = lineas.lineas.map((l) => ({ producto: l.producto.slug, cantidad: l.cantidad })) as never;
    } else if (producto) {
      payload.cantidad = String(cantidad);
      payload.producto = producto.slug;
    }
    if (origen) payload.origen = origen;

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Ocurrió un error, intentá de nuevo.");
        setLoading(false);
        return;
      }

      window.location.href = data.redirectUrl;
    } catch {
      setError("No pudimos conectar con el servidor. Intentá de nuevo.");
      setLoading(false);
    }
  }

  if (lineas && !listo) return null;
  if (lineas && lineas.lineas.length === 0) {
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
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3 lg:gap-12">
      <div className="space-y-6 lg:col-span-2">
        <fieldset className="space-y-4">
          <legend className="mb-1 font-serif text-xl font-semibold text-[var(--texto)]">
            Tus datos
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="nombre">Nombre</label>
              <input className="campo" id="nombre" name="nombre" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="apellido">Apellido</label>
              <input className="campo" id="apellido" name="apellido" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="email">Email</label>
              <input className="campo" id="email" name="email" type="email" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="telefono">Teléfono</label>
              <input className="campo" id="telefono" name="telefono" type="tel" required />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 font-serif text-xl font-semibold text-[var(--texto)]">
            Dirección de entrega
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="etiqueta" htmlFor="calle">Calle</label>
              <input className="campo" id="calle" name="calle" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="numero_dir">Número</label>
              <input className="campo" id="numero_dir" name="numero_dir" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="etiqueta" htmlFor="pisoDepto">Piso / Depto (opcional)</label>
              <input className="campo" id="pisoDepto" name="pisoDepto" />
            </div>
            <div>
              <label className="etiqueta" htmlFor="localidad">Barrio</label>
              <input className="campo" id="localidad" name="localidad" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="codigoPostal">Código postal</label>
              <input className="campo" id="codigoPostal" name="codigoPostal" required />
            </div>
          </div>
          <div>
            <label className="etiqueta" htmlFor="provincia">Zona de envío</label>
            <input className="campo opacity-80" id="provincia" value={ZONA_DE_ENVIO} readOnly aria-describedby="zona-ayuda" />
            <input type="hidden" name="provincia" value={ZONA_DE_ENVIO} />
            <p id="zona-ayuda" className="mt-1 text-xs texto-suave">
              Por ahora enviamos solo dentro de CABA. Pronto sumamos más zonas.
            </p>
          </div>
        </fieldset>
      </div>

      <div className="h-fit tarjeta p-6">
        <h2 className="font-serif text-xl font-semibold text-[var(--texto)]">Resumen</h2>
        {lineas ? (
          <ResumenCarrito lineas={lineas.lineas} total={lineas.total} />
        ) : (
          producto && <ResumenProducto producto={producto} cantidad={cantidad} setCantidad={setCantidad} />
        )}
        <p className="mt-2 text-xs texto-suave">
          Envío dentro de CABA: después de la compra te escribimos para coordinarlo.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-400/40 bg-red-950/60 px-3 py-2 text-sm text-red-200">{error}</p>
        )}

        <button type="submit" className="btn mt-6 w-full" disabled={loading}>
          {loading ? "Redirigiendo a MercadoPago..." : "Ir a pagar"}
        </button>
      </div>
    </form>
  );
}

/** Resumen de la compra de un producto (con cantidad y el aviso de la próxima promo). */
function ResumenProducto({
  producto,
  cantidad,
  setCantidad,
}: {
  producto: NonNullable<Props["producto"]>;
  cantidad: number;
  setCantidad: (f: (c: number) => number) => void;
}) {
  // Solo para mostrar: el total que se cobra lo calcula el servidor con los mismos escalones
  const { unitario, total, ahorro } = totalPedido(producto.precio, producto.escalones, cantidad);
  const proximo = producto.escalones.find((e) => e.desde > cantidad && e.precio < unitario);
  return (
    <>
    <div className="mt-4 flex items-center justify-between text-sm texto-suave">
      <span>{producto.nombre}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--acento-rgb)/0.45)] text-sm disabled:opacity-40"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          disabled={cantidad <= 1}
          aria-label="Restar cantidad"
        >
          −
        </button>
        <span className="w-4 text-center">{cantidad}</span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--acento-rgb)/0.45)] text-sm"
          onClick={() => setCantidad((c) => c + 1)}
          aria-label="Sumar cantidad"
        >
          +
        </button>
      </div>
    </div>
    <p className="mt-2 text-right text-xs texto-suave">
      {cantidad} × {formatPrecio(unitario)}
    </p>
    <div className="mt-3 flex items-center justify-between border-t border-[rgb(var(--acento-rgb)/0.22)] pt-4 font-semibold text-[var(--texto)]">
      <span>Total</span>
      <span>{formatPrecio(total)}</span>
    </div>
    {ahorro > 0 && (
      <p className="mt-2 text-sm font-semibold text-[var(--destacado)]">Ahorrás {formatPrecio(ahorro)} con la promo</p>
    )}
    {proximo && (
      <button
        type="button"
        onClick={() => setCantidad(() => proximo.desde)}
        className="mt-2 text-left text-xs text-[var(--destacado)] underline underline-offset-2"
      >
        Llevando {cantidadConUnidad(proximo.desde, producto.unidad)} pagás {formatPrecio(proximo.precio)} {cadaUnoDe(producto.unidad)}
      </button>
    )}
    </>
  );
}

/** Resumen de la compra del carrito: una línea por producto y el total. */
function ResumenCarrito({ lineas, total }: { lineas: ReturnType<typeof lineasDelCarrito<ProductoCarrito>>["lineas"]; total: number }) {
  const ahorro = lineas.reduce((suma, l) => suma + l.ahorro, 0);
  return (
    <>
      <ul className="mt-4 space-y-3">
        {lineas.map((l) => (
          <li key={l.producto.slug} className="flex items-start justify-between gap-3 text-sm texto-suave">
            <span>
              {l.producto.nombre}
              <span className="block text-xs">
                {cantidadConUnidad(l.cantidad, l.producto.unidad)} × {formatPrecio(l.unitario)}
              </span>
            </span>
            <span>{formatPrecio(l.total)}</span>
          </li>
        ))}
      </ul>
      <Link href="/carrito" className="mt-2 inline-block text-xs text-[var(--destacado)] underline underline-offset-2">
        Editar carrito
      </Link>
      <div className="mt-3 flex items-center justify-between border-t border-[rgb(var(--acento-rgb)/0.22)] pt-4 font-semibold text-[var(--texto)]">
        <span>Total</span>
        <span>{formatPrecio(total)}</span>
      </div>
      {ahorro > 0 && (
        <p className="mt-2 text-sm font-semibold text-[var(--destacado)]">Ahorrás {formatPrecio(ahorro)} con las promos</p>
      )}
    </>
  );
}
