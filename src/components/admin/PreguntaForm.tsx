"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import RespuestaFrecuente from "@/components/RespuestaFrecuente";
import { armarRespuesta } from "@/lib/preguntas";
import type { DatosTextos } from "@/lib/variables";

export type PreguntaValores = { pregunta: string; respuesta: string; orden: number; activa: boolean };

/** Formulario para crear (o editar, si recibe preguntaId) una pregunta frecuente, con vista previa. */
export default function PreguntaForm({
  preguntaId,
  inicial,
  ordenSugerido = 0,
  datos,
  onListo,
}: {
  preguntaId?: number;
  inicial?: PreguntaValores;
  ordenSugerido?: number;
  datos: DatosTextos;
  onListo?: () => void;
}) {
  const vacio: PreguntaValores = { pregunta: "", respuesta: "", orden: ordenSugerido, activa: true };
  const [valores, setValores] = useState<PreguntaValores>(inicial ?? vacio);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();
  const idBase = preguntaId ? `pregunta-${preguntaId}` : "nueva-pregunta";

  function set<K extends keyof PreguntaValores>(campo: K, valor: PreguntaValores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(preguntaId ? `/api/admin/preguntas/${preguntaId}` : "/api/admin/preguntas", {
        method: preguntaId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valores),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Error del servidor (${res.status})`);
        return;
      }
      setOk(preguntaId ? "Cambios guardados." : `Pregunta #${data.id} creada.`);
      if (!preguntaId) setValores({ ...vacio, orden: valores.orden + 10 });
      router.refresh();
      onListo?.();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label className="label-field" htmlFor={`${idBase}-pregunta`}>Pregunta</label>
          <input id={`${idBase}-pregunta`} className="input-field" value={valores.pregunta} onChange={(e) => set("pregunta", e.target.value)} placeholder="Ej: ¿Cómo puedo pagar?" maxLength={200} required />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-orden`}>Orden</label>
          <input id={`${idBase}-orden`} type="number" className="input-field" value={valores.orden} onChange={(e) => set("orden", Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label-field" htmlFor={`${idBase}-respuesta`}>Respuesta</label>
        <textarea id={`${idBase}-respuesta`} className="input-field min-h-28" value={valores.respuesta} onChange={(e) => set("respuesta", e.target.value)} maxLength={1500} required />
        <p className="mt-1 text-xs text-stone-500">
          $PRODUCTO, $PRECIO y $PROMOS se reemplazan por los datos actuales del producto destacado (el primero),
          $CATALOGO por todos los productos con su precio y $ZONAS por las zonas de envío. Lo que va entre [[ y ]] se
          muestra solo si hay promos por cantidad. Para un link: [texto](#escribinos), [texto](/producto) o
          [texto](https://…). Hasta 1500 caracteres ({valores.respuesta.length}).
        </p>
      </div>
      {valores.respuesta.trim() && (
        <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Así se ve</p>
          <RespuestaFrecuente texto={armarRespuesta(valores.respuesta, datos)} claseLink="font-semibold underline underline-offset-2" />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={valores.activa} onChange={(e) => set("activa", e.target.checked)} />
        Visible en /consultas
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">{ok}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Guardando…" : preguntaId ? "Guardar cambios" : "Agregar pregunta"}
      </button>
    </form>
  );
}
