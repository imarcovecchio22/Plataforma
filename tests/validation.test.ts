import { describe, expect, it } from "vitest";
import { checkoutSchema, consultaSchema, limpiarUsuarioInstagram } from "@/lib/validation";

const consultaBase = { nombre: "Juan", mensaje: "Hola, ¿tienen envíos?", tiempo: 5000 };

describe("limpiarUsuarioInstagram", () => {
  it.each([
    ["@@juan.perez", "juan.perez"],
    ["  juan  ", "juan"],
    ["https://www.instagram.com/juan_p/?hl=es", "juan_p"],
    ["instagram.com/nope", "instagram.com"], // sin protocolo no se toma como URL
    ["", ""],
  ])("%s -> %s", (entrada, esperado) => {
    expect(limpiarUsuarioInstagram(entrada)).toBe(esperado);
  });
});

describe("consultaSchema", () => {
  it("acepta Instagram y normaliza el usuario", () => {
    const r = consultaSchema.safeParse({ ...consultaBase, canal: "instagram", instagram: "@@juan" });
    expect(r.success && r.data.instagram).toBe("juan");
  });

  it("exige usuario de Instagram válido", () => {
    expect(consultaSchema.safeParse({ ...consultaBase, canal: "instagram", instagram: "" }).success).toBe(false);
    expect(
      consultaSchema.safeParse({ ...consultaBase, canal: "instagram", instagram: "<script>" }).success
    ).toBe(false);
  });

  it("exige email válido cuando el canal es email", () => {
    expect(consultaSchema.safeParse({ ...consultaBase, canal: "email", email: "a@b.co" }).success).toBe(true);
    expect(consultaSchema.safeParse({ ...consultaBase, canal: "email", email: "juan@" }).success).toBe(false);
    expect(consultaSchema.safeParse({ ...consultaBase, canal: "email" }).success).toBe(false);
  });

  it("limita largos de nombre y mensaje", () => {
    const email = { canal: "email", email: "a@b.co" };
    expect(consultaSchema.safeParse({ ...consultaBase, ...email, nombre: "J" }).success).toBe(false);
    expect(consultaSchema.safeParse({ ...consultaBase, ...email, nombre: "x".repeat(81) }).success).toBe(false);
    expect(consultaSchema.safeParse({ ...consultaBase, ...email, mensaje: "hola" }).success).toBe(false);
    expect(consultaSchema.safeParse({ ...consultaBase, ...email, mensaje: "x".repeat(1501) }).success).toBe(false);
  });

  it("rechaza canales desconocidos", () => {
    expect(consultaSchema.safeParse({ ...consultaBase, canal: "whatsapp" }).success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  const base = {
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@mail.com",
    telefono: "1122334455",
    calle: "Calle",
    numero_dir: "1",
    localidad: "CABA",
    provincia: "CABA",
    codigoPostal: "1000",
    cantidad: "2",
  };

  it("acepta un pedido válido y convierte la cantidad", () => {
    const r = checkoutSchema.safeParse(base);
    expect(r.success && r.data.cantidad).toBe(2);
  });

  it("rechaza cantidades no válidas", () => {
    expect(checkoutSchema.safeParse({ ...base, cantidad: "0" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, cantidad: "1.5" }).success).toBe(false);
  });

  it("la zona de envío es un id (la valida la API contra las zonas activas)", () => {
    expect(checkoutSchema.safeParse({ ...base, zona: "3" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...base, zona: "abc" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, zona: -1 }).success).toBe(false);
  });

  it("limita el largo del origen", () => {
    expect(checkoutSchema.safeParse({ ...base, origen: "x".repeat(51) }).success).toBe(false);
  });
});
