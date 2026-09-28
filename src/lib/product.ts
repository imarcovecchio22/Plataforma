import { prisma } from "@/lib/prisma";

/**
 * Por ahora la tienda vende un solo producto: el primero. null si todavía no hay ninguno (base
 * recién creada: se carga con `npm run db:seed`, desde clientes/<slug>/seed.ts).
 */
export async function getMainProduct() {
  return prisma.product.findFirst({ orderBy: { createdAt: "asc" } });
}
