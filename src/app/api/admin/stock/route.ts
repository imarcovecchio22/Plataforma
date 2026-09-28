import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logEvent } from "@/lib/logs";
import { formatPrecio } from "@/lib/utils";
import { errorEscalones, leerEscalones, textoPromos } from "@/lib/precios";

const updateSchema = z.object({
  productId: z.string().min(1),
  stock: z.coerce.number().int().min(0),
  // Precio de una unidad en pesos (se usa en la tienda, en /consultas, en el chat y en las respuestas de Instagram)
  precio: z.coerce.number().int("El precio va sin centavos").min(1, "El precio tiene que ser mayor a 0").max(10_000_000).optional(),
  // Promos por cantidad: precio por unidad desde cierta cantidad (hasta 3)
  escalones: z
    .array(z.object({ desde: z.coerce.number().int().min(2).max(1000), precio: z.coerce.number().int().min(1).max(10_000_000) }))
    .max(3, "Hasta 3 promos")
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { productId, stock, precio, escalones } = parsed.data;
  const anterior = await prisma.product.findUnique({ where: { id: productId } });
  if (!anterior) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  if (escalones) {
    const error = errorEscalones(precio ?? anterior.precio, escalones);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        stock,
        ...(precio !== undefined ? { precio } : {}),
        ...(escalones ? { escalones: [...escalones].sort((a, b) => a.desde - b.desde) } : {}),
      },
    });
    if (product.stock !== anterior.stock) {
      await logEvent("admin", `Stock de ${product.nombre} cambiado a ${product.stock}`);
    }
    if (product.precio !== anterior.precio) {
      await logEvent("admin", `Precio de ${product.nombre} cambiado de ${formatPrecio(anterior.precio)} a ${formatPrecio(product.precio)}`);
    }
    if (escalones && JSON.stringify(anterior.escalones) !== JSON.stringify(product.escalones)) {
      await logEvent("admin", `Promos de ${product.nombre}: ${textoPromos(leerEscalones(product.escalones)) || "sin promos"}`);
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
}
