import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";
import { prisma } from "@/lib/prisma";
import { applyPaymentStatus } from "@/lib/orders";
import { formatPrecio } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ orderId?: string; payment_id?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { orderId, payment_id } = searchParams;

  if (orderId && payment_id) {
    // El webhook suele llegar antes, pero por si todavía no procesó la
    // notificación, sincronizamos el estado acá también (es idempotente).
    await applyPaymentStatus(orderId, payment_id).catch(() => null);
  }

  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId } })
    : null;

  return (
    <>
      <main className="contenedor-publico flex-1 flex flex-col items-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/50 text-3xl text-emerald-300">
          ✓
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-[var(--texto)] sm:text-4xl">
          ¡Gracias por tu compra!
        </h1>
        <p className="mt-3 max-w-md texto-suave">
          Tu pago fue confirmado. En breve nos ponemos en contacto para
          coordinar el envío.
        </p>

        {order && (
          <div className="mt-8 w-full max-w-sm tarjeta p-6 text-left">
            <p className="text-sm texto-suave">Pedido</p>
            <p className="font-semibold text-[var(--texto)]">#{order.numero}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="texto-suave">Total</span>
              <span className="font-semibold text-[var(--texto)]">
                {formatPrecio(order.total)}
              </span>
            </div>
          </div>
        )}

        <Link href="/" className="btn mt-8">
          Volver al inicio
        </Link>
      </main>
      <ChatWidget />
    </>
  );
}
