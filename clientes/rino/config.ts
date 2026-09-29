import { definirCliente } from "../../src/plataforma/cliente/esquema";

/**
 * 3DRinoMaker (impresiones 3D). Sin tema propio: usa el neutro de la plataforma con estos colores.
 *
 * PROVISORIO: todavía no se habló con el dueño. Dominio, Instagram, colores, logo, textos y tono
 * son de relleno; se reemplazan todos los que dicen PROVISORIO (buscar esa palabra).
 */
export default definirCliente({
  slug: "rino",
  nombre: "3DRinoMaker",
  // PROVISORIO: dominio e Instagram
  dominio: "https://3drinomaker.com.ar",
  instagram: "3drinomaker",
  seo: {
    titulo: "3DRinoMaker | Impresiones 3D",
    descripcion: "Piezas impresas en 3D: macetas, llaveros, soportes y más, hechas a pedido en Argentina.",
    altImagen: "3DRinoMaker, impresiones 3D",
  },
  // PROVISORIO: paleta naranja de relleno
  colores: {
    marca: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
    },
    claro: "#fafaf9",
    oscuro: "#1c1917",
    sombra: "#1c1917",
  },
  // PROVISORIO: logo de texto hasta tener el de la marca
  imagenes: {
    logo: "/logo.svg",
    compartir: "/compartir.svg",
    producto: { src: "/producto.svg", alt: "Pieza impresa en 3D", ancho: 400, alto: 480 },
  },
  modulos: { instagram: true, autorespuestas: true, chatIA: true, cotizador: false },
  estilosInstagram: [{ id: "simple", nombre: "Simple", usaSemilla: false }],
  // PROVISORIO: tono y textos para Gemini
  ia: {
    descripcion: "un taller de impresiones 3D de Argentina",
    tema: "3DRinoMaker, sus piezas impresas en 3D y la impresión 3D en general",
    chat: {
      producto: "Pieza impresa en 3D",
      datos: [
        "Las piezas se imprimen en PLA (plástico biodegradable hecho a partir de almidón de maíz).",
        "Pago: online con Mercado Pago, al finalizar la compra en la web.",
        "Consultas y pedidos especiales: en $SITIO/consultas, y le respondemos por Instagram o por email.",
      ],
    },
    copy: {
      rol: "taller argentino de impresiones 3D",
      tono: "Tono cercano, entusiasta y práctico, con algo de detalle técnico sin ser complicado.",
      promosDe: "piezas impresas en 3D",
      temaDatos: "impresión 3D, materiales y diseño",
      ejemplos: {
        titulo: "Diseñado <em>capa por capa</em>",
        caracteristicas: "PLA / A pedido / Hecho en Argentina",
        presentacion: "Pieza de 12 cm",
        ctaPromo: "Pedila en la web",
        taglineDato: "así se imprime",
      },
    },
  },
  unidad: { singular: "pieza", plural: "piezas", genero: "femenino" },
  // PROVISORIO: textos de la tienda
  textos: {
    emoji: "🦏",
    hero: {
      titulo: "Piezas impresas en 3D",
      bajada: "Macetas, llaveros, soportes y objetos de diseño, impresos a pedido en nuestro taller.",
      botonNosotros: "Conocé el taller",
    },
    aclaracionPrecio: "por pieza",
    nosotros: {
      titulo: "El taller",
      parrafos: [
        "En **3DRinoMaker** diseñamos e imprimimos piezas en 3D, una por una.",
        "Trabajamos con PLA, un plástico biodegradable, y cuidamos cada detalle de la terminación.",
      ],
    },
    pie: "Impresiones 3D hechas en Argentina.",
    descripcionConsultas: "¿Tenés una duda o querés una pieza a medida? Mirá las preguntas frecuentes o escribinos.",
    privacidad: {
      quienes: "taller de impresiones 3D",
      infoRespuestas: "información de las piezas y los pedidos",
    },
    tituloChat: "3DRinoMaker",
    ejemplosAdmin: {
      palabrasClave: "precio, comprar, pedido, info",
      tituloBoton: "🛒 Ver piezas",
      temaPost: "cómo se imprime una pieza en 3D",
      nombreProducto: "Maceta <em>Geométrica</em>",
      categoria: "decoración",
      presentacion: "12 cm",
      mensajeProbador: "Hola! cuánto sale la maceta?",
    },
  },
  region: {
    moneda: "ARS",
    locale: "es-AR",
    zonaHoraria: "America/Argentina/Buenos_Aires",
  },
});
