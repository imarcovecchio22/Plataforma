import { PANAL } from "./config";
import {
  MARGEN,
  clamp,
  definirCapas,
  drawIntro,
  easeInOut,
  renderLayer,
  type Capa,
} from "./dibujo";

/** Lo que dibuja encima del panal (la abeja con sus gotas, fase C). */
export interface Actor {
  /** Se llama cada cuadro con el tiempo transcurrido; `ctx` ya tiene la escala del DPR. */
  cuadro(ctx: CanvasRenderingContext2D, dt: number, estado: EstadoMotor): void;
  reiniciar(): void;
  alCambiarTamano?(estado: EstadoMotor): void;
}

export type EstadoMotor = {
  W: number;
  H: number;
  DPR: number;
  mobile: boolean;
  time: number;
  entradaActiva: boolean;
  entradaT: number;
  ptr: { x: number; y: number; active: boolean; mouse: boolean };
};

type Opciones = {
  fondo: HTMLCanvasElement;
  efectos: HTMLCanvasElement;
  /** Correr la entrada al arrancar (la home, una vez por sesión). */
  entrada: boolean;
  logoEntrada?: HTMLImageElement | null;
  /** Se llama cuando la entrada empieza a dibujarse en el canvas y cuando termina. */
  onEntrada?: (activa: boolean) => void;
  actor?: Actor | null;
};

/**
 * Motor del panal: fondo en 3 capas con parallax y luz, entrada atravesando una celda,
 * y un actor encima (la abeja). Porta el script de clientes/melera/docs/panal-prototipo.html.
 * Un solo requestAnimationFrame; se pausa con la pestaña oculta y respeta "reducir movimiento".
 */
export class MotorPanal {
  private bctx: CanvasRenderingContext2D;
  private fctx: CanvasRenderingContext2D;
  private capas: Capa[] = [];
  private raf = 0;
  private last = 0;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;
  private ptrTimer: ReturnType<typeof setTimeout> | undefined;
  private lastMouse = -1e9;
  private par = { x: 0, y: 0 };
  private parT = { x: 0, y: 0 };
  private light = { x: 0, y: 0 };
  private entradaInicio = 0;
  private avisarEntrada = false;
  private mq: MediaQueryList;
  private limpiezas: (() => void)[] = [];
  readonly estado: EstadoMotor = {
    W: 0,
    H: 0,
    DPR: 1,
    mobile: false,
    time: 0,
    entradaActiva: false,
    entradaT: 1,
    ptr: { x: 0, y: 0, active: false, mouse: false },
  };

  constructor(private o: Opciones) {
    this.bctx = o.fondo.getContext("2d")!;
    this.fctx = o.efectos.getContext("2d")!;
    this.mq = matchMedia("(prefers-reduced-motion: reduce)");
  }

  private reducido() {
    return this.mq.matches;
  }

  iniciar() {
    this.setup();
    this.escuchar();
    if (this.o.entrada && !this.reducido()) this.empezarEntrada();
    this.aplicarMovimiento();
  }

