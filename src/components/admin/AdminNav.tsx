"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cliente } from "@/plataforma/cliente";
import { moduloActivo, type Modulo } from "@/plataforma/cliente/modulos";
import { funcionActiva, type FuncionCatalogo } from "@/plataforma/cliente/catalogo";

const todos: { href: string; label: string; modulo?: Modulo; funcion?: FuncionCatalogo }[] = [
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías", funcion: "categorias" },
  { href: "/admin/envios", label: "Envíos" },
  { href: "/admin/consultas", label: "Consultas" },
  { href: "/admin/preguntas", label: "Preguntas frecuentes" },
  { href: "/admin/instagram", label: "Instagram", modulo: "instagram" },
  { href: "/admin/autorespuestas", label: "Autorespuestas", modulo: "autorespuestas" },
  { href: "/admin/logs", label: "Logs" },
];

// Sin los de módulos y funciones del catálogo que el cliente no tiene prendidos
const links = todos.filter((l) => (!l.modulo || moduloActivo(l.modulo)) && (!l.funcion || funcionActiva(l.funcion)));

/** `logo`: el de la identidad (lo pasa el layout del admin); sin él, el de la config. */
export default function AdminNav({ logo = cliente.imagenes.logo }: { logo?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-marca-100 bg-white">
      <div className="contenedor flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link href="/admin/pedidos" className="flex items-center gap-2 font-serif text-xl font-semibold text-marca-700">
          <Image src={logo} alt="" width={32} height={32} unoptimized={logo.startsWith("http")} />
          {cliente.nombre} · Admin
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-stone-600">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname.startsWith(link.href)
                  ? "text-marca-700"
                  : "hover:text-marca-600"
              }
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="rounded-full border border-stone-300 px-4 py-1.5 text-stone-600 transition hover:bg-stone-50"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
