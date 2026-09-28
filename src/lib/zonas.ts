import { prisma } from "@/lib/prisma";
import type { ZonaParaCheckout } from "@/lib/envios";

/** Las zonas que el comprador puede elegir: activas, por orden. */
export async function getZonasActivas(): Promise<ZonaParaCheckout[]> {
  return prisma.zonaEnvio.findMany({
    where: { activa: true },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    select: { id: true, nombre: true, costo: true, aclaracion: true, detalleResumen: true },
  });
}
