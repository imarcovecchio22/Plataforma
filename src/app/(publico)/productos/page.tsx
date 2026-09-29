import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChatWidget from "@/components/ChatWidget";
import ListadoProductos from "@/components/ListadoProductos";
import SinProductos from "@/components/SinProductos";
import { getCategoriasConProductos, getProductosActivos } from "@/lib/product";
import { cliente } from "@/plataforma/cliente";
import { funcionActiva } from "@/plataforma/cliente/catalogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `Productos | ${cliente.nombre}` };

const primero = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function ProductosPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ origen?: string | string[]; categoria?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  const origen = primero(searchParams.origen);
  const [productos, categorias] = await Promise.all([
    getProductosActivos(),
    funcionActiva("categorias") ? getCategoriasConProductos() : [],
  ]);
  if (productos.length === 0) return <SinProductos />;

  // Filtro por categoría: solo con dos o más categorías con productos
  const conFiltro = categorias.length >= 2;
  const slug = conFiltro ? primero(searchParams.categoria) : undefined;
  const elegida = slug ? categorias.find((c) => c.slug === slug) : undefined;
  if (slug && !elegida) notFound();
  const visibles = elegida ? productos.filter((p) => p.categoria?.slug === elegida.slug) : productos;
  const hrefDe = (categoria?: string) => {
    const params = new URLSearchParams({ ...(categoria ? { categoria } : {}), ...(origen ? { origen } : {}) }).toString();
    return `/productos${params ? `?${params}` : ""}`;
  };

  return (
    <>
      <main className="contenedor-publico flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="titulo velo-texto">{elegida ? elegida.nombre : "Productos"}</h1>
          {conFiltro && (
            <nav aria-label="Categorías" className="mt-6 flex flex-wrap gap-2">
              {[{ nombre: "Todas", slug: undefined }, ...categorias].map((c) => {
                const activa = c.slug === elegida?.slug;
                return (
                  <Link
                    key={c.slug ?? "todas"}
                    href={hrefDe(c.slug)}
                    aria-current={activa ? "page" : undefined}
                    // La elegida con el botón del tema; las demás, con borde
                    className={
                      activa
                        ? "btn btn-sm"
                        : "inline-flex min-h-[40px] items-center rounded-full border border-[var(--linea-suave)] px-4 text-sm font-medium text-[var(--texto-suave)] transition hover:border-[var(--acento)] hover:text-[var(--texto)]"
                    }
                  >
                    {c.nombre}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="mt-8">
            <ListadoProductos productos={visibles} origen={origen} />
          </div>
        </div>
      </main>
      <ChatWidget />
    </>
  );
}
