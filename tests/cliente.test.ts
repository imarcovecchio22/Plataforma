import { describe, expect, it } from "vitest";
import { spawnSync } from "child_process";
import path from "path";
import melera from "../clientes/melera/config";
import { cliente } from "@/plataforma/cliente";
import { problemasDeConfig } from "@/plataforma/cliente/validar";

const valida = () => structuredClone(melera) as Record<string, unknown> & { region: Record<string, unknown> };

describe("config del cliente", () => {
  it("la de Melera es válida", () => {
    expect(problemasDeConfig("melera", melera)).toEqual([]);
  });

  it("@cliente apunta a Melera en los tests", () => {
    expect(cliente.slug).toBe("melera");
  });

  it.each([
    ["slug con mayúsculas", (c: ReturnType<typeof valida>) => (c.slug = "Melera"), /^slug:/],
    ["sin nombre", (c: ReturnType<typeof valida>) => (c.nombre = " "), /^nombre: Falta el nombre/],
    ["dominio con http", (c: ReturnType<typeof valida>) => (c.dominio = "http://melera.vercel.app"), /^dominio: .*https/],
    ["dominio con barra al final", (c: ReturnType<typeof valida>) => (c.dominio = "https://melera.vercel.app/"), /^dominio: .*sin barra/],
    ["moneda inválida", (c: ReturnType<typeof valida>) => (c.region.moneda = "pesos"), /^region\.moneda:/],
    ["locale inválido", (c: ReturnType<typeof valida>) => (c.region.locale = "no_es_un_locale!"), /^region\.locale:/],
    ["zona horaria inválida", (c: ReturnType<typeof valida>) => (c.region.zonaHoraria = "America/Marte"), /^region\.zonaHoraria:/],
    ["campo desconocido", (c: ReturnType<typeof valida>) => (c.colorFavorito = "rojo"), /colorFavorito/],
    ["sin región", (c: ReturnType<typeof valida>) => delete (c as Partial<ReturnType<typeof valida>>).region, /^region:/],
  ])("rechaza: %s", (_nombre, romper, esperado) => {
    const config = valida();
    romper(config);
    const problemas = problemasDeConfig("melera", config);
    expect(problemas.length).toBeGreaterThan(0);
    expect(problemas.join("\n")).toMatch(esperado);
  });

  it("rechaza un slug distinto de la carpeta", () => {
    expect(problemasDeConfig("rino", melera)).toEqual(['slug: es "melera" pero la carpeta es clientes/rino']);
  });
});

describe("scripts/validar-cliente.ts (corre antes de dev y build)", () => {
  const correr = (cliente: string) =>
    spawnSync(process.execPath, [path.join("node_modules", "tsx", "dist", "cli.mjs"), "scripts/validar-cliente.ts"], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, CLIENTE: cliente },
      encoding: "utf8",
    });

  it("con CLIENTE=melera pasa", () => {
    const r = correr("melera");
    expect(r.stdout).toContain('Cliente "melera" válido');
    expect(r.status).toBe(0);
  }, 30000);

  it("sin CLIENTE corta el build", () => {
    const r = correr("");
    expect(r.stderr).toContain("falta la variable de entorno CLIENTE");
    expect(r.status).toBe(1);
  }, 30000);

  it("con un cliente que no existe corta el build", () => {
    const r = correr("no-existe");
    expect(r.stderr).toContain("no existe clientes/no-existe/config.ts");
    expect(r.status).toBe(1);
  }, 30000);
});
