import { prisma } from "@/lib/prisma";
import { etiquetaZona, textoResumenEnvio } from "@/lib/envios";
import ZonaEnvioForm from "@/components/admin/ZonaEnvioForm";
import ZonaEnvioActions from "@/components/admin/ZonaEnvioActions";

export const dynamic = "force-dynamic";

export default async function AdminEnviosPage() {
  const zonas = await prisma.zonaEnvio.findMany({
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    include: { _count: { select: { pedidos: true } } },
  });
  const activas = zonas.filter((z) => z.activa).length;
  const ordenSugerido = zonas.length ? Math.max(...zonas.map((z) => z.orden)) + 10 : 10;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-oscuro">Envíos</h1>
        <p className="mt-1 text-sm text-stone-500">
          Las zonas activas se eligen en el checkout, de menor a mayor orden. Con una sola, se elige sola; sin
          ninguna, no se puede comprar.
        </p>
      </div>

      {activas === 0 && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay ninguna zona activa: el checkout no deja pagar hasta que actives una.
        </p>
      )}

      <section>
        <h2 className="font-serif text-lg font-semibold text-oscuro">Zonas ({zonas.length})</h2>
        <div className="mt-3 space-y-4">
          {zonas.map((z) => (
            <article key={z.id} className={`rounded-xl border bg-white p-5 shadow-soft ${z.activa ? "border-marca-100" : "border-stone-200 opacity-80"}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                <span className="font-medium text-stone-700">#{z.id}</span>
                <span className="text-xs">orden {z.orden}</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${z.activa ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                  {z.activa ? "Activa" : "Inactiva"}
                </span>
                <span className="text-xs">{z._count.pedidos === 1 ? "1 pedido" : `${z._count.pedidos} pedidos`}</span>
              </div>
              <p className="mt-2 font-semibold text-oscuro">{etiquetaZona(z)}</p>
              {z.aclaracion && <p className="mt-1 text-sm text-stone-700">{z.aclaracion}</p>}
              <p className="mt-1 text-xs text-stone-500">Resumen: {textoResumenEnvio(z)}</p>
              <div className="mt-4">
                <ZonaEnvioActions
                  zonaId={z.id}
                  valores={{
                    nombre: z.nombre,
                    costo: z.costo === null ? "" : String(z.costo),
                    aclaracion: z.aclaracion,
                    detalleResumen: z.detalleResumen,
                    orden: z.orden,
                    activa: z.activa,
                  }}
                />
              </div>
            </article>
          ))}
          {zonas.length === 0 && (
            <p className="rounded-xl border border-marca-100 bg-white px-4 py-10 text-center text-stone-400">
              Todavía no hay zonas de envío.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-oscuro">Nueva zona</h2>
        <div className="mt-3 rounded-xl border border-marca-100 bg-white p-5 shadow-soft">
          <ZonaEnvioForm ordenSugerido={ordenSugerido} />
        </div>
      </section>
    </div>
  );
}
