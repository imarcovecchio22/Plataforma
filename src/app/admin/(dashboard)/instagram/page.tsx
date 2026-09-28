import { headers } from "next/headers";
import type { EstadoPostIG, PostIG } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import { telegramApi, telegramConfigurado } from "@/lib/telegram";
import { estadoToken, modoPrueba } from "@/lib/instagram/meta";
import { DESTINO_LABEL, hoyLocal } from "@/lib/instagram/botones";
import PostIGForm, { type PostIGValores } from "@/components/admin/PostIGForm";
import PostIGActions from "@/components/admin/PostIGActions";
import InstagramControls from "@/components/admin/InstagramControls";

export const dynamic = "force-dynamic";

const ESTADO: Record<EstadoPostIG, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-stone-100 text-stone-700" },
  generando: { label: "Generando", color: "bg-blue-100 text-blue-800" },
  esperando_aprobacion: { label: "Esperando aprobación", color: "bg-amber-100 text-amber-800" },
  publicando: { label: "Publicando", color: "bg-blue-100 text-blue-800" },
  publicado: { label: "Publicado", color: "bg-emerald-100 text-emerald-800" },
  descartado: { label: "Descartado", color: "bg-stone-100 text-stone-500" },
  error: { label: "Error", color: "bg-red-100 text-red-800" },
};

const TIPO: Record<string, string> = { presentacion: "Presentación", producto: "Producto", dato: "Dato curioso", promo: "Promo" };

const SECCIONES: { titulo: string; estados: EstadoPostIG[]; limite?: number }[] = [
  { titulo: "Esperando tu aprobación en Telegram", estados: ["esperando_aprobacion", "generando", "publicando"] },
  { titulo: "Con error", estados: ["error"] },
  { titulo: "Pendientes", estados: ["pendiente"] },
  { titulo: "Publicados", estados: ["publicado"], limite: 20 },
  { titulo: "Descartados", estados: ["descartado"], limite: 10 },
];

function valoresDe(post: PostIG): PostIGValores {
  return {
    fecha: post.fecha.toISOString().slice(0, 10),
    tipo: post.tipo,
    estilo: post.estilo,
    tema: post.tema,
    nombreProducto: post.nombreProducto ?? "",
    categoria: post.categoria ?? "",
    precio: post.precio ?? "",
    presentacion: post.presentacion ?? "",
    imagenUrl: post.imagenUrl ?? "",
  };
}

async function estadoConexiones() {
  const host = (await headers()).get("host") ?? "";
  const [token, webhook] = await Promise.all([
    estadoToken().catch((e: Error) => ({ valido: false, diasRestantes: null, expiraEn: null, error: e.message })),
    telegramConfigurado()
      ? telegramApi<{ url?: string; pending_update_count?: number; last_error_message?: string; last_error_date?: number }>(
          "getWebhookInfo",
          {}
        ).catch(() => null)
      : Promise.resolve(null),
  ]);
  const webhookUrl = webhook?.url ?? "";
  return {
    token,
    webhookUrl,
    botConectadoAqui: Boolean(host && webhookUrl.includes(`//${host}/`)),
    botPendientes: webhook?.pending_update_count ?? 0,
    botUltimoError: webhook?.last_error_message
      ? `${webhook.last_error_message}${webhook.last_error_date ? ` (${formatFecha(new Date(webhook.last_error_date * 1000))})` : ""}`
      : null,
  };
}

