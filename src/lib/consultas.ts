import type { Consulta } from "@prisma/client";
import { sendTelegramMessage, siteUrl } from "@/lib/telegram";
import { cliente } from "@/plataforma/cliente";

/** Link para responder la consulta: DM de Instagram o mail. */
export function contactoHref(consulta: Pick<Consulta, "canal" | "instagram" | "email">) {
  if (consulta.canal === "instagram" && consulta.instagram) {
    return `https://ig.me/m/${consulta.instagram.replace(/^@+/, "")}`;
  }
  if (consulta.email) {
    return `mailto:${consulta.email}?subject=${encodeURIComponent(`Tu consulta a ${cliente.nombre}`)}`;
  }
  return null;
}

/**
 * Avisa por Telegram que llegó una consulta nueva.
 * Best-effort: nunca debe afectar la respuesta al cliente si falla, tarda
 * o si el bot no está configurado.
 */
export async function notifyNuevaConsulta(consulta: Consulta) {
  const contacto = consulta.canal === "instagram" ? consulta.instagram : consulta.email;
  const responder = contactoHref(consulta);

  return sendTelegramMessage(
    [
      `💬 Consulta #${consulta.id} de ${consulta.nombre}`,
      `${consulta.canal === "instagram" ? "Instagram" : "Email"}: ${contacto} · origen: ${consulta.origen ?? "directo"}`,
      "",
      consulta.mensaje,
      "",
      ...(responder ? [`Responder: ${responder}`] : []),
      `Admin: ${siteUrl()}/admin/consultas`,
    ].join("\n")
  );
}
