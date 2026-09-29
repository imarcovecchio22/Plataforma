import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPreferenceClient } from "@/lib/mercadopago";
import { checkoutSchema } from "@/lib/validation";
import { getMainProduct, getProductosPorSlugs } from "@/lib/product";
import { getZonasActivas } from "@/lib/zonas";
import type { Product } from "@prisma/client";
import { leerEscalones, precioUnitario } from "@/lib/precios";
import { nombreConOpciones, validarEleccion, type OpcionElegida } from "@/lib/opciones";
import { opcionesDe } from "@/plataforma/cliente/catalogo";
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

  // Lo que se compra: los ítems del carrito o, con el formulario de un producto, ese producto (por
  // slug; sin slug, el destacado).
  const pedidos = data.items ?? [{ producto: data.producto, cantidad: data.cantidad, opciones: data.opciones }];
  const resueltos = await resolverProductos(pedidos.map((p) => p.producto));
  const faltante = pedidos.find((p) => !resueltos.get(p.producto));
  if (faltante) {
    const error = faltante.producto ? "Ese producto ya no está a la venta" : "No hay productos a la venta";
    return NextResponse.json({ error }, { status: 404 });
  }

  // Opciones elegidas: las que tiene el producto (si el cliente usa opciones), todas y válidas
  const lineas: { product: Product; cantidad: number; elegidas: OpcionElegida[] }[] = [];
  for (const p of pedidos) {
    const product = resueltos.get(p.producto)!;
    const opciones = opcionesDe(product);
    if (!opciones.length) {
      lineas.push({ product, cantidad: p.cantidad, elegidas: [] });
      continue;
    }
    const validada = validarEleccion(opciones, p.opciones ?? {}, product.nombre);
    if ("error" in validada) return NextResponse.json({ error: validada.error }, { status: 400 });
    lineas.push({ product, cantidad: p.cantidad, elegidas: validada.elegidas });
  }

  // El stock y la promo son del producto: suman todas sus líneas (ej. dos colores de la misma pieza)
  const porProducto = new Map<string, { product: Product; cantidad: number }>();
  for (const l of lineas) {
    const actual = porProducto.get(l.product.id);
    porProducto.set(l.product.id, { product: l.product, cantidad: (actual?.cantidad ?? 0) + l.cantidad });
  }
  const sinStock = [...porProducto.values()].find((l) => l.cantidad > l.product.stock);
  if (sinStock) {
    const { product, cantidad } = sinStock;
    const deQue = lineas.length > 1 ? ` de ${product.nombre}` : "";
    await logEvent("pedido", `Compra rechazada por falta de stock${deQue} (pidió ${cantidad}, hay ${product.stock})`, {
      nivel: "warn",
    });
    return NextResponse.json(
      { error: lineas.length > 1 ? `No hay stock suficiente de ${product.nombre} para esa cantidad` : "No hay stock suficiente para esa cantidad" },
      { status: 400 }
    );
  }

  // Precio por escalón (promos por cantidad) de cada producto, por la cantidad total del producto,
  // siempre calculado acá con los datos de la base
  const items = lineas.map(({ product, cantidad, elegidas }) => {
    const unitario = precioUnitario(product.precio, leerEscalones(product.escalones), porProducto.get(product.id)!.cantidad);
    return {
      productId: product.id,
      nombre: nombreConOpciones(product.nombre, elegidas),
      precioUnitario: unitario,
      cantidad,
      subtotal: unitario * cantidad,
      ...(elegidas.length ? { opciones: elegidas } : {}),
    };
  });

  // Zona de envío: la elegida, o la única que haya. Su costo (si no es "a coordinar") se suma al total.
  const zonas = await getZonasActivas();
  const zona = data.zona ? zonas.find((z) => z.id === data.zona) : zonas.length === 1 ? zonas[0] : undefined;
  if (!zona) {
    const error =
      zonas.length === 0
        ? "Todavía no hay zonas de envío. Escribinos desde consultas y lo coordinamos."
        : data.zona
          ? "Esa zona de envío ya no está disponible"
          : "Elegí la zona de envío";
    return NextResponse.json({ error }, { status: 400 });
  }
  const costoEnvio = zona.costo ?? 0;
  const total = items.reduce((suma, i) => suma + i.subtotal, 0) + costoEnvio;

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
      // El nombre de la zona (lo que muestran el admin y el aviso de Telegram)
      provincia: zona.nombre,
      zonaEnvioId: zona.id,
      costoEnvio,
      codigoPostal: data.codigoPostal,
      items: { create: items },
      total,
      estado: "pendiente",
      origen: data.origen || null,
    },
  });

  await logEvent("pedido", `Pedido #${order.numero} creado, esperando el pago`, {
    detalle: {
      cliente: `${order.nombre} ${order.apellido}`,
      items: items.map((i) => ({ producto: i.nombre, cantidad: i.cantidad })),
      envio: { zona: zona.nombre, costo: zona.costo },
      total: order.total,
      origen: order.origen,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;

  try {
    const preference = await getPreferenceClient().create({
      body: {
        items: [
          ...items.map((i) => ({
            id: i.productId,
            title: i.nombre,
            quantity: i.cantidad,
            unit_price: i.precioUnitario,
            currency_id: cliente.region.moneda,
          })),
          // El envío va como un ítem más (solo si tiene costo)
          ...(costoEnvio > 0
            ? [{ id: `envio-${zona.id}`, title: `Envío (${zona.nombre})`, quantity: 1, unit_price: costoEnvio, currency_id: cliente.region.moneda }]
            : []),
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

/** Producto de cada slug pedido ("" = el destacado); los que no están a la venta no vienen. */
async function resolverProductos(slugs: string[]) {
  const resueltos = new Map<string, Product>();
  const conSlug = slugs.filter(Boolean);
  if (conSlug.length) for (const p of await getProductosPorSlugs(conSlug)) resueltos.set(p.slug, p);
  if (slugs.includes("")) {
    const destacado = await getMainProduct();
    if (destacado) resueltos.set("", destacado);
  }
  return resueltos;
}
