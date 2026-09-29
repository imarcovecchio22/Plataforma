import { prisma } from "@/lib/prisma";
import CategoriaForm from "@/components/admin/CategoriaForm";
import CategoriaActions from "@/components/admin/CategoriaActions";
import { exigirFuncion } from "@/plataforma/cliente/catalogo";

export const dynamic = "force-dynamic";

export default async function AdminCategoriasPage() {
  exigirFuncion("categorias");
  const categorias = await prisma.categoria.findMany({
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    include: { _count: { select: { productos: true } } },
  });
  const ordenSugerido = categorias.length ? Math.max(...categorias.map((c) => c.orden)) + 10 : 10;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-oscuro">Categorías</h1>
        <p className="mt-1 text-sm text-stone-500">
          Cada producto puede estar en una (se elige en Productos). Con dos o más categorías con productos, /productos
          muestra un filtro, en este orden.
        </p>
      </div>

      <section>
        <h2 className="font-serif text-lg font-semibold text-oscuro">Categorías ({categorias.length})</h2>
        <div className="mt-3 space-y-4">
          {categorias.map((c) => (
            <article key={c.id} className="rounded-xl border border-marca-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                <span className="font-semibold text-oscuro">{c.nombre}</span>
                <span className="text-xs">/productos?categoria={c.slug}</span>
                <span className="text-xs">orden {c.orden}</span>
                <span className="text-xs">{c._count.productos === 1 ? "1 producto" : `${c._count.productos} productos`}</span>
              </div>
              <div className="mt-4">
                <CategoriaActions categoriaId={c.id} valores={{ nombre: c.nombre, slug: c.slug, orden: c.orden }} />
              </div>
            </article>
          ))}
          {categorias.length === 0 && (
            <p className="rounded-xl border border-marca-100 bg-white px-4 py-10 text-center text-stone-400">
              Todavía no hay categorías.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-oscuro">Nueva categoría</h2>
        <div className="mt-3 rounded-xl border border-marca-100 bg-white p-5 shadow-soft">
          <CategoriaForm ordenSugerido={ordenSugerido} />
        </div>
      </section>
    </div>
  );
}
