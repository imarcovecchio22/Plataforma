import { prisma } from "@/lib/prisma";

/**
 * El producto destacado: el primero activo por orden (el de la home, $PRECIO, etc.). null si
 * todavía no hay ninguno activo (base recién creada: se carga con `npm run db:seed`, desde
 * clientes/<slug>/seed.ts).
 */
export async function getMainProduct() {
  return prisma.product.findFirst({ where: { activo: true }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
}
