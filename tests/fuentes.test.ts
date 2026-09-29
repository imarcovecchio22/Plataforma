import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { bloquesLatinos, descargarFuentes, FuenteInexistente, nombreLocal } from "@/plataforma/cliente/fuentes";

const cara = (subconjunto: string, peso: number, archivo: string) => `/* ${subconjunto} */
@font-face {
  font-family: 'Inter';
  font-weight: ${peso};
  src: url(https://fonts.gstatic.com/s/inter/v20/${archivo}.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}`;
const HOJA = [cara("cyrillic", 400, "cir"), cara("latin-ext", 400, "ext"), cara("latin", 400, "lat"), cara("latin", 700, "lat")].join("\n");

const APARIENCIA = { fondo: "claro" as const, fuentes: { texto: "Inter" } };

/** Un fetch de mentira: la hoja de Google y los archivos, sin internet. */
function fetchFalso(estadoHoja = 200) {
  const pedidos: string[] = [];
  const pedir = (async (url: string) => {
    pedidos.push(url);
    if (url.startsWith("https://fonts.googleapis.com")) return new Response(estadoHoja === 200 ? HOJA : "", { status: estadoHoja });
    return new Response(new Uint8Array([1, 2, 3]));
  }) as unknown as typeof fetch;
  return { pedir, pedidos };
}

describe("fuentes de Google servidas desde el sitio", () => {
  it("se queda con latin y latin-ext", () => {
    const bloques = bloquesLatinos(HOJA);
    expect(bloques.map((b) => b.url.split("/").pop())).toEqual(["ext.woff2", "lat.woff2", "lat.woff2"]);
  });

  it("nombra cada archivo por su ruta en Google (sin repetir)", () => {
    expect(nombreLocal("https://fonts.gstatic.com/s/inter/v20/UcC73.woff2")).toBe("inter-v20-UcC73.woff2");
  });

  it("baja cada archivo una vez y reescribe las URLs a /fuentes/", async () => {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "fuentes-"));
    const { pedir, pedidos } = fetchFalso();
    const css = await descargarFuentes(raiz, APARIENCIA, pedir);
    expect(pedidos.filter((u) => u.includes("gstatic"))).toHaveLength(2);
    expect(fs.readdirSync(path.join(raiz, "public", "fuentes")).sort()).toEqual(["inter-v20-ext.woff2", "inter-v20-lat.woff2"]);
    expect(css).toContain("url(/fuentes/inter-v20-lat.woff2)");
    expect(css).not.toContain("gstatic");
    expect(css).not.toContain("cir");
    fs.rmSync(raiz, { recursive: true });
  });

  it("sin fuentes en la config no pide nada; si Google no la tiene, avisa con su error", async () => {
    const { pedir, pedidos } = fetchFalso();
    expect(await descargarFuentes("/no-se-usa", { fondo: "claro" }, pedir)).toBe("");
    expect(pedidos).toEqual([]);
    await expect(descargarFuentes(os.tmpdir(), APARIENCIA, fetchFalso(400).pedir)).rejects.toBeInstanceOf(FuenteInexistente);
  });
});
