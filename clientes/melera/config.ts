import { definirCliente } from "../../src/plataforma/cliente/esquema";

export default definirCliente({
  slug: "melera",
  nombre: "Melera",
  dominio: "https://melera.vercel.app",
  instagram: "melera.miel",
  seo: {
    titulo: "Melera | Miel Artesanal",
    descripcion:
      "Miel pura de abejas, producida por Apícola Mercedes en Tomás Jofré, Buenos Aires. Directo del campo a tu mesa.",
    altImagen: "Melera — Miel Artesanal",
  },
  colores: {
    marca: {
      50: "#fdf3e3",
      100: "#fae3be",
      200: "#f2cc85",
      300: "#edb855",
      400: "#eaa52c",
      500: "#e8970a",
      600: "#c97f08",
      700: "#8b4513",
      800: "#6b3410",
      900: "#4a230b",
    },
    claro: "#fff3dc",
    oscuro: "#3b1f0a",
    sombra: "#785014",
  },
  imagenes: {
    logo: "/brand/melera-logo.png",
    compartir: "/melera-og-clara.png",
    // Sin fondo; la etiqueta se editó de 900 a 500 g
    producto: { src: "/producto-miel-500g.png", alt: "Frasco de miel artesanal Melera", ancho: 433, alto: 577 },
  },
  modulos: { instagram: true, autorespuestas: true, chatIA: true, cotizador: false },
  estilosInstagram: [
    { id: "organico", nombre: "Orgánico (fondo oscuro)", usaSemilla: false },
    { id: "geo", nombre: "Geo (fondo crema)", usaSemilla: false },
    // El panal del fondo sale del id del post
    { id: "panal", nombre: "Panal (como la web)", usaSemilla: true },
  ],
  ia: {
    descripcion: "una marca de miel artesanal de Tomás Jofré, Buenos Aires",
    tema: "Melera y la miel",
    chat: {
      producto: "Miel Artesanal 500g, frasco de vidrio",
      datos: [
        "Elaboración: producida por Apícola Mercedes en Tomás Jofré, Bs As. 100% artesanal, sin aditivos, sin procesos industriales, sin azúcar agregada, sin conservantes. Las abejas recolectan néctar de flores silvestres de la zona.",
        "Envíos: por ahora solo dentro de CABA. Después de la compra, alguien del equipo de Melera le escribe para coordinar el envío. Pronto se suman más zonas; si la persona está fuera de CABA, que escriba en $SITIO/consultas y le avisamos.",
        "Pago: online con Mercado Pago, al finalizar la compra en la web.",
        "Consultas (retiro, compras mayoristas o cualquier otra duda): en $SITIO/consultas, y le respondemos por Instagram o por email. No hay WhatsApp de contacto.",
      ],
    },
    copy: {
      rol: "marca argentina de miel artesanal",
      tono: "Tono cálido, cercano, artesanal, sin exagerar ni usar superlativos vacíos.",
      promosDe: "miel de 500 g",
      temaDatos: "abejas/apicultura/miel",
      ejemplos: {
        titulo: "Pura, <em>natural</em>",
        caracteristicas: "Artesanal / Sin aditivos / Cosecha 2026",
        presentacion: "Frasco 500 g",
        ctaPromo: "Pedila en la web",
        taglineDato: "la magia de la colmena",
      },
    },
  },
  unidad: { singular: "frasco", plural: "frascos", genero: "masculino" },
  textos: {
    emoji: "🐝",
    hero: {
      titulo: "Miel artesanal, pura y natural",
      bajada:
        "Producida por Apícola Mercedes en Tomás Jofré, Buenos Aires. Sin aditivos, sin procesos industriales — tal cual sale de la colmena.",
      botonNosotros: "Conocé nuestra historia",
    },
    aclaracionPrecio: "el frasco de 500 g",
    nosotros: {
      titulo: "Del campo a tu mesa",
      parrafos: [
        "Melera nació de las colmenas de Tomás Jofré, un pueblo rural en el corazón de la provincia de Buenos Aires. Ahí, entre campos abiertos y flores silvestres, nuestras abejas trabajan como lo vienen haciendo por generaciones: sin apuro y sin atajos.",
        "Toda nuestra miel es producida por **Apícola Mercedes**, un apiario familiar con años de trayectoria en la zona. Cada frasco que vendemos tiene ese respaldo: trazabilidad real, cosecha artesanal y un compromiso genuino con la calidad.",
        "No industrializamos el proceso. Extraemos, decantamos y envasamos con cuidado para que la miel llegue a tu casa tal como sale de la colmena: pura, espesa y con todo su sabor natural.",
      ],
    },
    pie: "Miel artesanal de Tomás Jofré, Buenos Aires.",
    descripcionConsultas:
      "¿Tenés alguna duda sobre nuestra miel artesanal? Mirá las preguntas frecuentes o escribinos y te respondemos por Instagram o por email.",
    privacidad: {
      quienes: "miel artesanal de Tomás Jofré, Buenos Aires",
      infoRespuestas: "información de la miel",
    },
    tituloChat: "Melera 🍯",
    ejemplosAdmin: {
      palabrasClave: "miel, precio, comprar",
      tituloBoton: "🍯 Quiero comprar",
      temaPost: "cuántas flores visitan las abejas para hacer miel",
      nombreProducto: "Miel <em>Artesanal</em>",
      categoria: "miel pura",
      presentacion: "frasco 500 g",
      mensajeProbador: "Hola! cuánto sale la miel?",
    },
  },
  region: {
    moneda: "ARS",
    locale: "es-AR",
    zonaHoraria: "America/Argentina/Buenos_Aires",
  },
});
