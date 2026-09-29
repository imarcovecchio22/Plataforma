import { redirect } from "next/navigation";
import FichaProducto from "@/components/FichaProducto";
import { getIdentidad } from "@/lib/identidad";
import SinProductos from "@/components/SinProductos";
import { getProductosActivos } from "@/lib/product";

export const dynamic = "force-dynamic";

// /producto sin slug (el link de siempre, el que usan Instagram y las respuestas automáticas):
// con un solo producto muestra su ficha; con más, el listado.
export default async function ProductoPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ origen?: string | string[] }>;
}) {
  const searchParams = await searchParamsPromise;
  const origen = Array.isArray(searchParams.origen) ? searchParams.origen[0] : searchParams.origen;
  const productos = await getProductosActivos();
  if (productos.length === 0) return <SinProductos />;
  if (productos.length > 1) redirect(origen ? `/productos?origen=${encodeURIComponent(origen)}` : "/productos");
  const { textos } = await getIdentidad();
  return <FichaProducto product={productos[0]} origen={origen} aclaracionPrecio={textos.aclaracionPrecio} />;
}
