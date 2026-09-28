import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PostIG } from "@prisma/client";

vi.mock("@/lib/logs", () => ({
  logEvent: vi.fn(async () => {}),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const MIEL = { id: "miel", nombre: "Miel 500g", precio: 6500, escalones: [{ desde: 5, precio: 6000 }], imagenUrl: null };
const VELA = { id: "vela", nombre: "Vela de cera", precio: 2000, escalones: [{ desde: 3, precio: 1800 }], imagenUrl: "https://fotos.example.com/vela.jpg", unidadSingular: "vela", unidadPlural: "velas" };
const SIN_PROMOS = { id: "jabon", nombre: "Jabón", precio: 1500, escalones: [], imagenUrl: null };
const CATALOGO: Record<string, unknown> = { miel: MIEL, vela: VELA, jabon: SIN_PROMOS };

vi.mock("@/lib/product", () => ({ getMainProduct: async () => MIEL }));

const copy = vi.hoisted(() => ({ llamadas: [] as { post: Record<string, unknown>; promos?: string; promosDe?: string }[] }));
vi.mock("@/lib/instagram/copy", () => ({
  generarCopy: vi.fn(async (post: Record<string, unknown>, promos?: string, promosDe?: string) => {
    copy.llamadas.push({ post, promos, promosDe });
    return { tagline: "Llevá más", titulo: "Título", subtitulo: "Sub", cta: "Pedila", caracteristica_1: "A", caracteristica_2: "B", caracteristica_3: "C", numero: "1", texto_dato: "dato", hashtags: "#x", caption_ig: "Caption" };
  }),
}));
vi.mock("@/lib/telegram", async (original) => ({
  ...(await original<typeof import("@/lib/telegram")>()),
  sendTelegramPhoto: vi.fn(async () => 99),
  sendTelegramMessage: vi.fn(async () => true),
}));

const db = vi.hoisted(() => ({
  posts: [] as unknown[],
  actualizaciones: [] as { where: unknown; data: Record<string, unknown> }[],
  creados: [] as Record<string, unknown>[],
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    postIG: {
      findMany: async () => db.posts,
      updateMany: async () => ({ count: 1 }),
      update: async (op: { where: unknown; data: Record<string, unknown> }) => {
        db.actualizaciones.push(op);
        return {};
      },
      count: async () => 0,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        db.creados.push(data);
        return { id: 1, ...data };
      },
    },
    product: { findUnique: async ({ where }: { where: { id: string } }) => CATALOGO[where.id] ?? null },
  },
}));

import { generarPendientes } from "@/lib/instagram/generar";
import { POST as crearPost } from "@/app/api/admin/instagram/posts/route";
import { postIGSchema } from "@/lib/validation";
import * as g from "@/plataforma/imagenes/plantillas";

const post = (id: number, tipo: PostIG["tipo"], extra: Partial<PostIG> = {}): PostIG => ({
  id, fecha: new Date("2026-09-28T00:00:00Z"), tipo, estilo: "geo", tema: "tema", productoId: null, nombreProducto: null,
  categoria: null, precio: null, presentacion: null, imagenUrl: null, estado: "pendiente", copy: null, caption: null,
  feedUrl: null, storyUrl: null, destino: null, feedMediaId: null, storyMediaId: null, telegramMessageId: null,
  error: null, generadoEn: null, publicadoEn: null, createdAt: new Date(0), updatedAt: new Date(0), ...extra,
});

/** Genera los posts y devuelve los datos de la imagen del feed de cada uno. */
async function generar(...posts: PostIG[]) {
  db.posts = posts;
  const urls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    urls.push(url);
    return new Response(new Uint8Array([1]), { headers: { "content-type": "image/jpeg" } });
  }));
  try {
    const resumen = await generarPendientes();
    const feeds = urls.filter((u) => u.includes("/feed/")).map((u) => g.readImageToken(u.split("/feed/")[1]) as Record<string, string>);
    return { resumen, feeds };
  } finally {
    vi.unstubAllGlobals();
  }
}

beforeAll(() => {
  process.env.IMAGE_SIGNING_SECRET = "secreto-de-prueba";
});
beforeEach(() => {
  copy.llamadas.length = 0;
  db.actualizaciones.length = 0;
  db.creados.length = 0;
});

const base = { fecha: "2026-10-01", estilo: "geo", tema: "tema de prueba" };

