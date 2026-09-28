"use client";

import { useState } from "react";
import { formatPrecio } from "@/lib/utils";
import { totalPedido, type Escalon } from "@/lib/precios";
import { cadaUno, cantidadConUnidad } from "@/plataforma/cliente";

type Props = {
  producto: { slug: string; nombre: string; precio: number; escalones: Escalon[] };
  cantidadInicial: number;
  origen?: string;
};

// Por ahora solo se envía dentro de CABA (el envío se coordina después de la compra).
const ZONA_DE_ENVIO = "CABA";

export default function CheckoutForm({ producto, cantidadInicial, origen }: Props) {
  const [cantidad, setCantidad] = useState(cantidadInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    payload.cantidad = String(cantidad);
    payload.producto = producto.slug;
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

  // Solo para mostrar: el total que se cobra lo calcula el servidor con los mismos escalones
  const { unitario, total, ahorro } = totalPedido(producto.precio, producto.escalones, cantidad);
  const proximo = producto.escalones.find((e) => e.desde > cantidad && e.precio < unitario);

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
            onClick={() => setCantidad(proximo.desde)}
            className="mt-2 text-left text-xs text-[var(--destacado)] underline underline-offset-2"
          >
            Llevando {cantidadConUnidad(proximo.desde)} pagás {formatPrecio(proximo.precio)} {cadaUno}
          </button>
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
