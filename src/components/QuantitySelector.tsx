"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { agregarAlCarrito, guardarCarrito, leerCarrito } from "@/lib/carrito";
import { formatPrecio } from "@/lib/utils";
import { totalPedido, type Escalon } from "@/lib/precios";
import type { Eleccion, OpcionProducto } from "@/lib/opciones";
import { cantidadConUnidad, cliente, type Unidad } from "@/plataforma/cliente";

export default function QuantitySelector({
  slug,
  stock,
  origen,
  precio,
  escalones = [],
  unidad = cliente.unidad,
  conCarrito = false,
  opciones = [],
}: {
  /** El producto que se compra (el checkout lo busca por slug). */
  slug: string;
  stock: number;
  origen?: string;
  precio: number;
  escalones?: Escalon[];
  /** La unidad del producto (sin ella, la del cliente). */
  unidad?: Unidad;
  /** Con varios productos en la tienda: "Agregar al carrito" en vez de ir directo al checkout. */
  conCarrito?: boolean;
  /** Lo que el comprador elige antes de comprar (ej. el color), si el producto tiene opciones. */
  opciones?: OpcionProducto[];
}) {
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const [eleccion, setEleccion] = useState<Eleccion>({});
  const [falta, setFalta] = useState<string | null>(null);
  const router = useRouter();

  const sinStock = stock <= 0;
  // Solo para mostrar: el total que se cobra lo calcula el servidor con los mismos escalones
  const { unitario, total, ahorro } = totalPedido(precio, escalones, cantidad);
  // Atajos: 1 unidad y cada promo que el stock permita
  const atajos = [1, ...escalones.map((e) => e.desde)].filter((n) => n <= stock);

  function decrementar() {
    setCantidad((c) => Math.max(1, c - 1));
  }

  function incrementar() {
    setCantidad((c) => Math.min(stock, c + 1));
  }

  /** Todas las opciones elegidas; si falta alguna, lo avisa. */
  function eleccionCompleta() {
    const sinElegir = opciones.find((o) => !eleccion[o.nombre]);
    setFalta(sinElegir ? `Elegí ${sinElegir.nombre.toLowerCase()}` : null);
    return !sinElegir;
  }

  function agregar() {
    if (!eleccionCompleta()) return;
    guardarCarrito(agregarAlCarrito(leerCarrito(), slug, cantidad, opciones.length ? eleccion : undefined));
    setAgregado(true);
  }

  function comprar() {
    if (!eleccionCompleta()) return;
    const params = new URLSearchParams({ producto: slug, cantidad: String(cantidad) });
    if (opciones.length) params.set("opciones", JSON.stringify(eleccion));
    if (origen) params.set("origen", origen);
    router.push(`/checkout?${params}`);
  }

  if (sinStock) {
    return (
      <p className="inline-block rounded-full border aviso-error px-4 py-2 text-sm font-semibold">
        Sin stock por el momento
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {opciones.map((o) => (
        <div key={o.nombre}>
          <label className="etiqueta" htmlFor={`opcion-${o.nombre}`}>
            {o.nombre}
          </label>
          <select
            id={`opcion-${o.nombre}`}
            className="campo max-w-xs"
            value={eleccion[o.nombre] ?? ""}
            onChange={(e) => {
              setEleccion((actual) => ({ ...actual, [o.nombre]: e.target.value }));
              setFalta(null);
              setAgregado(false);
            }}
          >
            <option value="" disabled>
              Elegí {o.nombre.toLowerCase()}
            </option>
            {o.valores.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      ))}
      {atajos.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Elegí ${unidad.genero === "femenino" ? "cuántas" : "cuántos"} ${unidad.plural}`}>
          {atajos.map((n) => {
            const t = totalPedido(precio, escalones, n);
            const elegido = n === cantidad;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setCantidad(n)}
                aria-pressed={elegido}
                className={`rounded-xl border px-4 py-2 text-left transition ${
                  elegido
                    ? "border-[var(--acento)] bg-[rgb(var(--acento-rgb)/0.16)]"
                    : "border-[rgb(var(--acento-rgb)/0.35)] bg-[var(--fondo-control)] hover:border-[var(--acento)]"
                }`}
              >
                <span className="block text-sm font-semibold text-[var(--texto)]">
                  {cantidadConUnidad(n, unidad)}
                </span>
                <span className="block text-xs texto-suave">
                  {formatPrecio(t.total)}
                  {t.ahorro > 0 && <span className="text-[var(--destacado)]"> · ahorrás {formatPrecio(t.ahorro)}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex w-fit items-center gap-3 rounded-full border border-[rgb(var(--acento-rgb)/0.45)] bg-[var(--fondo-control)] px-2 py-1">
          <button
            type="button"
            onClick={decrementar}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-[var(--texto)] transition hover:bg-[var(--resalte)] disabled:opacity-40"
            disabled={cantidad <= 1}
            aria-label="Restar cantidad"
          >
            −
          </button>
          <span className="w-6 text-center font-semibold text-[var(--texto)]" aria-live="polite">{cantidad}</span>
          <button
            type="button"
            onClick={incrementar}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-[var(--texto)] transition hover:bg-[var(--resalte)] disabled:opacity-40"
            disabled={cantidad >= stock}
            aria-label="Sumar cantidad"
          >
            +
          </button>
        </div>
        <span className="wrap-focus w-fit">
          <button type="button" onClick={conCarrito ? agregar : comprar} className="btn" data-fondo-evita>
            {conCarrito ? "Agregar al carrito" : "Comprar"} · {formatPrecio(total)}
          </button>
        </span>
      </div>
      {falta && (
        <p className="w-fit rounded-lg border aviso-error px-3 py-2 text-sm" role="alert">
          {falta}
        </p>
      )}
      {agregado && (
        <p className="text-sm text-[var(--texto)]" role="status">
          Listo, está en el carrito.{" "}
          <Link href="/carrito" className="font-semibold text-[var(--destacado)] underline underline-offset-4">
            Ver carrito
          </Link>
        </p>
      )}
      <p className="texto-suave text-sm">
        {cantidad > 1 && <>{formatPrecio(unitario)} cada {unidad.singular}{ahorro > 0 && <> · ahorrás {formatPrecio(ahorro)}</>} · </>}
        {stock} unidades disponibles
      </p>
    </div>
  );
}
