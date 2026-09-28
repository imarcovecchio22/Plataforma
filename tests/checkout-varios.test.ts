import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const producto = (slug: string, cambios: Record<string, unknown> = {}) => ({
  id: `id-${slug}`, nombre: `Producto ${slug}`, slug, descripcion: "", precio: 1000, stock: 10,
  escalones: [], imagenUrl: null, activo: true, orden: 10, ...cambios,
});
const catalogo = vi.hoisted(() => ({ productos: [] as Record<string, unknown>[] }));
vi.mock("@/lib/product", () => ({
  getMainProduct: async () => catalogo.productos[0] ?? null,
  getProductosPorSlugs: async (slugs: string[]) => catalogo.productos.filter((p) => slugs.includes(p.slug as string)),
}));
const db = vi.hoisted(() => ({ order: { create: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
const logs = vi.hoisted(() => ({ logEvent: vi.fn(async (t: string, m: string, o?: unknown) => void [t, m, o]) }));
vi.mock("@/lib/logs", () => ({ ...logs, errorMessage: (e: unknown) => String(e) }));
const mp = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ getPreferenceClient: () => ({ create: mp.create }) }));

import { POST as checkout } from "@/app/api/checkout/route";

const DATOS = {
  nombre: "Ana", apellido: "Pérez", email: "ana@example.com", telefono: "1122334455", calle: "Honduras",
  numero_dir: "4800", localidad: "Palermo", provincia: "CABA", codigoPostal: "1414",
};
const comprar = (items: unknown, extra: Record<string, unknown> = {}) =>
  checkout(new NextRequest("https://x.com/api/checkout", { method: "POST", body: JSON.stringify({ ...DATOS, items, ...extra }) }));

beforeEach(() => {
  vi.clearAllMocks();
  catalogo.productos = [
    producto("miel", { precio: 6500, escalones: [{ desde: 5, precio: 6000 }] }),
    producto("propoleo", { precio: 3000, escalones: [{ desde: 3, precio: 2500 }] }),
    producto("vela", { precio: 2000, stock: 1 }),
  ];
  db.order.create.mockImplementation(async ({ data }) => ({ id: "ord", numero: 1, ...data }));
  mp.create.mockResolvedValue({ id: "pref", init_point: "https://mp/pagar" });
});

describe("checkout con varios productos (carrito)", () => {
  it("un ítem por producto, cada uno con su promo, y el total", async () => {
    const res = await comprar([{ producto: "miel", cantidad: 5 }, { producto: "propoleo", cantidad: 2 }]);
    expect(res.status).toBe(200);
    const data = db.order.create.mock.calls[0][0].data;
    expect(data.items.create).toEqual([
      { productId: "id-miel", nombre: "Producto miel", precioUnitario: 6000, cantidad: 5, subtotal: 30000 },
      { productId: "id-propoleo", nombre: "Producto propoleo", precioUnitario: 3000, cantidad: 2, subtotal: 6000 },
    ]);
    expect(data.total).toBe(36000);
    expect(mp.create.mock.calls[0][0].body.items).toEqual([
      { id: "id-miel", title: "Producto miel", quantity: 5, unit_price: 6000, currency_id: "ARS" },
      { id: "id-propoleo", title: "Producto propoleo", quantity: 2, unit_price: 3000, currency_id: "ARS" },
    ]);
  });

  it("los ítems reemplazan a producto y cantidad", async () => {
    await comprar([{ producto: "propoleo", cantidad: 3 }], { producto: "miel", cantidad: 9 });
    expect(db.order.create.mock.calls[0][0].data.items.create).toEqual([
      { productId: "id-propoleo", nombre: "Producto propoleo", precioUnitario: 2500, cantidad: 3, subtotal: 7500 },
    ]);
  });

  it("si uno ya no está a la venta, 404 sin crear el pedido", async () => {
    const res = await comprar([{ producto: "miel", cantidad: 1 }, { producto: "no-existe", cantidad: 1 }]);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Ese producto ya no está a la venta");
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it("si no alcanza el stock de uno, 400 diciendo de cuál", async () => {
    const res = await comprar([{ producto: "miel", cantidad: 1 }, { producto: "vela", cantidad: 2 }]);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No hay stock suficiente de Producto vela para esa cantidad");
    expect(logs.logEvent.mock.calls[0][1]).toBe("Compra rechazada por falta de stock de Producto vela (pidió 2, hay 1)");
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it.each([
    ["productos repetidos", [{ producto: "miel", cantidad: 1 }, { producto: "miel", cantidad: 2 }]],
    ["carrito vacío", []],
    ["cantidad 0", [{ producto: "miel", cantidad: 0 }]],
    ["cantidad con decimales", [{ producto: "miel", cantidad: 1.5 }]],
    ["más de 20 productos", Array.from({ length: 21 }, (_, i) => ({ producto: `p${i}`, cantidad: 1 }))],
  ])("rechaza %s con 400", async (_caso, items) => {
    expect((await comprar(items)).status).toBe(400);
    expect(db.order.create).not.toHaveBeenCalled();
  });
});
