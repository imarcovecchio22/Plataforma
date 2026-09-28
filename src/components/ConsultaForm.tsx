"use client";

import { useEffect, useRef, useState } from "react";
import { cliente } from "@/plataforma/cliente";

type Canal = "instagram" | "email";

const CANALES: { value: Canal; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "Email" },
];

export default function ConsultaForm({ origen }: { origen?: string }) {
  const [canal, setCanal] = useState<Canal>("instagram");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviadoPor, setEnviadoPor] = useState<{ canal: Canal; contacto: string } | null>(null);
  // Cuándo se abrió el formulario (anti-spam: un bot lo completa al instante).
  // Se toma al montar y no durante el render, que tiene que ser puro.
  const abiertoEn = useRef(0);
  useEffect(() => {
    abiertoEn.current = Date.now();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      ...Object.fromEntries(formData.entries()),
      canal,
      origen: origen ?? "",
      tiempo: Date.now() - abiertoEn.current,
    };

    try {
      const res = await fetch("/api/consultas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Ocurrió un error, intentá de nuevo.");
        setLoading(false);
        return;
      }

      const contacto = String(formData.get(canal) ?? "").trim();
      setEnviadoPor({
        canal,
        contacto: canal === "instagram" ? `@${contacto.replace(/^@+/, "")}` : contacto,
      });
    } catch {
      setError("No pudimos conectar con el servidor. Intentá de nuevo.");
      setLoading(false);
    }
  }

  if (enviadoPor) {
    return (
      <div className="tarjeta p-6 text-center sm:p-8">
        <p className="text-4xl" aria-hidden>
          {cliente.textos.emoji}
        </p>
        <h2 className="mt-3 font-serif text-2xl font-semibold text-[var(--texto)]">¡Gracias por escribirnos!</h2>
        <p className="mt-2 texto-suave">
          Recibimos tu consulta y te vamos a responder{" "}
          {enviadoPor.canal === "instagram" ? "por mensaje directo de Instagram a " : "por email a "}
          <span className="font-semibold text-[var(--texto)]">{enviadoPor.contacto}</span>.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 tarjeta p-5 sm:p-8"
      noValidate
    >
      <div>
        <label className="etiqueta" htmlFor="nombre">
          Nombre
        </label>
        <input
          className="campo"
          id="nombre"
          name="nombre"
          autoComplete="given-name"
          minLength={2}
          maxLength={80}
          required
        />
      </div>

      <fieldset>
        <legend className="etiqueta">¿Dónde te respondemos?</legend>
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          {CANALES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={canal === c.value}
              onClick={() => setCanal(c.value)}
              className={`min-h-[48px] rounded-lg border-2 px-4 py-2.5 font-semibold transition ${
                canal === c.value
                  ? "border-[var(--acento)] bg-[rgb(var(--acento-rgb)/0.14)] text-[var(--destacado)]"
                  : "border-[rgb(var(--acento-rgb)/0.3)] bg-transparent texto-suave"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      {canal === "instagram" ? (
        <div key="instagram">
          <label className="etiqueta" htmlFor="instagram">
            Tu usuario de Instagram
          </label>
          <input
            className="campo"
            id="instagram"
            name="instagram"
            placeholder="@tuusuario"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </div>
      ) : (
        <div key="email">
          <label className="etiqueta" htmlFor="email">
            Tu email
          </label>
          <input
            className="campo"
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tu@email.com"
            required
          />
        </div>
      )}

      <div>
        <label className="etiqueta" htmlFor="mensaje">
          Tu consulta
        </label>
        <textarea
          className="campo min-h-[140px] resize-y"
          id="mensaje"
          name="mensaje"
          minLength={5}
          maxLength={1500}
          required
        />
      </div>

      {/* Honeypot: invisible para las personas, los bots lo completan */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="empresa">Empresa</label>
        <input id="empresa" name="empresa" tabIndex={-1} autoComplete="off" />
      </div>

      {error && <p className="rounded-lg border border-red-400/40 bg-red-950/60 px-3 py-2 text-sm text-red-200">{error}</p>}

      <button type="submit" className="btn w-full" disabled={loading}>
        {loading ? "Enviando..." : "Enviar consulta"}
      </button>
    </form>
  );
}
