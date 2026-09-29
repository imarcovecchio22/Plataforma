import tema from "@cliente/tema";
import MarcaForm, { type IdentidadPorDefecto } from "@/components/admin/MarcaForm";
import { getIdentidad } from "@/lib/identidad";
import { cliente } from "@/plataforma/cliente";

export const dynamic = "force-dynamic";

export default async function AdminMarcaPage() {
  const { cambios } = await getIdentidad();
  const { textos, colores, imagenes, apariencia } = cliente;
  // Lo de la config: a lo que vuelve cada cosa que el dueño no cambió (o borró)
  const defecto: IdentidadPorDefecto = {
    textos: {
      heroTitulo: textos.hero.titulo,
      heroBajada: textos.hero.bajada,
      heroBoton: textos.hero.botonNosotros,
      nosotrosTitulo: textos.nosotros.titulo,
      nosotrosParrafos: textos.nosotros.parrafos.join("\n\n"),
      pie: textos.pie,
      descripcionConsultas: textos.descripcionConsultas,
      aclaracionPrecio: textos.aclaracionPrecio,
    },
    marca: colores.marca,
    fondo: apariencia?.fondo ?? "claro",
    logo: imagenes.logo,
    compartir: imagenes.compartir,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-oscuro">Marca</h1>
        <p className="mt-1 text-sm text-stone-500">
          Los textos, el color y el logo de la tienda. Lo que no cambies acá queda como vino configurado.
        </p>
      </div>
      <MarcaForm defecto={defecto} cambios={cambios} temaNeutro={Boolean(tema.neutro)} />
    </div>
  );
}
