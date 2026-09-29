import { describe, expect, it, vi } from "vitest";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Las páginas con la config de Rino (sin tema propio: tema neutro) y los productos de su seed.
vi.mock("@cliente/config", async () => await import("../clientes/rino/config"));
vi.mock("@cliente/tema", async () => await import("@/plataforma/tema/neutro"));
vi.mock("next/font/google", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }));
const catalogo = vi.hoisted(() => ({ productos: [] as Record<string, unknown>[], categorias: [] as { nombre: string; slug: string }[] }));
vi.mock("@/lib/product", () => ({
  getMainProduct: async () => catalogo.productos[0] ?? null,
  getProductosActivos: async () => catalogo.productos,
  getProductoPorSlug: async (slug: string) => catalogo.productos.find((p) => p.slug === slug) ?? null,
  contarProductosActivos: async () => catalogo.productos.length,
  getCategoriasConProductos: async () => catalogo.categorias,
}));
vi.mock("@/lib/zonas", async () => (await import("./zonas-de-prueba")).mockZonas("rino"));
vi.mock("@/lib/prisma", () => ({ prisma: { preguntaFrecuente: { findMany: async () => [] } } }));

import rino from "../clientes/rino/config";
import seedRino from "../clientes/rino/seed";
import { problemasDeConfig } from "@/plataforma/cliente/validar";
import { imagenesFaltantes } from "@/plataforma/cliente/assets";
import { aliasCliente } from "../scripts/alias-cliente";
import { autoRespuestaSchema, postIGSchema } from "@/lib/validation";
import RootLayout, { metadata } from "@/app/layout";
import PublicoLayout from "@/app/(publico)/layout";
import HomePage from "@/app/(publico)/page";
import ProductosPage from "@/app/(publico)/productos/page";
import FichaPage from "@/app/(publico)/producto/[slug]/page";
import ConsultasPage from "@/app/(publico)/consultas/page";
import PrivacidadPage from "@/app/(publico)/privacidad/page";
import AdminLoginPage from "@/app/admin/login/page";

const RAIZ = path.resolve(__dirname, "..");
const RASTROS_DE_MELERA = /melera|miel|frasco|abeja|colmena|panal|apícola|jofré|🐝|🍯/i;
const RASTROS_DEL_EJEMPLO = /tienda ejemplo|tienda-ejemplo|tienda\.ejemplo|producto de ejemplo/i;

catalogo.categorias = seedRino.categorias ?? [];
catalogo.productos = (seedRino.productos ?? []).map(({ categoria, ...p }, i) => ({
  id: `p${i}`, imagenUrl: null, activo: true, orden: (i + 1) * 10, escalones: [], unidadSingular: null,
  unidadPlural: null, unidadGenero: null, aclaracionPrecio: null, ...p,
  categoria: catalogo.categorias.map((c, j) => ({ ...c, orden: j })).find((c) => c.slug === categoria) ?? null,
}));

describe("cliente Rino", () => {
  it("su config es válida y sus imágenes existen", () => {
    expect(problemasDeConfig("rino", rino)).toEqual([]);
    expect(imagenesFaltantes(RAIZ, "rino", rino)).toEqual([]);
  });

  it("sin tema propio, usa el tema neutro", () => {
    expect(aliasCliente(RAIZ, "rino")["@cliente/tema"]).toBe("./src/plataforma/tema/neutro.tsx");
  });

  it("sus páginas no tienen nada de Melera ni del cliente de ejemplo", async () => {
    const paginas = [
      renderToStaticMarkup(createElement(RootLayout, null, "x")),
      renderToStaticMarkup(createElement(PublicoLayout, null, await HomePage())),
      renderToStaticMarkup(createElement(PublicoLayout, null, await ProductosPage({ searchParams: Promise.resolve({}) }))),
      renderToStaticMarkup(
        createElement(PublicoLayout, null, await FichaPage({ params: Promise.resolve({ slug: "maceta-geometrica" }), searchParams: Promise.resolve({}) }))
      ),
      renderToStaticMarkup(createElement(PublicoLayout, null, await ConsultasPage({ searchParams: Promise.resolve({}) }))),
      renderToStaticMarkup(createElement(PublicoLayout, null, await PrivacidadPage())),
      renderToStaticMarkup(createElement(AdminLoginPage)),
      JSON.stringify(metadata),
    ].join("\n");
    expect(paginas).not.toMatch(RASTROS_DE_MELERA);
    expect(paginas).not.toMatch(RASTROS_DEL_EJEMPLO);
    expect(paginas).toContain("3DRinoMaker");
    expect(paginas).toContain("Maceta geométrica");
    expect(paginas).toContain("3 piezas a");
    expect(paginas).toContain('src="/logo.svg"');
  });

  it("home de catálogo: la marca sin precio, todos los productos y el menú a la grilla", async () => {
    const home = renderToStaticMarkup(createElement(PublicoLayout, null, await HomePage()));
    expect(home).toContain("Ver productos");
    expect(home).not.toContain("Comprar ahora");
    for (const p of catalogo.productos) expect(home).toContain(`href="/producto/${p.slug}"`);
    expect(home).toContain('href="/#productos"');
    expect(home).toContain('href="/productos"');
    expect(home).toContain('id="nosotros"');
  });

  it("sus respuestas automáticas de muestra son válidas, arrancan apagadas y siguen al catálogo", () => {
    const reglas = seedRino.autorespuestas ?? [];
    expect(reglas.length).toBeGreaterThan(0);
    for (const r of reglas) {
      expect(autoRespuestaSchema.safeParse(r).success, r.nombre).toBe(true);
      expect(r.activa, r.nombre).toBe(false);
    }
    expect(reglas.map((r) => r.respuesta).join(" ")).toMatch(/\$CATALOGO[\s\S]*\$ZONAS/);
  });

  it("sus estilos de Instagram son los suyos", () => {
    const base = { fecha: "2026-10-01", tipo: "dato", tema: "Un dato" };
    expect(postIGSchema.safeParse({ ...base, estilo: "simple" }).success).toBe(true);
    expect(postIGSchema.safeParse({ ...base, estilo: "panal" }).success).toBe(false);
  });
});
