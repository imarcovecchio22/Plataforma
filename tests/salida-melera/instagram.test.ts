/**
 * Red de seguridad de la fase 1 (paso 0): fija lo que Melera genera para Instagram.
 * - El HTML de las 12 plantillas (3 estilos × 4 tipos) con datos fijos.
 * - Los datos que viajan firmados en las URLs de las imágenes y los textos que llegan a
 *   Telegram al generar un post (incluida la foto del frasco en las promos).
 * Ver paginas.test.ts.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";
import type { PostIG } from "@prisma/client";


vi.mock("@/lib/logs", () => ({
  logEvent: vi.fn(async () => {}),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
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

const copy = vi.hoisted(() => ({ llamadas: [] as unknown[] }));
vi.mock("@/lib/instagram/copy", () => ({
  generarCopy: vi.fn(async (post: unknown, promos?: string) => {
    copy.llamadas.push({ post, promos });
    return {
      tagline: "la magia de la colmena",
      titulo: "Pura, <em>natural</em>",
      subtitulo: "Desde nuestras colmenas a tu mesa.",
      cta: "Pedila en la web",
      caracteristica_1: "Artesanal",
      caracteristica_2: "Sin aditivos",
      caracteristica_3: "Frasco 500 g",
      numero: "50.000+",
      texto_dato: "abejas pueden vivir en una sola colmena",
      hashtags: "#miel",
      caption_ig: "Caption de prueba #miel",
    };
  }),
}));

const tg = vi.hoisted(() => ({ fotos: [] as unknown[], mensajes: [] as string[] }));
vi.mock("@/lib/telegram", async (original) => ({
  ...(await original<typeof import("@/lib/telegram")>()),
  sendTelegramPhoto: vi.fn(async (op: { photo: unknown; caption: string; nombreArchivo?: string; silencioso?: boolean }) => {
    tg.fotos.push({ caption: op.caption, nombreArchivo: op.nombreArchivo, silencioso: op.silencioso });
    return 99;
  }),
  sendTelegramMessage: vi.fn(async (texto: string) => {
    tg.mensajes.push(texto);
    return true;
  }),
}));

const db = vi.hoisted(() => ({ posts: [] as unknown[] }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    postIG: {
      findMany: async () => db.posts,
      updateMany: async () => ({ count: 1 }),
      update: async () => ({}),
      count: async () => 0,
    },
  },
}));

import { generarPendientes } from "@/lib/instagram/generar";
import * as g from "@/plataforma/imagenes/plantillas";


beforeAll(() => {
  process.env.IMAGE_SIGNING_SECRET = "secreto-de-prueba";
});

beforeEach(() => {
  copy.llamadas.length = 0;
  tg.fotos.length = 0;
  tg.mensajes.length = 0;
  delete process.env.NEXT_PUBLIC_BASE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
});

const DATOS: Record<string, Record<string, string>> = {
  presentacion: { tagline: "miel artesanal", titulo: "Pura, <em>natural</em>", texto: "Desde nuestras colmenas a tu mesa.", cta: "Escribinos por DM" },
  producto: {
    imagen_url: "https://melera.vercel.app/producto-miel-500g.png",
    nombre_producto: "Miel <em>Artesanal</em>",
    caracteristicas: "Artesanal|Sin aditivos|Frasco 500 g",
    precio: "6500",
  },
  dato: { numero: "50.000+", texto_dato: "abejas pueden vivir en una sola colmena", tagline: "la magia de la colmena" },
  promo: {
    tagline: "llevá más, pagá menos",
    titulo: "Más miel, <em>mejor precio</em>",
    cta: "Pedila en la web",
    imagen_url: "https://melera.vercel.app/producto-miel-500g.png",
    promos: "1 frasco|$ 6.500|;5 frascos|$ 30.000|$ 6.000 c/u · ahorrás $ 2.500;10 frascos|$ 55.000|$ 5.500 c/u · ahorrás $ 10.000",
  },
};

describe("plantillas de Instagram de Melera", () => {
  it("los estilos son organico, geo y panal", () => {
    expect(g.estilosDelCliente()).toEqual(["organico", "geo", "panal"]);
  });

  it("logo embebido en las plantillas", () => {
    const html = g.buildHtml({ tipo: "dato", estilo: "geo", fecha: "2026-10-01", ...DATOS.dato });
    const logo = html.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/)?.[0] ?? "";
    expect(createHash("sha256").update(logo).digest("hex")).toMatchSnapshot();
  });

  for (const estilo of ["organico", "geo", "panal"]) {
    for (const tipo of Object.keys(DATOS)) {
      it(`${estilo}-${tipo}`, async () => {
        const html = g
          .buildHtml({ tipo, estilo, fecha: "2026-10-01", semilla: "12", ...DATOS[tipo] })
          // el logo se fija aparte (es una data URI enorme)
          .replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, "data:image/png;base64,LOGO");
        await expect(html).toMatchFileSnapshot(`./__snapshots__/plantillas/${estilo}-${tipo}.html`);
      });
    }
  }
});

describe("generación de posts de Melera", () => {
  const post = (id: number, tipo: PostIG["tipo"], estilo: PostIG["estilo"], extra: Partial<PostIG> = {}): PostIG => ({
    id,
    fecha: new Date("2026-09-28T00:00:00Z"),
    tipo,
    estilo,
    tema: "tema de prueba",
    nombreProducto: null,
    categoria: null,
    precio: null,
    presentacion: null,
    imagenUrl: null,
    productoId: null,
    estado: "pendiente",
    copy: null,
    caption: null,
    feedUrl: null,
    storyUrl: null,
    destino: null,
    feedMediaId: null,
    storyMediaId: null,
    telegramMessageId: null,
    error: null,
    generadoEn: null,
    publicadoEn: null,
    createdAt: new Date("2026-09-27T12:00:00Z"),
    updatedAt: new Date("2026-09-27T12:00:00Z"),
    ...extra,
  });

  it("datos firmados en las URLs, pedido a Gemini y textos de Telegram", async () => {
    db.posts = [
      post(12, "promo", "panal"),
      post(13, "producto", "geo", {
        nombreProducto: "Miel <em>Artesanal</em>",
        categoria: "miel pura",
        precio: "6500",
        presentacion: "frasco 500 g",
        imagenUrl: "https://melera.vercel.app/producto-miel-500g.png",
      }),
      post(14, "dato", "organico"),
    ];
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
      })
    );
    try {
      expect(await generarPendientes()).toEqual({ generados: 3, errores: 0, omitidos: 0, quedanPendientes: 0 });
    } finally {
      vi.unstubAllGlobals();
    }

    const imagenes = urls.map((url) => {
      const [, base, formato, token] = /^(.*)\/api\/img\/(feed|story)\/(.+)$/.exec(url)!;
      return { base, formato, datos: g.readImageToken(token) };
    });
    expect({ imagenes, gemini: copy.llamadas, telegram: { fotos: tg.fotos, mensajes: tg.mensajes } }).toMatchSnapshot();
  });
});
