import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Checkout: el lenguaje del tema (paleta, tipografía y botones) sin la entrada ni el fondo animado,
// para cargar los datos sin distracciones.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tema-publico flex min-h-screen flex-col">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
