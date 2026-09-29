import Image from "next/image";
import { cliente } from "@/plataforma/cliente";
import type { TemaPublico } from "@/plataforma/tema/tipos";

/** El logo de la identidad (el de la config o el que cambió el dueño), cuadrado, al lado del nombre. */
function LogoConfig({ tamano, src = cliente.imagenes.logo }: { tamano: number; src?: string }) {
  // Un link externo va tal cual (sin el optimizador de imágenes)
  return <Image src={src} alt="" width={tamano} height={tamano} className="rounded-md" unoptimized={src.startsWith("http")} />;
}

/**
 * Tema neutro de la plataforma, para un cliente sin clientes/<slug>/tema/index.tsx: sin entrada
 * ni fondo animado, con el logo de la config y las fuentes del sistema. Su CSS es neutro.css.
 */
const temaNeutro: TemaPublico = {
  Logo: LogoConfig,
};

export default temaNeutro;
