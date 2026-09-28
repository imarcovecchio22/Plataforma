import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// --- mocks de base de datos, API de Instagram, Telegram y logs ---
const db = vi.hoisted(() => ({
  evento: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  regla: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { instagramEvento: db.evento, autoRespuesta: db.regla } }));

const ig = vi.hoisted(() => ({
  enviarDm: vi.fn(async () => ({})),
  enviarRespuestaPrivada: vi.fn(async () => ({})),
  responderComentario: vi.fn(async () => ({ id: "r1" })),
}));
vi.mock("@/lib/instagram/mensajes", () => ig);

const tg = vi.hoisted(() => ({
  sendTelegramMessage: vi.fn(async (texto: string) => texto.length > 0),
  siteUrl: () => "https://melera.vercel.app",
}));
vi.mock("@/lib/telegram", () => tg);

vi.mock("@/lib/product", () => ({ getProductosActivos: async () => [{ nombre: "Miel", precio: 6500, escalones: [] }] }));
vi.mock("@/lib/zonas", async () => (await import("./zonas-de-prueba")).mockZonas("melera"));
vi.mock("@/lib/logs", () => ({
  logEvent: vi.fn(async () => {}),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const pendientes: Promise<unknown>[] = [];
vi.mock("@vercel/functions", () => ({ waitUntil: (p: Promise<unknown>) => pendientes.push(p) }));

import { HORAS_ENTRE_RESPUESTAS, procesarEvento, reiniciarLimite } from "@/lib/instagram/autorespuestas";
import { GET as verificar, POST as webhook } from "@/app/api/instagram/webhook/route";

const REGLA = {
  id: 7,
  nombre: "Bienvenida",
  palabrasClave: ["miel", "precio"],
  coincidencia: "contiene",
  canal: "ambos",
  respuesta: "Frasco a $PRECIO",
  botones: [{ titulo: "Comprar", url: "https://melera.vercel.app/producto" }],
  respuestaPublicaComentario: "¡Te mandamos un DM! 🐝",
  prioridad: 10,
  activa: true,
};

const DM = { tipo: "dm" as const, externalId: "mid-1", usuarioIgId: "u1", texto: "precio?" };

beforeEach(() => {
  vi.clearAllMocks();
  pendientes.length = 0;
  db.evento.create.mockResolvedValue({ id: 100 });
  db.evento.update.mockResolvedValue({});
  db.evento.findFirst.mockResolvedValue(null);
  db.evento.findMany.mockResolvedValue([]);
  db.regla.findMany.mockResolvedValue([REGLA]);
  process.env.IG_APP_SECRET = "secreto-app";
  process.env.IG_WEBHOOK_VERIFY_TOKEN = "verificar-123";
});

const accionFinal = () => db.evento.update.mock.calls.at(-1)?.[0]?.data;

describe("procesarEvento", () => {
  it("responde un DM que coincide, con el precio y los botones", async () => {
    await procesarEvento(DM);
    expect(ig.enviarDm).toHaveBeenCalledWith("u1", expect.stringMatching(/^Frasco a \$\s?6\.500$/), REGLA.botones);
    expect(accionFinal()).toEqual({ reglaId: 7, accion: "respondido" });
  });

  it("si el mensaje ya se había recibido (reintento de Meta), no hace nada", async () => {
    db.evento.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "5" })
    );
    await procesarEvento(DM);
    expect(db.regla.findMany).not.toHaveBeenCalled();
    expect(ig.enviarDm).not.toHaveBeenCalled();
  });

  it("sin coincidencia no responde", async () => {
    await procesarEvento({ ...DM, texto: "qué lindo día" });
    expect(ig.enviarDm).not.toHaveBeenCalled();
    expect(accionFinal()).toEqual({ accion: "sin_coincidencia" });
  });

  it("no repite la misma regla al mismo usuario dentro de las 2 h", async () => {
    db.evento.findFirst.mockResolvedValue({ id: 99 });
    await procesarEvento(DM);
    expect(ig.enviarDm).not.toHaveBeenCalled();
    expect(accionFinal()).toMatchObject({ reglaId: 7, accion: "ignorado" });
    const filtro = db.evento.findFirst.mock.calls[0][0].where;
    expect(filtro).toMatchObject({ usuarioIgId: "u1", reglaId: 7, accion: "respondido", cuentaParaLimite: true });
    const horas = (Date.now() - filtro.createdAt.gte.getTime()) / 3_600_000;
    expect(HORAS_ENTRE_RESPUESTAS).toBe(2);
    expect(Math.round(horas)).toBe(2);
  });

  it("reiniciar el límite libera solo las respuestas de esa cuenta", async () => {
    db.evento.updateMany.mockResolvedValue({ count: 2 });
    expect(await reiniciarLimite("u1")).toBe(2);
    expect(db.evento.updateMany).toHaveBeenCalledWith({
      where: { usuarioIgId: "u1", accion: "respondido", cuentaParaLimite: true },
      data: { cuentaParaLimite: false },
    });
  });

  it("un comentario recibe DM privado y respuesta pública", async () => {
    await procesarEvento({ tipo: "comentario", externalId: "c1", usuarioIgId: "u2", texto: "Info de la miel?" });
    expect(ig.enviarRespuestaPrivada).toHaveBeenCalledWith("c1", expect.any(String), REGLA.botones);
    expect(ig.responderComentario).toHaveBeenCalledWith("c1", REGLA.respuestaPublicaComentario);
    expect(accionFinal()).toEqual({ reglaId: 7, accion: "respondido", error: null });
  });

  it("si falla solo la respuesta pública, queda respondido con la nota", async () => {
    ig.responderComentario.mockRejectedValueOnce(new Error("sin permiso"));
    await procesarEvento({ tipo: "comentario", externalId: "c1", usuarioIgId: "u2", texto: "miel" });
    expect(accionFinal()).toMatchObject({ accion: "respondido", error: expect.stringContaining("sin permiso") });
  });

  it("si falla el envío queda en error, y avisa por Telegram al 5.º error seguido", async () => {
    ig.enviarDm.mockRejectedValue(new Error("Instagram respondió 400"));
    db.evento.findMany.mockResolvedValue([
      ...Array(5).fill({ accion: "error", error: "Instagram respondió 400" }),
      { accion: "respondido", error: null },
    ]);
    await procesarEvento(DM);
    expect(accionFinal()).toMatchObject({ reglaId: 7, accion: "error", error: "Instagram respondió 400" });
    expect(tg.sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(tg.sendTelegramMessage.mock.calls[0][0]).toContain("5 veces seguidas");
  });

  it("no vuelve a avisar en el 6.º error seguido", async () => {
    ig.enviarDm.mockRejectedValue(new Error("falla"));
    db.evento.findMany.mockResolvedValue(Array(6).fill({ accion: "error", error: "falla" }));
    await procesarEvento(DM);
    expect(tg.sendTelegramMessage).not.toHaveBeenCalled();
  });
});

describe("webhook de Instagram", () => {
  const firmar = (body: string) => `sha256=${createHmac("sha256", "secreto-app").update(body).digest("hex")}`;
  const pedido = (body: string, firma: string | null) =>
    new NextRequest("https://melera.vercel.app/api/instagram/webhook", {
      method: "POST",
      body,
      headers: firma ? { "x-hub-signature-256": firma } : {},
    });
  const payload = JSON.stringify({
    object: "instagram",
    entry: [{ id: "cuenta", messaging: [{ sender: { id: "u1" }, message: { mid: "mid-1", text: "miel" } }] }],
  });

  it("verifica la suscripción con el verify token", async () => {
    const ok = await verificar(
      new NextRequest("https://x.app/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=verificar-123&hub.challenge=abc")
    );
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("abc");
    const mal = await verificar(
      new NextRequest("https://x.app/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=abc")
    );
    expect(mal.status).toBe(403);
  });

  it("rechaza avisos sin firma o con firma inválida", async () => {
    expect((await webhook(pedido(payload, null))).status).toBe(401);
    expect((await webhook(pedido(payload, firmar(payload + "x")))).status).toBe(401);
    expect(db.evento.create).not.toHaveBeenCalled();
  });

  it("con firma válida responde 200 y procesa en segundo plano", async () => {
    const res = await webhook(pedido(payload, firmar(payload)));
    expect(res.status).toBe(200);
    await Promise.all(pendientes);
    expect(db.evento.create).toHaveBeenCalledTimes(1);
    expect(ig.enviarDm).toHaveBeenCalledTimes(1);
  });
});
