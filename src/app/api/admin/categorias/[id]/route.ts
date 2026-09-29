import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { categoriaSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";
import { funcionActiva } from "@/plataforma/cliente/catalogo";

type Contexto = { params: Promise<{ id: string }> };

const noEncontrado = () => NextResponse.json({ error: "No encontrado" }, { status: 404 });

// Edita una categoría.
export async function PATCH(req: NextRequest, { params }: Contexto) {
  if (!funcionActiva("categorias")) return noEncontrado();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const parsed = categoriaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  try {
    const categoria = await prisma.categoria.update({ where: { id }, data: parsed.data });
    await logEvent("admin", `Categoría #${categoria.id} editada: ${categoria.nombre}`);
    return NextResponse.json({ id: categoria.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya hay una categoría con ese slug" }, { status: 409 });
    }
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }
}

// Borra una categoría sin productos (si tiene, primero hay que moverlos a otra o dejarlos sin categoría).
export async function DELETE(_req: NextRequest, { params }: Contexto) {
  if (!funcionActiva("categorias")) return noEncontrado();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const categoria = await prisma.categoria.findUnique({ where: { id }, include: { _count: { select: { productos: true } } } });
  if (!categoria) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  if (categoria._count.productos > 0) {
    const n = categoria._count.productos;
    return NextResponse.json(
      { error: `Esta categoría tiene ${n === 1 ? "1 producto" : `${n} productos`}: pasalos a otra (o dejalos sin categoría) antes de borrarla.` },
      { status: 409 }
    );
  }
  await prisma.categoria.delete({ where: { id } });
  await logEvent("admin", `Categoría #${categoria.id} borrada: ${categoria.nombre}`);
  return NextResponse.json({ ok: true });
}
