"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cliente } from "@/plataforma/cliente";

export type PostIGValores = {
  fecha: string;
  tipo: "presentacion" | "producto" | "dato" | "promo";
  estilo: string; // uno de config.estilosInstagram
  tema: string;
  nombreProducto: string;
  categoria: string;
  precio: string;
  presentacion: string;
  imagenUrl: string;
  /** Producto del catálogo (producto y promo); "" = a mano (producto) o el destacado (promo) */
  productoId: string;
};

/** Lo que el formulario muestra de cada producto del catálogo. */
export type ProductoParaPost = { id: string; nombre: string; precio: string; conFoto: boolean; conPromos: boolean; activo: boolean };

const VACIO = (fecha: string): PostIGValores => ({
  fecha,
  tipo: "presentacion",
  estilo: cliente.estilosInstagram[0].id,
  tema: "",
  nombreProducto: "",
  categoria: "",
  precio: "",
  presentacion: "",
  imagenUrl: `${cliente.dominio}${cliente.imagenes.producto.src}`,
  productoId: "",
});

/** Formulario para cargar (o editar, si recibe postId) un post del cronograma. */
export default function PostIGForm({
  fechaHoy,
  productos,
  postId,
  inicial,
  onListo,
}: {
  fechaHoy: string;
  productos: ProductoParaPost[];
  postId?: number;
  inicial?: PostIGValores;
  onListo?: () => void;
}) {
  const [valores, setValores] = useState<PostIGValores>(inicial ?? VACIO(fechaHoy));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();
  const idBase = postId ? `post-${postId}` : "nuevo";

  function set<K extends keyof PostIGValores>(campo: K, valor: PostIGValores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(postId ? `/api/admin/instagram/posts/${postId}` : "/api/admin/instagram/posts", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postId ? { accion: "editar", ...valores } : valores),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Error del servidor (${res.status})`);
        return;
      }
      setOk(postId ? "Cambios guardados." : `Post #${data.id} cargado.`);
      if (!postId) setValores(VACIO(valores.fecha));
      router.refresh();
      onListo?.();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const esProducto = valores.tipo === "producto";
  const conProducto = esProducto || valores.tipo === "promo";
  const elegido = productos.find((p) => p.id === valores.productoId);
  const aMano = esProducto && !elegido;

  function cambiarTipo(tipo: PostIGValores["tipo"]) {
    // Un post de producto arranca con el primero del catálogo (se puede cambiar o cargar a mano)
    setValores((v) => ({ ...v, tipo, productoId: tipo === "producto" && !v.productoId && productos[0] ? productos[0].id : v.productoId }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label-field" htmlFor={`${idBase}-fecha`}>Fecha</label>
          <input id={`${idBase}-fecha`} type="date" className="input-field" value={valores.fecha} onChange={(e) => set("fecha", e.target.value)} required />
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-tipo`}>Tipo</label>
          <select id={`${idBase}-tipo`} className="input-field" value={valores.tipo} onChange={(e) => cambiarTipo(e.target.value as PostIGValores["tipo"])}>
            <option value="presentacion">Presentación</option>
            <option value="dato">Dato curioso</option>
            <option value="producto">Producto</option>
            <option value="promo">Promo (las promos por cantidad de un producto)</option>
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor={`${idBase}-estilo`}>Estilo</label>
          <select id={`${idBase}-estilo`} className="input-field" value={valores.estilo} onChange={(e) => set("estilo", e.target.value)}>
            {cliente.estilosInstagram.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor={`${idBase}-tema`}>Tema</label>
        <input
          id={`${idBase}-tema`}
          className="input-field"
          value={valores.tema}
          onChange={(e) => set("tema", e.target.value)}
          placeholder={`Ej: ${cliente.textos.ejemplosAdmin.temaPost}`}
          maxLength={300}
          required
        />
      </div>

      {conProducto && (
        <div className="rounded-lg bg-marca-50/60 p-4">
          <label className="label-field" htmlFor={`${idBase}-producto`}>Producto</label>
          <select id={`${idBase}-producto`} className="input-field" value={valores.productoId} onChange={(e) => set("productoId", e.target.value)}>
            <option value="">{esProducto ? "Cargar los datos a mano" : "El destacado (el primero de Productos)"}</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.activo ? "" : " (pausado)"}
              </option>
            ))}
          </select>
          {elegido && (
            <p className="mt-2 text-xs text-stone-500">
              {esProducto
                ? `Nombre, precio (hoy ${elegido.precio}) y foto${elegido.conFoto ? "" : " (la del sitio: el producto no tiene)"} salen del producto al generar el post.`
                : `Las promos salen del producto al generar el post.`}
              {!esProducto && !elegido.conPromos && (
                <span className="block text-red-700">Este producto no tiene promos por cantidad: el post va a dar error al generarse.</span>
              )}
            </p>
          )}
        </div>
      )}

      {esProducto && (
        <div className="grid gap-4 rounded-lg bg-marca-50/60 p-4 sm:grid-cols-2">
          {aMano && (
            <>
              <div>
                <label className="label-field" htmlFor={`${idBase}-nombre`}>Nombre del producto</label>
                <input id={`${idBase}-nombre`} className="input-field" value={valores.nombreProducto} onChange={(e) => set("nombreProducto", e.target.value)} placeholder={cliente.textos.ejemplosAdmin.nombreProducto} maxLength={80} />
              </div>
              <div>
                <label className="label-field" htmlFor={`${idBase}-precio`}>Precio</label>
                <input id={`${idBase}-precio`} className="input-field" value={valores.precio} onChange={(e) => set("precio", e.target.value)} placeholder="6500" maxLength={20} />
              </div>
            </>
          )}
          <div>
            <label className="label-field" htmlFor={`${idBase}-categoria`}>Categoría</label>
            <input id={`${idBase}-categoria`} className="input-field" value={valores.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder={cliente.textos.ejemplosAdmin.categoria} maxLength={60} />
          </div>
          <div>
            <label className="label-field" htmlFor={`${idBase}-presentacion`}>Presentación</label>
            <input id={`${idBase}-presentacion`} className="input-field" value={valores.presentacion} onChange={(e) => set("presentacion", e.target.value)} placeholder={cliente.textos.ejemplosAdmin.presentacion} maxLength={60} />
          </div>
          {aMano && (
            <div className="sm:col-span-2">
              <label className="label-field" htmlFor={`${idBase}-imagen`}>Foto (link https)</label>
              <input id={`${idBase}-imagen`} className="input-field" value={valores.imagenUrl} onChange={(e) => set("imagenUrl", e.target.value)} maxLength={500} />
            </div>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Guardando…" : postId ? "Guardar cambios" : "Cargar post"}
      </button>
    </form>
  );
}
