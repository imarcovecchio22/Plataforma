import fs from "fs";
import path from "path";
import type { ConfigCliente } from "@/plataforma/cliente/esquema";

/**
 * Assets del cliente. Viven en clientes/<slug>/ y se copian antes de dev y build (así cada
 * despliegue sirve solo los de su cliente):
 * - clientes/<slug>/public/  → public/        (lo que se sirve tal cual: logos, fotos, OG)
 * - clientes/<slug>/app/<ícono> → src/app/<ícono> (favicons por convención de Next)
 * - clientes/<slug>/tema.css  → src/app/tema-cliente.css (lo importa globals.css)
 * public/, esos íconos y tema-cliente.css son generados: están en .gitignore.
 */

export const ICONOS_APP = ["favicon.ico", "icon.png", "icon.svg", "apple-icon.png"];

/** Rutas de imágenes de la config que no existen en clientes/<slug>/public/. */
export function imagenesFaltantes(raiz: string, slug: string, config: ConfigCliente) {
  const rutas = [config.imagenes.logo, config.imagenes.compartir, config.imagenes.producto.src];
  return rutas.filter((ruta) => !fs.existsSync(path.join(raiz, "clientes", slug, "public", ruta)));
}

/** Deja public/ y los íconos de src/app/ con los del cliente (borra los de otro cliente). */
export function copiarAssets(raiz: string, slug: string) {
  const publicDestino = path.join(raiz, "public");
  fs.rmSync(publicDestino, { recursive: true, force: true });
  const publicOrigen = path.join(raiz, "clientes", slug, "public");
  if (fs.existsSync(publicOrigen)) fs.cpSync(publicOrigen, publicDestino, { recursive: true });
  else fs.mkdirSync(publicDestino);

  const copiados: string[] = [];
  for (const icono of ICONOS_APP) {
    const destino = path.join(raiz, "src", "app", icono);
    fs.rmSync(destino, { force: true });
    const origen = path.join(raiz, "clientes", slug, "app", icono);
    if (fs.existsSync(origen)) {
      fs.copyFileSync(origen, destino);
      copiados.push(icono);
    }
  }
  return { iconos: copiados };
}

/**
 * Copia el tema del cliente (variables y clases de las páginas públicas) a src/app/tema-cliente.css.
 * Devuelve false si el cliente no tiene tema.
 */
export function copiarTema(raiz: string, slug: string) {
  const origen = path.join(raiz, "clientes", slug, "tema.css");
  const destino = path.join(raiz, "src", "app", "tema-cliente.css");
  fs.rmSync(destino, { force: true });
  if (!fs.existsSync(origen)) return false;
  fs.copyFileSync(origen, destino);
  return true;
}
