"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cliente } from "@/plataforma/cliente";

export type AutoRespuestaValores = {
  nombre: string;
  palabrasClave: string; // separadas por coma
  coincidencia: "contiene" | "exacta";
  canal: "dm" | "comentario" | "ambos";
  respuesta: string;
  botones: { titulo: string; url: string }[];
  respuestaPublicaComentario: string;
  prioridad: number;
  activa: boolean;
};

const VACIO: AutoRespuestaValores = {
  nombre: "",
  palabrasClave: "",
  coincidencia: "contiene",
  canal: "ambos",
  respuesta: "",
  botones: [],
  respuestaPublicaComentario: "",
  prioridad: 0,
  activa: true,
};

/** Formulario para crear (o editar, si recibe reglaId) una respuesta automática. */
export default function AutoRespuestaForm({
  reglaId,
  inicial,
  onListo,
}: {
  reglaId?: number;
  inicial?: AutoRespuestaValores;
  onListo?: () => void;
}) {
  const [valores, setValores] = useState<AutoRespuestaValores>(inicial ?? VACIO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();
  const idBase = reglaId ? `regla-${reglaId}` : "nueva";

  function set<K extends keyof AutoRespuestaValores>(campo: K, valor: AutoRespuestaValores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  function setBoton(i: number, campo: "titulo" | "url", valor: string) {
    setValores((v) => ({ ...v, botones: v.botones.map((b, j) => (j === i ? { ...b, [campo]: valor } : b)) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(reglaId ? `/api/admin/autorespuestas/${reglaId}` : "/api/admin/autorespuestas", {
        method: reglaId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...valores,
          palabrasClave: valores.palabrasClave.split(","),
          botones: valores.botones.filter((b) => b.titulo.trim() || b.url.trim()),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Error del servidor (${res.status})`);
        return;
      }
      setOk(reglaId ? "Cambios guardados." : `Regla #${data.id} creada.`);
      if (!reglaId) setValores(VACIO);
      router.refresh();
      onListo?.();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const permiteComentarios = valores.canal !== "dm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor={`${idBase}-nombre`}>Nombre (solo para vos)</label>
          <input id={`${idBase}-nombre`} className="input-field" value={valores.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Bienvenida" maxLength={80} required />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-claves`}>Palabras clave (separadas por coma)</label>
          <input id={`${idBase}-claves`} className="input-field" value={valores.palabrasClave} onChange={(e) => set("palabrasClave", e.target.value)} placeholder="miel, precio, comprar" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label-field" htmlFor={`${idBase}-coincidencia`}>Coincidencia</label>
          <select id={`${idBase}-coincidencia`} className="input-field" value={valores.coincidencia} onChange={(e) => set("coincidencia", e.target.value as AutoRespuestaValores["coincidencia"])}>
            <option value="contiene">El mensaje contiene la palabra</option>
            <option value="exacta">El mensaje es exactamente la palabra</option>
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-canal`}>Canal</label>
          <select id={`${idBase}-canal`} className="input-field" value={valores.canal} onChange={(e) => set("canal", e.target.value as AutoRespuestaValores["canal"])}>
            <option value="ambos">DMs y comentarios</option>
            <option value="dm">Solo DMs</option>
            <option value="comentario">Solo comentarios</option>
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-prioridad`}>Prioridad (gana la más alta)</label>
          <input id={`${idBase}-prioridad`} type="number" className="input-field" value={valores.prioridad} onChange={(e) => set("prioridad", Number(e.target.value))} min={-100} max={1000} />
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor={`${idBase}-respuesta`}>Respuesta</label>
        <textarea id={`${idBase}-respuesta`} className="input-field min-h-[100px]" value={valores.respuesta} onChange={(e) => set("respuesta", e.target.value)} maxLength={640} required />
        <p className="mt-1 text-xs text-stone-500">
          $PRECIO se reemplaza por el precio actual del frasco y $PROMOS por las promos por cantidad. Hasta 640 caracteres ({valores.respuesta.length}).
        </p>
      </div>

      <div className="space-y-2">
        <p className="label-field">Botones con link (hasta 3)</p>
        {valores.botones.map((b, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input aria-label={`Título del botón ${i + 1}`} className="input-field" value={b.titulo} onChange={(e) => setBoton(i, "titulo", e.target.value)} placeholder="🍯 Quiero comprar (hasta 20)" />
            <input aria-label={`Link del botón ${i + 1}`} className="input-field" value={b.url} onChange={(e) => setBoton(i, "url", e.target.value)} placeholder={`${cliente.dominio}/producto?origen=instagram`} />
            <button type="button" onClick={() => set("botones", valores.botones.filter((_, j) => j !== i))} className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50">
              Quitar
            </button>
          </div>
        ))}
        {valores.botones.length < 3 && (
          <button type="button" onClick={() => set("botones", [...valores.botones, { titulo: "", url: "" }])} className="rounded-full border border-miel-500 px-3 py-1.5 text-sm font-semibold text-miel-700 hover:bg-miel-50">
            + Agregar botón
          </button>
        )}
      </div>

      {permiteComentarios && (
        <div>
          <label className="label-field" htmlFor={`${idBase}-publica`}>Respuesta pública al comentario (opcional)</label>
          <input id={`${idBase}-publica`} className="input-field" value={valores.respuestaPublicaComentario} onChange={(e) => set("respuestaPublicaComentario", e.target.value)} placeholder="¡Te mandamos un DM! 🐝" maxLength={300} />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={valores.activa} onChange={(e) => set("activa", e.target.checked)} />
        Activa (responde de verdad en Instagram)
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Guardando…" : reglaId ? "Guardar cambios" : "Crear regla"}
      </button>
    </form>
  );
}
