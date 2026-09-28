import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { zonaEnvioSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";

// Crea una zona de envío del checkout.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = zonaEnvioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const zona = await prisma.zonaEnvio.create({ data: parsed.data });
  await logEvent("admin", `Zona de envío #${zona.id} creada: ${zona.nombre}`, { detalle: { costo: zona.costo } });
  return NextResponse.json({ id: zona.id });
}
