import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ fila: null as unknown, falla: false }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    identidadCliente: {
      findUnique: async () => {
        if (db.falla) throw new Error("la base no responde");
        return db.fila;
      },
    },
  },
}));

import melera from "../clientes/melera/config";
import rino from "../clientes/rino/config";
import { identidadEfectiva, limpiarValores } from "@/plataforma/cliente/identidad";
import { contraste, escalaDeColor, TONOS } from "@/plataforma/cliente/escala";
import { getIdentidad } from "@/lib/identidad";

describe("identidad efectiva (config + cambios del dueño)", () => {
  it("sin cambios es exactamente la de la config", () => {
    for (const config of [melera, rino]) {
      const identidad = identidadEfectiva(config, {});
      expect(identidad.textos).toEqual(config.textos);
      expect(identidad.colores).toEqual(config.colores);
      expect(identidad.imagenes).toEqual(config.imagenes);
      expect(identidad.fondo).toBe(config.apariencia?.fondo ?? "claro");
      expect(identidad.cambios).toEqual({});
    }
    expect(identidadEfectiva(melera, null).textos).toEqual(melera.textos);
  });

  it("los cambios pisan solo lo que cambiaron", () => {
    const identidad = identidadEfectiva(rino, {
      textos: { hero: { titulo: "Nuevo título" }, pie: "Nuevo pie" },
      colorMarca: "#2563eb",
      fondo: "oscuro",
      imagenes: { logo: "https://cdn.example.com/logo.png" },
    });
    expect(identidad.textos.hero).toEqual({ ...rino.textos.hero, titulo: "Nuevo título" });
    expect(identidad.textos.pie).toBe("Nuevo pie");
    expect(identidad.textos.nosotros).toEqual(rino.textos.nosotros);
    expect(identidad.colores.marca[500]).toBe("#2563eb");
    expect(identidad.colores.claro).toBe(rino.colores.claro);
    expect(identidad.fondo).toBe("oscuro");
    expect(identidad.imagenes).toEqual({ ...rino.imagenes, logo: "https://cdn.example.com/logo.png" });
  });

  it("descarta lo que no valida, campo por campo (el resto se queda)", () => {
    expect(
      limpiarValores({
        textos: { hero: { titulo: "Bien", bajada: "" }, pie: 42, inventado: "x" },
        colorMarca: "rojo",
        fondo: "gris",
        imagenes: { logo: "http://inseguro.com/logo.png", compartir: "https://cdn.example.com/c.png" },
        otraCosa: true,
      })
    ).toEqual({ textos: { hero: { titulo: "Bien" } }, imagenes: { compartir: "https://cdn.example.com/c.png" } });
    expect(limpiarValores("no es un objeto")).toEqual({});
    expect(limpiarValores([1, 2])).toEqual({});
  });

  it("links de imagen: solo https públicos", () => {
    for (const malo of ["http://x.com/a.png", "https://localhost/a.png", "https://192.168.0.1/a.png", "javascript:alert(1)"]) {
      expect(limpiarValores({ imagenes: { logo: malo } }), malo).toEqual({});
    }
  });
});

describe("escala de colores desde un color", () => {
  it("el elegido es el 500, los claros más claros y los oscuros más oscuros", () => {
    const escala = escalaDeColor("#ea580c");
    expect(escala[500]).toBe("#ea580c");
    const brillo = (hex: string) => contraste(hex, "#000000");
    for (let i = 1; i < TONOS.length; i++) expect(brillo(escala[TONOS[i]]), `${TONOS[i]}`).toBeLessThan(brillo(escala[TONOS[i - 1]]));
  });

  it.each(["#ea580c", "#2563eb", "#facc15", "#a3e635", "#ffffff", "#000000", "#b8650a"])(
    "%s: el texto blanco se lee sobre el 700 (4,5:1) y el 600 (3:1)",
    (color) => {
      const escala = escalaDeColor(color);
      expect(contraste(escala[700], "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contraste(escala[600], "#ffffff")).toBeGreaterThanOrEqual(3);
      for (const tono of TONOS) expect(escala[tono]).toMatch(/^#[0-9a-f]{6}$/);
    }
  );
});

describe("getIdentidad", () => {
  it("lee los cambios guardados, y si la base falla usa la config", async () => {
    db.fila = { id: 1, valores: { textos: { pie: "Desde la base" } } };
    expect((await getIdentidad()).textos.pie).toBe("Desde la base");
  });

  it("con la base caída, la config", async () => {
    db.falla = true;
    const { cliente } = await import("@/plataforma/cliente");
    expect((await getIdentidad()).textos).toEqual(cliente.textos);
    db.falla = false;
  });
});
