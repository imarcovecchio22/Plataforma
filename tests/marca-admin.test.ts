import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({ upsert: vi.fn(async (op: unknown) => void op) }));
vi.mock("@/lib/prisma", () => ({ prisma: { identidadCliente: { upsert: db.upsert } } }));
const logs = vi.hoisted(() => ({ logEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/logs", () => logs);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import { PUT } from "@/app/api/admin/marca/route";
import { textosCambiados, textosIniciales, type TextosMarca } from "@/components/admin/MarcaForm";

const guardar = (body: unknown) => PUT(new NextRequest("https://x.com/api/admin/marca", { method: "PUT", body: JSON.stringify(body) }));

const DEFECTO: TextosMarca = {
  heroTitulo: "Título", heroBajada: "Bajada", heroBoton: "Conocenos", nosotrosTitulo: "Nosotros",
  nosotrosParrafos: "Uno.\n\nDos.", pie: "Pie", descripcionConsultas: "Consultas", aclaracionPrecio: "por unidad",
};

beforeEach(() => vi.clearAllMocks());

describe("API de la marca", () => {
  it("guarda lo que cambió (y lo registra)", async () => {
    const valores = { textos: { pie: "Pie nuevo" }, colorMarca: "#2563eb", imagenes: { logo: "https://cdn.example.com/l.png" } };
    expect((await guardar(valores)).status).toBe(200);
    expect(db.upsert).toHaveBeenCalledWith({ where: { id: 1 }, create: { id: 1, valores }, update: { valores } });
    expect(logs.logEvent).toHaveBeenCalledWith("admin", "Marca actualizada: cambia textos, color, imágenes");
  });

  it("sin cambios: todo vuelve a la config", async () => {
    await guardar({});
    expect(db.upsert.mock.calls[0][0]).toMatchObject({ update: { valores: {} } });
    expect(logs.logEvent).toHaveBeenCalledWith("admin", "Marca actualizada: todo como en la config");
  });

  it.each([
    [{ colorMarca: "azul" }, "colorMarca"],
    [{ imagenes: { logo: "http://inseguro.com/l.png" } }, "imagenes.logo"],
    [{ textos: { hero: { titulo: "x".repeat(81) } } }, "textos.hero.titulo"],
    [{ textos: { nosotros: { parrafos: [] } } }, "textos.nosotros.parrafos"],
    [{ fondo: "gris" }, "fondo"],
    [{ otraCosa: 1 }, ""],
  ])("rechaza %j con 400 diciendo qué campo", async (valores, campo) => {
    const res = await guardar(valores);
    expect(res.status).toBe(400);
    if (campo) expect((await res.json()).campo).toBe(campo);
    expect(db.upsert).not.toHaveBeenCalled();
  });
});

describe("formulario de la marca", () => {
  it("muestra los cambios encima de la config", () => {
    const t = textosIniciales(DEFECTO, { hero: { titulo: "Nuevo" }, nosotros: { parrafos: ["A", "B"] } });
    expect(t.heroTitulo).toBe("Nuevo");
    expect(t.heroBajada).toBe("Bajada");
    expect(t.nosotrosParrafos).toBe("A\n\nB");
  });

  it("manda solo lo que difiere de la config; un campo vacío vuelve a la config", () => {
    expect(textosCambiados(DEFECTO, DEFECTO)).toEqual({});
    expect(textosCambiados({ ...DEFECTO, heroTitulo: "  Nuevo  ", pie: "", nosotrosParrafos: "Uno.\n\n\nTres." }, DEFECTO)).toEqual({
      hero: { titulo: "Nuevo" },
      nosotros: { parrafos: ["Uno.", "Tres."] },
    });
    // Los mismos párrafos con otros espacios no son un cambio
    expect(textosCambiados({ ...DEFECTO, nosotrosParrafos: "Uno.  \n\n  Dos." }, DEFECTO)).toEqual({});
  });
});
