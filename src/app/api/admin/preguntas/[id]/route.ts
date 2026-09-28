import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { preguntaFrecuenteSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";

type Contexto = { params: Promise<{ id: string }> };

const soloActivaSchema = z.object({ activa: z.boolean() });

// Edita una pregunta completa, o solo la muestra/oculta si el body es { activa }.
export async function PATCH(req: NextRequest, { params }: Contexto) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const soloActiva = body && Object.keys(body).length === 1 ? soloActivaSchema.safeParse(body) : null;
  const parsed = soloActiva?.success ? soloActiva : preguntaFrecuenteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const pregunta = await prisma.preguntaFrecuente.update({ where: { id }, data: parsed.data });
    const accion = soloActiva?.success ? (pregunta.activa ? "visible" : "oculta") : "editada";
    await logEvent("admin", `Pregunta frecuente #${pregunta.id} ${accion}: ${pregunta.pregunta}`);
    return NextResponse.json({ id: pregunta.id });
  } catch {
    return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const pregunta = await prisma.preguntaFrecuente.delete({ where: { id } });
    await logEvent("admin", `Pregunta frecuente #${pregunta.id} borrada: ${pregunta.pregunta}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });
  }
}
