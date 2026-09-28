import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { preguntaFrecuenteSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";

// Crea una pregunta frecuente de /consultas.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = preguntaFrecuenteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const pregunta = await prisma.preguntaFrecuente.create({ data: parsed.data });
  await logEvent("admin", `Pregunta frecuente #${pregunta.id} creada: ${pregunta.pregunta}`);
  return NextResponse.json({ id: pregunta.id });
}
