import { cliente } from "@/plataforma/cliente";

/**
 * Extrae el token ("<id numérico>:<secreto>") aunque la variable tenga texto de más
 * (comillas, prefijo "bot", el mensaje entero de BotFather, etc.).
 */
export function parseBotToken(raw?: string) {
  return raw?.match(/\d{6,}:[A-Za-z0-9_-]{30,}/)?.[0];
}

/** Chat del cliente (el único que puede recibir avisos y tocar botones). */
export function telegramChatId() {
  return process.env.TELEGRAM_CHAT_ID?.trim().replace(/^["']|["']$/g, "") || undefined;
}

export function telegramConfigurado() {
  return Boolean(parseBotToken(process.env.TELEGRAM_BOT_TOKEN) && telegramChatId());
}

/**
 * Llama a un método de la Bot API. Lanza si falta el token o si Telegram
 * responde con error (con el motivo que devuelve Telegram).
 */
export async function telegramApi<T = unknown>(
  method: string,
  payload: Record<string, unknown> | FormData,
  timeoutMs = 10000
): Promise<T> {
  const token = parseBotToken(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) throw new Error("Falta configurar TELEGRAM_BOT_TOKEN");

  // Con FormData (archivos) el navegador/Node arma el multipart y su Content-Type
  const esArchivo = payload instanceof FormData;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: esArchivo ? undefined : { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: esArchivo ? payload : JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
  if (!res.ok || !data?.ok) {
    throw new Error(`Telegram respondió ${res.status}: ${data?.description ?? "sin detalle"}`);
  }
  return data.result as T;
}

/**
 * Manda un mensaje al chat del cliente con el bot de Telegram (sin pasar por Make).
 * Devuelve false si faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (no manda nada);
 * si Telegram responde con error, lanza para que quien llama lo registre.
 */
export async function sendTelegramMessage(text: string) {
  const chatId = telegramChatId();
  if (!telegramConfigurado() || !chatId) return false;

  await telegramApi(
    "sendMessage",
    { chat_id: chatId, text, disable_web_page_preview: true },
    4000
  );
  return true;
}

export type BotonTelegram = { text: string; callback_data: string };

/**
 * Manda una foto al chat del cliente, con botones opcionales. `photo` puede ser una URL
 * (Telegram la descarga) o los bytes de la imagen (se suben como archivo: así Telegram no
 * depende de poder entrar al sitio, por ejemplo si Vercel le muestra un desafío anti-bots).
 */
export async function sendTelegramPhoto(opciones: {
  photo: string | Uint8Array;
  caption: string;
  botones?: BotonTelegram[][];
  silencioso?: boolean;
  nombreArchivo?: string;
}) {
  const campos = {
    chat_id: telegramChatId(),
    caption: opciones.caption.slice(0, 1024), // límite de Telegram para captions
    disable_notification: opciones.silencioso ?? false,
    ...(opciones.botones ? { reply_markup: { inline_keyboard: opciones.botones } } : {}),
  };

  let payload: Record<string, unknown> | FormData;
  if (typeof opciones.photo === "string") {
    payload = { ...campos, photo: opciones.photo };
  } else {
    payload = new FormData();
    for (const [k, v] of Object.entries(campos)) {
      if (v !== undefined) payload.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
    const bytes = new Uint8Array(opciones.photo); // copia sobre un ArrayBuffer propio (lo pide Blob)
    payload.append("photo", new Blob([bytes], { type: "image/jpeg" }), opciones.nombreArchivo ?? `${cliente.slug}.jpg`);
  }

  const result = await telegramApi<{ message_id: number }>("sendPhoto", payload, 30000);
  return result.message_id;
}

/** Cambia el texto de una foto ya enviada y le saca los botones. */
export async function editTelegramCaption(messageId: number, caption: string) {
  await telegramApi("editMessageCaption", {
    chat_id: telegramChatId(),
    message_id: messageId,
    caption: caption.slice(0, 1024),
    reply_markup: { inline_keyboard: [] },
  });
}

/** Confirma el toque de un botón (muestra un aviso chiquito arriba en Telegram). */
export async function answerTelegramCallback(callbackQueryId: string, text: string) {
  await telegramApi("answerCallbackQuery", { callback_query_id: callbackQueryId, text }, 4000);
}

/**
 * URL pública del sitio (links al admin e imágenes que piden Telegram y Meta).
 * Si NEXT_PUBLIC_BASE_URL viene vacía o mal armada, usa el dominio de producción del cliente.
 */
export function siteUrl() {
  const candidatas = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    cliente.dominio,
  ];
  const url = candidatas.map((c) => c?.trim()).find((c) => c && /^https?:\/\/[^/\s]+/.test(c));
  return url!.replace(/\/+$/, "");
}
