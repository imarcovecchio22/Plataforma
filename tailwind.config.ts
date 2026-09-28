import type { Config } from "tailwindcss";

const TONOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const color = (variable: string) => `rgb(var(--${variable}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Colores del cliente (config.colores): variables CSS que define el layout raíz
      colors: {
        marca: Object.fromEntries(TONOS.map((t) => [t, color(`marca-${t}`)])),
        claro: color("claro"),
        oscuro: color("oscuro"),
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgb(var(--sombra) / 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
