import type { BotonTelegram } from "@/lib/telegram";
import { cliente } from "@/plataforma/cliente";

export type AccionBoton = "feed" | "story" | "both" | "descartar";

const PATRON = /^ig:(feed|story|both|descartar):(\d{1,9})$/;

/** Los cuatro botones que acompañan la imagen del feed en Telegram. */
export function botonesPost(postId: number): BotonTelegram[][] {
  return [
    [
      { text: "Feed", callback_data: `ig:feed:${postId}` },
      { text: "Historia", callback_data: `ig:story:${postId}` },
    ],
    [
      { text: "Feed + Historia", callback_data: `ig:both:${postId}` },
      { text: "Descartar", callback_data: `ig:descartar:${postId}` },
    ],
  ];
}

/**
 * Lee el callback_data de un botón. Es un dato que llega de afuera (Telegram),
 * así que solo se acepta el formato exacto; cualquier otra cosa devuelve null.
 */
export function leerBoton(data: unknown): { accion: AccionBoton; postId: number } | null {
  if (typeof data !== "string") return null;
  const match = PATRON.exec(data);
  if (!match) return null;
  return { accion: match[1] as AccionBoton, postId: Number(match[2]) };
}

export const DESTINO_LABEL: Record<"feed" | "story" | "both", string> = {
  feed: "feed",
  story: "historia",
  both: "feed + historia",
};

/** Fecha de hoy en la zona horaria del cliente (YYYY-MM-DD), para comparar con la fecha del post. */
export function hoyLocal(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: cliente.region.zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}
