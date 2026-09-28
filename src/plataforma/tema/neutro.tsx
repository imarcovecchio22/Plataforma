import Image from "next/image";
import { cliente } from "@/plataforma/cliente";
import type { TemaPublico } from "@/plataforma/tema/tipos";

/** El logo de la config (imagenes.logo), cuadrado, al lado del nombre. */
function LogoConfig({ tamano }: { tamano: number }) {
  return <Image src={cliente.imagenes.logo} alt="" width={tamano} height={tamano} className="rounded-md" />;
}

/**
 * Tema neutro de la plataforma, para un cliente sin clientes/<slug>/tema/index.tsx: sin entrada
 * ni fondo animado, con el logo de la config y las fuentes del sistema. Su CSS es neutro.css.
 */
const temaNeutro: TemaPublico = {
  Logo: LogoConfig,
};

export default temaNeutro;
