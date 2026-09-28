import { GoogleGenAI } from "@google/genai";
import { logEvent } from "@/lib/logs";
import { clientIp, demasiadosIntentos } from "@/lib/security";
import { getProductosActivos } from "@/lib/product";
import { getZonasActivas } from "@/lib/zonas";
import { textosDelProducto } from "@/lib/precios";
import { formatPrecio } from "@/lib/utils";
import type { ZonaParaCheckout } from "@/lib/envios";
import { cliente, hostCliente } from "@/plataforma/cliente";

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

type ProductoChat = NonNullable<Parameters<typeof textosDelProducto>[0]> & { slug: string; descripcion: string };

/**
 * Los productos: con uno (o ninguno), la descripción de la config con el precio y las promos de la
 * base; con varios, el catálogo de la base, cada uno con su precio, sus promos y su ficha.
 */
function lineasProductos(productos: ProductoChat[]) {
  if (productos.length <= 1) {
    const { precio, promos, unidad } = textosDelProducto(productos[0] ?? null);
    return [
      `- Producto: ${cliente.ia.chat.producto}, ${precio}`,
      ...(promos
        ? [`- Promos por cantidad (el precio baja para cada ${unidad.singular}): ${promos}. Se aplican solas en la web al elegir la cantidad.`]
        : []),
    ];
  }
  return [
    "- Productos a la venta (precio por unidad):",
    ...productos.map((p) => {
      const { precio, promos, unidad } = textosDelProducto(p);
      // Sin el punto final: la línea agrega el suyo
      const descripcion = p.descripcion.trim().slice(0, 300).replace(/[.\s]+$/, "");
      return `  - ${p.nombre}: ${precio} cada ${unidad.singular}${promos ? `. Promos por cantidad: ${promos}` : ""}${descripcion ? `. ${descripcion}` : ""}. Ficha: ${hostCliente}/producto/${p.slug}`;
    }),
    "- Las promos por cantidad se aplican solas en la web al elegir la cantidad.",
  ];
}

/** Los envíos, con las zonas activas de la base (se editan en /admin/envios). */
function lineaEnvios(zonas: ZonaParaCheckout[]) {
  if (zonas.length === 0) {
    return `- Envíos: todavía no hay zonas de envío cargadas; para coordinarlo, que escriba en ${hostCliente}/consultas.`;
  }
  const detalle = zonas.map((z) => {
    const costo =
      z.costo === null
        ? "a coordinar: después de la compra le escribimos para coordinar el envío"
        : `${formatPrecio(z.costo)}, se suma al total al pagar`;
    const aclaracion = z.aclaracion.trim().replace(/[.\s]+$/, "");
    return `${z.nombre} (${costo})${aclaracion ? `. ${aclaracion}` : ""}`;
  });
  return `- Envíos (la zona se elige al finalizar la compra): ${detalle.join("; ")}. Si la persona está en otra zona, que escriba en ${hostCliente}/consultas y le avisamos.`;
}

/**
 * Instrucciones del asistente: la marca y sus datos salen de la config del cliente; los productos
 * (precio y promos) y las zonas de envío, de la base.
 */
function buildSystemPrompt(productos: ProductoChat[], zonas: ZonaParaCheckout[]) {
  const { ia } = cliente;
  const datos = ia.chat.datos.map((d) => `- ${d.replace(/\$SITIO/g, hostCliente)}`);
  const comprar =
    productos.length > 1
      ? `- Para comprar: redirigí a ${hostCliente}/productos o a la ficha del producto que le interese.`
      : `- Para comprar: redirigí siempre a la página de producto en ${hostCliente}/producto.`;
  return `Sos el asistente virtual de ${cliente.nombre}, ${ia.descripcion}. Respondés preguntas de clientes de forma amigable, breve y en español rioplatense informal (tuteás). Solo respondés preguntas relacionadas con ${ia.tema}. Si te preguntan algo que no tiene que ver, redirigís amablemente.

Información que conocés:
${[...lineasProductos(productos), ...datos, lineaEnvios(zonas)].join("\n")}
- Instagram: @${cliente.instagram}
- Sitio web: ${hostCliente}
${comprar}

Si no sabés algo, decís que escriban en ${hostCliente}/consultas.`;
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
  const [productos, zonas] = await Promise.all([getProductosActivos(), getZonasActivas()]);

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
          config: { systemInstruction: buildSystemPrompt(productos, zonas) },
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
