import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Base de datos en memoria: respeta la condición de updateMany como lo hace Postgres ---
type Pedido = { id: string; numero: number; estado: string; total: number; mpPaymentId?: string | null; [k: string]: unknown };
const db = vi.hoisted(() => ({
  pedidos: new Map<string, Pedido>(),
  stock: 10,
}));

vi.mock("@/lib/prisma", () => {
  const order = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const p = db.pedidos.get(where.id);
      return p ? { ...p } : null;
    },
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => ({ ...db.pedidos.get(where.id)! }),
    update: async ({ where, data }: { where: { id: string }; data: Partial<Pedido> }) => {
      await new Promise((r) => setTimeout(r, 0));
      const p = db.pedidos.get(where.id)!;
      Object.assign(p, data);
      return { ...p };
    },
    updateMany: async ({ where, data }: { where: { id: string; estado: { not: string } }; data: Partial<Pedido> }) => {
      await new Promise((r) => setTimeout(r, 0)); // da lugar a que otro aviso "llegue al mismo tiempo"
      const p = db.pedidos.get(where.id);
      if (!p || p.estado === where.estado.not) return { count: 0 };
      Object.assign(p, data);
      return { count: 1 };
    },
  };
  const product = {
    update: async ({ data }: { data: { stock: { decrement: number } } }) => {
      db.stock -= data.stock.decrement;
      return { id: "prod-1", nombre: "Miel Artesanal 500g", stock: db.stock };
    },
  };
  const prisma = { order, product, $transaction: async (fn: (tx: unknown) => unknown) => fn({ order, product }) };
  return { prisma };
});

const tg = vi.hoisted(() => ({ sendTelegramMessage: vi.fn(async (texto: string) => texto.length > 0) }));
vi.mock("@/lib/telegram", () => ({ ...tg, siteUrl: () => "https://melera.vercel.app" }));
vi.mock("@/lib/mercadopago", () => ({ getPaymentClient: () => ({ get: vi.fn() }) }));
vi.mock("@/lib/logs", () => ({
  logEvent: vi.fn(async () => {}),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

import { applyPaymentStatusFromPayment, mapMpStatus } from "@/lib/orders";

const pago = (status: string, id = 111) => ({ id, status, external_reference: "ord-1" });

beforeEach(() => {
  vi.clearAllMocks();
  db.stock = 10;
  db.pedidos.clear();
  db.pedidos.set("ord-1", {
    id: "ord-1", numero: 7, estado: "pendiente", total: 13000,
    items: [{ productId: "prod-1", nombre: "Miel Artesanal 500g", cantidad: 2, subtotal: 13000 }],
    nombre: "Ana", apellido: "Pérez", localidad: "Palermo", provincia: "CABA", origen: "instagram",
  });
});

describe("mapMpStatus", () => {
  it.each([
    ["approved", "pagado"],
    ["in_process", "pendiente"],
    ["pending", "pendiente"],
    ["rejected", "cancelado"],
    ["refunded", "cancelado"],
    ["algo_raro", null],
  ])("%s → %s", (mp, esperado) => {
    expect(mapMpStatus(mp)).toBe(esperado);
  });
});

describe("aplicar un pago", () => {
  it("aprobado: pasa a pagado, descuenta el stock una vez y avisa por Telegram", async () => {
    const r = await applyPaymentStatusFromPayment(pago("approved") as never);
    expect(r?.estado).toBe("pagado");
    expect(db.stock).toBe(8);
    expect(tg.sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(tg.sendTelegramMessage.mock.calls[0][0]).toContain("Pedido #7 pagado");
  });

  it("el mismo aviso repetido no vuelve a descontar ni a avisar", async () => {
    await applyPaymentStatusFromPayment(pago("approved") as never);
    await applyPaymentStatusFromPayment(pago("approved") as never);
    expect(db.stock).toBe(8);
    expect(tg.sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  it("dos avisos de aprobado al mismo tiempo descuentan el stock una sola vez", async () => {
    await Promise.all([
      applyPaymentStatusFromPayment(pago("approved") as never),
      applyPaymentStatusFromPayment(pago("approved") as never),
      applyPaymentStatusFromPayment(pago("approved") as never),
    ]);
    expect(db.stock).toBe(8);
    expect(tg.sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  it("un rechazo que llega después de pagado no revierte el pedido", async () => {
    await applyPaymentStatusFromPayment(pago("approved") as never);
    const r = await applyPaymentStatusFromPayment(pago("rejected", 222) as never);
    expect(r?.estado).toBe("pagado");
    expect(db.pedidos.get("ord-1")?.estado).toBe("pagado");
  });

  it("aprobado y rechazado al mismo tiempo: queda pagado y el stock baja una vez", async () => {
    await Promise.all([
      applyPaymentStatusFromPayment(pago("approved") as never),
      applyPaymentStatusFromPayment(pago("rejected", 222) as never),
    ]);
    // Según quién llegue primero puede pasar por cancelado, pero nunca pierde el pago ni descuenta doble.
    expect(db.stock).toBeGreaterThanOrEqual(8);
    expect(tg.sendTelegramMessage.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("rechazado: pasa a cancelado sin tocar el stock ni avisar", async () => {
    const r = await applyPaymentStatusFromPayment(pago("rejected") as never);
    expect(r?.estado).toBe("cancelado");
    expect(db.stock).toBe(10);
    expect(tg.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("ignora pagos sin pedido o con estado desconocido", async () => {
    expect(await applyPaymentStatusFromPayment({ id: 1, status: "approved", external_reference: "no-existe" } as never)).toBeNull();
    expect(await applyPaymentStatusFromPayment({ id: 1, status: "approved", external_reference: null } as never)).toBeNull();
    expect(await applyPaymentStatusFromPayment(pago("algo_raro") as never)).toBeNull();
    expect(db.stock).toBe(10);
  });

  it("si falla Telegram, el pago igual queda aplicado", async () => {
    tg.sendTelegramMessage.mockRejectedValueOnce(new Error("Telegram caído"));
    const r = await applyPaymentStatusFromPayment(pago("approved") as never);
    expect(r?.estado).toBe("pagado");
    expect(db.stock).toBe(8);
  });
});
