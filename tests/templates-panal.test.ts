import { beforeAll, describe, expect, it } from "vitest";
import * as g from "@/plataforma/imagenes/plantillas";
import { readFileSync } from "fs";
import path from "path";
import vm from "vm";
import { postIGSchema } from "@/lib/validation";


beforeAll(() => {
  process.env.IMAGE_SIGNING_SECRET = "secreto-de-prueba";
});

const DATOS = {
  presentacion: { tagline: "miel artesanal", titulo: "Miel de <em>Tomás Jofré</em>", texto: "Frasco de 500 g de Apícola Mercedes.", cta: "Escribinos por DM" },
  dato: { numero: "50.000+", texto_dato: "abejas pueden vivir en una sola colmena", tagline: "la magia de la colmena" },
  producto: { imagen_url: "https://melera.vercel.app/producto-miel-500g.png", nombre_producto: "Miel de <em>Tomás Jofré</em>", caracteristicas: "Miel pura|Frasco de 500 g", precio: "6500" },
} as const;

// panal-fondo.js corre en el navegador: acá se ejecuta en un contexto con un "window" mínimo
function cargarPanal() {
  const codigo = readFileSync(path.join(__dirname, "../clientes/melera/instagram/panal-fondo.js"), "utf8");
  const ctx = { window: {} as { MeleraPanal?: { panal: (w: number, h: number, s: string) => string; abeja: (o: object) => string } }, Math };
  vm.runInNewContext(codigo, ctx);
  return ctx.window.MeleraPanal!;
}

describe("estilo panal: validaciones", () => {
  it("generate.js lo acepta para los 3 tipos, sin dejar de aceptar orgánico y geo", () => {
    expect(g.estilosDelCliente()).toEqual(["organico", "geo", "panal"]);
    for (const [tipo, datos] of Object.entries(DATOS)) {
      expect(() => g.validateData({ tipo, estilo: "panal", fecha: "2026-09-25", ...datos })).not.toThrow();
    }
    expect(() => g.validateData({ tipo: "dato", estilo: "otro", fecha: "2026-09-25", ...DATOS.dato })).toThrow(/Estilo/);
  });

  it("el formulario del admin lo acepta", () => {
    const r = postIGSchema.safeParse({ fecha: "2026-09-25", tipo: "dato", estilo: "panal", tema: "Cuánto vive una abeja" });
    expect(r.success).toBe(true);
  });
});

describe("estilo panal: plantillas", () => {
  it.each(Object.keys(DATOS))("%s se arma sin placeholders sin reemplazar y con el dibujo del panal incluido", (tipo) => {
    const html: string = g.buildHtml({ tipo, estilo: "panal", fecha: "2026-09-25", semilla: "42", ...DATOS[tipo as keyof typeof DATOS] });
    expect(html).not.toMatch(/\{\{\s*[#/]?\w+[^{}]*\}\}/); // {{campo}}, {{#if x}}, {{/if}}
    expect(html).not.toContain("<!--PANAL_JS-->");
    expect(html).toContain("window.MeleraPanal");
    expect(html).toContain('semilla="42"');
    expect(html).toContain("data:image/png;base64,"); // el logo embebido
    expect(html).toContain("window.__plantillaLista"); // render.js espera a que termine de dibujar
  });

  it("respeta <em> en el título y escapa el resto", () => {
    const html: string = g.buildHtml({ tipo: "presentacion", estilo: "panal", fecha: "2026-09-25", ...DATOS.presentacion, texto: "<script>x</script>" });
    expect(html).toContain("Miel de <em>Tomás Jofré</em>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });

  it("la semilla viaja firmada en la URL de la imagen", () => {
    const token = g.createImageToken({ tipo: "dato", estilo: "panal", fecha: "2026-09-25", semilla: "17", ...DATOS.dato });
    expect(g.readImageToken(token).semilla).toBe("17");
  });
});

describe("estilo panal: el fondo es determinístico", () => {
  const P = cargarPanal();

  it("misma semilla, mismo panal; semillas distintas, panales distintos", () => {
    expect(P.panal(1080, 1350, "5")).toBe(P.panal(1080, 1350, "5"));
    expect(P.panal(1080, 1350, "5")).not.toBe(P.panal(1080, 1350, "6"));
  });

  it("sin semilla usa un valor fijo (siempre el mismo)", () => {
    expect(P.panal(1080, 1350, "")).toBe(P.panal(1080, 1350, "7"));
  });

  it.each([
    ["feed", 1080, 1350],
    ["historia", 1080, 1920],
  ])("cubre todo el %s (%i×%i) con celdas, luz y viñeta", (_f, w, h) => {
    const svg = P.panal(w, h, "3");
    expect(svg).toContain(`viewBox="0 0 ${w} ${h}"`);
    expect((svg.match(/<polygon/g) ?? []).length).toBeGreaterThan(100);
    expect(svg).toContain('fill="url(#fpl)"'); // luz cálida
    expect(svg).toContain('fill="url(#fpv)"'); // viñeta
    expect(svg).toContain('fill="url(#fph)"'); // hay celdas con miel
  });

  it("la abeja lleva el jarrón y las gotas pedidas", () => {
    const svg = P.abeja({ x: 800, y: 300, gotas: [[790, 420], [780, 460], [770, 500]] });
    expect(svg).toContain("translate(800 300)");
    expect((svg.match(/fill="url\(#fpbd\)"/g) ?? []).length).toBe(3); // 3 gotas
    expect(svg).toContain("url(#fpbjr)"); // el jarrón
  });
});
