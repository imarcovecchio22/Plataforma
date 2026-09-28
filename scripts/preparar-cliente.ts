/**
 * Corre antes de `next dev` y `next build`:
 * 1. Valida: si CLIENTE no está definida, no existe clientes/<CLIENTE>/, su config no cumple el
 *    esquema o falta alguna imagen que nombra, corta con un mensaje claro (y el build falla).
 * 2. Copia los assets y el tema del cliente a public/ y src/app/ (ver src/plataforma/cliente/assets.ts).
 * Lee las mismas variables de entorno que Next (.env, .env.local, etc.).
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { loadEnvConfig } from "@next/env";
import { problemasDeConfig } from "../src/plataforma/cliente/validar";
import { copiarAssets, copiarTema, imagenesFaltantes } from "../src/plataforma/cliente/assets";
import { plantillasFaltantes } from "../src/plataforma/imagenes/archivos";

const raiz = path.resolve(__dirname, "..");
loadEnvConfig(raiz, process.argv.includes("--dev"));

function fallar(mensaje: string): never {
  console.error(`\n✖ Cliente inválido: ${mensaje}\n`);
  process.exit(1);
}

async function main() {
  const slug = process.env.CLIENTE?.trim();
  if (!slug) fallar("falta la variable de entorno CLIENTE (ej. CLIENTE=ejemplo).");

  const archivo = path.join(raiz, "clientes", slug, "config.ts");
  if (!fs.existsSync(archivo)) fallar(`no existe clientes/${slug}/config.ts.`);

  const modulo = await import(pathToFileURL(archivo).href);
  const config = modulo.default?.default ?? modulo.default;
  const problemas = problemasDeConfig(slug, config);
  if (problemas.length) fallar(`clientes/${slug}/config.ts no es válida:\n  - ${problemas.join("\n  - ")}`);

  const faltan = imagenesFaltantes(raiz, slug, config);
  if (faltan.length) fallar(`faltan imágenes en clientes/${slug}/public/: ${faltan.join(", ")}`);

  const estilos = config.estilosInstagram.map((e: { id: string }) => e.id);
  const plantillas = plantillasFaltantes(path.join(raiz, "clientes", slug, "instagram"), estilos);
  if (plantillas.length) fallar(`faltan plantillas de Instagram en clientes/${slug}/instagram/: ${plantillas.join(", ")}`);

  console.log(`✔ Cliente "${slug}" válido.`);

  const { iconos } = copiarAssets(raiz, slug);
  const tema = copiarTema(raiz, slug);
  const componentes = fs.existsSync(path.join(raiz, "clientes", slug, "tema", "index.tsx"));
  console.log(
    `✔ Tema: CSS ${tema === "cliente" ? `de "${slug}"` : "neutro"}, componentes ${componentes ? `de "${slug}"` : "neutros"}.`
  );
  console.log(`✔ Assets de "${slug}" copiados a public/${iconos.length ? ` e íconos a src/app/ (${iconos.join(", ")})` : ""}.`);
}

main();
