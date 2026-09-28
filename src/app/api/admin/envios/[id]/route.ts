import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { zonaEnvioSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logs";

type Contexto = { params: Promise<{ id: string }> };

const soloActivaSchema = z.object({ activa: z.boolean() });

// Edita una zona completa, o solo la activa/desactiva si el body es { activa }.
export async function PATCH(req: NextRequest, { params }: Contexto) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const soloActiva = body && Object.keys(body).length === 1 ? soloActivaSchema.safeParse(body) : null;
  const parsed = soloActiva?.success ? soloActiva : zonaEnvioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const zona = await prisma.zonaEnvio.update({ where: { id }, data: parsed.data });
    const accion = soloActiva?.success ? (zona.activa ? "activada" : "desactivada") : "editada";
    await logEvent("admin", `Zona de envío #${zona.id} ${accion}: ${zona.nombre}`, { detalle: { costo: zona.costo } });
    return NextResponse.json({ id: zona.id });
  } catch {
    return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
  }
}

// Los pedidos hechos con la zona la conservan por nombre (Order.provincia) y su costo (Order.costoEnvio).
export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const zona = await prisma.zonaEnvio.delete({ where: { id } });
    await logEvent("admin", `Zona de envío #${zona.id} borrada: ${zona.nombre}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
  }
}
