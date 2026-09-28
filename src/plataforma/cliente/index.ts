// El cliente de este despliegue. "@cliente" apunta a clientes/<CLIENTE> (alias de build en
// next.config.js y vitest.config.ts); la config ya se validó antes del build.
import config from "@cliente/config";
import type { ConfigCliente } from "@/plataforma/cliente/esquema";

export const cliente: ConfigCliente = config;

/** Dominio sin protocolo, para textos (ej. "melera.vercel.app/consultas"). */
export const hostCliente = new URL(cliente.dominio).host;
