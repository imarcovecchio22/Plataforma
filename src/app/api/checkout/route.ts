import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPreferenceClient } from "@/lib/mercadopago";
import { checkoutSchema } from "@/lib/validation";
import { getMainProduct } from "@/lib/product";
import { leerEscalones, totalPedido } from "@/lib/precios";
import { errorMessage, logEvent } from "@/lib/logs";
import { cliente } from "@/plataforma/cliente";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const product = await getMainProduct();
  if (!product) {
    return NextResponse.json({ error: "No hay productos a la venta" }, { status: 404 });
  }

  if (data.cantidad > product.stock) {
    await logEvent("pedido", `Compra rechazada por falta de stock (pidió ${data.cantidad}, hay ${product.stock})`, {
      nivel: "warn",
    });
    return NextResponse.json(
      { error: "No hay stock suficiente para esa cantidad" },
      { status: 400 }
    );
  }

  // Precio por escalón (promos por cantidad), siempre calculado acá con los datos de la base
  const { unitario, total } = totalPedido(product.precio, leerEscalones(product.escalones), data.cantidad);

  const order = await prisma.order.create({
    data: {
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      calle: data.calle,
      numero_dir: data.numero_dir,
      pisoDepto: data.pisoDepto || null,
      localidad: data.localidad,
      provincia: data.provincia,
      codigoPostal: data.codigoPostal,
      productId: product.id,
      cantidad: data.cantidad,
      total,
      estado: "pendiente",
      origen: data.origen || null,
    },
  });

  await logEvent("pedido", `Pedido #${order.numero} creado, esperando el pago`, {
    detalle: {
      cliente: `${order.nombre} ${order.apellido}`,
      cantidad: order.cantidad,
      total: order.total,
      origen: order.origen,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;

  try {
    const preference = await getPreferenceClient().create({
      body: {
        items: [
          {
            id: product.id,
            title: product.nombre,
            quantity: data.cantidad,
            unit_price: unitario,
            currency_id: cliente.region.moneda,
          },
        ],
        payer: {
          name: data.nombre,
          surname: data.apellido,
          email: data.email,
          phone: { number: data.telefono },
        },
        external_reference: order.id,
        back_urls: {
          success: `${baseUrl}/checkout/success?orderId=${order.id}`,
          failure: `${baseUrl}/checkout/failure?orderId=${order.id}`,
          pending: `${baseUrl}/checkout/pending?orderId=${order.id}`,
        },
        // auto_return solo funciona con back_urls en HTTPS: MP lo rechaza en localhost.
        ...(baseUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: preference.id },
    });

    const redirectUrl = preference.init_point ?? preference.sandbox_init_point;

    if (!redirectUrl) {
      throw new Error("MercadoPago no devolvió un link de pago");
    }

    return NextResponse.json({ orderId: order.id, redirectUrl });
  } catch (error) {
    await logEvent("pedido", `Pedido #${order.numero}: no se pudo iniciar el pago en Mercado Pago`, {
      nivel: "error",
      detalle: { error: errorMessage(error) },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { estado: "cancelado" },
    });
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Intentá de nuevo en unos minutos." },
      { status: 502 }
    );
  }
}
