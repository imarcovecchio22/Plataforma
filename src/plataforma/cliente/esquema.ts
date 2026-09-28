import { z } from "zod";

/**
 * Config de identidad de un cliente (clientes/<slug>/config.ts). Se valida antes de cada build
 * (scripts/preparar-cliente.ts): si no cumple este esquema, el build falla.
 *
 * Es pública: llega al navegador junto con los componentes que la usan. Nada secreto acá
 * (los secretos van en las variables de entorno del despliegue).
 */

function localeValido(locale: string) {
  try {
    return Intl.NumberFormat.supportedLocalesOf([locale]).length === 1;
  } catch {
    return false;
  }
}

function zonaHorariaValida(zona: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

function monedaValida(moneda: string) {
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: moneda });
    return /^[A-Z]{3}$/.test(moneda);
  } catch {
    return false;
  }
}

const texto = z.string().trim().min(1, "No puede estar vacío");

const rutaPublica = z
  .string()
  .regex(/^\/[\w./-]+$/, "Tiene que ser una ruta de public/ que empiece con / (ej. /brand/logo.png)")
  .refine((r) => !r.includes(".."), "La ruta no puede tener ..");

export const esquemaCliente = z
  .object({
    /** Igual al nombre de la carpeta en clientes/ y al valor de CLIENTE. */
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El slug solo puede tener minúsculas, números y guiones"),
    /** Nombre de la marca, como se muestra. */
    nombre: z.string().trim().min(1, "Falta el nombre de la marca"),
    /** URL pública de producción, sin barra al final (ej. https://melera.vercel.app). */
    dominio: z
      .string()
      .url("El dominio tiene que ser una URL completa")
      .refine((u) => u.startsWith("https://"), "El dominio tiene que empezar con https://")
      .refine((u) => !u.endsWith("/"), "El dominio va sin barra al final"),
    /** Usuario de Instagram de la marca, sin @ (ej. melera.miel). */
    instagram: z
      .string()
      .regex(/^[a-zA-Z0-9._]{1,30}$/, "Usuario de Instagram inválido (sin @, solo letras, números, puntos y guiones bajos)"),
    /** Título, descripción e imagen para buscadores y links compartidos (layout raíz). */
    seo: z
      .object({
        titulo: z.string().trim().min(1),
        descripcion: z.string().trim().min(1),
        /** Texto alternativo de la imagen para links compartidos. */
        altImagen: z.string().trim().min(1),
      })
      .strict(),
    /**
     * Imágenes de la marca. Las rutas son de clientes/<slug>/public/ (se copian a public/ antes
     * de dev y build), empiezan con / y el archivo tiene que existir.
     */
    imagenes: z
      .object({
        /** Logo cuadrado del admin (login y menú). */
        logo: rutaPublica,
        /** Imagen para links compartidos (1200 × 630). */
        compartir: rutaPublica,
        /** Foto del producto, sin fondo (home, /producto y posts de promos). */
        producto: z
          .object({
            src: rutaPublica,
            alt: texto,
            ancho: z.number().int().positive(),
            alto: z.number().int().positive(),
          })
          .strict(),
      })
      .strict(),
    /** Lo que Gemini tiene que saber de la marca (chat de la web y textos de Instagram). */
    ia: z
      .object({
        /** Va después del nombre: "Sos el asistente virtual de Melera, <descripcion>." */
        descripcion: texto,
        /** "Solo respondés preguntas relacionadas con <tema>." */
        tema: texto,
        chat: z
          .object({
            /** "- Producto: <producto>, $ 6.500" (el precio sale de la base). */
            producto: texto,
            /**
             * Datos que el asistente conoce, uno por línea (ej. "Pago: online con Mercado Pago…").
             * $SITIO se reemplaza por el dominio sin https:// (ej. melera.vercel.app).
             * Instagram, el sitio y a dónde mandar para comprar o consultar los agrega la plataforma.
             */
            datos: z.array(texto).min(1),
          })
          .strict(),
        copy: z
          .object({
            /** Va después del nombre: "Sos copywriter de Melera, <rol>." */
            rol: texto,
            tono: texto,
            /** A qué corresponden los precios de las promos (ej. "miel de 500 g"). */
            promosDe: texto,
            /** Sobre qué son los "datos curiosos" (ej. "abejas/apicultura/miel"). */
            temaDatos: texto,
            /** Ejemplos que se le dan a Gemini para cada campo. */
            ejemplos: z
              .object({
                titulo: texto,
                caracteristicas: texto,
                presentacion: texto,
                ctaPromo: texto,
                taglineDato: texto,
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    /** Cómo se llama lo que se vende, para precios, promos y cantidades (ej. frasco / frascos). */
    unidad: z
      .object({
        singular: texto,
        plural: texto,
        /** Para "cada uno" / "cada una". */
        genero: z.enum(["masculino", "femenino"]),
      })
      .strict(),
    /**
     * Textos de la tienda. En los que dicen "admite **negrita**", lo que va entre ** se
     * muestra destacado.
     */
    textos: z
      .object({
        /** Emoji de la marca (saludo del chat, gracias de /consultas, respuestas de ejemplo). */
        emoji: z.string().trim().min(1),
        hero: z
          .object({
            titulo: texto,
            bajada: texto,
            /** Botón que baja a "Quiénes somos". */
            botonNosotros: texto,
          })
          .strict(),
        /** Va al lado del precio en la home y en /producto (ej. "el frasco de 500 g"). */
        aclaracionPrecio: texto,
        nosotros: z
          .object({
            titulo: texto,
            /** Admite **negrita**. */
            parrafos: z.array(texto).min(1),
          })
          .strict(),
        /** Línea debajo del nombre en el pie. */
        pie: texto,
        /** Descripción de /consultas para buscadores. */
        descripcionConsultas: texto,
        privacidad: z
          .object({
            /** Va entre paréntesis después del nombre (ej. "miel artesanal de Tomás Jofré, Buenos Aires"). */
            quienes: texto,
            /** Qué información mandan las respuestas automáticas (ej. "información de la miel"). */
            infoRespuestas: texto,
          })
          .strict(),
        /** Título de la ventana del chat. */
        tituloChat: texto,
        /** Ejemplos (placeholders) de los formularios del admin. */
        ejemplosAdmin: z
          .object({
            palabrasClave: texto,
            tituloBoton: texto,
            temaPost: texto,
            nombreProducto: texto,
            categoria: texto,
            presentacion: texto,
            mensajeProbador: texto,
          })
          .strict(),
      })
      .strict(),
    region: z
      .object({
        /** Código ISO 4217 (ej. ARS). También es la moneda que se le pasa a Mercado Pago. */
        moneda: z.string().refine(monedaValida, "Moneda inválida (código ISO de 3 letras, ej. ARS)"),
        /** Para formatear precios y fechas (ej. es-AR). */
        locale: z.string().refine(localeValido, "Locale inválido (ej. es-AR)"),
        /** Zona horaria IANA (ej. America/Argentina/Buenos_Aires). */
        zonaHoraria: z.string().refine(zonaHorariaValida, "Zona horaria inválida (ej. America/Argentina/Buenos_Aires)"),
      })
      .strict(),
  })
  .strict();

export type ConfigCliente = z.infer<typeof esquemaCliente>;

/** Para escribir clientes/<slug>/config.ts con autocompletado y tipos. */
export function definirCliente(config: ConfigCliente): ConfigCliente {
  return config;
}
