import type { Metadata } from "next";
import Link from "next/link";
import ConsultaForm from "@/components/ConsultaForm";
import RespuestaFrecuente from "@/components/RespuestaFrecuente";
import { prisma } from "@/lib/prisma";
import { armarRespuesta } from "@/lib/preguntas";
import { datosParaTextos } from "@/lib/datos-textos";
import { cliente } from "@/plataforma/cliente";
import { getIdentidad } from "@/lib/identidad";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Consultas | ${cliente.nombre}`, description: (await getIdentidad()).textos.descripcionConsultas };
}

export default async function ConsultasPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ origen?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  const [datos, preguntas] = await Promise.all([
    datosParaTextos(),
    prisma.preguntaFrecuente.findMany({ where: { activa: true }, orderBy: [{ orden: "asc" }, { id: "asc" }] }),
  ]);
  const origen = Array.isArray(searchParams.origen) ? searchParams.origen[0] : searchParams.origen;

  return (
    <>
      <main className="contenedor-publico flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="velo-texto">
            <h1 className="titulo">¿Tenés alguna consulta?</h1>
            <p className="mt-3 texto-suave">
              Mirá si tu duda ya está respondida acá abajo. Si no, escribinos y te contestamos a la
              brevedad.
            </p>
          </div>

          {preguntas.length > 0 && (
            <section aria-labelledby="faq" className="mt-8">
              <h2 id="faq" className="font-serif text-xl font-semibold text-[var(--texto)]">
                Preguntas frecuentes
              </h2>
              <div className="mt-4 divide-y divide-[rgb(var(--acento-rgb)/0.18)] tarjeta">
                {preguntas.map((p) => (
                  <details key={p.id} className="group">
                    <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-medium text-[var(--texto)] [&::-webkit-details-marker]:hidden">
                      {p.pregunta}
                      <span
                        className="shrink-0 text-xl text-[var(--acento)] transition group-open:rotate-45"
                        aria-hidden
                      >
                        +
                      </span>
                    </summary>
                    <p className="px-5 pb-4 leading-relaxed texto-suave">
                      <RespuestaFrecuente
                        texto={armarRespuesta(p.respuesta, datos)}
                        claseLink="font-semibold text-[var(--destacado)] underline underline-offset-4"
                      />
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section id="escribinos" aria-labelledby="escribinos-titulo" className="mt-10 scroll-mt-20">
            <h2 id="escribinos-titulo" className="mb-4 font-serif text-xl font-semibold text-[var(--texto)]">
              Escribinos
            </h2>
            <ConsultaForm origen={origen} />
          </section>

          <p className="mt-8 text-center texto-suave">
            ¿Ya sabés lo que querés?{" "}
            <Link
              href={origen ? `/producto?origen=${encodeURIComponent(origen)}` : "/producto"}
              className="font-semibold text-[var(--destacado)] underline underline-offset-4">
              Comprá directo acá
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
