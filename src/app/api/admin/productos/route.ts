import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productoSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";

// Crea un producto.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = productoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  try {
    const producto = await prisma.product.create({ data: parsed.data });
    await logEvent("admin", `Producto creado: ${producto.nombre}`, { detalle: { slug: producto.slug, precio: producto.precio } });
    return NextResponse.json({ id: producto.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya hay un producto con ese slug" }, { status: 409 });
    }
    throw error;
  }
}
