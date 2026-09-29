import ChatWidget from "@/components/ChatWidget";
import Hero from "@/components/Hero";
import HeroMarca from "@/components/HeroMarca";
import QuienesSomos from "@/components/QuienesSomos";
import ProductoSection from "@/components/ProductoSection";
import ListadoProductos from "@/components/ListadoProductos";
import SinProductos from "@/components/SinProductos";
import { getProductosActivos } from "@/lib/product";
import { leerEscalones } from "@/lib/precios";
import { cliente } from "@/plataforma/cliente";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const productos = await getProductosActivos();
  // El primero activo es el destacado (hero y sección de producto); el resto va debajo
  const [product, ...otros] = productos;
  if (!product) {
    return (
      <>
        <SinProductos />
        <ChatWidget />
      </>
    );
  }

  if (cliente.inicio === "catalogo") {
    // Home de catálogo: la marca y todos los productos
    return (
      <>
        <main className="flex-1">
          <HeroMarca />
          <section id="productos" className="contenedor-publico scroll-mt-4 pb-[clamp(56px,8vw,96px)]">
            <div className="max-w-[1100px]">
              <span className="etiqueta-seccion">Productos</span>
              <div className="mt-6">
                <ListadoProductos productos={productos} />
              </div>
            </div>
          </section>
          <QuienesSomos />
        </main>
        <ChatWidget />
      </>
    );
  }

  return (
    <>
      <main className="flex-1">
        <Hero product={product} escalones={leerEscalones(product.escalones)} />
        <QuienesSomos />
        <ProductoSection product={product} />
        {otros.length > 0 && (
          <section id="productos" className="contenedor-publico scroll-mt-4 bg-[var(--fondo-seccion)] pb-[clamp(56px,8vw,96px)]">
            <div className="max-w-[1100px]">
              <span className="etiqueta-seccion">Más productos</span>
              <div className="mt-6">
                <ListadoProductos productos={otros} />
              </div>
            </div>
          </section>
        )}
      </main>
      <ChatWidget />
    </>
  );
}
