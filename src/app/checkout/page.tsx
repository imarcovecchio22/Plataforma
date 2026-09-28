import ChatWidget from "@/components/ChatWidget";
import CheckoutForm from "@/components/CheckoutForm";
import SinProductos from "@/components/SinProductos";
import { notFound } from "next/navigation";
import { getMainProduct, getProductoPorSlug, getProductosActivos } from "@/lib/product";
import { leerEscalones } from "@/lib/precios";
import { unidadDe } from "@/plataforma/cliente";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ producto?: string; cantidad?: string; carrito?: string; origen?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  const origenCarrito = Array.isArray(searchParams.origen) ? searchParams.origen[0] : searchParams.origen;

  // Compra del carrito (/checkout?carrito=1): el formulario arma los ítems con lo que está a la venta
  if (searchParams.carrito) {
    const productos = await getProductosActivos();
    if (productos.length === 0) return <SinProductos />;
    return (
      <>
        <main className="contenedor-publico flex-1 py-12 sm:py-16">
          <h1 className="mb-8 font-serif text-3xl font-semibold text-[var(--texto)] sm:text-4xl">
            Finalizar compra
          </h1>
          <CheckoutForm
            carrito={productos.map((p) => ({
              slug: p.slug,
              nombre: p.nombre,
              precio: p.precio,
              escalones: leerEscalones(p.escalones),
              stock: p.stock,
              unidad: unidadDe(p),
            }))}
            origen={origenCarrito}
          />
        </main>
        <ChatWidget />
      </>
    );
  }

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
