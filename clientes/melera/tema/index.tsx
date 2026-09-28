import type { TemaPublico } from "../../../src/plataforma/tema/tipos";
import Entrada from "./Entrada";
import { fuenteTexto, fuenteTitulos } from "./fuentes";
import LogoCelda from "./LogoCelda";
import PanalDiferido from "./panal/PanalDiferido";

/**
 * El panal de Melera: entrada atravesando la celda, panal con la abeja de fondo, logo en una celda
 * y Poppins (texto) con Fraunces (títulos).
 */
const tema: TemaPublico = {
  Entrada,
  Fondo: PanalDiferido,
  Logo: LogoCelda,
  fuentes: [fuenteTexto.variable, fuenteTitulos.variable],
};

export default tema;
