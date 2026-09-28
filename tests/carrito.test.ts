import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/" }));

import {
  agregarAlCarrito,
  cambiarCantidad,
  guardarCarrito,
  leerCarrito,
  limpiarCarrito,
  lineasDelCarrito,
  unidadesEnCarrito,
} from "@/lib/carrito";
import CarritoIcono from "@/components/CarritoIcono";
import FichaProducto from "@/components/FichaProducto";
import CheckoutForm from "@/components/CheckoutForm";

describe("operaciones del carrito", () => {
  it("limpia lo que no tiene forma de ítem, repetidos y cantidades inválidas", () => {
    expect(
      limpiarCarrito([
        { producto: "miel", cantidad: 2 },
        { producto: "miel", cantidad: 5 }, // repetido: queda el primero
        { producto: "", cantidad: 1 },
        { producto: "vela", cantidad: 0 },
        { producto: "vela", cantidad: 1.5 },
        { producto: "vela", cantidad: 99999 }, // tope
        "basura",
        null,
      ])
    ).toEqual([
      { producto: "miel", cantidad: 2 },
      { producto: "vela", cantidad: 1000 },
    ]);
    expect(limpiarCarrito("no es una lista")).toEqual([]);
  });

  it("agregar suma al que ya estaba; cambiar a 0 lo saca", () => {
    let items = agregarAlCarrito([], "miel", 2);
    items = agregarAlCarrito(items, "vela", 1);
    items = agregarAlCarrito(items, "miel", 3);
    expect(items).toEqual([
      { producto: "miel", cantidad: 5 },
      { producto: "vela", cantidad: 1 },
    ]);
    expect(unidadesEnCarrito(items)).toBe(6);
    expect(cambiarCantidad(items, "miel", 0)).toEqual([{ producto: "vela", cantidad: 1 }]);
    expect(cambiarCantidad(items, "vela", 4)).toEqual([
      { producto: "miel", cantidad: 5 },
      { producto: "vela", cantidad: 4 },
    ]);
  });

  it("no pasa de 20 productos", () => {
    let items = [] as ReturnType<typeof limpiarCarrito>;
    for (let i = 0; i < 25; i++) items = agregarAlCarrito(items, `p${i}`, 1);
    expect(items).toHaveLength(20);
  });
});

describe("líneas del carrito con los datos actuales", () => {
  const productos = [
    { slug: "miel", precio: 6500, escalones: [{ desde: 5, precio: 6000 }], stock: 50 },
    { slug: "vela", precio: 2000, escalones: [], stock: 3 },
    { slug: "agotado", precio: 100, escalones: [], stock: 0 },
  ];

  it("aplica la promo de cada producto, no pasa el stock y suma el total", () => {
    const { lineas, total, noDisponibles } = lineasDelCarrito(
      [
        { producto: "miel", cantidad: 5 },
        { producto: "vela", cantidad: 10 },
      ],
      productos
    );
    expect(lineas.map((l) => [l.producto.slug, l.cantidad, l.unitario, l.total])).toEqual([
      ["miel", 5, 6000, 30000],
      ["vela", 3, 2000, 6000],
    ]);
    expect(total).toBe(36000);
    expect(noDisponibles).toEqual([]);
  });

  it("lo que ya no está a la venta o no tiene stock queda afuera y se informa", () => {
    const items = [
      { producto: "miel", cantidad: 1 },
      { producto: "borrado", cantidad: 1 },
      { producto: "agotado", cantidad: 1 },
    ];
    const { lineas, noDisponibles } = lineasDelCarrito(items, productos);
    expect(lineas.map((l) => l.producto.slug)).toEqual(["miel"]);
    expect(noDisponibles.map((i) => i.producto)).toEqual(["borrado", "agotado"]);
  });
});

describe("guardado en el navegador", () => {
  let guardado: Record<string, string>;
  let falla: boolean;

  beforeEach(() => {
    guardado = {};
    falla = false;
    const ventana = new EventTarget() as EventTarget & { localStorage: Storage };
    ventana.localStorage = {
      getItem: (k: string) => {
        if (falla) throw new Error("bloqueado");
        return guardado[k] ?? null;
      },
      setItem: (k: string, v: string) => {
        if (falla) throw new Error("bloqueado");
        guardado[k] = v;
      },
    } as Storage;
    vi.stubGlobal("window", ventana);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda con la clave del cliente y avisa del cambio", () => {
    const aviso = vi.fn();
    window.addEventListener("carrito-cambio", aviso);
    guardarCarrito([{ producto: "miel", cantidad: 2 }]);
    expect(JSON.parse(guardado["melera-carrito"])).toEqual([{ producto: "miel", cantidad: 2 }]);
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(leerCarrito()).toEqual([{ producto: "miel", cantidad: 2 }]);
  });

  it("devuelve la misma lista mientras no cambie (useSyncExternalStore lo necesita)", () => {
    guardarCarrito([{ producto: "miel", cantidad: 2 }]);
    expect(leerCarrito()).toBe(leerCarrito());
  });

  it("si el navegador no deja guardar, el carrito vive en memoria", () => {
    falla = true;
    guardarCarrito([{ producto: "vela", cantidad: 1 }]);
    expect(leerCarrito()).toEqual([{ producto: "vela", cantidad: 1 }]);
  });

  it("un valor roto en el almacenamiento se lee como carrito vacío", () => {
    guardado["melera-carrito"] = "{roto";
    expect(leerCarrito()).toEqual([]);
  });
});

describe("en la tienda", () => {
  it("el ícono del carrito no aparece si está vacío (siempre, del lado del servidor)", () => {
    expect(renderToStaticMarkup(createElement(CarritoIcono))).toBe("");
  });

  const PRODUCTO = {
    id: "p", nombre: "Miel", slug: "miel", descripcion: "", precio: 6500, stock: 5, escalones: [], imagenUrl: null,
    activo: true, orden: 10, unidadSingular: null, unidadPlural: null, unidadGenero: null, aclaracionPrecio: null,
    createdAt: new Date(0), updatedAt: new Date(0),
  };

  it("con un solo producto la ficha compra directo; con varios, agrega al carrito", () => {
    expect(renderToStaticMarkup(createElement(FichaProducto, { product: PRODUCTO }))).toMatch(/>Comprar · /);
    expect(renderToStaticMarkup(createElement(FichaProducto, { product: PRODUCTO, conCarrito: true }))).toMatch(/>Agregar al carrito · /);
  });
});

describe("checkout del carrito", () => {
  it("del lado del servidor no se muestra (el carrito está en el navegador: nada de un vacío por un instante)", () => {
    expect(renderToStaticMarkup(createElement(CheckoutForm, { carrito: [] }))).toBe("");
  });
});
