import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ findFirst: vi.fn(async () => null) }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: db } }));

import { getMainProduct } from "@/lib/product";
import seedMelera from "../clientes/melera/seed";
import seedEjemplo from "../clientes/ejemplo/seed";
import { zonaEnvioSchema } from "@/lib/validation";

describe("producto destacado", () => {
  it("es el primero activo por orden (y a igual orden, el más viejo)", async () => {
    await getMainProduct();
    expect(db.findFirst).toHaveBeenCalledWith({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    });
  });
});

describe("productos de los seeds", () => {
  it.each([
    ["melera", seedMelera],
    ["ejemplo", seedEjemplo],
  ])("%s: slugs válidos y sin repetir", (_cliente, seed) => {
    const slugs = (seed.productos ?? []).map((p) => p.slug);
    expect(slugs.length).toBeGreaterThan(0);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("el de Melera tiene el slug que le arma la migración al producto existente", () => {
    expect(seedMelera.productos![0].slug).toBe("miel-artesanal-500g");
  });
});

describe("zonas de envío de los seeds", () => {
  it.each([
    ["melera", seedMelera],
    ["ejemplo", seedEjemplo],
  ])("%s: trae zonas válidas para el admin", (_cliente, seed) => {
    expect(seed.zonas?.length).toBeGreaterThan(0);
    for (const z of seed.zonas ?? []) {
      expect(zonaEnvioSchema.safeParse({ costo: null, orden: 10, activa: true, ...z }).success, z.nombre).toBe(true);
    }
  });

  it("Melera sigue enviando solo a CABA, a coordinar", () => {
    expect(seedMelera.zonas).toEqual([expect.objectContaining({ nombre: "CABA" })]);
    expect(seedMelera.zonas![0].costo).toBeUndefined();
  });
});
