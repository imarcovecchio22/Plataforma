import fs from "fs";
import type { Browser } from "puppeteer-core";

// En Vercel (Linux) usa el Chromium de @sparticuz/chromium; en local, Chrome/Edge instalado
// (o el que indique CHROME_PATH).
const LOCAL_BROWSERS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((p): p is string => Boolean(p));

let browserPromise: Promise<Browser> | undefined;

const HOSTS_PRIVADOS = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/i;

// Qué puede cargar la plantilla mientras se dibuja: fuentes de Google e imágenes
// https públicas. Todo lo demás (scripts externos, fetch, redes internas) se bloquea.
export function pedidoPermitido(request: { url(): string; resourceType(): string }) {
  const url = request.url();
  if (url.startsWith("data:") || url === "about:blank") return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || HOSTS_PRIVADOS.test(parsed.hostname)) return false;
  const tipo = request.resourceType();
  if (tipo === "stylesheet" || tipo === "font") {
    return parsed.hostname === "fonts.googleapis.com" || parsed.hostname === "fonts.gstatic.com";
  }
  return tipo === "image";
}

async function launchBrowser(): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer-core");

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const { default: chromium } = await import("@sparticuz/chromium");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath = LOCAL_BROWSERS.find((p) => fs.existsSync(p));
  if (!executablePath) {
    throw new Error("No se encontró Chrome/Edge local. Definí CHROME_PATH.");
  }
  return puppeteer.launch({ executablePath, headless: true });
}

// Reutiliza el navegador mientras la función siga "caliente".
async function getBrowser() {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    if (browser && browser.connected) return browser;
  }
  browserPromise = launchBrowser();
  return browserPromise;
}

export async function renderHtmlToJpeg(html: string, { width, height }: { width: number; height: number }) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (pedidoPermitido(request)) request.continue();
      else request.abort();
    });
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    // Los tipos de puppeteer 25 ya no listan networkidle0 para setContent, pero lo sigue pasando tal
    // cual al LifecycleWatcher (que lo soporta): se mantiene como en render.js.
    await page.setContent(html, { waitUntil: "networkidle0" as "load", timeout: 25000 });
    // fuentes cargadas + script que achica textos largos
    await page.evaluate(async () => {
      await document.fonts.ready;
      // las plantillas que dibujan después de medir (ej. estilo panal) avisan cuándo terminaron
      const lista = (window as unknown as { __plantillaLista?: Promise<unknown> }).__plantillaLista;
      if (lista) await lista;
      await new Promise((r) => setTimeout(r, 300));
    });
    return Buffer.from(await page.screenshot({ type: "jpeg", quality: 92 }));
  } finally {
    await page.close().catch(() => {});
  }
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = undefined;
  if (browser) await browser.close().catch(() => {});
}
