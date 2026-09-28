import { PANAL } from "./config";
import { clamp, lerpAngle } from "./dibujo";
import type { Actor, EstadoMotor } from "./motor";

type Gota = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number };

/** Cada cuánto se vuelven a buscar los [data-fondo-evita] (cambian al navegar). */
const REFRESCO_EVITAR_MS = 1000;

/**
 * La abeja geométrica que pasea, huye del cursor o del dedo, esquiva los botones de compra
 * ([data-fondo-evita]) y lleva un jarrón que gotea miel. Portada tal cual del prototipo.
 */
export class Abeja implements Actor {
  private alive = false;
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private heading = Math.PI;
  private flee = 0;
  private wing = 0;
  private face = -1;
  private faceT = -1;
  private swing = 0;
  private swingV = 0;
  private acc = 0;
  private spout: { x: number; y: number } | null = null;
  private entering = true;
  private drips: Gota[] = [];
  private evitar: Element[] = [];
  private evitarRefrescado = -Infinity;

  reiniciar() {
    this.alive = false;
    this.drips.length = 0;
  }

  alCambiarTamano(e: EstadoMotor) {
    if (!this.alive) return;
    this.x = clamp(this.x, 20, e.W - 20);
    this.y = clamp(this.y, 20, e.H - 20);
  }

  cuadro(f: CanvasRenderingContext2D, dt: number, e: EstadoMotor) {
    if (!this.alive && (!e.entradaActiva || e.entradaT > 0.7)) this.spawn(e);
    if (!this.alive) return;
    this.update(dt, e);
    this.updateDrips(dt, e);
    this.drawDrips(f);
    this.drawBee(f, e);
  }

  private spawn(e: EstadoMotor) {
    Object.assign(this, {
      alive: true,
      x: e.W + 50,
      y: e.H * (e.mobile ? 0.28 : 0.32),
      vx: -PANAL.cruise,
      vy: 0,
      heading: Math.PI + 0.15,
      flee: 0,
      face: -1,
      faceT: -1,
      swing: 0,
      swingV: 0,
      acc: 0,
      spout: null,
      entering: true,
    });
  }

  private zonasEvitar() {
    const ahora = performance.now();
    if (ahora - this.evitarRefrescado > REFRESCO_EVITAR_MS) {
      this.evitar = Array.from(document.querySelectorAll("[data-fondo-evita]"));
      this.evitarRefrescado = ahora;
    }
    return this.evitar;
  }

  private update(dt: number, e: EstadoMotor) {
    const P = PANAL;
    const { W, H } = e;
    this.heading += (Math.random() - 0.5) * 2.4 * dt + Math.sin(e.time * 0.7) * 0.4 * dt;
    const dx = Math.cos(this.heading) * P.cruise,
      dy = Math.sin(this.heading) * P.cruise * 0.7;
    let fx = 0,
      fy = 0;
    const m = e.mobile ? 50 : 90,
      top = m + 50;
    if (this.entering && this.x < W - m) this.entering = false;
    if (this.x < m) fx += (m - this.x) * 12;
    if (this.x > W - m) fx -= (this.x - (W - m)) * 12;
    if (this.y < top) fy += (top - this.y) * 12;
    if (this.y > H - m) fy -= (this.y - (H - m)) * 12;
    if (this.x < m || this.x > W - m || this.y < top || this.y > H - m)
      this.heading = lerpAngle(this.heading, Math.atan2(H / 2 - this.y, W / 2 - this.x), dt * 2);

    // Huir del cursor o del dedo
    const ptr = e.ptr;
    if (ptr.active && !e.entradaActiva) {
      const ddx = this.x - ptr.x,
        ddy = this.y - ptr.y,
        d = Math.hypot(ddx, ddy) || 1;
      if (d < P.fleeRadius) {
        const k = 1 - d / P.fleeRadius;
        this.flee = Math.max(this.flee, k);
        fx += (ddx / d) * k * P.fleeSpeed * 7;
        fy += (ddy / d) * k * P.fleeSpeed * 7;
        this.heading = lerpAngle(this.heading, Math.atan2(ddy, ddx), dt * 6);
      }
    }
    this.flee = Math.max(0, this.flee - dt * 0.8);

    // No pasar por encima de los botones de compra
    for (const el of this.zonasEvitar()) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const pad = 40;
      if (this.x > r.left - pad && this.x < r.right + pad && this.y > r.top - pad && this.y < r.bottom + pad) {
        const cx = (r.left + r.right) / 2,
          cy = (r.top + r.bottom) / 2;
        const ddx = this.x - cx,
          ddy = this.y - cy;
        const nx = ddx / (r.width / 2 + pad),
          ny = ddy / (r.height / 2 + pad);
        if (Math.abs(nx) > Math.abs(ny)) fx += Math.sign(ddx || 1) * 1500;
        else fy += Math.sign(ddy || 1) * 1500;
        this.heading = lerpAngle(this.heading, Math.atan2(ddy, ddx), dt * 4);
      }
    }

