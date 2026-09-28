import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postIGSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";
import { datosDelPost } from "@/lib/instagram/posts";

// Crea un post nuevo en el cronograma (queda "pendiente").
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = postIGSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const datos = await datosDelPost(d);
  if ("error" in datos) return NextResponse.json({ error: datos.error }, { status: 400 });
  const post = await prisma.postIG.create({ data: datos.data });

  await logEvent("admin", `Post de Instagram #${post.id} creado para el ${d.fecha}`, {
    detalle: { tipo: d.tipo, estilo: d.estilo },
  });
  return NextResponse.json({ id: post.id });
}
