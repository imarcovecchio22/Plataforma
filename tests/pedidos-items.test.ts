import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Un pedido con dos productos distintos
const db = vi.hoisted(() => ({
  pedido: null as Record<string, unknown> | null,
  stock: new Map<string, number>(),
}));
vi.mock("@/lib/prisma", () => {
  const order = {
    findUnique: async () => (db.pedido ? { ...db.pedido } : null),
    findUniqueOrThrow: async () => ({ ...db.pedido }),
    updateMany: async ({ data }: { data: Record<string, unknown> }) => {
      if (db.pedido!.estado === "pagado") return { count: 0 };
      Object.assign(db.pedido!, data);
      return { count: 1 };
    },
  };
  const product = {
    update: async ({ where, data }: { where: { id: string }; data: { stock: { decrement: number } } }) => {
      db.stock.set(where.id, db.stock.get(where.id)! - data.stock.decrement);
      return { id: where.id, stock: db.stock.get(where.id) };
    },
  };
  return { prisma: { order, product, $transaction: async (fn: (tx: unknown) => unknown) => fn({ order, product }) } };
});
const tg = vi.hoisted(() => ({ sendTelegramMessage: vi.fn(async (texto: string) => texto.length > 0) }));
vi.mock("@/lib/telegram", () => ({ ...tg, siteUrl: () => "https://melera.vercel.app" }));
vi.mock("@/lib/mercadopago", () => ({ getPaymentClient: () => ({ get: vi.fn() }) }));
vi.mock("@/lib/logs", () => ({ logEvent: vi.fn(async () => {}), errorMessage: (e: unknown) => String(e) }));
vi.mock("@/lib/auth", () => ({ getSession: async () => ({ usuario: "admin" }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, useRouter: () => ({ refresh: () => {} }) }));

import { applyPaymentStatusFromPayment } from "@/lib/orders";

const ITEMS = [
  { id: "i1", productId: "miel", nombre: "Miel 500g", precioUnitario: 6000, cantidad: 5, subtotal: 30000 },
  { id: "i2", productId: "propoleo", nombre: "Propóleo", precioUnitario: 3000, cantidad: 2, subtotal: 6000 },
];

beforeEach(() => {
  vi.clearAllMocks();
  db.stock = new Map([["miel", 50], ["propoleo", 10]]);
  db.pedido = {
    id: "ord-9", numero: 9, estado: "pendiente", total: 36000, nombre: "Ana", apellido: "Pérez",
    localidad: "Palermo", provincia: "CABA", origen: null, items: ITEMS,
  };
});

describe("pago de un pedido con varios productos", () => {
  it("descuenta el stock de cada producto una sola vez", async () => {
    await applyPaymentStatusFromPayment({ id: 1, status: "approved", external_reference: "ord-9" } as never);
    await applyPaymentStatusFromPayment({ id: 1, status: "approved", external_reference: "ord-9" } as never);
    expect(db.stock.get("miel")).toBe(45);
    expect(db.stock.get("propoleo")).toBe(8);
  });

  it("el aviso de Telegram lista cada ítem, el total y el stock de cada uno", async () => {
    await applyPaymentStatusFromPayment({ id: 1, status: "approved", external_reference: "ord-9" } as never);
    const texto = tg.sendTelegramMessage.mock.calls[0][0].split("\n");
    expect(texto[0]).toBe("🛒 Pedido #9 pagado");
    expect(texto[2]).toMatch(/^Miel 500g × 5 — \$\s?30\.000$/);
    expect(texto[3]).toMatch(/^Propóleo × 2 — \$\s?6\.000$/);
    expect(texto[4]).toMatch(/^Total: \$\s?36\.000$/);
    expect(texto[5]).toBe("Stock restante: Miel 500g: 45, Propóleo: 8 · origen: directo");
  });
});

describe("detalle del pedido en el admin", () => {
  it("una fila por ítem y el total", async () => {
    vi.doMock("@/lib/prisma", () => ({ prisma: { order: { findUnique: async () => ({ ...db.pedido, email: "a@b.c", telefono: "1", calle: "C", numero_dir: "1", pisoDepto: null, codigoPostal: "1", createdAt: new Date(0), updatedAt: new Date(0), mpPaymentId: null, mpPreferenceId: null }) } } }));
    vi.resetModules();
    const { default: Detalle } = await import("@/app/admin/(dashboard)/pedidos/[id]/page");
    const html = renderToStaticMarkup(await Detalle({ params: Promise.resolve({ id: "ord-9" }) }));
    expect(html).toContain("<span>Miel 500g × 5</span>");
    expect(html).toContain("<span>Propóleo × 2</span>");
    expect(html).toMatch(/<span>Total<\/span><span>\$\s?36\.000<\/span>/);
  });
});
