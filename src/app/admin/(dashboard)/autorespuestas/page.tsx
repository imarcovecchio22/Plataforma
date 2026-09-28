import type { AccionEventoIG, AutoRespuesta } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatFecha, formatPrecio, haceMs } from "@/lib/utils";
import { getMainProduct } from "@/lib/product";
import { siteUrl } from "@/lib/telegram";
import { leerBotones } from "@/lib/instagram/reglas";
import { leerEscalones, textoPromos } from "@/lib/precios";
import { HORAS_ENTRE_RESPUESTAS } from "@/lib/instagram/autorespuestas";
import { diasRestantes, getInstagramToken, RENOVAR_DIAS_ANTES } from "@/lib/instagram/token";
import AutoRespuestaForm, { type AutoRespuestaValores } from "@/components/admin/AutoRespuestaForm";
import AutoRespuestaActions from "@/components/admin/AutoRespuestaActions";
import ProbadorRespuestas from "@/components/admin/ProbadorRespuestas";
import TokenIGRenovar from "@/components/admin/TokenIGRenovar";
import ReiniciarLimiteIG from "@/components/admin/ReiniciarLimiteIG";
import { cliente } from "@/plataforma/cliente";

export const dynamic = "force-dynamic";

const ACCION: Record<AccionEventoIG, { label: string; color: string }> = {
  procesando: { label: "Procesando", color: "bg-blue-100 text-blue-800" },
  respondido: { label: "Respondido", color: "bg-emerald-100 text-emerald-800" },
  sin_coincidencia: { label: "Sin coincidencia", color: "bg-stone-100 text-stone-600" },
  ignorado: { label: "Ignorado", color: "bg-amber-100 text-amber-800" },
  error: { label: "Error", color: "bg-red-100 text-red-800" },
};

const CANAL = { dm: "DMs", comentario: "Comentarios", ambos: "DMs y comentarios" } as const;

function valoresDe(r: AutoRespuesta): AutoRespuestaValores {
  return {
    nombre: r.nombre,
    palabrasClave: r.palabrasClave.join(", "),
    coincidencia: r.coincidencia,
    canal: r.canal,
    respuesta: r.respuesta,
    botones: leerBotones(r.botones),
    respuestaPublicaComentario: r.respuestaPublicaComentario ?? "",
    prioridad: r.prioridad,
    activa: r.activa,
  };
}

