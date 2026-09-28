// Alias "@cliente/..." del cliente de este despliegue. Lo usan next.config.js (Turbopack) y
// vitest.config.ts, así los dos resuelven igual. Si el cliente no trae tema propio, usa el
// tema neutro de la plataforma.
// (CommonJS porque lo carga next.config.js)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

/** Rutas relativas a la raíz del repo. */
function aliasCliente(raiz, slug) {
  const temaPropio = fs.existsSync(path.join(raiz, "clientes", slug, "tema", "index.tsx"));
  return {
    "@cliente/config": `./clientes/${slug}/config.ts`,
    "@cliente/tema": temaPropio ? `./clientes/${slug}/tema/index.tsx` : "./src/plataforma/tema/neutro.tsx",
  };
}

module.exports = { aliasCliente };
