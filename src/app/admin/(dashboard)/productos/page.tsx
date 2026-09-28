import { prisma } from "@/lib/prisma";
import { formatPrecio } from "@/lib/utils";
import { leerEscalones, textoPromos } from "@/lib/precios";
import ProductoForm from "@/components/admin/ProductoForm";
import ProductoActions from "@/components/admin/ProductoActions";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const productos = await prisma.product.findMany({
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { orders: true } } },
  });
  const destacado = productos.find((p) => p.activo);
  const ordenSugerido = productos.length ? Math.max(...productos.map((p) => p.orden)) + 10 : 10;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-oscuro">Productos</h1>
        <p className="mt-1 text-sm text-stone-500">
          Los activos se muestran en la tienda de menor a mayor orden; el primero es el destacado de la home y el de
          $PRECIO en el chat, las respuestas automáticas y las preguntas frecuentes.
        </p>
      </div>

      <section className="space-y-4">
        {productos.map((p) => {
          const promos = textoPromos(leerEscalones(p.escalones));
          return (
            <article key={p.id} className={`rounded-xl border bg-white p-5 shadow-soft ${p.activo ? "border-marca-100" : "border-stone-200 opacity-80"}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                <span className="font-semibold text-oscuro">{p.nombre}</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${p.activo ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                  {p.activo ? "Activo" : "Inactivo"}
                </span>
                {p.id === destacado?.id && <span className="rounded-full bg-marca-50 px-2 py-0.5 text-xs text-marca-800">Destacado</span>}
                <span className="text-xs">/producto/{p.slug}</span>
                <span className="text-xs">orden {p.orden}</span>
              </div>
              <p className="mt-2 text-sm text-stone-700">
                <strong>{formatPrecio(p.precio)}</strong> · {p.stock} en stock · {p._count.orders} pedidos
                {promos && <> · Promos: {promos}</>}
              </p>
              <div className="mt-4">
                <ProductoActions
                  productoId={p.id}
                  valores={{
                    nombre: p.nombre,
                    slug: p.slug,
                    descripcion: p.descripcion,
                    precio: p.precio,
                    stock: p.stock,
                    escalones: leerEscalones(p.escalones),
                    imagenUrl: p.imagenUrl ?? "",
                    activo: p.activo,
                    orden: p.orden,
                  }}
                />
              </div>
            </article>
          );
        })}
        {productos.length === 0 && (
          <p className="rounded-xl border border-marca-100 bg-white px-4 py-10 text-center text-stone-500">
            Todavía no hay productos. Creá el primero acá abajo, o cargá los del seed con <code>npm run db:seed</code>.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-oscuro">Nuevo producto</h2>
        <div className="mt-3 rounded-xl border border-marca-100 bg-white p-5 shadow-soft">
          <ProductoForm ordenSugerido={ordenSugerido} />
        </div>
      </section>
    </div>
  );
}
