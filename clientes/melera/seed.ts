import { definirSeed } from "../../src/plataforma/cliente/seed";

export default definirSeed({
  productos: [
    {
      nombre: "Miel Artesanal 500g",
      slug: "miel-artesanal-500g",
      descripcion:
        "Miel pura de abejas, producida por Apícola Mercedes (Tomás Jofré, Buenos Aires). Envasada en frasco de vidrio de 500g.",
      precio: 6500,
      stock: 50,
    },
  ],
  // Lo mismo que decía el checkout antes de las zonas: solo CABA, a coordinar
  zonas: [
    {
      nombre: "CABA",
      aclaracion: "Por ahora enviamos solo dentro de CABA. Pronto sumamos más zonas.",
      detalleResumen: "Envío dentro de CABA: después de la compra te escribimos para coordinarlo.",
    },
  ],
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
  autorespuestas: [
    {
      // La que insertaba la migración 20260925000100 (ver 20260928175457_sacar_regla_de_melera).
      // Desactivada: se activó en producción al desconectar ManyChat.
      nombre: "Bienvenida (como ManyChat)",
      palabrasClave: ["miel", "precio", "comprar", "pedido", "info"],
      coincidencia: "contiene",
      canal: "ambos",
      respuesta:
        "¡Hola! 🐝 Gracias por escribirle a Melera. Tenemos miel artesanal pura de Tomás Jofré, frasco de 500 g a $PRECIO. ¿En qué te ayudamos?",
      botones: [
        { titulo: "🍯 Quiero comprar", url: "https://melera.vercel.app/producto?origen=instagram" },
        { titulo: "💬 Tengo una consulta", url: "https://melera.vercel.app/consultas?origen=instagram" },
      ],
      respuestaPublicaComentario: "¡Te mandamos un DM! 🐝",
      prioridad: 10,
      activa: false,
    },
  ],
});
