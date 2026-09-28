import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import melera from "../clientes/melera/config";
import { copiarAssets, copiarTema, imagenesFaltantes } from "@/plataforma/cliente/assets";

// Un repo de mentira en una carpeta temporal, con dos clientes.
let raiz: string;
const escribir = (ruta: string, contenido = "x") => {
  fs.mkdirSync(path.dirname(path.join(raiz, ruta)), { recursive: true });
  fs.writeFileSync(path.join(raiz, ruta), contenido);
};

beforeEach(() => {
  raiz = fs.mkdtempSync(path.join(os.tmpdir(), "plataforma-assets-"));
  fs.mkdirSync(path.join(raiz, "src", "app"), { recursive: true });
  escribir("clientes/uno/public/brand/logo.png", "logo-uno");
  escribir("clientes/uno/public/foto.png", "foto-uno");
  escribir("clientes/uno/app/icon.png", "icono-uno");
  escribir("clientes/dos/public/otra.png", "otra-dos");
});

afterEach(() => {
  fs.rmSync(raiz, { recursive: true, force: true });
});

const leer = (ruta: string) => fs.readFileSync(path.join(raiz, ruta), "utf8");
const existe = (ruta: string) => fs.existsSync(path.join(raiz, ruta));

describe("copiarAssets", () => {
  it("copia public/ e íconos del cliente", () => {
    expect(copiarAssets(raiz, "uno")).toEqual({ iconos: ["icon.png"] });
    expect(leer("public/brand/logo.png")).toBe("logo-uno");
    expect(leer("public/foto.png")).toBe("foto-uno");
    expect(leer("src/app/icon.png")).toBe("icono-uno");
  });

  it("al cambiar de cliente no quedan archivos del anterior", () => {
    copiarAssets(raiz, "uno");
    copiarAssets(raiz, "dos");
    expect(existe("public/otra.png")).toBe(true);
    expect(existe("public/foto.png")).toBe(false);
    expect(existe("src/app/icon.png")).toBe(false);
  });

  it("un cliente sin public/ deja public/ vacía", () => {
    copiarAssets(raiz, "sin-assets");
    expect(fs.readdirSync(path.join(raiz, "public"))).toEqual([]);
  });
});

describe("imagenesFaltantes", () => {
  const config = {
    ...melera,
    imagenes: { logo: "/brand/logo.png", compartir: "/og.png", producto: { ...melera.imagenes.producto, src: "/foto.png" } },
  };

  it("lista las imágenes de la config que no están en clientes/<slug>/public/", () => {
    expect(imagenesFaltantes(raiz, "uno", config)).toEqual(["/og.png"]);
  });

  it("las de Melera existen todas", () => {
    expect(imagenesFaltantes(path.resolve(__dirname, ".."), "melera", melera)).toEqual([]);
  });
});

describe("copiarTema", () => {
  it("copia clientes/<slug>/tema.css a src/app/tema-cliente.css", () => {
    escribir("clientes/uno/tema.css", ".btn{color:red}");
    expect(copiarTema(raiz, "uno")).toBe(true);
    expect(leer("src/app/tema-cliente.css")).toBe(".btn{color:red}");
  });

  it("un cliente sin tema devuelve false y no deja el del anterior", () => {
    escribir("clientes/uno/tema.css", ".btn{color:red}");
    copiarTema(raiz, "uno");
    expect(copiarTema(raiz, "dos")).toBe(false);
    expect(existe("src/app/tema-cliente.css")).toBe(false);
  });

  it("el tema de Melera define todas las variables y clases del contrato", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "..", "clientes", "melera", "tema.css"), "utf8");
    const variables = ["texto", "texto-suave", "destacado", "acento", "acento-rgb", "fondo-seccion", "degrade-seccion", "fondo-control", "texto-pie"];
    for (const v of variables) expect(css).toMatch(new RegExp(`--${v}:`));
    const clases = ["tema-publico", "contenedor-publico", "btn", "btn-sm", "wrap-focus", "btn-ghost", "link-nav", "titulo", "titulo-hero", "texto-suave", "campo", "etiqueta", "velo-texto", "foto-producto", "precio", "etiqueta-seccion", "tarjeta"];
    for (const c of clases) expect(css).toMatch(new RegExp(`\\.${c}[\\s{:,]`));
  });
});
