import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Con Melera (config por defecto de los tests), que no usa categorías
const db = vi.hoisted(() => ({ categoria: { create: vi.fn() }, product: { create: vi.fn(async ({ data }) => ({ id: "p", ...data })) } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/logs", () => ({ logEvent: vi.fn(async () => {}) }));

import { POST as crearCategoria } from "@/app/api/admin/categorias/route";
import { POST as crearProducto } from "@/app/api/admin/productos/route";
import { funcionActiva } from "@/plataforma/cliente/catalogo";

const pedido = (url: string, body: unknown) => new NextRequest(`https://x.com${url}`, { method: "POST", body: JSON.stringify(body) });

describe("categorías apagadas (Melera)", () => {
  it("la función está apagada y su API responde 404", async () => {
    expect(funcionActiva("categorias")).toBe(false);
    expect((await crearCategoria(pedido("/api/admin/categorias", { nombre: "X", slug: "x", orden: 1 }))).status).toBe(404);
    expect(db.categoria.create).not.toHaveBeenCalled();
  });

  it("un producto no toca la categoría aunque llegue en el pedido", async () => {
    await crearProducto(pedido("/api/admin/productos", { nombre: "Miel", slug: "miel", precio: 6500, stock: 3, activo: true, orden: 10, categoriaId: 5 }));
    expect(db.product.create.mock.calls[0][0].data).not.toHaveProperty("categoriaId");
  });
});
