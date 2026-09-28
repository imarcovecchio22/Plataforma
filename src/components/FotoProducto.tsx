import Image from "next/image";
import { cliente } from "@/plataforma/cliente";

/**
 * Foto del producto (la de la config del cliente, sin fondo) con el resplandor y la sombra del tema.
 * `lcp` solo donde es el elemento del LCP (hero de la home y /producto): se pide enseguida y con
 * prioridad alta (en Next 16 `priority` quedó obsoleto y no subía la prioridad de la descarga).
 */
export default function FotoProducto({
  producto,
  lcp = false,
  sizes,
  className = "",
  imgClassName = "",
}: {
  /** Si el producto tiene foto (link https), va esa; si no, la de la marca (config). */
  producto?: { nombre: string; imagenUrl: string | null };
  lcp?: boolean;
  sizes: string;
  className?: string;
  imgClassName?: string;
}) {
  const foto = cliente.imagenes.producto;
  const propia = producto?.imagenUrl;
  return (
    <div className={`foto-producto ${className}`}>
      <Image
        src={propia || foto.src}
        alt={propia ? producto.nombre : foto.alt}
        // Las fotos cargadas desde el admin son links externos: van tal cual (sin el optimizador)
        unoptimized={Boolean(propia)}
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
