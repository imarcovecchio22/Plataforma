"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { contraste, escalaDeColor, TONOS, type Escala } from "@/plataforma/cliente/escala";
import type { ValoresIdentidad } from "@/plataforma/cliente/identidad";

/** Lo de la config (lo que vuelve si el dueño borra un cambio). */
export type IdentidadPorDefecto = {
  textos: TextosMarca;
  marca: Escala;
  fondo: "claro" | "oscuro";
  logo: string;
  compartir: string;
};

export type TextosMarca = {
  heroTitulo: string;
  heroBajada: string;
  heroBoton: string;
  nosotrosTitulo: string;
  /** Los párrafos separados por una línea en blanco */
  nosotrosParrafos: string;
  pie: string;
  descripcionConsultas: string;
  aclaracionPrecio: string;
};

const separarParrafos = (texto: string) => texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** Los textos que se muestran: los cambios del dueño encima de los de la config. */
export function textosIniciales(defecto: TextosMarca, cambios: ValoresIdentidad["textos"] = {}): TextosMarca {
  return {
    heroTitulo: cambios.hero?.titulo ?? defecto.heroTitulo,
    heroBajada: cambios.hero?.bajada ?? defecto.heroBajada,
    heroBoton: cambios.hero?.botonNosotros ?? defecto.heroBoton,
    nosotrosTitulo: cambios.nosotros?.titulo ?? defecto.nosotrosTitulo,
    nosotrosParrafos: cambios.nosotros?.parrafos?.join("\n\n") ?? defecto.nosotrosParrafos,
    pie: cambios.pie ?? defecto.pie,
    descripcionConsultas: cambios.descripcionConsultas ?? defecto.descripcionConsultas,
    aclaracionPrecio: cambios.aclaracionPrecio ?? defecto.aclaracionPrecio,
  };
}

/** Solo lo que difiere de la config (un campo vacío vuelve a la config). */
export function textosCambiados(t: TextosMarca, d: TextosMarca): ValoresIdentidad["textos"] {
  const distinto = (v: string, def: string) => (v.trim() && v.trim() !== def.trim() ? v.trim() : undefined);
  const hero = { titulo: distinto(t.heroTitulo, d.heroTitulo), bajada: distinto(t.heroBajada, d.heroBajada), botonNosotros: distinto(t.heroBoton, d.heroBoton) };
  const parrafos = separarParrafos(t.nosotrosParrafos);
  const nosotros = {
    titulo: distinto(t.nosotrosTitulo, d.nosotrosTitulo),
    parrafos: parrafos.length && JSON.stringify(parrafos) !== JSON.stringify(separarParrafos(d.nosotrosParrafos)) ? parrafos : undefined,
  };
  const limpio = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
  const salida = limpio({
    hero: Object.values(hero).some(Boolean) ? limpio(hero) : undefined,
    nosotros: Object.values(nosotros).some(Boolean) ? limpio(nosotros) : undefined,
    pie: distinto(t.pie, d.pie),
    descripcionConsultas: distinto(t.descripcionConsultas, d.descripcionConsultas),
    aclaracionPrecio: distinto(t.aclaracionPrecio, d.aclaracionPrecio),
  });
  return salida;
}

