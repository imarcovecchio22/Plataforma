/**
 * Imágenes de Instagram: arma el HTML de una plantilla del cliente con los datos del post, firma
 * los datos en la URL de la imagen (/api/img/<formato>/<token>.jpg) y la dibuja con Chromium.
 *
 * Las plantillas son del cliente: clientes/<slug>/instagram/<estilo>-<tipo>.html, más su logo.png
 * (se inserta en {{logo_src}}) y los scripts que pidan con <!--SCRIPT:archivo.js-->. Los estilos
 * los declara config.estilosInstagram. Detalle de las variables en clientes/melera/instagram/README.md.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { renderHtmlToJpeg } from "@/plataforma/imagenes/render";
import { cliente } from "@/plataforma/cliente";
import { TIPOS } from "@/plataforma/imagenes/archivos";

export { TIPOS, plantillasFaltantes } from "@/plataforma/imagenes/archivos";

export type DatosPlantilla = Record<string, string | undefined | null>;
export type Formato = "feed" | "story";

const REQUIRED_FIELDS: Record<(typeof TIPOS)[number], string[]> = {
  presentacion: ["fecha", "tagline", "titulo", "texto"],
  producto: ["fecha", "imagen_url", "nombre_producto", "precio"],
  dato: ["fecha", "numero", "texto_dato"],
  // promos: "1 frasco|$ 6.500|;5 frascos|$ 30.000|$ 6.000 c/u · ahorrás $ 2.500" (lo arma la web con los precios de la base)
  promo: ["fecha", "titulo", "promos"],
};

// Tamaños de render: la misma plantilla se adapta sola a cada formato.
export const FORMATOS: Record<Formato, { viewport_width: number; viewport_height: number }> = {
  feed: { viewport_width: 1080, viewport_height: 1350 },
  story: { viewport_width: 1080, viewport_height: 1920 },
};

// Campos que aceptan <em>/<i> (cursiva con el color de la marca) y <br>.
const RICH_FIELDS = ["titulo", "nombre_producto"];

/** Carpeta de las plantillas del cliente (en Vercel, incluida con outputFileTracingIncludes). */
export function carpetaPlantillas(slug = cliente.slug) {
  return path.join(process.cwd(), "clientes", slug, "instagram");
}

/** Ids de los estilos del cliente (config.estilosInstagram). */
export function estilosDelCliente() {
  return cliente.estilosInstagram.map((e) => e.id);
}

/** ¿La plantilla de este estilo dibuja algo a partir del id del post? */
export function estiloUsaSemilla(estilo: string) {
  return cliente.estilosInstagram.some((e) => e.id === estilo && e.usaSemilla);
}

const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== "";

// Adapta los nombres de campo viejos de la Sheet/Make a los de las plantillas nuevas.
export function normalizeData(data: DatosPlantilla): DatosPlantilla {
  const out: DatosPlantilla = { ...data };

  if (!has(out.texto) && has(out.subtitulo)) out.texto = out.subtitulo;

  if (!has(out.caracteristicas)) {
    out.caracteristicas = ["caracteristica_1", "caracteristica_2", "caracteristica_3"]
      .map((k) => out[k])
      .filter(has)
      .join("|");
  }

  if (has(out.numero) && has(out.sufijo) && !String(out.numero).endsWith(String(out.sufijo))) {
    out.numero = `${out.numero}${out.sufijo}`;
  }

  if (has(out.precio)) out.precio = formatPrecio(out.precio);

  // el precio ya va grande abajo: no lo repitas como etiqueta
  if (has(out.caracteristicas)) {
    const precioDigits = digitsOf(out.precio);
    out.caracteristicas = String(out.caracteristicas)
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s && !s.includes("$") && !(precioDigits && digitsOf(s) === precioDigits))
      .join("|");
  }

  return out;
}

function digitsOf(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

// "6500" / "6.500" / 6500 -> "$6.500"; si ya trae "$" u otro texto, se deja como está.
function formatPrecio(value: unknown) {
  const s = String(value).trim();
  if (!/^[\d.\s]+$/.test(s)) return s;
  return `$${digitsOf(s).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class SignatureError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "SignatureError";
  }
}

export function validateData(data: DatosPlantilla) {
  if (!data || typeof data !== "object") {
    throw new ValidationError("El body debe ser un objeto JSON.");
  }

  const { tipo, estilo } = data;
  if (!tipo) {
    throw new ValidationError('Falta el campo "tipo".');
  }
  if (!(TIPOS as readonly string[]).includes(tipo)) {
    throw new ValidationError(`Tipo "${tipo}" inválido. Debe ser uno de: ${TIPOS.join(", ")}.`);
  }
  if (!estilo) {
    throw new ValidationError('Falta el campo "estilo".');
  }
  const estilos = estilosDelCliente();
  if (!estilos.includes(estilo)) {
    throw new ValidationError(`Estilo "${estilo}" inválido. Debe ser uno de: ${estilos.join(", ")}.`);
  }

  const required = REQUIRED_FIELDS[tipo as (typeof TIPOS)[number]];
  const missing = required.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    throw new ValidationError(`Faltan variables requeridas para el tipo "${tipo}": ${missing.join(", ")}.`);
  }
}

// Los scripts compartidos entre plantillas (ej. el dibujo del panal) se insertan donde la
// plantilla dice <!--SCRIPT:archivo.js--> (archivo en la misma carpeta).
const scripts = new Map<string, string>();
function leerScript(carpeta: string, archivo: string) {
  const ruta = path.join(carpeta, archivo);
  if (!scripts.has(ruta)) scripts.set(ruta, fs.readFileSync(ruta, "utf8"));
  return scripts.get(ruta)!;
}

export function loadTemplate(estilo: string, tipo: string) {
  const carpeta = carpetaPlantillas();
  const fileName = `${estilo}-${tipo}.html`;
  const filePath = path.join(carpeta, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el template "${fileName}" en ${carpeta}.`);
  }
  const html = fs.readFileSync(filePath, "utf8");
  // Con función: el código tiene "$" que un reemplazo por texto interpretaría.
  return html.replace(/<!--SCRIPT:([\w.-]+\.js)-->/g, (_, archivo: string) => `<script>${leerScript(carpeta, archivo)}</script>`);
}

