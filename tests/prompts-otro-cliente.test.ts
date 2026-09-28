import { beforeEach, describe, expect, it, vi } from "vitest";

// Otra marca inventada: los prompts tienen que salir enteros de su config, sin rastros de Melera.
const OTRA = vi.hoisted(() => ({
  slug: "taller-ejemplo",
  nombre: "Taller Ejemplo",
  dominio: "https://taller-ejemplo.com.ar",
  instagram: "taller.ejemplo",
  ia: {
    descripcion: "un taller de impresiones 3D de Rosario",
    tema: "Taller Ejemplo y la impresión 3D",
    chat: {
      producto: "Maceta geométrica impresa en PLA",
      datos: ["Envíos: a todo el país. Consultas en $SITIO/consultas."],
    },
    copy: {
      rol: "taller argentino de impresión 3D",
      tono: "Tono técnico y cercano.",
      promosDe: "macetas medianas",
      temaDatos: "impresión 3D y materiales",
      ejemplos: {
        titulo: "Hecho <em>capa a capa</em>",
        caracteristicas: "PLA / Hecho a pedido",
        presentacion: "Maceta 12 cm",
        ctaPromo: "Pedila por DM",
        taglineDato: "el poder del filamento",
      },
    },
  },
  unidad: { singular: "maceta", plural: "macetas", genero: "femenino" },
}));

vi.mock("@cliente/config", async (original) => {
  const melera = ((await original()) as { default: Record<string, unknown> }).default;
  return { default: { ...melera, ...OTRA } };
});

const gemini = vi.hoisted(() => ({ generateContentStream: vi.fn() }));
vi.mock("@google/genai", async (original) => ({
  ...(await original<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = gemini;
  },
}));
vi.mock("@/lib/security", async (original) => ({
  ...(await original<typeof import("@/lib/security")>()),
  clientIp: () => "1.2.3.4",
  demasiadosIntentos: async () => false,
}));
vi.mock("@/lib/logs", () => ({ logEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/product", () => ({
  getProductosActivos: async () => [{ nombre: "Maceta", slug: "maceta", descripcion: "", precio: 9000, escalones: [{ desde: 3, precio: 8000 }] }],
}));
vi.mock("@/lib/zonas", () => ({
  getZonasActivas: async () => [{ id: 1, nombre: "Todo el país", costo: 4000, aclaracion: "", detalleResumen: "" }],
}));

import { POST as chat } from "@/app/api/chat/route";
import { armarPrompt } from "@/lib/instagram/copy";
import { problemasDeConfig } from "@/plataforma/cliente/validar";
import { cliente } from "@/plataforma/cliente";

const RASTROS_DE_MELERA = /melera|miel|frasco|abeja|colmena|apícola|jofré|CABA/i;

beforeEach(() => {
  process.env.GEMINI_API_KEY = "clave-de-prueba";
  gemini.generateContentStream.mockResolvedValue((async function* () {})());
});

describe("prompts con otra marca", () => {
  it("la config de prueba es válida", () => {
    expect(problemasDeConfig("taller-ejemplo", cliente)).toEqual([]);
  });

  it("chat", async () => {
    const req = new Request("https://taller-ejemplo.com.ar/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hola" }] }),
    });
    await (await chat(req)).text();
    const prompt: string = gemini.generateContentStream.mock.calls[0][0].config.systemInstruction;
    expect(prompt).toContain("Sos el asistente virtual de Taller Ejemplo, un taller de impresiones 3D de Rosario.");
    expect(prompt).toContain("- Producto: Maceta geométrica impresa en PLA,");
    expect(prompt).toContain("el precio baja para cada maceta");
    expect(prompt).toContain("Consultas en taller-ejemplo.com.ar/consultas.");
    expect(prompt).toContain("- Instagram: @taller.ejemplo");
    expect(prompt).not.toMatch(RASTROS_DE_MELERA);
  });

  it.each(["presentacion", "producto", "dato", "promo"] as const)("copy de Instagram (%s)", (tipo) => {
    const prompt = armarPrompt(
      { tipo, tema: "macetas", nombreProducto: null, categoria: null, precio: null, presentacion: null },
      "1 maceta a $ 9.000"
    );
    expect(prompt).toContain("Sos copywriter de Taller Ejemplo, taller argentino de impresión 3D. Tono técnico y cercano.");
    expect(prompt).not.toMatch(RASTROS_DE_MELERA);
  });
});
