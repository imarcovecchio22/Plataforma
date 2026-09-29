import tema from "@cliente/tema";
import Link from "next/link";
import { cliente } from "@/plataforma/cliente";

export default function Footer() {
  return (
    <footer className="relative z-[1] bg-[var(--fondo-seccion)] text-[var(--texto-pie)]">
      <div className="contenedor-publico flex flex-col items-center gap-5 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          {tema.Logo && <tema.Logo tamano={40} />}
          <div>
            <p className="font-serif text-lg font-semibold text-[var(--texto)]">{cliente.nombre}</p>
            <p className="text-sm">{cliente.textos.pie}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/consultas" className="btn-ghost">
            Consultas
          </Link>
          <a
            href={`https://www.instagram.com/${cliente.instagram}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost gap-2"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            Instagram
          </a>
        </div>
      </div>
      <div className="border-t border-[var(--linea-suave)] py-3 text-center text-xs">
        © {new Date().getFullYear()} {cliente.nombre}. Todos los derechos reservados. ·{" "}
        <Link href="/privacidad" className="underline underline-offset-2 hover:text-[var(--texto-suave)]">
          Privacidad
        </Link>
      </div>
    </footer>
  );
}
