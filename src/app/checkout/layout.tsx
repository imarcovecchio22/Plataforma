import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getIdentidad } from "@/lib/identidad";

// Checkout: el lenguaje del tema (paleta, tipografía y botones) sin la entrada ni el fondo animado,
// para cargar los datos sin distracciones.
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const { imagenes, textos } = await getIdentidad();
  return (
    <div className="tema-publico flex min-h-screen flex-col">
      <Header logo={imagenes.logo} />
      {children}
      <Footer logo={imagenes.logo} pie={textos.pie} />
    </div>
  );
}
