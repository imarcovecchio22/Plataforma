import type { ConfigCliente } from "@/plataforma/cliente/esquema";

type Apariencia = ConfigCliente["apariencia"];

/** Los pesos que se piden de cada fuente (los que usan el tema neutro y los componentes). */
export const PESOS_FUENTE = [400, 500, 600, 700];

/** Las familias de Google Fonts de la config, sin repetir. */
export function familiasDe(apariencia: Apariencia) {
  const { texto, titulos } = apariencia?.fuentes ?? {};
  return [...new Set([texto, titulos].filter((f): f is string => Boolean(f)))];
}

/** La hoja de estilos de Google Fonts con las fuentes de la config (null si no trae). */
export function urlFuentes(apariencia: Apariencia) {
  const familias = familiasDe(apariencia);
  if (familias.length === 0) return null;
  const params = familias.map((f) => `family=${f.replace(/ /g, "+")}:wght@${PESOS_FUENTE.join(";")}`);
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
}

/**
 * Las variables del contrato de tema para las fuentes de la config (van en el <body>, así pisan
 * las de globals.css). Vacío si la config no trae fuentes.
 */
export function variablesDeFuentes(apariencia: Apariencia) {
  const { texto, titulos } = apariencia?.fuentes ?? {};
  const variables = [
    ...(texto ? [`--fuente-texto:"${texto}",system-ui,sans-serif`] : []),
    ...(titulos ? [`--fuente-titulos:"${titulos}",Georgia,serif`] : []),
  ];
  return variables.length ? `body{${variables.join(";")}}` : "";
}

/** El atributo del <html> para el fondo oscuro del tema neutro (nada con fondo claro). */
export function atributosDeFondo(apariencia: Apariencia): { "data-fondo"?: "oscuro" } {
  return apariencia?.fondo === "oscuro" ? { "data-fondo": "oscuro" } : {};
}
