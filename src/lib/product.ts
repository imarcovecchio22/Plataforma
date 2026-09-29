import { prisma } from "@/lib/prisma";

/**
 * El producto destacado: el primero activo por orden (el de la home, $PRECIO, etc.). null si
 * todavía no hay ninguno activo (base recién creada: se carga con `npm run db:seed`, desde
 * clientes/<slug>/seed.ts).
 */
export async function getMainProduct() {
  return prisma.product.findFirst({ where: { activo: true }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
}

/** Los productos que se muestran en la tienda: activos, por orden (con su categoría, si tienen). */
export async function getProductosActivos() {
  return prisma.product.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: { categoria: { select: { nombre: true, slug: true, orden: true } } },
  });
}

/** Las categorías que tienen algún producto activo, por orden (para el filtro de /productos). */
export async function getCategoriasConProductos() {
  return prisma.categoria.findMany({
    where: { productos: { some: { activo: true } } },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    select: { nombre: true, slug: true },
  });
}

/** Un producto activo por su slug (null si no existe o está inactivo). */
export async function getProductoPorSlug(slug: string) {
  return prisma.product.findFirst({ where: { slug, activo: true } });
}

/** Los productos activos con esos slugs (los que no existen o están inactivos no vienen). */
export async function getProductosPorSlugs(slugs: string[]) {
  return prisma.product.findMany({ where: { slug: { in: slugs }, activo: true } });
}

/** Cuántos productos hay a la venta (con más de uno, la tienda usa el carrito). */
export async function contarProductosActivos() {
  return prisma.product.count({ where: { activo: true } });
}
