import { prisma } from "@/lib/prisma";
import { getMainProduct } from "@/lib/product";
import { textosDelProducto } from "@/lib/precios";
import { armarRespuesta } from "@/lib/preguntas";
import RespuestaFrecuente from "@/components/RespuestaFrecuente";
import PreguntaForm from "@/components/admin/PreguntaForm";
import PreguntaActions from "@/components/admin/PreguntaActions";

export const dynamic = "force-dynamic";

export default async function AdminPreguntasPage() {
  const [preguntas, product] = await Promise.all([
    prisma.preguntaFrecuente.findMany({ orderBy: [{ orden: "asc" }, { id: "asc" }] }),
    getMainProduct(),
  ]);
  const datos = textosDelProducto(product);
  const ordenSugerido = preguntas.length ? Math.max(...preguntas.map((p) => p.orden)) + 10 : 10;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-oscuro">Preguntas frecuentes</h1>
        <p className="mt-1 text-sm text-stone-500">
          Las que están visibles aparecen en /consultas, de menor a mayor orden.
        </p>
      </div>

      <section>
        <h2 className="font-serif text-lg font-semibold text-oscuro">Preguntas ({preguntas.length})</h2>
        <div className="mt-3 space-y-4">
          {preguntas.map((p) => (
            <article key={p.id} className={`rounded-xl border bg-white p-5 shadow-soft ${p.activa ? "border-marca-100" : "border-stone-200 opacity-80"}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                <span className="font-medium text-stone-700">#{p.id}</span>
                <span className="text-xs">orden {p.orden}</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${p.activa ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                  {p.activa ? "Visible" : "Oculta"}
                </span>
              </div>
              <p className="mt-2 font-semibold text-oscuro">{p.pregunta}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-stone-700">
                <RespuestaFrecuente texto={armarRespuesta(p.respuesta, datos)} claseLink="font-semibold text-marca-700 underline underline-offset-2" />
              </p>
              <div className="mt-4">
                <PreguntaActions
                  preguntaId={p.id}
                  valores={{ pregunta: p.pregunta, respuesta: p.respuesta, orden: p.orden, activa: p.activa }}
                  datos={datos}
                />
              </div>
            </article>
          ))}
          {preguntas.length === 0 && (
            <p className="rounded-xl border border-marca-100 bg-white px-4 py-10 text-center text-stone-400">
              Todavía no hay preguntas. Sin preguntas visibles, /consultas muestra solo el formulario.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-oscuro">Nueva pregunta</h2>
        <div className="mt-3 rounded-xl border border-marca-100 bg-white p-5 shadow-soft">
          <PreguntaForm ordenSugerido={ordenSugerido} datos={datos} />
        </div>
      </section>
    </div>
  );
}
