import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const db = vi.hoisted(() => ({
  preguntaFrecuente: {
    findMany: vi.fn(async () => [] as unknown[]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const logs = vi.hoisted(() => ({ logEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/logs", () => ({ ...logs, errorMessage: (e: unknown) => String(e) }));

vi.mock("@/lib/product", () => ({
  getMainProduct: async () => ({ id: "p", nombre: "Miel Artesanal 500g", descripcion: "", precio: 6500, stock: 5, escalones: [] }),
}));

import { armarRespuesta, partesRespuesta } from "@/lib/preguntas";
import { preguntaFrecuenteSchema } from "@/lib/validation";
import RespuestaFrecuente from "@/components/RespuestaFrecuente";
import { POST as crear } from "@/app/api/admin/preguntas/route";
import { DELETE as borrar, PATCH as editar } from "@/app/api/admin/preguntas/[id]/route";
import ConsultasPage from "@/app/(publico)/consultas/page";
import seedMelera from "../clientes/melera/seed";

const DATOS = { nombre: "Miel Artesanal 500g", precio: "$ 6.500", promos: "5 frascos a $ 30.000" };

describe("armarRespuesta", () => {
  it("reemplaza $PRODUCTO, $PRECIO y $PROMOS", () => {
    expect(armarRespuesta("$PRODUCTO a $PRECIO ($PROMOS)", DATOS)).toBe("Miel Artesanal 500g a $ 6.500 (5 frascos a $ 30.000)");
  });

  it("[[ ]] aparece solo si hay promos", () => {
    const r = "Sale $PRECIO.[[ Promo: $PROMOS.]]";
    expect(armarRespuesta(r, DATOS)).toBe("Sale $ 6.500. Promo: 5 frascos a $ 30.000.");
    expect(armarRespuesta(r, { ...DATOS, promos: "" })).toBe("Sale $ 6.500.");
  });

  it("la pregunta del precio de Melera queda igual que antes, con y sin promos", () => {
    const precio = seedMelera.preguntas[0].respuesta;
    expect(armarRespuesta(precio, DATOS)).toBe(
      "El frasco de Miel Artesanal 500g sale $ 6.500. Llevando más sale menos: 5 frascos a $ 30.000."
    );
    expect(armarRespuesta(precio, { ...DATOS, promos: "" })).toBe("El frasco de Miel Artesanal 500g sale $ 6.500.");
  });
});

describe("links en las respuestas", () => {
  it("separa texto y links", () => {
    expect(partesRespuesta("Si querés, [escribinos](#escribinos) o [comprá](/producto).")).toEqual([
      { texto: "Si querés, " },
      { texto: "escribinos", href: "#escribinos" },
      { texto: " o " },
      { texto: "comprá", href: "/producto" },
      { texto: "." },
    ]);
  });

  it.each(["javascript:alert(1)", "http://sitio.com", "data:text/html,x", "//otro.com"])(
    "un destino no permitido (%s) queda como texto",
    (destino) => {
      const texto = `[clic](${destino})`;
      expect(partesRespuesta(texto)).toEqual([{ texto }]);
    }
  );

  it("los links https abren en otra pestaña; los internos no", () => {
    const html = renderToStaticMarkup(
      createElement(RespuestaFrecuente, { texto: "[a](https://instagram.com/x) [b](#escribinos)", claseLink: "l" })
    );
    expect(html).toBe(
      '<a href="https://instagram.com/x" class="l" target="_blank" rel="noopener noreferrer">a</a> <a href="#escribinos" class="l">b</a>'
    );
  });

  it("escapa el HTML de la respuesta", () => {
    const html = renderToStaticMarkup(createElement(RespuestaFrecuente, { texto: "<script>x</script>", claseLink: "l" }));
    expect(html).toBe("&lt;script&gt;x&lt;/script&gt;");
  });
});

describe("preguntaFrecuenteSchema", () => {
  const valida = { pregunta: "¿Cómo pago?", respuesta: "Con Mercado Pago.", orden: 10, activa: true };

  it("acepta una pregunta completa", () => {
    expect(preguntaFrecuenteSchema.safeParse(valida).success).toBe(true);
  });

  it.each([
    [{ pregunta: "" }, "Escribí la pregunta"],
    [{ respuesta: "x".repeat(1501) }, "hasta 1500"],
    [{ orden: 1.5 }, "número entero"],
  ])("rechaza %j", (cambio, mensaje) => {
    const r = preguntaFrecuenteSchema.safeParse({ ...valida, ...cambio });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain(mensaje);
  });

  it("todas las preguntas del seed de Melera son válidas", () => {
    for (const p of seedMelera.preguntas) {
      expect(preguntaFrecuenteSchema.safeParse({ ...p, activa: true }).success).toBe(true);
    }
  });
});

describe("/api/admin/preguntas", () => {
  const pedido = (method: string, body?: unknown) =>
    new NextRequest("https://melera.vercel.app/api/admin/preguntas", {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const pregunta = { pregunta: "¿Cómo pago?", respuesta: "Con Mercado Pago.", orden: 10, activa: true };

  beforeEach(() => vi.clearAllMocks());

  it("crea una pregunta y la registra en los logs", async () => {
    db.preguntaFrecuente.create.mockResolvedValue({ id: 7, ...pregunta });
    const res = await crear(pedido("POST", pregunta));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 7 });
    expect(db.preguntaFrecuente.create).toHaveBeenCalledWith({ data: pregunta });
    expect(logs.logEvent).toHaveBeenCalledWith("admin", "Pregunta frecuente #7 creada: ¿Cómo pago?");
  });

  it("con datos inválidos responde 400 sin tocar la base", async () => {
    const res = await crear(pedido("POST", { ...pregunta, pregunta: "" }));
    expect(res.status).toBe(400);
    expect(db.preguntaFrecuente.create).not.toHaveBeenCalled();
  });

  it("PATCH { activa } solo la muestra u oculta", async () => {
    db.preguntaFrecuente.update.mockResolvedValue({ id: 7, ...pregunta, activa: false });
    const res = await editar(pedido("PATCH", { activa: false }), ctx("7"));
    expect(res.status).toBe(200);
    expect(db.preguntaFrecuente.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { activa: false } });
    expect(logs.logEvent).toHaveBeenCalledWith("admin", "Pregunta frecuente #7 oculta: ¿Cómo pago?");
  });

  it("PATCH completo la edita", async () => {
    db.preguntaFrecuente.update.mockResolvedValue({ id: 7, ...pregunta });
    const res = await editar(pedido("PATCH", pregunta), ctx("7"));
    expect(res.status).toBe(200);
    expect(db.preguntaFrecuente.update).toHaveBeenCalledWith({ where: { id: 7 }, data: pregunta });
  });

  it("PATCH o DELETE de una que no existe responden 404", async () => {
    db.preguntaFrecuente.update.mockRejectedValue(new Error("no existe"));
    db.preguntaFrecuente.delete.mockRejectedValue(new Error("no existe"));
    expect((await editar(pedido("PATCH", pregunta), ctx("99"))).status).toBe(404);
    expect((await borrar(pedido("DELETE"), ctx("99"))).status).toBe(404);
  });

  it("DELETE la borra", async () => {
    db.preguntaFrecuente.delete.mockResolvedValue({ id: 7, ...pregunta });
    const res = await borrar(pedido("DELETE"), ctx("7"));
    expect(res.status).toBe(200);
    expect(db.preguntaFrecuente.delete).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it("un id que no es número responde 400", async () => {
    expect((await borrar(pedido("DELETE"), ctx("abc"))).status).toBe(400);
  });
});

describe("/consultas", () => {
  it("pide solo las preguntas visibles, en orden", async () => {
    await ConsultasPage({ searchParams: Promise.resolve({}) });
    expect(db.preguntaFrecuente.findMany).toHaveBeenCalledWith({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { id: "asc" }],
    });
  });

  it("sin preguntas no muestra la sección de preguntas frecuentes (sí el formulario)", async () => {
    db.preguntaFrecuente.findMany.mockResolvedValue([]);
    const html = renderToStaticMarkup(await ConsultasPage({ searchParams: Promise.resolve({}) }));
    expect(html).not.toContain("Preguntas frecuentes");
    expect(html).toContain("Escribinos");
  });
});
