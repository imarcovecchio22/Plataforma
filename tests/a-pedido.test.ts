import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Con la config de Rino, que usa productos a pedido
vi.mock("@cliente/config", async () => await import("../clientes/rino/config"));

const db = vi.hoisted(() => ({
  productos: new Map<string, { id: string; stock: number; aPedido: boolean }>(),
  pedido: null as Record<string, unknown> | null,
  creados: [] as Record<string, unknown>[],
}));
vi.mock("@/lib/prisma", () => {
  const order = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      db.creados.push(data);
      return { id: "ord", numero: 1, ...data };
    },
    update: async () => ({}),
    findUnique: async () => (db.pedido ? { ...db.pedido } : null),
    findUniqueOrThrow: async () => ({ ...db.pedido }),
    updateMany: async ({ data }: { data: Record<string, unknown> }) => {
      if (db.pedido!.estado === "pagado") return { count: 0 };
      Object.assign(db.pedido!, data);
      return { count: 1 };
    },
  };
  const product = {
    findUnique: async ({ where }: { where: { id: string } }) => db.productos.get(where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: { stock: { decrement: number } } }) => {
      const p = db.productos.get(where.id)!;
      p.stock -= data.stock.decrement;
      return { ...p };
    },
  };
  return { prisma: { order, product, $transaction: async (fn: (tx: unknown) => unknown) => fn({ order, product }) } };
});
const catalogo = vi.hoisted(() => ({ productos: [] as Record<string, unknown>[] }));
vi.mock("@/lib/product", () => ({
  getMainProduct: async () => catalogo.productos[0] ?? null,
  getProductosPorSlugs: async (slugs: string[]) => catalogo.productos.filter((p) => slugs.includes(p.slug as string)),
}));
vi.mock("@/lib/zonas", async () => (await import("./zonas-de-prueba")).mockZonas("ejemplo"));
const tg = vi.hoisted(() => ({ sendTelegramMessage: vi.fn(async (texto: string) => texto.length > 0) }));
vi.mock("@/lib/telegram", () => ({ ...tg, siteUrl: () => "https://3drinomaker.com.ar" }));
vi.mock("@/lib/mercadopago", () => ({ getPreferenceClient: () => ({ create: async () => ({ id: "pref", init_point: "https://mp" }) }), getPaymentClient: () => ({ get: vi.fn() }) }));
vi.mock("@/lib/logs", () => ({ logEvent: vi.fn(async () => {}), errorMessage: (e: unknown) => String(e) }));

import { POST as checkout } from "@/app/api/checkout/route";
import { applyPaymentStatusFromPayment } from "@/lib/orders";
import { DEMORA_POR_DEFECTO, demoraDe, stockParaVender, LIMITE_A_PEDIDO } from "@/plataforma/cliente/catalogo";

const producto = (slug: string, cambios: Record<string, unknown> = {}) => ({
  id: `id-${slug}`, nombre: `Pieza ${slug}`, slug, descripcion: "", precio: 2500, stock: 0, escalones: [], imagenUrl: null,
  activo: true, orden: 10, opciones: [], aPedido: false, demora: null, ...cambios,
});
const DATOS = {
  nombre: "Ana", apellido: "Pérez", email: "ana@example.com", telefono: "1122334455", calle: "Honduras",
  numero_dir: "4800", localidad: "Palermo", codigoPostal: "1414", zona: 1,
};
const comprar = (items: unknown) =>
  checkout(new NextRequest("https://x.com/api/checkout", { method: "POST", body: JSON.stringify({ ...DATOS, items }) }));

beforeEach(() => {
  vi.clearAllMocks();
  db.creados.length = 0;
  catalogo.productos = [
    producto("llavero", { aPedido: true, demora: "Se imprime en 2 a 3 días" }),
    producto("maceta", { stock: 2 }),
  ];
});

describe("productos a pedido", () => {
  it("no tienen límite de stock y muestran su demora (o la general)", () => {
    expect(stockParaVender({ stock: 0, aPedido: true })).toBe(LIMITE_A_PEDIDO);
    expect(stockParaVender({ stock: 3, aPedido: false })).toBe(3);
    expect(demoraDe({ stock: 0, aPedido: true, demora: " Se imprime en 2 días " })).toBe("Se imprime en 2 días");
    expect(demoraDe({ stock: 0, aPedido: true, demora: null })).toBe(DEMORA_POR_DEFECTO);
    expect(demoraDe({ stock: 5, aPedido: false, demora: "x" })).toBeNull();
  });

  it("se compran aunque el stock esté en 0; los demás siguen limitados por su stock", async () => {
    expect((await comprar([{ producto: "llavero", cantidad: 50 }])).status).toBe(200);
    const res = await comprar([{ producto: "llavero", cantidad: 1 }, { producto: "maceta", cantidad: 3 }]);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No hay stock suficiente de Pieza maceta para esa cantidad");
  });

  it("al pagar no descuentan stock (los demás sí) y el aviso lo dice", async () => {
    db.productos = new Map([
      ["id-llavero", { id: "id-llavero", stock: 0, aPedido: true }],
      ["id-maceta", { id: "id-maceta", stock: 2, aPedido: false }],
    ]);
    db.pedido = {
      id: "ord-1", numero: 1, estado: "pendiente", total: 7500, nombre: "Ana", apellido: "Pérez", localidad: "Palermo",
      provincia: "CABA", origen: null, costoEnvio: 0,
      items: [
        { productId: "id-llavero", nombre: "Pieza llavero", cantidad: 2, subtotal: 5000 },
        { productId: "id-maceta", nombre: "Pieza maceta", cantidad: 1, subtotal: 2500 },
      ],
    };
    await applyPaymentStatusFromPayment({ id: 9, status: "approved", external_reference: "ord-1" } as never);
    expect(db.productos.get("id-llavero")!.stock).toBe(0);
    expect(db.productos.get("id-maceta")!.stock).toBe(1);
    expect(tg.sendTelegramMessage.mock.calls[0][0]).toContain("Stock restante: Pieza llavero: a pedido, Pieza maceta: 1");
  });
});
