import { describe, expect, it } from "vitest";
import { atributosDeFondo, familiasDe, urlFuentes, variablesDeFuentes } from "@/plataforma/cliente/apariencia";
import { esquemaCliente } from "@/plataforma/cliente/esquema";
import ejemplo from "../clientes/ejemplo/config";
import melera from "../clientes/melera/config";

describe("apariencia del tema neutro", () => {
  const conFuentes = { fondo: "oscuro" as const, fuentes: { titulos: "Space Grotesk", texto: "Inter" } };

  it("sin apariencia (Melera, ejemplo): nada que agregar al layout", () => {
    for (const cliente of [melera, ejemplo]) {
      expect(urlFuentes(cliente.apariencia)).toBeNull();
      expect(variablesDeFuentes(cliente.apariencia)).toBe("");
      expect(atributosDeFondo(cliente.apariencia)).toEqual({});
    }
  });

  it("arma la hoja de Google Fonts con las dos familias y los pesos del tema", () => {
    expect(urlFuentes(conFuentes)).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
    );
    expect(familiasDe({ fondo: "claro", fuentes: { texto: "Inter", titulos: "Inter" } })).toEqual(["Inter"]);
  });

  it("define las variables de fuente del contrato de tema, con la de respaldo", () => {
    expect(variablesDeFuentes(conFuentes)).toBe(
      'body{--fuente-texto:"Inter",system-ui,sans-serif;--fuente-titulos:"Space Grotesk",Georgia,serif}'
    );
    expect(variablesDeFuentes({ fondo: "claro", fuentes: { titulos: "Lobster" } })).toBe('body{--fuente-titulos:"Lobster",Georgia,serif}');
  });

  it("fondo oscuro con un atributo en el <html>", () => {
    expect(atributosDeFondo(conFuentes)).toEqual({ "data-fondo": "oscuro" });
    expect(atributosDeFondo({ fondo: "claro" })).toEqual({});
  });

  it("la config rechaza nombres de fuente que no son de Google Fonts (no pueden romper la URL ni el CSS)", () => {
    const base = { ...melera, apariencia: undefined };
    for (const mala of ['Inter"}body{x', "Inter&family=Otra", "../x", ""]) {
      expect(esquemaCliente.safeParse({ ...base, apariencia: { fuentes: { texto: mala } } }).success, mala).toBe(false);
    }
    expect(esquemaCliente.safeParse({ ...base, apariencia: { fuentes: { texto: "Space Grotesk" } } }).success).toBe(true);
    expect(esquemaCliente.safeParse({ ...base, apariencia: { fondo: "gris" } }).success).toBe(false);
  });
});
