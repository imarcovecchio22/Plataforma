"use client";

import { useState } from "react";
import { cliente } from "@/plataforma/cliente";
import {
  armarTextoRespuesta,
  elegirRegla,
  type BotonRegla,
  type CanalEvento,
  type ReglaParaCoincidir,
} from "@/lib/instagram/reglas";
import type { DatosTextos } from "@/lib/variables";

type ReglaProbador = ReglaParaCoincidir & {
  nombre: string;
  respuesta: string;
  botones: BotonRegla[];
  respuestaPublicaComentario: string | null;
};

/**
 * Muestra qué regla coincidiría con un mensaje de ejemplo y qué se respondería,
 * sin mandar nada. Usa la misma lógica que el webhook.
 */
export default function ProbadorRespuestas({ reglas, datos }: { reglas: ReglaProbador[]; datos: DatosTextos }) {
  const [texto, setTexto] = useState("");
  const [canal, setCanal] = useState<CanalEvento>("dm");

  const regla = texto.trim() ? elegirRegla(texto, canal, reglas) : null;
  // Si ninguna activa coincide, se avisa si alguna desactivada lo haría (para probar antes de activarla).
  const inactiva =
    texto.trim() && !regla ? elegirRegla(texto, canal, reglas.map((r) => ({ ...r, activa: true }))) : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          aria-label="Mensaje de ejemplo"
          className="input-field"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={`Ej: ${cliente.textos.ejemplosAdmin.mensajeProbador}`}
        />
        <select aria-label="Canal" className="input-field" value={canal} onChange={(e) => setCanal(e.target.value as CanalEvento)}>
          <option value="dm">Como DM</option>
          <option value="comentario">Como comentario</option>
        </select>
      </div>

      {texto.trim() &&
        (regla ? (
          <div className="rounded-lg bg-emerald-50 p-4 text-sm text-stone-700">
            <p className="font-semibold text-emerald-800">
              Coincide: #{regla.id} {regla.nombre} (prioridad {regla.prioridad})
            </p>
            <p className="mt-2 whitespace-pre-wrap">{armarTextoRespuesta(regla.respuesta, datos)}</p>
            {regla.botones.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {regla.botones.map((b) => (
                  <span key={b.url + b.titulo} title={b.url} className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs">
                    {b.titulo}
                  </span>
                ))}
              </div>
            )}
            {canal === "comentario" && (
              <p className="mt-2 text-xs text-stone-500">
                Va por DM privado al autor
                {regla.respuestaPublicaComentario
                  ? `, y se contesta en público: “${regla.respuestaPublicaComentario}”`
                  : " (sin respuesta pública)"}
                .
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
            No coincide ninguna regla activa: no se respondería nada.
            {inactiva && ` (Coincidiría la regla desactivada #${inactiva.id} ${inactiva.nombre}.)`}
          </p>
        ))}
    </div>
  );
}
