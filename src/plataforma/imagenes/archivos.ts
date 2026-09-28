import fs from "fs";
import path from "path";

/** Tipos de post de Instagram: cada estilo tiene una plantilla por tipo. */
export const TIPOS = ["presentacion", "producto", "dato", "promo"] as const;

/**
 * Plantillas que faltan en la carpeta para los estilos declarados (lo revisa preparar-cliente).
 * Sin dependencias de la config: lo usa también el script que corre antes del build.
 */
export function plantillasFaltantes(carpeta: string, estilos: string[]) {
  return estilos.flatMap((estilo) =>
    TIPOS.map((tipo) => `${estilo}-${tipo}.html`).filter((archivo) => !fs.existsSync(path.join(carpeta, archivo)))
  );
}
