import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// --- mocks compartidos ---
const db = vi.hoisted(() => ({
  consulta: { create: vi.fn() },
  order: { create: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const sec = vi.hoisted(() => ({ demasiadosIntentos: vi.fn(async () => false) }));
vi.mock("@/lib/security", async (original) => ({
  ...(await original<typeof import("@/lib/security")>()),
  clientIp: () => "1.2.3.4",
  demasiadosIntentos: sec.demasiadosIntentos,
}));

const logs = vi.hoisted(() => ({ logEvent: vi.fn(async (tipo: string, mensaje: string, op?: unknown) => void [tipo, mensaje, op]) }));
vi.mock("@/lib/logs", () => ({ ...logs, errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)) }));

const aviso = vi.hoisted(() => ({ notifyNuevaConsulta: vi.fn(async () => true) }));
vi.mock("@/lib/consultas", () => aviso);

const auth = vi.hoisted(() => ({ createSessionToken: vi.fn(async () => "jwt"), setSessionCookie: vi.fn(async () => {}) }));
vi.mock("@/lib/auth", () => auth);

const producto = vi.hoisted(() => ({ actual: { id: "prod-1", nombre: "Miel Artesanal 500g", precio: 6500, stock: 5 } }));
vi.mock("@/lib/product", () => ({ getMainProduct: async () => producto.actual }));

const mp = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ getPreferenceClient: () => ({ create: mp.create }) }));

vi.mock("@/lib/zonas", () => ({ getZonasActivas: async () => [{ id: 1, nombre: "CABA", costo: null, aclaracion: "Por ahora enviamos solo dentro de CABA. Pronto sumamos más zonas.", detalleResumen: "Envío dentro de CABA: después de la compra te escribimos para coordinarlo." }] }));
import { POST as login } from "@/app/api/admin/login/route";
import { POST as consultar } from "@/app/api/consultas/route";
import { POST as checkout } from "@/app/api/checkout/route";

const post = (ruta: string, body: unknown) =>
  new NextRequest(`https://melera.vercel.app${ruta}`, { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASSWORD = "clave-fuerte";
  process.env.NEXTAUTH_SECRET = "secreto-de-sesion";
  delete process.env.NEXT_PUBLIC_BASE_URL;
  producto.actual = { id: "prod-1", nombre: "Miel Artesanal 500g", precio: 6500, stock: 5 };
});

describe("/api/admin/login", () => {
  it("con usuario y clave correctos crea la sesión", async () => {
    const res = await login(post("/api/admin/login", { usuario: "admin", password: "clave-fuerte" }));
    expect(res.status).toBe(200);
    expect(auth.setSessionCookie).toHaveBeenCalledWith("jwt");
  });

  it("con datos incorrectos responde 401 y registra el intento con la IP (que cuenta para el bloqueo)", async () => {
    for (const body of [{ usuario: "admin", password: "otra" }, { usuario: "otro", password: "clave-fuerte" }, {}]) {
      const res = await login(post("/api/admin/login", body));
      expect(res.status).toBe(401);
    }
    expect(auth.setSessionCookie).not.toHaveBeenCalled();
    const fallidos = logs.logEvent.mock.calls.filter((c) => c[1] === "Login fallido");
    expect(fallidos).toHaveLength(3);
    expect(fallidos[0][2]).toMatchObject({ detalle: { ip: "1.2.3.4" } });
  });

  it("después de 5 intentos fallidos en 15 minutos bloquea (429), aunque la clave sea correcta", async () => {
    sec.demasiadosIntentos.mockResolvedValueOnce(true);
    const res = await login(post("/api/admin/login", { usuario: "admin", password: "clave-fuerte" }));
    expect(res.status).toBe(429);
    expect(auth.setSessionCookie).not.toHaveBeenCalled();
    expect(sec.demasiadosIntentos).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "admin", mensajeEmpiezaCon: "Login fallido", maximo: 5, ventanaMinutos: 15 })
    );
  });

  it("sin credenciales o sin NEXTAUTH_SECRET configurados no deja entrar", async () => {
    delete process.env.ADMIN_PASSWORD;
    expect((await login(post("/api/admin/login", { usuario: "admin", password: "" }))).status).toBe(500);
    process.env.ADMIN_PASSWORD = "clave-fuerte";
    delete process.env.NEXTAUTH_SECRET;
    expect((await login(post("/api/admin/login", { usuario: "admin", password: "clave-fuerte" }))).status).toBe(500);
    expect(auth.setSessionCookie).not.toHaveBeenCalled();
  });
});

