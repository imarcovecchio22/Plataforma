/**
 * La escala de 10 tonos (50–900) de la marca a partir de un color, como las de la config: el color
 * elegido es el 500, los claros se mezclan con blanco y los oscuros con negro. Garantiza que los
 * tonos que llevan texto blanco se lean (botones del tema neutro y del admin: el 700 con 4,5:1 como
 * mínimo; el 600, que usa el fondo oscuro, con 3:1), oscureciéndolos si hace falta.
 * Sin dependencias: lo usan el servidor y la vista previa del admin.
 */

export const TONOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type Tono = (typeof TONOS)[number];
export type Escala = Record<Tono, string>;

type Rgb = [number, number, number];

const aRgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const aHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
/** Mezcla un color con otro: 0 = el color, 1 = el otro. */
const mezclar = (a: Rgb, b: Rgb, cuanto: number): Rgb => a.map((c, i) => c + (b[i] - c) * cuanto) as Rgb;

const BLANCO: Rgb = [255, 255, 255];
const NEGRO: Rgb = [0, 0, 0];

/** Luminancia relativa (WCAG). */
function luminancia(hex: string) {
  const [r, g, b] = aRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre dos colores (WCAG, de 1 a 21). */
export function contraste(a: string, b: string) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

// Cuánto se mezcla cada tono con blanco (los claros) o con negro (los oscuros)
const CON_BLANCO: Partial<Record<Tono, number>> = { 50: 0.93, 100: 0.85, 200: 0.7, 300: 0.5, 400: 0.25 };
const CON_NEGRO: Partial<Record<Tono, number>> = { 600: 0.14, 700: 0.3, 800: 0.45, 900: 0.6 };
// Contraste mínimo con texto blanco de los tonos que lo llevan
const MINIMO_CON_BLANCO: Partial<Record<Tono, number>> = { 600: 3, 700: 4.5, 800: 4.5, 900: 4.5 };

export function escalaDeColor(hex: string): Escala {
  const base = aRgb(hex);
  const escala = {} as Escala;
  for (const tono of TONOS) {
    if (tono === 500) {
      escala[tono] = aHex(base);
    } else if (CON_BLANCO[tono] !== undefined) {
      escala[tono] = aHex(mezclar(base, BLANCO, CON_BLANCO[tono]!));
    } else {
      // Más negro hasta que el texto blanco se lea (con un color muy claro, como un amarillo)
      let cuanto = CON_NEGRO[tono]!;
      let color = aHex(mezclar(base, NEGRO, cuanto));
      while (contraste(color, "#ffffff") < (MINIMO_CON_BLANCO[tono] ?? 1) && cuanto < 0.95) {
        cuanto += 0.02;
        color = aHex(mezclar(base, NEGRO, cuanto));
      }
      escala[tono] = color;
    }
  }
  // Los oscuros siguen yendo de más claro a más oscuro aunque se hayan corregido
  for (let i = TONOS.indexOf(600) + 1; i < TONOS.length; i++) {
    const [anterior, tono] = [TONOS[i - 1], TONOS[i]];
    if (luminancia(escala[tono]) >= luminancia(escala[anterior])) escala[tono] = aHex(mezclar(aRgb(escala[anterior]), NEGRO, 0.15));
  }
  return escala;
}
