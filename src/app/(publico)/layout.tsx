import Header from "@/components/Header";
import Footer from "@/components/Footer";
import tema from "@cliente/tema";
import { getIdentidad } from "@/lib/identidad";

// Layout de las páginas públicas: /, /producto, /consultas y /privacidad, con la entrada y el
// fondo del tema del cliente si los tiene. (El checkout y el admin tienen el suyo.)
export default async function PublicoLayout({ children }: { children: React.ReactNode }) {
  const { Entrada, Fondo } = tema;
  const { imagenes, textos } = await getIdentidad();
  return (
    <div className="tema-publico flex min-h-screen flex-col">
      {Entrada && <Entrada />}
      <Header logo={imagenes.logo} />
      {children}
      <Footer logo={imagenes.logo} pie={textos.pie} />
      {Fondo && <Fondo />}
    </div>
  );
}
