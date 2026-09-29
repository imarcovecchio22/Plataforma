import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { leerEnv, describirBase } = require("../scripts/con-cliente.js");

const RAIZ = path.resolve(__dirname, "..");
const SCRIPT = path.join(RAIZ, "scripts", "con-cliente.js");
// Un archivo de entorno de prueba para el cliente de ejemplo (se borra al terminar)
const ENV_EJEMPLO = path.join(RAIZ, ".env.ejemplo.local");
const correr = (...args: string[]) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: RAIZ, encoding: "utf8" });

afterEach(() => fs.rmSync(ENV_EJEMPLO, { force: true }));

describe("con-cliente", () => {
  it("lee el archivo de entorno con y sin comillas", () => {
    const archivo = path.join(os.tmpdir(), `env-prueba-${process.pid}`);
    fs.writeFileSync(archivo, '# comentario\nCLIENTE="rino"\nVACIA=\nSIMPLE=\'hola\'\nURL=postgresql://u:c@host/db?a=1&b=2\n');
    expect(leerEnv(archivo)).toEqual({ CLIENTE: "rino", VACIA: "", SIMPLE: "hola", URL: "postgresql://u:c@host/db?a=1&b=2" });
    fs.rmSync(archivo);
  });

  it("muestra la base sin usuario ni clave", () => {
    expect(describirBase("postgresql://yo:secreto@ep-algo.neon.tech/neondb?sslmode=require")).toBe("ep-algo.neon.tech/neondb");
  });

  it("no corre nada si el archivo es de otro cliente", () => {
    fs.writeFileSync(ENV_EJEMPLO, 'CLIENTE="melera"\nDATABASE_URL="postgresql://u:c@h/db"\n');
    const r = correr("ejemplo", "node", "-e", "console.log('CORRIO')");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('.env.ejemplo.local dice CLIENTE="melera", no "ejemplo"');
    expect(r.stdout).not.toContain("CORRIO");
  });

  it("corre con el entorno del cliente y vacía lo que define otro cliente", () => {
    fs.writeFileSync(ENV_EJEMPLO, 'CLIENTE="ejemplo"\nDATABASE_URL="postgresql://u:c@base-ejemplo/db"\n');
    const r = correr("ejemplo", "node", "-e", "console.log(JSON.stringify({ c: process.env.CLIENTE, db: process.env.DATABASE_URL, admin: process.env.ADMIN_USER }))");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("▶ Cliente ejemplo · base base-ejemplo/db · entorno .env.ejemplo.local");
    const datos = JSON.parse(r.stdout.trim().split("\n").pop()!);
    expect(datos.c).toBe("ejemplo");
    expect(datos.db).toBe("postgresql://u:c@base-ejemplo/db");
    // ADMIN_USER está en .env.local (Melera) si existe: acá tiene que llegar vacío
    if (fs.existsSync(path.join(RAIZ, ".env.local"))) expect(datos.admin).toBe("");
  });

  it("sin archivo de entorno ni cliente existente, explica qué falta", () => {
    expect(correr("ejemplo", "node", "-e", "1").stderr).toContain("creá .env.ejemplo.local");
    expect(correr("no-existe", "node", "-e", "1").stderr).toContain("no existe clientes/no-existe/");
  });
});
