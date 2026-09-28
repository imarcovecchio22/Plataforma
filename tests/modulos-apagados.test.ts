import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Un cliente con todos los módulos apagados
vi.mock("@cliente/config", async (original) => {
  const melera = ((await original()) as { default: Record<string, unknown> }).default;
  return { default: { ...melera, modulos: { instagram: false, autorespuestas: false, chatIA: false, cotizador: false } } };
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/pedidos",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import { proxy } from "@/proxy";
import { exigirModulo } from "@/plataforma/cliente/modulos";
import AdminNav from "@/components/admin/AdminNav";
import ChatWidget from "@/components/ChatWidget";

const pedir = (ruta: string, method = "POST") => proxy(new NextRequest(`https://melera.vercel.app${ruta}`, { method }));

describe("con los módulos apagados", () => {
  it.each(["/api/chat", "/api/cron/instagram", "/api/cron/instagram-token", "/api/telegram/webhook", "/api/instagram/webhook", "/api/generate", "/api/img/feed/x.jpg", "/api/admin/instagram/posts", "/api/admin/autorespuestas"])(
    "%s responde 404",
    async (ruta) => {
      const res = await pedir(ruta);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "No encontrado" });
    }
  );

  it("el resto sigue igual: el admin pide sesión y lo público pasa", async () => {
    expect((await pedir("/api/admin/pedidos/1", "PATCH")).status).toBe(401);
    expect((await pedir("/admin/pedidos", "GET")).status).toBe(307);
    expect((await pedir("/api/checkout")).headers.get("x-middleware-next")).toBe("1");
  });

  it("las páginas del admin del módulo dan 404", () => {
    expect(() => exigirModulo("instagram")).toThrow("NEXT_NOT_FOUND");
    expect(() => exigirModulo("autorespuestas")).toThrow("NEXT_NOT_FOUND");
  });

  it("el menú del admin no los muestra", () => {
    const html = renderToStaticMarkup(createElement(AdminNav));
    expect(html).toContain("Pedidos");
    expect(html).toContain("Preguntas frecuentes");
    expect(html).not.toContain("/admin/instagram");
    expect(html).not.toContain("/admin/autorespuestas");
  });

  it("la tienda no muestra el chat", () => {
    expect(renderToStaticMarkup(createElement(ChatWidget))).toBe("");
  });
});
