import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";
import { applyPaymentStatus } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function CheckoutPendingPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ orderId?: string; payment_id?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { orderId, payment_id } = searchParams;

  if (orderId && payment_id) {
    await applyPaymentStatus(orderId, payment_id).catch(() => null);
  }

  return (
    <>
      <main className="contenedor-publico flex-1 flex flex-col items-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full icono-pendiente text-3xl">
          ⏳
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-[var(--texto)] sm:text-4xl">
          Tu pago está pendiente
        </h1>
        <p className="mt-3 max-w-md texto-suave">
          Estamos esperando la confirmación de MercadoPago. Te avisaremos por
          email en cuanto se acredite el pago.
        </p>
        <Link href="/" className="btn mt-8">
          Volver al inicio
        </Link>
      </main>
      <ChatWidget />
    </>
  );
}
