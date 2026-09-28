import { definirSeed } from "../../src/plataforma/cliente/seed";

export default definirSeed({
  productos: [
    {
      nombre: "Producto de ejemplo",
      slug: "producto-de-ejemplo",
      descripcion: "Un producto para probar la tienda.",
      precio: 5000,
      stock: 20,
      escalones: [{ desde: 3, precio: 4500 }],
    },
  ],
  zonas: [{ nombre: "Retiro en el local" }, { nombre: "Envío a domicilio", costo: 3000 }],
  preguntas: [
    {
      orden: 10,
      pregunta: "¿Cuánto sale?",
      respuesta: "$PRODUCTO sale $PRECIO.[[ Llevando más sale menos: $PROMOS.]]",
    },
    {
      orden: 20,
      pregunta: "¿Cómo puedo pagar?",
      respuesta: "Pagás online con Mercado Pago, al finalizar la compra en la web.",
    },
  ],
});
