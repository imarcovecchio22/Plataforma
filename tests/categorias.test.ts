import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

// Con la config de Rino, que usa categorías
vi.mock("@cliente/config", async () => await import("../clientes/rino/config"));
vi.mock("@cliente/tema", async () => await import("@/plataforma/tema/neutro"));
vi.mock("next/font/google", () => ({}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, usePathname: () => "/", useRouter: () => ({ refresh: () => {} }) }));

const MACETAS = { nombre: "Macetas", slug: "macetas", orden: 10 };
const LLAVEROS = { nombre: "Llaveros", slug: "llaveros", orden: 20 };
const producto = (slug: string, precio: number, categoria: typeof MACETAS | null) => ({
  id: slug, nombre: slug, slug, descripcion: "", precio, stock: 5, escalones: [], imagenUrl: null, activo: true, orden: 10,
  unidadSingular: null, unidadPlural: null, unidadGenero: null, aclaracionPrecio: null, categoriaId: null, categoria,
});
const catalogo = vi.hoisted(() => ({ productos: [] as unknown[], categorias: [] as { nombre: string; slug: string }[] }));
vi.mock("@/lib/product", () => ({
  getProductosActivos: async () => catalogo.productos,
  getCategoriasConProductos: async () => catalogo.categorias,
}));
vi.mock("@/lib/zonas", async () => (await import("./zonas-de-prueba")).mockZonas("rino"));
const db = vi.hoisted(() => ({
  categoria: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
  product: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/logs", () => ({ logEvent: vi.fn(async () => {}) }));

import { Prisma } from "@prisma/client";
import { POST as crearCategoria } from "@/app/api/admin/categorias/route";
import { DELETE as borrarCategoria } from "@/app/api/admin/categorias/[id]/route";
import { POST as crearProducto } from "@/app/api/admin/productos/route";
import ProductosPage from "@/app/(publico)/productos/page";
import { textoCatalogo } from "@/lib/variables";
import { datosParaTextos } from "@/lib/datos-textos";
import { productoSchema } from "@/lib/validation";

const pedido = (url: string, method: string, body?: unknown) =>
  new NextRequest(`https://x.com${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const listado = async (categoria?: string) =>
  renderToStaticMarkup(await ProductosPage({ searchParams: Promise.resolve(categoria ? { categoria } : {}) }));

beforeEach(() => {
  vi.clearAllMocks();
  catalogo.categorias = [MACETAS, LLAVEROS];
  catalogo.productos = [producto("maceta", 8500, MACETAS), producto("llavero", 2500, LLAVEROS), producto("soporte", 6000, null)];
  db.categoria.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
  db.product.create.mockImplementation(async ({ data }) => ({ id: "nuevo", ...data }));
});

describe("categorías (config.catalogo.categorias prendida)", () => {
  it("/productos: filtro con Todas y cada categoría, y filtra por la elegida", async () => {
    const todas = await listado();
    expect(todas).toContain('href="/productos?categoria=macetas"');
    expect(todas).toContain('aria-current="page"');
    for (const slug of ["maceta", "llavero", "soporte"]) expect(todas).toContain(`href="/producto/${slug}"`);

    const macetas = await listado("macetas");
    expect(macetas).toContain("Macetas</h1>");
    expect(macetas).toContain('href="/producto/maceta"');
    expect(macetas).not.toContain('href="/producto/llavero"');
    await expect(listado("no-existe")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("con una sola categoría no hay filtro", async () => {
    catalogo.categorias = [MACETAS];
    expect(await listado()).not.toContain('aria-label="Categorías"');
  });

  it("$CATALOGO agrupa por categoría, con los que no tienen al final", async () => {
    expect((await datosParaTextos()).catalogo).toMatch(
      /^Macetas: maceta \(\$\s?8\.500\); Llaveros: llavero \(\$\s?2\.500\); Otros: soporte \(\$\s?6\.000\)$/
    );
    expect(textoCatalogo(catalogo.productos as never, false)).toMatch(/^maceta \(\$\s?8\.500\), llavero/);
  });

  it("la API crea categorías y no borra una con productos", async () => {
    expect((await crearCategoria(pedido("/api/admin/categorias", "POST", { nombre: "Macetas", slug: "macetas", orden: 10 }))).status).toBe(200);
    db.categoria.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "5" }));
    expect((await crearCategoria(pedido("/api/admin/categorias", "POST", { nombre: "Otra", slug: "macetas", orden: 10 }))).status).toBe(409);
    expect((await crearCategoria(pedido("/api/admin/categorias", "POST", { nombre: "X", slug: "Con Espacios", orden: 1 }))).status).toBe(400);

    db.categoria.findUnique.mockResolvedValue({ id: 1, nombre: "Macetas", _count: { productos: 2 } });
    const res = await borrarCategoria(pedido("/api/admin/categorias/1", "DELETE"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("tiene 2 productos");
    expect(db.categoria.delete).not.toHaveBeenCalled();
  });

  it("el producto guarda su categoría (o ninguna)", async () => {
    const base = { nombre: "Maceta", slug: "maceta", precio: 8500, stock: 3, activo: true, orden: 10 };
    expect(productoSchema.parse({ ...base, categoriaId: "2" }).categoriaId).toBe(2);
    expect(productoSchema.parse({ ...base, categoriaId: "" }).categoriaId).toBeNull();
    await crearProducto(pedido("/api/admin/productos", "POST", { ...base, categoriaId: "2" }));
    expect(db.product.create.mock.calls[0][0].data.categoriaId).toBe(2);
  });

  it("una categoría que ya no existe da 400", async () => {
    db.product.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "5" }));
    const res = await crearProducto(pedido("/api/admin/productos", "POST", { nombre: "M", slug: "m", precio: 1, stock: 0, activo: true, orden: 1, categoriaId: 99 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Esa categoría ya no existe");
  });
});
