import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      // Los tests corren con Melera, salvo que se pida otro cliente con CLIENTE.
      { find: /^@cliente\/(.*)$/, replacement: path.resolve(__dirname, "clientes", process.env.CLIENTE || "melera", "$1") },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
