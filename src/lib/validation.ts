import { z } from "zod";
import { esUrlPublicaHttps } from "@/lib/urls";
import { parsearPalabrasClave } from "@/lib/instagram/reglas";
import { cliente, unidadDe } from "@/plataforma/cliente";
import { FORMATO_SLUG } from "@/lib/slug";
import { claveEleccion } from "@/lib/opciones";
import { errorEscalones } from "@/lib/precios";

/** Opciones elegidas: { "Color": "Rojo" } (hasta 3, textos cortos). */
const eleccionSchema = z
  .record(z.string().max(60), z.string().min(1).max(60))
  .refine((e) => Object.keys(e).length <= 3, "Demasiadas opciones");

export const checkoutSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá tu nombre"),
  apellido: z.string().trim().min(1, "Ingresá tu apellido"),
  email: z.string().trim().email("Ingresá un email válido"),
  telefono: z.string().trim().min(6, "Ingresá un teléfono válido"),
  calle: z.string().trim().min(1, "Ingresá la calle"),
  numero_dir: z.string().trim().min(1, "Ingresá el número"),
  pisoDepto: z.string().trim().optional().default(""),
  localidad: z.string().trim().min(1, "Ingresá el barrio"),
  // Zona de envío elegida (id de ZonaEnvio); sin ella, si hay una sola zona activa, esa
  zona: z.coerce.number().int().positive().optional(),
  codigoPostal: z.string().trim().min(1, "Ingresá el código postal"),
  // Un solo producto (el formulario de siempre): su slug (sin él, el destacado) y la cantidad
  cantidad: z.coerce.number().int().min(1, "La cantidad mínima es 1").max(1000).default(1),
  producto: z.string().trim().max(80).optional().default(""),
  // Lo elegido de las opciones del producto (config.catalogo.opciones): { Color: "Rojo" }
  opciones: eleccionSchema.optional(),
  // Varios productos (el carrito): si viene, reemplaza a producto y cantidad. El mismo producto
  // puede venir en varias líneas con distintas opciones, pero no dos veces con las mismas.
  items: z
    .array(
      z.object({
        producto: z.string().trim().min(1).max(80),
        cantidad: z.coerce.number().int().min(1, "La cantidad mínima es 1").max(1000),
        opciones: eleccionSchema.optional(),
      })
    )
    .min(1, "El carrito está vacío")
    .max(20, "Hasta 20 productos por pedido")
    .refine(
      (l) => new Set(l.map((i) => `${i.producto}|${claveEleccion(i.opciones)}`)).size === l.length,
      "Hay productos repetidos en el pedido"
    )
    .optional(),
  origen: z.string().trim().max(50).optional().default(""),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * "@@juan", " juan ", "instagram.com/juan/" -> "juan" (sin @).
 * Devuelve "" si no queda nada.
 */
export function limpiarUsuarioInstagram(valor: string) {
  return valor
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "")
    .trim();
}

const USUARIO_INSTAGRAM = /^[a-zA-Z0-9._]{1,30}$/;

export const consultaSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "Ingresá tu nombre (mínimo 2 letras)")
      .max(80, "El nombre puede tener hasta 80 caracteres"),
    canal: z.enum(["instagram", "email"], {
      errorMap: () => ({ message: "Elegí por dónde te respondemos" }),
    }),
    instagram: z.string().optional().default(""),
    email: z.string().trim().optional().default(""),
    mensaje: z
      .string()
      .trim()
      .min(5, "Contanos un poco más en tu consulta (mínimo 5 caracteres)")
      .max(1500, "La consulta puede tener hasta 1500 caracteres"),
    origen: z.string().trim().max(50).optional().default(""),
    // anti-spam: honeypot que tiene que llegar vacío y ms desde que se abrió el form
    empresa: z.string().optional().default(""),
    tiempo: z.coerce.number().optional().default(0),
  })
  .transform((data) => ({ ...data, instagram: limpiarUsuarioInstagram(data.instagram) }))
  .superRefine((data, ctx) => {
    if (data.canal === "instagram") {
      if (!data.instagram) {
        ctx.addIssue({ code: "custom", path: ["instagram"], message: "Ingresá tu usuario de Instagram" });
      } else if (!USUARIO_INSTAGRAM.test(data.instagram)) {
        ctx.addIssue({
          code: "custom",
          path: ["instagram"],
          message: "Ese usuario de Instagram no parece válido (solo letras, números, puntos y guiones bajos)",
        });
      }
    }
    if (data.canal === "email") {
      if (!data.email) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Ingresá tu email" });
      } else if (!z.string().email().safeParse(data.email).success) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Ingresá un email válido" });
      }
    }
  });

