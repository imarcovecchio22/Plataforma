import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrecio, formatFecha } from "@/lib/utils";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";

export const dynamic = "force-dynamic";

export default async function AdminPedidoDetallePage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;
  const pedido = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!pedido) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/pedidos" className="text-sm text-marca-700 hover:underline">
        ← Volver a pedidos
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-oscuro">
          Pedido #{pedido.numero}
        </h1>
        <div className="w-48">
          <OrderStatusSelect orderId={pedido.id} estadoActual={pedido.estado} />
        </div>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {formatFecha(pedido.createdAt)} · origen: {pedido.origen ?? "directo"}
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-marca-100 bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-oscuro">Cliente</h2>
          <dl className="mt-3 space-y-1 text-sm text-stone-600">
            <div className="flex justify-between">
              <dt>Nombre</dt>
              <dd>{pedido.nombre} {pedido.apellido}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Email</dt>
              <dd>{pedido.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Teléfono</dt>
              <dd>{pedido.telefono}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-marca-100 bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-oscuro">Dirección de entrega</h2>
          <p className="mt-3 text-sm text-stone-600">
            {pedido.calle} {pedido.numero_dir}
            {pedido.pisoDepto ? `, ${pedido.pisoDepto}` : ""}
            <br />
            {pedido.localidad}, {pedido.provincia}
            <br />
            CP {pedido.codigoPostal}
          </p>
        </div>

        <div className="rounded-xl border border-marca-100 bg-white p-6 shadow-soft sm:col-span-2">
          <h2 className="font-semibold text-oscuro">Detalle del pedido</h2>
          {pedido.items.map((item) => (
            <div key={item.id} className="mt-3 flex items-center justify-between text-sm text-stone-600">
              <span>{item.nombre} × {item.cantidad}</span>
              <span className="font-semibold text-oscuro">{formatPrecio(item.subtotal)}</span>
            </div>
          ))}
          {pedido.items.length > 1 && (
            <div className="mt-3 flex items-center justify-between border-t border-marca-100 pt-3 text-sm font-semibold text-oscuro">
              <span>Total</span>
              <span>{formatPrecio(pedido.total)}</span>
            </div>
          )}
          {pedido.mpPaymentId && (
            <p className="mt-3 text-xs text-stone-400">
              ID de pago MercadoPago: {pedido.mpPaymentId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
