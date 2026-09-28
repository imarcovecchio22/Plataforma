import LogoCelda from "@/components/LogoCelda";
import Link from "next/link";
import { cliente } from "@/plataforma/cliente";

export default function Footer() {
  return (
    <footer className="relative z-[1] bg-[rgba(18,7,2,0.93)] text-[#A99270]">
      <div className="contenedor-panal flex flex-col items-center gap-5 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <LogoCelda tamano={40} />
          <div>
            <p className="font-serif text-lg font-semibold text-[var(--ink)]">{cliente.nombre}</p>
            <p className="text-sm">Miel artesanal de Tomás Jofré, Buenos Aires.</p>
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
      <div className="border-t border-white/10 py-3 text-center text-xs">
        © {new Date().getFullYear()} {cliente.nombre}. Todos los derechos reservados. ·{" "}
        <Link href="/privacidad" className="underline underline-offset-2 hover:text-[var(--ink-soft)]">
          Privacidad
        </Link>
      </div>
    </footer>
  );
}