    const steer = 2.2;
    this.vx += (dx - this.vx) * steer * dt + fx * dt;
    this.vy += (dy - this.vy) * steer * dt + fy * dt;
    const sp = Math.hypot(this.vx, this.vy),
      max = P.cruise * 1.3 + (P.fleeSpeed - P.cruise) * this.flee;
    if (sp > max) {
      this.vx *= max / sp;
      this.vy *= max / sp;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (!this.entering) {
      this.x = clamp(this.x, 8, W - 8);
      this.y = clamp(this.y, 8, H - 8);
    }

    this.wing += dt * (46 + 30 * this.flee);
    if (Math.abs(this.vx) > 15) this.faceT = Math.sign(this.vx);
    this.face += (this.faceT - this.face) * Math.min(1, dt * 9);
    const target = clamp(this.vx * 0.0022, -0.6, 0.6);
    this.swingV += (target - this.swing) * 40 * dt - this.swingV * 4 * dt;
    this.swing += this.swingV * dt;
  }

  private ala(f: CanvasRenderingContext2D, ox: number, flap: number, alpha: number) {
    f.save();
    f.translate(ox, -6);
    f.scale(1, flap);
    f.beginPath();
    f.moveTo(0, 0);
    f.lineTo(-7, -11);
    f.lineTo(-1, -19);
    f.lineTo(8, -16);
    f.lineTo(9, -5);
    f.closePath();
    f.fillStyle = `rgba(255,246,226,${alpha})`;
    f.fill();
    f.lineWidth = 1;
    f.strokeStyle = "rgba(255,236,200,0.95)";
    f.stroke();
    f.beginPath();
    f.moveTo(0, 0);
    f.lineTo(1, -15);
    f.strokeStyle = "rgba(255,236,200,0.5)";
    f.stroke();
    f.restore();
  }

  private drawBee(f: CanvasRenderingContext2D, e: EstadoMotor) {
    const S = e.mobile ? 1.3 : 1.65;
    const sf = Math.sign(this.face) || 1;
    const faceScale = sf * Math.max(0.18, Math.abs(this.face));
    const tilt = clamp(this.vy / 320, -0.45, 0.45),
      rot = tilt * sf;
    const y = this.y + Math.sin(e.time * 5.2) * 2.5 * (1 - this.flee);
    f.save();
    f.translate(this.x, y);
    f.rotate(rot);
    f.scale(faceScale * S, S);
    f.lineJoin = "round";
    f.lineCap = "round";

    this.ala(f, -4, 0.3 + 0.7 * Math.abs(Math.sin(this.wing + 0.6)), 0.35);

    // Jarrón colgando
    f.save();
    f.translate(1, 8);
    f.rotate((this.swing - rot) * sf);
    f.strokeStyle = "#2A1405";
    f.lineWidth = 1.1;
    f.beginPath();
    f.moveTo(-3, 0);
    f.lineTo(-6, 11);
    f.moveTo(4, 0);
    f.lineTo(6, 11);
    f.stroke();
    f.fillStyle = "#6B3A12";
    f.fillRect(-7, 11, 14, 3.5);
    const jg = f.createLinearGradient(0, 14, 0, 29);
    jg.addColorStop(0, "#F7C35A");
    jg.addColorStop(1, "#B8650A");
    f.beginPath();
    if (f.roundRect) f.roundRect(-8, 14, 16, 15, 4);
    else f.rect(-8, 14, 16, 15);
    f.fillStyle = jg;
    f.fill();
    f.strokeStyle = "rgba(255,238,205,0.75)";
    f.lineWidth = 1.1;
    f.stroke();
    f.fillStyle = "#F4E4C1";
    f.fillRect(-8, 18.5, 16, 4.5);
    f.fillStyle = "rgba(255,255,255,0.4)";
    f.fillRect(-6, 24, 1.6, 4);
    const dl = 3 + 2 * Math.sin(e.time * 3);
    f.beginPath();
    f.moveTo(6.2, 14.5);
    f.quadraticCurveTo(8.4, 15 + dl * 0.5, 7.6, 15 + dl);
    f.strokeStyle = "#E9A21C";
    f.lineWidth = 2;
    f.stroke();
    const pt = f.getTransform().transformPoint(new DOMPoint(2, 29));
    this.spout = { x: pt.x / e.DPR, y: pt.y / e.DPR };
    f.restore();

    // Cuerpo geométrico, como el logo
    f.beginPath();
    f.moveTo(-15, 0);
    f.lineTo(-9, -8);
    f.lineTo(7, -8);
    f.lineTo(12, 0);
    f.lineTo(7, 8);
    f.lineTo(-9, 8);
    f.closePath();
    const bgd = f.createLinearGradient(0, -8, 0, 8);
    bgd.addColorStop(0, "#FFD066");
    bgd.addColorStop(0.5, "#E9A21C");
    bgd.addColorStop(1, "#C47A0A");
    f.fillStyle = bgd;
    f.fill();
    f.save();
    f.clip();
    f.fillStyle = "#2A1405";
    f.fillRect(-7, -9, 4, 18);
    f.fillRect(0, -9, 4, 18);
    f.restore();
    f.strokeStyle = "#2A1405";
    f.lineWidth = 1.4;
    f.stroke();
    f.beginPath();
    f.moveTo(-15, -1.5);
    f.lineTo(-19.5, 0.5);
    f.lineTo(-15, 2);
    f.fillStyle = "#2A1405";
    f.fill();
    f.beginPath();
    f.arc(15, -1, 6, 0, Math.PI * 2);
    f.fill();
    f.beginPath();
    f.arc(17.2, -2.8, 1.5, 0, Math.PI * 2);
    f.fillStyle = "#F4E4C1";
    f.fill();
    f.strokeStyle = "#2A1405";
    f.lineWidth = 1.2;
    f.beginPath();
    f.moveTo(16, -6);
    f.quadraticCurveTo(19, -12, 23, -13);
    f.moveTo(14, -6.5);
    f.quadraticCurveTo(15, -13, 18, -15.5);
    f.stroke();
    f.fillStyle = "#2A1405";
    f.beginPath();
    f.arc(23, -13, 1.3, 0, Math.PI * 2);
    f.arc(18, -15.5, 1.3, 0, Math.PI * 2);
    f.fill();

    this.ala(f, 1, 0.3 + 0.7 * Math.abs(Math.sin(this.wing)), 0.55);
    f.restore();
  }

