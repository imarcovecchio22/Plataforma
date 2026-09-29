"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { cliente } from "@/plataforma/cliente";

function LoginForm({ logo }: { logo: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin/pedidos";

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? `Error del servidor (${res.status}). Intentá de nuevo.`);
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-marca-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-soft"
      >
        <div className="flex items-center gap-2">
          <Image src={logo} alt="" width={40} height={40} unoptimized={logo.startsWith("http")} />
          <h1 className="font-serif text-2xl font-semibold text-oscuro">
            Panel {cliente.nombre}
          </h1>
        </div>
        <p className="mt-1 text-sm text-stone-500">Ingresá para gestionar la tienda.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label-field" htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              className="input-field"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label-field" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

/** El formulario de /admin/login; `logo`: el de la identidad (lo pasa la página). */
export default function LoginFormulario({ logo = cliente.imagenes.logo }: { logo?: string }) {
  return (
    <Suspense>
      <LoginForm logo={logo} />
    </Suspense>
  );
}
