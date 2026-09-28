import { beforeAll, describe, expect, it } from "vitest";
import * as g from "@/plataforma/imagenes/plantillas";
import { postIGSchema } from "@/lib/validation";
import { promosParaPlantilla } from "@/lib/precios";
import { armarPrompt } from "@/lib/instagram/copy";

beforeAll(() => {
  process.env.IMAGE_SIGNING_SECRET = "secreto-de-prueba";
});

const ESC = [{ desde: 5, precio: 6000 }, { desde: 10, precio: 5500 }];

describe("posts de Instagram tipo promo", () => {
  it("las filas salen de los precios reales (total, precio por frasco y ahorro)", () => {
    const filas = promosParaPlantilla(6500, ESC).split(";").map((f) => f.split("|"));
    expect(filas).toHaveLength(3);
    expect(filas[0][0]).toBe("1 frasco");
    expect(filas[0][1]).toMatch(/6\.500/);
    expect(filas[1][0]).toBe("5 frascos");
    expect(filas[1][1]).toMatch(/30\.000/);
    expect(filas[1][2]).toMatch(/6\.000 c\/u · ahorrás .*2\.500/);
    expect(filas[2][1]).toMatch(/55\.000/);
    expect(filas[2][2]).toMatch(/ahorrás .*10\.000/);
  });

  it("el formulario del admin acepta el tipo promo sin pedir datos de producto", () => {
    expect(postIGSchema.safeParse({ fecha: "2026-10-01", tipo: "promo", estilo: "panal", tema: "Promo de lanzamiento" }).success).toBe(true);
  });

  it("generate.js exige título y promos", () => {
    expect(() => g.validateData({ tipo: "promo", estilo: "geo", fecha: "2026-10-01", titulo: "Más miel" })).toThrow(/promos/);
    expect(() => g.validateData({ tipo: "promo", estilo: "geo", fecha: "2026-10-01", titulo: "Más miel", promos: promosParaPlantilla(6500, ESC) })).not.toThrow();
  });

  it.each(["organico", "geo", "panal"])("la plantilla %s-promo se arma sin placeholders sin reemplazar", (estilo) => {
    const html: string = g.buildHtml({
      tipo: "promo", estilo, fecha: "2026-10-01", semilla: "3",
      tagline: "llevá más, pagá menos", titulo: "Más miel, <em>mejor precio</em>", cta: "Pedila en la web",
      imagen_url: "https://melera.vercel.app/producto-miel-500g.png",
      promos: promosParaPlantilla(6500, ESC),
    });
    expect(html).not.toMatch(/\{\{\s*[#/]?\w+[^{}]*\}\}/);
    expect(html).toContain("Más miel, <em>mejor precio</em>");
    expect(html).toContain("data-promos=\"1 frasco|");
    expect(html).toContain("Pedila en la web");
  });

  it("las promos viajan firmadas en el token de la imagen", () => {
    const promos = promosParaPlantilla(6500, ESC);
    const token = g.createImageToken({ tipo: "promo", estilo: "panal", fecha: "2026-10-01", titulo: "Más miel", promos });
    expect(g.readImageToken(token).promos).toBe(promos);
  });

  it("a Gemini le llegan las promos reales solo en los posts promo", () => {
    const base = { tema: "Promo de lanzamiento", nombreProducto: null, categoria: null, precio: null, presentacion: null };
    const conPromo = armarPrompt({ ...base, tipo: "promo" }, "1 frasco a $ 6.500 · 5 frascos a $ 30.000");
    expect(conPromo).toContain("5 frascos a $ 30.000");
    expect(conPromo).toContain("no inventes otros números");
    expect(armarPrompt({ ...base, tipo: "dato" }, "5 frascos a $ 30.000")).not.toContain('"promos"');
  });
});
