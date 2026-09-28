import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

const producto = (slug: string, cambios: Record<string, unknown> = {}) => ({
  id: `id-${slug}`, nombre: `Producto ${slug}`, slug, descripcion: `Descripción ${slug}`, precio: 1000, stock: 5,
  escalones: [], imagenUrl: null, activo: true, orden: 10, createdAt: new Date(0), updatedAt: new Date(0), ...cambios,
});

const catalogo = vi.hoisted(() => ({ productos: [] as ReturnType<typeof Object>[] }));
vi.mock("@/lib/product", () => ({
  getMainProduct: async () => catalogo.productos[0] ?? null,
  getProductosActivos: async () => catalogo.productos,
  getProductoPorSlug: async (slug: string) => catalogo.productos.find((p) => (p as { slug: string }).slug === slug) ?? null,
  getProductosPorSlugs: async (slugs: string[]) => catalogo.productos.filter((p) => slugs.includes((p as { slug: string }).slug)),
  contarProductosActivos: async () => catalogo.productos.length,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
const db = vi.hoisted(() => ({ order: { create: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/logs", () => ({ logEvent: vi.fn(async () => {}), errorMessage: (e: unknown) => String(e) }));
vi.mock("@/lib/mercadopago", () => ({
  getPreferenceClient: () => ({ create: async () => ({ id: "pref", init_point: "https://mp/pagar" }) }),
}));

vi.mock("@/lib/zonas", () => ({ getZonasActivas: async () => [{ id: 1, nombre: "CABA", costo: null, aclaracion: "Por ahora enviamos solo dentro de CABA. Pronto sumamos más zonas.", detalleResumen: "Envío dentro de CABA: después de la compra te escribimos para coordinarlo." }] }));
import ProductoPage from "@/app/(publico)/producto/page";
import ProductoPorSlugPage from "@/app/(publico)/producto/[slug]/page";
import ProductosPage from "@/app/(publico)/productos/page";
import HomePage from "@/app/(publico)/page";
import CheckoutPage from "@/app/checkout/page";
import { POST as checkout } from "@/app/api/checkout/route";

const html = async (p: Promise<unknown>) => renderToStaticMarkup((await p) as React.ReactElement);
const sp = (v: Record<string, string> = {}) => Promise.resolve(v);

beforeEach(() => {
  vi.clearAllMocks();
  catalogo.productos = [producto("uno")];
  db.order.create.mockImplementation(async ({ data }) => ({ id: "ord", numero: 1, ...data }));
});

describe("/producto (sin slug)", () => {
  it("con un solo producto muestra su ficha", async () => {
    const h = await html(ProductoPage({ searchParams: sp() }));
    expect(h).toContain("Producto uno");
    expect(h).toContain("Descripción uno");
  });

  it("con más de uno redirige al listado, conservando el origen", async () => {
    catalogo.productos = [producto("uno"), producto("dos")];
    await expect(ProductoPage({ searchParams: sp({ origen: "instagram" }) })).rejects.toThrow("REDIRECT /productos?origen=instagram");
  });

  it("sin productos muestra que todavía no hay", async () => {
    catalogo.productos = [];
    expect(await html(ProductoPage({ searchParams: sp() }))).toContain("Todavía no hay productos");
  });
});

describe("/producto/<slug>", () => {
  it("muestra la ficha de ese producto", async () => {
    catalogo.productos = [producto("uno"), producto("dos", { precio: 2500 })];
    const h = await html(ProductoPorSlugPage({ params: Promise.resolve({ slug: "dos" }), searchParams: sp() }));
    expect(h).toContain("Producto dos");
    expect(h).toMatch(/\$\s?2\.500/);
    expect(h).not.toContain("Producto uno");
  });

  it("un slug que no existe (o inactivo) da 404", async () => {
    await expect(ProductoPorSlugPage({ params: Promise.resolve({ slug: "no-existe" }), searchParams: sp() })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("con foto propia usa esa (tal cual, sin el optimizador); sin foto, la de la marca", async () => {
    catalogo.productos = [producto("uno"), producto("dos", { imagenUrl: "https://fotos.com/dos.png" })];
    const conFoto = await html(ProductoPorSlugPage({ params: Promise.resolve({ slug: "dos" }), searchParams: sp() }));
    expect(conFoto).toContain('src="https://fotos.com/dos.png"');
    expect(conFoto).toContain('alt="Producto dos"');
    const sinFoto = await html(ProductoPorSlugPage({ params: Promise.resolve({ slug: "uno" }), searchParams: sp() }));
    expect(sinFoto).toContain("/_next/image?url=%2Fproducto-miel-500g.png");
  });
});

describe("/productos", () => {
  it("lista los productos activos con link a su ficha y el origen", async () => {
    catalogo.productos = [producto("uno"), producto("dos", { stock: 0 })];
    const h = await html(ProductosPage({ searchParams: sp({ origen: "instagram" }) }));
    expect(h).toContain('href="/producto/uno?origen=instagram"');
    expect(h).toContain('href="/producto/dos?origen=instagram"');
    expect(h).toContain("Sin stock por el momento");
  });
});

describe("home", () => {
  it("con un producto no muestra la sección de más productos", async () => {
    expect(await html(HomePage())).not.toContain("Más productos");
  });

  it("con varios, el primero es el destacado y los demás van debajo", async () => {
    catalogo.productos = [producto("uno"), producto("dos"), producto("tres")];
    const h = await html(HomePage());
    expect(h).toContain('href="/producto/uno"');
    expect(h).toContain("Más productos");
    expect(h).toContain('href="/producto/dos"');
    expect(h).toContain('href="/producto/tres"');
  });
});

describe("checkout del producto elegido", () => {
  const datos = {
    nombre: "Ana", apellido: "Pérez", email: "ana@example.com", telefono: "1122334455", calle: "Honduras",
    numero_dir: "4800", localidad: "Palermo", provincia: "CABA", codigoPostal: "1414", cantidad: 2,
  };
  const comprar = (extra: Record<string, unknown>) =>
    checkout(new NextRequest("https://x.com/api/checkout", { method: "POST", body: JSON.stringify({ ...datos, ...extra }) }));

  it("con ?producto=<slug> compra ese producto", async () => {
    catalogo.productos = [producto("uno"), producto("dos", { precio: 2500 })];
    const res = await comprar({ producto: "dos" });
    expect(res.status).toBe(200);
    expect(db.order.create.mock.calls[0][0].data).toMatchObject({
      total: 5000,
      items: { create: [{ productId: "id-dos", nombre: "Producto dos", precioUnitario: 2500, cantidad: 2, subtotal: 5000 }] },
    });
  });

  it("sin producto (formularios viejos) compra el destacado", async () => {
    catalogo.productos = [producto("uno"), producto("dos")];
    await comprar({});
    expect(db.order.create.mock.calls[0][0].data.items.create[0].productId).toBe("id-uno");
  });

  it("un producto que ya no está a la venta responde 404 sin crear el pedido", async () => {
    const res = await comprar({ producto: "no-existe" });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Ese producto ya no está a la venta");
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it("la página de checkout con un slug que no existe da 404", async () => {
    await expect(CheckoutPage({ searchParams: sp({ producto: "no-existe" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
