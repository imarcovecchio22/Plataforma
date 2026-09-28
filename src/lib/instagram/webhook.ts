import { createHmac, timingSafeEqual } from "crypto";
import type { CanalEvento } from "@/lib/instagram/reglas";

/**
 * Valida el header X-Hub-Signature-256 ("sha256=<hex>") que manda Meta:
 * HMAC-SHA256 del body crudo con el secreto de la app, comparado en tiempo constante.
 */
export function firmaValida(bodyCrudo: string, header: string | null, secreto: string | undefined) {
  if (!secreto || !header?.startsWith("sha256=")) return false;
  const recibida = Buffer.from(header.slice("sha256=".length), "hex");
  const esperada = createHmac("sha256", secreto).update(bodyCrudo, "utf8").digest();
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}

/** Un mensaje o comentario de texto que hay que evaluar contra las reglas. */
export type EventoEntrante = {
  tipo: CanalEvento;
  externalId: string; // mid del mensaje o id del comentario
  usuarioIgId: string; // quién escribió (IGSID en DMs, id del autor en comentarios)
  texto: string;
};

type Messaging = {
  sender?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean; is_deleted?: boolean; is_unsupported?: boolean };
};

type Change = {
  field?: string;
  value?: Messaging & { id?: string; text?: string; from?: { id?: string } };
};

type Payload = {
  object?: string;
  entry?: { id?: string; messaging?: Messaging[]; changes?: Change[] }[];
};

function desdeMessaging(m: Messaging | undefined, cuentaId: string | undefined): EventoEntrante | null {
  const msg = m?.message;
  const usuario = m?.sender?.id;
  // Ecos de mis propios mensajes, borrados, lecturas, reacciones, postbacks y adjuntos sin texto: se ignoran.
  if (!msg?.mid || !usuario || msg.is_echo || msg.is_deleted || msg.is_unsupported) return null;
  if (typeof msg.text !== "string" || !msg.text.trim()) return null;
  if (cuentaId && usuario === cuentaId) return null;
  return { tipo: "dm", externalId: msg.mid, usuarioIgId: usuario, texto: msg.text };
}

/**
 * Extrae los DMs y comentarios de texto de un aviso de Meta. Los mensajes llegan en
 * entry[].messaging[] (y en changes[] con field "messages" cuando se prueba desde el
 * panel de Meta); los comentarios en changes[] con field "comments".
 */
export function extraerEventos(payload: unknown): EventoEntrante[] {
  const p = payload as Payload | null;
  if (!p || p.object !== "instagram" || !Array.isArray(p.entry)) return [];

  const eventos: EventoEntrante[] = [];
  for (const entry of p.entry) {
    const cuentaId = entry?.id; // la cuenta del cliente: lo que venga de ella es propio
    for (const m of entry?.messaging ?? []) {
      const ev = desdeMessaging(m, cuentaId);
      if (ev) eventos.push(ev);
    }
    for (const c of entry?.changes ?? []) {
      if (c?.field === "messages") {
        const ev = desdeMessaging(c.value, cuentaId);
        if (ev) eventos.push(ev);
      } else if (c?.field === "comments") {
        const v = c.value;
        const autor = v?.from?.id;
        if (!v?.id || !autor || autor === cuentaId) continue; // incluye mis propias respuestas públicas
        if (typeof v.text !== "string" || !v.text.trim()) continue;
        eventos.push({ tipo: "comentario", externalId: v.id, usuarioIgId: autor, texto: v.text });
      }
    }
  }
  return eventos;
}
