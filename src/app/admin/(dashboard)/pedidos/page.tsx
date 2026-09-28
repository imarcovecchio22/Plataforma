import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrecio, formatFecha, ESTADOS_LABEL, ESTADOS_COLOR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPedidosPage() {
  const pedidos = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { cantidad: true } } },
  });

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-oscuro">Pedidos</h1>
      <p className="mt-1 text-sm text-stone-500">{pedidos.length} pedidos en total</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-marca-100 bg-white shadow-soft">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-marca-100 bg-marca-50/60 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-semibold">N°</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Dirección</th>
              <th className="px-4 py-3 font-semibold">Cant.</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Origen</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-marca-50">
            {pedidos.map((p) => (
              <tr key={p.id} className="text-stone-700">
                <td className="px-4 py-3 font-medium">#{p.numero}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatFecha(p.createdAt)}</td>
                <td className="px-4 py-3">
                  {p.nombre} {p.apellido}
                </td>
                <td className="px-4 py-3 text-stone-500">
                  {p.calle} {p.numero_dir}
                  {p.pisoDepto ? `, ${p.pisoDepto}` : ""}, {p.localidad}
                </td>
                <td className="px-4 py-3">{p.items.reduce((suma, i) => suma + i.cantidad, 0)}</td>
                <td className="px-4 py-3 font-medium">{formatPrecio(p.total)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADOS_COLOR[p.estado]}`}
                  >
                    {ESTADOS_LABEL[p.estado]}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-500">{p.origen ?? "directo"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/pedidos/${p.id}`} className="text-marca-700 hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}

            {pedidos.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-stone-400">
                  Todavía no hay pedidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
