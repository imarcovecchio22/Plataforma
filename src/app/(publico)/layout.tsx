import Header from "@/components/Header";
import Footer from "@/components/Footer";
import tema from "@cliente/tema";

// Layout de las páginas públicas: /, /producto, /consultas y /privacidad, con la entrada y el
// fondo del tema del cliente si los tiene. (El checkout y el admin tienen el suyo.)
export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  const { Entrada, Fondo } = tema;
  return (
    <div className="tema-publico flex min-h-screen flex-col">
      {Entrada && <Entrada />}
      <Header />
      {children}
      <Footer />
      {Fondo && <Fondo />}
    </div>
  );
}