export type ConsultaInput = z.infer<typeof consultaSchema>;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Post del cronograma de Instagram cargado desde el admin. */
export const postIGSchema = z
  .object({
    fecha: z
      .string()
      .regex(FECHA, "La fecha tiene que tener el formato AAAA-MM-DD")
      .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Fecha inválida"),
    tipo: z.enum(["presentacion", "producto", "dato", "promo"], {
      errorMap: () => ({ message: "Elegí el tipo de post" }),
    }),
    // Uno de los estilos que declara el cliente (config.estilosInstagram)
    estilo: z
      .string({ errorMap: () => ({ message: "Elegí el estilo" }) })
      .refine((e) => cliente.estilosInstagram.some((d) => d.id === e), "Elegí el estilo"),
    tema: z
      .string()
      .trim()
      .min(3, "Escribí el tema del post (mínimo 3 caracteres)")
      .max(300, "El tema puede tener hasta 300 caracteres"),
    nombreProducto: z.string().trim().max(80, "El nombre puede tener hasta 80 caracteres").optional().default(""),
    categoria: z.string().trim().max(60).optional().default(""),
    precio: z.string().trim().max(20, "El precio puede tener hasta 20 caracteres").optional().default(""),
    presentacion: z.string().trim().max(60).optional().default(""),
    imagenUrl: z.string().trim().max(500).optional().default(""),
    // Producto del catálogo (producto y promo); vacío = a mano (producto) o el destacado (promo)
    productoId: z.string().trim().max(50).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.tipo !== "producto" || data.productoId) return;
    if (!data.nombreProducto) ctx.addIssue({ code: "custom", path: ["nombreProducto"], message: "Falta el nombre del producto" });
    if (!data.precio) ctx.addIssue({ code: "custom", path: ["precio"], message: "Falta el precio" });
    if (!data.imagenUrl) {
      ctx.addIssue({ code: "custom", path: ["imagenUrl"], message: "Falta la foto del producto" });
    } else if (!esUrlPublicaHttps(data.imagenUrl)) {
      ctx.addIssue({ code: "custom", path: ["imagenUrl"], message: "La foto tiene que ser un link https público" });
    }
  });

export type PostIGInput = z.infer<typeof postIGSchema>;

// ── Respuestas automáticas de Instagram ──

// Los títulos de botón se cuentan por caracteres visibles (un emoji cuenta como uno).
const largo = (s: string) => Array.from(s).length;

export const botonReglaSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Cada botón necesita un título")
    .refine((s) => largo(s) <= 20, "El título de un botón puede tener hasta 20 caracteres"),
  url: z
    .string()
    .trim()
    .url("La URL de un botón no es válida")
    .refine((u) => u.startsWith("https://"), "La URL de un botón tiene que empezar con https://"),
});

export const autoRespuestaSchema = z.object({
  nombre: z.string().trim().min(1, "Poné un nombre para reconocer la regla").max(80),
  palabrasClave: z
    .array(z.string())
    .transform((lista) => parsearPalabrasClave(lista))
    .refine((lista) => lista.length > 0, "Poné al menos una palabra clave"),
  coincidencia: z.enum(["contiene", "exacta"]),
  canal: z.enum(["dm", "comentario", "ambos"]),
  respuesta: z.string().trim().min(1, "Escribí la respuesta").max(640, "La respuesta puede tener hasta 640 caracteres"),
  botones: z.array(botonReglaSchema).max(3, "Hasta 3 botones"),
  respuestaPublicaComentario: z
    .string()
    .trim()
    .max(300, "La respuesta pública puede tener hasta 300 caracteres")
    .transform((s) => s || null)
    .nullable()
    .optional()
    .default(null),
  prioridad: z.coerce.number().int().min(-100).max(1000),
  activa: z.boolean(),
});

export type AutoRespuestaInput = z.infer<typeof autoRespuestaSchema>;

// ── Preguntas frecuentes de /consultas ──

export const preguntaFrecuenteSchema = z.object({
  pregunta: z
    .string()
    .trim()
    .min(3, "Escribí la pregunta (mínimo 3 caracteres)")
    .max(200, "La pregunta puede tener hasta 200 caracteres"),
  respuesta: z
    .string()
    .trim()
    .min(3, "Escribí la respuesta (mínimo 3 caracteres)")
    .max(1500, "La respuesta puede tener hasta 1500 caracteres"),
  orden: z.coerce.number().int("El orden tiene que ser un número entero").min(-1000).max(10000),
  activa: z.boolean(),
});

export type PreguntaFrecuenteInput = z.infer<typeof preguntaFrecuenteSchema>;

// ── Zonas de envío (/admin/envios) ──

export const zonaEnvioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Escribí el nombre de la zona (mínimo 2 caracteres)")
    .max(60, "El nombre puede tener hasta 60 caracteres"),
  // null (o vacío en el formulario) = a coordinar después de la compra
  costo: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce
      .number()
      .int("El costo tiene que ser un número entero")
      .min(1, "El costo tiene que ser mayor a 0 (vacío = a coordinar)")
      .max(10_000_000)
      .nullable()
  ),
  aclaracion: z.string().trim().max(200, "La aclaración puede tener hasta 200 caracteres").default(""),
  detalleResumen: z.string().trim().max(200, "El texto del resumen puede tener hasta 200 caracteres").default(""),
  orden: z.coerce.number().int("El orden tiene que ser un número entero").min(-1000).max(10000),
  activa: z.boolean(),
});

