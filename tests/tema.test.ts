import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Un cliente con un tema sin entrada, sin fondo animado y sin logo.
vi.mock("@cliente/tema", () => ({ default: {} }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import PublicoLayout from "@/app/(publico)/layout";
import RootLayout from "@/app/layout";

describe("layout público con un tema sin componentes", () => {
  const html = renderToStaticMarkup(createElement(PublicoLayout, null, createElement("main", null, "contenido")));

  it("no tiene entrada, fondo animado ni logo del panal", () => {
    expect(html).not.toContain("velo-entrada");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("logo-celda");
  });

  it("muestra el header con el nombre, el contenido y el footer", () => {
    expect(html).toMatch(/^<div class="tema-publico[^"]*"><header/);
    expect(html).toContain('aria-label="Melera, inicio"');
    expect(html).toContain("<main>contenido</main>");
    expect(html).toContain("</footer></div>");
  });
});

describe("layout raíz con un tema sin fuentes", () => {
  it("el body queda sin clases de next/font (se usan las fuentes del sistema de globals.css)", () => {
    const html = renderToStaticMarkup(createElement(RootLayout, null, "x"));
    expect(html).toContain('<body class="flex min-h-screen flex-col font-sans">');
    expect(html).toContain('<html lang="es"');
  });
});
