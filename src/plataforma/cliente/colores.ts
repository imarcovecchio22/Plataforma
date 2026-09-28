import type { ConfigCliente } from "@/plataforma/cliente/esquema";

/** "#fdf3e3" → "253 243 227" (Tailwind arma rgb(var(--x) / <alpha>) para poder usar /40, /60…). */
export function canales(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Variables CSS con los colores del cliente; las lee tailwind.config.ts. Van en el layout raíz. */
export function variablesDeColor(colores: ConfigCliente["colores"]) {
  const variables = [
    ...Object.entries(colores.marca).map(([tono, hex]) => `--marca-${tono}:${canales(hex)}`),
    `--claro:${canales(colores.claro)}`,
    `--oscuro:${canales(colores.oscuro)}`,
    `--sombra:${canales(colores.sombra)}`,
  ];
  return `:root{${variables.join(";")}}`;
}
