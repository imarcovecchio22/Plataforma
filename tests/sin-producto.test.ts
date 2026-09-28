import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

import { renderToStaticMarkup } from "react-dom/server";

// Base recién creada: no hay ningún producto
vi.mock("@/lib/product", () => ({ getMainProduct: async () => null, getProductosActivos: async () => [], getProductoPorSlug: async () => null }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany: async () => [] } } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: () => {}, refresh: () => {} }) }));
vi.mock("@/lib/logs", () => ({ logEvent: vi.fn(async () => {}), errorMessage: (e: unknown) => String(e) }));
vi.mock("@/lib/security", async (original) => ({
  ...(await original<typeof import("@/lib/security")>()),
  clientIp: () => "1.2.3.4",
  demasiadosIntentos: async () => false,
}));
const gemini = vi.hoisted(() => ({ generateContentStream: vi.fn() }));
vi.mock("@google/genai", async (original) => ({
  ...(await original<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = gemini;
  },
}));

import HomePage from "@/app/(publico)/page";
import ProductoPage from "@/app/(publico)/producto/page";
import CheckoutPage from "@/app/checkout/page";
import AdminProductosPage from "@/app/admin/(dashboard)/productos/page";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as chat } from "@/app/api/chat/route";
import { PRECIO_SIN_PRODUCTO, textosDelProducto } from "@/lib/precios";
import seedMelera from "../clientes/melera/seed";

const html = async (pagina: Promise<unknown> | unknown) => renderToStaticMarkup((await pagina) as React.ReactElement);

beforeEach(() => {
  process.env.GEMINI_API_KEY = "clave-de-prueba";
  gemini.generateContentStream.mockResolvedValue((async function* () {})());
});

describe("tienda sin productos cargados", () => {
  it.each([
    ["/", () => HomePage()],
    ["/producto", () => ProductoPage({ searchParams: Promise.resolve({}) })],
    ["/checkout", () => CheckoutPage({ searchParams: Promise.resolve({}) })],
  ])("%s muestra que todavía no hay productos", async (_ruta, pagina) => {
    const h = await html(pagina());
    expect(h).toContain("Todavía no hay productos");
    expect(h).toContain('href="/consultas"');
  });

  it("el admin de productos explica cómo cargarlos", async () => {
    expect(await html(AdminProductosPage())).toContain("npm run db:seed");
  });

  it("el checkout responde 404 sin crear pedidos", async () => {
    const res = await checkout(
      new NextRequest("https://x.com/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          nombre: "Ana", apellido: "Pérez", email: "ana@example.com", telefono: "1122334455", calle: "Honduras",
          numero_dir: "4800", localidad: "Palermo", provincia: "CABA", codigoPostal: "1414", cantidad: 1,
        }),
      })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No hay productos a la venta" });
  });

  it("el chat dice el precio 'a confirmar' y no menciona promos", async () => {
    await (await chat(new Request("https://x.com/api/chat", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "hola" }] }) }))).text();
    const prompt: string = gemini.generateContentStream.mock.calls[0][0].config.systemInstruction;
    expect(prompt).toContain(`- Producto: Miel Artesanal 500g, frasco de vidrio, ${PRECIO_SIN_PRODUCTO}`);
    expect(prompt).not.toContain("Promos por cantidad");
  });

  it("textosDelProducto sin producto", () => {
    expect(textosDelProducto(null)).toEqual({ nombre: "", precio: "a confirmar", promos: "" });
  });
});

describe("regla de bienvenida de Melera", () => {
  it("la del seed es exactamente la que borra la migración (si siguiera sin cambios)", () => {
    const dir = path.resolve(__dirname, "..", "prisma", "migrations");
    const carpeta = fs.readdirSync(dir).find((d) => d.endsWith("_sacar_regla_de_melera"))!;
    const sql = fs.readFileSync(path.join(dir, carpeta, "migration.sql"), "utf8");
    const [regla] = seedMelera.autorespuestas!;
    expect(regla.activa).toBe(false);
    expect(sql).toContain(`"nombre" = '${regla.nombre}'`);
    expect(sql).toContain(`"respuesta" = '${regla.respuesta}'`);
    expect(sql).toContain(`"respuestaPublicaComentario" = '${regla.respuestaPublicaComentario}'`);
    expect(sql).toContain(`"palabrasClave" = ARRAY[${regla.palabrasClave.map((p) => `'${p}'`).join(", ")}]`);
    expect(sql).toContain(`"prioridad" = ${regla.prioridad}`);
    const botonesSql = JSON.parse(/"botones" = '(.*)'::jsonb/.exec(sql)![1]);
    expect(botonesSql).toEqual(regla.botones);
  });

  it("y es la misma que insertaba la migración vieja", () => {
    const sql = fs.readFileSync(path.resolve(__dirname, "..", "prisma", "migrations", "20260925000100_regla_inicial_como_manychat", "migration.sql"), "utf8");
    const [regla] = seedMelera.autorespuestas!;
    expect(sql).toContain(`'${regla.respuesta}'`);
    expect(sql).toContain(`'${regla.respuestaPublicaComentario}'`);
  });
});
