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
  region: {
    moneda: "ARS",
    locale: "es-AR",
    zonaHoraria: "America/Argentina/Buenos_Aires",
  },
});
