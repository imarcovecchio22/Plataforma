import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import { contactoHref } from "@/lib/consultas";
import ConsultaActions from "@/components/admin/ConsultaActions";

export const dynamic = "force-dynamic";

const ESTADO_LABEL = { nueva: "Nueva", respondida: "Respondida", archivada: "Archivada" } as const;
const ESTADO_COLOR = {
  nueva: "bg-amber-100 text-amber-800",
  respondida: "bg-emerald-100 text-emerald-800",
  archivada: "bg-stone-100 text-stone-600",
} as const;

export default async function AdminConsultasPage() {
  const consultas = await prisma.consulta.findMany({
    where: { estado: { not: "archivada" } },
    // "nueva" va antes que "respondida" en el enum
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
  });
  const nuevas = consultas.filter((c) => c.estado === "nueva").length;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-oscuro">Consultas</h1>
      <p className="mt-1 text-sm text-stone-500">
        {nuevas} sin responder · {consultas.length} en total (sin contar archivadas)
      </p>

      <div className="mt-6 space-y-4">
        {consultas.map((c) => {
          const href = contactoHref(c);
          const contacto = c.canal === "instagram" ? c.instagram : c.email;

          return (
            <article
              key={c.id}
              className="rounded-xl border border-marca-100 bg-white p-5 shadow-soft"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                <span className="font-medium text-stone-700">#{c.id}</span>
                <span className="font-semibold text-oscuro">{c.nombre}</span>
                <span>{formatFecha(c.createdAt)}</span>
                <span className="rounded-full bg-marca-50 px-2 py-0.5 text-xs">
                  origen: {c.origen ?? "directo"}
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${ESTADO_COLOR[c.estado]}`}
                >
                  {ESTADO_LABEL[c.estado]}
                </span>
              </div>

              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-marca-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-marca-600"
                >
                  {c.canal === "instagram" ? "Responder por Instagram" : "Responder por email"} ·{" "}
                  {contacto}
                </a>
              )}

              <p className="mt-3 whitespace-pre-wrap break-words text-stone-700">{c.mensaje}</p>

              <div className="mt-4">
                <ConsultaActions consultaId={c.id} estadoActual={c.estado} />
              </div>
            </article>
          );
        })}

        {consultas.length === 0 && (
          <p className="rounded-xl border border-marca-100 bg-white px-4 py-10 text-center text-stone-400">
            Todavía no hay consultas.
          </p>
        )}
      </div>
    </div>
  );
}
