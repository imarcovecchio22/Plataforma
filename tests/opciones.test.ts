import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Con la config de Rino, que usa opciones de producto
vi.mock("@cliente/config", async () => await import("../clientes/rino/config"));
const COLOR = { nombre: "Color", valores: ["Rojo", "Negro", "Blanco"] };
const producto = (slug: string, cambios: Record<string, unknown> = {}) => ({
  id: `id-${slug}`, nombre: `Pieza ${slug}`, slug, descripcion: "", precio: 1000, stock: 10, escalones: [], imagenUrl: null,
  activo: true, orden: 10, opciones: [], ...cambios,
});
const catalogo = vi.hoisted(() => ({ productos: [] as Record<string, unknown>[] }));
vi.mock("@/lib/product", () => ({
  getMainProduct: async () => catalogo.productos[0] ?? null,
  getProductosPorSlugs: async (slugs: string[]) => catalogo.productos.filter((p) => slugs.includes(p.slug as string)),
}));
const db = vi.hoisted(() => ({ order: { create: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/logs", () => ({ logEvent: vi.fn(async () => {}), errorMessage: (e: unknown) => String(e) }));
const mp = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ getPreferenceClient: () => ({ create: mp.create }) }));
vi.mock("@/lib/zonas", async () => (await import("./zonas-de-prueba")).mockZonas("ejemplo"));

import { POST as checkout } from "@/app/api/checkout/route";
import { claveEleccion, nombreConOpciones, validarEleccion } from "@/lib/opciones";
import { agregarAlCarrito, cambiarCantidad, lineasDelCarrito } from "@/lib/carrito";
import { productoSchema } from "@/lib/validation";

const DATOS = {
  nombre: "Ana", apellido: "Pérez", email: "ana@example.com", telefono: "1122334455", calle: "Honduras",
  numero_dir: "4800", localidad: "Palermo", codigoPostal: "1414", zona: 1,
};
const comprar = (items: unknown) =>
  checkout(new NextRequest("https://x.com/api/checkout", { method: "POST", body: JSON.stringify({ ...DATOS, items }) }));

beforeEach(() => {
  vi.clearAllMocks();
  catalogo.productos = [
    producto("maceta", { precio: 8500, stock: 5, escalones: [{ desde: 3, precio: 7800 }], opciones: [COLOR] }),
    producto("soporte", { precio: 6000 }),
  ];
  db.order.create.mockImplementation(async ({ data }) => ({ id: "ord", numero: 1, ...data }));
  mp.create.mockResolvedValue({ id: "pref", init_point: "https://mp/pagar" });
});

describe("opciones elegidas", () => {
  it("valida contra las opciones del producto", () => {
    expect(validarEleccion([COLOR], { Color: "Rojo" }, "Maceta")).toEqual({ elegidas: [{ nombre: "Color", valor: "Rojo" }] });
    expect(validarEleccion([COLOR], {}, "Maceta")).toEqual({ error: "Elegí color para Maceta" });
    expect(validarEleccion([COLOR], { Color: "Verde" }, "Maceta")).toEqual({ error: "Esa opción de color ya no está disponible para Maceta" });
    expect(validarEleccion([COLOR], { Color: "Rojo", Talle: "M" }, "Maceta")).toEqual({ error: "Esa opción ya no está disponible para Maceta" });
    expect(nombreConOpciones("Maceta", [{ nombre: "Color", valor: "Rojo" }])).toBe("Maceta (Color: Rojo)");
    expect(claveEleccion({ a: "1", b: "2" })).toBe(claveEleccion({ b: "2", a: "1" }));
  });

  it("el carrito: la misma pieza en dos colores son dos líneas, y la promo cuenta el total", () => {
    let items = agregarAlCarrito([], "maceta", 2, { Color: "Rojo" });
    items = agregarAlCarrito(items, "maceta", 1, { Color: "Negro" });
    items = agregarAlCarrito(items, "maceta", 1, { Color: "Rojo" });
    expect(items).toEqual([
      { producto: "maceta", cantidad: 3, opciones: { Color: "Rojo" } },
      { producto: "maceta", cantidad: 1, opciones: { Color: "Negro" } },
    ]);
    const productos = [{ slug: "maceta", precio: 8500, escalones: [{ desde: 3, precio: 7800 }], stock: 5, opciones: [COLOR] }];
    const { lineas, total } = lineasDelCarrito(items, productos);
    expect(lineas.map((l) => [l.elegidas[0].valor, l.cantidad, l.unitario])).toEqual([["Rojo", 3, 7800], ["Negro", 1, 7800]]);
    expect(total).toBe(4 * 7800);
    expect(cambiarCantidad(items, { producto: "maceta", opciones: { Color: "Negro" } }, 0)).toHaveLength(1);
  });

  it("el carrito no pasa el stock del producto entre todas sus líneas y saca opciones que ya no existen", () => {
    const items = [
      { producto: "maceta", cantidad: 4, opciones: { Color: "Rojo" } },
      { producto: "maceta", cantidad: 4, opciones: { Color: "Negro" } },
      { producto: "maceta", cantidad: 1, opciones: { Color: "Verde" } },
    ];
    const { lineas, noDisponibles } = lineasDelCarrito(items, [{ slug: "maceta", precio: 8500, escalones: [], stock: 5, opciones: [COLOR] }]);
    expect(lineas.map((l) => l.cantidad)).toEqual([4, 1]);
    expect(noDisponibles).toEqual([items[2]]);
  });

  it("checkout: cada línea con su opción en el nombre del ítem y la promo por el total del producto", async () => {
    const res = await comprar([
      { producto: "maceta", cantidad: 2, opciones: { Color: "Rojo" } },
      { producto: "maceta", cantidad: 1, opciones: { Color: "Blanco" } },
      { producto: "soporte", cantidad: 1 },
    ]);
    expect(res.status).toBe(200);
    const data = db.order.create.mock.calls[0][0].data;
    expect(data.items.create).toEqual([
      { productId: "id-maceta", nombre: "Pieza maceta (Color: Rojo)", precioUnitario: 7800, cantidad: 2, subtotal: 15600, opciones: [{ nombre: "Color", valor: "Rojo" }] },
      { productId: "id-maceta", nombre: "Pieza maceta (Color: Blanco)", precioUnitario: 7800, cantidad: 1, subtotal: 7800, opciones: [{ nombre: "Color", valor: "Blanco" }] },
      { productId: "id-soporte", nombre: "Pieza soporte", precioUnitario: 6000, cantidad: 1, subtotal: 6000 },
    ]);
    expect(mp.create.mock.calls[0][0].body.items[0].title).toBe("Pieza maceta (Color: Rojo)");
  });

  it("checkout: sin elegir, con una opción que no existe o pasando el stock entre colores, 400", async () => {
    const casos: [unknown, string][] = [
      [[{ producto: "maceta", cantidad: 1 }], "Elegí color para Pieza maceta"],
      [[{ producto: "maceta", cantidad: 1, opciones: { Color: "Verde" } }], "Esa opción de color ya no está disponible para Pieza maceta"],
      [
        [
          { producto: "maceta", cantidad: 3, opciones: { Color: "Rojo" } },
          { producto: "maceta", cantidad: 3, opciones: { Color: "Negro" } },
        ],
        "No hay stock suficiente de Pieza maceta para esa cantidad",
      ],
      [
        [
          { producto: "maceta", cantidad: 1, opciones: { Color: "Rojo" } },
          { producto: "maceta", cantidad: 2, opciones: { Color: "Rojo" } },
        ],
        "",
      ],
    ];
    for (const [items, error] of casos) {
      const res = await comprar(items);
      expect(res.status, error).toBe(400);
      if (error) expect((await res.json()).error).toBe(error);
    }
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it("el admin valida las opciones del producto", () => {
    const base = { nombre: "Maceta", slug: "maceta", precio: 8500, stock: 3, activo: true, orden: 10 };
    expect(productoSchema.parse({ ...base, opciones: [COLOR] }).opciones).toEqual([COLOR]);
    expect(productoSchema.safeParse({ ...base, opciones: [{ nombre: "Color", valores: [] }] }).success).toBe(false);
    expect(productoSchema.safeParse({ ...base, opciones: [COLOR, { ...COLOR, nombre: "color" }] }).success).toBe(false);
    expect(productoSchema.safeParse({ ...base, opciones: [{ nombre: "Color", valores: ["Rojo", "Rojo"] }] }).success).toBe(false);
  });
});
