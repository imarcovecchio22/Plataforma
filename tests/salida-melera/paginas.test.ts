/**
 * Red de seguridad de la fase 1 (docs/plataforma/plan-fase-1.md, paso 0): fija el HTML que
 * generan hoy las páginas de Melera. Mientras Melera se convierte en el cliente `melera`,
 * estos snapshots no deberían cambiar; si cambian, el diff tiene que ser solo lo buscado
 * (por ejemplo, nombres de clases renombradas) y se actualizan a conciencia (`vitest -u`).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type FC, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/font/google", () => ({
  Poppins: (o: { variable: string }) => ({ variable: o.variable }),
  Fraunces: (o: { variable: string }) => ({ variable: o.variable }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/pedidos",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "melera.vercel.app" }),
  cookies: async () => ({ get: () => undefined }),
}));

const PRODUCTO = {
  id: "prod-1",
  nombre: "Miel Artesanal 500g",
  slug: "miel-artesanal-500g",
  activo: true,
  orden: 10,
  descripcion:
    "Miel pura de abejas, producida por Apícola Mercedes (Tomás Jofré, Buenos Aires). Envasada en frasco de vidrio de 500g.",
  precio: 6500,
  escalones: [
    { desde: 5, precio: 6000 },
    { desde: 10, precio: 5500 },
  ],
  stock: 50,
  imagenUrl: null,
  createdAt: new Date("2026-09-01T12:00:00Z"),
  updatedAt: new Date("2026-09-01T12:00:00Z"),
};

const PEDIDO = {
  id: "ord-1",
  numero: 7,
  createdAt: new Date("2026-09-27T18:30:00Z"),
  updatedAt: new Date("2026-09-27T18:35:00Z"),
  nombre: "Ana",
  apellido: "Pérez",
  email: "ana@example.com",
  telefono: "1122334455",
  calle: "Honduras",
  numero_dir: "4800",
  pisoDepto: "3B",
  localidad: "Palermo",
  provincia: "CABA",
  codigoPostal: "1414",
  items: [{ id: "item-1", productId: "prod-1", nombre: "Miel Artesanal 500g", precioUnitario: 6000, cantidad: 5, subtotal: 30000 }],
  total: 30000,
  estado: "pagado",
  mpPaymentId: "111",
  mpPreferenceId: "pref-1",
  origen: "instagram",
};

const db = vi.hoisted(() => ({
  order: { findMany: async () => [], findUnique: async () => null },
  consulta: { findMany: async () => [] },
  postIG: { findMany: async () => [] },
  autoRespuesta: { findMany: async () => [] },
  instagramEvento: { findMany: async () => [] },
  eventLog: { deleteMany: async () => ({ count: 0 }), findMany: async () => [], count: async () => 0 },
  preguntaFrecuente: { findMany: async () => [] },
  product: { findMany: async () => [] },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

vi.mock("@/lib/product", () => ({
  getMainProduct: async () => PRODUCTO,
  getProductosActivos: async () => [PRODUCTO],
  getProductoPorSlug: async (slug: string) => (slug === PRODUCTO.slug ? PRODUCTO : null),
}));
vi.mock("@/lib/auth", () => ({ getSession: async () => ({ usuario: "admin" }) }));
vi.mock("@/lib/orders", () => ({ applyPaymentStatus: async () => null }));
vi.mock("@/lib/instagram/meta", async (original) => ({
  ...(await original<typeof import("@/lib/instagram/meta")>()),
  estadoToken: async () => ({ valido: true, diasRestantes: 40, expiraEn: new Date("2026-11-07T00:00:00Z") }),
}));
vi.mock("@/lib/instagram/token", async (original) => ({
  ...(await original<typeof import("@/lib/instagram/token")>()),
  getInstagramToken: async () => ({ expiresAt: new Date("2026-11-20T00:00:00Z") }),
}));
vi.mock("@/lib/telegram", async (original) => ({
  ...(await original<typeof import("@/lib/telegram")>()),
  telegramConfigurado: () => false,
}));

// Las zonas del seed de Melera: con ellas el checkout tiene que verse como antes de las zonas
vi.mock("@/lib/zonas", async () => {
  const { default: seed } = await import("../../clientes/melera/seed");
  return {
    getZonasActivas: async () =>
      (seed.zonas ?? []).map((z, i) => ({ id: i + 1, costo: null, aclaracion: "", detalleResumen: "", ...z })),
  };
});
import seedMelera from "../../clientes/melera/seed";
import RootLayout, { metadata as metadataRaiz } from "@/app/layout";
import PublicoLayout from "@/app/(publico)/layout";
import HomePage from "@/app/(publico)/page";
import ProductoPage from "@/app/(publico)/producto/page";
import ConsultasPage, { metadata as metadataConsultas } from "@/app/(publico)/consultas/page";
import PrivacidadPage, { metadata as metadataPrivacidad } from "@/app/(publico)/privacidad/page";
import CheckoutLayout from "@/app/checkout/layout";
import CheckoutPage from "@/app/checkout/page";
import CheckoutSuccessPage from "@/app/checkout/success/page";
import CheckoutFailurePage from "@/app/checkout/failure/page";
import CheckoutPendingPage from "@/app/checkout/pending/page";
import AdminLoginPage from "@/app/admin/login/page";
import AdminLayout from "@/app/admin/(dashboard)/layout";
import AdminPedidosPage from "@/app/admin/(dashboard)/pedidos/page";
import AdminPedidoDetallePage from "@/app/admin/(dashboard)/pedidos/[id]/page";
import AdminProductosPage from "@/app/admin/(dashboard)/productos/page";
import AdminConsultasPage from "@/app/admin/(dashboard)/consultas/page";
import AdminInstagramPage from "@/app/admin/(dashboard)/instagram/page";
import AdminAutoRespuestasPage from "@/app/admin/(dashboard)/autorespuestas/page";
import AdminLogsPage from "@/app/admin/(dashboard)/logs/page";
import AdminPreguntasPage from "@/app/admin/(dashboard)/preguntas/page";

const html = (nodo: ReactNode) => renderToStaticMarkup(nodo as ReactElement);
const conLayout = (layout: (p: { children: ReactNode }) => unknown, pagina: ReactNode) =>
  html(createElement(layout as FC<{ children: ReactNode }>, null, pagina));
const params = <T,>(valor: T) => Promise.resolve(valor);

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-28T15:00:00Z"));
  delete process.env.NEXT_PUBLIC_BASE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.IG_DRY_RUN;

  db.order.findMany = async () => [PEDIDO] as never;
  db.order.findUnique = async () => PEDIDO as never;
  db.consulta.findMany = async () =>
    [
      {
        id: 3,
        nombre: "Juan",
        canal: "instagram",
        instagram: "juan.perez",
        email: null,
        mensaje: "¿Hacen envíos a Zona Norte?",
        origen: "instagram",
        estado: "nueva",
        createdAt: new Date("2026-09-27T20:00:00Z"),
        updatedAt: new Date("2026-09-27T20:00:00Z"),
      },
    ] as never;
  db.postIG.findMany = async () =>
    [
      {
        id: 12,
        fecha: new Date("2026-09-29T00:00:00Z"),
        tipo: "dato",
        estilo: "panal",
        tema: "cuántas flores visitan las abejas",
        nombreProducto: null,
        categoria: null,
        precio: null,
        presentacion: null,
        imagenUrl: null,
        estado: "pendiente",
        copy: null,
        caption: null,
        feedUrl: null,
        storyUrl: null,
        destino: null,
        feedMediaId: null,
        storyMediaId: null,
        telegramMessageId: null,
        error: null,
        generadoEn: null,
        publicadoEn: null,
        createdAt: new Date("2026-09-27T12:00:00Z"),
        updatedAt: new Date("2026-09-27T12:00:00Z"),
      },
    ] as never;
  db.autoRespuesta.findMany = async () =>
    [
      {
        id: 1,
        nombre: "Bienvenida (como ManyChat)",
        palabrasClave: ["miel", "precio", "comprar", "pedido", "info"],
        coincidencia: "contiene",
        canal: "ambos",
        respuesta: "¡Hola! 🐝 Gracias por escribirle a Melera. Frasco de 500 g a $PRECIO.",
        botones: [{ titulo: "🍯 Quiero comprar", url: "https://melera.vercel.app/producto?origen=instagram" }],
        respuestaPublicaComentario: "¡Te mandamos un DM! 🐝",
        prioridad: 10,
        activa: true,
        createdAt: new Date("2026-09-25T12:00:00Z"),
        updatedAt: new Date("2026-09-25T12:00:00Z"),
      },
    ] as never;
  db.instagramEvento.findMany = async () => [];
  db.eventLog.findMany = async () =>
    [
      {
        id: 1,
        createdAt: new Date("2026-09-28T13:00:00Z"),
        nivel: "info",
        tipo: "pedido",
        mensaje: "Pedido #7 creado, esperando el pago",
        detalle: { total: 30000 },
      },
    ] as never;
  db.eventLog.count = async () => 1;
  db.product.findMany = async () => [{ ...PRODUCTO, _count: { items: 3 } }] as never;
  // Las preguntas frecuentes de Melera, como quedan en la base después del seed
  db.preguntaFrecuente.findMany = async () =>
    seedMelera.preguntas.map((p, i) => ({ id: i + 1, ...p, activa: true })) as never;
});

afterAll(() => {
  vi.useRealTimers();
});

describe("metadata de Melera", () => {
  it("layout raíz", () => {
    expect(metadataRaiz).toMatchSnapshot();
  });
  it("/consultas y /privacidad", () => {
    expect({ consultas: metadataConsultas, privacidad: metadataPrivacidad }).toMatchSnapshot();
  });
});

describe("HTML de las páginas públicas de Melera", () => {
  it("layout raíz", () => {
    expect(html(createElement(RootLayout, null, createElement("div", null, "contenido")))).toMatchSnapshot();
  });
  it("/", async () => {
    expect(conLayout(PublicoLayout, await HomePage())).toMatchSnapshot();
  });
  it("/producto", async () => {
    expect(conLayout(PublicoLayout, await ProductoPage({ searchParams: params({ origen: "instagram" }) }))).toMatchSnapshot();
  });
  it("/consultas", async () => {
    expect(conLayout(PublicoLayout, await ConsultasPage({ searchParams: params({ origen: "instagram" }) }))).toMatchSnapshot();
  });
  it("/privacidad", async () => {
    expect(conLayout(PublicoLayout, await PrivacidadPage())).toMatchSnapshot();
  });
});

describe("HTML del checkout de Melera", () => {
  it("/checkout", async () => {
    expect(conLayout(CheckoutLayout, await CheckoutPage({ searchParams: params({ cantidad: "5", origen: "instagram" }) }))).toMatchSnapshot();
  });
  it("/checkout/success", async () => {
    expect(conLayout(CheckoutLayout, await CheckoutSuccessPage({ searchParams: params({ orderId: "ord-1" }) }))).toMatchSnapshot();
  });
  it("/checkout/failure", async () => {
    expect(conLayout(CheckoutLayout, await CheckoutFailurePage({ searchParams: params({ orderId: "ord-1" }) }))).toMatchSnapshot();
  });
  it("/checkout/pending", async () => {
    expect(conLayout(CheckoutLayout, await CheckoutPendingPage({ searchParams: params({ orderId: "ord-1" }) }))).toMatchSnapshot();
  });
});

describe("HTML del admin de Melera", () => {
  it("/admin/login", () => {
    expect(html(createElement(AdminLoginPage))).toMatchSnapshot();
  });
  it("/admin/pedidos (con el layout y el menú)", async () => {
    expect(html(await AdminLayout({ children: await AdminPedidosPage() }))).toMatchSnapshot();
  });
  it("/admin/pedidos/[id]", async () => {
    expect(html(await AdminPedidoDetallePage({ params: params({ id: "ord-1" }) }))).toMatchSnapshot();
  });
  it("/admin/productos", async () => {
    expect(html(await AdminProductosPage())).toMatchSnapshot();
  });
  it("/admin/consultas", async () => {
    expect(html(await AdminConsultasPage())).toMatchSnapshot();
  });
  it("/admin/instagram", async () => {
    expect(html(await AdminInstagramPage())).toMatchSnapshot();
  });
  it("/admin/autorespuestas", async () => {
    expect(html(await AdminAutoRespuestasPage())).toMatchSnapshot();
  });
  it("/admin/preguntas", async () => {
    expect(html(await AdminPreguntasPage())).toMatchSnapshot();
  });
  it("/admin/logs", async () => {
    expect(html(await AdminLogsPage({ searchParams: params({}) }))).toMatchSnapshot();
  });
});
