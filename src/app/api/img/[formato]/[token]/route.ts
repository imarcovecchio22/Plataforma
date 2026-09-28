import { NextRequest, NextResponse } from "next/server";
import { readImageToken, renderImage, SignatureError, ValidationError } from "@/plataforma/imagenes/plantillas";
import { errorMessage, logEvent } from "@/lib/logs";

export const runtime = "nodejs";
export const maxDuration = 60;

// Imagen del post renderizada con Chromium. La URL (firmada) contiene los datos,
// así que el resultado es inmutable y queda cacheado en la CDN de Vercel.
export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ formato: string; token: string }> }
) {
  const params = await paramsPromise;
  try {
    const data = readImageToken(params.token);
    const jpeg: Buffer = await renderImage(data, params.formato);
    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(jpeg.length),
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof SignatureError) {
      return NextResponse.json({ error: errorMessage(error) }, { status: 403 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
    }
    await logEvent("imagen", `Falló el render de una imagen (${params.formato})`, {
      nivel: "error",
      detalle: { error: errorMessage(error) },
    });
    return NextResponse.json(
      { error: `Error interno: ${errorMessage(error)}` },
      { status: 500 }
    );
  }
}
