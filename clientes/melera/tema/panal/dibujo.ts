/**
 * Funciones de dibujo del panal, portadas tal cual de clientes/melera/docs/panal-prototipo.html.
 * Sin React: las usa el motor (motor.ts).
 */

export const SQ3 = Math.sqrt(3);
/** Margen de cada capa para el parallax (px). */
export const MARGEN = 170;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeIn = (t: number) => t * t * t;

export function lerpAngle(a: number, b: number, t: number) {
  const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return a + d * Math.min(1, t);
}

/** Generador pseudoaleatorio con semilla (mulberry32): el panal sale igual en cada visita. */
export function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexPath(g: CanvasRenderingContext2D | Path2D, cx: number, cy: number, r: number) {
  g.moveTo(cx, cy - r);
  for (let k = 1; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  g.closePath();
}

export type DefCapa = {
  kind: "back" | "mid" | "front";
  r: number;
  seed: number;
  blur?: number;
  hi?: boolean;
  depth: number;
  zoom: number;
  alpha: number;
};

export type Capa = DefCapa & { canvas: HTMLCanvasElement };

/** Las 3 capas del prototipo (en mobile las celdas son un 28 % más chicas). */
export function definirCapas(mobile: boolean): DefCapa[] {
  const k = mobile ? 0.72 : 1;
  return [
    { kind: "back", r: 78 * k, seed: 11, blur: 3, depth: 0.3, zoom: 1.5, alpha: 1 },
    { kind: "mid", r: 46 * k, seed: 7, hi: true, depth: 0.7, zoom: 3.2, alpha: 1 },
    { kind: "front", r: 170 * k, seed: 3, blur: 7, depth: 1.4, zoom: 7, alpha: 0.75 },
  ];
}

/** Dibuja una capa del panal en un canvas aparte (una vez; después solo se mueve). */
export function renderLayer(d: DefCapa, W: number, H: number, DPR: number): HTMLCanvasElement {
  const M = MARGEN;
  const rs = d.hi ? Math.min(DPR, 1.5) : 1;
  const lw = W + 2 * M,
    lh = H + 2 * M;
  const c = document.createElement("canvas");
  c.width = Math.ceil(lw * rs);
  c.height = Math.ceil(lh * rs);
  const g = c.getContext("2d")!;
  g.scale(rs, rs);
  g.lineJoin = "round";
  const rnd = rng(d.seed),
    r = d.r,
    w = SQ3 * r,
    vs = 1.5 * r,
    wall = r * 0.13;

  if (d.kind !== "front") {
    g.fillStyle = d.kind === "back" ? "#3A2009" : "#4E2D10";
    g.fillRect(0, 0, lw, lh);
  }

  for (let row = -1; row * vs < lh + r; row++) {
    for (let col = -1; col * w < lw + w; col++) {
      const cx = col * w + (row & 1 ? w / 2 : 0),
        cy = row * vs;
      if (d.kind === "front") {
        if (rnd() > 0.3) continue;
        g.beginPath();
        hexPath(g, cx, cy, r - wall * 0.2);
        g.lineWidth = r * 0.2;
        g.strokeStyle = "rgba(28,12,3,0.9)";
        g.stroke();
        g.beginPath();
        hexPath(g, cx, cy, r - r * 0.12);
        g.lineWidth = r * 0.03;
        g.strokeStyle = "rgba(255,190,100,0.18)";
        g.stroke();
        continue;
      }
      const n =
        0.5 +
        0.5 * Math.sin(cx * 0.0055 + d.seed) * Math.cos(cy * 0.007 - d.seed * 0.3) +
        0.2 * Math.sin((cx - cy) * 0.011);
      const v = n + (rnd() - 0.5) * 0.45;
      const ir = r - wall;
      let grad: CanvasGradient;
      if (v > 0.92) {
        // celda con miel
        grad = g.createRadialGradient(cx - ir * 0.3, cy - ir * 0.35, 0, cx, cy, ir * 1.05);
        grad.addColorStop(0, "#FFE7A8");
        grad.addColorStop(0.22, "#F4B53A");
        grad.addColorStop(0.62, "#C7760B");
        grad.addColorStop(1, "#6E3605");
      } else if (v > 0.84) {
        // operculada (tapa de cera)
        grad = g.createRadialGradient(cx - ir * 0.2, cy - ir * 0.25, 0, cx, cy, ir);
        grad.addColorStop(0, "#F8E6BC");
        grad.addColorStop(0.55, "#E0BC7A");
        grad.addColorStop(1, "#A0733A");
      } else {
        // vacía, con profundidad
        grad = g.createRadialGradient(cx + ir * 0.15, cy + ir * 0.2, 0, cx, cy, ir);
        grad.addColorStop(0, "#0E0602");
        grad.addColorStop(0.6, "#241206");
        grad.addColorStop(1, "#3E220B");
      }
      g.beginPath();
      hexPath(g, cx, cy, ir);
      g.fillStyle = grad;
      g.fill();
      if (v > 0.92) {
        g.beginPath();
        g.ellipse(cx - ir * 0.32, cy - ir * 0.38, ir * 0.22, ir * 0.1, -0.5, 0, Math.PI * 2);
        g.fillStyle = "rgba(255,250,235,0.45)";
        g.fill();
      }
      g.beginPath();
      hexPath(g, cx, cy, ir);
      g.lineWidth = Math.max(1, r * 0.035);
      g.strokeStyle = "rgba(255,205,130,0.12)";
      g.stroke();
    }
  }
  if (d.kind === "back") {
    g.fillStyle = "rgba(14,6,1,0.5)";
    g.fillRect(0, 0, lw, lh);
  }

  if (d.blur) {
    const c2 = document.createElement("canvas");
    c2.width = c.width;
    c2.height = c.height;
    const g2 = c2.getContext("2d")!;
    if ("filter" in g2) g2.filter = `blur(${d.blur * rs}px)`;
    g2.drawImage(c, 0, 0);
    return c2;
  }
  return c;
}

/** Radio inicial de la celda de la entrada (igual en el canvas y en el velo CSS previo). */
export const radioEntrada = (W: number, H: number) => Math.max(36, Math.min(W, H) * 0.09);

/**
 * Un cuadro de la entrada: fondo crema con una celda que crece hasta atravesar la pantalla.
 * Debajo de la celda, el logo real (en lugar del texto "Melera" del prototipo).
 */
export function drawIntro(
  f: CanvasRenderingContext2D,
  t: number,
  W: number,
  H: number,
  logo: HTMLImageElement | null
) {
  const r0 = radioEntrada(W, H);
  const rMax = Math.hypot(W, H) * 0.75;
  const g = t < 0.22 ? 0 : easeIn((t - 0.22) / 0.78);
  const hr = r0 * Math.pow(rMax / r0, g);
  f.save();
  f.fillStyle = "#F4E4C1";
  f.beginPath();
  f.rect(0, 0, W, H);
  hexPath(f, W / 2, H / 2, hr);
  f.fill("evenodd");
  f.lineJoin = "round";
  f.lineWidth = Math.max(3, hr * 0.09);
  f.strokeStyle = "#B8650A";
  f.beginPath();
  hexPath(f, W / 2, H / 2, hr);
  f.stroke();
  const a = Math.max(0, 1 - t * 3.2);
  if (a > 0 && logo?.complete && logo.naturalWidth) {
    const alto = r0 * LOGO_ENTRADA_ALTO;
    const ancho = (alto * logo.naturalWidth) / logo.naturalHeight;
    f.globalAlpha = a;
    f.drawImage(logo, W / 2 - ancho / 2, H / 2 + r0 * 1.3, ancho, alto);
  }
  f.restore();
}

/** Alto del logo de la entrada, en múltiplos del radio inicial de la celda. */
export const LOGO_ENTRADA_ALTO = 2.2;
