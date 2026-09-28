import { definirSeed } from "../../src/plataforma/cliente/seed";

export default definirSeed({
  preguntas: [
    {
      orden: 10,
      pregunta: "¿Cuánto sale el frasco?",
      respuesta: "El frasco de $PRODUCTO sale $PRECIO.[[ Llevando más sale menos: $PROMOS.]]",
    },
    {
      orden: 20,
      pregunta: "¿Hacen envíos? ¿A qué zonas?",
      respuesta:
        "Por ahora enviamos solo dentro de CABA, y el envío lo coordinamos con vos después de la compra. Pronto vamos a sumar más zonas: si estás en otro lugar, [escribinos acá abajo](#escribinos) y te avisamos.",
    },
    {
      orden: 30,
      pregunta: "¿Cómo puedo pagar?",
      respuesta: "Pagás online con Mercado Pago, al finalizar la compra en la web.",
    },
    {
      orden: 40,
      pregunta: "¿De dónde viene la miel?",
      respuesta:
        "De Apícola Mercedes, en Tomás Jofré, Buenos Aires. Cada frasco llega con su etiqueta original y certificación.",
    },
    {
      orden: 50,
      pregunta: "¿Es normal que la miel se ponga dura?",
      respuesta:
        "Sí. La miel pura cristaliza con el frío, es una señal de que es natural. Para que vuelva a estar líquida, entibiala a baño María.",
    },
  ],
});
