import { NextRequest, NextResponse } from "next/server";
import { buildImageUrls, ValidationError } from "@/plataforma/imagenes/plantillas";
import { errorMessage, logEvent } from "@/lib/logs";
import { esUrlPublicaHttps, safeEqual } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

// Pide una URL y confirma que devuelve una imagen (de paso la deja en la caché de la CDN).
async function warmImage(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.startsWith("image/")) {
    const detail = await res.text().catch(() => "");
    throw new Error(`No se pudo renderizar ${url} (${res.status}): ${detail.slice(0, 300)}`);
  }
  await res.arrayBuffer();
}

// Devuelve el problema encontrado, o null si la URL responde con una imagen.
async function checkImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const type = res.headers.get("content-type") || "";
    await res.body?.cancel().catch(() => {});
    if (!res.ok) return `respondió ${res.status}`;
    if (!type.startsWith("image/")) return `es ${type.split(";")[0] || "otro tipo de archivo"}, no una imagen`;
    return null;
  } catch (error) {
    return `no se pudo abrir: ${errorMessage(error)}`;
  }
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.GENERATE_WEBHOOK_SECRET;
  if (expectedSecret) {
    const receivedSecret = req.headers.get("x-webhook-secret");
    if (!safeEqual(receivedSecret, expectedSecret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  // Make lo manda como formulario (así Gemini puede escribir comillas o saltos de línea
  // sin romper el JSON); también se acepta JSON.
  const contentType = req.headers.get("content-type") || "";
  const body = contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries(
        Array.from((await req.formData().catch(() => new FormData())).entries()).map(
          ([key, value]) => [key, String(value)]
        )
      )
    : await req.json().catch(() => null);
  if (!body || !Object.keys(body).length) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const baseUrl = process.env.PUBLIC_BASE_URL || req.nextUrl.origin;

  // La foto del producto tiene que ser una imagen pública; si no, el post sale sin foto.
  if (body.imagen_url) {
    try {
      body.imagen_url = new URL(String(body.imagen_url).trim(), baseUrl).toString();
    } catch {
      return NextResponse.json({ error: `imagen_url no es una URL válida: ${body.imagen_url}` }, { status: 400 });
    }
    if (body.tipo === "producto") {
      const problema = esUrlPublicaHttps(body.imagen_url)
        ? await checkImage(body.imagen_url)
        : "tiene que ser un link https público";
      if (problema) {
        await logEvent("imagen", `Post ${body.tipo}/${body.estilo} del ${body.fecha}: la foto no es una imagen`, {
          nivel: "warn",
          detalle: { imagen_url: body.imagen_url, problema },
        });
        return NextResponse.json(
          { error: `imagen_url no es una imagen válida (${problema}): ${body.imagen_url}` },
          { status: 400 }
        );
      }
    }
  }

  let urls: { image_url: string; story_image_url: string };
  try {
    urls = buildImageUrls(body, baseUrl);
  } catch (error) {
    if (error instanceof ValidationError) {
      await logEvent("imagen", `Post ${body.tipo}/${body.estilo} del ${body.fecha}: ${errorMessage(error)}`, {
        nivel: "warn",
      });
      return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
    }
    await logEvent("imagen", "Error armando las URLs de imagen", {
      nivel: "error",
      detalle: { error: errorMessage(error) },
    });
    return NextResponse.json({ error: `Error interno: ${errorMessage(error)}` }, { status: 500 });
  }

  try {
    await Promise.all([warmImage(urls.image_url), warmImage(urls.story_image_url)]);
  } catch (error) {
    await logEvent("imagen", `Post ${body.tipo}/${body.estilo} del ${body.fecha}: falló el render`, {
      nivel: "error",
      detalle: { error: errorMessage(error) },
    });
    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }

  await logEvent("imagen", `Post ${body.tipo}/${body.estilo} del ${body.fecha} generado`, {
    detalle: { feed: urls.image_url, story: urls.story_image_url },
  });

  return NextResponse.json({
    ...urls,
    filename: `${body.fecha}_${body.estilo}-${body.tipo}.jpg`,
  });
}
