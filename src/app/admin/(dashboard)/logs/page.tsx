import Link from "next/link";
import type { LogNivel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatFecha, haceMs } from "@/lib/utils";
import { LOG_RETENCION_DIAS, LOG_TIPOS } from "@/lib/logs";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;
const NIVELES: LogNivel[] = ["info", "warn", "error"];
const NIVEL_LABEL: Record<LogNivel, string> = { info: "Info", warn: "Aviso", error: "Error" };
const NIVEL_COLOR: Record<LogNivel, string> = {
  info: "bg-stone-100 text-stone-600",
  warn: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
};

type SearchParams = { nivel?: string; tipo?: string; q?: string; pagina?: string };

function uno(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLogsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [K in keyof SearchParams]?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  const filtros: SearchParams = {
    nivel: uno(searchParams.nivel),
    tipo: uno(searchParams.tipo),
    q: uno(searchParams.q)?.trim() || undefined,
    pagina: uno(searchParams.pagina),
  };
  const nivel = NIVELES.includes(filtros.nivel as LogNivel) ? (filtros.nivel as LogNivel) : undefined;
  const tipo = filtros.tipo && (LOG_TIPOS as string[]).includes(filtros.tipo) ? filtros.tipo : undefined;
  const pagina = Math.max(1, Number(filtros.pagina) || 1);

  // Limpieza: se borran los eventos más viejos que la retención.
  await prisma.eventLog.deleteMany({
    where: { createdAt: { lt: haceMs(LOG_RETENCION_DIAS * 24 * 60 * 60 * 1000) } },
  });

  const where: Prisma.EventLogWhereInput = {
    ...(nivel ? { nivel } : {}),
    ...(tipo ? { tipo } : {}),
    ...(filtros.q ? { mensaje: { contains: filtros.q, mode: "insensitive" } } : {}),
  };

  const [logs, total, errores24h] = await Promise.all([
    prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.eventLog.count({ where }),
    prisma.eventLog.count({
      where: { nivel: "error", createdAt: { gte: haceMs(24 * 60 * 60 * 1000) } },
    }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  // Arma la URL con los filtros actuales, cambiando solo lo que se pasa.
  function href(cambios: Partial<Record<keyof SearchParams, string | undefined>>) {
    const params = new URLSearchParams();
    const final = { nivel, tipo, q: filtros.q, ...cambios };
    for (const [k, v] of Object.entries(final)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/admin/logs?${qs}` : "/admin/logs";
  }

  const filtroClase = (activo: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition ${
      activo
        ? "border-marca-500 bg-marca-50 font-semibold text-marca-700"
        : "border-stone-300 text-stone-600 hover:bg-stone-50"
    }`;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-oscuro">Logs</h1>
      <p className="mt-1 text-sm text-stone-500">
        {total} eventos{nivel || tipo || filtros.q ? " con estos filtros" : ""} ·{" "}
        <Link href={href({ nivel: "error", tipo: undefined, q: undefined, pagina: undefined })} className={errores24h ? "font-semibold text-red-700 hover:underline" : ""}>
          {errores24h} errores en las últimas 24 h
        </Link>{" "}
        · se guardan {LOG_RETENCION_DIAS} días
      </p>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-12 text-xs font-semibold uppercase tracking-wide text-stone-400">Nivel</span>
          <Link href={href({ nivel: undefined, pagina: undefined })} className={filtroClase(!nivel)}>
            Todos
          </Link>
          {NIVELES.map((n) => (
            <Link key={n} href={href({ nivel: n, pagina: undefined })} className={filtroClase(nivel === n)}>
              {NIVEL_LABEL[n]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-12 text-xs font-semibold uppercase tracking-wide text-stone-400">Tipo</span>
          <Link href={href({ tipo: undefined, pagina: undefined })} className={filtroClase(!tipo)}>
            Todos
          </Link>
          {LOG_TIPOS.map((t) => (
            <Link key={t} href={href({ tipo: t, pagina: undefined })} className={filtroClase(tipo === t)}>
              {t}
            </Link>
          ))}
        </div>
        <form action="/admin/logs" className="flex flex-wrap gap-2">
          {nivel && <input type="hidden" name="nivel" value={nivel} />}
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          <input
            className="input-field max-w-sm"
            name="q"
            defaultValue={filtros.q ?? ""}
            placeholder="Buscar en el mensaje (ej: #12, Telegram, render)"
            aria-label="Buscar en los logs"
          />
          <button type="submit" className="btn-secondary !px-4 !py-2 text-sm">
            Buscar
          </button>
          {(nivel || tipo || filtros.q) && (
            <Link href="/admin/logs" className="self-center text-sm text-marca-700 hover:underline">
              Limpiar filtros
            </Link>
          )}
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-marca-100 bg-white shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-marca-100 bg-marca-50/60 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Nivel</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Evento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-marca-50">
            {logs.map((log) => (
              <tr key={log.id} className="align-top text-stone-700">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-stone-500">
                  {formatFecha(log.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${NIVEL_COLOR[log.nivel]}`}>
                    {NIVEL_LABEL[log.nivel]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={href({ tipo: log.tipo, pagina: undefined })} className="text-marca-700 hover:underline">
                    {log.tipo}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="break-words">{log.mensaje}</p>
                  {log.detalle !== null && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-stone-400">Detalle</summary>
                      <pre className="mt-1 max-w-[70ch] overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                        {JSON.stringify(log.detalle, null, 2)}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-stone-400">
                  No hay eventos{nivel || tipo || filtros.q ? " con estos filtros" : " todavía"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm text-stone-600" aria-label="Páginas">
          {pagina > 1 ? (
            <Link href={href({ pagina: String(pagina - 1) })} className="text-marca-700 hover:underline">
              ← Más nuevos
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={href({ pagina: String(pagina + 1) })} className="text-marca-700 hover:underline">
              Más viejos →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