  destruir() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearTimeout(this.resizeTimer);
    clearTimeout(this.ptrTimer);
    for (const fn of this.limpiezas) fn();
    this.limpiezas = [];
  }

  /** Termina la entrada ya (botón "Saltar" o Esc). */
  terminarEntrada() {
    this.avisarEntrada = false;
    if (!this.estado.entradaActiva) return;
    this.estado.entradaActiva = false;
    this.estado.entradaT = 1;
    this.o.onEntrada?.(false);
  }

  private setup() {
    const e = this.estado;
    e.W = innerWidth;
    e.H = innerHeight;
    e.DPR = Math.min(devicePixelRatio || 1, 2);
    e.mobile = e.W < 700;
    for (const c of [this.o.fondo, this.o.efectos]) {
      c.width = Math.round(e.W * e.DPR);
      c.height = Math.round(e.H * e.DPR);
    }
    this.capas = definirCapas(e.mobile).map((d) => ({ ...d, canvas: renderLayer(d, e.W, e.H, e.DPR) }));
    this.light.x = e.W * 0.74;
    this.light.y = e.H * 0.22;
  }

  private on<K extends keyof WindowEventMap>(
    target: Window | Document | HTMLElement,
    tipo: K,
    fn: (ev: WindowEventMap[K]) => void,
    opts?: AddEventListenerOptions
  ) {
    target.addEventListener(tipo, fn as EventListener, opts);
    this.limpiezas.push(() => target.removeEventListener(tipo, fn as EventListener, opts));
  }

  private touchAt(x: number, y: number) {
    const p = this.estado.ptr;
    p.x = x;
    p.y = y;
    p.active = true;
    p.mouse = false;
    clearTimeout(this.ptrTimer);
    this.ptrTimer = setTimeout(() => (p.active = false), 700);
  }

  private escuchar() {
    const e = this.estado;
    const pasivo = { passive: true };
    this.on(window, "pointermove", (ev) => {
      if (ev.pointerType === "mouse") {
        const p = e.ptr;
        p.x = ev.clientX;
        p.y = ev.clientY;
        p.active = true;
        p.mouse = true;
        this.lastMouse = performance.now();
        this.parT.x = (ev.clientX / e.W - 0.5) * 2;
        this.parT.y = (ev.clientY / e.H - 0.5) * 2;
      } else this.touchAt(ev.clientX, ev.clientY);
    }, pasivo);
    this.on(window, "pointerdown", (ev) => {
      if (ev.pointerType !== "mouse") this.touchAt(ev.clientX, ev.clientY);
    }, pasivo);
    this.on(window, "touchstart", (ev) => {
      const t = ev.touches[0];
      if (t) this.touchAt(t.clientX, t.clientY);
    }, pasivo);
    this.on(window, "touchmove", (ev) => {
      const t = ev.touches[0];
      if (t) this.touchAt(t.clientX, t.clientY);
    }, pasivo);
    const salir = () => (e.ptr.active = false);
    document.documentElement.addEventListener("mouseleave", salir);
    this.limpiezas.push(() => document.documentElement.removeEventListener("mouseleave", salir));

    this.on(window, "keydown", (ev) => {
      if (ev.key === "Escape") this.terminarEntrada();
    });
    const alCambiarMovimiento = () => this.aplicarMovimiento();
    this.mq.addEventListener("change", alCambiarMovimiento);
    this.limpiezas.push(() => this.mq.removeEventListener("change", alCambiarMovimiento));
    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      } else this.aplicarMovimiento();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    this.limpiezas.push(() => document.removeEventListener("visibilitychange", alCambiarVisibilidad));
    this.on(window, "resize", () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.setup();
        this.o.actor?.alCambiarTamano?.(this.estado);
        if (this.reducido()) this.drawBg(1);
      }, 150);
    });
  }

  private empezarEntrada() {
    this.estado.entradaActiva = true;
    this.estado.entradaT = 0;
    this.entradaInicio = performance.now();
    this.o.actor?.reiniciar();
    // Se avisa recién cuando el primer cuadro ya está dibujado (así el velo CSS se saca sin parpadeo).
    this.avisarEntrada = true;
  }

  /** Corre la entrada (por ejemplo al llegar a la home navegando desde otra página). */
  reproducirEntrada() {
    if (this.reducido()) return;
    this.empezarEntrada();
    this.aplicarMovimiento();
  }

  private aplicarMovimiento() {
    const e = this.estado;
    if (this.reducido()) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.terminarEntrada();
      this.o.actor?.reiniciar();
      this.fctx.setTransform(e.DPR, 0, 0, e.DPR, 0, 0);
      this.fctx.clearRect(0, 0, e.W, e.H);
      this.par.x = this.par.y = 0;
      this.light.x = e.W * 0.74;
      this.light.y = e.H * 0.22;
      this.drawBg(1);
    } else if (!this.raf && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  private drawBg(zoomT: number) {
    const e = this.estado;
    const { W, H, DPR } = e;
    const g = this.bctx;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.fillStyle = "#120702";
    g.fillRect(0, 0, W, H);
    const still = this.reducido();
    const sy = still ? 0 : Math.min(scrollY, 700);
    const lim = MARGEN - 4;
    const P = PANAL;
    for (const L of this.capas) {
      const s = 1 + (L.zoom - 1) * (1 - zoomT);
      const ox = still
        ? 0
        : clamp(-this.par.x * 40 * P.parallax * L.depth + Math.sin(e.time * 0.11 + L.seed) * 6 * L.depth, -lim, lim);
      const oy = still
        ? 0
        : clamp(
            -this.par.y * 30 * P.parallax * L.depth +
              Math.cos(e.time * 0.09 + L.seed) * 6 * L.depth -
              sy * 0.12 * L.depth * P.parallax,
            -lim,
            lim
          );
      g.save();
      g.globalAlpha = L.alpha;
      g.translate(W / 2, H / 2);
      g.scale(s, s);
      g.translate(-W / 2, -H / 2);
      g.drawImage(L.canvas, -MARGEN + ox, -MARGEN + oy, W + 2 * MARGEN, H + 2 * MARGEN);
      g.restore();
    }
    // Luz cálida que atraviesa la cera
    const R = Math.max(W, H) * 0.65;
    g.globalCompositeOperation = "lighter";
    const lg = g.createRadialGradient(this.light.x, this.light.y, 0, this.light.x, this.light.y, R);
    lg.addColorStop(0, `rgba(255,170,60,${0.26 * P.bright})`);
    lg.addColorStop(0.5, `rgba(255,140,30,${0.08 * P.bright})`);
    lg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";
    if (P.bright < 1) {
      g.fillStyle = `rgba(10,4,1,${(1 - P.bright) * 0.8})`;
      g.fillRect(0, 0, W, H);
    }
    const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.25, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    vg.addColorStop(0, "rgba(10,4,1,0)");
    vg.addColorStop(1, "rgba(10,4,1,0.78)");
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const e = this.estado;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    e.time += dt;

    const mouseRecent = now - this.lastMouse < 4000;
    if (!mouseRecent) {
      this.parT.x = Math.sin(e.time * 0.21) * 0.45;
      this.parT.y = Math.cos(e.time * 0.17) * 0.35;
    }
    this.par.x += (this.parT.x - this.par.x) * Math.min(1, dt * 2.5);
    this.par.y += (this.parT.y - this.par.y) * Math.min(1, dt * 2.5);
    const lx = e.ptr.active && e.ptr.mouse ? e.ptr.x : e.W * 0.74 + Math.sin(e.time * 0.3) * e.W * 0.08;
    const ly = e.ptr.active && e.ptr.mouse ? e.ptr.y : e.H * 0.22 + Math.cos(e.time * 0.25) * e.H * 0.06;
    this.light.x += (lx - this.light.x) * Math.min(1, dt * 1.8);
    this.light.y += (ly - this.light.y) * Math.min(1, dt * 1.8);

    let zoomT = 1;
    if (e.entradaActiva) {
      e.entradaT = (now - this.entradaInicio) / (PANAL.introDur * 1000);
      if (e.entradaT >= 1) this.terminarEntrada();
      else zoomT = easeInOut(clamp((e.entradaT - 0.15) / 0.85, 0, 1));
    }
    this.drawBg(zoomT);

    const f = this.fctx;
    f.setTransform(e.DPR, 0, 0, e.DPR, 0, 0);
    f.clearRect(0, 0, e.W, e.H);
    this.o.actor?.cuadro(f, dt, e);
    if (e.entradaActiva) {
      drawIntro(f, e.entradaT, e.W, e.H, this.o.logoEntrada ?? null);
      if (this.avisarEntrada) {
        this.avisarEntrada = false;
        this.o.onEntrada?.(true);
      }
    }
  };
}
