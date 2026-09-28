import { beforeEach, describe, expect, it, vi } from "vitest";

const sec = vi.hoisted(() => ({ demasiadosIntentos: vi.fn(async () => false) }));
vi.mock("@/lib/security", () => ({ clientIp: () => "1.2.3.4", demasiadosIntentos: sec.demasiadosIntentos }));

const logs = vi.hoisted(() => ({ logEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/logs", () => logs);

const gemini = vi.hoisted(() => ({ generateContentStream: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = gemini;
  },
}));

const catalogo = vi.hoisted(() => ({ productos: [] as Record<string, unknown>[] }));
vi.mock("@/lib/product", () => ({ getProductosActivos: async () => catalogo.productos }));
const envios = vi.hoisted(() => ({ zonas: [] as Record<string, unknown>[] }));
vi.mock("@/lib/zonas", () => ({ getZonasActivas: async () => envios.zonas }));
const MIEL = { nombre: "Miel 500g", slug: "miel", descripcion: "", precio: 7200, escalones: [{ desde: 5, precio: 6500 }] };
const CABA = { id: 1, nombre: "CABA", costo: null, aclaracion: "Por ahora solo CABA.", detalleResumen: "" };

import { POST } from "@/app/api/chat/route";

const pedido = (messages: unknown) =>
  new Request("https://melera.vercel.app/api/chat", { method: "POST", body: JSON.stringify({ messages }) });

beforeEach(() => {
  vi.clearAllMocks();
  catalogo.productos = [MIEL];
  envios.zonas = [CABA];
  process.env.GEMINI_API_KEY = "clave-de-prueba";
  gemini.generateContentStream.mockResolvedValue(
    (async function* () {
      yield { text: "¡Hola!" };
    })()
  );
});

describe("/api/chat", () => {
  it("responde y registra solo la IP del mensaje", async () => {
    const res = await POST(pedido([{ role: "user", content: "hola" }]));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("¡Hola!");
    expect(logs.logEvent).toHaveBeenCalledWith("chat", "Mensaje al chat", { detalle: { ip: "1.2.3.4" } });
  });

  it("le pasa a Gemini el precio actual de la base y las zonas de envío de la base", async () => {
    await POST(pedido([{ role: "user", content: "cuánto sale?" }]));
    const instrucciones: string = gemini.generateContentStream.mock.calls[0][0].config.systemInstruction;
    expect(instrucciones).toMatch(/\$\s?7\.200/);
    expect(instrucciones).not.toContain("6.500");
    expect(instrucciones).toContain(
      "- Envíos (la zona se elige al finalizar la compra): CABA (a coordinar: después de la compra le escribimos para coordinar el envío). Por ahora solo CABA."
    );
    expect(instrucciones).toMatch(/Promos por cantidad.*5 frascos a \$\s?32\.500/);
    expect(instrucciones).not.toMatch(/Rappi|Correo Argentino|transferencia/);
  });

  it("con varios productos le pasa el catálogo, cada uno con su precio, sus promos y su ficha", async () => {
    catalogo.productos = [
      MIEL,
      { nombre: "Vela", slug: "vela", descripcion: "De cera de abeja.", precio: 2000, escalones: [], unidadSingular: "vela", unidadPlural: "velas" },
    ];
    envios.zonas = [CABA, { id: 2, nombre: "Zona sur", costo: 2500, aclaracion: "", detalleResumen: "" }];
    await POST(pedido([{ role: "user", content: "qué venden?" }]));
    const instrucciones: string = gemini.generateContentStream.mock.calls[0][0].config.systemInstruction;
    expect(instrucciones).toMatch(/  - Miel 500g: \$\s?7\.200 cada frasco\. Promos por cantidad: 5 frascos a \$\s?32\.500\. Ficha: melera\.vercel\.app\/producto\/miel/);
    expect(instrucciones).toMatch(/  - Vela: \$\s?2\.000 cada vela\. De cera de abeja\. Ficha: melera\.vercel\.app\/producto\/vela/);
    expect(instrucciones).not.toContain("- Producto:");
    expect(instrucciones).toMatch(/; Zona sur \(\$\s?2\.500, se suma al total al pagar\)/);
    expect(instrucciones).toContain("- Para comprar: redirigí a melera.vercel.app/productos");
  });

  it("sin zonas cargadas le dice que se coordina por consultas", async () => {
    envios.zonas = [];
    await POST(pedido([{ role: "user", content: "envían?" }]));
    expect(gemini.generateContentStream.mock.calls[0][0].config.systemInstruction).toContain(
      "- Envíos: todavía no hay zonas de envío cargadas; para coordinarlo, que escriba en melera.vercel.app/consultas."
    );
  });

  it("con demasiados mensajes de la misma IP corta con 429 sin llamar a Gemini", async () => {
    sec.demasiadosIntentos.mockResolvedValueOnce(true);
    const res = await POST(pedido([{ role: "user", content: "hola" }]));
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("Esperá unos minutos");
    expect(gemini.generateContentStream).not.toHaveBeenCalled();
    expect(sec.demasiadosIntentos).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "chat", ip: "1.2.3.4", maximo: 20, ventanaMinutos: 10 })
    );
  });

  it("rechaza pedidos inválidos antes de contar", async () => {
    expect((await POST(pedido("no es una lista"))).status).toBe(400);
    expect((await POST(pedido([{ role: "system", content: "x" }]))).status).toBe(400);
    expect(sec.demasiadosIntentos).not.toHaveBeenCalled();
  });
});