export type ZonaEnvioInput = z.infer<typeof zonaEnvioSchema>;

// ── Categorías (/admin/categorias, config.catalogo.categorias) ──

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre de la categoría (mínimo 2 caracteres)").max(50, "El nombre puede tener hasta 50 caracteres"),
  slug: z
    .string()
    .trim()
    .max(60, "El slug puede tener hasta 60 caracteres")
    .regex(FORMATO_SLUG, "El slug solo puede tener minúsculas, números y guiones (ej. macetas)"),
  orden: z.coerce.number().int("El orden tiene que ser un número entero").min(-1000).max(10000),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;

// ── Productos (/admin/productos) ──

export const productoSchema = z
  .object({
    nombre: z.string().trim().min(1, "Poné el nombre del producto").max(120, "El nombre puede tener hasta 120 caracteres"),
    slug: z
      .string()
      .trim()
      .max(80, "El slug puede tener hasta 80 caracteres")
      .regex(FORMATO_SLUG, "El slug solo puede tener minúsculas, números y guiones (ej. mi-producto)"),
    descripcion: z.string().trim().max(2000, "La descripción puede tener hasta 2000 caracteres").default(""),
    precio: z.coerce.number().int("El precio va sin centavos").min(1, "El precio tiene que ser mayor a 0").max(10_000_000),
    stock: z.coerce.number().int("El stock va sin decimales").min(0, "El stock no puede ser negativo").max(1_000_000),
    // Promos por cantidad: precio por unidad desde cierta cantidad (hasta 3)
    escalones: z
      .array(z.object({ desde: z.coerce.number().int().min(2).max(1000), precio: z.coerce.number().int().min(1).max(10_000_000) }))
      .max(3, "Hasta 3 promos")
      .default([]),
    // Foto: link https público (vacío = la de la config del cliente)
    imagenUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => !v || esUrlPublicaHttps(v), "La foto tiene que ser un link https público")
      .transform((v) => v || null)
      .default(""),
    activo: z.boolean(),
    orden: z.coerce.number().int("El orden va sin decimales").min(-100_000).max(100_000),
    // Unidad propia (vacía = la del cliente) y lo que va al lado del precio (vacío = el del cliente)
    unidadSingular: z.string().trim().max(30, "La unidad puede tener hasta 30 caracteres").default(""),
    unidadPlural: z.string().trim().max(30, "La unidad puede tener hasta 30 caracteres").default(""),
    unidadGenero: z.enum(["masculino", "femenino"]).default("masculino"),
    aclaracionPrecio: z.string().trim().max(80, "La aclaración puede tener hasta 80 caracteres").default(""),
    // Opciones que elige el comprador (config.catalogo.opciones): hasta 3, con 1 a 20 valores
    opciones: z
      .array(
        z.object({
          nombre: z.string().trim().min(1, "Cada opción necesita un nombre (ej. Color)").max(30, "El nombre de una opción puede tener hasta 30 caracteres"),
          valores: z
            .array(z.string().trim().min(1).max(40, "Cada valor puede tener hasta 40 caracteres"))
            .min(1, "Cada opción necesita al menos un valor")
            .max(20, "Hasta 20 valores por opción")
            .refine((v) => new Set(v).size === v.length, "Hay valores repetidos en una opción"),
        })
      )
      .max(3, "Hasta 3 opciones por producto")
      .refine((o) => new Set(o.map((x) => x.nombre.toLowerCase())).size === o.length, "Hay dos opciones con el mismo nombre")
      .default([]),
    // Categoría (config.catalogo.categorias): id, o vacío = sin categoría
    categoriaId: z
      .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
      .optional()
      .transform((v) => (typeof v === "number" ? v : null)),
  })
  .superRefine((p, ctx) => {
    if (Boolean(p.unidadSingular) !== Boolean(p.unidadPlural)) {
      ctx.addIssue({ code: "custom", path: ["unidadPlural"], message: "Completá la unidad en singular y en plural (o dejá las dos vacías)" });
      return;
    }
    const error = errorEscalones(p.precio, p.escalones, unidadDe(p));
    if (error) ctx.addIssue({ code: "custom", path: ["escalones"], message: error });
  })
  .transform((p) => ({
    ...p,
    escalones: [...p.escalones].sort((a, b) => a.desde - b.desde),
    unidadSingular: p.unidadSingular || null,
    unidadPlural: p.unidadPlural || null,
    unidadGenero: p.unidadSingular ? p.unidadGenero : null,
    aclaracionPrecio: p.aclaracionPrecio || null,
  }));

export type ProductoInput = z.infer<typeof productoSchema>;
