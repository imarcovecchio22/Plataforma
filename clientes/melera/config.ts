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
