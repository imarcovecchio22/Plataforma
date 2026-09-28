import { prisma } from "@/lib/prisma";
import type { PostIGInput } from "@/lib/validation";

/**
 * Lo que se guarda de un post al crearlo o editarlo. Producto y promo pueden llevar un producto
 * del catálogo (sus datos salen de él al generar); un post de producto sin producto del catálogo
 * lleva sus datos cargados a mano. Error si el producto elegido ya no existe.
 */
export async function datosDelPost(d: PostIGInput) {
  const productoId = (d.tipo === "producto" || d.tipo === "promo") && d.productoId ? d.productoId : null;
  if (productoId && !(await prisma.product.findUnique({ where: { id: productoId }, select: { id: true } }))) {
    return { error: "Ese producto ya no existe" } as const;
  }
  const aMano = d.tipo === "producto" && !productoId;
  return {
    data: {
      fecha: new Date(`${d.fecha}T00:00:00.000Z`),
      tipo: d.tipo,
      estilo: d.estilo,
      tema: d.tema,
      productoId,
      nombreProducto: aMano ? d.nombreProducto : null,
      // Categoría y presentación no están en el producto: se cargan a mano en los dos casos
      categoria: d.tipo === "producto" ? d.categoria || null : null,
      precio: aMano ? d.precio : null,
      presentacion: d.tipo === "producto" ? d.presentacion || null : null,
      imagenUrl: aMano ? d.imagenUrl : null,
    },
  } as const;
}