export default async function AdminInstagramPage() {
  const [posts, conexiones] = await Promise.all([
    prisma.postIG.findMany({ orderBy: [{ fecha: "desc" }, { id: "desc" }], take: 200 }),
    estadoConexiones(),
  ]);
  const { token, webhookUrl, botConectadoAqui, botPendientes, botUltimoError } = conexiones;
  const hoy = hoyLocal();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-oscuro">Instagram</h1>
        <p className="mt-1 text-sm text-stone-500">
          Todos los días entre las 9 y las 10 se generan los posts pendientes con fecha de hoy o anterior, y te llegan a
          Telegram para elegir dónde publicarlos.
        </p>
      </div>

      <section className="grid gap-4 rounded-xl border border-marca-100 bg-white p-5 shadow-soft sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Token de Meta</p>
          <p className={`mt-1 font-semibold ${token.valido && (token.diasRestantes ?? 99) > 7 ? "text-emerald-700" : "text-red-700"}`}>
            {token.valido
              ? `Válido · vence en ${token.diasRestantes} días`
              : `No funciona${token.error ? `: ${token.error}` : ""}`}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Bot de Telegram</p>
          <p className={`mt-1 break-all font-semibold ${botConectadoAqui ? "text-emerald-700" : "text-amber-700"}`}>
            {botConectadoAqui ? "Conectado a esta web" : webhookUrl ? `Conectado a otro lado (${new URL(webhookUrl).host})` : "Sin conectar"}
          </p>
          {botPendientes > 0 && (
            <p className="mt-1 text-xs text-amber-700">{botPendientes} toques esperando para entregarse</p>
          )}
          {botUltimoError && <p className="mt-1 break-words text-xs text-red-700">Último error de Telegram: {botUltimoError}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Modo</p>
          <p className={`mt-1 font-semibold ${modoPrueba() ? "text-amber-700" : "text-emerald-700"}`}>
            {modoPrueba() ? "Prueba: no publica de verdad" : "Real: publica en Instagram"}
          </p>
        </div>
        <div className="sm:col-span-3">
          <InstagramControls botConectadoAqui={botConectadoAqui} />
        </div>
      </section>

      <section className="rounded-xl border border-marca-100 bg-white p-5 shadow-soft">
        <h2 className="mb-4 font-serif text-xl font-semibold text-oscuro">Cargar un post</h2>
        <PostIGForm fechaHoy={hoy} />
      </section>

      {SECCIONES.map((seccion) => {
        const lista = posts.filter((p) => seccion.estados.includes(p.estado)).slice(0, seccion.limite);
        if (lista.length === 0) return null;
        return (
          <section key={seccion.titulo}>
            <h2 className="font-serif text-xl font-semibold text-oscuro">
              {seccion.titulo} <span className="text-base font-normal text-stone-400">({lista.length})</span>
            </h2>
            <div className="mt-3 space-y-3">
              {lista.map((post) => (
                <article key={post.id} className="rounded-xl border border-marca-100 bg-white p-4 shadow-soft">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {(post.feedUrl || post.storyUrl) && (
                      <div className="flex shrink-0 gap-2">
                        {post.feedUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.feedUrl} alt="Imagen del feed" className="h-32 w-auto rounded-md border border-stone-200" loading="lazy" />
                        )}
                        {post.storyUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.storyUrl} alt="Imagen de la historia" className="h-32 w-auto rounded-md border border-stone-200" loading="lazy" />
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                        <span className="font-medium text-stone-700">#{post.id}</span>
                        <span>{post.fecha.toISOString().slice(0, 10)}</span>
                        <span>
                          {TIPO[post.tipo]} · {post.estilo}
                        </span>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${ESTADO[post.estado].color}`}>
                          {ESTADO[post.estado].label}
                        </span>
                        {post.destino && post.estado === "publicado" && (
                          <span className="text-emerald-700">en {DESTINO_LABEL[post.destino]}</span>
                        )}
                        {post.publicadoEn && <span>{formatFecha(post.publicadoEn)}</span>}
                      </div>
                      <p className="break-words text-stone-700">{post.tema}</p>
                      {post.tipo === "producto" && (
                        <p className="text-sm text-stone-500">
                          {post.nombreProducto} · {post.precio}
                        </p>
                      )}
                      {post.error && (
                        <p className="break-words rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{post.error}</p>
                      )}
                      <PostIGActions postId={post.id} estado={post.estado} />
                      {["pendiente", "error", "descartado"].includes(post.estado) && (
                        <details>
                          <summary className="cursor-pointer text-sm text-marca-700">Editar</summary>
                          <div className="mt-3">
                            <PostIGForm fechaHoy={hoy} postId={post.id} inicial={valoresDe(post)} />
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      {posts.length === 0 && (
        <p className="rounded-xl border border-marca-100 bg-white px-4 py-10 text-center text-stone-400">
          Todavía no hay posts cargados.
        </p>
      )}
    </div>
  );
}