export default function MarcaForm({
  defecto,
  cambios,
  temaNeutro,
}: {
  defecto: IdentidadPorDefecto;
  cambios: ValoresIdentidad;
  /** Con tema propio el color cambia poco y el fondo no se usa */
  temaNeutro: boolean;
}) {
  const [textos, setTextos] = useState<TextosMarca>(textosIniciales(defecto.textos, cambios.textos));
  const [color, setColor] = useState<string | null>(cambios.colorMarca ?? null);
  const [fondo, setFondo] = useState<"claro" | "oscuro">(cambios.fondo ?? defecto.fondo);
  const [logo, setLogo] = useState(cambios.imagenes?.logo ?? "");
  const [compartir, setCompartir] = useState(cambios.imagenes?.compartir ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();

  const escala = color ? escalaDeColor(color) : defecto.marca;
  const set = (campo: keyof TextosMarca) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setTextos((t) => ({ ...t, [campo]: e.target.value }));

  async function guardar() {
    setLoading(true);
    setError(null);
    setOk(null);
    const textosNuevos = textosCambiados(textos, defecto.textos);
    const imagenes = { ...(logo.trim() ? { logo: logo.trim() } : {}), ...(compartir.trim() ? { compartir: compartir.trim() } : {}) };
    const valores: ValoresIdentidad = {
      ...(textosNuevos && Object.keys(textosNuevos).length ? { textos: textosNuevos } : {}),
      ...(color ? { colorMarca: color } : {}),
      ...(temaNeutro && fondo !== defecto.fondo ? { fondo } : {}),
      ...(Object.keys(imagenes).length ? { imagenes } : {}),
    };
    try {
      const res = await fetch("/api/admin/marca", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valores),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ? `${data.error}${data.campo ? ` (${data.campo})` : ""}` : `Error del servidor (${res.status})`);
        return;
      }
      setOk("Cambios guardados: ya se ven en la tienda.");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const volver = "text-sm text-marca-700 underline underline-offset-2 hover:text-marca-800";
  const seccion = "rounded-xl border border-marca-100 bg-white p-5 shadow-soft";

  return (
    <div className="space-y-8">
      {/* ── Textos ── */}
      <section className={seccion}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg font-semibold text-oscuro">Textos de la tienda</h2>
          <button type="button" className={volver} onClick={() => setTextos(defecto.textos)}>
            Volver a los de la config
          </button>
        </div>
        <div className="mt-4 grid gap-4">
          <div>
            <label className="label-field" htmlFor="marca-hero-titulo">Título del inicio</label>
            <input id="marca-hero-titulo" className="input-field" value={textos.heroTitulo} onChange={set("heroTitulo")} maxLength={80} />
          </div>
          <div>
            <label className="label-field" htmlFor="marca-hero-bajada">Bajada del inicio</label>
            <textarea id="marca-hero-bajada" className="input-field min-h-20" value={textos.heroBajada} onChange={set("heroBajada")} maxLength={300} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field" htmlFor="marca-hero-boton">Botón hacia &quot;Quiénes somos&quot;</label>
              <input id="marca-hero-boton" className="input-field" value={textos.heroBoton} onChange={set("heroBoton")} maxLength={40} />
            </div>
            <div>
              <label className="label-field" htmlFor="marca-aclaracion">Junto al precio (si el producto no tiene el suyo)</label>
              <input id="marca-aclaracion" className="input-field" value={textos.aclaracionPrecio} onChange={set("aclaracionPrecio")} maxLength={60} />
            </div>
          </div>
          <div>
            <label className="label-field" htmlFor="marca-nosotros-titulo">Título de &quot;Quiénes somos&quot;</label>
            <input id="marca-nosotros-titulo" className="input-field" value={textos.nosotrosTitulo} onChange={set("nosotrosTitulo")} maxLength={80} />
          </div>
          <div>
            <label className="label-field" htmlFor="marca-nosotros-parrafos">Párrafos de &quot;Quiénes somos&quot;</label>
            <textarea id="marca-nosotros-parrafos" className="input-field min-h-32" value={textos.nosotrosParrafos} onChange={set("nosotrosParrafos")} />
            <p className="mt-1 text-xs text-stone-500">
              Separalos con una línea en blanco (hasta 6). Lo que va entre **dos asteriscos** sale en negrita.
            </p>
          </div>
          <div>
            <label className="label-field" htmlFor="marca-pie">Pie de página</label>
            <input id="marca-pie" className="input-field" value={textos.pie} onChange={set("pie")} maxLength={160} />
          </div>
          <div>
            <label className="label-field" htmlFor="marca-consultas">Descripción de /consultas (para Google y al compartir)</label>
            <input id="marca-consultas" className="input-field" value={textos.descripcionConsultas} onChange={set("descripcionConsultas")} maxLength={300} />
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500">Un campo vacío vuelve al texto de la config.</p>
      </section>

      {/* ── Color y fondo ── */}
      <section className={seccion}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg font-semibold text-oscuro">Color{temaNeutro ? " y fondo" : ""}</h2>
          <button type="button" className={volver} onClick={() => { setColor(null); setFondo(defecto.fondo); }}>
            Volver a los de la config
          </button>
        </div>
        {!temaNeutro && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            La tienda usa un diseño propio con sus colores: el color de la marca cambia el admin y algunos detalles, no el
            sitio entero.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="label-field mb-0" htmlFor="marca-color">Color de la marca</label>
          <input id="marca-color" type="color" className="h-10 w-16 cursor-pointer rounded border border-stone-300" value={color ?? defecto.marca[500]} onChange={(e) => setColor(e.target.value)} />
          <span className="font-mono text-sm text-stone-600">{color ?? `${defecto.marca[500]} (el de la config)`}</span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1 sm:grid-cols-10" aria-label="Los 10 tonos de la marca">
          {TONOS.map((tono) => (
            <div key={tono} className="text-center text-[10px] text-stone-500">
              <div className="h-10 rounded" style={{ background: escala[tono] }} title={escala[tono]} />
              {tono}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: escala[700] }}>
            Así se ve un botón
          </span>
          <span className="text-xs text-stone-500">contraste {contraste(escala[700], "#ffffff").toFixed(1)}:1 (mínimo 4,5)</span>
        </div>
        {temaNeutro && (
          <fieldset className="mt-5">
            <legend className="label-field">Fondo de la tienda</legend>
            <div className="flex gap-4 text-sm text-stone-700">
              {(["claro", "oscuro"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2">
                  <input type="radio" name="marca-fondo" value={f} checked={fondo === f} onChange={() => setFondo(f)} />
                  {f === "claro" ? "Claro" : "Oscuro"}
                  {defecto.fondo === f && <span className="text-xs text-stone-400">(el de la config)</span>}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      {/* ── Imágenes ── */}
      <section className={seccion}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg font-semibold text-oscuro">Logo e imagen para compartir</h2>
          <button type="button" className={volver} onClick={() => { setLogo(""); setCompartir(""); }}>
            Volver a los de la config
          </button>
        </div>
        <p className="mt-1 text-xs text-stone-500">Links https públicos (por ahora no se suben archivos). Vacíos: los de la config.</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {[
            { id: "marca-logo", etiqueta: "Logo (cuadrado)", valor: logo, setValor: setLogo, defecto: defecto.logo, ancho: 64, alto: 64 },
            { id: "marca-compartir", etiqueta: "Imagen para compartir (1200 × 630)", valor: compartir, setValor: setCompartir, defecto: defecto.compartir, ancho: 240, alto: 126 },
          ].map((img) => (
            <div key={img.id}>
              <label className="label-field" htmlFor={img.id}>{img.etiqueta}</label>
              <input id={img.id} className="input-field" value={img.valor} onChange={(e) => img.setValor(e.target.value)} placeholder="https://…" maxLength={500} />
              <div className="mt-2 flex items-center gap-3">
                <Image
                  src={img.valor.trim().startsWith("https://") ? img.valor.trim() : img.defecto}
                  alt=""
                  width={img.ancho}
                  height={img.alto}
                  unoptimized
                  className="rounded border border-stone-200 bg-stone-50 object-contain"
                />
                <span className="text-xs text-stone-500">{img.valor.trim() ? "vista previa" : "la de la config"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p>}
      <button type="button" className="btn-primary" onClick={guardar} disabled={loading}>
        {loading ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}
