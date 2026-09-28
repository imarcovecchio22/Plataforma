import ChatWidget from "@/components/ChatWidget";
import CheckoutForm from "@/components/CheckoutForm";
import { getMainProduct } from "@/lib/product";
import { leerEscalones } from "@/lib/precios";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ cantidad?: string; origen?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  const product = await getMainProduct();
  const origen = Array.isArray(searchParams.origen) ? searchParams.origen[0] : searchParams.origen;
  const cantidadInicial = Math.max(
    1,
    Math.min(product.stock || 1, Number(searchParams.cantidad) || 1)
  );

  return (
    <>
      <main className="contenedor-publico flex-1 py-12 sm:py-16">
        <h1 className="mb-8 font-serif text-3xl font-semibold text-[var(--texto)] sm:text-4xl">
          Finalizar compra
        </h1>
        <CheckoutForm
          producto={{ nombre: product.nombre, precio: product.precio, escalones: leerEscalones(product.escalones) }}
          cantidadInicial={cantidadInicial}
          origen={origen}
        />
      </main>
      <ChatWidget />
    </>
  );
}
