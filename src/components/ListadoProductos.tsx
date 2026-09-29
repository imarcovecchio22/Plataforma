import Link from "next/link";
import type { Product } from "@prisma/client";
import FotoProducto from "@/components/FotoProducto";
import { formatPrecio } from "@/lib/utils";
import { leerEscalones, textoPromos } from "@/lib/precios";
import { unidadDe } from "@/plataforma/cliente";
import { demoraDe, stockParaVender } from "@/plataforma/cliente/catalogo";

/** Tarjetas de productos con link a su ficha (/productos y la home cuando hay más de uno). */
export default function ListadoProductos({ productos, origen }: { productos: Product[]; origen?: string }) {
  const sufijo = origen ? `?origen=${encodeURIComponent(origen)}` : "";
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {productos.map((p) => {
        const promos = textoPromos(leerEscalones(p.escalones), unidadDe(p));
        return (
          <li key={p.id}>
            <Link href={`/producto/${p.slug}${sufijo}`} className="tarjeta flex h-full flex-col gap-4 p-5">
              <FotoProducto producto={p} sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw" imgClassName="h-48 w-auto" />
              <div className="mt-auto">
                <h3 className="font-serif text-xl font-semibold text-[var(--texto)]">{p.nombre}</h3>
                <p className="precio mt-1 text-2xl">{formatPrecio(p.precio)}</p>
                {promos && <p className="mt-1 text-sm font-semibold text-[var(--destacado)]">Promo: {promos}</p>}
                {demoraDe(p) && <p className="mt-1 text-sm texto-suave">{demoraDe(p)}</p>}
                {stockParaVender(p) <= 0 && <p className="mt-1 text-sm texto-suave">Sin stock por el momento</p>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
