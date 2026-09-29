import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { categoriaSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";
import { funcionActiva } from "@/plataforma/cliente/catalogo";

// Crea una categoría del catálogo (solo si el cliente usa categorías).
export async function POST(req: NextRequest) {
  if (!funcionActiva("categorias")) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = categoriaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const categoria = await prisma.categoria.create({ data: parsed.data });
    await logEvent("admin", `Categoría #${categoria.id} creada: ${categoria.nombre}`);
    return NextResponse.json({ id: categoria.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya hay una categoría con ese slug" }, { status: 409 });
    }
    throw error;
  }
}
