import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Cierre de la fase 1: todo lo de Melera vive en clientes/melera/. En el código de la plataforma
 * (src/, scripts/, prisma/seed.ts y la config de Next y Tailwind) no puede quedar nada de Melera
 * fuera de los comentarios (ahí se la usa como ejemplo).
 */
const RAIZ = path.resolve(__dirname, "..");
const PALABRAS = /melera|miel|frasco|panal|abeja|colmena|apícola|jofré|\bCABA\b|🐝|🍯/i;

// Pendientes declarados (hoy ninguno: el "solo CABA" pasó a las zonas de envío de la fase 2).
const PENDIENTES_FASE_2: string[] = [];

// Generados por scripts/preparar-cliente.ts con los archivos del cliente (están en .gitignore)
const GENERADOS = ["src/app/tema-cliente.css"];

function archivos(dir: string): string[] {
  return fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return archivos(rel);
    return /\.(ts|tsx|js|mjs|css)$/.test(e.name) ? [rel] : [];
  });
}

/** Las líneas de código (sin comentarios de línea ni de bloque). */
function lineasDeCodigo(texto: string) {
  const sinBloques = texto.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ""));
  return sinBloques.split(/\r?\n/).map((l, i) => ({ n: i + 1, l: l.replace(/(^|[^:])\/\/.*$/, "$1") }));
}

describe("sin rastros de Melera en la plataforma", () => {
  const revisar = [...archivos("src"), ...archivos("scripts"), "prisma/seed.ts", "next.config.js", "tailwind.config.ts"].filter(
    (a) => !GENERADOS.includes(a)
  );

  it("revisa una cantidad razonable de archivos", () => {
    expect(revisar.length).toBeGreaterThan(80);
  });

  it("ninguna línea de código nombra a Melera, la miel ni su tema", () => {
    const hallazgos = revisar.flatMap((archivo) =>
      lineasDeCodigo(fs.readFileSync(path.join(RAIZ, archivo), "utf8"))
        .filter(({ l }) => PALABRAS.test(l))
        .filter(() => !PENDIENTES_FASE_2.includes(archivo))
        .map(({ n, l }) => `${archivo}:${n}: ${l.trim()}`)
    );
    expect(hallazgos).toEqual([]);
  });

  it("no quedan pendientes: CABA ya no está en el código (es una zona de envío en la base)", () => {
    expect(PENDIENTES_FASE_2).toEqual([]);
  });
});
