import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/" }));

import FichaProducto from "@/components/FichaProducto";
import ListadoProductos from "@/components/ListadoProductos";
import CheckoutForm from "@/components/CheckoutForm";
import { unidadDe } from "@/plataforma/cliente";
import { errorEscalones, promosParaPlantilla, textoPromos, textosDelProducto } from "@/lib/precios";
import { productoSchema } from "@/lib/validation";

// Un producto de Melera que se vende por "pieza" (femenino) y con su propia aclaración
const PIEZA = {
  id: "p2", nombre: "Panal en pieza", slug: "panal-en-pieza", descripcion: "", precio: 3000, stock: 20,
  escalones: [{ desde: 3, precio: 2500 }], imagenUrl: null, activo: true, orden: 20,
  unidadSingular: "pieza", unidadPlural: "piezas", unidadGenero: "femenino", aclaracionPrecio: "la pieza de 200 g", categoriaId: null,
  createdAt: new Date(0), updatedAt: new Date(0),
};
const SIN_UNIDAD = { ...PIEZA, unidadSingular: null, unidadPlural: null, unidadGenero: null, aclaracionPrecio: null };

describe("unidad de cada producto", () => {
  it("usa la del producto; sin una completa, la del cliente", () => {
    expect(unidadDe(PIEZA)).toEqual({ singular: "pieza", plural: "piezas", genero: "femenino" });
    expect(unidadDe(SIN_UNIDAD)).toEqual({ singular: "frasco", plural: "frascos", genero: "masculino" });
    expect(unidadDe({ ...PIEZA, unidadPlural: null })).toEqual({ singular: "frasco", plural: "frascos", genero: "masculino" });
  });

  it("promos, errores y filas de la plantilla con la unidad del producto", () => {
    const u = unidadDe(PIEZA);
    expect(textoPromos(PIEZA.escalones, u)).toMatch(/^3 piezas a \$\s?7\.500$/);
    expect(promosParaPlantilla(3000, PIEZA.escalones, u)).toMatch(/^1 pieza\|.*;3 piezas\|/);
    expect(errorEscalones(3000, [{ desde: 3, precio: 3500 }], u)).toMatch(/por pieza$/);
    expect(textosDelProducto(PIEZA).promos).toMatch(/^3 piezas a/);
  });

  it("la ficha muestra su aclaración, sus promos y su unidad en el selector", () => {
    const html = renderToStaticMarkup(createElement(FichaProducto, { product: PIEZA }));
    expect(html).toContain("la pieza de 200 g");
    expect(html).toMatch(/Promo: 3 piezas a/);
    expect(html).toContain('aria-label="Elegí cuántas piezas"');
    expect(html).toContain(">1 pieza<");
    expect(html).not.toContain("frasco");
  });

  it("sin unidad ni aclaración propias, las de la marca", () => {
    const html = renderToStaticMarkup(createElement(FichaProducto, { product: SIN_UNIDAD }));
    expect(html).toContain("el frasco de 500 g");
    expect(html).toContain(">1 frasco<");
  });

  it("el listado muestra las promos con la unidad de cada producto", () => {
    const html = renderToStaticMarkup(createElement(ListadoProductos, { productos: [PIEZA, { ...SIN_UNIDAD, id: "p3", slug: "otro" }] }));
    expect(html).toMatch(/Promo: 3 piezas a/);
    expect(html).toMatch(/Promo: 3 frascos a/);
  });

  it("el checkout dice 'cada una' para una unidad femenina", () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutForm, {
        producto: { slug: PIEZA.slug, nombre: PIEZA.nombre, precio: 3000, escalones: PIEZA.escalones, unidad: unidadDe(PIEZA) },
        cantidadInicial: 1,
        zonas: [],
      })
    );
    expect(html).toContain("Llevando 3 piezas pagás");
    expect(html).toContain("cada una");
  });
});

describe("validación de la unidad al guardar un producto", () => {
  const base = { nombre: "Pieza", slug: "pieza", descripcion: "", precio: 3000, stock: 1, escalones: [], imagenUrl: "", activo: true, orden: 1 };

  it("singular y plural van juntos", () => {
    const r = productoSchema.safeParse({ ...base, unidadSingular: "pieza" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/singular y en plural/);
  });

  it("vacíos se guardan como null (se usa la del cliente)", () => {
    const r = productoSchema.parse(base);
    expect(r).toMatchObject({ unidadSingular: null, unidadPlural: null, unidadGenero: null, aclaracionPrecio: null });
  });

  it("con unidad, guarda el género; los errores de promos la usan", () => {
    expect(productoSchema.parse({ ...base, unidadSingular: "pieza", unidadPlural: "piezas", unidadGenero: "femenino" }).unidadGenero).toBe("femenino");
    const r = productoSchema.safeParse({ ...base, unidadSingular: "pieza", unidadPlural: "piezas", escalones: [{ desde: 3, precio: 3500 }] });
    expect(r.error?.issues[0].message).toMatch(/^La promo desde 3 piezas tiene que ser más barata que .* por pieza$/);
  });
});
