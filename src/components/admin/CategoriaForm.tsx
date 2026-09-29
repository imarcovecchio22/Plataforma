"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { slugDe } from "@/lib/slug";

export type CategoriaValores = { nombre: string; slug: string; orden: number };

/** Formulario para crear (o editar, si recibe categoriaId) una categoría del catálogo. */
export default function CategoriaForm({
  categoriaId,
  inicial,
  ordenSugerido = 10,
  onListo,
}: {
  categoriaId?: number;
  inicial?: CategoriaValores;
  ordenSugerido?: number;
  onListo?: () => void;
}) {
  const vacio: CategoriaValores = { nombre: "", slug: "", orden: ordenSugerido };
  const [valores, setValores] = useState<CategoriaValores>(inicial ?? vacio);
  // Al crear, el slug sigue al nombre hasta que se lo edite a mano
  const [slugAMano, setSlugAMano] = useState(Boolean(inicial));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();
  const idBase = categoriaId ? `categoria-${categoriaId}` : "nueva-categoria";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(categoriaId ? `/api/admin/categorias/${categoriaId}` : "/api/admin/categorias", {
        method: categoriaId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valores),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Error del servidor (${res.status})`);
        return;
      }
      setOk(categoriaId ? "Cambios guardados." : `Categoría "${valores.nombre}" creada.`);
      if (!categoriaId) {
        setValores({ ...vacio, orden: valores.orden + 10 });
        setSlugAMano(false);
      }
      router.refresh();
      onListo?.();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
        <div>
          <label className="label-field" htmlFor={`${idBase}-nombre`}>Nombre</label>
          <input
            id={`${idBase}-nombre`}
            className="input-field"
            value={valores.nombre}
            onChange={(e) => {
              const nombre = e.target.value;
              setValores((v) => ({ ...v, nombre, ...(slugAMano ? {} : { slug: nombre.trim() ? slugDe(nombre) : "" }) }));
            }}
            placeholder="Ej: Macetas"
            maxLength={50}
            required
          />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-slug`}>Slug (filtro: /productos?categoria=…)</label>
          <input
            id={`${idBase}-slug`}
            className="input-field"
            value={valores.slug}
            onChange={(e) => {
              setSlugAMano(true);
              setValores((v) => ({ ...v, slug: e.target.value }));
            }}
            maxLength={60}
            required
          />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-orden`}>Orden</label>
          <input
            id={`${idBase}-orden`}
            type="number"
            className="input-field"
            value={valores.orden}
            onChange={(e) => setValores((v) => ({ ...v, orden: Number(e.target.value) }))}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">{ok}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Guardando…" : categoriaId ? "Guardar cambios" : "Agregar categoría"}
      </button>
    </form>
  );
}
