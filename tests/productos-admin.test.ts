import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const db = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: db } }));
const logs = vi.hoisted(() => ({ logEvent: vi.fn(async (tipo: string, mensaje: string, op?: unknown) => void [tipo, mensaje, op]) }));
vi.mock("@/lib/logs", () => logs);

import { POST as crear } from "@/app/api/admin/productos/route";
import { DELETE as borrar, PATCH as editar } from "@/app/api/admin/productos/[id]/route";
import { productoSchema } from "@/lib/validation";
import { slugDe } from "@/lib/slug";

const MIEL = {
  id: "p1", nombre: "Miel", slug: "miel", descripcion: "", precio: 6500, stock: 10, escalones: [],
  imagenUrl: null, activo: true, orden: 10,
};
const valores = (cambios: Record<string, unknown> = {}) => ({
  nombre: "Miel", slug: "miel", descripcion: "", precio: 6500, stock: 10, escalones: [], imagenUrl: "", activo: true, orden: 10,
  ...cambios,
});
const pedido = (method: string, body?: unknown) =>
  new NextRequest("https://melera.vercel.app/api/admin/productos", { method, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id = "p1") => ({ params: Promise.resolve({ id }) });
const mensajes = () => logs.logEvent.mock.calls.map((c) => c[1]);

beforeEach(() => {
  vi.clearAllMocks();
  db.findUnique.mockResolvedValue({ ...MIEL, _count: { items: 0 } });
  db.update.mockImplementation(async ({ data }) => ({ ...MIEL, ...data }));
  db.create.mockImplementation(async ({ data }) => ({ id: "nuevo", ...data }));
});

describe("editar un producto (lo que antes era Precio y stock)", () => {
  it("guarda precio y stock y registra solo lo que cambió", async () => {
    const res = await editar(pedido("PATCH", valores({ precio: 7200 })), ctx());
    expect(res.status).toBe(200);
    expect(db.update.mock.calls[0][0].data).toMatchObject({ stock: 10, precio: 7200 });
    expect(mensajes()).toHaveLength(1);
    expect(mensajes()[0]).toMatch(/Precio de Miel cambiado de .*6\.500 a .*7\.200/);
  });

  it("guarda las promos por cantidad ordenadas y las registra", async () => {
    const res = await editar(pedido("PATCH", valores({ escalones: [{ desde: 10, precio: 5500 }, { desde: 5, precio: 6000 }] })), ctx());
    expect(res.status).toBe(200);
    expect(db.update.mock.calls[0][0].data.escalones).toEqual([{ desde: 5, precio: 6000 }, { desde: 10, precio: 5500 }]);
    expect(mensajes().some((m) => /Promos de Miel: 5 frascos a .*30\.000 · 10 frascos a .*55\.000/.test(m))).toBe(true);
  });

  it("rechaza promos que no bajan el precio o repiten cantidad", async () => {
    for (const escalones of [
      [{ desde: 5, precio: 7000 }], // más cara que el precio base
      [{ desde: 5, precio: 6000 }, { desde: 10, precio: 6200 }], // la de 10 más cara que la de 5
      [{ desde: 5, precio: 6000 }, { desde: 5, precio: 5500 }], // cantidad repetida
      [{ desde: 1, precio: 6000 }], // desde 1 unidad no es promo
    ]) {
      const res = await editar(pedido("PATCH", valores({ escalones })), ctx());
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBeTruthy();
    }
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rechaza precios inválidos con un mensaje claro", async () => {
    for (const precio of [0, -5, 12.5, "abc"]) {
      const res = await editar(pedido("PATCH", valores({ precio })), ctx());
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBeTruthy();
    }
    expect(db.update).not.toHaveBeenCalled();
  });

  it("{ activo } solo lo activa o desactiva, y lo registra", async () => {
    const res = await editar(pedido("PATCH", { activo: false }), ctx());
    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { activo: false } });
    expect(mensajes()).toEqual(["Producto Miel desactivado"]);
  });

  it("registra los otros campos editados", async () => {
    await editar(pedido("PATCH", valores({ descripcion: "Nueva", orden: 5 })), ctx());
    expect(mensajes()).toEqual(["Producto Miel editado: descripcion, orden"]);
  });

  it("un producto que no existe responde 404", async () => {
    db.findUnique.mockResolvedValue(null);
    expect((await editar(pedido("PATCH", valores()), ctx("x"))).status).toBe(404);
  });

  it("un slug repetido responde 409", async () => {
    db.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("único", { code: "P2002", clientVersion: "5" }));
    const res = await editar(pedido("PATCH", valores({ slug: "otro" })), ctx());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Ya hay un producto con ese slug");
  });
});

describe("crear y borrar", () => {
  it("crea un producto y lo registra", async () => {
    const res = await crear(pedido("POST", valores({ nombre: "Maceta", slug: "maceta", imagenUrl: "https://x.com/m.png" })));
    expect(res.status).toBe(200);
    expect(db.create.mock.calls[0][0].data).toMatchObject({ nombre: "Maceta", slug: "maceta", imagenUrl: "https://x.com/m.png" });
    expect(mensajes()).toEqual(["Producto creado: Maceta"]);
  });

  it("sin foto guarda null (se usa la de la marca)", async () => {
    await crear(pedido("POST", valores({ slug: "maceta" })));
    expect(db.create.mock.calls[0][0].data.imagenUrl).toBeNull();
  });

  it("rechaza una foto que no es un link https público", async () => {
    for (const imagenUrl of ["http://x.com/a.png", "https://localhost/a.png", "no es un link"]) {
      expect((await crear(pedido("POST", valores({ imagenUrl })))).status).toBe(400);
    }
    expect(db.create).not.toHaveBeenCalled();
  });

  it("borra un producto sin pedidos", async () => {
    const res = await borrar(pedido("DELETE"), ctx());
    expect(res.status).toBe(200);
    expect(db.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("no borra un producto con pedidos (hay que desactivarlo)", async () => {
    db.findUnique.mockResolvedValue({ ...MIEL, _count: { items: 3 } });
    const res = await borrar(pedido("DELETE"), ctx());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Desactivalo/);
    expect(db.delete).not.toHaveBeenCalled();
  });
});

describe("validación y slug", () => {
  it.each(["Miel", "miel_500", "miel--500", "-miel", "Miel 500"])("rechaza el slug %j", (slug) => {
    expect(productoSchema.safeParse(valores({ slug })).success).toBe(false);
  });

  it.each([
    ["Miel Artesanal 500g", "miel-artesanal-500g"],
    ["Ñandú Rojo — edición 3D!", "nandu-rojo-edicion-3d"],
    ["¿¿??", "producto"],
    ["  Maceta  Geométrica  ", "maceta-geometrica"],
  ])("slugDe(%j) = %s (igual que la migración)", (nombre, slug) => {
    expect(slugDe(nombre)).toBe(slug);
  });
});
