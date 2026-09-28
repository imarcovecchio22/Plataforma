import type { Product } from "@prisma/client";
import ChatWidget from "@/components/ChatWidget";
import FotoProducto from "@/components/FotoProducto";
import QuantitySelector from "@/components/QuantitySelector";
import { formatPrecio } from "@/lib/utils";
import { leerEscalones, textoPromos } from "@/lib/precios";
import { cliente, unidadDe } from "@/plataforma/cliente";

/** La ficha de un producto: /producto/<slug> (y /producto cuando hay uno solo). */
export default function FichaProducto({ product, origen }: { product: Product; origen?: string }) {
  const escalones = leerEscalones(product.escalones);
  const unidad = unidadDe(product);

  return (
    <>
      <main className="contenedor-publico flex-1 pb-16 pt-2 sm:pb-24">
        <div className="mx-auto grid max-w-[1100px] items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          {/* La foto es la protagonista (y el LCP de la página) */}
          <FotoProducto
            producto={product}
            lcp
            sizes="(min-width: 1024px) 480px, 260px"
            imgClassName="h-[42svh] w-auto lg:h-[min(72svh,640px)]"
          />
          <div className="velo-texto">
            <h1 className="titulo">{product.nombre}</h1>
            <p className="texto-suave mt-4 leading-[1.65]">{product.descripcion}</p>
            <p className="mt-6 flex items-baseline gap-2.5">
              <span className="precio text-[2.5rem]">{formatPrecio(product.precio)}</span>
              <span className="texto-suave">{product.aclaracionPrecio || cliente.textos.aclaracionPrecio}</span>
            </p>
            {escalones.length > 0 && (
              <p className="mt-2 text-sm font-semibold text-[var(--destacado)]">Promo: {textoPromos(escalones, unidad)}</p>
            )}
            <div className="mt-8">
              <QuantitySelector
                slug={product.slug}
                stock={product.stock}
                origen={origen}
                precio={product.precio}
                escalones={escalones}
                unidad={unidad}
              />
            </div>
          </div>
        </div>
      </main>
      <ChatWidget />
    </>
  );
}
