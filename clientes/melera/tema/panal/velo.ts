import { ENTRADA_VISTA_KEY } from "./config";

/**
 * Velo de la entrada, previo a que cargue el canvas: un script mínimo en el <head> de la
 * página marca <html data-entrada> si en esta sesión todavía no se vio la entrada, y el CSS
 * (.velo-entrada) tapa la home con el primer cuadro de la entrada desde el primer instante.
 * Cuando el canvas dibuja su primer cuadro, se saca el velo. Si el JS no llegara a cargar,
 * el CSS lo desvanece solo a los 4 s.
 */
export const SCRIPT_VELO = `try{var d=document.documentElement;if(location.pathname==="/"&&sessionStorage.getItem("${ENTRADA_VISTA_KEY}")!=="1"&&!matchMedia("(prefers-reduced-motion: reduce)").matches)d.setAttribute("data-entrada","")}catch(e){}`;

/** "Saltar" del velo: funciona aunque React todavía no haya cargado. */
export const SALTAR_VELO = `try{sessionStorage.setItem("${ENTRADA_VISTA_KEY}","1")}catch(e){}document.documentElement.removeAttribute("data-entrada")`;

export function quitarVeloEntrada() {
  document.documentElement.removeAttribute("data-entrada");
}
