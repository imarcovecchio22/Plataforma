import { definirCliente } from "../../src/plataforma/cliente/esquema";

export default definirCliente({
  slug: "melera",
  nombre: "Melera",
  dominio: "https://melera.vercel.app",
  region: {
    moneda: "ARS",
    locale: "es-AR",
    zonaHoraria: "America/Argentina/Buenos_Aires",
  },
});
