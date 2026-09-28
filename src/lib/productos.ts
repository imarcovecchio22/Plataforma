import type { Product } from "@prisma/client";
import { logEvent } from "@/lib/logs";
import { formatPrecio } from "@/lib/utils";
import { leerEscalones, textoPromos } from "@/lib/precios";

/** Registra en /admin/logs lo que cambió de un producto (mismos textos que el viejo "Precio y stock"). */
export async function registrarCambiosDeProducto(anterior: Product, producto: Product) {
  if (producto.stock !== anterior.stock) {
    await logEvent("admin", `Stock de ${producto.nombre} cambiado a ${producto.stock}`);
  }
  if (producto.precio !== anterior.precio) {
    await logEvent("admin", `Precio de ${producto.nombre} cambiado de ${formatPrecio(anterior.precio)} a ${formatPrecio(producto.precio)}`);
  }
  if (JSON.stringify(anterior.escalones) !== JSON.stringify(producto.escalones)) {
    await logEvent("admin", `Promos de ${producto.nombre}: ${textoPromos(leerEscalones(producto.escalones)) || "sin promos"}`);
  }
  if (producto.activo !== anterior.activo) {
    await logEvent("admin", `Producto ${producto.nombre} ${producto.activo ? "activado" : "desactivado"}`);
  }
  const otros = (["nombre", "slug", "descripcion", "imagenUrl", "orden"] as const).filter((c) => producto[c] !== anterior[c]);
  if (otros.length) {
    await logEvent("admin", `Producto ${producto.nombre} editado: ${otros.join(", ")}`);
  }
}
