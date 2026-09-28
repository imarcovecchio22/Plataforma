import Link from "next/link";
import FotoProducto from "@/components/FotoProducto";
import { formatPrecio } from "@/lib/utils";
import { leerEscalones, textoPromos } from "@/lib/precios";
import type { Product } from "@prisma/client";

export default function ProductoSection({ product }: { product: Product }) {
  const sinStock = product.stock <= 0;

  return (
    <section id="producto" className="contenedor-publico scroll-mt-4 bg-[var(--fondo-seccion)] py-[clamp(56px,8vw,96px)]">
      <div className="grid max-w-[1100px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <FotoProducto sizes="(min-width: 1024px) 288px, 224px" imgClassName="h-auto w-56 sm:w-72" />
        <div>
          <span className="etiqueta-seccion">Nuestro producto</span>
          <h2 className="titulo mt-2">{product.nombre}</h2>
          <p className="texto-suave mt-4 leading-[1.65]">{product.descripcion}</p>
          <p className="precio mt-6 text-4xl">{formatPrecio(product.precio)}</p>
          {leerEscalones(product.escalones).length > 0 && (
            <p className="mt-2 text-sm font-semibold text-[var(--destacado)]">
              Promo: {textoPromos(leerEscalones(product.escalones))}
            </p>
          )}
          {sinStock ? (
            <p className="mt-6 inline-block rounded-full border border-red-400/40 bg-red-950/60 px-4 py-2 text-sm font-semibold text-red-200">
              Sin stock por el momento
            </p>
          ) : (
            <span className="wrap-focus mt-6">
              <Link href="/producto" className="btn" data-fondo-evita>
                Comprar ahora
              </Link>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
