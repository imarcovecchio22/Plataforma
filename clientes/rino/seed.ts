import { definirSeed } from "../../src/plataforma/cliente/seed";

// PROVISORIO: productos, precios, zonas y preguntas de muestra hasta tener los reales del dueño.
export default definirSeed({
  productos: [
    {
      nombre: "Maceta geométrica",
      slug: "maceta-geometrica",
      descripcion: "Maceta facetada de 12 cm impresa en PLA, con plato. Ideal para suculentas.",
      precio: 8500,
      stock: 15,
      escalones: [{ desde: 3, precio: 7800 }],
    },
    {
      nombre: "Llavero personalizado",
      slug: "llavero-personalizado",
      descripcion: "Llavero de 5 cm con el nombre o la inicial que quieras.",
      precio: 2500,
      stock: 60,
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
});
