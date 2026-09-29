#!/usr/bin/env node
/**
 * Corre un comando con el entorno de desarrollo de un cliente, así se pueden desarrollar varios
 * clientes en la misma máquina, cada uno con su base:
 *
 *   node scripts/con-cliente.js rino dev                       (npm run dev con el entorno de Rino)
 *   node scripts/con-cliente.js rino db:seed
 *   node scripts/con-cliente.js rino prisma migrate deploy     (lo que no es un script de npm va con npx)
 *   npm run cliente -- rino build                              (lo mismo, desde npm)
 *
 * El entorno sale de `.env.<cliente>.local` o, si no existe, de `.env.local` (el de siempre). El
 * archivo tiene que declarar ese mismo CLIENTE: si no coincide, no corre nada (así nunca se usa la
 * base de otro cliente). Las variables de los otros `.env*.local` que este archivo no define quedan
 * vacías, para que Next o Prisma no las completen con las de otro cliente.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS: se corre con node, sin compilar */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");

function leerEnv(archivo) {
  const vars = {};
  for (const linea of fs.readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(linea.trim());
    if (m) vars[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return vars;
}

function salir(mensaje) {
  console.error(`con-cliente: ${mensaje}`);
  process.exit(1);
}

/** El archivo de entorno del cliente (o un error que explica qué falta). */
function archivoDe(cliente) {
  const propio = path.join(RAIZ, `.env.${cliente}.local`);
  if (fs.existsSync(propio)) return propio;
  const comun = path.join(RAIZ, ".env.local");
  if (fs.existsSync(comun) && leerEnv(comun).CLIENTE === cliente) return comun;
  salir(`no hay entorno para "${cliente}": creá .env.${cliente}.local (con CLIENTE="${cliente}" y su DATABASE_URL).`);
}

/** "ep-algo-123.neon.tech/neondb" (sin usuario ni clave) para mostrar a qué base se conecta. */
function describirBase(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(DATABASE_URL inválida)";
  }
}

/** Un argumento para la consola de Windows: entre comillas si hace falta. */
function comillas(arg) {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`;
}

function main() {
  const [cliente, comando, ...args] = process.argv.slice(2);
  if (!cliente || !comando) salir("uso: node scripts/con-cliente.js <cliente> <comando> [argumentos]");
  if (!/^[a-z0-9-]+$/.test(cliente)) salir(`nombre de cliente inválido: "${cliente}"`);
  if (!fs.existsSync(path.join(RAIZ, "clientes", cliente))) salir(`no existe clientes/${cliente}/`);

  const archivo = archivoDe(cliente);
  const vars = leerEnv(archivo);
  if (vars.CLIENTE !== cliente) {
    salir(`${path.basename(archivo)} dice CLIENTE="${vars.CLIENTE ?? ""}", no "${cliente}". No corro nada.`);
  }
  if (!vars.DATABASE_URL) salir(`${path.basename(archivo)} no tiene DATABASE_URL.`);

  // Lo que definen los otros .env*.local y este no, vacío (Next y Prisma no pisan lo que ya está)
  const env = { ...process.env };
  for (const otro of fs.readdirSync(RAIZ).filter((f) => /^\.env.*\.local$/.test(f))) {
    for (const clave of Object.keys(leerEnv(path.join(RAIZ, otro)))) env[clave] = "";
  }
  Object.assign(env, vars);

  console.log(`▶ Cliente ${cliente} · base ${describirBase(vars.DATABASE_URL)} · entorno ${path.basename(archivo)}`);

  const scripts = require(path.join(RAIZ, "package.json")).scripts ?? {};
  let r;
  if (comando === "node") {
    // El mismo node que corre este script (npx node bajaría otro)
    r = spawnSync(process.execPath, args, { cwd: RAIZ, env, stdio: "inherit" });
  } else {
    const [ejecutable, argumentos] = scripts[comando]
      ? ["npm", ["run", comando, ...(args.length ? ["--", ...args] : [])]]
      : ["npx", [comando, ...args]];
    // En Windows npm y npx son .cmd y necesitan la consola: los argumentos van entre comillas
    const windows = process.platform === "win32";
    const lista = windows ? argumentos.map(comillas) : argumentos;
    r = spawnSync(ejecutable, lista, { cwd: RAIZ, env, stdio: "inherit", shell: windows });
  }
  process.exit(r.status ?? 1);
}

if (require.main === module) main();

module.exports = { leerEnv, describirBase };
