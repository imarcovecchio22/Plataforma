import { describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Las páginas con el cliente de ejemplo (sin tema propio): config de ejemplo y tema neutro.
vi.mock("@cliente/config", async () => await import("../clientes/ejemplo/config"));
vi.mock("@cliente/tema", async () => await import("@/plataforma/tema/neutro"));
vi.mock("next/font/google", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/product", () => ({
  getMainProduct: async () => ({ id: "p", nombre: "Producto de ejemplo", descripcion: "Descripción de ejemplo.", precio: 5000, stock: 10, escalones: [{ desde: 3, precio: 4500 }] }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { preguntaFrecuente: { findMany: async () => [] } } }));

import ejemplo from "../clientes/ejemplo/config";
import { problemasDeConfig } from "@/plataforma/cliente/validar";
import { imagenesFaltantes } from "@/plataforma/cliente/assets";
import { aliasCliente } from "../scripts/alias-cliente";
import RootLayout, { metadata } from "@/app/layout";
import PublicoLayout from "@/app/(publico)/layout";
import HomePage from "@/app/(publico)/page";
import ProductoPage from "@/app/(publico)/producto/page";
import ConsultasPage from "@/app/(publico)/consultas/page";
import PrivacidadPage from "@/app/(publico)/privacidad/page";
import AdminLoginPage from "@/app/admin/login/page";

const RAIZ = path.resolve(__dirname, "..");
const RASTROS_DE_MELERA = /melera|miel|frasco|abeja|colmena|panal|apícola|jofré|🐝|🍯/i;

describe("cliente de ejemplo", () => {
  it("su config es válida y sus imágenes existen", () => {
    expect(problemasDeConfig("ejemplo", ejemplo)).toEqual([]);
    expect(imagenesFaltantes(RAIZ, "ejemplo", ejemplo)).toEqual([]);
  });

  it("sin tema propio, @cliente/tema apunta al tema neutro", () => {
    expect(aliasCliente(RAIZ, "ejemplo")["@cliente/tema"]).toBe("./src/plataforma/tema/neutro.tsx");
    expect(aliasCliente(RAIZ, "melera")["@cliente/tema"]).toBe("./clientes/melera/tema/index.tsx");
  });

  it("las páginas públicas y el login del admin no tienen nada de Melera", async () => {
    const paginas = [
      renderToStaticMarkup(createElement(RootLayout, null, "x")),
      renderToStaticMarkup(createElement(PublicoLayout, null, await HomePage())),
      renderToStaticMarkup(createElement(PublicoLayout, null, await ProductoPage({ searchParams: Promise.resolve({}) }))),
      renderToStaticMarkup(createElement(PublicoLayout, null, await ConsultasPage({ searchParams: Promise.resolve({}) }))),
      renderToStaticMarkup(createElement(PublicoLayout, null, await PrivacidadPage())),
      renderToStaticMarkup(createElement(AdminLoginPage)),
      JSON.stringify(metadata),
    ].join("\n");
    expect(paginas).not.toMatch(RASTROS_DE_MELERA);
    expect(paginas).toContain("Tienda Ejemplo");
    expect(paginas).toContain("3 unidades a");
    expect(paginas).toContain('src="/logo.svg"');
  });
});

describe("tema neutro", () => {
  it("implementa el mismo contrato que el tema de Melera", () => {
    const melera = fs.readFileSync(path.join(RAIZ, "clientes", "melera", "tema.css"), "utf8");
    const neutro = fs.readFileSync(path.join(RAIZ, "src", "plataforma", "tema", "neutro.css"), "utf8");
    // Los renglones "Variables:" y "Clases:" del comentario de arriba de clientes/melera/tema.css
    const entre = (desde: string, hasta: string) => melera.slice(melera.indexOf(desde), melera.indexOf(hasta));
    const variables = [...entre("- Variables:", "Las fuentes").matchAll(/--[\w-]+/g)].map((m) => m[0]);
    const clases = [...entre("- Clases:", "El resto").matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    expect(variables.length).toBeGreaterThan(5);
    expect(clases.length).toBeGreaterThan(10);
    for (const v of variables) expect(neutro, v).toMatch(new RegExp(`${v}:`));
    for (const c of clases) expect(neutro, c).toMatch(new RegExp(`\\.${c}[\\s{:,]`));
  });
});
