"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@prisma/client";
import { formatPrecio } from "@/lib/utils";
import { leerEscalones, type Escalon } from "@/lib/precios";
import { cantidadConUnidad, cliente, deLaUnidad, masBarato } from "@/plataforma/cliente";

export default function StockEditor({ product }: { product: Product }) {
  const [stock, setStock] = useState(product.stock);
  const [precio, setPrecio] = useState(product.precio);
  const [escalones, setEscalones] = useState<Escalon[]>(leerEscalones(product.escalones));

  function setEscalon(i: number, campo: keyof Escalon, valor: number) {
    setEscalones((lista) => lista.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)));
  }
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    try {
      const res = await fetch("/api/admin/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, stock, precio, escalones }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMensaje(data?.error ?? "No se pudo guardar");
      } else {
        setMensaje("Cambios guardados");
        router.refresh();
      }
    } catch {
      setMensaje("No se pudo guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-marca-100 bg-white p-6 shadow-soft">
      <h2 className="font-semibold text-oscuro">{product.nombre}</h2>
      <p className="mt-1 text-sm text-stone-500">Precio {deLaUnidad} y unidades disponibles</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[140px] flex-1">
          <label className="label-field" htmlFor="precio">Precio (pesos)</label>
          <input
            id="precio"
            type="number"
            min={1}
            step={1}
            className="input-field"
            value={precio}
            onChange={(e) => setPrecio(Number(e.target.value))}
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="label-field" htmlFor="stock">Unidades</label>
          <input
            id="stock"
            type="number"
            min={0}
            className="input-field"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-marca-100 pt-5">
        <h3 className="font-semibold text-oscuro">Promos por cantidad</h3>
        <p className="mt-1 text-sm text-stone-500">
          Desde cierta cantidad, cada {cliente.unidad.singular} sale {masBarato}. Se aplican solas en la web, el chat y las respuestas de Instagram ($PROMOS).
        </p>
        <div className="mt-3 space-y-3">
          {escalones.map((e, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <div className="w-32">
                <label className="label-field" htmlFor={`desde-${i}`}>Desde ({cliente.unidad.plural})</label>
                <input id={`desde-${i}`} type="number" min={2} step={1} className="input-field" value={e.desde} onChange={(ev) => setEscalon(i, "desde", Number(ev.target.value))} />
              </div>
              <div className="w-40">
                <label className="label-field" htmlFor={`precio-${i}`}>Precio por {cliente.unidad.singular}</label>
                <input id={`precio-${i}`} type="number" min={1} step={1} className="input-field" value={e.precio} onChange={(ev) => setEscalon(i, "precio", Number(ev.target.value))} />
              </div>
              <p className="pb-2.5 text-sm text-stone-600">
                {cantidadConUnidad(e.desde)} = <strong>{formatPrecio(e.desde * e.precio)}</strong>
                {e.precio < precio && <> (ahorran {formatPrecio((precio - e.precio) * e.desde)})</>}
              </p>
              <button type="button" onClick={() => setEscalones((l) => l.filter((_, j) => j !== i))} className="mb-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50">
                Quitar
              </button>
            </div>
          ))}
          {escalones.length < 3 && (
            <button
              type="button"
              onClick={() => setEscalones((l) => [...l, { desde: (l.at(-1)?.desde ?? 1) + 5, precio: Math.max(1, (l.at(-1)?.precio ?? precio) - 500) }])}
              className="rounded-full border border-marca-500 px-3 py-1.5 text-sm font-semibold text-marca-700 hover:bg-marca-50"
            >
              + Agregar promo
            </button>
          )}
        </div>
      </div>

      <button type="submit" className="btn-primary mt-6" disabled={loading}>
        {loading ? "Guardando..." : "Guardar"}
      </button>

      {mensaje && <p className="mt-3 text-sm text-stone-600">{mensaje}</p>}
    </form>
  );
}
