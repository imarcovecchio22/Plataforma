/**
 * Coincidencia de palabras clave de las respuestas automáticas de Instagram.
 * Sin dependencias de servidor: lo usan el webhook y el Probador del admin.
 */
import { reemplazarVariables, type DatosTextos } from "@/lib/variables";

export type CanalEvento = "dm" | "comentario";

export type BotonRegla = { titulo: string; url: string };

export type ReglaParaCoincidir = {
  id: number;
  palabrasClave: string[];
  coincidencia: "contiene" | "exacta";
  canal: "dm" | "comentario" | "ambos";
  prioridad: number;
  activa: boolean;
};

/** Minúsculas, sin tildes, sin signos ni emojis, espacios simples. */
export function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ") // la ñ queda como n (igual en el mensaje y en las claves)
    .replace(/\s+/g, " ")
    .trim();
}

/** "miel, Precio ,,info" → ["miel", "precio", "info"] (normalizadas, sin repetidas). */
export function parsearPalabrasClave(entrada: string | string[]) {
  const lista = Array.isArray(entrada) ? entrada : entrada.split(",");
  return Array.from(new Set(lista.map(normalizarTexto).filter(Boolean)));
}

/**
 * ¿El texto coincide con alguna palabra clave? Compara por palabra completa
 * ("info" no coincide con "informal"); una clave de varias palabras tiene que
 * aparecer seguida ("quiero comprar").
 */
export function coincideTexto(texto: string, palabrasClave: string[], modo: "contiene" | "exacta") {
  const normalizado = normalizarTexto(texto);
  if (!normalizado) return false;
  const claves = parsearPalabrasClave(palabrasClave);

  if (modo === "exacta") return claves.includes(normalizado);
  const conBordes = ` ${normalizado} `;
  return claves.some((clave) => conBordes.includes(` ${clave} `));
}

/** La regla activa de mayor prioridad que coincide (a igual prioridad, la más vieja). */
export function elegirRegla<T extends ReglaParaCoincidir>(texto: string, canal: CanalEvento, reglas: T[]) {
  return (
    reglas
      .filter((r) => r.activa && (r.canal === "ambos" || r.canal === canal))
      .filter((r) => coincideTexto(texto, r.palabrasClave, r.coincidencia))
      .sort((a, b) => b.prioridad - a.prioridad || a.id - b.id)[0] ?? null
  );
}

/** Reemplaza las variables ($PRECIO, $PROMOS, $CATALOGO, $ZONAS…) por los datos ya formateados. */
export function armarTextoRespuesta(respuesta: string, datos: DatosTextos) {
  return reemplazarVariables(respuesta, datos);
}

/** Lee la columna Json de botones sin confiar en su forma. */
export function leerBotones(valor: unknown): BotonRegla[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter(
      (b): b is BotonRegla =>
        typeof b === "object" && b !== null && typeof b.titulo === "string" && typeof b.url === "string"
    )
    .slice(0, 3);
}
