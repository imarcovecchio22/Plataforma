import { describe, expect, it, vi } from "vitest";

// Un cliente que vende "piezas" (unidad femenina), para ver que nada dice "frasco".
vi.mock("@cliente/config", async (original) => {
  const melera = ((await original()) as { default: Record<string, unknown> }).default;
  return { default: { ...melera, unidad: { singular: "pieza", plural: "piezas", genero: "femenino" } } };
});

import { cadaUno, cantidadConUnidad, deLaUnidad, masBarato } from "@/plataforma/cliente";
import { errorEscalones, promosParaPlantilla, textoPromos } from "@/lib/precios";

const ESC = [{ desde: 5, precio: 6000 }];

describe("unidad de venta de otro cliente (pieza / piezas)", () => {
  it("cantidades y género", () => {
    expect(cantidadConUnidad(1)).toBe("1 pieza");
    expect(cantidadConUnidad(5)).toBe("5 piezas");
    expect(cadaUno).toBe("cada una");
    expect(deLaUnidad).toBe("de la pieza");
    expect(masBarato).toBe("más barata");
  });

  it("textos de promos", () => {
    expect(textoPromos(ESC)).toMatch(/^5 piezas a \$\s?30\.000$/);
    expect(promosParaPlantilla(6500, ESC)).toMatch(/^1 pieza\|.*;5 piezas\|/);
  });

  it("errores de promos", () => {
    expect(errorEscalones(6500, [{ desde: 1, precio: 6000 }])).toBe("Cada promo tiene que ser desde 2 piezas o más");
    expect(errorEscalones(6500, [{ desde: 5, precio: 7000 }])).toMatch(/^La promo desde 5 piezas .* por pieza$/);
  });
});
