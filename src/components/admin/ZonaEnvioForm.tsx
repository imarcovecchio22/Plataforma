"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { etiquetaZona, textoResumenEnvio } from "@/lib/envios";

export type ZonaEnvioValores = {
  nombre: string;
  /** Vacío = a coordinar */
  costo: string;
  aclaracion: string;
  detalleResumen: string;
  orden: number;
  activa: boolean;
};

/** Formulario para crear (o editar, si recibe zonaId) una zona de envío, con vista previa. */
export default function ZonaEnvioForm({
  zonaId,
  inicial,
  ordenSugerido = 0,
  onListo,
}: {
  zonaId?: number;
  inicial?: ZonaEnvioValores;
  ordenSugerido?: number;
  onListo?: () => void;
}) {
  const vacio: ZonaEnvioValores = { nombre: "", costo: "", aclaracion: "", detalleResumen: "", orden: ordenSugerido, activa: true };
  const [valores, setValores] = useState<ZonaEnvioValores>(inicial ?? vacio);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();
  const idBase = zonaId ? `zona-${zonaId}` : "nueva-zona";

  function set<K extends keyof ZonaEnvioValores>(campo: K, valor: ZonaEnvioValores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(zonaId ? `/api/admin/envios/${zonaId}` : "/api/admin/envios", {
        method: zonaId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...valores, costo: valores.costo.trim() === "" ? null : valores.costo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Error del servidor (${res.status})`);
        return;
      }
      setOk(zonaId ? "Cambios guardados." : `Zona #${data.id} creada.`);
      if (!zonaId) setValores({ ...vacio, orden: valores.orden + 10 });
      router.refresh();
      onListo?.();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const costo = /^\d+$/.test(valores.costo.trim()) ? Number(valores.costo) : null;
  const vista = { id: 0, nombre: valores.nombre.trim() || "…", costo, aclaracion: valores.aclaracion.trim(), detalleResumen: valores.detalleResumen.trim() };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem_8rem]">
        <div>
          <label className="label-field" htmlFor={`${idBase}-nombre`}>Nombre</label>
          <input id={`${idBase}-nombre`} className="input-field" value={valores.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Zona sur del conurbano" maxLength={60} required />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-costo`}>Costo</label>
          <input id={`${idBase}-costo`} type="number" min={1} className="input-field" value={valores.costo} onChange={(e) => set("costo", e.target.value)} placeholder="A coordinar" />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-orden`}>Orden</label>
          <input id={`${idBase}-orden`} type="number" className="input-field" value={valores.orden} onChange={(e) => set("orden", Number(e.target.value))} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-stone-500">
        Con costo, se suma al total y se cobra con Mercado Pago. Vacío: el envío se coordina después de la compra.
      </p>
      <div>
        <label className="label-field" htmlFor={`${idBase}-aclaracion`}>Aclaración (opcional)</label>
        <input id={`${idBase}-aclaracion`} className="input-field" value={valores.aclaracion} onChange={(e) => set("aclaracion", e.target.value)} placeholder="Ej: Llega en 48 a 72 horas hábiles." maxLength={200} />
        <p className="mt-1 text-xs text-stone-500">Se muestra debajo de la zona en el checkout.</p>
      </div>
      <div>
        <label className="label-field" htmlFor={`${idBase}-resumen`}>Texto en el resumen de la compra (opcional)</label>
        <input id={`${idBase}-resumen`} className="input-field" value={valores.detalleResumen} onChange={(e) => set("detalleResumen", e.target.value)} placeholder={textoResumenEnvio({ ...vista, detalleResumen: "" })} maxLength={200} />
      </div>
      <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Así se ve</p>
        <p>{etiquetaZona(vista)}</p>
        {vista.aclaracion && <p className="text-xs text-stone-500">{vista.aclaracion}</p>}
        <p className="mt-1 text-xs text-stone-500">Resumen: {textoResumenEnvio(vista)}</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={valores.activa} onChange={(e) => set("activa", e.target.checked)} />
        Activa (se puede elegir en el checkout)
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">{ok}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Guardando…" : zonaId ? "Guardar cambios" : "Agregar zona"}
      </button>
    </form>
  );
}
