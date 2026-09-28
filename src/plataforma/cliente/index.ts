// El cliente de este despliegue. "@cliente" apunta a clientes/<CLIENTE> (alias de build en
// next.config.js y vitest.config.ts); la config ya se validó antes del build.
import config from "@cliente/config";
import type { ConfigCliente } from "@/plataforma/cliente/esquema";

export const cliente: ConfigCliente = config;

/** Dominio sin protocolo, para textos (ej. "melera.vercel.app/consultas"). */
export const hostCliente = new URL(cliente.dominio).host;

/** Nombre de la unidad de venta según la cantidad: "frasco" / "frascos". */
export function unidad(cantidad: number) {
  return cantidad === 1 ? cliente.unidad.singular : cliente.unidad.plural;
}

/** "5 frascos", "1 frasco". */
export function cantidadConUnidad(cantidad: number) {
  return `${cantidad} ${unidad(cantidad)}`;
}

const femenino = cliente.unidad.genero === "femenino";

/** "cada uno" / "cada una", según el género de la unidad. */
export const cadaUno = femenino ? "cada una" : "cada uno";

/** "del frasco" / "de la pieza". */
export const deLaUnidad = `${femenino ? "de la" : "del"} ${cliente.unidad.singular}`;

/** "más barato" / "más barata", según el género de la unidad. */
export const masBarato = femenino ? "más barata" : "más barato";
