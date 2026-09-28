import { beforeAll, describe, expect, it } from "vitest";
import * as g from "@/plataforma/imagenes/plantillas";
import path from "path";
import ejemplo from "../clientes/ejemplo/config";


// generate.js es CommonJS y lee el secreto de firma del entorno.
beforeAll(() => {
  process.env.IMAGE_SIGNING_SECRET = "secreto-de-prueba";
});

describe("renderTemplate: escapado", () => {
  it("escapa HTML en campos comunes", () => {
    const html = g.renderTemplate("<p>{{texto}}</p>", { texto: '<img src=x onerror="alert(1)">' });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("en titulo solo permite <em>, <i> y <br>", () => {
    const html = g.renderTemplate("<h1>{{titulo}}</h1>", {
      titulo: 'Pura <em>natural</em><br><script>alert(1)</script><b onclick="x">b</b>',
    });
    expect(html).toContain("<em>natural</em><br>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b ");
  });

  it("no deja cerrar el url('') del CSS con imagen_url", () => {
    const html = g.renderTemplate("url('{{imagen_url}}')", {
      imagen_url: "https://x.com/a.png'); background:url(https://evil.com/x",
    });
    expect(html).not.toMatch(/url\('[^']*'\)\s*;/);
    expect(html).not.toContain("'); background");
  });

  it("variables faltantes quedan vacías", () => {
    expect(g.renderTemplate("[{{nada}}]", {})).toBe("[]");
  });
});

describe("normalizeData", () => {
  it("formatea precios numéricos", () => {
    expect(g.normalizeData({ precio: "6500" }).precio).toBe("$6.500");
    expect(g.normalizeData({ precio: "$6.500" }).precio).toBe("$6.500");
    expect(g.normalizeData({ precio: "6500 ARS" }).precio).toBe("6500 ARS");
  });

  it("saca etiquetas que repiten el precio", () => {
    const d = g.normalizeData({
      precio: "6500",
      caracteristica_1: "Miel pura",
      caracteristica_2: "Frasco 500 g",
      caracteristica_3: "$6.500",
    });
    expect(d.caracteristicas).toBe("Miel pura|Frasco 500 g");
  });

  it("mapea los nombres viejos de la Sheet", () => {
    const d = g.normalizeData({ subtitulo: "texto", numero: "50.000", sufijo: "+" });
    expect(d.texto).toBe("texto");
    expect(d.numero).toBe("50.000+");
  });
});

describe("validateData", () => {
  it("rechaza tipo o estilo desconocidos", () => {
    expect(() => g.validateData({ tipo: "otro", estilo: "geo", fecha: "x" })).toThrow();
    expect(() => g.validateData({ tipo: "dato", estilo: "../../etc", fecha: "x" })).toThrow();
  });

  it("exige los campos del tipo", () => {
    expect(() => g.validateData({ tipo: "producto", estilo: "geo", fecha: "x" })).toThrow(/imagen_url/);
  });
});

describe("tokens de imagen firmados", () => {
  const datos = {
    tipo: "dato",
    estilo: "geo",
    fecha: "2026-09-24",
    numero: "50.000",
    texto_dato: "abejas en una colmena",
    tagline: "la magia",
  };

  it("ida y vuelta conserva los datos", () => {
    const token = g.createImageToken(datos);
    expect(g.readImageToken(token)).toMatchObject({ tipo: "dato", numero: "50.000" });
  });

  it("tolera .jpg agregados", () => {
    const token = g.createImageToken(datos);
    expect(g.readImageToken(`${token}.jpg.jpg`)).toMatchObject({ tipo: "dato" });
  });

  it("rechaza tokens alterados", () => {
    const token: string = g.createImageToken(datos);
    const [payload, firma] = token.split(".");
    const otroPayload = g.createImageToken({ ...datos, numero: "1" }).split(".")[0];
    expect(() => g.readImageToken(`${otroPayload}.${firma}`)).toThrow(/Firma/);
    expect(() => g.readImageToken(`${payload}.xxxxxxxxxxxxxxxxxxxxxx`)).toThrow(/Firma/);
    expect(() => g.readImageToken("basura")).toThrow();
  });
});

describe("estilos y plantillas del cliente", () => {
  const carpeta = (slug: string) => path.resolve(__dirname, "..", "clientes", slug, "instagram");

  it("Melera y el ejemplo tienen todas las plantillas de los estilos que declaran", () => {
    expect(g.plantillasFaltantes(carpeta("melera"), g.estilosDelCliente())).toEqual([]);
    expect(g.plantillasFaltantes(carpeta("ejemplo"), ejemplo.estilosInstagram.map((e) => e.id))).toEqual([]);
  });

  it("detecta las plantillas que faltan de un estilo declarado", () => {
    expect(g.plantillasFaltantes(carpeta("melera"), ["neon"])).toEqual([
      "neon-presentacion.html",
      "neon-producto.html",
      "neon-dato.html",
      "neon-promo.html",
    ]);
  });

  it("solo el panal usa la semilla (el id del post)", () => {
    expect(g.estiloUsaSemilla("panal")).toBe(true);
    expect(g.estiloUsaSemilla("geo")).toBe(false);
    expect(g.estiloUsaSemilla("inventado")).toBe(false);
  });

  it("rechaza un estilo que el cliente no declara", () => {
    expect(() => g.validateData({ tipo: "dato", estilo: "simple", fecha: "x", numero: "1", texto_dato: "x" })).toThrow(
      /Estilo "simple" inválido. Debe ser uno de: organico, geo, panal/
    );
  });
});
