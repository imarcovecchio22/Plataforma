import { defineConfig } from "vitest/config";
import path from "path";
import { aliasCliente } from "./scripts/alias-cliente";

// Los tests corren con Melera, salvo que se pida otro cliente con CLIENTE.
const alias = aliasCliente(__dirname, process.env.CLIENTE || "melera");

export default defineConfig({
  resolve: {
    alias: [
      ...Object.entries(alias).map(([find, ruta]) => ({ find, replacement: path.resolve(__dirname, ruta) })),
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
