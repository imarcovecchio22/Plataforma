import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { zonaEnvio: db } }));
const logs = vi.hoisted(() => ({ logEvent: vi.fn(async (tipo: string, mensaje: string, op?: unknown) => void [tipo, mensaje, op]) }));
vi.mock("@/lib/logs", () => logs);

import { POST as crear } from "@/app/api/admin/envios/route";
import { DELETE as borrar, PATCH as editar } from "@/app/api/admin/envios/[id]/route";
import { zonaEnvioSchema } from "@/lib/validation";
import { etiquetaZona, textoResumenEnvio } from "@/lib/envios";

const valores = (cambios: Record<string, unknown> = {}) => ({
  nombre: "Zona sur", costo: "2500", aclaracion: "", detalleResumen: "", orden: 10, activa: true, ...cambios,
});
const pedido = (method: string, body?: unknown) =>
  new NextRequest("https://x.com/api/admin/envios", { method, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id = "3") => ({ params: Promise.resolve({ id }) });
const mensajes = () => logs.logEvent.mock.calls.map((c) => c[1]);

beforeEach(() => {
  vi.clearAllMocks();
  db.create.mockImplementation(async ({ data }) => ({ id: 3, ...data }));
  db.update.mockImplementation(async ({ data }) => ({ id: 3, nombre: "Zona sur", costo: 2500, activa: true, ...data }));
  db.delete.mockResolvedValue({ id: 3, nombre: "Zona sur" });
});

describe("zonaEnvioSchema", () => {
  it("costo vacío o null = a coordinar; si no, un entero mayor a 0", () => {
    expect(zonaEnvioSchema.parse(valores({ costo: "" })).costo).toBeNull();
    expect(zonaEnvioSchema.parse(valores({ costo: null })).costo).toBeNull();
    expect(zonaEnvioSchema.parse(valores()).costo).toBe(2500);
    for (const costo of ["0", "-5", "12.5", "abc"]) expect(zonaEnvioSchema.safeParse(valores({ costo })).success, costo).toBe(false);
  });

  it("pide nombre", () => {
    expect(zonaEnvioSchema.safeParse(valores({ nombre: " " })).success).toBe(false);
  });
});

describe("API de zonas de envío", () => {
  it("crea una zona", async () => {
    const res = await crear(pedido("POST", valores()));
    expect(res.status).toBe(200);
    expect(db.create.mock.calls[0][0].data).toMatchObject({ nombre: "Zona sur", costo: 2500, activa: true });
    expect(mensajes()).toEqual(["Zona de envío #3 creada: Zona sur"]);
  });

  it("rechaza datos inválidos con el mensaje del campo", async () => {
    const res = await crear(pedido("POST", valores({ costo: "0" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("El costo tiene que ser mayor a 0 (vacío = a coordinar)");
    expect(db.create).not.toHaveBeenCalled();
  });

  it("edita una zona completa o solo la activa/desactiva", async () => {
    expect((await editar(pedido("PATCH", valores({ costo: "" })), ctx())).status).toBe(200);
    expect(db.update.mock.calls[0][0]).toMatchObject({ where: { id: 3 }, data: { costo: null } });
    expect((await editar(pedido("PATCH", { activa: false }), ctx())).status).toBe(200);
    expect(db.update.mock.calls[1][0].data).toEqual({ activa: false });
    expect(mensajes()).toEqual(["Zona de envío #3 editada: Zona sur", "Zona de envío #3 desactivada: Zona sur"]);
  });

  it("borra una zona, y 404 si no existe", async () => {
    expect((await borrar(pedido("DELETE"), ctx())).status).toBe(200);
    db.delete.mockRejectedValueOnce(new Error("no existe"));
    expect((await borrar(pedido("DELETE"), ctx("99"))).status).toBe(404);
    expect((await borrar(pedido("DELETE"), ctx("abc"))).status).toBe(400);
  });
});

describe("textos de las zonas", () => {
  const zona = { id: 1, nombre: "Zona sur", costo: 2500, aclaracion: "", detalleResumen: "" };
  it("etiqueta del selector y resumen según el costo", () => {
    expect(etiquetaZona(zona)).toMatch(/^Zona sur — \$\s2\.500$/);
    expect(etiquetaZona({ ...zona, costo: null })).toBe("Zona sur — a coordinar");
    expect(textoResumenEnvio({ ...zona, costo: null })).toBe("Envío a Zona sur: lo coordinamos después de la compra.");
    expect(textoResumenEnvio({ ...zona, detalleResumen: "Llega el jueves." })).toBe("Llega el jueves.");
  });
});
