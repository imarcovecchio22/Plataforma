import { definirSeed } from "../../src/plataforma/cliente/seed";

// PROVISORIO: productos, precios, zonas y preguntas de muestra hasta tener los reales del dueño.
export default definirSeed({
  categorias: [
    { nombre: "Decoración", slug: "decoracion" },
    { nombre: "Accesorios", slug: "accesorios" },
  ],
  productos: [
    {
      nombre: "Maceta geométrica",
      slug: "maceta-geometrica",
      descripcion: "Maceta facetada de 12 cm impresa en PLA, con plato. Ideal para suculentas.",
      precio: 8500,
      stock: 15,
      categoria: "decoracion",
      opciones: [{ nombre: "Color", valores: ["Blanco", "Negro", "Terracota"] }],
      escalones: [{ desde: 3, precio: 7800 }],
    },
    {
      nombre: "Llavero personalizado",
      slug: "llavero-personalizado",
      descripcion: "Llavero de 5 cm con el nombre o la inicial que quieras.",
      precio: 2500,
      aPedido: true,
      demora: "Se imprime a pedido en 2 a 3 días hábiles",
      stock: 60,
      categoria: "accesorios",
      opciones: [{ nombre: "Color", valores: ["Rojo", "Azul", "Negro", "Blanco"] }],
      escalones: [
        { desde: 5, precio: 2200 },
        { desde: 10, precio: 1900 },
      ],
    },
    {
      nombre: "Soporte para celular",
      slug: "soporte-celular",
      descripcion: "Soporte de escritorio con ángulo cómodo, para cualquier celular.",
      precio: 6000,
      stock: 20,
      categoria: "accesorios",
    },
  ],
  zonas: [
    { nombre: "Retiro por el taller", aclaracion: "Te escribimos para coordinar día y horario." },
    { nombre: "CABA", costo: 3500 },
    { nombre: "Resto del país", aclaracion: "El costo del envío lo coordinamos después de la compra." },
  ],
  preguntas: [
    {
      orden: 10,
      pregunta: "¿Qué piezas tienen y cuánto salen?",
      respuesta: "Hoy tenemos $CATALOGO. Si buscás algo a medida, [escribinos acá abajo](#escribinos).",
    },
    {
      orden: 20,
      pregunta: "¿Hacen envíos?",
      respuesta: "Sí: $ZONAS.",
    },
    {
      orden: 30,
      pregunta: "¿De qué material son las piezas?",
      respuesta: "De PLA, un plástico biodegradable hecho a partir de almidón de maíz.",
    },
    {
      orden: 40,
      pregunta: "¿Cómo puedo pagar?",
      respuesta: "Pagás online con Mercado Pago, al finalizar la compra en la web.",
    },
  ],
  // Desactivadas: se prenden desde el admin cuando se conecte el Instagram de Rino (y con los
  // textos definitivos). Usan las variables, así siguen al catálogo y a las zonas.
  autorespuestas: [
    {
      nombre: "Precios y catálogo",
      palabrasClave: ["precio", "precios", "cuanto", "catalogo", "comprar"],
      coincidencia: "contiene",
      canal: "ambos",
      respuesta: "¡Hola! Gracias por escribirle a 3DRinoMaker. Hoy tenemos $CATALOGO. Podés verlas y comprarlas en la web.",
      botones: [
        { titulo: "🛒 Ver piezas", url: "https://3drinomaker.com.ar/productos?origen=instagram" },
        { titulo: "💬 Consultar", url: "https://3drinomaker.com.ar/consultas?origen=instagram" },
      ],
      respuestaPublicaComentario: "¡Te mandamos un DM!",
      prioridad: 10,
      activa: false,
    },
    {
      nombre: "Envíos",
      palabrasClave: ["envio", "envios", "envian", "retiro"],
      coincidencia: "contiene",
      canal: "dm",
      respuesta: "¡Hola! Enviamos a: $ZONAS. Elegís la zona al finalizar la compra.",
      botones: [{ titulo: "🛒 Ver piezas", url: "https://3drinomaker.com.ar/productos?origen=instagram" }],
      prioridad: 5,
      activa: false,
    },
  ],
});
