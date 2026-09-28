import Image from "next/image";
import { cliente } from "@/plataforma/cliente";

/**
 * Foto del producto (la de la config del cliente, sin fondo) con el resplandor y la sombra del tema.
 * `lcp` solo donde es el elemento del LCP (hero de la home y /producto): se pide enseguida y con
 * prioridad alta (en Next 16 `priority` quedó obsoleto y no subía la prioridad de la descarga).
 */
export default function FotoProducto({
  lcp = false,
  sizes,
  className = "",
  imgClassName = "",
}: {
  lcp?: boolean;
  sizes: string;
  className?: string;
  imgClassName?: string;
}) {
  const foto = cliente.imagenes.producto;
  return (
    <div className={`foto-frasco ${className}`}>
      <Image
        src={foto.src}
        alt={foto.alt}
        width={foto.ancho}
        height={foto.alto}
        loading={lcp ? "eager" : "lazy"}
        fetchPriority={lcp ? "high" : "auto"}
        sizes={sizes}
        className={imgClassName}
      />
    </div>
  );
}
