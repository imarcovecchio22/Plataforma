import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Checkout: el lenguaje del panal (paleta, tipografía y botones) sobre un fondo oscuro liso,
// sin el canvas ni la abeja, para cargar los datos sin distracciones.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tema-publico flex min-h-screen flex-col">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
