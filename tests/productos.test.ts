import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ findFirst: vi.fn(async () => null) }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: db } }));

import { getMainProduct } from "@/lib/product";
import seedMelera from "../clientes/melera/seed";
import seedEjemplo from "../clientes/ejemplo/seed";

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
