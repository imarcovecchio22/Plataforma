"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Accion = "generar" | "reintentar" | "eliminar";

/** Botones de un post del cronograma según su estado. */
export default function PostIGActions({ postId, estado }: { postId: number; estado: string }) {
  const [loading, setLoading] = useState<Accion | null>(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const router = useRouter();

  async function ejecutar(accion: Accion) {
    setLoading(accion);
    setMensaje(null);
    try {
      const res =
        accion === "generar"
          ? await fetch("/api/admin/instagram/generar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: postId }),
            })
          : await fetch(`/api/admin/instagram/posts/${postId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accion }),
            });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMensaje({ ok: false, texto: data?.error ?? `Error del servidor (${res.status})` });
      } else if (accion === "generar") {
        setMensaje(
          data?.generados
            ? { ok: true, texto: "Generado: revisá Telegram." }
            : { ok: false, texto: "No se generó: mirá el error del post." }
        );
      }
      router.refresh();
    } catch {
      setMensaje({ ok: false, texto: "No pudimos conectar con el servidor." });
    } finally {
      setLoading(null);
      setConfirmarBorrado(false);
    }
  }

  const botonChico = "rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {estado === "pendiente" && (
          <button onClick={() => ejecutar("generar")} disabled={!!loading} className={`${botonChico} border-marca-500 bg-marca-500 text-white hover:bg-marca-600`}>
            {loading === "generar" ? "Generando… (hasta 1 min)" : "Generar ahora"}
          </button>
        )}
        {(estado === "error" || estado === "descartado") && (
          <button onClick={() => ejecutar("reintentar")} disabled={!!loading} className={`${botonChico} border-marca-500 text-marca-700 hover:bg-marca-50`}>
            Volver a pendiente
          </button>
        )}
        {["pendiente", "error", "descartado"].includes(estado) &&
          (confirmarBorrado ? (
            <>
              <button onClick={() => ejecutar("eliminar")} disabled={!!loading} className={`${botonChico} border-red-600 bg-red-600 text-white`}>
                Sí, borrar
              </button>
              <button onClick={() => setConfirmarBorrado(false)} className={`${botonChico} border-stone-300 text-stone-600`}>
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmarBorrado(true)} disabled={!!loading} className={`${botonChico} border-stone-300 text-stone-600 hover:bg-stone-50`}>
              Borrar
            </button>
          ))}
      </div>
      {mensaje && <p className={`text-xs ${mensaje.ok ? "text-emerald-700" : "text-red-600"}`}>{mensaje.texto}</p>}
    </div>
  );
}