describe("postIGSchema con producto del catálogo", () => {
  it("un post de producto con producto elegido no pide los datos a mano", () => {
    expect(postIGSchema.safeParse({ ...base, tipo: "producto", productoId: "miel" }).success).toBe(true);
    expect(postIGSchema.safeParse({ ...base, tipo: "producto" }).success).toBe(false);
  });
});

describe("crear un post", () => {
  const crear = (body: unknown) => crearPost(new NextRequest("https://x.com/api/admin/instagram/posts", { method: "POST", body: JSON.stringify(body) }));

  it("de producto del catálogo: guarda el producto y no los datos a mano (sí categoría y presentación)", async () => {
    const res = await crear({ ...base, tipo: "producto", productoId: "vela", nombreProducto: "viejo", precio: "1", categoria: "velas", presentacion: "caja" });
    expect(res.status).toBe(200);
    expect(db.creados[0]).toMatchObject({ productoId: "vela", nombreProducto: null, precio: null, imagenUrl: null, categoria: "velas", presentacion: "caja" });
  });

  it("de promo con producto; en otros tipos el producto no se guarda", async () => {
    await crear({ ...base, tipo: "promo", productoId: "vela" });
    await crear({ ...base, tipo: "dato", productoId: "vela" });
    expect(db.creados.map((d) => d.productoId)).toEqual(["vela", null]);
  });

  it("con un producto que no existe, 400", async () => {
    const res = await crear({ ...base, tipo: "promo", productoId: "no-existe" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Ese producto ya no existe");
    expect(db.creados).toHaveLength(0);
  });
});

describe("generar posts con productos del catálogo", () => {
  it("producto: nombre, precio y foto salen del producto al generar, y quedan guardados", async () => {
    const { resumen, feeds } = await generar(post(1, "producto", { productoId: "vela", nombreProducto: "viejo", precio: "1" }));
    expect(resumen.generados).toBe(1);
    expect(feeds[0]).toMatchObject({ nombre_producto: "Vela de cera", imagen_url: "https://fotos.example.com/vela.jpg" });
    expect(feeds[0].precio).toMatch(/^\$\s?2\.000$/);
    expect(copy.llamadas[0].post).toMatchObject({ nombreProducto: "Vela de cera" });
    expect(db.actualizaciones.find((a) => a.data.estado === "esperando_aprobacion")!.data).toMatchObject({
      nombreProducto: "Vela de cera", imagenUrl: "https://fotos.example.com/vela.jpg",
    });
  });

  it("producto sin foto propia: usa la foto del sitio", async () => {
    const { feeds } = await generar(post(1, "producto", { productoId: "miel" }));
    expect(feeds[0].imagen_url).toMatch(/\/producto-miel-500g\.png$/);
  });

  it("promo de un producto elegido: sus promos, su foto y su nombre para Gemini", async () => {
    const { feeds } = await generar(post(1, "promo", { productoId: "vela" }));
    expect(feeds[0].imagen_url).toBe("https://fotos.example.com/vela.jpg");
    expect(feeds[0].promos).toMatch(/^1 vela\|\$\s?2\.000\|;3 velas\|/);
    expect(copy.llamadas[0]).toMatchObject({ promosDe: "Vela de cera" });
    expect(copy.llamadas[0].promos).toMatch(/^1 vela a \$\s?2\.000 · 3 velas a/);
  });

  it("promo sin producto elegido: el destacado, con el promosDe de la config", async () => {
    await generar(post(1, "promo"));
    expect(copy.llamadas[0].promosDe).toBeUndefined();
    expect(copy.llamadas[0].promos).toMatch(/^1 frasco a \$\s?6\.500/);
  });

  it.each([
    ["un producto que ya no existe", post(1, "producto", { productoId: "no-existe" }), "El producto del post ya no existe: elegí otro"],
    ["un post de producto sin producto ni datos", post(1, "producto"), "Elegí el producto del catálogo o cargá sus datos a mano"],
    ["una promo de un producto sin promos", post(1, "promo", { productoId: "jabon" }), "Jabón no tiene promos por cantidad (se cargan en Productos)"],
  ])("queda en error con %s", async (_caso, p, error) => {
    const { resumen } = await generar(p);
    expect(resumen.errores).toBe(1);
    expect(db.actualizaciones.find((a) => a.data.estado === "error")!.data.error).toBe(error);
  });
});
