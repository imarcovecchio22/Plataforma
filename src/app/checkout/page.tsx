import ChatWidget from "@/components/ChatWidget";
import CheckoutForm from "@/components/CheckoutForm";
import SinProductos from "@/components/SinProductos";
import { notFound } from "next/navigation";
import { getMainProduct, getProductoPorSlug } from "@/lib/product";
import { leerEscalones } from "@/lib/precios";
import { unidadDe } from "@/plataforma/cliente";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ producto?: string; cantidad?: string; origen?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  // El producto que se compra: el de ?producto=<slug>; sin él (links viejos), el destacado
  const product = searchParams.producto ? await getProductoPorSlug(searchParams.producto) : await getMainProduct();
  if (!product) {
    if (searchParams.producto) notFound();
    return <SinProductos />;
  }
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
          producto={{
            slug: product.slug,
            nombre: product.nombre,
            precio: product.precio,
            escalones: leerEscalones(product.escalones),
            unidad: unidadDe(product),
          }}
          cantidadInicial={cantidadInicial}
          origen={origen}
        />
      </main>
      <ChatWidget />
    </>
  );
}
