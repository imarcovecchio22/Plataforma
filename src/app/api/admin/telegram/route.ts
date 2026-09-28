import { NextResponse } from "next/server";
import { parseBotToken, sendTelegramMessage } from "@/lib/telegram";
import { errorMessage } from "@/lib/logs";
import { cliente } from "@/plataforma/cliente";

// Diagnóstico de los avisos por Telegram (protegido por el middleware de /api/admin).
function formatoToken(raw?: string) {
  if (!raw) return null;
  const token = parseBotToken(raw);
  return {
    largoDelValor: raw.length,
    seEncontroUnToken: Boolean(token),
    largoDelToken: token?.length ?? null,
  };
}

function estado() {
  return {
    tokenConfigurado: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    chatIdConfigurado: Boolean(process.env.TELEGRAM_CHAT_ID),
    // forma del token sin revelarlo: debería ser "<números>:<35 caracteres>"
    formatoToken: formatoToken(process.env.TELEGRAM_BOT_TOKEN),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}

export async function GET() {
  return NextResponse.json(estado());
}

// Manda un mensaje de prueba y devuelve el error exacto de Telegram si falla.
export async function POST() {
  const info = estado();
  if (!info.tokenConfigurado || !info.chatIdConfigurado) {
    return NextResponse.json({ ok: false, ...info, error: "Faltan variables del bot" }, { status: 500 });
  }
  try {
    await sendTelegramMessage(`✅ Prueba de avisos de la web de ${cliente.nombre}`);
    return NextResponse.json({ ok: true, ...info });
  } catch (error) {
    return NextResponse.json({ ok: false, ...info, error: errorMessage(error) }, { status: 502 });
  }
}
