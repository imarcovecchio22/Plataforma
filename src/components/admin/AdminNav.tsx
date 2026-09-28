"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cliente } from "@/plataforma/cliente";

const links = [
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/stock", label: "Precio y stock" },
  { href: "/admin/consultas", label: "Consultas" },
  { href: "/admin/preguntas", label: "Preguntas frecuentes" },
  { href: "/admin/instagram", label: "Instagram" },
  { href: "/admin/autorespuestas", label: "Autorespuestas" },
  { href: "/admin/logs", label: "Logs" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-miel-100 bg-white">
      <div className="container-melera flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link href="/admin/pedidos" className="flex items-center gap-2 font-serif text-xl font-semibold text-miel-700">
          <Image src="/brand/melera-logo.png" alt="" width={32} height={32} />
          {cliente.nombre} · Admin
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-stone-600">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname.startsWith(link.href)
                  ? "text-miel-700"
                  : "hover:text-miel-600"
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
