import { GoogleGenAI } from "@google/genai";
import { logEvent } from "@/lib/logs";
import { clientIp, demasiadosIntentos } from "@/lib/security";
import { getMainProduct } from "@/lib/product";
import { formatPrecio } from "@/lib/utils";
import { leerEscalones, textoPromos } from "@/lib/precios";
import { hostCliente } from "@/plataforma/cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-3.6-flash";
const MAX_TURNS = 20;
// Evita que alguien gaste la cuota de Gemini mandando textos enormes.
const MAX_CHARS_POR_MENSAJE = 1000;
const MAX_CHARS_TOTAL = 8000;
// Límite por IP para que nadie gaste la cuota gratis de Gemini a propósito.
const MAX_MENSAJES_POR_IP = 20;
const VENTANA_MINUTOS = 10;

/** Instrucciones del asistente, con el precio actual del frasco (se edita en /admin/stock). */
function buildSystemPrompt(precio: string, promos: string) {
  return `Sos el asistente virtual de Melera, una marca de miel artesanal de Tomás Jofré, Buenos Aires. Respondés preguntas de clientes de forma amigable, breve y en español rioplatense informal (tuteás). Solo respondés preguntas relacionadas con Melera y la miel. Si te preguntan algo que no tiene que ver, redirigís amablemente.

Información que conocés:
- Producto: Miel Artesanal 500g, frasco de vidrio, ${precio}${promos ? `
- Promos por cantidad (el precio baja para cada frasco): ${promos}. Se aplican solas en la web al elegir la cantidad.` : ""}
- Elaboración: producida por Apícola Mercedes en Tomás Jofré, Bs As. 100% artesanal, sin aditivos, sin procesos industriales, sin azúcar agregada, sin conservantes. Las abejas recolectan néctar de flores silvestres de la zona.
- Envíos: por ahora solo dentro de CABA. Después de la compra, alguien del equipo de Melera le escribe para coordinar el envío. Pronto se suman más zonas; si la persona está fuera de CABA, que escriba en melera.vercel.app/consultas y le avisamos.
- Pago: online con Mercado Pago, al finalizar la compra en la web.
- Consultas (retiro, compras mayoristas o cualquier otra duda): en melera.vercel.app/consultas, y le respondemos por Instagram o por email. No hay WhatsApp de contacto.
- Instagram: @melera.miel
- Sitio web: melera.vercel.app
- Para comprar: redirigí siempre a la página de producto en melera.vercel.app/producto.

Si no sabés algo, decís que escriban en melera.vercel.app/consultas.`;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response("El asistente no está configurado todavía.", { status: 500 });
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages)) throw new Error("invalid body");
    messages = body.messages
      .filter(
        (m: unknown): m is ChatMessage =>
          !!m &&
          typeof m === "object" &&
          ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
          typeof (m as ChatMessage).content === "string"
      )
      .slice(-MAX_TURNS)
      .map((m: ChatMessage) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_POR_MENSAJE) }));
    if (messages.reduce((total, m) => total + m.content.length, 0) > MAX_CHARS_TOTAL) {
      throw new Error("conversación demasiado larga");
    }
  } catch {
    return new Response("Solicitud inválida.", { status: 400 });
  }

  if (messages.length === 0) {
    return new Response("Solicitud inválida.", { status: 400 });
  }

  const ip = clientIp(req);
  if (
    await demasiadosIntentos({
      tipo: "chat",
      mensajeEmpiezaCon: "Mensaje al chat",
      ip,
      maximo: MAX_MENSAJES_POR_IP,
      ventanaMinutos: VENTANA_MINUTOS,
    })
  ) {
    return new Response(
      `Recibimos muchos mensajes seguidos. Esperá unos minutos o escribinos desde ${hostCliente}/consultas.`,
      { status: 429 }
    );
  }
  // Solo la IP (no el texto): sirve para contar mensajes y ver el uso en /admin/logs?tipo=chat.
  await logEvent("chat", "Mensaje al chat", { detalle: { ip } });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const producto = await getMainProduct();
  const precio = formatPrecio(producto.precio);
  const promos = textoPromos(leerEscalones(producto.escalones));

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const geminiStream = await ai.models.generateContentStream({
          model: MODEL,
          contents,
          config: { systemInstruction: buildSystemPrompt(precio, promos) },
        });

        for await (const chunk of geminiStream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
        controller.close();
      } catch (err) {
        console.error("Error en /api/chat:", err);
        try {
          controller.enqueue(
            encoder.encode(`Uy, tuvimos un problema para responder. Probá de nuevo en un rato o escribinos desde ${hostCliente}/consultas.`)
          );
          controller.close();
        } catch {
          // El cliente ya cerró la conexión: no hay a quién avisarle.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
