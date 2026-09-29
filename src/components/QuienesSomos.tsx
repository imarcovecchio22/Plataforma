import TextoConNegrita from "@/components/TextoConNegrita";
import { cliente } from "@/plataforma/cliente";
import type { Identidad } from "@/plataforma/cliente/identidad";

/** `textos`: los de la identidad (la home los pasa); sin ellos, los de la config. */
export default function QuienesSomos({ textos = cliente.textos }: { textos?: Identidad["textos"] }) {
  return (
    <section
      id="nosotros"
      className="contenedor-publico scroll-mt-4 bg-[image:var(--degrade-seccion)] pb-[clamp(56px,8vw,96px)] pt-[clamp(72px,11vw,130px)]"
    >
      <div className="grid max-w-[1100px] gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="etiqueta-seccion">Quiénes somos</span>
          <h2 className="titulo mt-2 max-w-[18ch]">{textos.nosotros.titulo}</h2>
        </div>
        <div className="texto-suave space-y-4 leading-[1.65]">
          {textos.nosotros.parrafos.map((parrafo) => (
            <p key={parrafo}>
              <TextoConNegrita texto={parrafo} className="font-semibold text-[var(--texto)]" />
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
