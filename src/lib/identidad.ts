import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { cliente } from "@/plataforma/cliente";
import { identidadEfectiva } from "@/plataforma/cliente/identidad";

/**
 * La identidad que se muestra (config + lo que el dueño cambió en /admin/marca), una consulta por
 * pedido. Si la base no responde, la de la config: la tienda nunca se cae por esto.
 */
export const getIdentidad = cache(async () => {
  const fila = await prisma.identidadCliente.findUnique({ where: { id: 1 } }).catch(() => null);
  return identidadEfectiva(cliente, fila?.valores);
});
