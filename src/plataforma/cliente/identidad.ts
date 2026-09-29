/**
 * La identidad que el dueño puede cambiar desde /admin/marca: los textos de la tienda, el color de
 * la marca, el fondo, y el logo y la imagen para compartir. La config del cliente es la identidad
 * por defecto; la base (IdentidadCliente) guarda solo lo que cambió, y esto los mezcla.
 * Sin dependencias de servidor: lo usan la lectura (src/lib/identidad.ts), la API y el admin.
 */
import { z } from "zod";
import type { ConfigCliente } from "@/plataforma/cliente/esquema";
import { escalaDeColor } from "@/plataforma/cliente/escala";
import { esUrlPublicaHttps } from "@/lib/urls";

const texto = (max: number) => z.string().trim().min(1, "No puede quedar vacío").max(max, `Hasta ${max} caracteres`);
const linkImagen = z
  .string()
  .trim()
  .max(500)
  .refine((v) => esUrlPublicaHttps(v), "Tiene que ser un link https público (ej. https://…/logo.png)");

/** Lo editable, todo opcional (lo que no está sale de la config). */
export const esquemaIdentidad = z
  .object({
    textos: z
      .object({
        hero: z.object({ titulo: texto(80), bajada: texto(300), botonNosotros: texto(40) }).partial().strict(),
        nosotros: z
          .object({ titulo: texto(80), parrafos: z.array(texto(600)).min(1, "Tiene que haber al menos un párrafo").max(6, "Hasta 6 párrafos") })
          .partial()
          .strict(),
        pie: texto(160),
        descripcionConsultas: texto(300),
        aclaracionPrecio: texto(60),
      })
      .partial()
      .strict(),
    /** El color principal de la marca: la escala de 10 tonos se arma desde él. */
    colorMarca: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elegí un color (formato #rrggbb)"),
    /** Fondo del tema neutro (con tema propio no se usa). */
    fondo: z.enum(["claro", "oscuro"]),
    imagenes: z.object({ logo: linkImagen, compartir: linkImagen }).partial().strict(),
  })
  .partial()
  .strict();

export type ValoresIdentidad = z.infer<typeof esquemaIdentidad>;

/**
 * Lo guardado, sin confiar en su forma: se queda con cada parte que valida y descarta el resto
 * (así un cambio de esquema o un dato roto nunca rompe el sitio: esa parte vuelve a la config).
 */
export function limpiarValores(crudo: unknown): ValoresIdentidad {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return {};
  const valores = crudo as Record<string, unknown>;
  const limpios: Record<string, unknown> = {};
  for (const [clave, esquema] of Object.entries(esquemaIdentidad.shape)) {
    if (valores[clave] === undefined) continue;
    const r = (esquema as z.ZodTypeAny).safeParse(valores[clave]);
    if (r.success) {
      limpios[clave] = r.data;
    } else if (clave === "textos" || clave === "imagenes") {
      // Por campo: los que validan se quedan
      const parciales = limpiarPorCampo((esquema as z.ZodOptional<z.AnyZodObject>).unwrap(), valores[clave]);
      if (Object.keys(parciales).length) limpios[clave] = parciales;
    }
  }
  return limpios as ValoresIdentidad;
}

function limpiarPorCampo(esquema: z.AnyZodObject, crudo: unknown) {
  if (!crudo || typeof crudo !== "object") return {};
  const salida: Record<string, unknown> = {};
  for (const [campo, sub] of Object.entries(esquema.shape)) {
    const valor = (crudo as Record<string, unknown>)[campo];
    if (valor === undefined) continue;
    const r = (sub as z.ZodTypeAny).safeParse(valor);
    if (r.success) salida[campo] = r.data;
    else if (sub instanceof z.ZodOptional && sub.unwrap() instanceof z.ZodObject) {
      const anidado = limpiarPorCampo(sub.unwrap() as z.AnyZodObject, valor);
      if (Object.keys(anidado).length) salida[campo] = anidado;
    }
  }
  return salida;
}

export type Identidad = {
  textos: ConfigCliente["textos"];
  colores: ConfigCliente["colores"];
  fondo: "claro" | "oscuro";
  imagenes: ConfigCliente["imagenes"];
  /** Lo que cambió el dueño (para el formulario del admin). */
  cambios: ValoresIdentidad;
};

/** La identidad que se muestra: la config con los cambios del dueño encima. */
export function identidadEfectiva(config: ConfigCliente, crudo: unknown): Identidad {
  const cambios = limpiarValores(crudo);
  const t = cambios.textos ?? {};
  return {
    textos: {
      ...config.textos,
      ...(t.pie ? { pie: t.pie } : {}),
      ...(t.descripcionConsultas ? { descripcionConsultas: t.descripcionConsultas } : {}),
      ...(t.aclaracionPrecio ? { aclaracionPrecio: t.aclaracionPrecio } : {}),
      hero: { ...config.textos.hero, ...t.hero },
      nosotros: { ...config.textos.nosotros, ...t.nosotros },
    },
    colores: cambios.colorMarca ? { ...config.colores, marca: escalaDeColor(cambios.colorMarca) } : config.colores,
    fondo: cambios.fondo ?? config.apariencia?.fondo ?? "claro",
    imagenes: { ...config.imagenes, ...cambios.imagenes },
    cambios,
  };
}