/** Estado del token sin mostrarlo nunca (ni una parte). */
async function estadoToken() {
  try {
    const fila = await getInstagramToken();
    return { configurado: true as const, expiresAt: fila.expiresAt, dias: diasRestantes(fila.expiresAt) };
  } catch (error) {
    return { configurado: false as const, error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function AdminAutoRespuestasPage() {
  const [reglas, eventos, product, token] = await Promise.all([
    prisma.autoRespuesta.findMany({ orderBy: [{ activa: "desc" }, { prioridad: "desc" }, { id: "asc" }] }),
    prisma.instagramEvento.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { regla: { select: { nombre: true } } },
    }),
    getMainProduct(),
    estadoToken(),
  ]);

  // Cuentas a las que todavía les bloquea el límite: el botón va solo en su evento más reciente.
  const desdeLimite = haceMs(HORAS_ENTRE_RESPUESTAS * 3_600_000);
  const conBoton = new Set<number>();
  const vistas = new Set<string>();
  for (const e of eventos) {
    if (vistas.has(e.usuarioIgId)) continue;
    vistas.add(e.usuarioIgId);
    const bloqueada = eventos.some(
      (x) =>
        x.usuarioIgId === e.usuarioIgId && x.accion === "respondido" && x.cuentaParaLimite && x.createdAt >= desdeLimite
    );
    if (bloqueada) conBoton.add(e.id);
  }

  const faltan = ["IG_APP_SECRET", "IG_WEBHOOK_VERIFY_TOKEN", "IG_ACCESS_TOKEN", "IG_USER_ID"].filter(
    (v) => !process.env[v]
  );
  const reglasProbador = reglas.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    palabrasClave: r.palabrasClave,
    coincidencia: r.coincidencia,
    canal: r.canal,
    prioridad: r.prioridad,
    activa: r.activa,
    respuesta: r.respuesta,
    botones: leerBotones(r.botones),
    respuestaPublicaComentario: r.respuestaPublicaComentario,
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-marron">Respuestas automáticas de Instagram</h1>
        <p className="mt-1 text-sm text-stone-500">
          Contestan solas los DMs y comentarios de @{cliente.instagram} que tengan alguna palabra clave. A una misma persona
          no se le repite la misma regla por {HORAS_ENTRE_RESPUESTAS} h.
        </p>
      </div>

      <section className="rounded-xl border border-miel-100 bg-white p-5 shadow-soft">
        <h2 className="font-serif text-lg font-semibold text-marron">Conexión con Instagram</h2>
        {faltan.length > 0 && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Faltan variables en Vercel: {faltan.join(", ")}. Hasta que estén, no se responde nada.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4 text-sm text-stone-700">
          <div className="space-y-1">
            {token.configurado ? (
              <p>
                Token:{" "}
                {token.expiresAt ? (
                  <>
                    vence el <strong>{formatFecha(token.expiresAt)}</strong> ({token.dias} días). Se renueva solo cuando
                    le quedan menos de {RENOVAR_DIAS_ANTES}.
                  </>
                ) : (
                  <>cargado; la fecha de vencimiento se sabe después de la primera renovación.</>
                )}
              </p>
            ) : (
              <p className="text-red-700">Token: {token.error}</p>
            )}
            <p className="text-stone-500">
              URL del webhook para Meta: <code className="rounded bg-stone-100 px-1">{siteUrl()}/api/instagram/webhook</code>
            </p>
          </div>
          {token.configurado && <TokenIGRenovar />}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-marron">Probador</h2>
        <p className="mb-3 text-sm text-stone-500">Escribí un mensaje de ejemplo: muestra qué se respondería, sin mandar nada.</p>
        <div className="rounded-xl border border-miel-100 bg-white p-5 shadow-soft">
          <ProbadorRespuestas reglas={reglasProbador} precio={formatPrecio(product.precio)} promos={textoPromos(leerEscalones(product.escalones))} />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-marron">Reglas ({reglas.length})</h2>
        <div className="mt-3 space-y-4">
          {reglas.map((r) => {
            const botones = leerBotones(r.botones);
            return (
              <article key={r.id} className={`rounded-xl border bg-white p-5 shadow-soft ${r.activa ? "border-miel-100" : "border-stone-200 opacity-80"}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                  <span className="font-medium text-stone-700">#{r.id}</span>
                  <span className="font-semibold text-marron">{r.nombre}</span>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${r.activa ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                    {r.activa ? "Activa" : "Desactivada"}
                  </span>
                  <span className="rounded-full bg-miel-50 px-2 py-0.5 text-xs">{CANAL[r.canal]}</span>
                  <span className="text-xs">prioridad {r.prioridad}</span>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  {r.coincidencia === "exacta" ? "Mensaje exacto: " : "Contiene: "}
                  {r.palabrasClave.map((p) => (
                    <span key={p} className="mr-1 inline-block rounded bg-miel-50 px-1.5 text-miel-800">{p}</span>
                  ))}
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words text-stone-700">{r.respuesta}</p>
                {botones.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {botones.map((b) => (
                      <a key={b.url + b.titulo} href={b.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-miel-200 px-3 py-1 text-xs text-miel-800 hover:bg-miel-50">
                        {b.titulo}
                      </a>
                    ))}
                  </div>
                )}
                {r.respuestaPublicaComentario && r.canal !== "dm" && (
                  <p className="mt-2 text-xs text-stone-500">Respuesta pública al comentario: “{r.respuestaPublicaComentario}”</p>
                )}
                <div className="mt-4">
                  <AutoRespuestaActions reglaId={r.id} activa={r.activa} valores={valoresDe(r)} />
                </div>
              </article>
            );
          })}
          {reglas.length === 0 && (
            <p className="rounded-xl border border-miel-100 bg-white px-4 py-10 text-center text-stone-400">Todavía no hay reglas.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-marron">Nueva regla</h2>
        <div className="mt-3 rounded-xl border border-miel-100 bg-white p-5 shadow-soft">
          <AutoRespuestaForm />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-marron">Últimos {eventos.length} mensajes recibidos</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-miel-100 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-miel-50/60 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Texto</th>
                <th className="px-4 py-2">Regla</th>
                <th className="px-4 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-miel-50">
              {eventos.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2 text-stone-500">{formatFecha(e.createdAt)}</td>
                  <td className="px-4 py-2">{e.tipo === "dm" ? "DM" : "Comentario"}</td>
                  <td className="max-w-xs break-words px-4 py-2 text-stone-700">{e.texto}</td>
                  <td className="px-4 py-2 text-stone-600">{e.regla ? `#${e.reglaId} ${e.regla.nombre}` : "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACCION[e.accion].color}`}>{ACCION[e.accion].label}</span>
                    {e.error && <p className="mt-1 max-w-xs break-words text-xs text-stone-500">{e.error}</p>}
                    {conBoton.has(e.id) && <ReiniciarLimiteIG usuarioIgId={e.usuarioIgId} />}
                  </td>
                </tr>
              ))}
              {eventos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone-400">
                    Todavía no llegó ningún mensaje por el webhook.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
