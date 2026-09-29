/**
 * Fuentes de Google de la config (apariencia.fuentes), servidas desde el propio sitio: al preparar
 * el cliente se bajan los .woff2 a public/fuentes/ y sus @font-face se agregan al CSS del tema.
 * Así el sitio no le pide nada a Google (ni la política de seguridad tiene que permitirlo).
 * Solo para scripts (usa fs): lo llama scripts/preparar-cliente.ts.
 */
import fs from "fs";
import path from "path";
import { urlFuentes } from "@/plataforma/cliente/apariencia";
import type { ConfigCliente } from "@/plataforma/cliente/esquema";

// Con un navegador moderno Google responde woff2 (a node le daría ttf)
const NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
// Los juegos de caracteres que alcanzan para español (y portugués, francés…)
const SUBCONJUNTOS = ["latin", "latin-ext"];

/** Google no tiene esa fuente (o esos pesos): la config está mal y el build tiene que fallar. */
export class FuenteInexistente extends Error {}

/** Los @font-face de latin y latin-ext de la hoja de Google, con la URL de cada archivo. */
export function bloquesLatinos(css: string) {
  const bloques: { css: string; url: string }[] = [];
  for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)) {
    if (!SUBCONJUNTOS.includes(m[1])) continue;
    const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(m[2])?.[1];
    if (url) bloques.push({ css: m[2], url });
  }
  return bloques;
}

/** "https://fonts.gstatic.com/s/inter/v13/UcC73Fw.woff2" → "inter-v13-UcC73Fw.woff2" */
export function nombreLocal(url: string) {
  return new URL(url).pathname.replace(/^\/s\//, "").replace(/\//g, "-");
}

/**
 * Baja las fuentes de la config a public/fuentes/ y devuelve sus @font-face apuntando ahí
 * ("" si la config no trae fuentes). Lanza FuenteInexistente si Google no las tiene y otro
 * error si no hay conexión.
 */
export async function descargarFuentes(raiz: string, apariencia: ConfigCliente["apariencia"], pedir: typeof fetch = fetch) {
  const url = urlFuentes(apariencia);
  if (!url) return "";
  const res = await pedir(url, { headers: { "User-Agent": NAVEGADOR }, signal: AbortSignal.timeout(15_000) });
  if (res.status === 400) throw new FuenteInexistente(url);
  if (!res.ok) throw new Error(`Google Fonts respondió ${res.status}`);

  const bloques = bloquesLatinos(await res.text());
  const carpeta = path.join(raiz, "public", "fuentes");
  fs.mkdirSync(carpeta, { recursive: true });
  const bajados = new Map<string, string>();
  for (const { url: archivo } of bloques) {
    if (bajados.has(archivo)) continue;
    const r = await pedir(archivo, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error(`No se pudo bajar ${archivo} (${r.status})`);
    const nombre = nombreLocal(archivo);
    fs.writeFileSync(path.join(carpeta, nombre), Buffer.from(await r.arrayBuffer()));
    bajados.set(archivo, `/fuentes/${nombre}`);
  }
  return bloques.map((b) => b.css.replace(b.url, bajados.get(b.url)!)).join("\n");
}
