import TextoConNegrita from "@/components/TextoConNegrita";
import { cliente } from "@/plataforma/cliente";

export default function QuienesSomos() {
  return (
    <section
      id="nosotros"
      className="contenedor-panal scroll-mt-4 bg-[linear-gradient(to_bottom,rgba(18,7,2,0)_0,rgba(18,7,2,0.84)_26%,rgba(18,7,2,0.93))] pb-[clamp(56px,8vw,96px)] pt-[clamp(72px,11vw,130px)]"
    >
      <div className="grid max-w-[1100px] gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="etiqueta-seccion">Quiénes somos</span>
          <h2 className="titulo-panal mt-2 max-w-[18ch]">{cliente.textos.nosotros.titulo}</h2>
        </div>
        <div className="texto-suave space-y-4 leading-[1.65]">
          {cliente.textos.nosotros.parrafos.map((parrafo) => (
            <p key={parrafo}>
              <TextoConNegrita texto={parrafo} className="font-semibold text-[var(--ink)]" />
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
