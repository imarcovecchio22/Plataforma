import ChatWidget from "@/components/ChatWidget";
import CheckoutForm from "@/components/CheckoutForm";
import SinProductos from "@/components/SinProductos";
import { notFound } from "next/navigation";
import { getMainProduct, getProductoPorSlug, getProductosActivos } from "@/lib/product";
import { getZonasActivas } from "@/lib/zonas";
import { leerEscalones } from "@/lib/precios";
import { unidadDe } from "@/plataforma/cliente";
import { demoraDe, opcionesDe, stockParaVender } from "@/plataforma/cliente/catalogo";
import { limpiarEleccion, validarEleccion } from "@/lib/opciones";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ producto?: string; cantidad?: string; carrito?: string; opciones?: string; origen?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  const origenCarrito = Array.isArray(searchParams.origen) ? searchParams.origen[0] : searchParams.origen;
  const zonas = await getZonasActivas();

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
              stock: stockParaVender(p),
              unidad: unidadDe(p),
              opciones: opcionesDe(p),
              demora: demoraDe(p),
            }))}
            zonas={zonas}
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
  // Lo elegido en la ficha (?opciones={"Color":"Rojo"}); si no cierra con el producto, se ignora
  // y el checkout avisa qué falta elegir
  const opciones = opcionesDe(product);
  const eleccion = opciones.length ? leerEleccionDeUrl(searchParams.opciones) : {};
  const validada = opciones.length ? validarEleccion(opciones, eleccion, product.nombre) : null;
  const cantidadInicial = Math.max(
    1,
    Math.min(stockParaVender(product) || 1, Number(searchParams.cantidad) || 1)
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
            demora: demoraDe(product),
            ...(validada ? { opciones: eleccion, elegidas: "elegidas" in validada ? validada.elegidas : [] } : {}),
          }}
          cantidadInicial={cantidadInicial}
          zonas={zonas}
          origen={origen}
        />
      </main>
      <ChatWidget />
    </>
  );
}

/** ?opciones={"Color":"Rojo"} (lo arma la ficha); cualquier otra cosa, sin elección. */
function leerEleccionDeUrl(valor?: string) {
  try {
    return limpiarEleccion(valor ? JSON.parse(valor) : {});
  } catch {
    return {};
  }
}
