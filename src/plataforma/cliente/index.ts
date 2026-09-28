// El cliente de este despliegue. "@cliente" apunta a clientes/<CLIENTE> (alias de build en
// next.config.js y vitest.config.ts); la config ya se validó antes del build.
import config from "@cliente/config";
import type { ConfigCliente } from "@/plataforma/cliente/esquema";

export const cliente: ConfigCliente = config;

/** Dominio sin protocolo, para textos (ej. "melera.vercel.app/consultas"). */
export const hostCliente = new URL(cliente.dominio).host;

/** Unidad de venta: la del cliente (config.unidad) o la de un producto. */
export type Unidad = ConfigCliente["unidad"];

/** La unidad de un producto; si no tiene una completa, la del cliente. */
export function unidadDe(
  producto?: { unidadSingular?: string | null; unidadPlural?: string | null; unidadGenero?: string | null } | null
): Unidad {
  if (!producto?.unidadSingular || !producto.unidadPlural) return cliente.unidad;
  return {
    singular: producto.unidadSingular,
    plural: producto.unidadPlural,
    genero: producto.unidadGenero === "femenino" ? "femenino" : "masculino",
  };
}

/** Nombre de la unidad de venta según la cantidad: "frasco" / "frascos". */
export function unidad(cantidad: number, u: Unidad = cliente.unidad) {
  return cantidad === 1 ? u.singular : u.plural;
}

/** "5 frascos", "1 frasco". */
export function cantidadConUnidad(cantidad: number, u: Unidad = cliente.unidad) {
  return `${cantidad} ${unidad(cantidad, u)}`;
}

/** "cada uno" / "cada una", según el género de la unidad. */
export function cadaUnoDe(u: Unidad = cliente.unidad) {
  return u.genero === "femenino" ? "cada una" : "cada uno";
}

/** "más barato" / "más barata", según el género de la unidad. */
export function masBaratoDe(u: Unidad = cliente.unidad) {
  return u.genero === "femenino" ? "más barata" : "más barato";
}

/** "del frasco" / "de la pieza". */
export function deLaUnidadDe(u: Unidad = cliente.unidad) {
  return `${u.genero === "femenino" ? "de la" : "del"} ${u.singular}`;
}

// Con la unidad del cliente (textos generales, que no son de un producto)
export const cadaUno = cadaUnoDe();
export const deLaUnidad = deLaUnidadDe();
export const masBarato = masBaratoDe();
