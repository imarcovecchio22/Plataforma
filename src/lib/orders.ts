import { prisma } from "@/lib/prisma";
import { getPaymentClient } from "@/lib/mercadopago";
import { sendTelegramMessage, siteUrl } from "@/lib/telegram";
import { formatPrecio } from "@/lib/utils";
import { errorMessage, logEvent } from "@/lib/logs";
import type { OrderStatus } from "@prisma/client";

export function mapMpStatus(status: string): OrderStatus | null {
  switch (status) {
    case "approved":
      return "pagado";
    case "pending":
    case "in_process":
    case "authorized":
      return "pendiente";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelado";
    default:
      return null;
  }
}

/**
 * Aplica el estado de un pago de MercadoPago a un pedido. Idempotente:
 * si el pedido ya está pagado, una notificación posterior no lo revierte,
 * y el stock solo se descuenta una vez (en la transición a "pagado").
 */
export async function applyPaymentStatus(orderId: string, paymentId: string) {
  const payment = await getPaymentClient().get({ id: paymentId });
  return applyPayment(orderId, payment);
}

/**
 * Igual que applyPaymentStatus, pero recibe el pago ya obtenido de MercadoPago
 * (evita una segunda llamada a la API cuando ya se hizo el fetch antes).
 */
export async function applyPaymentStatusFromPayment(
  payment: Awaited<ReturnType<ReturnType<typeof getPaymentClient>["get"]>>
) {
  const orderId = payment.external_reference;
  if (!orderId) return null;
  return applyPayment(orderId, payment);
}

async function applyPayment(
  orderId: string,
  payment: { status?: string | null; id?: number | string | null }
) {
  const nuevoEstado = payment.status ? mapMpStatus(payment.status) : null;
  if (!nuevoEstado) return null;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) {
    await logEvent("pago", `Pago ${payment.id} sin pedido asociado`, {
      nivel: "warn",
      detalle: { pedidoId: orderId, estadoMP: payment.status },
    });
    return null;
  }

  if (order.estado === "pagado" && nuevoEstado !== "pagado") {
    await logEvent("pago", `Pedido #${order.numero}: se ignoró "${payment.status}" porque ya estaba pagado`, {
      detalle: { pagoMP: payment.id },
    });
    return order;
  }

  // Cambio de estado atómico: la condición "todavía no está pagado" se evalúa en la misma
  // actualización. Mercado Pago avisa más de una vez (y la página de éxito también aplica el
  // pago): si dos avisos llegan juntos, solo uno pasa el pedido a pagado, descuenta el stock
  // y avisa por Telegram. Tampoco deja que un "rechazado" tardío pise un pago aprobado.
  const { updated, stocks, pasoAPagado } = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, estado: { not: "pagado" } },
      data: { estado: nuevoEstado, mpPaymentId: String(payment.id) },
    });
    const pasoAPagado = count === 1 && nuevoEstado === "pagado";

    // Stock que queda de cada producto después de descontar (para el aviso)
    const stocks = new Map<string, number>();
    if (pasoAPagado) {
      for (const item of order.items) {
        const producto = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.cantidad } },
        });
        stocks.set(item.productId, producto.stock);
      }
    }

    const updated = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return { updated, stocks, pasoAPagado };
  });

  if (order.estado !== nuevoEstado && updated.estado === nuevoEstado) {
    await logEvent("pago", `Pedido #${order.numero}: ${order.estado} → ${nuevoEstado}`, {
      nivel: nuevoEstado === "cancelado" ? "warn" : "info",
      detalle: { pagoMP: payment.id, estadoMP: payment.status, total: order.total },
    });
  }

  if (pasoAPagado) {
    // Se espera (con timeout) para que Vercel no corte el envío al terminar la respuesta.
    try {
      const enviado = await notifyOrderPaid(updated, order.items, stocks);
      await logEvent(
        "telegram",
        enviado
          ? `Aviso de pedido #${order.numero} pagado enviado`
          : `Aviso de pedido #${order.numero} no enviado: falta configurar el bot`,
        { nivel: enviado ? "info" : "warn" }
      );
    } catch (error) {
      await logEvent("telegram", `Falló el aviso del pedido #${order.numero} pagado`, {
        nivel: "error",
        detalle: { error: errorMessage(error) },
      });
    }
  }

  return updated;
}

/**
 * Avisa por Telegram que un pedido se pagó.
 * Best-effort: nunca debe afectar la confirmación del pago si falla o
 * si el bot no está configurado.
 */
async function notifyOrderPaid(
  order: {
    id: string;
    numero: number;
    nombre: string;
    apellido: string;
    total: number;
    localidad: string;
    provincia: string;
    origen: string | null;
  },
  items: { productId: string; nombre: string; cantidad: number; subtotal: number }[],
  stocks: Map<string, number>
) {
  // Con un solo ítem, el mismo texto de siempre; con varios, una línea por ítem y el total
  const stock =
    items.length === 1
      ? `${stocks.get(items[0].productId)}`
      : items.map((i) => `${i.nombre}: ${stocks.get(i.productId)}`).join(", ");
  return sendTelegramMessage(
    [
      `🛒 Pedido #${order.numero} pagado`,
      `${order.nombre} ${order.apellido} · ${order.localidad}, ${order.provincia}`,
      ...items.map((i) => `${i.nombre} × ${i.cantidad} — ${formatPrecio(i.subtotal)}`),
      ...(items.length > 1 ? [`Total: ${formatPrecio(order.total)}`] : []),
      `Stock restante: ${stock} · origen: ${order.origen ?? "directo"}`,
      `Admin: ${siteUrl()}/admin/pedidos/${order.id}`,
    ].join("\n")
  );
}
