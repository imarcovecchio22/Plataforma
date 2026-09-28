/**
 * Red de seguridad de la fase 1 (paso 0): fija los textos que Melera le manda a Gemini y a
 * Telegram, y los nombres que dependen de la marca. Ver paginas.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Consulta } from "@prisma/client";

const sec = vi.hoisted(() => ({ demasiadosIntentos: vi.fn(async () => false) }));
vi.mock("@/lib/security", async (original) => ({
  ...(await original<typeof import("@/lib/security")>()),
  clientIp: () => "1.2.3.4",
  demasiadosIntentos: sec.demasiadosIntentos,
}));

vi.mock("@/lib/logs", () => ({
  logEvent: vi.fn(async () => {}),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const gemini = vi.hoisted(() => ({ generateContentStream: vi.fn() }));
vi.mock("@google/genai", async (original) => ({
  ...(await original<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = gemini;
  },
}));

vi.mock("@/lib/product", () => ({
  getMainProduct: async () => ({
    id: "prod-1",
    nombre: "Miel Artesanal 500g",
    precio: 6500,
    stock: 50,
    escalones: [
      { desde: 5, precio: 6000 },
      { desde: 10, precio: 5500 },
    ],
  }),
}));

const tg = vi.hoisted(() => ({ enviados: [] as string[] }));
vi.mock("@/lib/telegram", async (original) => ({
  ...(await original<typeof import("@/lib/telegram")>()),
  sendTelegramMessage: vi.fn(async (texto: string) => {
    tg.enviados.push(texto);
    return true;
  }),
}));

// Base en memoria para el aviso de pedido pagado (mismo enfoque que pagos.test.ts)
const db = vi.hoisted(() => ({ pedido: null as Record<string, unknown> | null }));
vi.mock("@/lib/prisma", () => {
  const order = {
    findUnique: async () => ({ ...db.pedido }),
    findUniqueOrThrow: async () => ({ ...db.pedido }),
    updateMany: async ({ data }: { data: Record<string, unknown> }) => {
      Object.assign(db.pedido!, data);
      return { count: 1 };
    },
  };
  const product = { update: async () => ({ id: "prod-1", nombre: "Miel Artesanal 500g", stock: 45 }) };
  return { prisma: { order, product, $transaction: async (fn: (tx: unknown) => unknown) => fn({ order, product }) } };
});
vi.mock("@/lib/mercadopago", () => ({ getPaymentClient: () => ({ get: vi.fn() }) }));

import { POST as chat } from "@/app/api/chat/route";
import { armarPrompt } from "@/lib/instagram/copy";
import { contactoHref, notifyNuevaConsulta } from "@/lib/consultas";
import { applyPaymentStatusFromPayment } from "@/lib/orders";
import { POST as pruebaTelegram } from "@/app/api/admin/telegram/route";
import { COOKIE_NAME } from "@/lib/auth";

const pedidoChat = (messages: unknown) =>
  new Request("https://melera.vercel.app/api/chat", { method: "POST", body: JSON.stringify({ messages }) });

beforeEach(() => {
  vi.clearAllMocks();
  tg.enviados.length = 0;
  process.env.GEMINI_API_KEY = "clave-de-prueba";
  delete process.env.NEXT_PUBLIC_BASE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
});

describe("chat de Melera", () => {
  it("instrucciones que recibe Gemini", async () => {
    gemini.generateContentStream.mockResolvedValue(
      (async function* () {
        yield { text: "¡Hola!" };
      })()
    );
    await (await chat(pedidoChat([{ role: "user", content: "hola" }]))).text();
    expect(gemini.generateContentStream.mock.calls[0][0].config.systemInstruction).toMatchSnapshot();
  });

  it("mensaje cuando Gemini falla", async () => {
    gemini.generateContentStream.mockRejectedValue(new Error("caído"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await (await chat(pedidoChat([{ role: "user", content: "hola" }]))).text()).toMatchSnapshot();
  });

  it("mensaje cuando una IP manda demasiados mensajes", async () => {
    sec.demasiadosIntentos.mockResolvedValueOnce(true);
    expect(await (await chat(pedidoChat([{ role: "user", content: "hola" }]))).text()).toMatchSnapshot();
  });
});

describe("prompt del copy de Instagram de Melera", () => {
  const base = { tema: "cuántas flores visitan las abejas", nombreProducto: null, categoria: null, precio: null, presentacion: null };

  it.each(["presentacion", "dato"] as const)("tipo %s", (tipo) => {
    expect(armarPrompt({ ...base, tipo })).toMatchSnapshot();
  });

  it("tipo producto", () => {
    expect(
      armarPrompt({
        ...base,
        tipo: "producto",
        nombreProducto: "Miel <em>Artesanal</em>",
        categoria: "miel pura",
        precio: "6500",
        presentacion: "frasco 500 g",
      })
    ).toMatchSnapshot();
  });

  it("tipo promo", () => {
    expect(
      armarPrompt({ ...base, tipo: "promo" }, "1 frasco a $ 6.500 · 5 frascos a $ 30.000 · 10 frascos a $ 55.000")
    ).toMatchSnapshot();
  });
});

describe("avisos de Telegram de Melera", () => {
  const consulta = (canal: "instagram" | "email"): Consulta => ({
    id: 3,
    nombre: "Juan",
    canal,
    instagram: canal === "instagram" ? "juan.perez" : null,
    email: canal === "email" ? "juan@example.com" : null,
    mensaje: "¿Hacen envíos a Zona Norte?",
    origen: "instagram",
    estado: "nueva",
    createdAt: new Date("2026-09-27T20:00:00Z"),
    updatedAt: new Date("2026-09-27T20:00:00Z"),
  });

  it("consulta nueva por Instagram y por email", async () => {
    await notifyNuevaConsulta(consulta("instagram"));
    await notifyNuevaConsulta(consulta("email"));
    expect(tg.enviados).toMatchSnapshot();
  });

  it("links para responder una consulta", () => {
    expect([contactoHref(consulta("instagram")), contactoHref(consulta("email"))]).toMatchSnapshot();
  });

  it("pedido pagado", async () => {
    db.pedido = {
      id: "ord-1", numero: 7, estado: "pendiente", productId: "prod-1", cantidad: 5, total: 30000,
      nombre: "Ana", apellido: "Pérez", localidad: "Palermo", provincia: "CABA", origen: "instagram",
    };
    await applyPaymentStatusFromPayment({ id: 111, status: "approved", external_reference: "ord-1" } as never);
    expect(tg.enviados).toMatchSnapshot();
  });

  it("mensaje de prueba del admin", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw";
    process.env.TELEGRAM_CHAT_ID = "123";
    await pruebaTelegram();
    expect(tg.enviados).toMatchSnapshot();
  });
});

describe("nombres que dependen de la marca", () => {
  it("cookie de la sesión del admin", () => {
    expect(COOKIE_NAME).toBe("melera_admin_session");
  });
});
