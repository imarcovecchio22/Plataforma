import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorMessage, logEvent } from "@/lib/logs";
import { sendTelegramMessage, siteUrl } from "@/lib/telegram";
import { datosParaTextos } from "@/lib/datos-textos";
import { usaVariables } from "@/lib/variables";
import { armarTextoRespuesta, elegirRegla, leerBotones } from "@/lib/instagram/reglas";
import { enviarDm, enviarRespuestaPrivada, responderComentario } from "@/lib/instagram/mensajes";
import type { EventoEntrante } from "@/lib/instagram/webhook";

// No se le manda la misma regla al mismo usuario más de una vez en esta ventana.
export const HORAS_ENTRE_RESPUESTAS = 2;

// Con esta cantidad de errores seguidos al responder, se avisa por Telegram.
export const ERRORES_SEGUIDOS_PARA_AVISAR = 5;

/**
 * Procesa un DM o comentario: reserva su id (si ya estaba, es un reintento de Meta y
 * no se hace nada), busca la regla y responde. Nunca lanza: todo queda en InstagramEvento.
 */
export async function procesarEvento(ev: EventoEntrante) {
  let eventoId: number;
  try {
    const creado = await prisma.instagramEvento.create({
      data: {
        tipo: ev.tipo,
        externalId: ev.externalId,
        usuarioIgId: ev.usuarioIgId,
        texto: ev.texto.slice(0, 2000),
      },
    });
    eventoId = creado.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return; // ya procesado
    await logEvent("instagram", "No se pudo registrar un mensaje entrante de Instagram", {
      nivel: "error",
      detalle: { tipo: ev.tipo, error: errorMessage(error) },
    });
    return;
  }

  const terminar = (data: Prisma.InstagramEventoUncheckedUpdateInput) =>
    prisma.instagramEvento.update({ where: { id: eventoId }, data }).catch((error) =>
      console.error("No se pudo actualizar el evento de Instagram:", error)
    );

  let reglaId: number | null = null;
  try {
    const reglas = await prisma.autoRespuesta.findMany({ where: { activa: true } });
    const regla = elegirRegla(ev.texto, ev.tipo, reglas);
    if (!regla) {
      await terminar({ accion: "sin_coincidencia" });
      return;
    }
    reglaId = regla.id;

    const desde = new Date(Date.now() - HORAS_ENTRE_RESPUESTAS * 3_600_000);
    const reciente = await prisma.instagramEvento.findFirst({
      where: {
        usuarioIgId: ev.usuarioIgId,
        reglaId: regla.id,
        accion: "respondido",
        cuentaParaLimite: true,
        createdAt: { gte: desde },
      },
      select: { id: true },
    });
    if (reciente) {
      await terminar({ reglaId, accion: "ignorado", error: `Ya se le respondió esta regla hace menos de ${HORAS_ENTRE_RESPUESTAS} h` });
      return;
    }

    let texto = regla.respuesta;
    if (usaVariables(texto)) texto = armarTextoRespuesta(texto, await datosParaTextos());
    const botones = leerBotones(regla.botones);

    if (ev.tipo === "dm") {
      await enviarDm(ev.usuarioIgId, texto, botones);
      await terminar({ reglaId, accion: "respondido" });
      return;
    }

    await enviarRespuestaPrivada(ev.externalId, texto, botones);
    let avisoPublico: string | null = null;
    if (regla.respuestaPublicaComentario) {
      try {
        await responderComentario(ev.externalId, regla.respuestaPublicaComentario);
      } catch (error) {
        avisoPublico = `El DM salió, pero falló la respuesta pública: ${errorMessage(error)}`;
      }
    }
    await terminar({ reglaId, accion: "respondido", error: avisoPublico });
  } catch (error) {
    await terminar({ reglaId, accion: "error", error: errorMessage(error).slice(0, 1000) });
    await logEvent("instagram", `Error respondiendo un ${ev.tipo === "dm" ? "DM" : "comentario"} de Instagram`, {
      nivel: "error",
      detalle: { eventoId, reglaId, error: errorMessage(error) },
    });
    await avisarSiHayErroresSeguidos();
  }
}

/**
 * Para pruebas: hace que las respuestas ya enviadas a esta cuenta dejen de bloquear,
 * así la próxima vez que escriba se le responde aunque no hayan pasado las horas.
 */
export async function reiniciarLimite(usuarioIgId: string) {
  const { count } = await prisma.instagramEvento.updateMany({
    where: { usuarioIgId, accion: "respondido", cuentaParaLimite: true },
    data: { cuentaParaLimite: false },
  });
  return count;
}

/**
 * Avisa por Telegram cuando se juntan ERRORES_SEGUIDOS_PARA_AVISAR errores seguidos
 * al responder (una sola vez: justo al llegar a esa cantidad).
 */
async function avisarSiHayErroresSeguidos() {
  try {
    const ultimos = await prisma.instagramEvento.findMany({
      where: { accion: { in: ["respondido", "error"] } },
      orderBy: { id: "desc" },
      take: ERRORES_SEGUIDOS_PARA_AVISAR + 1,
      select: { accion: true, error: true },
    });
    const seguidos = ultimos.findIndex((e) => e.accion !== "error");
    const cantidad = seguidos === -1 ? ultimos.length : seguidos;
    if (cantidad !== ERRORES_SEGUIDOS_PARA_AVISAR) return;

    await sendTelegramMessage(
      `⚠️ Las respuestas automáticas de Instagram fallaron ${cantidad} veces seguidas.\n` +
        `Último error: ${ultimos[0]?.error ?? "sin detalle"}\n\nRevisá ${siteUrl()}/admin/autorespuestas`
    );
  } catch (error) {
    console.error("No se pudo avisar por Telegram de los errores de Instagram:", error);
  }
}
