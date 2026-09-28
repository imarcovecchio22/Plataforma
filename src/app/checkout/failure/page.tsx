import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";
import { applyPaymentStatus } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function CheckoutFailurePage({
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
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-900/50 text-3xl text-red-300">
          ✕
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-[var(--texto)] sm:text-4xl">
          El pago no se pudo completar
        </h1>
        <p className="mt-3 max-w-md texto-suave">
          Algo falló durante el pago. Podés intentar de nuevo o{" "}
          <Link href="/consultas" className="font-semibold text-[var(--destacado)] underline underline-offset-4">
            escribirnos desde Consultas
          </Link>{" "}
          si el problema persiste.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/producto" className="btn">
            Intentar de nuevo
          </Link>
          <Link href="/" className="btn-ghost">
            Volver al inicio
          </Link>
        </div>
      </main>
      <ChatWidget />
    </>
  );
}
