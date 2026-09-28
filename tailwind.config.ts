import type { Config } from "tailwindcss";

const TONOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const color = (variable: string) => `rgb(var(--${variable}) / <alpha-value>)`;

const config: Config = {
  // El código genérico y el del cliente de este despliegue (su tema tiene componentes propios)
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", `./clientes/${process.env.CLIENTE?.trim() || "*"}/**/*.{ts,tsx}`],
  theme: {
    extend: {
      // Colores del cliente (config.colores): variables CSS que define el layout raíz
      colors: {
        marca: Object.fromEntries(TONOS.map((t) => [t, color(`marca-${t}`)])),
        claro: color("claro"),
        oscuro: color("oscuro"),
      },
      fontFamily: {
        // Las definen las fuentes del tema (o globals.css, con las del sistema)
        sans: ["var(--fuente-texto)", "system-ui", "sans-serif"],
        serif: ["var(--fuente-titulos)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgb(var(--sombra) / 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
