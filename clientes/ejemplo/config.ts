import { definirCliente } from "../../src/plataforma/cliente/esquema";

/**
 * Cliente de ejemplo: la config mínima completa, sin tema propio (usa el neutro de la plataforma).
 * Sirve para probar la plataforma sin Melera y como punto de partida de un cliente nuevo.
 */
export default definirCliente({
  slug: "ejemplo",
  nombre: "Tienda Ejemplo",
  dominio: "https://tienda-ejemplo.com.ar",
  instagram: "tienda.ejemplo",
  seo: {
    titulo: "Tienda Ejemplo | Productos de ejemplo",
    descripcion: "Una tienda de ejemplo para probar la plataforma.",
    altImagen: "Tienda Ejemplo",
  },
  colores: {
    marca: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
    claro: "#f8fafc",
    oscuro: "#0f172a",
    sombra: "#0f172a",
  },
  imagenes: {
    logo: "/logo.svg",
    compartir: "/compartir.svg",
    producto: { src: "/producto.svg", alt: "Producto de ejemplo", ancho: 400, alto: 480 },
  },
  ia: {
    descripcion: "una tienda de ejemplo",
    tema: "Tienda Ejemplo y sus productos",
    chat: {
      producto: "Producto de ejemplo",
      datos: [
        "Envíos: a coordinar después de la compra.",
        "Pago: online con Mercado Pago, al finalizar la compra en la web.",
        "Consultas: en $SITIO/consultas, y le respondemos por Instagram o por email.",
      ],
    },
    copy: {
      rol: "tienda argentina de ejemplo",
      tono: "Tono claro y cercano, sin exagerar.",
      promosDe: "el producto de ejemplo",
      temaDatos: "el rubro de la tienda",
      ejemplos: {
        titulo: "Hecho <em>para vos</em>",
        caracteristicas: "Calidad / Envío rápido",
        presentacion: "Unidad",
        ctaPromo: "Pedilo en la web",
        taglineDato: "lo que hay que saber",
      },
    },
  },
  unidad: { singular: "unidad", plural: "unidades", genero: "femenino" },
  textos: {
    emoji: "✨",
    hero: {
      titulo: "Productos de ejemplo",
      bajada: "Una tienda de prueba para ver cómo queda la plataforma con el tema neutro.",
      botonNosotros: "Conocé la tienda",
    },
    aclaracionPrecio: "por unidad",
    nosotros: {
      titulo: "Sobre la tienda",
      parrafos: [
        "Esta es una tienda de **ejemplo**: todos sus textos salen de clientes/ejemplo/config.ts.",
        "Sirve para probar la plataforma sin tocar a ningún cliente real.",
      ],
    },
    pie: "Una tienda de ejemplo.",
    descripcionConsultas: "¿Tenés alguna duda? Mirá las preguntas frecuentes o escribinos.",
    privacidad: {
      quienes: "tienda de ejemplo",
      infoRespuestas: "información de los productos",
    },
    tituloChat: "Tienda Ejemplo",
    ejemplosAdmin: {
      palabrasClave: "precio, comprar, info",
      tituloBoton: "🛒 Quiero comprar",
      temaPost: "cómo elegir el producto ideal",
      nombreProducto: "Producto <em>Ejemplo</em>",
      categoria: "ejemplo",
      presentacion: "unidad",
      mensajeProbador: "Hola! cuánto sale?",
    },
  },
  region: {
    moneda: "ARS",
    locale: "es-AR",
    zonaHoraria: "America/Argentina/Buenos_Aires",
  },
});
