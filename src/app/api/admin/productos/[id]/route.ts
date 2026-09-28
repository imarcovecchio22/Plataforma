import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { productoSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";
import { registrarCambiosDeProducto } from "@/lib/productos";

type Contexto = { params: Promise<{ id: string }> };

const soloActivoSchema = z.object({ activo: z.boolean() });

// Edita un producto completo, o solo lo activa/desactiva si el body es { activo }.
export async function PATCH(req: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const soloActivo = body && Object.keys(body).length === 1 ? soloActivoSchema.safeParse(body) : null;
  const parsed = soloActivo?.success ? soloActivo : productoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const anterior = await prisma.product.findUnique({ where: { id } });
  if (!anterior) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  try {
    const producto = await prisma.product.update({ where: { id }, data: parsed.data });
    await registrarCambiosDeProducto(anterior, producto);
    return NextResponse.json(producto);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya hay un producto con ese slug" }, { status: 409 });
    }
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
}

// Borra un producto que nunca se vendió; si tiene pedidos, hay que desactivarlo.
export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const producto = await prisma.product.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
  if (!producto) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  if (producto._count.orders > 0) {
    return NextResponse.json(
      { error: "Este producto tiene pedidos: no se puede borrar. Desactivalo para que no se muestre en la tienda." },
      { status: 409 }
    );
  }
  await prisma.product.delete({ where: { id } });
  await logEvent("admin", `Producto borrado: ${producto.nombre}`);
  return NextResponse.json({ ok: true });
}
