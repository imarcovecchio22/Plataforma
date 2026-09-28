import { definirSeed } from "../../src/plataforma/cliente/seed";

export default definirSeed({
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
