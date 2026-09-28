/**
 * Corre antes de `next dev` y `next build`: si CLIENTE no está definida, no existe
 * clientes/<CLIENTE>/ o su config no cumple el esquema, corta con un mensaje claro.
 * Lee las mismas variables de entorno que Next (.env, .env.local, etc.).
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { loadEnvConfig } from "@next/env";
import { problemasDeConfig } from "../src/plataforma/cliente/validar";

const raiz = path.resolve(__dirname, "..");
loadEnvConfig(raiz, process.argv.includes("--dev"));

function fallar(mensaje: string): never {
  console.error(`\n✖ Cliente inválido: ${mensaje}\n`);
  process.exit(1);
}

async function main() {
  const slug = process.env.CLIENTE?.trim();
  if (!slug) fallar("falta la variable de entorno CLIENTE (ej. CLIENTE=melera).");

  const archivo = path.join(raiz, "clientes", slug, "config.ts");
  if (!fs.existsSync(archivo)) fallar(`no existe clientes/${slug}/config.ts.`);

  const modulo = await import(pathToFileURL(archivo).href);
  const problemas = problemasDeConfig(slug, modulo.default?.default ?? modulo.default);
  if (problemas.length) fallar(`clientes/${slug}/config.ts no es válida:\n  - ${problemas.join("\n  - ")}`);

  console.log(`✔ Cliente "${slug}" válido.`);
}

main();
