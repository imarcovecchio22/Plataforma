import { describe, expect, it } from "vitest";
import { spawnSync } from "child_process";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TextoConNegrita from "@/components/TextoConNegrita";
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
    ["Instagram con @", (c: ReturnType<typeof valida>) => (c.instagram = "@melera.miel"), /^instagram:/],
    ["SEO sin título", (c: ReturnType<typeof valida>) => ((c.seo as Record<string, string>).titulo = ""), /^seo\.titulo:/],
    ["Quiénes somos sin párrafos", (c: ReturnType<typeof valida>) => (((c.textos as Record<string, Record<string, unknown>>).nosotros.parrafos = [])), /^textos\.nosotros\.parrafos:/],
    ["texto vacío", (c: ReturnType<typeof valida>) => (((c.textos as Record<string, Record<string, unknown>>).hero.titulo = "  ")), /^textos\.hero\.titulo: No puede estar vacío/],
    ["género de la unidad inválido", (c: ReturnType<typeof valida>) => ((c.unidad as Record<string, string>).genero = "neutro"), /^unidad\.genero:/],
    ["imagen sin / al principio", (c: ReturnType<typeof valida>) => ((c.imagenes as Record<string, string>).logo = "brand/logo.png"), /^imagenes\.logo:/],
    ["imagen con ..", (c: ReturnType<typeof valida>) => ((c.imagenes as Record<string, string>).compartir = "/../secreto.png"), /^imagenes\.compartir:/],
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

describe("scripts/preparar-cliente.ts (corre antes de dev y build)", () => {
  const correr = (cliente: string) =>
    spawnSync(process.execPath, [path.join("node_modules", "tsx", "dist", "cli.mjs"), "scripts/preparar-cliente.ts"], {
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

describe("TextoConNegrita", () => {
  it("lo que va entre ** sale en <strong> con la clase pedida", () => {
    const html = renderToStaticMarkup(createElement(TextoConNegrita, { texto: "Hecha por **Apícola Mercedes**, de **Tomás Jofré**.", className: "x" }));
    expect(html).toBe('Hecha por <strong class="x">Apícola Mercedes</strong>, de <strong class="x">Tomás Jofré</strong>.');
  });

  it("sin ** queda igual", () => {
    expect(renderToStaticMarkup(createElement(TextoConNegrita, { texto: "Solo texto" }))).toBe("Solo texto");
  });
});
