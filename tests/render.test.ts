import { describe, expect, it } from "vitest";

import { pedidoPermitido } from "@/plataforma/imagenes/render";

const pedido = (url: string, tipo: string) => ({ url: () => url, resourceType: () => tipo });

describe("pedidoPermitido (qué puede cargar Chromium al dibujar)", () => {
  it.each([
    ["data:image/png;base64,AAAA", "image"],
    ["https://fonts.googleapis.com/css2?family=Fraunces", "stylesheet"],
    ["https://fonts.gstatic.com/s/fraunces/v1/x.woff2", "font"],
    ["https://melera.vercel.app/producto-miel.png", "image"],
  ])("permite %s (%s)", (url, tipo) => {
    expect(pedidoPermitido(pedido(url, tipo))).toBe(true);
  });

  it.each([
    ["https://evil.com/robar.js", "script"],
    ["https://evil.com/api", "fetch"],
    ["https://evil.com/api", "xhr"],
    ["https://evil.com/estilos.css", "stylesheet"],
    ["http://melera.vercel.app/producto-miel.png", "image"],
    ["https://169.254.169.254/latest/meta-data", "image"],
    ["https://localhost:3000/x.png", "image"],
    ["https://10.0.0.1/x.png", "image"],
    ["file:///etc/passwd", "image"],
    ["https://evil.com/", "document"],
  ])("bloquea %s (%s)", (url, tipo) => {
    expect(pedidoPermitido(pedido(url, tipo))).toBe(false);
  });
});