  /* ---------- Gotas de miel ---------- */
  private updateDrips(dt: number, e: EstadoMotor) {
    if (this.spout && !this.entering) {
      this.acc += PANAL.drips * (1 + 2 * this.flee) * dt;
      while (this.acc >= 1) {
        this.acc -= 1;
        if (this.drips.length < 90)
          this.drips.push({
            x: this.spout.x + (Math.random() - 0.5) * 4,
            y: this.spout.y,
            vx: this.vx * 0.15,
            vy: 15 + Math.random() * 20,
            life: 0,
            max: 1.8 + Math.random() * 0.9,
            s: (2.2 + Math.random() * 1.8) * (e.mobile ? 0.9 : 1.1),
          });
      }
    }
    for (const p of this.drips) {
      p.life += dt;
      p.vy = Math.min(p.vy + 300 * dt, 190);
      p.vx *= 1 - 1.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.drips.length - 1; i >= 0; i--)
      if (this.drips[i].life > this.drips[i].max || this.drips[i].y > e.H + 30) this.drips.splice(i, 1);
  }

  private drawDrips(f: CanvasRenderingContext2D) {
    for (const p of this.drips) {
      const a = p.life / p.max,
        alpha = a < 0.55 ? 1 : 1 - (a - 0.55) / 0.45;
      const speed = Math.hypot(p.vx, p.vy),
        s = p.s,
        len = s * (1.3 + speed / 60);
      f.save();
      f.globalAlpha = alpha * 0.95;
      f.translate(p.x, p.y);
      f.rotate(Math.atan2(p.vy, p.vx) - Math.PI / 2);
      f.beginPath();
      f.moveTo(0, -len);
      f.quadraticCurveTo(s * 1.05, -s * 0.5, s, s * 0.1);
      f.arc(0, s * 0.1, s, 0, Math.PI);
      f.quadraticCurveTo(-s * 1.05, -s * 0.5, 0, -len);
      const g = f.createRadialGradient(-s * 0.35, 0, 0, 0, 0, s * 1.6);
      g.addColorStop(0, "#FFE0A0");
      g.addColorStop(0.45, "#E89A16");
      g.addColorStop(1, "#A95A06");
      f.fillStyle = g;
      f.fill();
      f.beginPath();
      f.arc(-s * 0.35, s * 0.05, s * 0.28, 0, Math.PI * 2);
      f.fillStyle = "rgba(255,252,240,0.7)";
      f.fill();
      f.restore();
    }
  }
}
