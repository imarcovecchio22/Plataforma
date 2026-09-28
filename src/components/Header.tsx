import Link from "next/link";
import tema from "@cliente/tema";
import { cliente } from "@/plataforma/cliente";

export default function Header() {
  return (
    <header className="contenedor-publico relative z-10 flex items-center justify-between gap-4 py-4 sm:py-6">
      <Link
        href="/"
        aria-label={`${cliente.nombre}, inicio`}
        className="flex shrink-0 items-center gap-2.5 rounded-md font-serif text-[1.4rem] font-semibold tracking-[-0.01em] text-[var(--texto)]"
      >
        {tema.Logo && <tema.Logo tamano={44} />}
        <span>{cliente.nombre}</span>
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-[clamp(0.8rem,2vw,1.6rem)]">
        <Link href="/#producto" className="link-nav hidden sm:inline">
          Producto
        </Link>
        <Link href="/#nosotros" className="link-nav hidden sm:inline">
          Quiénes somos
        </Link>
        <Link href="/consultas" className="link-nav hidden sm:inline">
          Consultas
        </Link>
        <span className="wrap-focus">
          <Link href="/producto" className="btn btn-sm" data-fondo-evita>
            Comprar
          </Link>
        </span>
      </nav>
    </header>
  );
}
