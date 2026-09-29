import type { Product } from "@prisma/client";
import { logEvent } from "@/lib/logs";
import { formatPrecio } from "@/lib/utils";
import { leerEscalones, textoPromos } from "@/lib/precios";
import { unidadDe } from "@/plataforma/cliente";
import { funcionActiva } from "@/plataforma/cliente/catalogo";
import { leerOpciones } from "@/lib/opciones";

const textoDeOpciones = (opciones: unknown) => leerOpciones(opciones).map((o) => `${o.nombre}: ${o.valores.join(", ")}`).join(" · ");

/**
 * Lo que se guarda de un producto: los campos de las funciones del catálogo que el cliente no usa
 * no se tocan (si apagó las categorías, sus productos conservan la que tenían).
 */
export function datosDeProducto<T extends object>(datos: T): T {
  const resto = { ...datos } as Record<string, unknown>;
  if (!funcionActiva("categorias")) delete resto.categoriaId;
  if (!funcionActiva("opciones")) delete resto.opciones;
  return resto as T;
}

/** El error de Prisma cuando la categoría elegida no existe (se borró mientras se editaba). */
export const CATEGORIA_INEXISTENTE = "Esa categoría ya no existe";

/** Registra en /admin/logs lo que cambió de un producto (mismos textos que el viejo "Precio y stock"). */
export async function registrarCambiosDeProducto(anterior: Product, producto: Product) {
  if (producto.stock !== anterior.stock) {
    await logEvent("admin", `Stock de ${producto.nombre} cambiado a ${producto.stock}`);
  }
  if (producto.precio !== anterior.precio) {
    await logEvent("admin", `Precio de ${producto.nombre} cambiado de ${formatPrecio(anterior.precio)} a ${formatPrecio(producto.precio)}`);
  }
  if (JSON.stringify(anterior.escalones) !== JSON.stringify(producto.escalones)) {
    await logEvent("admin", `Promos de ${producto.nombre}: ${textoPromos(leerEscalones(producto.escalones), unidadDe(producto)) || "sin promos"}`);
  }
  if (producto.activo !== anterior.activo) {
    await logEvent("admin", `Producto ${producto.nombre} ${producto.activo ? "activado" : "desactivado"}`);
  }
  if (JSON.stringify(anterior.opciones) !== JSON.stringify(producto.opciones)) {
    await logEvent("admin", `Opciones de ${producto.nombre}: ${textoDeOpciones(producto.opciones) || "sin opciones"}`);
  }
  const otros = (["nombre", "slug", "descripcion", "imagenUrl", "orden", "unidadSingular", "unidadPlural", "unidadGenero", "aclaracionPrecio", "categoriaId"] as const).filter((c) => producto[c] !== anterior[c]);
  if (otros.length) {
    await logEvent("admin", `Producto ${producto.nombre} editado: ${otros.join(", ")}`);
  }
}
