import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/logs";
import { esquemaIdentidad } from "@/plataforma/cliente/identidad";

const PARTES: Record<string, string> = { textos: "textos", colorMarca: "color", fondo: "fondo", imagenes: "imágenes" };

// Guarda lo que el dueño cambió de su identidad (reemplaza lo anterior: lo que no viene vuelve a
// ser lo de la config).
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = esquemaIdentidad.safeParse(body);
  if (!parsed.success) {
    const problema = parsed.error.issues[0];
    return NextResponse.json({ error: problema?.message ?? "Datos inválidos", campo: problema?.path.join(".") }, { status: 400 });
  }
  await prisma.identidadCliente.upsert({
    where: { id: 1 },
    create: { id: 1, valores: parsed.data },
    update: { valores: parsed.data },
  });
  const cambiadas = Object.keys(parsed.data).map((k) => PARTES[k] ?? k);
  await logEvent("admin", `Marca actualizada${cambiadas.length ? `: cambia ${cambiadas.join(", ")}` : ": todo como en la config"}`);
  return NextResponse.json({ ok: true });
}