describe("/api/consultas", () => {
  const valida = {
    nombre: "Ana",
    canal: "instagram",
    instagram: "@ana.miel",
    mensaje: "¿Hacen envíos a Palermo?",
    origen: "instagram",
    empresa: "",
    tiempo: 8000,
  };

  it("guarda la consulta (Instagram con @) y avisa por Telegram", async () => {
    db.consulta.create.mockResolvedValue({ id: 3, nombre: "Ana", canal: "instagram", instagram: "@ana.miel", email: null, origen: "instagram" });
    const res = await consultar(post("/api/consultas", valida));
    expect(res.status).toBe(200);
    expect(db.consulta.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nombre: "Ana", canal: "instagram", instagram: "@ana.miel", email: null, origen: "instagram" }),
    });
    expect(aviso.notifyNuevaConsulta).toHaveBeenCalledTimes(1);
  });

  it("honeypot completo o enviado demasiado rápido: le dice ok al bot pero no guarda nada", async () => {
    for (const trampa of [{ empresa: "Spam SA" }, { tiempo: 400 }]) {
      const res = await consultar(post("/api/consultas", { ...valida, ...trampa }));
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    }
    expect(db.consulta.create).not.toHaveBeenCalled();
    expect(aviso.notifyNuevaConsulta).not.toHaveBeenCalled();
  });

  it("con muchas consultas desde la misma IP responde 429 sin guardar", async () => {
    sec.demasiadosIntentos.mockResolvedValueOnce(true);
    const res = await consultar(post("/api/consultas", valida));
    expect(res.status).toBe(429);
    expect(db.consulta.create).not.toHaveBeenCalled();
  });

  it("datos inválidos: 400 con un mensaje para mostrar", async () => {
    const res = await consultar(post("/api/consultas", { ...valida, canal: "email", email: "no-es-un-mail" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
    expect(db.consulta.create).not.toHaveBeenCalled();
  });

  it("si falla el aviso de Telegram, la consulta igual queda guardada", async () => {
    db.consulta.create.mockResolvedValue({ id: 4, nombre: "Ana", canal: "instagram", instagram: "@ana.miel", email: null, origen: null });
    aviso.notifyNuevaConsulta.mockRejectedValueOnce(new Error("Telegram caído"));
    const res = await consultar(post("/api/consultas", valida));
    expect(res.status).toBe(200);
  });
});

describe("/api/checkout", () => {
  const pedido = {
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@mail.com",
    telefono: "1122334455",
    calle: "Honduras",
    numero_dir: "5000",
    pisoDepto: "",
    localidad: "Palermo",
    provincia: "CABA",
    codigoPostal: "1414",
    cantidad: 2,
    origen: "instagram",
  };

  beforeEach(() => {
    db.order.create.mockImplementation(async ({ data }) => ({ id: "ord-9", numero: 9, ...data }));
    db.order.update.mockResolvedValue({});
    mp.create.mockResolvedValue({ id: "pref-1", init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-1" });
  });

  it("crea el pedido con el precio de la base y el origen, y devuelve el link de pago", async () => {
    const res = await checkout(post("/api/checkout", pedido));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orderId: "ord-9", redirectUrl: expect.stringContaining("mercadopago") });
    expect(db.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        total: 13000,
        estado: "pendiente",
        origen: "instagram",
        provincia: "CABA",
        items: { create: [{ productId: "prod-1", nombre: "Miel Artesanal 500g", precioUnitario: 6500, cantidad: 2, subtotal: 13000 }] },
      }),
    });
    const body = mp.create.mock.calls[0][0].body;
    expect(body.items[0]).toMatchObject({ unit_price: 6500, quantity: 2, currency_id: "ARS" });
    expect(body.external_reference).toBe("ord-9");
    expect(db.order.update).toHaveBeenCalledWith({ where: { id: "ord-9" }, data: { mpPreferenceId: "pref-1" } });
  });

  it("aplica la promo por cantidad: 5 frascos a $6.000 c/u, 10 a $5.500 c/u", async () => {
    producto.actual = { ...producto.actual, stock: 20, escalones: [{ desde: 5, precio: 6000 }, { desde: 10, precio: 5500 }] } as typeof producto.actual;
    for (const [cantidad, unit, total] of [[5, 6000, 30000], [7, 6000, 42000], [10, 5500, 55000], [2, 6500, 13000]]) {
      mp.create.mockClear(); db.order.create.mockClear();
      await checkout(post("/api/checkout", { ...pedido, cantidad }));
      expect(db.order.create.mock.calls[0][0].data.total).toBe(total);
      expect(mp.create.mock.calls[0][0].body.items[0]).toMatchObject({ unit_price: unit, quantity: cantidad });
    }
  });

  it("el precio sale siempre de la base, no de lo que mande el navegador", async () => {
    await checkout(post("/api/checkout", { ...pedido, precio: 1, total: 1 }));
    expect(db.order.create.mock.calls[0][0].data.total).toBe(13000);
    expect(mp.create.mock.calls[0][0].body.items[0].unit_price).toBe(6500);
  });

  it("auto_return solo con https (Mercado Pago lo rechaza en http)", async () => {
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    await checkout(post("/api/checkout", pedido));
    expect(mp.create.mock.calls[0][0].body.auto_return).toBeUndefined();
    process.env.NEXT_PUBLIC_BASE_URL = "https://melera.vercel.app";
    await checkout(post("/api/checkout", pedido));
    expect(mp.create.mock.calls[1][0].body.auto_return).toBe("approved");
    expect(mp.create.mock.calls[1][0].body.notification_url).toBe("https://melera.vercel.app/api/mercadopago/webhook");
  });

  it("rechaza una zona de envío que no existe, datos inválidos y cantidades mayores al stock", async () => {
    expect((await checkout(post("/api/checkout", { ...pedido, zona: 99 }))).status).toBe(400);
    expect((await checkout(post("/api/checkout", { ...pedido, email: "x" }))).status).toBe(400);
    expect((await checkout(post("/api/checkout", { ...pedido, cantidad: 6 }))).status).toBe(400);
    expect((await checkout(new NextRequest("https://melera.vercel.app/api/checkout", { method: "POST", body: "no es json" }))).status).toBe(400);
    expect(db.order.create).not.toHaveBeenCalled();
    expect(mp.create).not.toHaveBeenCalled();
  });

  it("si Mercado Pago falla, el pedido queda cancelado y responde 502", async () => {
    mp.create.mockRejectedValueOnce(new Error("MP caído"));
    const res = await checkout(post("/api/checkout", pedido));
    expect(res.status).toBe(502);
    expect(db.order.update).toHaveBeenCalledWith({ where: { id: "ord-9" }, data: { estado: "cancelado" } });
  });
});
