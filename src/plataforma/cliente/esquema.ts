import { z } from "zod";

/**
 * Config de identidad de un cliente (clientes/<slug>/config.ts). Se valida antes de cada build
 * (scripts/validar-cliente.ts): si no cumple este esquema, el build falla.
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
