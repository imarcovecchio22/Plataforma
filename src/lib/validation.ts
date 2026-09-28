import { z } from "zod";
import { esUrlPublicaHttps } from "@/lib/urls";
import { parsearPalabrasClave } from "@/lib/instagram/reglas";

export const checkoutSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá tu nombre"),
  apellido: z.string().trim().min(1, "Ingresá tu apellido"),
  email: z.string().trim().email("Ingresá un email válido"),
  telefono: z.string().trim().min(6, "Ingresá un teléfono válido"),
  calle: z.string().trim().min(1, "Ingresá la calle"),
  numero_dir: z.string().trim().min(1, "Ingresá el número"),
  pisoDepto: z.string().trim().optional().default(""),
  localidad: z.string().trim().min(1, "Ingresá el barrio"),
  // Por ahora solo se envía dentro de CABA.
  provincia: z.string().trim().refine((p) => p === "CABA", "Por ahora enviamos solo dentro de CABA"),
  codigoPostal: z.string().trim().min(1, "Ingresá el código postal"),
  cantidad: z.coerce.number().int().min(1, "La cantidad mínima es 1"),
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
    estilo: z.enum(["organico", "geo", "panal"], { errorMap: () => ({ message: "Elegí el estilo" }) }),
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
  })
  .superRefine((data, ctx) => {
    if (data.tipo !== "producto") return;
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
