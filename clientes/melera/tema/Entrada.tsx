import { SALTAR_VELO, SCRIPT_VELO } from "./panal/velo";
import { LOGO_ENTRADA_URL } from "./panal/config";

// Primer cuadro de la entrada, en HTML y CSS (el canvas lo reemplaza apenas carga). El logo va
// como fondo CSS: mientras el velo está oculto (casi siempre) el navegador no lo descarga.
const VELO_HTML = `<svg viewBox="-110 -110 220 220" aria-hidden="true"><polygon points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50" fill="#120702" stroke="#B8650A" stroke-width="9" stroke-linejoin="round"/></svg><div class="velo-logo" style="background-image:url('${LOGO_ENTRADA_URL}')"></div><button type="button" class="boton-saltar" onclick='${SALTAR_VELO}'>Saltar</button>`;

/** Entrada atravesando la celda: solo en la home, una vez por sesión, con "Saltar" y Esc. */
export default function Entrada() {
  return (
    <>
      {/* Antes de pintar: ¿hay que mostrar la entrada? (home, primera vez en la sesión) */}
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_VELO }} />
      <div className="velo-entrada" dangerouslySetInnerHTML={{ __html: VELO_HTML }} />
    </>
  );
}
