import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { MODULOS, RUTAS_DE_MODULOS, moduloActivo, moduloDeRuta } from "@/plataforma/cliente/modulos";
import { proxy } from "@/proxy";

describe("a qué módulo pertenece cada ruta", () => {
  it.each([
    ["/admin/instagram", "instagram"],
    ["/api/admin/instagram/posts/3", "instagram"],
    ["/api/cron/instagram", "instagram"],
    ["/api/telegram/webhook", "instagram"],
    ["/api/img/feed/abc.jpg", "instagram"],
    ["/api/generate", "instagram"],
    ["/api/cron/instagram-token", "autorespuestas"],
    ["/api/instagram/webhook", "autorespuestas"],
    ["/admin/autorespuestas", "autorespuestas"],
    ["/api/chat", "chatIA"],
    ["/api/checkout", null],
    ["/admin/pedidos", null],
    ["/admin/instagramx", null],
    ["/api/chatbot", null],
  ])("%s → %s", (ruta, modulo) => {
    expect(moduloDeRuta(ruta)).toBe(modulo);
  });

  it("cada ruta del mapa existe en la app (el mapa no quedó viejo)", () => {
    for (const modulo of MODULOS) {
      for (const ruta of RUTAS_DE_MODULOS[modulo]) {
        expect(fs.existsSync(path.resolve(__dirname, "..", "src", "app", ruta.replace(/^\/admin\//, "admin/(dashboard)/").replace(/^\//, ""))), ruta).toBe(true);
      }
    }
  });
});

describe("Melera tiene prendidos instagram, autorespuestas y chat; el cotizador no", () => {
  it("módulos", () => {
    expect(MODULOS.map((m) => [m, moduloActivo(m)])).toEqual([
      ["instagram", true],
      ["autorespuestas", true],
      ["chatIA", true],
      ["cotizador", false],
    ]);
  });

  it("los crons y webhooks de módulos prendidos pasan el proxy sin pedir sesión", async () => {
    for (const ruta of ["/api/cron/instagram", "/api/instagram/webhook", "/api/chat", "/api/img/feed/x.jpg"]) {
      const res = await proxy(new NextRequest(`https://melera.vercel.app${ruta}`, { method: "POST" }));
      expect(res.headers.get("x-middleware-next"), ruta).toBe("1");
    }
  });
});
