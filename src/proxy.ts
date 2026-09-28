import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cliente } from "@/plataforma/cliente";

// Una por cliente: dos paneles abiertos en el mismo navegador no se pisan la sesión.
const COOKIE_NAME = `${cliente.slug}_admin_session`;

async function isValidSession(token: string | undefined) {
  if (!token) return false;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

// Un navegador siempre manda Origin en POST/PATCH/DELETE; si viene de otro sitio, se rechaza
// (defensa extra contra CSRF, además de la cookie SameSite=Lax).
function origenAjeno(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.nextUrl.host;
  } catch {
    return true;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/admin/") && origenAjeno(req)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = await isValidSession(token);

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