function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escapa todo y después rehabilita solo <em>, <i> y <br>.
function escapeRichHtml(value: unknown) {
  return escapeHtml(value)
    .replace(/&lt;(\/?)(em|i)&gt;/gi, "<$1$2>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");
}

// imagen_url va dentro de url('...') en el CSS: ahí no se decodifican entidades,
// así que solo se sacan los caracteres que podrían romper la regla.
// (encodeURIComponent no sirve acá: deja ' ( ) sin codificar)
const CSS_URL_ESCAPES: Record<string, string> = {
  "'": "%27",
  '"': "%22",
  "(": "%28",
  ")": "%29",
  "\\": "%5C",
  "<": "%3C",
  ">": "%3E",
};

function sanitizeCssUrl(value: unknown) {
  return String(value).replace(/['"()\\<>]|\s/g, (c) => CSS_URL_ESCAPES[c] ?? encodeURIComponent(c));
}

export function renderTemplate(html: string, data: DatosPlantilla) {
  let rendered = html.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_match, varName: string, truthyBlock: string, falsyBlock?: string) => {
      return data[varName] ? truthyBlock : falsyBlock || "";
    }
  );

  rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    const value = data[varName];
    if (value === undefined || value === null) return "";
    if (varName === "imagen_url") return sanitizeCssUrl(value);
    if (RICH_FIELDS.includes(varName)) return escapeRichHtml(value);
    return escapeHtml(value);
  });

  return rendered;
}

// Campos que viajan en la URL de la imagen (el resto no se muestra en las plantillas).
const TOKEN_FIELDS = [
  "tipo", "estilo", "fecha",
  "tagline", "titulo", "texto", "cta",
  "numero", "texto_dato",
  "imagen_url", "nombre_producto", "caracteristicas", "precio",
  "promos",
  // estilos con semilla: el id del post, para que la imagen salga siempre igual para ese post
  "semilla",
];

function getSigningSecret() {
  const secret = process.env.IMAGE_SIGNING_SECRET || process.env.GENERATE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Falta IMAGE_SIGNING_SECRET (o GENERATE_WEBHOOK_SECRET) para firmar las URLs.");
  }
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("base64url").slice(0, 22);
}

// Datos del post -> "<json comprimido>.<firma>", para usar en /api/img/<formato>/<token>.jpg
export function createImageToken(data: DatosPlantilla) {
  const normalized = normalizeData(data);
  validateData(normalized);
  const picked: Record<string, string> = {};
  for (const key of TOKEN_FIELDS) {
    if (normalized[key] !== undefined && normalized[key] !== null && normalized[key] !== "") {
      picked[key] = String(normalized[key]);
    }
  }
  const payload = zlib.deflateRawSync(Buffer.from(JSON.stringify(picked))).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readImageToken(token: string): DatosPlantilla {
  // tolera ".jpg" agregados al final (el escenario de stories le suma uno)
  const clean = String(token).replace(/(\.jpe?g)+$/i, "");
  const [payload, signature] = clean.split(".");
  if (!payload || !signature) throw new SignatureError("Token inválido.");
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new SignatureError("Firma inválida.");
  }
  return JSON.parse(zlib.inflateRawSync(Buffer.from(payload, "base64url")).toString("utf8"));
}

let logoSrc: string | undefined;
// Logo embebido como data URI (logo.png junto a las plantillas; si no hay, queda vacío).
function getLogoSrc() {
  if (logoSrc === undefined) {
    const logoPath = path.join(carpetaPlantillas(), "logo.png");
    logoSrc = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}` : "";
  }
  return logoSrc;
}

export function buildHtml(data: DatosPlantilla) {
  const normalized: DatosPlantilla = { ...normalizeData(data), logo_src: getLogoSrc() };
  validateData(normalized);
  const template = loadTemplate(String(normalized.estilo), String(normalized.tipo));
  return renderTemplate(template, normalized);
}

export function renderImage(data: DatosPlantilla, formato: string = "feed") {
  if (!(formato in FORMATOS)) throw new ValidationError(`Formato "${formato}" inválido.`);
  const html = buildHtml(data);
  const { viewport_width: width, viewport_height: height } = FORMATOS[formato as Formato];
  return renderHtmlToJpeg(html, { width, height });
}

// URLs públicas de feed (1080x1350) y story (1080x1920) para estos datos.
export function buildImageUrls(data: DatosPlantilla, baseUrl: string) {
  const token = createImageToken(data);
  const base = baseUrl.replace(/\/$/, "");
  return {
    image_url: `${base}/api/img/feed/${token}.jpg`,
    story_image_url: `${base}/api/img/story/${token}.jpg`,
  };
}
