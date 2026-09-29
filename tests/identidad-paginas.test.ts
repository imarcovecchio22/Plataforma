import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement, ReactNode } from "react";

// Rino con cambios de identidad guardados por el dueño
vi.mock("@cliente/config", async () => await import("../clientes/rino/config"));
vi.mock("@cliente/tema", async () => await import("@/plataforma/tema/neutro"));
vi.mock("next/font/google", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }));
const CAMBIOS = {
  textos: {
    hero: { titulo: "Impresiones con onda", bajada: "Bajada nueva del dueño." },
    nosotros: { parrafos: ["Un párrafo **nuevo**."] },
    pie: "Pie nuevo del dueño.",
    aclaracionPrecio: "la unidad",
    descripcionConsultas: "Consultas del dueño.",
  },
  colorMarca: "#2563eb",
  fondo: "oscuro",
  imagenes: { logo: "https://cdn.example.com/logo-nuevo.png", compartir: "https://cdn.example.com/compartir-nuevo.png" },
};
vi.mock("@/lib/prisma", () => ({
  prisma: {
    identidadCliente: { findUnique: async () => ({ id: 1, valores: CAMBIOS }) },
    preguntaFrecuente: { findMany: async () => [] },
  },
}));
const PRODUCTO = vi.hoisted(() => ({
  id: "p", nombre: "Maceta", slug: "maceta", descripcion: "", precio: 8500, stock: 5, escalones: [], imagenUrl: null,
  activo: true, orden: 10, unidadSingular: null, unidadPlural: null, unidadGenero: null, aclaracionPrecio: null, opciones: [],
  aPedido: false, demora: null, categoria: null,
}));
vi.mock("@/lib/product", () => ({
  getMainProduct: async () => PRODUCTO,
  getProductosActivos: async () => [PRODUCTO],
  getProductoPorSlug: async () => PRODUCTO,
  contarProductosActivos: async () => 1,
  getCategoriasConProductos: async () => [],
}));
vi.mock("@/lib/zonas", async () => (await import("./zonas-de-prueba")).mockZonas("rino"));

import RootLayout, { generateMetadata } from "@/app/layout";
import PublicoLayout from "@/app/(publico)/layout";
import HomePage from "@/app/(publico)/page";
import FichaPage from "@/app/(publico)/producto/[slug]/page";
import { generateMetadata as metadataConsultas } from "@/app/(publico)/consultas/page";
import AdminLoginPage from "@/app/admin/login/page";
import { escalaDeColor } from "@/plataforma/cliente/escala";
import { canales } from "@/plataforma/cliente/colores";

const html = (nodo: unknown) => renderToStaticMarkup(nodo as ReactElement);
const conPublico = async (hijos: ReactNode) => html(await PublicoLayout({ children: hijos }));

describe("la tienda muestra la identidad que cambió el dueño", () => {
  it("layout raíz: la escala del color elegido y el fondo oscuro", async () => {
    const raiz = html(await RootLayout({ children: "x" }));
    expect(raiz).toContain('data-fondo="oscuro"');
    const escala = escalaDeColor("#2563eb");
    expect(raiz).toContain(`--marca-500:${canales(escala[500])}`);
    expect(raiz).toContain(`--marca-700:${canales(escala[700])}`);
  });

  it("la imagen para compartir y el texto de consultas", async () => {
    expect(JSON.stringify(await generateMetadata())).toContain("https://cdn.example.com/compartir-nuevo.png");
    expect((await metadataConsultas()).description).toBe("Consultas del dueño.");
  });

  it("home: textos del inicio, de Quiénes somos y del pie, y el logo nuevo (tal cual, sin optimizador)", async () => {
    const home = await conPublico(await HomePage());
    for (const t of ["Impresiones con onda", "Bajada nueva del dueño.", "Pie nuevo del dueño.", "<strong", "nuevo</strong>"]) expect(home).toContain(t);
    expect(home).toContain('src="https://cdn.example.com/logo-nuevo.png"');
    expect(home).not.toContain("/_next/image?url=https");
    // Lo que no cambió sigue siendo de la config
    expect(home).toContain("El taller");
  });

  it("la ficha usa la aclaración del precio del dueño", async () => {
    const ficha = await conPublico(await FichaPage({ params: Promise.resolve({ slug: "maceta" }), searchParams: Promise.resolve({}) }));
    expect(ficha).toContain("la unidad");
  });

  it("el login del admin, con el logo nuevo", async () => {
    expect(html(await AdminLoginPage())).toContain('src="https://cdn.example.com/logo-nuevo.png"');
  });
});
