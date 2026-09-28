"use client";

import Link from "next/link";
import { useCarrito } from "@/components/useCarrito";
import { unidadesEnCarrito } from "@/lib/carrito";

/** Ícono del carrito en el Header: solo aparece si el carrito tiene algo. */
export default function CarritoIcono() {
  const unidades = unidadesEnCarrito(useCarrito());
  if (unidades === 0) return null;
  return (
    <Link href="/carrito" className="link-nav relative inline-flex items-center" aria-label={`Carrito: ${unidades}`}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 7h12l-1.2 12.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      <span className="absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--acento)] px-1 text-xs font-semibold text-[var(--fondo-control)]">
        {unidades}
      </span>
    </Link>
  );
}
