import type { Metadata } from "next";
import ChatWidget from "@/components/ChatWidget";
import ListadoProductos from "@/components/ListadoProductos";
import SinProductos from "@/components/SinProductos";
import { getProductosActivos } from "@/lib/product";
import { cliente } from "@/plataforma/cliente";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `Productos | ${cliente.nombre}` };

export default async function ProductosPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ origen?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  const origen = Array.isArray(searchParams.origen) ? searchParams.origen[0] : searchParams.origen;
  const productos = await getProductosActivos();
  if (productos.length === 0) return <SinProductos />;

  return (
    <>
      <main className="contenedor-publico flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="titulo velo-texto">Productos</h1>
          <div className="mt-8">
            <ListadoProductos productos={productos} origen={origen} />
          </div>
        </div>
      </main>
      <ChatWidget />
    </>
  );
}
