"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrecio } from "@/lib/utils";
import type { Escalon } from "@/lib/precios";
import { slugDe } from "@/lib/slug";
import { cantidadConUnidad, masBaratoDe, unidadDe } from "@/plataforma/cliente";

export type ProductoValores = {
  nombre: string;
  slug: string;
  descripcion: string;
  precio: number;
  stock: number;
  escalones: Escalon[];
  imagenUrl: string;
  activo: boolean;
  orden: number;
  unidadSingular: string;
  unidadPlural: string;
  unidadGenero: "masculino" | "femenino";
  aclaracionPrecio: string;
  /** Id de la categoría ("" = sin categoría); solo si el cliente usa categorías */
  categoriaId: string;
  /** Opciones que elige el comprador (valores separados por comas); solo si el cliente las usa */
  opciones: { nombre: string; valores: string }[];
};

/** Formulario para crear (o editar, si recibe productoId) un producto. */
export default function ProductoForm({
  productoId,
  inicial,
  ordenSugerido = 10,
  categorias,
  conOpciones = false,
  onListo,
}: {
  productoId?: string;
  inicial?: ProductoValores;
  ordenSugerido?: number;
  /** Las categorías para elegir (sin esto, el cliente no usa categorías y el campo no aparece) */
  categorias?: { id: number; nombre: string }[];
  /** El cliente usa opciones de producto (config.catalogo.opciones) */
  conOpciones?: boolean;
  onListo?: () => void;
}) {
  const vacio: ProductoValores = {
    nombre: "",
    slug: "",
    descripcion: "",
    precio: 1000,
    stock: 0,
    escalones: [],
    imagenUrl: "",
    activo: true,
    orden: ordenSugerido,
    unidadSingular: "",
    unidadPlural: "",
    unidadGenero: "masculino",
    aclaracionPrecio: "",
    categoriaId: "",
    opciones: [],
  };
  const [valores, setValores] = useState<ProductoValores>(inicial ?? vacio);
  // Al crear, el slug sigue al nombre hasta que se lo edite a mano
  const [slugAMano, setSlugAMano] = useState(Boolean(inicial));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();
  const idBase = productoId ? `producto-${productoId}` : "nuevo-producto";

  function set<K extends keyof ProductoValores>(campo: K, valor: ProductoValores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  function setNombre(nombre: string) {
    setValores((v) => ({ ...v, nombre, ...(slugAMano ? {} : { slug: nombre.trim() ? slugDe(nombre) : "" }) }));
  }

  // La unidad con la que se muestran las promos (la propia, o la del cliente si está vacía)
  const unidad = unidadDe(valores);

  function setEscalon(i: number, campo: keyof Escalon, valor: number) {
    set("escalones", valores.escalones.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(productoId ? `/api/admin/productos/${productoId}` : "/api/admin/productos", {
        method: productoId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...valores,
          // "Rojo, Negro , Blanco" → ["Rojo", "Negro", "Blanco"]
          opciones: valores.opciones.map((o) => ({ nombre: o.nombre, valores: o.valores.split(",").map((v) => v.trim()).filter(Boolean) })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Error del servidor (${res.status})`);
        return;
      }
      setOk(productoId ? "Cambios guardados." : "Producto creado.");
      if (!productoId) {
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor={`${idBase}-nombre`}>Nombre</label>
          <input id={`${idBase}-nombre`} className="input-field" value={valores.nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} required />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-slug`}>Slug (URL: /producto/…)</label>
          <input
            id={`${idBase}-slug`}
            className="input-field"
            value={valores.slug}
            onChange={(e) => {
              setSlugAMano(true);
              set("slug", e.target.value);
            }}
            maxLength={80}
            required
          />
        </div>
      </div>
      {categorias && (
        <div>
          <label className="label-field" htmlFor={`${idBase}-categoria`}>Categoría</label>
          <select id={`${idBase}-categoria`} className="input-field" value={valores.categoriaId} onChange={(e) => set("categoriaId", e.target.value)}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nombre}
              </option>
            ))}
          </select>
          {categorias.length === 0 && <p className="mt-1 text-xs text-stone-500">Todavía no hay categorías: se crean en Categorías.</p>}
        </div>
      )}
      <div>
        <label className="label-field" htmlFor={`${idBase}-descripcion`}>Descripción</label>
        <textarea id={`${idBase}-descripcion`} className="input-field min-h-24" value={valores.descripcion} onChange={(e) => set("descripcion", e.target.value)} maxLength={2000} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label-field" htmlFor={`${idBase}-precio`}>Precio (pesos)</label>
          <input id={`${idBase}-precio`} type="number" min={1} step={1} className="input-field" value={valores.precio} onChange={(e) => set("precio", Number(e.target.value))} />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-stock`}>Stock (unidades)</label>
          <input id={`${idBase}-stock`} type="number" min={0} step={1} className="input-field" value={valores.stock} onChange={(e) => set("stock", Number(e.target.value))} />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-orden`}>Orden</label>
          <input id={`${idBase}-orden`} type="number" step={1} className="input-field" value={valores.orden} onChange={(e) => set("orden", Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label-field" htmlFor={`${idBase}-imagen`}>Foto (link https; vacío = la foto de la marca)</label>
        <input id={`${idBase}-imagen`} className="input-field" value={valores.imagenUrl} onChange={(e) => set("imagenUrl", e.target.value)} placeholder="https://…" maxLength={500} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label-field" htmlFor={`${idBase}-singular`}>Unidad (singular)</label>
          <input id={`${idBase}-singular`} className="input-field" value={valores.unidadSingular} onChange={(e) => set("unidadSingular", e.target.value)} placeholder="ej. pieza" maxLength={30} />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-plural`}>Unidad (plural)</label>
          <input id={`${idBase}-plural`} className="input-field" value={valores.unidadPlural} onChange={(e) => set("unidadPlural", e.target.value)} placeholder="ej. piezas" maxLength={30} />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-genero`}>Género</label>
          <select id={`${idBase}-genero`} className="input-field" value={valores.unidadGenero} onChange={(e) => set("unidadGenero", e.target.value as ProductoValores["unidadGenero"])}>
            <option value="masculino">cada uno</option>
            <option value="femenino">cada una</option>
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-aclaracion`}>Junto al precio</label>
          <input id={`${idBase}-aclaracion`} className="input-field" value={valores.aclaracionPrecio} onChange={(e) => set("aclaracionPrecio", e.target.value)} placeholder="ej. la pieza de 12 cm" maxLength={80} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-stone-500">Vacíos: la unidad y el texto de la marca.</p>

      <div className="border-t border-marca-100 pt-4">
        <p className="label-field">Promos por cantidad</p>
        <p className="mb-3 text-xs text-stone-500">
          Desde cierta cantidad, cada {unidad.singular} sale {masBaratoDe(unidad)}. Se aplican solas en la web, el chat y las respuestas de Instagram ($PROMOS).
        </p>
        <div className="space-y-3">
          {valores.escalones.map((e, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <div className="w-32">
                <label className="label-field" htmlFor={`${idBase}-desde-${i}`}>Desde ({unidad.plural})</label>
                <input id={`${idBase}-desde-${i}`} type="number" min={2} step={1} className="input-field" value={e.desde} onChange={(ev) => setEscalon(i, "desde", Number(ev.target.value))} />
              </div>
              <div className="w-40">
                <label className="label-field" htmlFor={`${idBase}-precio-${i}`}>Precio por {unidad.singular}</label>
                <input id={`${idBase}-precio-${i}`} type="number" min={1} step={1} className="input-field" value={e.precio} onChange={(ev) => setEscalon(i, "precio", Number(ev.target.value))} />
              </div>
              <p className="pb-2.5 text-sm text-stone-600">
                {cantidadConUnidad(e.desde, unidad)} = <strong>{formatPrecio(e.desde * e.precio)}</strong>
                {e.precio < valores.precio && <> (ahorran {formatPrecio((valores.precio - e.precio) * e.desde)})</>}
              </p>
              <button type="button" onClick={() => set("escalones", valores.escalones.filter((_, j) => j !== i))} className="mb-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50">
                Quitar
              </button>
            </div>
          ))}
          {valores.escalones.length < 3 && (
            <button
              type="button"
              onClick={() => {
                const ultimo = valores.escalones.at(-1);
                set("escalones", [...valores.escalones, { desde: (ultimo?.desde ?? 1) + 5, precio: Math.max(1, (ultimo?.precio ?? valores.precio) - 500) }]);
              }}
              className="rounded-full border border-marca-500 px-3 py-1.5 text-sm font-semibold text-marca-700 hover:bg-marca-50"
            >
              + Agregar promo
            </button>
          )}
        </div>
      </div>

      {conOpciones && (
        <div className="border-t border-marca-100 pt-4">
          <p className="label-field">Opciones para elegir</p>
          <p className="mb-3 text-xs text-stone-500">
            Lo que el comprador elige antes de agregar al carrito (ej. Color: Rojo, Negro, Blanco). No cambian el precio ni
            el stock; lo elegido queda en el pedido.
          </p>
          <div className="space-y-3">
            {valores.opciones.map((o, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <label className="label-field" htmlFor={`${idBase}-opcion-${i}`}>Opción</label>
                  <input
                    id={`${idBase}-opcion-${i}`}
                    className="input-field"
                    value={o.nombre}
                    onChange={(e) => set("opciones", valores.opciones.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
                    placeholder="Color"
                    maxLength={30}
                  />
                </div>
                <div className="min-w-[14rem] flex-1">
                  <label className="label-field" htmlFor={`${idBase}-valores-${i}`}>Valores (separados por comas)</label>
                  <input
                    id={`${idBase}-valores-${i}`}
                    className="input-field"
                    value={o.valores}
                    onChange={(e) => set("opciones", valores.opciones.map((x, j) => (j === i ? { ...x, valores: e.target.value } : x)))}
                    placeholder="Rojo, Negro, Blanco"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set("opciones", valores.opciones.filter((_, j) => j !== i))}
                  className="mb-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
                >
                  Quitar
                </button>
              </div>
            ))}
            {valores.opciones.length < 3 && (
              <button
                type="button"
                onClick={() => set("opciones", [...valores.opciones, { nombre: "", valores: "" }])}
                className="rounded-full border border-marca-500 px-3 py-1.5 text-sm font-semibold text-marca-700 hover:bg-marca-50"
              >
                + Agregar opción
              </button>
            )}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={valores.activo} onChange={(e) => set("activo", e.target.checked)} />
        Activo (se muestra en la tienda)
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">{ok}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Guardando…" : productoId ? "Guardar cambios" : "Crear producto"}
      </button>
    </form>
  );
}
