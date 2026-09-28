import { describe, expect, it } from "vitest";
import melera from "../clientes/melera/config";
import { canales, variablesDeColor } from "@/plataforma/cliente/colores";

describe("colores del cliente", () => {
  it("pasa de hex a canales para Tailwind", () => {
    expect(canales("#fdf3e3")).toBe("253 243 227");
    expect(canales("#000000")).toBe("0 0 0");
    expect(canales("#FFFFFF")).toBe("255 255 255");
  });

  it("variables de Melera: las mismas que tenía la paleta de Tailwind (miel, crema, marrón y la sombra)", () => {
    expect(variablesDeColor(melera.colores)).toBe(
      ":root{--marca-50:253 243 227;--marca-100:250 227 190;--marca-200:242 204 133;--marca-300:237 184 85;" +
        "--marca-400:234 165 44;--marca-500:232 151 10;--marca-600:201 127 8;--marca-700:139 69 19;" +
        "--marca-800:107 52 16;--marca-900:74 35 11;--claro:255 243 220;--oscuro:59 31 10;--sombra:120 80 20}"
    );
  });
});
