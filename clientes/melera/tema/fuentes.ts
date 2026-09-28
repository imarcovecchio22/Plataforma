import { Fraunces, Poppins } from "next/font/google";

// next/font necesita estas llamadas con valores fijos, acá arriba. Cada una define la variable
// del contrato de tema (--fuente-texto / --fuente-titulos) en el <body>.

export const fuenteTexto = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fuente-texto",
  display: "swap",
});

export const fuenteTitulos = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fuente-titulos",
  display: "swap",
});
