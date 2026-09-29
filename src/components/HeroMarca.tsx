import Link from "next/link";
import FotoProducto from "@/components/FotoProducto";
import { cliente } from "@/plataforma/cliente";
import type { Identidad } from "@/plataforma/cliente/identidad";

/**
 * Hero de la home de catálogo (config inicio: "catalogo"): la marca, sin el precio de un producto.
 * `textos`: los de la identidad (la home los pasa); sin ellos, los de la config.
 */
export default function HeroMarca({ textos = cliente.textos }: { textos?: Identidad["textos"] }) {
  return (
    <section
      aria-labelledby="titulo-hero"
      className="contenedor-publico grid content-center gap-5 pb-[clamp(36px,6vh,72px)] pt-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10 lg:py-[clamp(24px,6vh,72px)]"
    >
      {/* Mobile: la foto arriba del título. Escritorio: a la derecha. */}
      <FotoProducto
        lcp
        sizes="(min-width: 1024px) 400px, 220px"
        className="lg:order-2"
        imgClassName="h-[28svh] w-auto lg:h-[min(52svh,460px)]"
      />
      <div className="velo-texto max-w-[37rem] lg:order-1">
        <h1 id="titulo-hero" className="titulo-hero mb-[1.15rem]">
          {textos.hero.titulo}
        </h1>
        <p className="texto-suave mb-7 max-w-[31rem] text-[clamp(1rem,1.25vw,1.13rem)] leading-[1.65]">
          {textos.hero.bajada}
        </p>
        <div className="flex flex-wrap items-center gap-x-[1.4rem] gap-y-3">
          <span className="wrap-focus">
            <Link href="/#productos" className="btn" data-fondo-evita>
              Ver productos
            </Link>
          </span>
          <Link href="/#nosotros" className="btn-ghost">
            {textos.hero.botonNosotros}
          </Link>
        </div>
      </div>
    </section>
  );
}
