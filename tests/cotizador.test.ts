import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Rino con el link a su cotizador
vi.mock("@cliente/config", async () => {
  const { default: rino } = await import("../clientes/rino/config");
  return { default: { ...rino, enlaceCotizador: { url: "https://cotizador.example.com/rino", texto: "Cotizá tu impresión" } } };
});
vi.mock("@cliente/tema", async () => await import("@/plataforma/tema/neutro"));
vi.mock("next/font/google", () => ({}));

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { esquemaCliente } from "@/plataforma/cliente/esquema";
import melera from "../clientes/melera/config";

describe("link al cotizador (config enlaceCotizador)", () => {
  it("el menú y el pie lo muestran, en otra pestaña", () => {
    for (const html of [renderToStaticMarkup(createElement(Header)), renderToStaticMarkup(createElement(Footer))]) {
      expect(html).toContain('href="https://cotizador.example.com/rino" target="_blank" rel="noopener noreferrer"');
      expect(html).toContain("Cotizá tu impresión");
    }
  });

  it("es opcional, con un texto por defecto, y solo acepta https", () => {
    const con = (enlaceCotizador: unknown) => esquemaCliente.safeParse({ ...melera, enlaceCotizador });
    expect(con(undefined).success).toBe(true);
    const ok = con({ url: "https://cotizador.example.com" });
    expect(ok.success && ok.data.enlaceCotizador?.texto).toBe("Cotizá tu impresión");
    expect(con({ url: "http://cotizador.example.com" }).success).toBe(false);
    expect(con({ url: "no es un link" }).success).toBe(false);
  });
});
