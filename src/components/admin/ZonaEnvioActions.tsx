"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ZonaEnvioForm, { type ZonaEnvioValores } from "@/components/admin/ZonaEnvioForm";

/** Activar/desactivar, editar y borrar una zona de envío. */
export default function ZonaEnvioActions({ zonaId, valores }: { zonaId: number; valores: ZonaEnvioValores }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const router = useRouter();

  async function pedir(method: "PATCH" | "DELETE", body?: unknown) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/envios/${zonaId}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) setError(data?.error ?? `Error del servidor (${res.status})`);
      else router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
      setConfirmarBorrado(false);
    }
  }

  const botonChico = "rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => pedir("PATCH", { activa: !valores.activa })}
          disabled={loading}
          className={`${botonChico} ${valores.activa ? "border-stone-300 text-stone-600 hover:bg-stone-50" : "border-marca-500 bg-marca-500 text-white hover:bg-marca-600"}`}
        >
          {valores.activa ? "Desactivar" : "Activar"}
        </button>
        <button onClick={() => setEditando((e) => !e)} className={`${botonChico} border-marca-500 text-marca-700 hover:bg-marca-50`}>
          {editando ? "Cerrar edición" : "Editar"}
        </button>
        {confirmarBorrado ? (
          <>
            <button onClick={() => pedir("DELETE")} disabled={loading} className={`${botonChico} border-red-600 bg-red-600 text-white`}>
              Sí, borrar
            </button>
            <button onClick={() => setConfirmarBorrado(false)} className={`${botonChico} border-stone-300 text-stone-600`}>
              Cancelar
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmarBorrado(true)} disabled={loading} className={`${botonChico} border-stone-300 text-stone-600 hover:bg-stone-50`}>
            Borrar
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {editando && (
        <div className="rounded-lg border border-marca-100 bg-marca-50/40 p-4">
          <ZonaEnvioForm zonaId={zonaId} inicial={valores} onListo={() => setEditando(false)} />
        </div>
      )}
    </div>
  );
}
