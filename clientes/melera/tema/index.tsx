import type { TemaPublico } from "../../../src/plataforma/tema/tipos";
import Entrada from "./Entrada";
import LogoCelda from "./LogoCelda";
import PanalDiferido from "./panal/PanalDiferido";

/** El panal de Melera: entrada atravesando la celda, panal con la abeja de fondo y logo en una celda. */
const tema: TemaPublico = {
  Entrada,
  Fondo: PanalDiferido,
  Logo: LogoCelda,
};

export default tema;
